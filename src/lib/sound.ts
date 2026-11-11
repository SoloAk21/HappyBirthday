/**
 * Original, synthesized sound design (Web Audio API) — no third-party
 * recordings, so nothing to license. Nothing is created until the visitor
 * taps; audio is always optional and the experience is complete without it.
 */

const PREF_KEY = 'moon:muted';

type Listener = (muted: boolean) => void;

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// Gentle progression: Dmaj9 → Bm9 → Gmaj7(#11) → A6sus
const CHORDS = [
  [50, 57, 61, 64, 66],
  [47, 54, 57, 61, 62],
  [43, 50, 54, 57, 61],
  [45, 52, 57, 59, 62],
];
const SPARKLE = [74, 76, 78, 81, 83, 86];

export function readMutedPreference(
  storage: Pick<Storage, 'getItem'> | undefined = safeSession(),
): boolean {
  try {
    return storage?.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMutedPreference(
  muted: boolean,
  storage: Pick<Storage, 'setItem'> | undefined = safeSession(),
) {
  try {
    storage?.setItem(PREF_KEY, muted ? '1' : '0');
  } catch {
    /* private mode — preference just isn't remembered */
  }
}

function safeSession(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private fx: GainNode | null = null;
  private echo: DelayNode | null = null;
  private chordIndex = 0;
  private lastFx = new Map<string, number>();
  private listeners = new Set<Listener>();
  muted = readMutedPreference();
  started = false;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Must be called from a user gesture. */
  start() {
    if (this.started) return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.started = true;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    this.music = ctx.createGain();
    this.music.gain.value = 0.55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    this.music.connect(lp).connect(this.master);

    this.fx = ctx.createGain();
    this.fx.gain.value = 0.7;
    this.fx.connect(this.master);

    // soft echo for the "space" feeling
    this.echo = ctx.createDelay(1.5);
    this.echo.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.echo.connect(fb).connect(this.echo);
    this.echo.connect(wet).connect(this.master);
    this.music.connect(this.echo);
    this.fx.connect(this.echo);

    document.addEventListener('visibilitychange', this.onVisibility);
    this.playChord();
    window.setInterval(() => this.playChord(), 9000);
    window.setInterval(() => this.sparkle(), 2600);
    this.applyMute(true);
  }

  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else if (!this.muted) void this.ctx.resume();
  };

  toggle() {
    this.setMuted(!this.muted);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    writeMutedPreference(muted);
    this.applyMute(false);
    this.listeners.forEach((l) => l(muted));
  }

  private applyMute(initial: boolean) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    if (this.muted) {
      master.gain.linearRampToValueAtTime(0, t + 0.4);
    } else {
      void ctx.resume();
      master.gain.linearRampToValueAtTime(0.5, t + (initial ? 3 : 0.6));
    }
  }

  private playChord() {
    const { ctx, music } = this;
    if (!ctx || !music || this.muted) return;
    const chord = CHORDS[this.chordIndex++ % CHORDS.length]!;
    const t = ctx.currentTime;
    chord.forEach((n, i) => {
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = NOTE(n);
        osc.detune.value = detune;
        const g = ctx.createGain();
        const peak = (i === 0 ? 0.09 : 0.045) / 2;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 3.2);
        g.gain.setValueAtTime(peak, t + 7.5);
        g.gain.linearRampToValueAtTime(0, t + 11.5);
        osc.connect(g).connect(music);
        osc.start(t);
        osc.stop(t + 11.6);
      }
    });
  }

  private bell(freq: number, when: number, gain: number, decay = 2.2, dest?: AudioNode) {
    const { ctx } = this;
    const out = dest ?? this.fx;
    if (!ctx || !out) return;
    for (const [ratio, amp] of [
      [1, 1],
      [2.01, 0.3],
      [3.98, 0.12],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(gain * amp, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay / ratio);
      osc.connect(g).connect(out);
      osc.start(when);
      osc.stop(when + decay + 0.1);
    }
  }

  private sparkle() {
    const { ctx, music } = this;
    if (!ctx || !music || this.muted || Math.random() < 0.45) return;
    const n = SPARKLE[Math.floor(Math.random() * SPARKLE.length)]!;
    this.bell(NOTE(n), ctx.currentTime + 0.05, 0.035, 3, music);
  }

  private gate(name: string, ms = 150): boolean {
    const now = performance.now();
    if ((this.lastFx.get(name) ?? 0) + ms > now) return false;
    this.lastFx.set(name, now);
    return !!this.ctx && !this.muted;
  }

  /** A small, bright confirmation. */
  chime() {
    if (!this.gate('chime')) return;
    const t = this.ctx!.currentTime;
    this.bell(NOTE(81), t, 0.08);
    this.bell(NOTE(88), t + 0.09, 0.05);
  }

  /** Paper / envelope rustle: filtered noise. */
  paper() {
    if (!this.gate('paper', 400)) return;
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    src.connect(bp).connect(g).connect(this.fx!);
    src.start();
  }

  /** Rising arpeggio for reveals. */
  reveal() {
    if (!this.gate('reveal', 800)) return;
    const t = this.ctx!.currentTime;
    [74, 78, 81, 86, 90].forEach((n, i) => this.bell(NOTE(n), t + i * 0.11, 0.06, 2.6));
  }
}

export const sound = new SoundEngine();
