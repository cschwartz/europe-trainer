import { render, screen, fireEvent } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePicker } from '../../../src/ui/ProfilePicker';
import { __resetForTests, activeProfile, createProfile, getState } from '../../../src/store/store';

beforeEach(() => {
  localStorage.clear();
  __resetForTests();
});

describe('ProfilePicker — no existing profiles', () => {
  it('shows the add-profile form immediately, with submit disabled until a name is entered', async () => {
    const onReady = vi.fn();
    render(<ProfilePicker onReady={onReady} />);
    const submit = screen.getByRole('button', { name: 'Los' });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Dein Name'), 'Max');
    expect(submit).toBeEnabled();
  });

  it('creates a profile and calls onReady on submit', async () => {
    const onReady = vi.fn();
    render(<ProfilePicker onReady={onReady} />);
    await userEvent.type(screen.getByPlaceholderText('Dein Name'), 'Max');
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));

    expect(activeProfile()?.name).toBe('Max');
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('does not submit on whitespace-only input', () => {
    render(<ProfilePicker onReady={vi.fn()} />);
    fireEvent.input(screen.getByPlaceholderText('Dein Name'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Los' })).toBeDisabled();
  });
});

describe('ProfilePicker — existing profiles', () => {
  it('lists profiles newest-first and selects one on click', () => {
    vi.useFakeTimers();
    const a = createProfile('A');
    vi.advanceTimersByTime(1); // distinct createdAt so sort order is deterministic
    createProfile('B'); // becomes active + newest
    vi.useRealTimers();
    const onReady = vi.fn();
    render(<ProfilePicker onReady={onReady} />);

    const rows = document.querySelectorAll<HTMLButtonElement>('.profile-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('B');
    expect(rows[1]).toHaveTextContent('A');

    fireEvent.click(rows[1]);
    expect(activeProfile()?.id).toBe(a);
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('deletes a profile only after confirming', () => {
    createProfile('A');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProfilePicker onReady={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('A löschen'));
    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(Object.keys(getState().profiles)).toHaveLength(1);

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByLabelText('A löschen'));
    expect(Object.keys(getState().profiles)).toHaveLength(0);
  });
});
