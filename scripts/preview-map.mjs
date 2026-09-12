/** Dev-only: render the map to an SVG/PNG for eyeballing correctness. */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { geoAzimuthalEqualArea, geoPath } from "d3-geo";
import topo from '../src/data/europe.topo.json' with { type: 'json' };
import { COUNTRIES, BY_ID } from '../src/data/countries.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1500;
const H = 1200;

const fc = feature(topo, topo.objects.countries);
const frame = { type: 'FeatureCollection', features: fc.features.filter((f) => f.id !== 'ru') };
const proj = geoAzimuthalEqualArea()
  .rotate([-10, -52])
  .fitExtent([[10, 10], [W - 10, H - 10]], frame);
const path = geoPath(proj);

const PAL = ['#f7c59f', '#8ecae6', '#a8dadc', '#e5989b', '#bde0fe', '#ffb703', '#c8e6c9', '#cdb4db', '#b8bedd', '#95d5b2'];
const parts = [];
let i = 0;
for (const f of fc.features) {
  if (!f.geometry || f.geometry.type === 'Point') continue;
  parts.push(`<path d="${path(f)}" fill="${PAL[i++ % PAL.length]}" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/>`);
}
for (const c of COUNTRIES) {
  const f = fc.features.find((x) => x.id === c.id);
  const [x, y] = proj(f.properties.centroid) ?? [0, 0];
  if (f.geometry?.type === 'Point') parts.push(`<circle cx="${x}" cy="${y}" r="4" fill="#c1121f"/>`);
  parts.push(
    `<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="13" font-weight="bold" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="3" fill="#111">${BY_ID[c.id].name}</text>`
  );
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#cfe8ee"/>${parts.join('')}</svg>`;
writeFileSync(resolve(root, 'scripts/.preview.svg'), svg);
console.log('wrote scripts/.preview.svg');
