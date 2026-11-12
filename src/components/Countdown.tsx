import { useEffect, useState } from 'react';
import type { BirthdayConfig } from '../content/types';
import { DEFAULT_UI } from '../content/ui';
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
export function Countdown({
  cfg,
  now,
  text = DEFAULT_UI,
}: {
  cfg: BirthdayConfig;
  now?: () => number;
  text?: Pick<typeof DEFAULT_UI, 'countdownTitle' | 'countdownUnits' | 'countdownNote' | 'today'>;
}) {
  const { phase, remaining } = useBirthdayPhase(cfg, now);
  if (phase !== 'before') {
    return phase === 'today' ? (
      <p className="kicker" data-testid="today">
        {text.today}
      </p>
    ) : null;
  }
  const [d, h, m, s] = text.countdownUnits;
  const units: [number, string][] = [
    [remaining.days, d],
    [remaining.hours, h],
    [remaining.minutes, m],
    [remaining.seconds, s],
  ];
  return (
    <div data-testid="countdown" className="flex flex-col items-center gap-3">
      <p className="kicker">{text.countdownTitle}</p>
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
      <p className="text-xs text-ivory/65">{text.countdownNote}</p>
    </div>
  );
}
