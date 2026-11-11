import type { BirthdayConfig } from '../content/types';

/** Offset (ms) of `timeZone` from UTC at the given instant. */
export function zoneOffsetMs(instant: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** UTC instant (ms) of a wall-clock time in a time zone (DST-safe, two-pass). */
export function zonedToUtc(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  timeZone: string,
): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const first = guess - zoneOffsetMs(guess, timeZone);
  return guess - zoneOffsetMs(first, timeZone);
}

export function parseDate(date: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Invalid birthday date: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function birthdayStart(cfg: BirthdayConfig): number {
  const [y, m, d] = parseDate(cfg.date);
  return zonedToUtc(y, m, d, 0, 0, cfg.timeZone);
}

export function birthdayEnd(cfg: BirthdayConfig): number {
  const [y, m, d] = parseDate(cfg.date);
  // next local midnight (Date.UTC normalises day overflow incl. month/year change)
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return zonedToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    cfg.timeZone,
  );
}

export type Phase = 'before' | 'today' | 'after';

export function birthdayPhase(cfg: BirthdayConfig, now = Date.now()): Phase {
  if (now < birthdayStart(cfg)) return 'before';
  if (now < birthdayEnd(cfg)) return 'today';
  return 'after';
}

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function timeUntil(target: number, now = Date.now()): Remaining {
  const totalMs = Math.max(0, target - now);
  const s = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMs,
  };
}
