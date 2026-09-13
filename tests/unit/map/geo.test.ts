import { describe, expect, it } from 'vitest';
import { COUNTRY_FEATURES, NEIGHBOURS_BY_ID, locationOf, makeProjection } from '../../../src/map/geo';
import { COUNTRIES } from '../../../src/data/countries.js';

describe('COUNTRY_FEATURES', () => {
  it('has one feature per taught country', () => {
    const featureIds = new Set(COUNTRY_FEATURES.map((f) => f.id));
    for (const c of COUNTRIES) {
      expect(featureIds.has(c.id)).toBe(true);
    }
    expect(COUNTRY_FEATURES.length).toBe(COUNTRIES.length);
  });
});

describe('NEIGHBOURS_BY_ID', () => {
  it('never lists a country as its own neighbour', () => {
    for (const c of COUNTRIES) {
      expect(NEIGHBOURS_BY_ID[c.id]).not.toContain(c.id);
    }
  });

  it('lists every other country exactly once', () => {
    expect(NEIGHBOURS_BY_ID['de']).toHaveLength(COUNTRIES.length - 1);
  });

  it('orders neighbours nearest-first', () => {
    const neighbours = NEIGHBOURS_BY_ID['de'];
    const atIdx = neighbours.indexOf('at'); // Austria: borders Germany
    const isIdx = neighbours.indexOf('is'); // Iceland: far from Germany
    expect(atIdx).toBeGreaterThanOrEqual(0);
    expect(isIdx).toBeGreaterThanOrEqual(0);
    expect(atIdx).toBeLessThan(isIdx);
  });
});

describe('makeProjection', () => {
  it('projects a known location inside the viewport bounds', () => {
    const projection = makeProjection(800, 600);
    const point = projection(locationOf('de'));
    expect(point).not.toBeNull();
    const [x, y] = point!;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(800);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(600);
  });
});
