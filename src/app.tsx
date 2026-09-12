import { useState } from 'preact/hooks';
import type { SessionConfig, SessionSummary } from './types';
import { useStore } from './store/hooks';
import { ProfilePicker } from './ui/ProfilePicker';
import { Home } from './ui/Home';
import { Practice } from './ui/Practice';
import { Session } from './ui/Session';
import { Results } from './ui/Results';
import { Stats } from './ui/Stats';
import { Explore } from './ui/Explore';

type Screen =
  | { name: 'home' }
  | { name: 'profiles' }
  | { name: 'practice' }
  | { name: 'session'; config: SessionConfig }
  | { name: 'results'; summary: SessionSummary; config: SessionConfig }
  | { name: 'stats' }
  | { name: 'explore' };

export function App() {
  const store = useStore();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [runId, setRunId] = useState(0);
  const startSession = (config: SessionConfig) => {
    setRunId((n) => n + 1);
    setScreen({ name: 'session', config });
  };

  const hasProfile = !!store.activeProfileId && !!store.profiles[store.activeProfileId];
  if (!hasProfile) {
    return <ProfilePicker onReady={() => setScreen({ name: 'home' })} />;
  }

  switch (screen.name) {
    case 'profiles':
      return <ProfilePicker onReady={() => setScreen({ name: 'home' })} />;

    case 'practice':
      return (
        <Practice
          onHome={() => setScreen({ name: 'home' })}
          onStart={startSession}
        />
      );

    case 'session':
      return (
        <Session
          key={runId}
          config={screen.config}
          onQuit={() => setScreen({ name: 'home' })}
          onDone={(summary) => setScreen({ name: 'results', summary, config: screen.config })}
        />
      );

    case 'results':
      return (
        <Results
          summary={screen.summary}
          onHome={() => setScreen({ name: 'home' })}
          onAgain={() => startSession(screen.config)}
        />
      );

    case 'stats':
      return <Stats onHome={() => setScreen({ name: 'home' })} />;

    case 'explore':
      return <Explore onHome={() => setScreen({ name: 'home' })} />;

    default:
      return (
        <Home
          start={startSession}
          openPractice={() => setScreen({ name: 'practice' })}
          openStats={() => setScreen({ name: 'stats' })}
          openExplore={() => setScreen({ name: 'explore' })}
          switchProfile={() => setScreen({ name: 'profiles' })}
        />
      );
  }
}
