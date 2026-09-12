/**
 * Generates reference/countries.html — a human-checkable reference of every
 * country, capital and accepted spelling in the trainer, plus the map and the
 * editorial decisions. Read straight from src/data so it can't drift.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import { COUNTRIES, BY_ID, MICROSTATES } from '../src/data/countries.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const topo = JSON.parse(readFileSync(resolve(root, 'src/data/europe.topo.json'), 'utf8'));

const REGIONS = [
  ['Nordeuropa', ['dk', 'ee', 'fi', 'is', 'lv', 'lt', 'no', 'se']],
  ['West- & Mitteleuropa', ['be', 'de', 'fr', 'ie', 'li', 'lu', 'mc', 'nl', 'at', 'pl', 'ch', 'sk', 'cz', 'hu', 'gb']],
  ['Südeuropa', ['ad', 'gr', 'it', 'hr', 'mt', 'pt', 'sm', 'si', 'es', 'va']],
  ['Südosteuropa', ['al', 'ba', 'bg', 'xk', 'me', 'mk', 'ro', 'rs', 'md']],
  ['Osteuropa', ['by', 'ru', 'ua']],
  ['Kaukasus & Vorderasien', ['am', 'az', 'ge', 'tr', 'cy']],
];

const DECISIONS = [
  ['Länderauswahl', 'Alle souveränen Staaten, die im deutschen Erdkunde­unterricht zu „Europa“ zählen: die sechs Kleinstaaten, Zypern, Kosovo, der europäische Teil von Russland und der Türkei sowie die drei Südkaukasus-Staaten. 50 Länder.', true],
  ['Kiew statt Kyjiw', 'Angezeigt wird die im aktuellen deutschen Schulatlas noch übliche Form. „Kyjiw“ und „Kyiv“ werden bei Freitext ebenfalls als richtig gewertet.', true],
  ['Weißrussland / Belarus', 'Angezeigt wird „Belarus“; „Weißrussland“ wird als Land­name akzeptiert.', true],
  ['Schweiz → Bern', 'Bern ist Bundesstadt und die erwartete Schul­antwort.', false],
  ['Niederlande → Amsterdam', 'Verfassungs­hauptstadt (Regierungssitz ist Den Haag).', false],
  ['Zypern', 'Die Insel ist ein einziges anklickbares Land (die geteilten Natural-Earth-Teile werden zusammengeführt). Hauptstadt: Nikosia.', false],
  ['Vatikanstadt', 'Zu klein für eine Fläche auf dieser Karte – wird als Punkt-Markierung dargestellt, ist aber normal anklickbar.', false],
  ['Russland & Türkei', 'Beide werden gezeigt, aber so gerahmt, dass die Schnitt­kante nie im Bild ist.', false],
];

// --- map (inline SVG, both themes via currentColor-ish tokens) ---------------
const W = 1000;
const H = 760;
const fc = feature(topo, topo.objects.countries);
const frame = { type: 'FeatureCollection', features: fc.features.filter((f) => f.id !== 'ru') };
const proj = geoAzimuthalEqualArea().rotate([-10, -52]).fitExtent([[10, 10], [W - 10, H - 10]], frame);
const path = geoPath(proj);
let mapInner = '';
for (const f of fc.features) {
  if (!f.geometry || f.geometry.type === 'Point') continue;
  mapInner += `<path d="${path(f)}"/>`;
}
let mapLabels = '';
for (const c of COUNTRIES) {
  const f = fc.features.find((x) => x.id === c.id);
  const p = proj(f.properties.centroid);
  if (!p) continue;
  const [x, y] = [p[0].toFixed(1), p[1].toFixed(1)];
  if (MICROSTATES.has(c.id) || f.geometry?.type === 'Point') mapLabels += `<circle cx="${x}" cy="${y}" r="2.6" class="dot"/>`;
  mapLabels += `<text x="${x}" y="${y}">${esc(c.name)}</text>`;
}
const mapSvg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Karte der 50 abgefragten Länder"><g class="land">${mapInner}</g><g class="labels">${mapLabels}</g></svg>`;

// --- rows ------------------------------------------------------------------
function rows(ids) {
  return ids
    .map((id) => {
      const c = BY_ID[id];
      const alts = [...new Set([...(c.altName ?? []), ...(c.altCap ?? [])])];
      return `<tr>
        <td class="c-land">${esc(c.name)}</td>
        <td class="c-cap">${esc(c.cap)}</td>
        <td class="c-alt">${alts.length ? esc(alts.join(', ')) : '<span class="none">&ndash;</span>'}</td>
        <td class="c-iso">${esc(id.toUpperCase())}</td>
      </tr>`;
    })
    .join('');
}
const tableSections = REGIONS.map(
  ([name, ids]) => `<tbody>
    <tr class="region"><th colspan="4">${esc(name)} <span class="count">${ids.length}</span></th></tr>
    ${rows([...ids].sort((a, b) => BY_ID[a].name.localeCompare(BY_ID[b].name, 'de')))}
  </tbody>`
).join('');

const decisionsHtml = DECISIONS.map(
  ([t, d, call]) => `<div class="decision${call ? ' is-call' : ''}">
    <dt>${esc(t)}</dt><dd>${esc(d)}</dd>
  </div>`
).join('');

function esc(s) {
  return String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

const html = `<title>Europa-Trainer Länderreferenz</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,560&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --paper:#f2f4f3; --panel:#fbfcfb; --ink:#182624; --ink-soft:#5a6b68;
  --line:#dbe2df; --teal:#0e7c86; --teal-deep:#0a5a62; --terra:#bd6244;
  --land:#e6efe9; --land-line:#a8bfba; --water:#dceef0;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --paper:#101614; --panel:#161e1c; --ink:#e6ede9; --ink-soft:#9fb2ad;
    --line:#26322f; --teal:#4fb3bd; --teal-deep:#7fd0d8; --terra:#e08a68;
    --land:#1e2a27; --land-line:#3c4f4a; --water:#0f1a1c;
  }
}
:root[data-theme="dark"]{
  --paper:#101614; --panel:#161e1c; --ink:#e6ede9; --ink-soft:#9fb2ad;
  --line:#26322f; --teal:#4fb3bd; --teal-deep:#7fd0d8; --terra:#e08a68;
  --land:#1e2a27; --land-line:#3c4f4a; --water:#0f1a1c;
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans",system-ui,sans-serif; font-size:15px; line-height:1.55;
  -webkit-text-size-adjust:100%;
}
.wrap{max-width:1080px; margin:0 auto; padding:48px 24px 72px}
header{display:flex; flex-direction:column; gap:10px; margin-bottom:34px}
.eyebrow{
  font-family:"IBM Plex Mono",monospace; font-size:12px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--teal-deep);
}
h1{
  font-family:"Fraunces",Georgia,serif; font-weight:560; font-size:clamp(2rem,4vw,2.9rem);
  line-height:1.05; margin:0; text-wrap:balance; letter-spacing:-.01em;
}
.lede{max-width:64ch; color:var(--ink-soft); margin:0}
.scope{
  margin-top:8px; padding:14px 16px; background:var(--panel); border:1px solid var(--line);
  border-radius:10px; max-width:70ch; font-size:14px;
}
.scope b{color:var(--ink); font-weight:600}
figure{margin:0 0 40px}
.map-box{background:var(--water); border:1px solid var(--land-line); border-radius:14px; padding:6px; overflow:hidden}
svg{display:block; width:100%; height:auto}
.land path{fill:var(--land); stroke:var(--land-line); stroke-width:.7; stroke-linejoin:round}
.labels text{
  fill:var(--ink); font-family:"IBM Plex Sans",sans-serif; font-size:10.5px; font-weight:500;
  text-anchor:middle; paint-order:stroke; stroke:var(--water); stroke-width:2.6px;
}
.labels .dot{fill:var(--teal); stroke:var(--water); stroke-width:1.2}
figcaption{margin-top:10px; font-size:13px; color:var(--ink-soft)}
h2{
  font-family:"Fraunces",Georgia,serif; font-weight:560; font-size:1.5rem; margin:0 0 4px;
  letter-spacing:-.01em;
}
.section-note{color:var(--ink-soft); font-size:14px; margin:0 0 18px; max-width:64ch}
.table-scroll{overflow-x:auto; border:1px solid var(--line); border-radius:12px; background:var(--panel)}
table{width:100%; border-collapse:collapse; font-size:14px; min-width:560px}
th,td{text-align:left; padding:9px 16px}
tr.region th{
  font-family:"IBM Plex Mono",monospace; font-weight:500; font-size:12px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--teal-deep); padding-top:20px; padding-bottom:7px;
  border-bottom:1px solid var(--line);
}
tr.region .count{color:var(--ink-soft); margin-left:6px}
tbody tr:not(.region){border-top:1px solid var(--line)}
tbody:first-of-type tr.region th{padding-top:10px}
.c-land{font-weight:600; width:26%}
.c-cap{width:24%}
.c-alt{color:var(--ink-soft); width:38%}
.c-alt .none{opacity:.5}
.c-iso{font-family:"IBM Plex Mono",monospace; color:var(--ink-soft); font-size:12.5px; text-align:right}
tbody tr:not(.region):hover{background:color-mix(in srgb, var(--teal) 7%, transparent)}
.decisions{margin-top:44px}
.decision-grid{display:grid; gap:2px; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:var(--line)}
.decision{background:var(--panel); padding:14px 16px}
.decision.is-call{border-left:3px solid var(--terra)}
.decision dt{font-weight:600; margin-bottom:3px}
.decision dd{margin:0; color:var(--ink-soft); font-size:13.5px}
footer{margin-top:48px; padding-top:18px; border-top:1px solid var(--line); color:var(--ink-soft); font-size:13px}
footer a{color:var(--teal-deep)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
<div class="wrap">
<header>
  <span class="eyebrow">Referenz zum Prüfen</span>
  <h1>Europa-Trainer: Länder & Hauptstädte</h1>
  <p class="lede">Alle Inhalte, die im Lern-Tool abgefragt werden — zum Gegen­lesen, bevor dein Sohn damit lernt. Bei Freitext-Aufgaben werden Groß-/Klein­schreibung, Umlaute, „ß/ss“, Bindestriche, Artikel und die hier gelisteten Schreib­varianten toleriert.</p>
  <div class="scope"><b>Umfang:</b> 50 Länder. Karte: Natural Earth 1:10 Mio., Landes­grenzen. Der Build bricht ab, wenn Länder­liste und Karten­geometrie nicht übereinstimmen oder zwei Antworten nach Normalisierung gleich wären.</div>
</header>

<figure>
  <div class="map-box">${mapSvg}</div>
  <figcaption>Die 50 Länder auf der App-Projektion (Lambert-azimutal, flächen­treu). Punkte = Kleinst­staaten mit vergrößerter Tipp-Fläche.</figcaption>
</figure>

<h2>Länder & Hauptstädte</h2>
<p class="section-note">Nach Regionen gruppiert, innerhalb alphabetisch. „Auch akzeptiert“ listet zusätzliche Schreib­weisen für die Freitext-Stufe.</p>
<div class="table-scroll">
  <table>
    <thead><tr><th>Land</th><th>Hauptstadt</th><th>auch akzeptiert</th><th class="c-iso">Code</th></tr></thead>
    ${tableSections}
  </table>
</div>

<section class="decisions">
  <h2>Entscheidungen</h2>
  <p class="section-note">Wo es mehrere vertretbare Antworten gab. <span style="color:var(--terra)">Terrakotta</span> markiert die Fälle, die du vielleicht anders haben möchtest — sag Bescheid.</p>
  <dl class="decision-grid">${decisionsHtml}</dl>
</section>

<footer>
  Kartendaten: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (gemeinfrei), 1:10 Mio. Admin-0.
  Generiert aus <code>src/data/countries.js</code> — die einzige Quelle der Wahrheit im Projekt.
</footer>
</div>`;

mkdirSync(resolve(root, 'reference'), { recursive: true });
writeFileSync(resolve(root, 'reference/countries.html'), html);
console.log(`reference/countries.html  (${(html.length / 1024).toFixed(0)} KB)`);
