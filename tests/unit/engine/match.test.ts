import { describe, expect, it } from 'vitest';
import { normalize, matchAnswer } from '../../../src/engine/match';

describe('normalize', () => {
  it('trims, lowercases, and strips a leading article', () => {
    expect(normalize('  Die Schweiz ')).toBe('schweiz');
  });

  it('folds accents/umlauts', () => {
    expect(normalize('Vereinigtes Königreich')).toBe('vereinigtes konigreich');
  });

  it('turns ß into ss', () => {
    expect(normalize('groß')).toBe('gross');
  });
});

describe('matchAnswer', () => {
  it('accepts an exact match, case-insensitively', () => {
    expect(matchAnswer('kopenhagen', 'Kopenhagen')).toEqual({ correct: true, almost: false });
    expect(matchAnswer('Warschau', 'Warschau')).toEqual({ correct: true, almost: false });
  });

  it('accepts a single-typo near miss and flags it almost', () => {
    const r = matchAnswer('Kopenhaen', 'Kopenhagen');
    expect(r.correct).toBe(true);
    expect(r.almost).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(matchAnswer('Berlin', 'Kopenhagen').correct).toBe(false);
  });

  it('accepts a listed alternative spelling', () => {
    expect(matchAnswer('weissrussland', 'Belarus', ['Weißrussland']).correct).toBe(true);
    expect(matchAnswer('kiew', 'Kiew', ['Kyjiw']).correct).toBe(true);
    expect(matchAnswer('tbilisi', 'Tiflis', ['Tbilissi', 'Tbilisi']).correct).toBe(true);
  });

  it('rejects empty input', () => {
    expect(matchAnswer('   ', 'Kopenhagen')).toEqual({ correct: false, almost: false });
  });
});
