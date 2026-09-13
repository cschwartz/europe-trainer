// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetForTests,
  activeProfile,
  commitSession,
  countryMastery,
  createProfile,
  dayStreak,
  deleteProfile,
  exportData,
  getState,
  importData,
  renameProfile,
  selectProfile,
  updateSettings,
} from '../../../src/store/store';
import { DIRECTIONS } from '../../../src/types';
import { newItem, grade } from '../../../src/engine/srs';
import type { AnsweredQuestion, SessionSummary } from '../../../src/types';

beforeEach(() => {
  localStorage.clear();
  __resetForTests();
});

describe('createProfile', () => {
  it('creates a profile with a unique avatar and makes it active', () => {
    const id = createProfile('Max');
    expect(activeProfile()?.id).toBe(id);
    expect(activeProfile()?.name).toBe('Max');
    expect(activeProfile()?.avatar).toBeTruthy();
  });

  it('gives two profiles different avatars while avatars are still available', () => {
    createProfile('Max');
    createProfile('Mia');
    const avatars = Object.values(getState().profiles).map((p) => p.avatar);
    expect(new Set(avatars).size).toBe(2);
  });

  it('falls back to "Spieler" for a blank name', () => {
    createProfile('   ');
    expect(activeProfile()?.name).toBe('Spieler');
  });
});

describe('selectProfile / deleteProfile', () => {
  it('switches the active profile', () => {
    const a = createProfile('A');
    createProfile('B');
    selectProfile(a);
    expect(activeProfile()?.id).toBe(a);
  });

  it('falls back to another profile when the active one is deleted', () => {
    const a = createProfile('A');
    const b = createProfile('B');
    selectProfile(a);
    deleteProfile(a);
    expect(activeProfile()?.id).toBe(b);
  });

  it('falls back to null when the last profile is deleted', () => {
    const a = createProfile('A');
    deleteProfile(a);
    expect(activeProfile()).toBeNull();
  });
});

describe('renameProfile / updateSettings', () => {
  it('renames the given profile', () => {
    const id = createProfile('Max');
    renameProfile(id, 'Maxi');
    expect(activeProfile()?.name).toBe('Maxi');
  });

  it('merges settings into the active profile', () => {
    createProfile('Max');
    updateSettings({ sound: false });
    expect(activeProfile()?.settings.sound).toBe(false);
    expect(activeProfile()?.settings.timer).toBe(true); // untouched default survives the merge
  });
});

describe('commitSession', () => {
  it('merges SRS items, aggregates byDirection, dedupes days, and caps history', () => {
    createProfile('Max');
    const item = grade(newItem('de', 'map->country', 1000), { correct: true }, 1000);
    const answers: AnsweredQuestion[] = [
      { key: 'de|map->country', direction: 'map->country', level: 'easy', correct: true, almost: false, timedOut: false, ms: 500, points: 10 },
    ];
    const summary: SessionSummary = {
      at: 1000,
      mode: 'practice',
      score: 10,
      xp: 10,
      total: 1,
      correct: 1,
      almost: 0,
      bestStreak: 1,
      answers,
    };
    commitSession([item], answers, summary);

    const p = activeProfile()!;
    expect(p.srs['de|map->country'].box).toBe(item.box);
    expect(p.stats.byDirection['map->country'].seen).toBe(1);
    expect(p.stats.byDirection['map->country'].correct).toBe(1);
    expect(p.stats.xp).toBe(10);
    expect(p.stats.days).toEqual([new Date(1000).toISOString().slice(0, 10)]);
    expect(p.history).toHaveLength(1);

    // Committing again on the same day must not duplicate the day entry.
    commitSession([item], answers, { ...summary, at: 2000 });
    expect(activeProfile()!.stats.days).toHaveLength(1);
  });

  it('caps history at 60 entries, most recent first', () => {
    createProfile('Max');
    for (let i = 0; i < 65; i++) {
      const summary: SessionSummary = {
        at: i,
        mode: 'practice',
        score: i,
        xp: i,
        total: 1,
        correct: 1,
        almost: 0,
        bestStreak: 1,
        answers: [],
      };
      commitSession([], [], summary);
    }
    const p = activeProfile()!;
    expect(p.history).toHaveLength(60);
    expect(p.history[0].at).toBe(64); // most recent session first
  });
});

describe('dayStreak', () => {
  const DAY = 86_400_000;

  it('counts consecutive days including today', () => {
    createProfile('Max');
    const now = Date.UTC(2024, 0, 10);
    for (const offset of [0, 1, 2]) {
      commitSession([], [], {
        at: now - offset * DAY,
        mode: 'practice',
        score: 0,
        xp: 0,
        total: 0,
        correct: 0,
        almost: 0,
        bestStreak: 0,
        answers: [],
      });
    }
    expect(dayStreak(activeProfile()!, now)).toBe(3);
  });

  it('still counts yesterday\'s streak when today has not been practised yet', () => {
    createProfile('Max');
    const yesterday = Date.UTC(2024, 0, 9);
    commitSession([], [], {
      at: yesterday,
      mode: 'practice',
      score: 0,
      xp: 0,
      total: 0,
      correct: 0,
      almost: 0,
      bestStreak: 0,
      answers: [],
    });
    const today = yesterday + DAY;
    expect(dayStreak(activeProfile()!, today)).toBe(1);
  });
});

describe('countryMastery', () => {
  it('averages the box fraction across all directions, 0 when never seen', () => {
    createProfile('Max');
    expect(countryMastery(activeProfile()!, 'de')).toBe(0);
  });

  it('reflects mastery once at least one direction has progress', () => {
    createProfile('Max');
    const item = { ...newItem('de', DIRECTIONS[0], 0), box: 4 };
    commitSession([item], [], {
      at: 0, mode: 'practice', score: 0, xp: 0, total: 0, correct: 0, almost: 0, bestStreak: 0, answers: [],
    });
    const mastery = countryMastery(activeProfile()!, 'de');
    expect(mastery).toBeCloseTo(1 / DIRECTIONS.length);
  });
});

describe('exportData / importData', () => {
  it('round-trips the full store', () => {
    createProfile('Max');
    const json = exportData();
    localStorage.clear();
    __resetForTests();
    expect(activeProfile()).toBeNull();
    expect(importData(json)).toBe(true);
    expect(activeProfile()?.name).toBe('Max');
  });

  it('rejects malformed JSON without changing state', () => {
    createProfile('Max');
    expect(importData('not json')).toBe(false);
    expect(activeProfile()?.name).toBe('Max');
  });

  it('rejects a payload with no profiles', () => {
    expect(importData(JSON.stringify({ version: 1, activeProfileId: null, profiles: {} }))).toBe(false);
  });
});

describe('persistence', () => {
  it('debounces writes to localStorage', () => {
    vi.useFakeTimers();
    createProfile('Max');
    expect(localStorage.getItem('europa-trainer')).toBeNull();
    vi.advanceTimersByTime(150);
    expect(localStorage.getItem('europa-trainer')).toContain('Max');
    vi.useRealTimers();
  });
});
