import { useState } from 'preact/hooks';
import { DIRECTIONS, DIRECTION_LABEL, LEVELS, LEVEL_LABEL } from '../types';
import type { Direction, Level, SessionConfig } from '../types';
import { activeProfile, updateSettings } from '../store/store';
import { Button, Chip } from './widgets';

const LENGTHS = [10, 15, 20, 30];

/** Configure a free practice session: directions, level, length, timer, hearts. */
export function Practice({
  onStart,
  onHome,
}: {
  onStart: (c: SessionConfig) => void;
  onHome: () => void;
}) {
  const p = activeProfile();
  const [dirs, setDirs] = useState<Direction[]>(DIRECTIONS);
  const [level, setLevel] = useState<Level | 'adaptive'>('adaptive');
  const [length, setLength] = useState(15);
  const [timer, setTimer] = useState(p?.settings.timer ?? true);
  const [hearts, setHearts] = useState(p?.settings.hearts ?? false);

  const toggleDir = (d: Direction) =>
    setDirs((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const start = () => {
    if (!dirs.length) return;
    updateSettings({ timer, hearts });
    onStart({ mode: 'practice', directions: dirs, level, length, timer, hearts });
  };

  return (
    <div class="screen practice">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück" onClick={onHome}>
          ‹
        </button>
        <h2>Üben</h2>
        <span />
      </header>

      <section>
        <h3>Aufgabentypen</h3>
        <div class="chip-wrap">
          {DIRECTIONS.map((d) => (
            <Chip key={d} active={dirs.includes(d)} onClick={() => toggleDir(d)}>
              {DIRECTION_LABEL[d]}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h3>Stufe <span class="muted">(für Benenn-Aufgaben)</span></h3>
        <div class="chip-wrap">
          <Chip active={level === 'adaptive'} onClick={() => setLevel('adaptive')}>
            Automatisch
          </Chip>
          {LEVELS.map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
              {LEVEL_LABEL[l]}
            </Chip>
          ))}
        </div>
        <p class="muted hint">
          {level === 'adaptive'
            ? 'Leicht → Mittel → Schwer, je nachdem wie gut du ein Land schon kennst.'
            : level === 'easy'
              ? 'Multiple Choice aus 4 Antworten.'
              : level === 'medium'
                ? 'Auswahl aus allen Ländern.'
                : 'Antwort frei eintippen.'}
        </p>
      </section>

      <section>
        <h3>Anzahl Fragen</h3>
        <div class="chip-wrap">
          {LENGTHS.map((n) => (
            <Chip key={n} active={length === n} onClick={() => setLength(n)}>
              {n}
            </Chip>
          ))}
        </div>
      </section>

      <section class="toggles">
        <label class="toggle">
          <input type="checkbox" checked={timer} onChange={(e) => setTimer((e.target as HTMLInputElement).checked)} />
          Zeitlimit pro Frage
        </label>
        <label class="toggle">
          <input type="checkbox" checked={hearts} onChange={(e) => setHearts((e.target as HTMLInputElement).checked)} />
          Mit Leben (Schluss bei 5 Fehlern)
        </label>
      </section>

      <div class="button-row">
        <Button variant="ghost" onClick={onHome}>
          Abbrechen
        </Button>
        <Button size="lg" disabled={!dirs.length} onClick={start}>
          Start
        </Button>
      </div>
    </div>
  );
}
