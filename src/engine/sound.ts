/**
 * Tiny WebAudio sound effects — generated tones, no asset files, so the
 * single-file build stays self-contained. Silently does nothing when the
 * profile has sound switched off or the browser blocks audio.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, gain = 0.15, type: OscillatorType = 'sine'): void {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + start;
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

export const sfx = {
  correct(): void {
    tone(660, 0, 0.12);
    tone(880, 0.09, 0.16);
  },
  almost(): void {
    tone(560, 0, 0.14, 0.13, 'triangle');
  },
  wrong(): void {
    tone(180, 0, 0.22, 0.12, 'sawtooth');
  },
  streak(): void {
    tone(660, 0, 0.1);
    tone(880, 0.08, 0.1);
    tone(1175, 0.16, 0.2);
  },
  finish(): void {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.25));
  },
};
