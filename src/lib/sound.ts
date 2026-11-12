/**
 * Sound for the experience (Web Audio API). By default an original,
 * synthesized score plays — nothing to license. When the private content names
 * a music track (one the owner has the rights to publish), that recording plays
 * instead, streamed from the authenticated media route. Nothing is created
 * until the visitor taps; audio is always optional.
 */
import { mediaUrl } from './api';

const PREF_KEY = 'moon:muted';
const VOLUME_KEY = 'moon:volume';

type Listener = (muted: boolean) => void;
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

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

export function readVolumePreference(
  storage: Pick<Storage, 'getItem'> | undefined = safeSession(),
): number {
  try {
    const v = Number(storage?.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.8;
  } catch {
    return 0.8;
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
  private trackFile: string | null = null;
  private audio: HTMLAudioElement | null = null;
  private trackGain: GainNode | null = null;
  private ducked = false;
  muted = readMutedPreference();
  /** Music paused by the visitor (independent of mute). */
  paused = false;
  volume = readVolumePreference();
  started = false;

  /** Use a recorded track instead of the synthesized score. Call before start(). */
  setTrack(file: string) {
    if (!this.started) this.trackFile = file;
  }

  get hasTrack() {
    return this.trackFile !== null;
  }

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
    // Any later tap restores audio that the system interrupted (calls, Siri,
    // another app taking the audio focus, iOS suspending the context).
    document.addEventListener('pointerdown', this.recover, { passive: true });
    if (this.trackFile) {
      // with a real song, the little interface chimes stay in the background
      this.fx.gain.value = 0.3;
      this.startTrack(ctx, this.trackFile);
    } else {
      this.playChord();
      window.setInterval(() => this.playChord(), 9000);
      window.setInterval(() => this.sparkle(), 2600);
    }
    this.applyMute(true);
  }

  /** One <audio> element for the whole visit, routed straight to the output. */
  private startTrack(ctx: AudioContext, file: string) {
    const nav = navigator as AudioSessionNavigator;
    // iOS 17+: play like music (ignores the ring/silent switch, as video does).
    if (nav.audioSession) nav.audioSession.type = 'playback';
    const audio = new Audio(mediaUrl(file));
    audio.loop = true;
    audio.preload = 'auto';
    // kept in the document (hidden) so there is exactly one, inspectable player
    audio.hidden = true;
    audio.dataset.music = '';
    document.body.appendChild(audio);
    this.audio = audio;
    this.trackGain = ctx.createGain();
    this.trackGain.gain.value = 0;
    ctx.createMediaElementSource(audio).connect(this.trackGain).connect(ctx.destination);
    if (!this.muted) void audio.play().catch(() => {});
  }

  private musicLevel() {
    if (this.muted || this.paused) return 0;
    return this.volume * (this.ducked ? 0.35 : 1);
  }

  private rampTrack(seconds: number) {
    const { ctx, trackGain } = this;
    if (!ctx || !trackGain) return;
    const t = ctx.currentTime;
    trackGain.gain.cancelScheduledValues(t);
    trackGain.gain.setValueAtTime(trackGain.gain.value, t);
    trackGain.gain.linearRampToValueAtTime(this.musicLevel(), t + seconds);
  }

  private get shouldPlay() {
    return !!this.audio && !this.muted && !this.paused && !document.hidden;
  }

  private recover = () => {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state !== 'running') void this.ctx.resume();
    if (this.shouldPlay && this.audio!.paused) void this.audio!.play().catch(() => {});
  };

  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) {
      this.audio?.pause();
      void this.ctx.suspend();
    } else if (!this.muted) {
      void this.ctx.resume();
      if (this.shouldPlay) void this.audio!.play().catch(() => {});
    }
  };

  /** Pause / resume the music (sound effects keep working). */
  setPaused(paused: boolean) {
    if (!this.audio || paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.rampTrack(0.6);
      window.setTimeout(() => this.paused && this.audio?.pause(), 650);
    } else {
      if (this.ctx?.state !== 'running') void this.ctx?.resume();
      void this.audio.play().catch(() => {});
      this.rampTrack(1.2);
    }
    this.emit();
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0.05, v));
    try {
      safeSession()?.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      /* not remembered */
    }
    this.rampTrack(0.15);
    this.emit();
  }

  /** Softens the music while something needs attention (e.g. reading the letter). */
  duck(on: boolean) {
    if (on === this.ducked) return;
    this.ducked = on;
    this.rampTrack(1.4);
    // the synthesized score steps back too
    const { ctx, music } = this;
    if (ctx && music) {
      const t = ctx.currentTime;
      music.gain.cancelScheduledValues(t);
      music.gain.setValueAtTime(music.gain.value, t);
      music.gain.linearRampToValueAtTime(on ? 0.2 : 0.55, t + 1.4);
    }
  }

  private emit() {
    this.listeners.forEach((l) => l(this.muted));
  }

  toggle() {
    this.setMuted(!this.muted);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    writeMutedPreference(muted);
    this.applyMute(false);
    this.emit();
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
      if (this.shouldPlay && this.audio!.paused) void this.audio!.play().catch(() => {});
    }
    // the recording fades separately (it bypasses the synth's compressor/echo)
    this.rampTrack(this.muted ? 0.4 : initial ? 3 : 0.8);
    if (this.muted && this.audio) window.setTimeout(() => this.muted && this.audio?.pause(), 450);
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
