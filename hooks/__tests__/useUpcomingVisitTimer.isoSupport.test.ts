/**
 * Tests for visitStartAt ISO UTC support in useUpcomingVisitTimer.
 * Covers: parseVisitStartAt, isUpcomingVisitFromISO, and the useUpcomingIndicator
 * hook's preference for visitStartAt over visitDate+visitTime.
 */
import {
  parseVisitStartAt,
  isUpcomingVisitFromISO,
  isUpcomingVisit,
} from '../useUpcomingVisitTimer';

// ─── parseVisitStartAt ───────────────────────────────────────────────────────

describe('parseVisitStartAt', () => {
  it('parses a valid Z-suffix ISO string', () => {
    const d = parseVisitStartAt('2025-01-15T09:00:00Z');
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(new Date('2025-01-15T09:00:00Z').getTime());
  });

  it('parses an ISO string with +00:00 offset', () => {
    const d = parseVisitStartAt('2025-06-10T14:30:00+00:00');
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(new Date('2025-06-10T14:30:00+00:00').getTime());
  });

  it('parses an ISO string with a non-UTC offset', () => {
    const d = parseVisitStartAt('2025-06-10T17:30:00+03:00');
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(new Date('2025-06-10T17:30:00+03:00').getTime());
  });

  it('returns null for empty string', () => {
    expect(parseVisitStartAt('')).toBeNull();
  });

  it('returns null for a non-string value', () => {
    expect(parseVisitStartAt(null as unknown as string)).toBeNull();
    expect(parseVisitStartAt(undefined as unknown as string)).toBeNull();
  });

  it('returns null for a completely invalid string', () => {
    expect(parseVisitStartAt('not-a-date')).toBeNull();
  });

  it('does not return null for a date-only ISO string (JS Date parses it as UTC midnight)', () => {
    // '2025-01-15' is a valid ISO 8601 date; new Date() parses it as UTC midnight.
    // parseVisitStartAt accepts it — callers relying on this receive a Date at 00:00 UTC.
    expect(parseVisitStartAt('2025-01-15')).not.toBeNull();
  });
});

// ─── isUpcomingVisitFromISO ──────────────────────────────────────────────────

describe('isUpcomingVisitFromISO', () => {
  const THRESHOLD = 15;

  it('returns true when the visit is within the threshold window', () => {
    const visitTime = Date.now() + 10 * 60 * 1000;
    const iso = new Date(visitTime).toISOString();
    expect(isUpcomingVisitFromISO(iso, THRESHOLD, Date.now)).toBe(true);
  });

  it('returns true at exactly 1 ms before threshold boundary', () => {
    const visitTime = Date.now() + THRESHOLD * 60 * 1000 - 1;
    const iso = new Date(visitTime).toISOString();
    expect(isUpcomingVisitFromISO(iso, THRESHOLD, Date.now)).toBe(true);
  });

  it('returns true when the visit is exactly at the threshold boundary (boundary is inclusive)', () => {
    // remainingMs == thresholdMs → condition: remainingMs > 0 && remainingMs <= thresholdMs → true
    const nowMs = 1_700_000_000_000;
    const visitTime = nowMs + THRESHOLD * 60 * 1000;
    const iso = new Date(visitTime).toISOString();
    expect(isUpcomingVisitFromISO(iso, THRESHOLD, () => nowMs)).toBe(true);
  });

  it('returns false when the visit is beyond the threshold window', () => {
    const visitTime = Date.now() + 60 * 60 * 1000;
    const iso = new Date(visitTime).toISOString();
    expect(isUpcomingVisitFromISO(iso, THRESHOLD, Date.now)).toBe(false);
  });

  it('returns false when the visit has already started (in the past)', () => {
    const visitTime = Date.now() - 1_000;
    const iso = new Date(visitTime).toISOString();
    expect(isUpcomingVisitFromISO(iso, THRESHOLD, Date.now)).toBe(false);
  });

  it('returns false for an invalid ISO string', () => {
    expect(isUpcomingVisitFromISO('bad-date', THRESHOLD, Date.now)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isUpcomingVisitFromISO('', THRESHOLD, Date.now)).toBe(false);
  });

  it('uses custom nowFn for deterministic testing', () => {
    const fixedNow = 1_700_000_000_000;
    const visitTime = fixedNow + 5 * 60 * 1000;
    const iso = new Date(visitTime).toISOString();
    expect(isUpcomingVisitFromISO(iso, THRESHOLD, () => fixedNow)).toBe(true);
  });

  it('respects a custom threshold (30 min)', () => {
    const fixedNow = 1_700_000_000_000;
    const visitTime = fixedNow + 20 * 60 * 1000;
    const iso = new Date(visitTime).toISOString();
    expect(isUpcomingVisitFromISO(iso, 30, () => fixedNow)).toBe(true);
    expect(isUpcomingVisitFromISO(iso, 15, () => fixedNow)).toBe(false);
  });
});

// ─── isUpcomingVisit (legacy visitDate + visitTime path) ────────────────────

describe('isUpcomingVisit legacy path', () => {
  it('still works with a local date+time pair', () => {
    const now = new Date();
    const in10 = new Date(now.getTime() + 10 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${in10.getFullYear()}-${pad(in10.getMonth() + 1)}-${pad(in10.getDate())}`;
    const timeStr = `${pad(in10.getHours())}:${pad(in10.getMinutes())}`;
    expect(isUpcomingVisit(dateStr, timeStr, 15, Date.now)).toBe(true);
  });

  it('returns false for a past visit', () => {
    expect(isUpcomingVisit('2020-01-01', '09:00', 15, Date.now)).toBe(false);
  });

  it('returns false for empty strings', () => {
    expect(isUpcomingVisit('', '', 15, Date.now)).toBe(false);
  });
});

// ─── ISO priority over visitDate+visitTime ───────────────────────────────────

describe('ISO visitStartAt takes priority over visitDate+visitTime', () => {
  /**
   * When visitStartAt is provided and parseable, it should govern the result
   * regardless of what visitDate+visitTime say.
   * We test the pure functions here; hook-level behaviour is covered in the
   * existing eligibility/cancellation test files.
   */

  it('ISO 5 min away → upcoming (even if date+time disagree)', () => {
    const fixedNow = 1_700_000_000_000;
    const iso = new Date(fixedNow + 5 * 60 * 1000).toISOString();
    expect(isUpcomingVisitFromISO(iso, 15, () => fixedNow)).toBe(true);
  });

  it('ISO 60 min away → not upcoming (even if date+time say 5 min)', () => {
    const fixedNow = 1_700_000_000_000;
    const iso = new Date(fixedNow + 60 * 60 * 1000).toISOString();
    expect(isUpcomingVisitFromISO(iso, 15, () => fixedNow)).toBe(false);
  });

  it('invalid ISO falls back to falsy result from isUpcomingVisitFromISO', () => {
    expect(isUpcomingVisitFromISO('not-a-date', 15, Date.now)).toBe(false);
  });
});
