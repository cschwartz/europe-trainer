import { describe, expect, it } from 'vitest';
import { scoreQuestion, rankFor, RANKS, type ScoreInput } from '../../../src/engine/scoring';

const base: ScoreInput = {
  correct: true,
  almost: false,
  isMapAnswer: false,
  level: 'hard',
  timeLeftFraction: 1,
  streakBefore: 0,
};

describe('scoreQuestion', () => {
  it('awards positive points for a correct answer', () => {
    expect(scoreQuestion(base)).toBeGreaterThan(0);
  });

  it('awards nothing for a wrong answer, regardless of streak', () => {
    expect(scoreQuestion({ ...base, correct: false, streakBefore: 5 })).toBe(0);
  });

  it('scores harder levels higher than easier ones, all else equal', () => {
    const easy = scoreQuestion({ ...base, level: 'easy', timeLeftFraction: 0 });
    const hard = scoreQuestion({ ...base, level: 'hard', timeLeftFraction: 0 });
    expect(hard).toBeGreaterThan(easy);
  });

  it('reduces the score for an "almost" (near-miss spelling) answer', () => {
    const full = scoreQuestion({ ...base, timeLeftFraction: 0 });
    const almost = scoreQuestion({ ...base, almost: true, timeLeftFraction: 0 });
    expect(almost).toBeLessThan(full);
  });

  it('gives a monotonically increasing streak bonus, capped at 10', () => {
    const at0 = scoreQuestion({ ...base, timeLeftFraction: 0, streakBefore: 0 });
    const at5 = scoreQuestion({ ...base, timeLeftFraction: 0, streakBefore: 5 });
    const at10 = scoreQuestion({ ...base, timeLeftFraction: 0, streakBefore: 10 });
    const at20 = scoreQuestion({ ...base, timeLeftFraction: 0, streakBefore: 20 });
    expect(at5).toBeGreaterThan(at0);
    expect(at10).toBeGreaterThan(at5);
    expect(at20).toBe(at10);
  });
});

describe('rankFor', () => {
  it('starts at the lowest rank with zero xp', () => {
    expect(rankFor(0).rank.name).toBe('Anfänger');
  });

  it('has no next rank once past the top threshold', () => {
    expect(rankFor(999999).next).toBeNull();
  });

  it('sits exactly at a rank boundary, not the one before it', () => {
    const kartenleser = RANKS[1];
    expect(rankFor(kartenleser.min).rank.name).toBe(kartenleser.name);
    expect(rankFor(kartenleser.min - 1).rank.name).toBe(RANKS[0].name);
  });
});
