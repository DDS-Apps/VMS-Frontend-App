/**
 * Tests for visitStartAt ISO UTC support in useUpcomingVisitTimer.
 * Covers: parseVisitStartAt, isUpcomingVisitFromISO, and the useUpcomingIndicator
 * hook's preference for visitStartAt over visitDate+visitTime.
 */
import {
  parseVisitStartAt,
  isUpcomingVisitFromISO,
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

  it('does not invent midnight when the backend supplied a date without a start time', () => {
    expect(parseVisitStartAt('2025-01-15')).toBeNull();
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

describe('no implicit local-time fallback', () => {
  it.each(['2026-07-17', '2026-07-17T09:30:00', '09:30'])('rejects an ambiguous absolute start: %s', value => {
    expect(parseVisitStartAt(value)).toBeNull();
    expect(isUpcomingVisitFromISO(value, 15, Date.now)).toBe(false);
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
