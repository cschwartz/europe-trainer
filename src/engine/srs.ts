/**
 * Leitner spaced repetition.
 *
 * Each (country, direction) pair is one item living in a box 0..4. A correct
 * answer promotes it and pushes the next review further out; a wrong answer
 * sends it back. For naming directions the mastery level rides along with the
 * box, so a country the learner knows well is asked in a harder form.
 */
import type { Direction, Level, SrsItem } from '../types';
import { isNaming, itemKey } from '../types';

/** Days until an item in each box is due again. Box 0 is due immediately. */
const BOX_DAYS = [0, 1, 3, 8, 21];
const DAY = 86_400_000;
/** A wrong answer comes back within the same session-ish window. */
const RELEARN_MS = 8 * 60_000;
const MAX_BOX = BOX_DAYS.length - 1;

export function newItem(country: string, direction: Direction, now = Date.now()): SrsItem {
  return {
    country,
    direction,
    box: 0,
    level: 'easy',
    due: now,
    seen: 0,
    correct: 0,
    streak: 0,
    lastSeen: 0,
  };
}

/** Level implied by how well an item is known (naming directions only). */
export function levelForBox(box: number): Level {
  if (box <= 1) return 'easy';
  if (box <= 3) return 'medium';
  return 'hard';
}

export interface Grade {
  correct: boolean;
  /** Right answer but shaky (near-miss spelling, or a slow/timed-out win). */
  shaky?: boolean;
}

export function grade(item: SrsItem, g: Grade, now = Date.now()): SrsItem {
  const next: SrsItem = { ...item, seen: item.seen + 1, lastSeen: now };
  if (g.correct) {
    next.correct = item.correct + 1;
    next.streak = item.streak + 1;
    next.box = g.shaky ? item.box : Math.min(item.box + 1, MAX_BOX);
    next.due = now + BOX_DAYS[next.box] * DAY;
  } else {
    next.streak = 0;
    next.box = Math.max(item.box - 1, 0);
    next.due = now + RELEARN_MS;
  }
  if (isNaming(item.direction)) next.level = levelForBox(next.box);
  return next;
}

/** Mastery of one item in 0..1. */
export function itemMastery(item: SrsItem): number {
  return item.box / MAX_BOX;
}

/**
 * Build the practice queue for a session.
 *
 * @param srs        the profile's item map (may be missing entries)
 * @param countries  all country ids
 * @param directions directions in scope for this session
 * @param length     how many questions
 * @param now        clock
 *
 * Due items come first (most overdue first), then brand-new items, then — only
 * to pad a short queue — the items closest to being due. No country appears
 * twice in a row.
 */
export function buildQueue(
  srs: Record<string, SrsItem>,
  countries: string[],
  directions: Direction[],
  length: number,
  now = Date.now()
): SrsItem[] {
  const all: SrsItem[] = [];
  for (const direction of directions) {
    for (const country of countries) {
      all.push(srs[itemKey(country, direction)] ?? newItem(country, direction, now));
    }
  }
  const due = all.filter((i) => i.seen > 0 && i.due <= now).sort((a, b) => a.due - b.due);
  const fresh = shuffle(all.filter((i) => i.seen === 0));
  const upcoming = all.filter((i) => i.seen > 0 && i.due > now).sort((a, b) => a.due - b.due);

  const picked = [...due, ...fresh, ...upcoming].slice(0, length);
  return spread(picked);
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Reorder so the same country is never asked twice in a row where possible.
 * Greedy: each step take an item from the country with the most left that
 * isn't the one just asked (classic "reorganise" scheduling).
 */
function spread(items: SrsItem[]): SrsItem[] {
  const byCountry = new Map<string, SrsItem[]>();
  for (const it of items) {
    const list = byCountry.get(it.country) ?? [];
    list.push(it);
    byCountry.set(it.country, list);
  }
  const out: SrsItem[] = [];
  let last = '';
  while (out.length < items.length) {
    const candidates = [...byCountry.entries()]
      .filter(([c, list]) => list.length && c !== last)
      .sort((a, b) => b[1].length - a[1].length);
    const [country, list] = candidates[0] ?? [...byCountry.entries()].find(([, l]) => l.length)!;
    out.push(list.pop()!);
    last = country;
  }
  return out;
}
