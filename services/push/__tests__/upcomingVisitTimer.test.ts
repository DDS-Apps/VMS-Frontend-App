/**
 * Tests for the pure timer-logic helpers in hooks/useUpcomingVisitTimer.ts.
 *
 * Covers:
 *  1. parseVisitDateTime — valid 24-h, AM/PM, null-guard, malformed input
 *  2. isUpcomingVisit   — threshold boundary (≤15 min → true, >15 min → false)
 *  3. isUpcomingVisit   — visit in the past
 *  4. isUpcomingVisit   — missing / null date or time
 *  5. isUpcomingVisit   — threshold of 0 (window is exactly zero width → always false)
 *  6. isUpcomingVisit   — custom threshold values (e.g. 30 min)
 *  7. isUpcomingVisit   — boundary precision at exactly the threshold edge
 */

// ---------------------------------------------------------------------------
// Module mocks — must appear BEFORE imports so jest hoisting works
// ---------------------------------------------------------------------------

// useUpcomingVisitTimer imports AppState and Platform from react-native.
// The jest-expo preset mocks the full RN surface, but we mock explicitly here
// to avoid any side-effects from the module initialiser.
jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Platform: { OS: 'ios' },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  parseVisitDateTime,
  isUpcomingVisit,
} from '@/hooks/useUpcomingVisitTimer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a nowFn whose return value is `offsetMs` milliseconds relative to
 * the supplied `visitDate` + `visitTime`.  A positive offset means "now is
 * that many ms BEFORE the visit start" (i.e. the visit is in the future).
 * A negative offset means "now is that many ms AFTER the visit start".
 */
function nowBefore(visitDate: string, visitTime: string, offsetMs: number): () => number {
  const start = parseVisitDateTime(visitDate, visitTime);
  if (!start) throw new Error(`Invalid date/time: ${visitDate} ${visitTime}`);
  return () => start.getTime() - offsetMs;
}

/** Convenience: ms from minutes */
const mins = (m: number) => m * 60 * 1000;

// ---------------------------------------------------------------------------
// Suite 1 — parseVisitDateTime
// ---------------------------------------------------------------------------

describe('parseVisitDateTime', () => {
  it('parses 24-hour time correctly', () => {
    const d = parseVisitDateTime('2025-07-17', '09:30');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(9);
    expect(d!.getMinutes()).toBe(30);
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(6); // July = 6
    expect(d!.getDate()).toBe(17);
  });

  it('parses 12-hour AM time correctly', () => {
    const d = parseVisitDateTime('2025-01-01', '9:00 AM');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(9);
    expect(d!.getMinutes()).toBe(0);
  });

  it('parses 12-hour PM time correctly', () => {
    const d = parseVisitDateTime('2025-01-01', '1:30 PM');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(13);
    expect(d!.getMinutes()).toBe(30);
  });

  it('treats 12:00 AM as midnight (hour 0)', () => {
    const d = parseVisitDateTime('2025-03-15', '12:00 AM');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(0);
    expect(d!.getMinutes()).toBe(0);
  });

  it('treats 12:00 PM as noon (hour 12)', () => {
    const d = parseVisitDateTime('2025-03-15', '12:00 PM');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(12);
    expect(d!.getMinutes()).toBe(0);
  });

  it('returns null for an empty visitDate', () => {
    expect(parseVisitDateTime('', '10:00')).toBeNull();
  });

  it('returns null for an empty visitTime', () => {
    expect(parseVisitDateTime('2025-07-17', '')).toBeNull();
  });

  it('returns null for a null visitDate', () => {
    // TypeScript enforces string, but runtime callers may pass nullish values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseVisitDateTime(null as any, '10:00')).toBeNull();
  });

  it('returns null for a null visitTime', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseVisitDateTime('2025-07-17', null as any)).toBeNull();
  });

  it('returns null for a malformed date string', () => {
    expect(parseVisitDateTime('not-a-date', '10:00')).toBeNull();
  });

  it('returns null for a date with fewer than 3 parts', () => {
    expect(parseVisitDateTime('2025-07', '10:00')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — isUpcomingVisit: 15-minute threshold (default)
// ---------------------------------------------------------------------------

describe('isUpcomingVisit — default 15-minute threshold', () => {
  const DATE = '2025-07-17';
  const TIME = '10:00';

  it('returns true when the visit is exactly 1 minute away', () => {
    expect(isUpcomingVisit(DATE, TIME, 15, nowBefore(DATE, TIME, mins(1)))).toBe(true);
  });

  it('returns true when the visit is exactly 15 minutes away', () => {
    expect(isUpcomingVisit(DATE, TIME, 15, nowBefore(DATE, TIME, mins(15)))).toBe(true);
  });

  it('returns true when the visit is 14 minutes 59 seconds away', () => {
    expect(isUpcomingVisit(DATE, TIME, 15, nowBefore(DATE, TIME, mins(15) - 1000))).toBe(true);
  });

  it('returns false when the visit is exactly 16 minutes away', () => {
    expect(isUpcomingVisit(DATE, TIME, 15, nowBefore(DATE, TIME, mins(16)))).toBe(false);
  });

  it('returns false when the visit is more than 15 minutes away (e.g. 60 min)', () => {
    expect(isUpcomingVisit(DATE, TIME, 15, nowBefore(DATE, TIME, mins(60)))).toBe(false);
  });

  it('returns false when the visit is exactly 15 min + 1 ms away (just outside window)', () => {
    expect(isUpcomingVisit(DATE, TIME, 15, nowBefore(DATE, TIME, mins(15) + 1))).toBe(false);
  });

  it('returns false when now equals the visit start time (remainingMs = 0)', () => {
    const start = parseVisitDateTime(DATE, TIME)!;
    expect(isUpcomingVisit(DATE, TIME, 15, () => start.getTime())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — isUpcomingVisit: visit in the past
// ---------------------------------------------------------------------------

describe('isUpcomingVisit — visit in the past', () => {
  const DATE = '2025-07-17';
  const TIME = '10:00';

  it('returns false when the visit was 1 second ago', () => {
    const start = parseVisitDateTime(DATE, TIME)!;
    expect(isUpcomingVisit(DATE, TIME, 15, () => start.getTime() + 1000)).toBe(false);
  });

  it('returns false when the visit was several hours ago', () => {
    const start = parseVisitDateTime(DATE, TIME)!;
    expect(isUpcomingVisit(DATE, TIME, 15, () => start.getTime() + mins(180))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — isUpcomingVisit: missing / invalid date or time
// ---------------------------------------------------------------------------

describe('isUpcomingVisit — missing or invalid input', () => {
  it('returns false for an empty visitDate', () => {
    expect(isUpcomingVisit('', '10:00', 15, () => Date.now())).toBe(false);
  });

  it('returns false for an empty visitTime', () => {
    expect(isUpcomingVisit('2025-07-17', '', 15, () => Date.now())).toBe(false);
  });

  it('returns false for null visitDate', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isUpcomingVisit(null as any, '10:00', 15, () => Date.now())).toBe(false);
  });

  it('returns false for null visitTime', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isUpcomingVisit('2025-07-17', null as any, 15, () => Date.now())).toBe(false);
  });

  it('returns false for undefined visitDate', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isUpcomingVisit(undefined as any, '10:00', 15, () => Date.now())).toBe(false);
  });

  it('returns false for a malformed date string', () => {
    expect(isUpcomingVisit('bad-date', '10:00', 15, () => Date.now())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — isUpcomingVisit: threshold of 0
// ---------------------------------------------------------------------------

describe('isUpcomingVisit — threshold of 0', () => {
  const DATE = '2025-07-17';
  const TIME = '10:00';

  it('returns false even when 1 ms before the visit (zero-width window)', () => {
    const start = parseVisitDateTime(DATE, TIME)!;
    // remainingMs = 1, thresholdMs = 0  →  1 > 0 but NOT <= 0
    expect(isUpcomingVisit(DATE, TIME, 0, () => start.getTime() - 1)).toBe(false);
  });

  it('returns false at the exact visit start with threshold 0', () => {
    const start = parseVisitDateTime(DATE, TIME)!;
    expect(isUpcomingVisit(DATE, TIME, 0, () => start.getTime())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — isUpcomingVisit: custom threshold (30 minutes)
// ---------------------------------------------------------------------------

describe('isUpcomingVisit — custom 30-minute threshold', () => {
  const DATE = '2025-07-17';
  const TIME = '14:00';

  it('returns true when the visit is 30 minutes away with a 30-min threshold', () => {
    expect(isUpcomingVisit(DATE, TIME, 30, nowBefore(DATE, TIME, mins(30)))).toBe(true);
  });

  it('returns false when the visit is 31 minutes away with a 30-min threshold', () => {
    expect(isUpcomingVisit(DATE, TIME, 30, nowBefore(DATE, TIME, mins(31)))).toBe(false);
  });

  it('returns false for the same 30-min visit if threshold is still the default 15', () => {
    // Visit 30 min away but threshold is 15 → should not alert
    expect(isUpcomingVisit(DATE, TIME, 15, nowBefore(DATE, TIME, mins(30)))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — Precision boundary (1 ms around threshold)
// ---------------------------------------------------------------------------

describe('isUpcomingVisit — 1-ms precision at threshold boundary', () => {
  const DATE = '2025-08-01';
  const TIME = '09:00';

  it('returns true at exactly thresholdMs remaining', () => {
    const start = parseVisitDateTime(DATE, TIME)!;
    const THRESHOLD = 15;
    const atThreshold = start.getTime() - mins(THRESHOLD);
    expect(isUpcomingVisit(DATE, TIME, THRESHOLD, () => atThreshold)).toBe(true);
  });

  it('returns false at thresholdMs + 1 ms remaining', () => {
    const start = parseVisitDateTime(DATE, TIME)!;
    const THRESHOLD = 15;
    const justOutside = start.getTime() - mins(THRESHOLD) - 1;
    expect(isUpcomingVisit(DATE, TIME, THRESHOLD, () => justOutside)).toBe(false);
  });

  it('returns true at thresholdMs - 1 ms remaining', () => {
    const start = parseVisitDateTime(DATE, TIME)!;
    const THRESHOLD = 15;
    const justInside = start.getTime() - mins(THRESHOLD) + 1;
    expect(isUpcomingVisit(DATE, TIME, THRESHOLD, () => justInside)).toBe(true);
  });
});
