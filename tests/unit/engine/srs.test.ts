import { describe, expect, it } from 'vitest';
import { newItem, grade, levelForBox, buildQueue, itemMastery } from '../../../src/engine/srs';

describe('newItem', () => {
  it('starts in box 0', () => {
    expect(newItem('de', 'map->country', 0).box).toBe(0);
  });
});

describe('grade', () => {
  it('promotes the box and pushes the due date out on a correct answer', () => {
    let it_ = newItem('de', 'map->country', 0);
    it_ = grade(it_, { correct: true }, 1000);
    expect(it_.box).toBe(1);
    expect(it_.due).toBeGreaterThan(1000);
  });

  it('demotes the box on a wrong answer', () => {
    let it_ = newItem('de', 'map->country', 0);
    it_ = grade(it_, { correct: true }, 1000);
    it_ = grade(it_, { correct: false }, 2000);
    expect(it_.box).toBe(0);
  });

  it('does not promote past the box the item was in when the answer was shaky', () => {
    const item = newItem('de', 'map->country', 0);
    const graded = grade(item, { correct: true, shaky: true }, 1000);
    expect(graded.box).toBe(item.box);
  });

  it('resets streak to 0 on a wrong answer, increments it on a correct one', () => {
    let it_ = newItem('de', 'map->country', 0);
    it_ = grade(it_, { correct: true }, 1000);
    expect(it_.streak).toBe(1);
    it_ = grade(it_, { correct: false }, 2000);
    expect(it_.streak).toBe(0);
  });
});

describe('levelForBox', () => {
  it('maps box ranges to easy/medium/hard', () => {
    expect(levelForBox(0)).toBe('easy');
    expect(levelForBox(2)).toBe('medium');
    expect(levelForBox(4)).toBe('hard');
  });
});

describe('itemMastery', () => {
  it('is 0 for a brand-new item and 1 for a maxed-out box', () => {
    expect(itemMastery(newItem('de', 'map->country', 0))).toBe(0);
    expect(itemMastery({ ...newItem('de', 'map->country', 0), box: 4 })).toBe(1);
  });
});

describe('buildQueue', () => {
  it('returns exactly `length` items with no country repeated back-to-back', () => {
    const q = buildQueue({}, ['de', 'fr', 'it', 'es', 'pl'], ['map->country', 'map->capital'], 8, 5000);
    expect(q.length).toBe(8);
    for (let i = 1; i < q.length; i++) {
      expect(q[i].country).not.toBe(q[i - 1].country);
    }
  });

  it('prioritizes overdue items before fresh ones', () => {
    const now = 100_000;
    const overdue = { ...newItem('de', 'map->country', 0), seen: 1, due: now - 1 };
    const srs = { [`de|map->country`]: overdue };
    const q = buildQueue(srs, ['de', 'fr'], ['map->country'], 1, now);
    expect(q[0].country).toBe('de');
  });
});
