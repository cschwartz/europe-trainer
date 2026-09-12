/**
 * The whole persisted state: a set of named profiles, each with its own
 * spaced-repetition data, stats and session history. Everything lives in one
 * localStorage key and is written back (debounced) on every change.
 *
 * The store is a tiny observable so Preact components can subscribe with
 * useSyncExternalStore.
 */
import type {
  AnsweredQuestion,
  Direction,
  Profile,
  SessionSummary,
  SrsItem,
  Store,
} from '../types';
import { DIRECTIONS, itemKey } from '../types';

const KEY = 'europa-trainer';
const VERSION = 1;

// --- persistence ----------------------------------------------------------
function emptyStore(): Store {
  return { version: VERSION, activeProfileId: null, profiles: {} };
}

function migrate(raw: unknown): Store {
  if (!raw || typeof raw !== 'object') return emptyStore();
  const s = raw as Partial<Store>;
  if (s.version !== VERSION || !s.profiles) return emptyStore();
  // Fill in fields added after a profile was created.
  for (const p of Object.values(s.profiles)) ensureProfileShape(p as Profile);
  return { version: VERSION, activeProfileId: s.activeProfileId ?? null, profiles: s.profiles };
}

function load(): Store {
  try {
    const text = localStorage.getItem(KEY);
    return text ? migrate(JSON.parse(text)) : emptyStore();
  } catch {
    return emptyStore();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist(state: Store): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — the app keeps working in memory */
    }
  }, 150);
}

// --- observable ----------------------------------------------------------
let state: Store = load();
const listeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getState(): Store {
  return state;
}

function set(next: Store): void {
  state = next;
  persist(state);
  listeners.forEach((l) => l());
}

/** Immutably update the active profile. */
function updateActive(fn: (p: Profile) => Profile): void {
  const id = state.activeProfileId;
  if (!id || !state.profiles[id]) return;
  set({ ...state, profiles: { ...state.profiles, [id]: fn(state.profiles[id]) } });
}

// --- profiles ----------------------------------------------------------
function ensureProfileShape(p: Profile): Profile {
  p.settings ??= { timer: true, hearts: false, sound: true };
  p.settings.sound ??= true;
  p.srs ??= {};
  p.history ??= [];
  p.stats ??= {
    xp: 0,
    bestSessionScore: 0,
    longestStreak: 0,
    sessions: 0,
    answered: 0,
    correct: 0,
    byDirection: {} as Profile['stats']['byDirection'],
    days: [],
    lastSessionAt: 0,
  };
  for (const d of DIRECTIONS) p.stats.byDirection[d] ??= { seen: 0, correct: 0 };
  return p;
}

const AVATARS = ['🦊', '🐼', '🐧', '🦉', '🐙', '🦄', '🐝', '🐢', '🦁', '🐬'];

export function createProfile(name: string): string {
  const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const used = new Set(Object.values(state.profiles).map((p) => p.avatar));
  const avatar = AVATARS.find((a) => !used.has(a)) ?? AVATARS[Object.keys(state.profiles).length % AVATARS.length];
  const profile = ensureProfileShape({
    id,
    name: name.trim().slice(0, 24) || 'Spieler',
    avatar,
    createdAt: Date.now(),
  } as Profile);
  set({ ...state, activeProfileId: id, profiles: { ...state.profiles, [id]: profile } });
  return id;
}

export function selectProfile(id: string): void {
  if (state.profiles[id]) set({ ...state, activeProfileId: id });
}

export function deleteProfile(id: string): void {
  const profiles = { ...state.profiles };
  delete profiles[id];
  const activeProfileId =
    state.activeProfileId === id ? (Object.keys(profiles)[0] ?? null) : state.activeProfileId;
  set({ ...state, activeProfileId, profiles });
}

export function renameProfile(id: string, name: string): void {
  if (!state.profiles[id]) return;
  set({
    ...state,
    profiles: { ...state.profiles, [id]: { ...state.profiles[id], name: name.trim().slice(0, 24) || 'Spieler' } },
  });
}

export function updateSettings(patch: Partial<Profile['settings']>): void {
  updateActive((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
}

export function activeProfile(): Profile | null {
  return state.activeProfileId ? state.profiles[state.activeProfileId] ?? null : null;
}

// --- applying a finished session ------------------------------------------
function isoDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * Fold a completed session into the active profile: update every touched SRS
 * item, the aggregate stats, the day streak and the history list.
 *
 * @param gradedItems the post-answer SrsItem for each question, in order
 * @param answers     the answer records, same order
 */
export function commitSession(
  gradedItems: SrsItem[],
  answers: AnsweredQuestion[],
  summary: SessionSummary
): void {
  updateActive((p) => {
    const srs = { ...p.srs };
    for (const item of gradedItems) srs[itemKey(item.country, item.direction)] = item;

    const byDirection = { ...p.stats.byDirection } as Profile['stats']['byDirection'];
    for (const a of answers) {
      const cur = byDirection[a.direction] ?? { seen: 0, correct: 0 };
      byDirection[a.direction] = {
        seen: cur.seen + 1,
        correct: cur.correct + (a.correct ? 1 : 0),
      };
    }

    const day = isoDay(summary.at);
    const days = p.stats.days.includes(day) ? p.stats.days : [...p.stats.days, day].slice(-400);

    const stats: Profile['stats'] = {
      xp: p.stats.xp + summary.xp,
      bestSessionScore: Math.max(p.stats.bestSessionScore, summary.score),
      longestStreak: Math.max(p.stats.longestStreak, summary.bestStreak),
      sessions: p.stats.sessions + 1,
      answered: p.stats.answered + summary.total,
      correct: p.stats.correct + summary.correct,
      byDirection,
      days,
      lastSessionAt: summary.at,
    };

    return { ...p, srs, stats, history: [summary, ...p.history].slice(0, 60) };
  });
}

// --- selectors ----------------------------------------------------------
export function dayStreak(p: Profile, now = Date.now()): number {
  const set = new Set(p.stats.days);
  let streak = 0;
  const cursor = new Date(now);
  // allow "today not yet practised" to still count yesterday's streak
  if (!set.has(isoDay(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(isoDay(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Mastery 0..1 for a country: average box fraction across all five directions. */
export function countryMastery(p: Profile, country: string): number {
  let sum = 0;
  for (const d of DIRECTIONS) {
    const item = p.srs[itemKey(country, d as Direction)];
    sum += item ? item.box / 4 : 0;
  }
  return sum / DIRECTIONS.length;
}

export function exportData(): string {
  return JSON.stringify(state, null, 2);
}

export function importData(text: string): boolean {
  try {
    const next = migrate(JSON.parse(text));
    if (!Object.keys(next.profiles).length) return false;
    set(next);
    return true;
  } catch {
    return false;
  }
}
