# Europa-Trainer

A "Duolingo for geography" web app for learning the countries of Europe and
their capitals (German UI). Single self-contained HTML file, works offline,
responsive from phone to tablet (safe-area aware, keyboard-aware, landscape).

## Quick start

```bash
npm install
npm run geo      # build the map geometry (needs network once, then cached)
npm run build    # -> dist/index.html  (the deliverable: one file, no assets)
npm run dev      # local dev server
```

Open `dist/index.html` directly in a browser — no server needed.

Pushes to `main` also deploy `dist/` to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (enable once in
*Settings → Pages → Source: GitHub Actions*).

## What it does

Five practice directions:

| Prompt | Answer |
|---|---|
| country highlighted on the map | name the country |
| country highlighted on the map | name the capital |
| a country name | tap the country on the map |
| a capital name | tap the country on the map |
| a capital name | pick the country name |

Naming tasks have three levels: **easy** (4-way multiple choice), **medium**
(pick from the full list), **hard** (free text, typo-tolerant).

Gamification: continuous question queue, Leitner spaced repetition, XP & ranks,
per-question timer with speed bonus, streaks, optional hearts, high scores.
Multiple named profiles. Everything persists to `localStorage`; JSON
export/import for backup.

Modes: **Smart-Mix** (adaptive), **Üben** (pick directions + level), **Prüfung**
(exam), **Erkunden** (free map browsing).

## Project layout

```
src/
  data/countries.js       single source of truth: 50 countries, German names,
                          capitals, accepted alternative spellings
  data/europe.topo.json   generated map geometry (Natural Earth 1:10m)
  engine/                  srs · scoring · session/question generation · match · sound
  store/                   state, persistence, profiles
  map/                     geo (projection, neighbours) · MapView (SVG, zoom/pan)
  ui/                      screens
scripts/
  build-geo.mjs            download + clip + simplify Natural Earth -> topojson
  validate-data.mjs        data <-> geometry <-> answer-collision checks (runs on build)
  build-reference.mjs      generates reference/countries.html, the data-review page
  engine.test.mjs          unit tests for the engine (npm test)
  smoke.mjs                headless end-to-end check at phone + tablet sizes (npm run smoke)
  preview-map.mjs          render the map to an SVG for eyeballing
```

## Map data & correctness

- Source: [Natural Earth](https://www.naturalearthdata.com/) 1:10m admin-0
  boundaries, via the `nvkelso/natural-earth-vector` repo.
- Kept: 50 sovereign states counted as "Europa" in German school geography —
  all UN members in/adjacent to Europe, the 6 microstates, Cyprus, Kosovo, the
  European parts of Russia & Turkey, and the 3 South-Caucasus states.
- Cyprus is reassembled from Natural Earth's divided parts into one island.
- Clipped to a European window; Russia is kept but framed to bleed off screen so
  its truncation edge is never visible.
- Vatican is too small to survive simplification and is drawn as a marker point.
- `npm run build` fails if the country list and the geometry disagree, or if two
  answers collide after normalisation.
- Capitals follow current German school atlases; where a traditional German
  exonym is still standard (Kiew, Tiflis, Eriwan, …) it is the shown answer and
  the endonym is also accepted.

## Tech

Preact + TypeScript, d3-geo / d3-zoom for the map, Vite + `vite-plugin-singlefile`
for the one-file build. No runtime network calls.

## Attribution

**Map data** — country boundaries are © [Natural Earth](https://www.naturalearthdata.com/),
1:10m Cultural Vectors, Admin-0 Countries (public domain; no permission needed,
credit given because it's earned). Fetched from the
[`nvkelso/natural-earth-vector`](https://github.com/nvkelso/natural-earth-vector)
mirror by `scripts/build-geo.mjs` and processed with
[mapshaper](https://github.com/mbloch/mapshaper) (clip, simplify, dissolve).
Same credit appears in-app under **Fortschritt → Über** and at the foot of the
[Länderreferenz](reference/countries.html).

**Libraries** (all MIT-licensed) — [Preact](https://preactjs.com/),
[d3-geo / d3-zoom / d3-selection / d3-transition](https://d3js.org/),
[TopoJSON](https://github.com/topojson/topojson), [Vite](https://vitejs.dev/) and
[vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile),
[mapshaper](https://github.com/mbloch/mapshaper), [Playwright](https://playwright.dev/)
(dev/test only). No fonts, icons or other third-party assets are bundled.

**App code** is [MIT-licensed](LICENSE).
