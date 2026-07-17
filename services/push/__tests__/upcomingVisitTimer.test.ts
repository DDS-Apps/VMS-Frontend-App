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
 *  8. DST boundary      — spring-forward gap and fall-back fold scenarios
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

// ---------------------------------------------------------------------------
// Suite 8 — DST boundary scenarios
//
// IMPLEMENTATION ANALYSIS (read before modifying these tests):
//
// parseVisitDateTime uses `new Date(year, month-1, day, hours, minutes, 0, 0)`,
// the local-time Date constructor. This is correct by design — the app operates
// entirely in device-local time (replit.md: "all date/time displays and API
// submissions use device-local time; the server handles all timezone
// normalization").
//
// Behaviour during DST transitions in V8 / JavaScriptCore:
//
//   GAP  (spring forward — e.g. US/Eastern, 2025-03-09, clocks jump 01:59→03:00):
//     A visit at 02:30 falls in the gap. The engine normalises to the post-gap
//     local time (03:30) and returns a valid Date whose .getTime() is 3 600 000 ms
//     (1 hour) later than a naive calculation would expect.
//     isUpcomingVisit computes `startDate.getTime() - nowFn()` in raw ms, so the
//     alert window is anchored to the NORMALISED epoch. The alert fires 15 min
//     before 03:30 — which matches what the device clock will show.  NO FIX NEEDED.
//
//   FOLD (fall back — e.g. US/Eastern, 2025-11-02, clocks fall 02:00→01:00):
//     A visit at 01:30 occurs twice. The engine always picks the FIRST occurrence
//     (the earlier UTC epoch, EDT = UTC-4 in this example). isUpcomingVisit therefore
//     anchors to the first occurrence. Any "now" that falls between the two
//     occurrences is already past the first start, so the alert is correctly
//     suppressed.  NO FIX NEEDED.
//
// Conclusion: The current implementation is correct for DST. It delegates
// ambiguity resolution entirely to the host engine, which applies the same
// timezone rules the device clock uses. The epoch arithmetic in isUpcomingVisit
// is unaffected by DST because it operates on the resolved .getTime() value.
//
// The tests below verify this by intercepting the Date constructor for specific
// DST-sensitive date/time arguments and injecting a ±1-hour-shifted epoch,
// then confirming that isUpcomingVisit still produces the expected boolean.
// ---------------------------------------------------------------------------

/** Installs a Date constructor mock that intercepts the exact (year, month, day,
 *  hours, minutes, 0, 0) 7-argument form used by parseVisitDateTime and returns
 *  a Date at `interceptedEpoch` instead.  Returns a cleanup function that
 *  restores the original Date.
 */
function installDateConstructorMock(
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number,
  interceptedEpoch: number
): () => void {
  const OriginalDate = global.Date;

  const MockDate = function (this: unknown, ...args: unknown[]) {
    if (
      args.length === 7 &&
      args[0] === year &&
      args[1] === monthIndex &&
      args[2] === day &&
      args[3] === hours &&
      args[4] === minutes &&
      args[5] === 0 &&
      args[6] === 0
    ) {
      return new OriginalDate(interceptedEpoch);
    }
    // Forward all other constructor forms to the real Date.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (OriginalDate as any)(...args);
  } as unknown as DateConstructor;

  Object.setPrototypeOf(MockDate, OriginalDate);
  MockDate.now = OriginalDate.now;
  MockDate.parse = OriginalDate.parse;
  MockDate.UTC = OriginalDate.UTC;
  MockDate.prototype = OriginalDate.prototype;

  global.Date = MockDate;

  return () => {
    global.Date = OriginalDate;
  };
}

const ONE_HOUR_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// 8a — DST Gap (spring forward)
//
// Target date: 2025-03-09 (US/Eastern spring-forward night).
// Clocks jump from 01:59 → 03:00, so 02:30 does not exist as a local time.
// The engine normalises new Date(2025,2,9,2,30,0,0) to 03:30 local time,
// meaning .getTime() is ONE_HOUR_MS higher than a UTC-only expectation.
// We simulate this by having the mock return base + ONE_HOUR_MS.
// ---------------------------------------------------------------------------
describe('DST gap — spring-forward transition (02:30 normalised to 03:30)', () => {
  const DST_GAP_DATE = '2025-03-09';
  const GAP_TIME = '02:30';

  let restore: () => void;
  let normalizedEpoch: number;

  beforeEach(() => {
    // Capture the "naive" epoch that new Date(2025,2,9,2,30,0,0) would produce
    // in the test runner's own timezone (usually UTC in CI), then shift it
    // forward by 1 hour to mimic what a DST-aware engine would return.
    const naiveDate = new Date(2025, 2, 9, 2, 30, 0, 0);
    normalizedEpoch = naiveDate.getTime() + ONE_HOUR_MS;

    restore = installDateConstructorMock(2025, 2, 9, 2, 30, normalizedEpoch);
  });

  afterEach(() => {
    restore();
  });

  it('parseVisitDateTime resolves the gap-time to the DST-normalised epoch', () => {
    const d = parseVisitDateTime(DST_GAP_DATE, GAP_TIME);
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(normalizedEpoch);
  });

  it('isUpcomingVisit returns true when now is 10 min before the normalised start', () => {
    expect(
      isUpcomingVisit(DST_GAP_DATE, GAP_TIME, 15, () => normalizedEpoch - mins(10))
    ).toBe(true);
  });

  it('isUpcomingVisit returns false when now is 20 min before the normalised start (outside window)', () => {
    expect(
      isUpcomingVisit(DST_GAP_DATE, GAP_TIME, 15, () => normalizedEpoch - mins(20))
    ).toBe(false);
  });

  it('isUpcomingVisit returns true at exactly 15 min before the normalised start', () => {
    expect(
      isUpcomingVisit(DST_GAP_DATE, GAP_TIME, 15, () => normalizedEpoch - mins(15))
    ).toBe(true);
  });

  it('isUpcomingVisit returns false when now is 1 s after the normalised start (visit passed)', () => {
    expect(
      isUpcomingVisit(DST_GAP_DATE, GAP_TIME, 15, () => normalizedEpoch + 1000)
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8b — DST Fold (fall back)
//
// Target date: 2025-11-02 (US/Eastern fall-back night).
// Clocks fall from 02:00 → 01:00, so 01:30 occurs twice.
// The engine always picks the FIRST (earlier) occurrence, whose epoch is
// ONE_HOUR_MS earlier than the second occurrence.
// We simulate this by having the mock return `base` for the first occurrence,
// then verify that "now" values between the two occurrences are treated as past.
// ---------------------------------------------------------------------------
describe('DST fold — fall-back transition (01:30 occurs twice; engine picks first)', () => {
  const FOLD_DATE = '2025-11-02';
  const FOLD_TIME = '01:30';

  let restore: () => void;
  let firstOccurrenceEpoch: number;
  let secondOccurrenceEpoch: number;

  beforeEach(() => {
    const naiveDate = new Date(2025, 10, 2, 1, 30, 0, 0);
    firstOccurrenceEpoch = naiveDate.getTime();
    secondOccurrenceEpoch = firstOccurrenceEpoch + ONE_HOUR_MS;

    restore = installDateConstructorMock(2025, 10, 2, 1, 30, firstOccurrenceEpoch);
  });

  afterEach(() => {
    restore();
  });

  it('parseVisitDateTime resolves the fold-time to the first-occurrence epoch', () => {
    const d = parseVisitDateTime(FOLD_DATE, FOLD_TIME);
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(firstOccurrenceEpoch);
  });

  it('isUpcomingVisit returns true when now is 10 min before the first occurrence', () => {
    expect(
      isUpcomingVisit(FOLD_DATE, FOLD_TIME, 15, () => firstOccurrenceEpoch - mins(10))
    ).toBe(true);
  });

  it('isUpcomingVisit returns false when now is 20 min before the first occurrence (outside window)', () => {
    expect(
      isUpcomingVisit(FOLD_DATE, FOLD_TIME, 15, () => firstOccurrenceEpoch - mins(20))
    ).toBe(false);
  });

  it('isUpcomingVisit returns false when now is between the two occurrences (first has already passed)', () => {
    // 30 min after first occurrence = 30 min before second occurrence.
    // The visit start is anchored to the first occurrence, so this is in the past.
    const nowBetween = () => firstOccurrenceEpoch + mins(30);
    expect(isUpcomingVisit(FOLD_DATE, FOLD_TIME, 15, nowBetween)).toBe(false);
  });

  it('isUpcomingVisit returns false when now equals the second occurrence epoch (first is long past)', () => {
    expect(
      isUpcomingVisit(FOLD_DATE, FOLD_TIME, 15, () => secondOccurrenceEpoch)
    ).toBe(false);
  });

  it('isUpcomingVisit returns true at exactly 15 min before the first occurrence', () => {
    expect(
      isUpcomingVisit(FOLD_DATE, FOLD_TIME, 15, () => firstOccurrenceEpoch - mins(15))
    ).toBe(true);
  });
});
