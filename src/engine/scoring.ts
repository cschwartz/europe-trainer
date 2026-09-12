/**
 * Points, streaks, XP and ranks.
 *
 * A question is worth a base amount scaled by how hard the answer form is,
 * plus a speed bonus (only when the timer is on) and a running streak bonus.
 * Session score is the sum; XP is the same number added to the profile total.
 */
import type { Level } from '../types';

const BASE = 10;
const LEVEL_MULT: Record<Level, number> = { easy: 1, medium: 1.6, hard: 2.4 };
/** Map-answer directions have no level; they score like "medium". */
const MAP_MULT = 1.6;

export interface ScoreInput {
  correct: boolean;
  almost: boolean;
  isMapAnswer: boolean;
  level: Level;
  /** 0..1 fraction of the time limit still left; 0 when the timer is off. */
  timeLeftFraction: number;
  /** Consecutive correct answers *before* this one. */
  streakBefore: number;
}

export function scoreQuestion(i: ScoreInput): number {
  if (!i.correct) return 0;
  const mult = i.isMapAnswer ? MAP_MULT : LEVEL_MULT[i.level];
  const speed = Math.round(10 * Math.max(0, Math.min(1, i.timeLeftFraction)));
  const streakBonus = Math.min(i.streakBefore, 10) * 2;
  const raw = (BASE + speed) * mult + streakBonus;
  return Math.round(i.almost ? raw * 0.6 : raw);
}

// --- Ranks -----------------------------------------------------------------
export interface Rank {
  name: string;
  min: number;
}

export const RANKS: Rank[] = [
  { name: 'Anfänger', min: 0 },
  { name: 'Kartenleser', min: 250 },
  { name: 'Entdecker', min: 700 },
  { name: 'Reisender', min: 1500 },
  { name: 'Geograf', min: 3000 },
  { name: 'Kartograf', min: 5500 },
  { name: 'Europa-Kenner', min: 9000 },
  { name: 'Europa-Meister', min: 14000 },
  { name: 'Großmeister', min: 21000 },
];

export interface RankProgress {
  rank: Rank;
  next: Rank | null;
  /** 0..1 toward the next rank (1 when already at the top). */
  progress: number;
  intoRank: number;
  toNext: number;
}

export function rankFor(xp: number): RankProgress {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  if (!next) return { rank, next: null, progress: 1, intoRank: xp - rank.min, toNext: 0 };
  const span = next.min - rank.min;
  const intoRank = xp - rank.min;
  return { rank, next, progress: intoRank / span, intoRank, toNext: next.min - xp };
}
