import { DIRECTIONS } from '../types';
import type { SessionConfig } from '../types';
import { useStore } from '../store/hooks';
import { activeProfile, dayStreak } from '../store/store';
import { RankBar } from './widgets';

export interface HomeActions {
  start: (config: SessionConfig) => void;
  openPractice: () => void;
  openStats: () => void;
  openExplore: () => void;
  switchProfile: () => void;
}

const SMART: SessionConfig = {
  mode: 'smart',
  directions: DIRECTIONS,
  level: 'adaptive',
  length: 15,
  timer: true,
  hearts: false,
};

const EXAM: SessionConfig = {
  mode: 'exam',
  directions: DIRECTIONS,
  level: 'hard',
  length: 20,
  timer: true,
  hearts: true,
};

export function Home(a: HomeActions) {
  const store = useStore();
  const p = activeProfile();
  if (!p) return null;
  const streak = dayStreak(p);
  const practisedToday = new Date(p.stats.lastSessionAt).toDateString() === new Date().toDateString();

  return (
    <div class="screen home">
      <header class="topbar">
        <button type="button" class="profile-pill" onClick={a.switchProfile}>
          <span class="avatar">{p.avatar}</span>
          {p.name}
        </button>
        <button type="button" class="icon-btn" aria-label="Fortschritt" onClick={a.openStats}>
          📊
        </button>
      </header>

      <div class="hero">
        <div class={`streak-ring${streak > 0 ? ' on' : ''}`}>
          <span class="streak-num">{streak}</span>
          <span class="streak-cap">Tage</span>
        </div>
        <p class="hero-msg">
          {practisedToday
            ? 'Stark — heute schon geübt! Noch eine Runde?'
            : streak > 0
              ? 'Bleib dran, damit deine Serie nicht reißt!'
              : 'Bereit für Europa? Los geht’s!'}
        </p>
      </div>

      <RankBar xp={p.stats.xp} />

      <button type="button" class="big-start" onClick={() => a.start(SMART)}>
        <span class="big-start-title">Weiter lernen</span>
        <span class="big-start-sub">Smart-Mix · 15 Fragen · passt sich an dich an</span>
      </button>

      <div class="mode-grid">
        <button type="button" class="mode-tile" onClick={a.openPractice}>
          <span class="mode-emoji">🎯</span>
          <span class="mode-name">Üben</span>
          <span class="mode-desc">Richtung &amp; Stufe selbst wählen</span>
        </button>
        <button type="button" class="mode-tile" onClick={() => a.start(EXAM)}>
          <span class="mode-emoji">🏁</span>
          <span class="mode-name">Prüfung</span>
          <span class="mode-desc">20 Fragen, schwer, mit Leben</span>
        </button>
        <button type="button" class="mode-tile" onClick={a.openExplore}>
          <span class="mode-emoji">🗺️</span>
          <span class="mode-name">Erkunden</span>
          <span class="mode-desc">Karte frei ansehen</span>
        </button>
        <button type="button" class="mode-tile" onClick={a.openStats}>
          <span class="mode-emoji">📈</span>
          <span class="mode-name">Fortschritt</span>
          <span class="mode-desc">Highscores &amp; schwache Länder</span>
        </button>
      </div>

      <p class="foot-note">{store.activeProfileId && `${Object.keys(store.profiles).length} Profile`}</p>
    </div>
  );
}
