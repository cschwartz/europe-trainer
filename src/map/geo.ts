/**
 * Loads the embedded TopoJSON once and exposes:
 *   - a GeoJSON FeatureCollection of the ~50 taught countries
 *   - per-country geographic location (interior point)
 *   - a nearest-neighbour lookup used to pick plausible quiz distractors
 *   - the shared d3 projection, fitted to the map viewport
 */
import { feature } from 'topojson-client';
import { geoAzimuthalEqualArea, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import topo from '../data/europe.topo.json';
import { COUNTRIES } from '../data/countries.js';

export interface CountryFeatureProps {
  centroid: [number, number];
  marker?: boolean;
}
export type CountryFeature = Feature<Geometry | null, CountryFeatureProps> & { id: string };

const fc = feature(
  topo as never,
  (topo as never as { objects: { countries: never } }).objects.countries
) as unknown as FeatureCollection<Geometry | null, CountryFeatureProps>;

export const COUNTRY_FEATURES: CountryFeature[] = fc.features
  .map((f) => f as CountryFeature)
  .sort((a, b) => a.id.localeCompare(b.id));

export const FEATURE_BY_ID: Record<string, CountryFeature> = Object.fromEntries(
  COUNTRY_FEATURES.map((f) => [f.id, f])
);

/** Geographic location [lon, lat] of a country (interior point). */
export function locationOf(id: string): [number, number] {
  return FEATURE_BY_ID[id].properties.centroid;
}

/** Countries rendered as a marker dot rather than a polygon (e.g. Vatican). */
export const MARKER_IDS = new Set(
  COUNTRY_FEATURES.filter((f) => f.properties.marker || f.geometry === null).map((f) => f.id)
);

// --- Nearest neighbours (great-circle distance between interior points) -------
function haversine(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(s));
}

/** For each country, ids of the other countries ordered nearest → farthest. */
export const NEIGHBOURS_BY_ID: Record<string, string[]> = (() => {
  const ids = COUNTRIES.map((c) => c.id);
  const out: Record<string, string[]> = {};
  for (const id of ids) {
    const here = locationOf(id);
    out[id] = ids
      .filter((o) => o !== id)
      .sort((p, q) => haversine(here, locationOf(p)) - haversine(here, locationOf(q)));
  }
  return out;
})();

// --- Projection -------------------------------------------------------------
// Everything except Russia — used to frame the map. Russia is kept in the data
// (clipped well past the frame) but deliberately allowed to bleed off the top
// right under the SVG clip, so its cut edge is never on screen and the rest of
// Europe isn't shrunk to accommodate it.
const FRAME = {
  type: 'FeatureCollection',
  features: COUNTRY_FEATURES.filter((f) => f.id !== 'ru' && f.geometry),
} as const;

/**
 * Lambert azimuthal equal-area centred on 10°E / 52°N — the standard projection
 * for pan-European maps (EU's ETRS89-LAEA). Equal-area keeps country sizes
 * honest for a quiz, and an azimuthal projection stays well-behaved right out
 * to Iceland and the Caucasus, unlike a conic. Recreated per viewport size.
 */
export function makeProjection(width: number, height: number, pad = 6): GeoProjection {
  return geoAzimuthalEqualArea()
    .rotate([-10, -52])
    .fitExtent(
      [
        [pad, pad],
        [width - pad, height - pad],
      ],
      FRAME as never
    );
}
