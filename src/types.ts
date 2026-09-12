/** The five practice directions requested for the trainer. */
export type Direction =
  | 'map->country' // map with a country highlighted  -> name the country
  | 'map->capital' // map with a country highlighted  -> name the capital
  | 'country->map' // a country name is shown         -> pick it on the map
  | 'capital->map' // a capital name is shown          -> pick the country on the map
  | 'capital->country'; // a capital name is shown     -> pick the country name

export const DIRECTIONS: Direction[] = [
  'map->country',
  'map->capital',
  'country->map',
  'capital->map',
  'capital->country',
];

/** Short German labels for the five directions. */
export const DIRECTION_LABEL: Record<Direction, string> = {
  'map->country': 'Karte → Land benennen',
  'map->capital': 'Karte → Hauptstadt benennen',
  'country->map': 'Land → auf der Karte zeigen',
  'capital->map': 'Hauptstadt → Land auf der Karte zeigen',
  'capital->country': 'Hauptstadt → Land benennen',
};

/** Whether a direction is answered by naming (has easy/medium/hard levels). */
export function isNaming(d: Direction): boolean {
  return d === 'map->country' || d === 'map->capital' || d === 'capital->country';
}

/** Whether a direction is answered by picking a country on the map. */
export function isMapAnswer(d: Direction): boolean {
  return d === 'country->map' || d === 'capital->map';
}

/**
 * Difficulty of a naming answer.
 *   easy   – multiple choice out of 4
 *   medium – choice from the full list of countries
 *   hard   – free text input
 * Map-answer directions ignore this and always use 'map'.
 */
export type Level = 'easy' | 'medium' | 'hard';
export const LEVELS: Level[] = ['easy', 'medium', 'hard'];
export const LEVEL_LABEL: Record<Level, string> = {
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
};

export type SessionMode = 'smart' | 'practice' | 'exam' | 'explore';

export interface SessionConfig {
  mode: SessionMode;
  directions: Direction[];
  /** Fixed level for naming directions, or 'adaptive' to derive it per item. */
  level: Level | 'adaptive';
  length: number;
  timer: boolean;
  hearts: boolean;
}

/** One spaced-repetition item: a single (country, direction) pair. */
export interface SrsItem {
  country: string; // country id
  direction: Direction;
  box: number; // Leitner box, 0..4
  level: Level; // current mastery level (naming directions only)
  due: number; // epoch ms when it should next be practised
  seen: number;
  correct: number;
  streak: number;
  lastSeen: number;
}

export type ItemKey = string; // `${country}|${direction}`

export const itemKey = (country: string, direction: Direction): ItemKey =>
  `${country}|${direction}`;

export interface Question {
  key: ItemKey;
  country: string; // the country being asked about (the correct answer)
  direction: Direction;
  level: Level;
  /** Candidate country ids for an 'easy' multiple choice (includes the answer). */
  choices: string[];
  /** Milliseconds allowed, or null when the timer is off. */
  timeLimit: number | null;
}

export interface AnsweredQuestion {
  key: ItemKey;
  direction: Direction;
  level: Level;
  correct: boolean;
  /** True when the answer was right but spelling was slightly off (free text). */
  almost: boolean;
  timedOut: boolean;
  ms: number;
  points: number;
}

export interface SessionSummary {
  at: number;
  mode: SessionMode;
  score: number;
  xp: number;
  total: number;
  correct: number;
  almost: number;
  bestStreak: number;
  answers: AnsweredQuestion[];
}

export interface Profile {
  id: string;
  name: string;
  avatar: string; // emoji
  createdAt: number;
  settings: {
    timer: boolean;
    hearts: boolean;
    sound: boolean;
  };
  srs: Record<ItemKey, SrsItem>;
  stats: {
    xp: number;
    bestSessionScore: number;
    longestStreak: number;
    sessions: number;
    answered: number;
    correct: number;
    byDirection: Record<Direction, { seen: number; correct: number }>;
    days: string[]; // ISO yyyy-mm-dd, ascending, deduped
    lastSessionAt: number;
  };
  history: SessionSummary[];
}

export interface Store {
  version: number;
  activeProfileId: string | null;
  profiles: Record<string, Profile>;
}
