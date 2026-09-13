import { render, screen, fireEvent } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Practice } from '../../../src/ui/Practice';
import { __resetForTests, activeProfile, createProfile } from '../../../src/store/store';
import { DIRECTIONS, DIRECTION_LABEL } from '../../../src/types';

beforeEach(() => {
  localStorage.clear();
  __resetForTests();
});

function chip(text: string) {
  return screen.getByRole('button', { name: text });
}

describe('Practice', () => {
  it('starts with all direction chips active and disables Start when none are selected', () => {
    render(<Practice onStart={vi.fn()} onHome={vi.fn()} />);
    for (const d of DIRECTIONS) {
      expect(chip(DIRECTION_LABEL[d])).toHaveAttribute('aria-pressed', 'true');
    }
    for (const d of DIRECTIONS) fireEvent.click(chip(DIRECTION_LABEL[d]));
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('keeps level and length chip groups mutually exclusive', () => {
    render(<Practice onStart={vi.fn()} onHome={vi.fn()} />);
    expect(chip('Automatisch')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip('Schwer'));
    expect(chip('Schwer')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Automatisch')).toHaveAttribute('aria-pressed', 'false');

    expect(chip('15')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip('30'));
    expect(chip('30')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('15')).toHaveAttribute('aria-pressed', 'false');
  });

  it('starts with the accumulated config and persists timer/hearts to settings', () => {
    createProfile('Max');
    const onStart = vi.fn();
    render(<Practice onStart={onStart} onHome={vi.fn()} />);

    fireEvent.click(chip(DIRECTION_LABEL['map->country']));
    fireEvent.click(chip('Mittel'));
    fireEvent.click(chip('10'));
    fireEvent.click(screen.getByLabelText(/Mit Leben/));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(onStart).toHaveBeenCalledWith({
      mode: 'practice',
      directions: DIRECTIONS.filter((d) => d !== 'map->country'),
      level: 'medium',
      length: 10,
      timer: true,
      hearts: true,
    });
    expect(activeProfile()?.settings).toMatchObject({ timer: true, hearts: true });
  });

  it('calls onHome from both Abbrechen and the back button', () => {
    const onHome = vi.fn();
    render(<Practice onStart={vi.fn()} onHome={onHome} />);
    fireEvent.click(screen.getByLabelText('Zurück'));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onHome).toHaveBeenCalledTimes(2);
  });
});
