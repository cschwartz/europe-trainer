import { render, screen, fireEvent } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Home, type HomeActions } from '../../../src/ui/Home';
import { __resetForTests, createProfile, commitSession } from '../../../src/store/store';
import { DIRECTIONS } from '../../../src/types';

function actions(): HomeActions {
  return {
    start: vi.fn(),
    openPractice: vi.fn(),
    openStats: vi.fn(),
    openExplore: vi.fn(),
    switchProfile: vi.fn(),
  };
}

beforeEach(() => {
  localStorage.clear();
  __resetForTests();
});

describe('Home', () => {
  it('renders nothing without an active profile', () => {
    const { container } = render(<Home {...actions()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the profile name/avatar and a fresh-start message with no streak', () => {
    createProfile('Max');
    render(<Home {...actions()} />);
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText(/Bereit für Europa/)).toBeInTheDocument();
  });

  it('shows the "practised today" message once a session was committed today', () => {
    createProfile('Max');
    commitSession([], [], {
      at: Date.now(),
      mode: 'practice',
      score: 0,
      xp: 0,
      total: 0,
      correct: 0,
      almost: 0,
      bestStreak: 0,
      answers: [],
    });
    render(<Home {...actions()} />);
    expect(screen.getByText(/heute schon geübt/)).toBeInTheDocument();
  });

  it('invokes start() with the smart-mix config from the big-start button', () => {
    createProfile('Max');
    const a = actions();
    render(<Home {...a} />);
    fireEvent.click(document.querySelector('.big-start')!);
    expect(a.start).toHaveBeenCalledWith({
      mode: 'smart',
      directions: DIRECTIONS,
      level: 'adaptive',
      length: 15,
      timer: true,
      hearts: false,
    });
  });

  it('invokes start() with the exam config from the Prüfung tile', () => {
    createProfile('Max');
    const a = actions();
    render(<Home {...a} />);
    fireEvent.click(screen.getByText('Prüfung'));
    expect(a.start).toHaveBeenCalledWith({
      mode: 'exam',
      directions: DIRECTIONS,
      level: 'hard',
      length: 20,
      timer: true,
      hearts: true,
    });
  });

  it('wires up the remaining navigation actions', () => {
    createProfile('Max');
    const a = actions();
    render(<Home {...a} />);
    fireEvent.click(screen.getByText('Üben'));
    expect(a.openPractice).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Erkunden'));
    expect(a.openExplore).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByLabelText('Fortschritt'));
    expect(a.openStats).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Max'));
    expect(a.switchProfile).toHaveBeenCalledOnce();
  });
});
