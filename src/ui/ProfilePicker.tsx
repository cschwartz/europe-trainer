import { useState } from 'preact/hooks';
import { useStore } from '../store/hooks';
import { createProfile, deleteProfile, selectProfile } from '../store/store';
import { rankFor } from '../engine/scoring';
import { Button } from './widgets';

export function ProfilePicker({ onReady }: { onReady: () => void }) {
  const store = useStore();
  const profiles = Object.values(store.profiles).sort((a, b) => b.createdAt - a.createdAt);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(profiles.length === 0);

  const add = () => {
    if (!name.trim()) return;
    createProfile(name);
    setName('');
    setAdding(false);
    onReady();
  };

  return (
    <div class="screen center">
      <div class="card profile-card">
        <h1 class="brand">Europa&#8209;Trainer</h1>
        <p class="muted">Länder &amp; Hauptstädte üben</p>

        {profiles.length > 0 && (
          <ul class="profile-list">
            {profiles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  class="profile-row"
                  onClick={() => {
                    selectProfile(p.id);
                    onReady();
                  }}
                >
                  <span class="avatar">{p.avatar}</span>
                  <span class="profile-meta">
                    <strong>{p.name}</strong>
                    <span class="muted">
                      {rankFor(p.stats.xp).rank.name} · {p.stats.xp} XP
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  aria-label={`${p.name} löschen`}
                  onClick={() => {
                    if (confirm(`Profil „${p.name}“ wirklich löschen?`)) deleteProfile(p.id);
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <form
            class="add-profile"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input
              class="text-input"
              placeholder="Dein Name"
              value={name}
              maxLength={24}
              autoFocus
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
            />
            <Button type="submit" disabled={!name.trim()}>
              Los
            </Button>
          </form>
        ) : (
          <Button variant="ghost" onClick={() => setAdding(true)}>
            + Neues Profil
          </Button>
        )}
      </div>
    </div>
  );
}
