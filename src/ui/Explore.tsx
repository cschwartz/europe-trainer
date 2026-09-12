import { useState } from 'preact/hooks';
import { BY_ID } from '../data/countries.js';
import { activeProfile, countryMastery } from '../store/store';
import { MapView } from '../map/MapView';
import { Button } from './widgets';

/** Free exploration: tap any country to see its name, capital and your mastery. */
export function Explore({ onHome }: { onHome: () => void }) {
  const [id, setId] = useState<string | null>(null);
  const [labels, setLabels] = useState(false);
  const profile = activeProfile();
  const c = id ? BY_ID[id] : null;

  return (
    <div class="screen explore">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück" onClick={onHome}>
          ‹
        </button>
        <h2>Erkunden</h2>
        <label class="toggle">
          <input type="checkbox" checked={labels} onChange={(e) => setLabels((e.target as HTMLInputElement).checked)} />
          Namen
        </label>
      </header>

      <div class="explore-map">
        <MapView mode="explore" showLabels={labels} spotlightId={id} onPick={setId} />
      </div>

      <div class={`explore-info${c ? '' : ' is-empty'}`}>
        {c ? (
          <>
            <div class="explore-info-main">
              <strong>{c.name}</strong>
              <span>Hauptstadt: {c.cap}</span>
            </div>
            {profile && (
              <div class="mastery-mini">
                <div class="progress">
                  <div class="progress-fill" style={{ width: `${Math.round(countryMastery(profile, c.id) * 100)}%` }} />
                </div>
                <span class="muted">Gelernt: {Math.round(countryMastery(profile, c.id) * 100)}%</span>
              </div>
            )}
          </>
        ) : (
          <span class="muted">Tippe ein Land an.</span>
        )}
      </div>

      <div class="explore-actions">
        <Button variant="ghost" onClick={onHome}>
          Fertig
        </Button>
      </div>
    </div>
  );
}
