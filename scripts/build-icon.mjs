/**
 * Renders a stylized Europe-silhouette app icon (same projection and palette
 * as the map) and writes it into index.html as inlined data-URI <link>s, so
 * the deliverable stays a single file. Run manually when the artwork changes;
 * the output is committed like src/data/europe.topo.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature, merge } from 'topojson-client';
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import sharp from 'sharp';
import topo from '../src/data/europe.topo.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 512;
const PAD = 64;

const OCEAN = '#0e7c86';
const OCEAN_DEEP = '#0a5a62';
const LAND = '#faf4e8';
const LAND_LINE = '#0a5a62';

const fc = feature(topo, topo.objects.countries);
const polygons = fc.features.filter((f) => f.geometry && f.geometry.type !== 'Point' && f.id !== 'ru');
const frame = { type: 'FeatureCollection', features: polygons };
const silhouette = merge(
  topo,
  topo.objects.countries.geometries.filter((g) => g.type !== 'Point' && g.id !== 'ru')
);

const proj = geoAzimuthalEqualArea()
  .rotate([-10, -52])
  .fitExtent(
    [
      [PAD, PAD],
      [SIZE - PAD, SIZE - PAD],
    ],
    frame
  );
const path = geoPath(proj);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="sea" cx="35%" cy="30%" r="85%">
      <stop offset="0%" stop-color="${OCEAN}"/>
      <stop offset="100%" stop-color="${OCEAN_DEEP}"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#sea)"/>
  <path d="${path(silhouette)}" fill="${LAND}" stroke="${LAND_LINE}" stroke-width="6" stroke-linejoin="round"/>
</svg>`;

writeFileSync(resolve(root, 'scripts/.icon-preview.svg'), svg);

const sizes = [32, 180, 192, 512];
const pngs = {};
for (const s of sizes) {
  const buf = await sharp(Buffer.from(svg)).resize(s, s).png().toBuffer();
  pngs[s] = buf.toString('base64');
}

const manifest = {
  name: 'Europa-Trainer',
  short_name: 'Europa',
  start_url: '.',
  display: 'standalone',
  background_color: '#f4ead5',
  theme_color: '#f4ead5',
  icons: [
    { src: `data:image/png;base64,${pngs[192]}`, sizes: '192x192', type: 'image/png' },
    { src: `data:image/png;base64,${pngs[512]}`, sizes: '512x512', type: 'image/png' },
  ],
};
const manifestDataUri = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;

const block = `    <link rel="icon" type="image/png" sizes="32x32" href="data:image/png;base64,${pngs[32]}" />
    <link rel="apple-touch-icon" sizes="180x180" href="data:image/png;base64,${pngs[180]}" />
    <link rel="manifest" href="${manifestDataUri}" />`;

const htmlPath = resolve(root, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const patched = html.replace(
  /( {4}<!-- ICONS:START -->\n)[\s\S]*?( {4}<!-- ICONS:END -->)/,
  `$1${block}\n$2`
);
if (patched === html) throw new Error('ICONS:START/END markers not found in index.html');
writeFileSync(htmlPath, patched);

console.log(`wrote icon links into index.html (${sizes.map((s) => `${s}px`).join(', ')})`);
console.log('preview: scripts/.icon-preview.svg (gitignored)');
