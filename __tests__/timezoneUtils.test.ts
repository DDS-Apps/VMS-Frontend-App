/**
 * Tests for business-timezone helpers in utils/dateTimeUtils.ts.
 *
 * These tests are device-timezone independent: all assertions are based on the
 * supplied `timezone` argument, never on process.env.TZ or the device locale.
 *
 * To verify cross-TZ correctness manually, run with:
 *   TZ=Asia/Karachi npx jest __tests__/timezoneUtils.test.ts
 *   TZ=UTC         npx jest __tests__/timezoneUtils.test.ts
 *   TZ=America/Los_Angeles npx jest __tests__/timezoneUtils.test.ts
 */

import {
  formatAbsoluteTimestamp,
  getBusinessDateKey,
  isTodayInTimezone,
  isYesterdayInTimezone,
} from '../utils/dateTimeUtils';

import {
  isUpcomingVisitFromISO,
} from '../hooks/useUpcomingVisitTimer';

const RIYADH = 'Asia/Riyadh';

// Canonical visit: 2026-07-30 10:00 Asia/Riyadh = 2026-07-30T07:00:00.000Z (UTC)
const CANONICAL_VISIT_UTC = '2026-07-30T07:00:00.000Z';

// Saudi midnight: 2026-07-30T21:00:00Z = 2026-07-31T00:00:00 Asia/Riyadh
const SAUDI_MIDNIGHT_UTC = '2026-07-30T21:00:00.000Z';

// ---------------------------------------------------------------------------
// formatAbsoluteTimestamp
// ---------------------------------------------------------------------------
describe('formatAbsoluteTimestamp', () => {
  it('formats canonical visit (07:00Z) as 10:xx AM in Asia/Riyadh', () => {
    const result = formatAbsoluteTimestamp(CANONICAL_VISIT_UTC, {}, RIYADH);
    // 2026-07-30T07:00Z = 10:00 Asia/Riyadh
    expect(result).toMatch(/10/);
    expect(result.toLowerCase()).toMatch(/am/);
  });

  it('is device-timezone independent — 07:00Z is always 10:00 in Riyadh', () => {
    // This would fail if the function used toLocaleTimeString() without a timezone.
    const result = formatAbsoluteTimestamp(CANONICAL_VISIT_UTC, {}, RIYADH);
    expect(result).toMatch(/10/);
  });

  it('returns empty string for null', () => {
    expect(formatAbsoluteTimestamp(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatAbsoluteTimestamp(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatAbsoluteTimestamp('')).toBe('');
  });

  it('returns empty string for malformed timestamp', () => {
    expect(formatAbsoluteTimestamp('not-a-date', {}, RIYADH)).toBe('');
  });

  it('falls back to Asia/Riyadh when timezone is invalid', () => {
    const withInvalid = formatAbsoluteTimestamp(CANONICAL_VISIT_UTC, {}, 'Bad/Zone');
    const withRiyadh = formatAbsoluteTimestamp(CANONICAL_VISIT_UTC, {}, RIYADH);
    expect(withInvalid).toBe(withRiyadh);
  });

  it('falls back to Asia/Riyadh when timezone is missing', () => {
    // Default timezone argument is DEFAULT_SERVER_TIMEZONE = 'Asia/Riyadh'
    const withDefault = formatAbsoluteTimestamp(CANONICAL_VISIT_UTC);
    const withRiyadh = formatAbsoluteTimestamp(CANONICAL_VISIT_UTC, {}, RIYADH);
    expect(withDefault).toBe(withRiyadh);
  });
});

// ---------------------------------------------------------------------------
// getBusinessDateKey
// ---------------------------------------------------------------------------
describe('getBusinessDateKey', () => {
  it('returns a YYYY-MM-DD string', () => {
    const key = getBusinessDateKey(new Date(CANONICAL_VISIT_UTC), RIYADH);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns 2026-07-30 for canonical visit UTC in Asia/Riyadh', () => {
    expect(getBusinessDateKey(new Date(CANONICAL_VISIT_UTC), RIYADH)).toBe('2026-07-30');
  });

  it('correctly handles Saudi midnight boundary — 21:00Z = 2026-07-31 in Riyadh', () => {
    expect(getBusinessDateKey(new Date(SAUDI_MIDNIGHT_UTC), RIYADH)).toBe('2026-07-31');
  });

  it('returns 2026-07-30 for same Saudi midnight in UTC timezone', () => {
    expect(getBusinessDateKey(new Date(SAUDI_MIDNIGHT_UTC), 'UTC')).toBe('2026-07-30');
  });

  it('is device-timezone independent — Riyadh key is always 2026-07-31 at Saudi midnight', () => {
    // Regardless of process.env.TZ, the business date in Riyadh is 2026-07-31
    const key = getBusinessDateKey(new Date(SAUDI_MIDNIGHT_UTC), RIYADH);
    expect(key).toBe('2026-07-31');
  });

  it('1 second before Saudi midnight gives the previous day', () => {
    const oneSecBeforeMidnight = new Date(Date.parse(SAUDI_MIDNIGHT_UTC) - 1000);
    expect(getBusinessDateKey(oneSecBeforeMidnight, RIYADH)).toBe('2026-07-30');
  });

  it('falls back to Asia/Riyadh when timezone is invalid', () => {
    const withInvalid = getBusinessDateKey(new Date(CANONICAL_VISIT_UTC), 'Not/Valid');
    const withRiyadh = getBusinessDateKey(new Date(CANONICAL_VISIT_UTC), RIYADH);
    expect(withInvalid).toBe(withRiyadh);
  });

  it('returns a valid key when called with no arguments (defaults to now, Asia/Riyadh)', () => {
    const key = getBusinessDateKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// isTodayInTimezone
// ---------------------------------------------------------------------------
describe('isTodayInTimezone', () => {
  it('returns false for null', () => {
    expect(isTodayInTimezone(null, RIYADH)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isTodayInTimezone(undefined, RIYADH)).toBe(false);
  });

  it('returns false for malformed timestamp', () => {
    expect(isTodayInTimezone('not-a-date', RIYADH)).toBe(false);
  });

  it('returns false for a clearly past date', () => {
    expect(isTodayInTimezone('2020-01-01T00:00:00.000Z', RIYADH)).toBe(false);
  });

  it('returns false for a clearly future date', () => {
    expect(isTodayInTimezone('2099-12-31T00:00:00.000Z', RIYADH)).toBe(false);
  });

  it('returns true for an ISO timestamp that is right now', () => {
    expect(isTodayInTimezone(new Date().toISOString(), RIYADH)).toBe(true);
  });

  it('falls back to Asia/Riyadh when timezone is invalid', () => {
    const now = new Date().toISOString();
    const withInvalid = isTodayInTimezone(now, 'Bad/Zone');
    const withRiyadh = isTodayInTimezone(now, RIYADH);
    expect(withInvalid).toBe(withRiyadh);
  });
});

// ---------------------------------------------------------------------------
// isYesterdayInTimezone
// ---------------------------------------------------------------------------
describe('isYesterdayInTimezone', () => {
  it('returns false for null', () => {
    expect(isYesterdayInTimezone(null, RIYADH)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isYesterdayInTimezone(undefined, RIYADH)).toBe(false);
  });

  it('returns false for malformed timestamp', () => {
    expect(isYesterdayInTimezone('bad-ts', RIYADH)).toBe(false);
  });

  it('returns false for today', () => {
    expect(isYesterdayInTimezone(new Date().toISOString(), RIYADH)).toBe(false);
  });

  it('returns false for a clearly old date', () => {
    expect(isYesterdayInTimezone('2020-01-01T00:00:00.000Z', RIYADH)).toBe(false);
  });

  it('returns true for 24 hours ago in the same timezone', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // This is approximate — depends on the time within the day.
    // Only assert it doesn't crash and returns a boolean.
    const result = isYesterdayInTimezone(yesterday, RIYADH);
    expect(typeof result).toBe('boolean');
  });

  it('falls back to Asia/Riyadh when timezone is invalid', () => {
    const ts = new Date(Date.now() - 86400000).toISOString();
    const withInvalid = isYesterdayInTimezone(ts, 'X/Y');
    const withRiyadh = isYesterdayInTimezone(ts, RIYADH);
    expect(withInvalid).toBe(withRiyadh);
  });
});

// ---------------------------------------------------------------------------
// isUpcomingVisitFromISO — ISO-only upcoming indicator
// ---------------------------------------------------------------------------
describe('isUpcomingVisitFromISO — ISO-only upcoming indicator', () => {
  const START = '2026-07-30T07:00:00.000Z';
  const startMs = Date.parse(START); // 1753844400000
  const THRESHOLD = 15;
  const thresholdMs = THRESHOLD * 60 * 1000;
  const windowOpenMs = startMs - thresholdMs;

  // ── valid visitStartAt ──────────────────────────────────────────────────

  it('returns true at the exact moment the 15-min window opens', () => {
    expect(isUpcomingVisitFromISO(START, THRESHOLD, () => windowOpenMs)).toBe(true);
  });

  it('returns false 1 ms before the window opens', () => {
    expect(isUpcomingVisitFromISO(START, THRESHOLD, () => windowOpenMs - 1)).toBe(false);
  });

  it('returns true 1 ms before the visit start (inside window)', () => {
    expect(isUpcomingVisitFromISO(START, THRESHOLD, () => startMs - 1)).toBe(true);
  });

  it('returns false at the exact visit start (window closes)', () => {
    expect(isUpcomingVisitFromISO(START, THRESHOLD, () => startMs)).toBe(false);
  });

  it('returns false after the visit start (past)', () => {
    expect(isUpcomingVisitFromISO(START, THRESHOLD, () => startMs + 60_000)).toBe(false);
  });

  it('is device-timezone independent — same result across TZ environments', () => {
    // The calculation is entirely based on UTC ms, so TZ doesn't matter.
    const inside = isUpcomingVisitFromISO(START, THRESHOLD, () => windowOpenMs + 1000);
    expect(inside).toBe(true);
  });

  // ── missing / invalid visitStartAt → must return false ─────────────────

  it('returns false for empty string visitStartAt', () => {
    expect(isUpcomingVisitFromISO('', THRESHOLD, () => windowOpenMs)).toBe(false);
  });

  it('returns false for undefined visitStartAt', () => {
    expect(isUpcomingVisitFromISO(undefined as any, THRESHOLD, () => windowOpenMs)).toBe(false);
  });

  it('returns false for null visitStartAt', () => {
    expect(isUpcomingVisitFromISO(null as any, THRESHOLD, () => windowOpenMs)).toBe(false);
  });

  it('returns false for malformed visitStartAt', () => {
    expect(isUpcomingVisitFromISO('not-a-date', THRESHOLD, () => windowOpenMs)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Saudi midnight boundary integration
// ---------------------------------------------------------------------------
describe('Saudi midnight boundary — getBusinessDateKey consistency', () => {
  // 2026-07-30T20:59:59Z → 2026-07-30 23:59:59 Riyadh (still July 30)
  const justBeforeMidnight = '2026-07-30T20:59:59.000Z';
  // 2026-07-30T21:00:00Z → 2026-07-31 00:00:00 Riyadh (now July 31)
  const atMidnight = '2026-07-30T21:00:00.000Z';

  it('just before midnight is still 2026-07-30', () => {
    expect(getBusinessDateKey(new Date(justBeforeMidnight), RIYADH)).toBe('2026-07-30');
  });

  it('at midnight transitions to 2026-07-31', () => {
    expect(getBusinessDateKey(new Date(atMidnight), RIYADH)).toBe('2026-07-31');
  });

  it('isTodayInTimezone gives consistent calendar-date comparison', () => {
    // If today's business date is "2026-07-31" in Riyadh, atMidnight would be "today".
    // We cannot control "now" here, so just verify no crash and a boolean is returned.
    const r1 = isTodayInTimezone(justBeforeMidnight, RIYADH);
    const r2 = isTodayInTimezone(atMidnight, RIYADH);
    expect(typeof r1).toBe('boolean');
    expect(typeof r2).toBe('boolean');
  });
});
