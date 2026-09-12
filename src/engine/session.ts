/**
 * Turns spaced-repetition items into concrete questions and grades answers.
 */
import type { Level, Question, SessionConfig, SrsItem } from '../types';
import { isMapAnswer, isNaming, itemKey } from '../types';
import { BY_ID } from '../data/countries.js';
import { NEIGHBOURS_BY_ID } from '../map/geo';
import { levelForBox } from './srs';
import { matchAnswer } from './match';

const TIME_LIMIT_MS: Record<Level | 'map', number> = {
  easy: 15_000,
  medium: 22_000,
  hard: 30_000,
  map: 25_000,
};

/** Effective level for an item given the session config. */
export function effectiveLevel(item: SrsItem, config: SessionConfig): Level {
  if (!isNaming(item.direction)) return 'easy';
  if (config.mode === 'exam') return 'hard';
  if (config.level === 'adaptive') return levelForBox(item.box);
  return config.level;
}

function pickDistractors(country: string, n: number): string[] {
  const pool = NEIGHBOURS_BY_ID[country].slice(0, 12);
  const out: string[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

export function makeQuestion(item: SrsItem, config: SessionConfig): Question {
  const level = effectiveLevel(item, config);
  const map = isMapAnswer(item.direction);
  const needsChoices = !map && level === 'easy';
  const choices = needsChoices
    ? shuffle([item.country, ...pickDistractors(item.country, 3)])
    : [];
  let timeLimit: number | null = config.timer ? TIME_LIMIT_MS[map ? 'map' : level] : null;
  if (timeLimit && config.mode === 'exam') timeLimit = Math.round(timeLimit * 0.8);
  return { key: itemKey(item.country, item.direction), country: item.country, direction: item.direction, level, choices, timeLimit };
}

export interface AnswerCheck {
  correct: boolean;
  almost: boolean;
}

/**
 * Grade a submitted answer.
 * @param value  country id (multiple choice / map / list pick) or free text
 */
export function checkAnswer(q: Question, value: string): AnswerCheck {
  const target = BY_ID[q.country];
  if (isMapAnswer(q.direction) || q.direction === 'capital->country') {
    if (q.level === 'hard' && q.direction === 'capital->country') {
      const m = matchAnswer(value, target.name, target.altName ?? []);
      return { correct: m.correct, almost: m.almost };
    }
    return { correct: value === q.country, almost: false };
  }
  // map->country / map->capital
  if (q.level === 'hard') {
    const m =
      q.direction === 'map->country'
        ? matchAnswer(value, target.name, target.altName ?? [])
        : matchAnswer(value, target.cap, target.altCap ?? []);
    return { correct: m.correct, almost: m.almost };
  }
  return { correct: value === q.country, almost: false };
}

/** What the learner reads as the prompt. */
export function promptText(q: Question): string {
  const c = BY_ID[q.country];
  switch (q.direction) {
    case 'map->country':
      return 'Welches Land ist markiert?';
    case 'map->capital':
      return 'Wie heißt die Hauptstadt des markierten Landes?';
    case 'country->map':
      return `Wo liegt ${c.name}?`;
    case 'capital->map':
      return `${c.cap} ist die Hauptstadt von welchem Land? Zeig es auf der Karte.`;
    case 'capital->country':
      return `${c.cap} ist die Hauptstadt von welchem Land?`;
  }
}

/** The correct answer, as shown in feedback. */
export function answerText(q: Question): string {
  const c = BY_ID[q.country];
  if (q.direction === 'map->capital' || q.direction === 'capital->map') {
    return q.direction === 'map->capital' ? c.cap : c.name;
  }
  if (q.direction === 'capital->country') return c.name;
  return c.name;
}

/** Label for a multiple-choice / list option identified by country id. */
export function optionLabel(q: Question, countryId: string): string {
  return q.direction === 'map->capital' ? BY_ID[countryId].cap : BY_ID[countryId].name;
}

/** Direction answered by choosing from the full country/capital list. */
export function usesList(q: Question): boolean {
  return (
    !isMapAnswer(q.direction) &&
    q.level === 'medium'
  );
}

/** Direction answered by free text. */
export function usesFreeText(q: Question): boolean {
  return !isMapAnswer(q.direction) && q.level === 'hard';
}

/** Direction answered by tapping the map. */
export function usesMap(q: Question): boolean {
  return isMapAnswer(q.direction);
}

/** Direction that shows the map as the *prompt* (country highlighted). */
export function showsMapPrompt(q: Question): boolean {
  return q.direction === 'map->country' || q.direction === 'map->capital';
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
