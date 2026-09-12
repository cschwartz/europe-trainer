import { DIRECTIONS, DIRECTION_LABEL } from '../types';
import { COUNTRIES } from '../data/countries.js';
import { useStore } from '../store/hooks';
import {
  activeProfile,
  countryMastery,
  dayStreak,
  exportData,
  importData,
  updateSettings,
} from '../store/store';
import { RankBar, Button, Stat } from './widgets';

export function Stats({ onHome }: { onHome: () => void }) {
  useStore();
  const p = activeProfile();
  if (!p) return null;

  const acc = p.stats.answered ? Math.round((p.stats.correct / p.stats.answered) * 100) : 0;
  const mastered = COUNTRIES.filter((c) => countryMastery(p, c.id) >= 0.75).length;
  const weakest = COUNTRIES.map((c) => ({ c, m: countryMastery(p, c.id) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 6);

  const doExport = () => {
    const json = exportData();
    // Copy to clipboard rather than a file download — simplest thing that works
    // everywhere. Restore with "Importieren" (paste).
    const fallback = () => window.prompt('Sicherung — kopieren und sicher aufbewahren:', json);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).then(
        () => alert('Sicherung in die Zwischenablage kopiert.'),
        fallback
      );
    } else {
      fallback();
    }
  };
  const doImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        file.text().then((t) => alert(importData(t) ? 'Daten importiert.' : 'Import fehlgeschlagen.'));
        return;
      }
      const pasted = window.prompt('Sicherung hier einfügen:');
      if (pasted) alert(importData(pasted) ? 'Daten importiert.' : 'Import fehlgeschlagen.');
    };
    input.click();
  };

  return (
    <div class="screen stats">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück" onClick={onHome}>
          ‹
        </button>
        <h2>Fortschritt</h2>
        <span class="avatar">{p.avatar}</span>
      </header>

      <RankBar xp={p.stats.xp} />

      <div class="stat-row">
        <Stat label="Tage-Serie" value={`${dayStreak(p)} 🔥`} />
        <Stat label="Highscore" value={p.stats.bestSessionScore} />
        <Stat label="Längste Serie" value={p.stats.longestStreak} />
        <Stat label="Genauigkeit" value={`${acc}%`} />
        <Stat label="Sessions" value={p.stats.sessions} />
        <Stat label="Länder ≥75%" value={`${mastered}/${COUNTRIES.length}`} />
      </div>

      <section>
        <h3>Nach Aufgabentyp</h3>
        {DIRECTIONS.map((d) => {
          const s = p.stats.byDirection[d] ?? { seen: 0, correct: 0 };
          const pct = s.seen ? Math.round((s.correct / s.seen) * 100) : 0;
          return (
            <div class="bar-row" key={d}>
              <span class="bar-label">{DIRECTION_LABEL[d]}</span>
              <div class="progress">
                <div class="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span class="bar-val">{s.seen ? `${pct}%` : '–'}</span>
            </div>
          );
        })}
      </section>

      <section>
        <h3>Üb das nochmal</h3>
        <ul class="weak-list">
          {weakest.map(({ c, m }) => (
            <li key={c.id}>
              <strong>{c.name}</strong> — {c.cap}
              <div class="progress sm">
                <div class="progress-fill" style={{ width: `${Math.round(m * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Verlauf</h3>
        <ul class="history-list">
          {p.history.slice(0, 10).map((h, i) => (
            <li key={i}>
              <span>{new Date(h.at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
              <span class="muted">{modeLabel(h.mode)}</span>
              <span>{h.correct}/{h.total}</span>
              <strong>{h.score}</strong>
            </li>
          ))}
          {!p.history.length && <li class="muted">Noch keine Sessions.</li>}
        </ul>
      </section>

      <section>
        <h3>Einstellungen</h3>
        <label class="toggle">
          <input
            type="checkbox"
            checked={p.settings.sound}
            onChange={(e) => updateSettings({ sound: (e.target as HTMLInputElement).checked })}
          />
          Töne
        </label>
      </section>

      <section class="backup">
        <h3>Sicherung</h3>
        <p class="muted">
          Alle Daten liegen nur in diesem Browser. „Sichern“ kopiert sie als Text —
          zum Wiederherstellen mit „Einspielen“ einfügen.
        </p>
        <div class="button-row">
          <Button variant="ghost" onClick={doExport}>
            Sichern
          </Button>
          <Button variant="ghost" onClick={doImport}>
            Einspielen
          </Button>
        </div>
      </section>

      <section class="about">
        <h3>Über</h3>
        <p class="muted">
          Kartendaten: ©{' '}
          <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">
            Natural Earth
          </a>{' '}
          (gemeinfrei), 1:10&nbsp;Mio. Länder­grenzen.
          <br />
          Gebaut mit{' '}
          <a href="https://preactjs.com/" target="_blank" rel="noopener noreferrer">
            Preact
          </a>
          ,{' '}
          <a href="https://d3js.org/" target="_blank" rel="noopener noreferrer">
            d3
          </a>{' '}
          und{' '}
          <a href="https://github.com/topojson/topojson" target="_blank" rel="noopener noreferrer">
            TopoJSON
          </a>{' '}
          (MIT-lizenziert).
        </p>
      </section>

      <div class="button-row">
        <Button size="lg" onClick={onHome}>
          Zurück
        </Button>
      </div>
    </div>
  );
}

function modeLabel(m: string): string {
  return { smart: 'Smart-Mix', practice: 'Üben', exam: 'Prüfung', explore: 'Erkunden' }[m] ?? m;
}
