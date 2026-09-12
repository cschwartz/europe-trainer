/**
 * Data integrity gate — runs before every build.
 *
 * Checks that the country list and the generated geometry agree, and that no
 * two answers collide once normalised (which would make a free-text or
 * multiple-choice question ambiguous).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { COUNTRIES, MICROSTATES } from '../src/data/countries.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// mirror of src/engine/match.ts normalize()
function normalize(input) {
  let s = input.trim().toLowerCase().replace(/ß/g, 'ss');
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[’'`´]/g, '').replace(/[-_/]+/g, ' ');
  s = s.replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
  const [first, ...rest] = s.split(' ');
  if (rest.length && ['der', 'die', 'das', 'la', 'le', 'el'].includes(first)) s = rest.join(' ');
  return s;
}

// --- 1. structural checks on the country list
const ids = new Set();
const neCodes = new Set();
for (const c of COUNTRIES) {
  for (const field of ['id', 'ne', 'name', 'cap']) {
    if (!c[field] || typeof c[field] !== 'string') err(`${c.id ?? '?'}: missing "${field}"`);
  }
  if (ids.has(c.id)) err(`duplicate id: ${c.id}`);
  if (neCodes.has(c.ne)) err(`duplicate NE code: ${c.ne}`);
  ids.add(c.id);
  neCodes.add(c.ne);
}
if (COUNTRIES.length !== 50) warn(`expected 50 countries, have ${COUNTRIES.length}`);
for (const m of MICROSTATES) if (!ids.has(m)) err(`MICROSTATES references unknown id: ${m}`);

// --- 2. answer ambiguity: every accepted spelling must map to one country
const nameOwner = new Map();
const capOwner = new Map();
for (const c of COUNTRIES) {
  for (const n of [c.name, ...(c.altName ?? [])]) {
    const k = normalize(n);
    if (nameOwner.has(k) && nameOwner.get(k) !== c.id) {
      err(`country name "${n}" (${k}) is claimed by both ${nameOwner.get(k)} and ${c.id}`);
    }
    nameOwner.set(k, c.id);
  }
  for (const n of [c.cap, ...(c.altCap ?? [])]) {
    const k = normalize(n);
    if (capOwner.has(k) && capOwner.get(k) !== c.id) {
      warn(`capital "${n}" (${k}) is shared by ${capOwner.get(k)} and ${c.id}`);
    }
    capOwner.set(k, c.id);
  }
}

// --- 3. geometry reconciliation
let topo;
try {
  topo = JSON.parse(readFileSync(resolve(root, 'src/data/europe.topo.json'), 'utf8'));
} catch {
  err('src/data/europe.topo.json missing — run `npm run geo`');
}
if (topo) {
  const fc = feature(topo, topo.objects.countries);
  const geoIds = new Set(fc.features.map((f) => f.id));
  for (const c of COUNTRIES) if (!geoIds.has(c.id)) err(`no geometry for ${c.id}`);
  for (const g of geoIds) if (!ids.has(g)) err(`geometry has unknown country ${g}`);
  for (const f of fc.features) {
    const [x, y] = f.properties?.centroid ?? [];
    if (!Number.isFinite(x) || !Number.isFinite(y)) err(`bad centroid for ${f.id}`);
  }
}

// --- report
for (const w of warnings) console.warn(`  warn  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log(`data ok — ${COUNTRIES.length} countries, ${warnings.length} warning(s)`);
