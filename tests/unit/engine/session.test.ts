import { describe, expect, it } from 'vitest';
import {
  effectiveLevel,
  makeQuestion,
  checkAnswer,
  promptText,
  answerText,
  optionLabel,
  usesList,
  usesFreeText,
  usesMap,
  showsMapPrompt,
} from '../../../src/engine/session';
import { newItem } from '../../../src/engine/srs';
import type { Question, SessionConfig, SrsItem } from '../../../src/types';

const config = (patch: Partial<SessionConfig> = {}): SessionConfig => ({
  mode: 'practice',
  directions: ['map->country'],
  level: 'easy',
  length: 10,
  timer: false,
  hearts: false,
  ...patch,
});

const question = (patch: Partial<Question> = {}): Question => ({
  key: 'de|map->country',
  country: 'de',
  direction: 'map->country',
  level: 'easy',
  choices: [],
  timeLimit: null,
  ...patch,
});

describe('effectiveLevel', () => {
  it('is always easy for map-answer directions (no naming levels apply)', () => {
    const item: SrsItem = { ...newItem('de', 'country->map'), box: 4 };
    expect(effectiveLevel(item, config({ level: 'hard' }))).toBe('easy');
  });

  it('forces hard in exam mode for naming directions', () => {
    const item = newItem('de', 'map->country');
    expect(effectiveLevel(item, config({ mode: 'exam', level: 'easy' }))).toBe('hard');
  });

  it('derives the level from the SRS box when adaptive', () => {
    const item: SrsItem = { ...newItem('de', 'map->country'), box: 4 };
    expect(effectiveLevel(item, config({ level: 'adaptive' }))).toBe('hard');
  });

  it('otherwise uses the configured fixed level', () => {
    const item = newItem('de', 'map->country');
    expect(effectiveLevel(item, config({ level: 'medium' }))).toBe('medium');
  });
});

describe('makeQuestion', () => {
  it('builds 4 multiple-choice options (including the answer) at easy level', () => {
    const item = newItem('de', 'map->country');
    const q = makeQuestion(item, config({ level: 'easy' }));
    expect(q.choices).toHaveLength(4);
    expect(q.choices).toContain('de');
  });

  it('has no choices for map-answer directions or non-easy levels', () => {
    const naming = newItem('de', 'map->country');
    expect(makeQuestion(naming, config({ level: 'hard' })).choices).toHaveLength(0);
    const mapAnswer = newItem('de', 'country->map');
    expect(makeQuestion(mapAnswer, config({ level: 'easy' })).choices).toHaveLength(0);
  });

  it('has no time limit when the timer is off', () => {
    const item = newItem('de', 'map->country');
    expect(makeQuestion(item, config({ timer: false })).timeLimit).toBeNull();
  });

  it('shortens the time limit in exam mode', () => {
    // A map-answer direction keeps effectiveLevel() at 'easy' regardless of
    // mode, isolating exam mode's separate 0.8x time-limit multiplier.
    const item = newItem('de', 'country->map');
    const normal = makeQuestion(item, config({ timer: true, mode: 'practice' })).timeLimit!;
    const exam = makeQuestion(item, config({ timer: true, mode: 'exam' })).timeLimit!;
    expect(exam).toBeLessThan(normal);
  });
});

describe('checkAnswer', () => {
  it('checks an easy/medium naming answer by country id', () => {
    const q = question({ direction: 'map->country', level: 'easy' });
    expect(checkAnswer(q, 'de')).toEqual({ correct: true, almost: false });
    expect(checkAnswer(q, 'fr')).toEqual({ correct: false, almost: false });
  });

  it('checks a hard map->country answer by free text against the country name', () => {
    const q = question({ direction: 'map->country', level: 'hard' });
    expect(checkAnswer(q, 'Deutschland').correct).toBe(true);
    expect(checkAnswer(q, 'Frankreich').correct).toBe(false);
  });

  it('checks a hard map->capital answer against the capital name', () => {
    const q = question({ direction: 'map->capital', level: 'hard' });
    expect(checkAnswer(q, 'Berlin').correct).toBe(true);
  });

  it('checks a hard capital->country answer against the country name', () => {
    const q = question({ direction: 'capital->country', level: 'hard' });
    expect(checkAnswer(q, 'Deutschland').correct).toBe(true);
  });

  it('checks a map-answer direction (country->map / capital->map) by country id', () => {
    const q = question({ direction: 'country->map', level: 'easy' });
    expect(checkAnswer(q, 'de')).toEqual({ correct: true, almost: false });
  });
});

describe('text helpers', () => {
  it('promptText asks the right German question per direction', () => {
    expect(promptText(question({ direction: 'map->country' }))).toBe('Welches Land ist markiert?');
    expect(promptText(question({ direction: 'country->map' }))).toBe('Wo liegt Deutschland?');
    expect(promptText(question({ direction: 'capital->country' }))).toBe(
      'Berlin ist die Hauptstadt von welchem Land?'
    );
  });

  it('answerText gives the capital for map->capital, else the country name', () => {
    expect(answerText(question({ direction: 'map->capital' }))).toBe('Berlin');
    expect(answerText(question({ direction: 'map->country' }))).toBe('Deutschland');
  });

  it('optionLabel shows the capital for map->capital, else the country name', () => {
    expect(optionLabel(question({ direction: 'map->capital' }), 'de')).toBe('Berlin');
    expect(optionLabel(question({ direction: 'map->country' }), 'de')).toBe('Deutschland');
  });
});

describe('answer-UI predicates', () => {
  it('usesList only for medium-level naming directions', () => {
    expect(usesList(question({ direction: 'map->country', level: 'medium' }))).toBe(true);
    expect(usesList(question({ direction: 'map->country', level: 'easy' }))).toBe(false);
    expect(usesList(question({ direction: 'country->map', level: 'medium' }))).toBe(false);
  });

  it('usesFreeText only for hard-level naming directions', () => {
    expect(usesFreeText(question({ direction: 'map->country', level: 'hard' }))).toBe(true);
    expect(usesFreeText(question({ direction: 'map->country', level: 'medium' }))).toBe(false);
  });

  it('usesMap only for map-answer directions', () => {
    expect(usesMap(question({ direction: 'country->map' }))).toBe(true);
    expect(usesMap(question({ direction: 'map->country' }))).toBe(false);
  });

  it('showsMapPrompt only when the map is the prompt, not the answer', () => {
    expect(showsMapPrompt(question({ direction: 'map->country' }))).toBe(true);
    expect(showsMapPrompt(question({ direction: 'map->capital' }))).toBe(true);
    expect(showsMapPrompt(question({ direction: 'country->map' }))).toBe(false);
  });
});
