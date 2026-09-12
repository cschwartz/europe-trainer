import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { rankFor } from '../engine/scoring';

export function Button(props: {
  children: ComponentChildren;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'lg' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const { variant = 'primary', size = 'md', ...rest } = props;
  return (
    <button
      type={props.type ?? 'button'}
      class={`btn btn-${variant} btn-${size}`}
      disabled={props.disabled}
      onClick={rest.onClick}
    >
      {props.children}
    </button>
  );
}

export function Hearts({ total, left }: { total: number; left: number }) {
  return (
    <div class="hearts" aria-label={`${left} von ${total} Leben`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} class={i < left ? 'heart' : 'heart lost'}>
          {i < left ? '♥' : '♡'}
        </span>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div class="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div class="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * A shrinking bar animated purely with a CSS transition, so it costs no
 * re-renders. Calls onExpire once when it runs out. `runId` restarts it.
 */
export function TimerBar({
  duration,
  runId,
  paused,
  onExpire,
}: {
  duration: number;
  runId: number | string;
  paused?: boolean;
  onExpire: () => void;
}) {
  const [phase, setPhase] = useState<'full' | 'draining'>('full');
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    setPhase('full');
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('draining')));
    const timer = setTimeout(() => {
      if (!fired.current) {
        fired.current = true;
        onExpire();
      }
    }, duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, duration]);

  const width = phase === 'full' ? '100%' : '0%';
  const low = phase === 'draining';
  return (
    <div class="timerbar">
      <div
        class={`timerbar-fill${low ? ' is-low' : ''}`}
        style={{
          width: paused ? undefined : width,
          transition: paused ? 'none' : `width ${duration}ms linear, background-color 400ms`,
        }}
      />
    </div>
  );
}

export function RankBar({ xp }: { xp: number }) {
  const r = rankFor(xp);
  return (
    <div class="rankbar">
      <div class="rankbar-top">
        <span class="rank-name">{r.rank.name}</span>
        <span class="rank-xp">{xp} XP</span>
      </div>
      <div class="progress">
        <div class="progress-fill" style={{ width: `${Math.round(r.progress * 100)}%` }} />
      </div>
      {r.next && (
        <div class="rank-next">
          noch {r.toNext} XP bis <strong>{r.next.name}</strong>
        </div>
      )}
    </div>
  );
}

export function Chip({ children, active, onClick }: { children: ComponentChildren; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" class={`chip${active ? ' is-active' : ''}`} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  );
}

export function Stat({ label, value }: { label: string; value: ComponentChildren }) {
  return (
    <div class="stat">
      <div class="stat-value">{value}</div>
      <div class="stat-label">{label}</div>
    </div>
  );
}
