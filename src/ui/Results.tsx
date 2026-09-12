import type { SessionSummary } from '../types';
import { DIRECTION_LABEL } from '../types';
import { BY_ID } from '../data/countries.js';
import { activeProfile } from '../store/store';
import { RankBar, Button, Stat } from './widgets';

export function Results({
  summary,
  onAgain,
  onHome,
}: {
  summary: SessionSummary;
  onAgain: () => void;
  onHome: () => void;
}) {
  const profile = activeProfile();
  const acc = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
  const isRecord = (profile?.stats.bestSessionScore ?? 0) <= summary.score && summary.score > 0;
  const missed = summary.answers.filter((a) => !a.correct);

  return (
    <div class="screen center">
      <div class="card results-card">
        <h2>Session beendet</h2>
        {isRecord && <div class="record-badge">🏆 Neuer Highscore!</div>}

        <div class="stat-row">
          <Stat label="Punkte" value={summary.score} />
          <Stat label="Richtig" value={`${summary.correct}/${summary.total}`} />
          <Stat label="Genauigkeit" value={`${acc}%`} />
          <Stat label="Beste Serie" value={summary.bestStreak} />
        </div>

        <p class="xp-gain">+{summary.xp} XP</p>
        {profile && <RankBar xp={profile.stats.xp} />}

        {missed.length > 0 && (
          <div class="review-list">
            <h3>Nochmal ansehen</h3>
            <ul>
              {missed.slice(0, 8).map((a, i) => {
                const c = BY_ID[a.key.split('|')[0]];
                return (
                  <li key={i}>
                    <strong>{c.name}</strong> — {c.cap}
                    <span class="muted"> · {DIRECTION_LABEL[a.direction]}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div class="button-row">
          <Button variant="ghost" onClick={onHome}>
            Startseite
          </Button>
          <Button size="lg" onClick={onAgain}>
            Nochmal
          </Button>
        </div>
      </div>
    </div>
  );
}
