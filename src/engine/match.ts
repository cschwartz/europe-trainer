/**
 * Free-text answer matching for the "hard" naming level.
 *
 * Normalisation makes matching forgiving in the ways that don't teach anything
 * wrong: case, surrounding whitespace, accents/umlauts, sharp-s vs "ss", hyphens
 * vs spaces, and a leading article ("die Schweiz"). Genuinely different word
 * forms must be listed explicitly as alternatives in countries.js.
 *
 * A near miss (Levenshtein distance 1 on a long-enough answer) is accepted but
 * flagged as "almost" so the UI can show the correct spelling.
 */

const ARTICLES = new Set(['der', 'die', 'das', 'la', 'le', 'el']);
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
const APOSTROPHES = new RegExp('[\\u2019\\u0027\\u0060\\u00b4]', 'g');

export function normalize(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/ß/g, 'ss'); // sharp s
  s = s.normalize('NFD').replace(COMBINING_MARKS, '');
  s = s.replace(APOSTROPHES, '');
  s = s.replace(/[-_/]+/g, ' ');
  s = s.replace(/[^a-z0-9 ]+/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  const [first, ...rest] = s.split(' ');
  if (rest.length && ARTICLES.has(first)) s = rest.join(' ');
  return s;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

export interface MatchResult {
  correct: boolean;
  /** Right answer, minor spelling slip. */
  almost: boolean;
}

/**
 * @param input     what the learner typed
 * @param canonical the displayed correct answer
 * @param alts      additional accepted spellings
 */
export function matchAnswer(input: string, canonical: string, alts: string[] = []): MatchResult {
  const got = normalize(input);
  if (!got) return { correct: false, almost: false };
  const accepted = [canonical, ...alts].map(normalize);
  if (accepted.includes(got)) return { correct: true, almost: false };

  for (const target of accepted) {
    if (target.length >= 5 && levenshtein(got, target) <= 1) {
      return { correct: true, almost: true };
    }
    if (target.includes(' ') && Math.abs(got.length - target.length) <= 2) {
      if (levenshtein(got, target) <= 2) return { correct: true, almost: true };
    }
  }
  return { correct: false, almost: false };
}
