import { useEffect, useState } from 'react';
import type { BirthdayConfig } from '../content/types';
import { birthdayPhase, birthdayStart, timeUntil, type Phase } from '../lib/countdown';

export function useBirthdayPhase(cfg: BirthdayConfig, now: () => number = Date.now) {
  const [t, setT] = useState(now);
  useEffect(() => {
    const id = window.setInterval(() => setT(now()), 1000);
    return () => window.clearInterval(id);
  }, [now]);
  return { phase: birthdayPhase(cfg, t) as Phase, remaining: timeUntil(birthdayStart(cfg), t) };
}

/** Elegant, non-blocking countdown. Renders nothing once the day arrives. */
export function Countdown({ cfg, now }: { cfg: BirthdayConfig; now?: () => number }) {
  const { phase, remaining } = useBirthdayPhase(cfg, now);
  if (phase !== 'before') {
    return phase === 'today' ? (
      <p className="kicker" data-testid="today">
        Today is your day
      </p>
    ) : null;
  }
  const units: [number, string][] = [
    [remaining.days, remaining.days === 1 ? 'day' : 'days'],
    [remaining.hours, 'hrs'],
    [remaining.minutes, 'min'],
    [remaining.seconds, 'sec'],
  ];
  return (
    <div data-testid="countdown" className="flex flex-col items-center gap-3">
      <p className="kicker">Your day begins in</p>
      <div className="flex items-baseline gap-4 sm:gap-6" role="timer" aria-live="off">
        {units.map(([n, label]) => (
          <div key={label} className="flex flex-col items-center">
            <span className="display text-4xl tabular-nums sm:text-5xl">
              {String(n).padStart(2, '0')}
            </span>
            <span className="mt-1 text-[0.65rem] uppercase tracking-[0.25em] text-ivory/65">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-ivory/65">You can peek early — it's all here waiting.</p>
    </div>
  );
}
