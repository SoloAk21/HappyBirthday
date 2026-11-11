import { useEffect, useState } from 'react';
import { sound } from '../lib/sound';

export function MuteToggle() {
  const [muted, setMuted] = useState(sound.muted);
  useEffect(() => {
    const off = sound.subscribe(setMuted);
    return () => {
      off();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        if (!sound.started) sound.start();
        sound.toggle();
      }}
      aria-pressed={!muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      className="fixed z-50 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-night/60 text-ivory backdrop-blur-sm transition hover:border-champagne/60"
      style={{
        top: 'calc(var(--safe-top) + 0.9rem)',
        right: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <svg
        width="20"
        height="20"
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
    </button>
  );
}
