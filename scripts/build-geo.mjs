/**
 * Geo build pipeline  ->  src/data/europe.topo.json
 *
 * 1. Download Natural Earth 1:10m admin-0 boundaries (cached in node_modules/.cache).
 * 2. Keep only the countries we teach; merge the divided sub-parts of Cyprus.
 * 3. Re-key every feature to our own country `id`.
 * 4. Clip to a European window so overseas territories don't distort the map.
 * 5. mapshaper: dissolve by id (with intersection repair), simplify
 *    (interval-based, keep-shapes), clean.
 * 6. Attach an interior point ("centroid") per country; countries too small to
 *    survive simplification (Vatican) are emitted as a Point marker instead.
 *
 * src/data/countries.js is the single source of truth for which countries
 * exist; this script fails loudly if any of them ends up without a location.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as topojson from 'topojson-client';
import { COUNTRIES } from '../src/data/countries.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = resolve(root, 'node_modules/.cache/geo');
const cacheFile = resolve(cacheDir, 'ne_10m_admin_0_countries.geojson');
const outFile = resolve(root, 'src/data/europe.topo.json');

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';

// Clip window [west, south, east, north].
//  - west -25 keeps Iceland but drops the Azores (they'd waste half the frame)
//  - south 33 keeps Crete / Malta / Cyprus but drops the Canaries and Madeira
//  - east 115 is far past the map frame so Russia's straight cut edge is always
//    off screen; the app frames Europe and lets Russia bleed off under an SVG clip
//  - north 80 keeps Russia's real Arctic coastline (which stays below ~70°N here)
const CLIP_BBOX = [-25, 33, 115, 80];
// Visvalingam simplification interval in metres. Interval-based (not a %) so
// microstates keep almost all their detail while large countries shed most.
const SIMPLIFY_INTERVAL = 3500;

const NE_TO_ID = Object.fromEntries(COUNTRIES.map((c) => [c.ne, c.id]));
// Countries whose pole-of-inaccessibility is a poor label / recentre point
// (Russia's lands far into Siberia, off the map frame). [lon, lat].
const CENTROID_OVERRIDE = { ru: [42, 56] };
// Cyprus is a single clickable island assembled from these Natural Earth parts.
const CYPRUS_PARTS = ['CYP', 'CYN', 'CNM', 'ESB', 'WSB'];

async function ensureSource() {
  if (existsSync(cacheFile)) return;
  mkdirSync(cacheDir, { recursive: true });
  process.stdout.write('Downloading Natural Earth 10m boundaries ...\n');
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  writeFileSync(cacheFile, Buffer.from(await res.arrayBuffer()));
}

function mapshaper(args) {
  execFileSync('npx', ['mapshaper', ...args], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
}

/** Planar average of the largest ring — only a fallback location for markers. */
function ringCentroid(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const rings = polys.map((p) => p[0]); // exterior ring of each polygon part
  let best = rings[0];
  let bestExtent = -1;
  for (const r of rings) {
    const xs = r.map((p) => p[0]);
    const ys = r.map((p) => p[1]);
    const extent = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (extent > bestExtent) [bestExtent, best] = [extent, r];
  }
  const sum = best.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [round(sum[0] / best.length), round(sum[1] / best.length)];
}

const round = (n) => Math.round(n * 1000) / 1000;

await ensureSource();

// --- Stage 1: filter + re-key in plain Node (explicit, testable mapping).
const raw = JSON.parse(readFileSync(cacheFile, 'utf8'));
const features = [];
for (const f of raw.features) {
  const ne = f.properties.ADM0_A3;
  const id = NE_TO_ID[ne] ?? (CYPRUS_PARTS.includes(ne) ? 'cy' : null);
  if (id) features.push({ type: 'Feature', properties: { id }, geometry: f.geometry });
}
const found = new Set(features.map((f) => f.properties.id));
const missingSource = COUNTRIES.filter((c) => !found.has(c.id));
if (missingSource.length) {
  throw new Error(`No source geometry for: ${missingSource.map((c) => c.id).join(', ')}`);
}

// Fallback marker location for every country, from the raw NE geometry.
const fallbackLoc = {};
for (const c of COUNTRIES) {
  const parts = features.filter((f) => f.properties.id === c.id).map((f) => f.geometry);
  fallbackLoc[c.id] = ringCentroid(
    parts.length === 1 ? parts[0] : { type: 'MultiPolygon', coordinates: parts.flatMap((g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates)) }
  );
}

const stage1 = resolve(cacheDir, 'stage1.geojson');
writeFileSync(stage1, JSON.stringify({ type: 'FeatureCollection', features }));

// --- Stage 2: mapshaper clip + dissolve + simplify, emit TopoJSON.
// `innerX/innerY` is a point guaranteed to sit inside the largest part of the
// country — used to place the tap-assist marker and to recentre on the answer.
mapshaper([
  stage1,
  '-clip', `bbox=${CLIP_BBOX.join(',')}`,
  '-dissolve', 'id',
  '-simplify', `interval=${SIMPLIFY_INTERVAL}`, 'keep-shapes',
  '-clean',
  '-each', 'cx = Math.round(this.innerX * 1000) / 1000, cy = Math.round(this.innerY * 1000) / 1000',
  '-o', outFile, 'format=topojson', 'id-field=id',
]);

// --- Stage 3: normalise object name, fold centroid, add Point markers for any
// country too small to survive as a polygon.
const topo = JSON.parse(readFileSync(outFile, 'utf8'));
const key = Object.keys(topo.objects)[0];
if (key !== 'countries') {
  topo.objects.countries = topo.objects[key];
  delete topo.objects[key];
}

const geoms = topo.objects.countries.geometries.filter((g) => g.type && g.arcs?.length);
const havePolygon = new Set(geoms.map((g) => g.id));
for (const g of geoms) {
  g.properties = {
    centroid: CENTROID_OVERRIDE[g.id] ?? [
      g.properties.cx ?? fallbackLoc[g.id][0],
      g.properties.cy ?? fallbackLoc[g.id][1],
    ],
  };
}
for (const c of COUNTRIES) {
  if (havePolygon.has(c.id)) continue;
  geoms.push({
    type: 'Point',
    id: c.id,
    coordinates: fallbackLoc[c.id],
    properties: { centroid: fallbackLoc[c.id], marker: true },
  });
}
geoms.sort((a, b) => a.id.localeCompare(b.id));
topo.objects.countries.geometries = geoms;
writeFileSync(outFile, JSON.stringify(topo));

// --- Verify + report.
const fc = topojson.feature(topo, topo.objects.countries);
const ids = fc.features.map((f) => f.id).sort();
const expected = COUNTRIES.map((c) => c.id).sort();
if (ids.join(',') !== expected.join(',')) {
  throw new Error(`id mismatch\n have: ${ids.join(',')}\n want: ${expected.join(',')}`);
}
for (const f of fc.features) {
  const [x, y] = f.properties?.centroid ?? [];
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < CLIP_BBOX[0] || x > CLIP_BBOX[2] + 0.5 || y < CLIP_BBOX[1] || y > CLIP_BBOX[3]) {
    throw new Error(`bad centroid: ${f.id} -> ${JSON.stringify(f.properties?.centroid)}`);
  }
}
const markers = fc.features.filter((f) => f.properties.marker).map((f) => f.id);
console.log(`\n${fc.features.length} countries  (${markers.length ? `marker-only: ${markers.join(', ')}` : 'all polygons'})`);
console.log(`${outFile}  (${(readFileSync(outFile).length / 1024).toFixed(1)} KB)`);
