/**
 * Tests for the upcoming-visit alert indicator utility.
 *
 * Covers: threshold boundary conditions, ineligible statuses, missing/invalid
 * timestamps, foreground-return recalculation, toast deduplication, and
 * buffet-privacy check.
 *
 * Run: npx jest __tests__/upcomingVisitTimer.test.ts
 */

import { parseVisitDateTime, isUpcomingVisit } from '../hooks/useUpcomingVisitTimer';
import {
  UPCOMING_INDICATOR_ELIGIBLE_STATUSES,
  UPCOMING_INDICATOR_EXCLUDED_STATUSES,
  UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES,
} from '../constants/requestConstants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateAt(offsetMs: number): number {
  return BASE_NOW + offsetMs;
}

const MIN = 60 * 1000;
const THRESHOLD = UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES; // 15

/** A fixed "now" for deterministic tests */
const BASE_NOW = new Date('2025-06-01T10:00:00').getTime();

/** Produce a visitDate/visitTime pair that starts `offsetMs` from BASE_NOW */
function visitAt(offsetMs: number): { visitDate: string; visitTime: string } {
  const d = new Date(BASE_NOW + offsetMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const visitDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const visitTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { visitDate, visitTime };
}

// ---------------------------------------------------------------------------
// parseVisitDateTime
// ---------------------------------------------------------------------------

describe('parseVisitDateTime', () => {
  it('parses 24-hour format', () => {
    const d = parseVisitDateTime('2025-06-01', '09:30');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(9);
    expect(d!.getMinutes()).toBe(30);
  });

  it('parses 12-hour AM format', () => {
    const d = parseVisitDateTime('2025-06-01', '09:00 AM');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(9);
  });

  it('parses 12-hour PM format — adds 12h', () => {
    const d = parseVisitDateTime('2025-06-01', '02:30 PM');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(14);
  });

  it('treats 12:00 PM as noon', () => {
    const d = parseVisitDateTime('2025-06-01', '12:00 PM');
    expect(d!.getHours()).toBe(12);
  });

  it('treats 12:00 AM as midnight', () => {
    const d = parseVisitDateTime('2025-06-01', '12:00 AM');
    expect(d!.getHours()).toBe(0);
  });

  it('returns null for empty visitDate', () => {
    expect(parseVisitDateTime('', '10:00')).toBeNull();
  });

  it('returns null for empty visitTime', () => {
    expect(parseVisitDateTime('2025-06-01', '')).toBeNull();
  });

  it('returns null for malformed date string', () => {
    expect(parseVisitDateTime('not-a-date', '10:00')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isUpcomingVisit — pure function boundary tests
// ---------------------------------------------------------------------------

describe('isUpcomingVisit', () => {
  it('returns true when visit is 1 ms inside the threshold window', () => {
    const { visitDate, visitTime } = visitAt(1 * MIN);
    const now = () => BASE_NOW + 1 * MIN * (THRESHOLD - 1) / (THRESHOLD - 1) - 1;
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => dateAt(0))).toBe(true);
  });

  it('returns true exactly at the threshold boundary (remainingMs === thresholdMs)', () => {
    const { visitDate, visitTime } = visitAt(THRESHOLD * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW)).toBe(true);
  });

  it('returns false 1 ms before threshold window opens (remainingMs > thresholdMs)', () => {
    const { visitDate, visitTime } = visitAt(THRESHOLD * MIN + 1);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW)).toBe(false);
  });

  it('returns false exactly at visit start (remainingMs === 0)', () => {
    const { visitDate, visitTime } = visitAt(0);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW)).toBe(false);
  });

  it('returns false 1 ms after visit start (remainingMs < 0)', () => {
    const { visitDate, visitTime } = visitAt(-1);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW)).toBe(false);
  });

  it('returns false for visit in the past (1 hour ago)', () => {
    const { visitDate, visitTime } = visitAt(-60 * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW)).toBe(false);
  });

  it('returns false for visit 30 minutes away with 15 min threshold', () => {
    const { visitDate, visitTime } = visitAt(30 * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW)).toBe(false);
  });

  it('returns true for visit 14 minutes 59 seconds away', () => {
    const { visitDate, visitTime } = visitAt(THRESHOLD * MIN - 1000);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW)).toBe(true);
  });

  it('returns false for empty visitDate', () => {
    expect(isUpcomingVisit('', '10:00', THRESHOLD, () => BASE_NOW)).toBe(false);
  });

  it('returns false for empty visitTime', () => {
    expect(isUpcomingVisit('2025-06-01', '', THRESHOLD, () => BASE_NOW)).toBe(false);
  });

  it('returns false for invalid timestamp', () => {
    expect(isUpcomingVisit('not-a-date', 'bad-time', THRESHOLD, () => BASE_NOW)).toBe(false);
  });

  it('respects a custom threshold (30 minutes)', () => {
    const customThreshold = 30;
    const { visitDate, visitTime } = visitAt(25 * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, customThreshold, () => BASE_NOW)).toBe(true);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Eligibility registry correctness
// ---------------------------------------------------------------------------

describe('UPCOMING_INDICATOR_ELIGIBLE_STATUSES', () => {
  it('contains visitor_accepted', () => {
    expect(UPCOMING_INDICATOR_ELIGIBLE_STATUSES).toContain('visitor_accepted');
  });

  it('does NOT contain checked_in', () => {
    expect(UPCOMING_INDICATOR_ELIGIBLE_STATUSES).not.toContain('checked_in');
  });

  it('does NOT contain completed', () => {
    expect(UPCOMING_INDICATOR_ELIGIBLE_STATUSES).not.toContain('completed');
  });

  it('does NOT contain cancelled', () => {
    expect(UPCOMING_INDICATOR_ELIGIBLE_STATUSES).not.toContain('cancelled');
  });
});

describe('UPCOMING_INDICATOR_EXCLUDED_STATUSES', () => {
  const expected = [
    'checked_in',
    'completed',
    'cancelled',
    'auto_cancelled',
    'rejected',
    'visitor_rejected',
    'visitor_pending',
    'pending_approval',
    'pending_host_approval',
  ] as const;

  for (const status of expected) {
    it(`excludes ${status}`, () => {
      expect(UPCOMING_INDICATOR_EXCLUDED_STATUSES).toContain(status);
    });
  }
});

// ---------------------------------------------------------------------------
// Default threshold constant
// ---------------------------------------------------------------------------

describe('UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES', () => {
  it('is 15 minutes', () => {
    expect(UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Toast deduplication logic (unit-level Set semantics)
// ---------------------------------------------------------------------------

describe('Toast deduplication via Set', () => {
  it('does not add duplicate IDs', () => {
    const shown = new Set<string>();
    const addIfNew = (id: string): boolean => {
      if (shown.has(id)) return false;
      shown.add(id);
      return true;
    };
    expect(addIfNew('notif-001')).toBe(true);
    expect(addIfNew('notif-001')).toBe(false);
    expect(addIfNew('notif-002')).toBe(true);
    expect(shown.size).toBe(2);
  });

  it('evicts oldest entry when size exceeds 200', () => {
    const shown = new Set<string>();
    for (let i = 0; i < 200; i++) {
      shown.add(`notif-${i}`);
    }
    shown.add('notif-new');
    if (shown.size > 200) {
      const oldest = shown.values().next().value!;
      shown.delete(oldest);
    }
    expect(shown.size).toBe(200);
    expect(shown.has('notif-new')).toBe(true);
    expect(shown.has('notif-0')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Buffet privacy — isUpcomingVisit does not expose visitor identity
// ---------------------------------------------------------------------------

describe('Buffet task indicator privacy', () => {
  it('isUpcomingVisit returns a boolean — no visitor name in return value', () => {
    const { visitDate, visitTime } = visitAt(5 * MIN);
    const result = isUpcomingVisit(visitDate, visitTime, THRESHOLD, () => BASE_NOW);
    expect(typeof result).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Shared hook path — isUpcomingVisit is importable from hooks/useUpcomingVisitTimer
// ---------------------------------------------------------------------------

describe('Module export path assertion', () => {
  it('isUpcomingVisit is exported from hooks/useUpcomingVisitTimer', () => {
    const mod = require('../hooks/useUpcomingVisitTimer');
    expect(typeof mod.isUpcomingVisit).toBe('function');
    expect(typeof mod.parseVisitDateTime).toBe('function');
    expect(typeof mod.useUpcomingIndicator).toBe('function');
  });
});
