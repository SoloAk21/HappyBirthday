import { useEffect, useReducer, useRef, useState } from 'react';
import { useUi } from '../content/ui';
import { sound } from '../lib/sound';

/**
 * Sound control (top right). With the synthesized score it is a mute toggle.
 * With a music track it opens a small panel: pause/play, volume, mute.
 */
export function MuteToggle() {
  const ui = useUi();
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [panel, setPanel] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = sound.subscribe(refresh);
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    if (!panel) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !wrap.current?.contains(e.target as Node)
      )
        setPanel(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [panel]);

  const muted = sound.muted;
  const toggleMute = () => {
    if (!sound.started) sound.start();
    sound.toggle();
  };

  return (
    <div
      ref={wrap}
      className="fixed z-50"
      style={{
        top: 'calc(var(--safe-top) + 0.9rem)',
        right: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <button
        type="button"
        onClick={() => (sound.hasTrack ? setPanel((p) => !p) : toggleMute())}
        aria-pressed={sound.hasTrack ? undefined : !muted}
        aria-expanded={sound.hasTrack ? panel : undefined}
        aria-label={muted ? ui.soundOn : ui.soundOff}
        className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-night/60 text-ivory backdrop-blur-sm transition hover:border-champagne/60"
      >
        <SpeakerIcon muted={muted || (sound.hasTrack && sound.paused)} />
      </button>

      {panel && (
        <div
          role="group"
          aria-label={ui.volume}
          className="absolute right-0 top-14 flex w-60 items-center gap-3 rounded-full border border-white/15 bg-night-2/90 px-3 py-2 shadow-xl backdrop-blur"
        >
          <button
            type="button"
            onClick={() => {
              if (!sound.started) sound.start();
              if (sound.muted) {
                sound.setMuted(false);
                sound.setPaused(false);
              } else sound.setPaused(!sound.paused);
            }}
            aria-label={sound.paused || muted ? ui.play : ui.pause}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-champagne/90 text-night"
          >
            {sound.paused || muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={Math.round(sound.volume * 100)}
            onChange={(e) => sound.setVolume(Number(e.target.value) / 100)}
            aria-label={ui.volume}
            className="h-1 w-full cursor-pointer accent-[var(--color-champagne)]"
          />
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={!muted}
            aria-label={muted ? ui.soundOn : ui.soundOff}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15"
          >
            <SpeakerIcon muted={muted} small />
          </button>
        </div>
      )}
    </div>
  );
}

function SpeakerIcon({ muted, small }: { muted: boolean; small?: boolean }) {
  const size = small ? 16 : 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" strokeLinejoin="round" />
      {muted ? (
        <path d="M16 9.5l5 5m0-5l-5 5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" strokeLinecap="round" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
