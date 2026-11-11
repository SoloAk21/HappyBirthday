import { describe, expect, it } from 'vitest';
import {
  birthdayEnd,
  birthdayPhase,
  birthdayStart,
  timeUntil,
  zonedToUtc,
} from '../../src/lib/countdown';

const cfg = { date: '2026-11-14', timeZone: 'Africa/Addis_Ababa' };

describe('birthday timing (Africa/Addis_Ababa, UTC+3)', () => {
  it('starts at local midnight = 21:00 UTC the day before', () => {
    expect(new Date(birthdayStart(cfg)).toISOString()).toBe('2026-11-13T21:00:00.000Z');
  });

  it('ends at the next local midnight', () => {
    expect(new Date(birthdayEnd(cfg)).toISOString()).toBe('2026-11-14T21:00:00.000Z');
  });

  it('moves through before → today → after', () => {
    expect(birthdayPhase(cfg, Date.parse('2026-11-13T20:59:59Z'))).toBe('before');
    expect(birthdayPhase(cfg, Date.parse('2026-11-13T21:00:00Z'))).toBe('today');
    expect(birthdayPhase(cfg, Date.parse('2026-11-14T20:59:59Z'))).toBe('today');
    expect(birthdayPhase(cfg, Date.parse('2026-11-14T21:00:00Z'))).toBe('after');
    expect(birthdayPhase(cfg, Date.parse('2027-03-01T00:00:00Z'))).toBe('after');
  });

  it('does not depend on the visitor’s own time zone (pure UTC math)', () => {
    // 23:30 on Nov 13 in Addis is still "before", whatever the device zone.
    expect(birthdayPhase(cfg, Date.parse('2026-11-13T20:30:00Z'))).toBe('before');
  });

  it('counts down in d/h/m/s and never goes negative', () => {
    const start = birthdayStart(cfg);
    expect(timeUntil(start, start - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000)).toMatchObject({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
    expect(timeUntil(start, start + 1000).totalMs).toBe(0);
  });
});

describe('zonedToUtc', () => {
  it('handles DST zones', () => {
    // New York: EDT (UTC-4) in July, EST (UTC-5) in January
    expect(new Date(zonedToUtc(2026, 7, 1, 0, 0, 'America/New_York')).toISOString()).toBe(
      '2026-07-01T04:00:00.000Z',
    );
    expect(new Date(zonedToUtc(2026, 1, 1, 0, 0, 'America/New_York')).toISOString()).toBe(
      '2026-01-01T05:00:00.000Z',
    );
  });

  it('handles year boundaries', () => {
    const nye = { date: '2026-12-31', timeZone: 'Africa/Addis_Ababa' };
    expect(new Date(birthdayEnd(nye)).toISOString()).toBe('2026-12-31T21:00:00.000Z');
  });

  it('rejects malformed dates', () => {
    expect(() => birthdayStart({ date: '14/11/2026', timeZone: 'UTC' })).toThrow();
  });
});
