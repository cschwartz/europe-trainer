import { render, screen, fireEvent, act } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Button, Hearts, ProgressBar, TimerBar, RankBar, Chip, Stat } from '../../../src/ui/widgets';

describe('Button', () => {
  it('renders its children and applies variant/size classes', () => {
    render(<Button variant="danger" size="lg">Löschen</Button>);
    const btn = screen.getByRole('button', { name: 'Löschen' });
    expect(btn.className).toBe('btn btn-danger btn-lg');
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('defaults to primary/md and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Los</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    // user-event (unlike fireEvent) respects the disabled attribute the way a
    // real browser does, instead of dispatching the event unconditionally.
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Los</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Los' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Hearts', () => {
  it('renders filled hearts for lives left and empty ones for the rest', () => {
    render(<Hearts total={3} left={2} />);
    expect(screen.getByLabelText('2 von 3 Leben')).toBeInTheDocument();
    const spans = document.querySelectorAll('.heart');
    expect(spans).toHaveLength(3);
    expect(spans[0].textContent).toBe('♥');
    expect(spans[2].textContent).toBe('♡');
    expect(spans[2].className).toContain('lost');
  });
});

describe('ProgressBar', () => {
  it('computes the fill percentage and exposes ARIA attributes', () => {
    render(<ProgressBar value={3} max={4} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemax')).toBe('4');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('75%');
  });

  it('does not divide by zero when max is 0', () => {
    render(<ProgressBar value={0} max={0} />);
    const bar = screen.getByRole('progressbar');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('0%');
  });
});

describe('TimerBar', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls onExpire once after `duration` ms, not before', () => {
    const onExpire = vi.fn();
    render(<TimerBar duration={1000} runId={1} onExpire={onExpire} />);
    act(() => { vi.advanceTimersByTime(999); });
    expect(onExpire).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('restarts the timer when runId changes', () => {
    const onExpire = vi.fn();
    const { rerender } = render(<TimerBar duration={1000} runId={1} onExpire={onExpire} />);
    act(() => { vi.advanceTimersByTime(600); });
    rerender(<TimerBar duration={1000} runId={2} onExpire={onExpire} />);
    act(() => { vi.advanceTimersByTime(600); });
    expect(onExpire).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(400); });
    expect(onExpire).toHaveBeenCalledOnce();
  });
});

describe('RankBar', () => {
  it('shows the current rank/xp and a next-rank hint below the top rank', () => {
    render(<RankBar xp={0} />);
    expect(screen.getByText('Anfänger')).toBeInTheDocument();
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(document.querySelector('.rank-next')).not.toBeNull();
  });

  it('hides the next-rank hint at the top rank', () => {
    render(<RankBar xp={999999} />);
    expect(document.querySelector('.rank-next')).toBeNull();
  });
});

describe('Chip', () => {
  it('reflects active state via aria-pressed and fires onClick', () => {
    const onClick = vi.fn();
    render(<Chip active onClick={onClick}>Leicht</Chip>);
    const chip = screen.getByRole('button', { name: 'Leicht' });
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('Stat', () => {
  it('renders the label and value', () => {
    render(<Stat label="XP" value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('XP')).toBeInTheDocument();
  });
});
