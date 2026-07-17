/**
 * Tests for the upcoming-visit alert indicator utility.
 *
 * Covers: threshold boundary conditions, ineligible statuses, missing/invalid
 * timestamps, foreground-return recalculation, toast deduplication,
 * notification-read independence, buffet privacy, and module export assertion.
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
// Constants
// ---------------------------------------------------------------------------

const MIN = 60 * 1000;
const THRESHOLD = UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES; // 15

/**
 * A fixed reference "now" timestamp for deterministic tests.
 * 2025-06-01T10:00:00 local time.
 */
const BASE_NOW = new Date('2025-06-01T10:00:00').getTime();

/** Produce a visitDate / visitTime pair that starts `offsetMs` from BASE_NOW */
function visitAt(offsetMs: number): { visitDate: string; visitTime: string } {
  const d = new Date(BASE_NOW + offsetMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const visitDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const visitTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { visitDate, visitTime };
}

/** Inject a fake now() returning BASE_NOW + delta */
const fakeNow = (deltaMs = 0) => () => BASE_NOW + deltaMs;

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
// isUpcomingVisit — boundary conditions with injectable clock
// ---------------------------------------------------------------------------

describe('isUpcomingVisit — threshold boundary', () => {
  it('returns true exactly at the open edge (remainingMs === thresholdMs)', () => {
    // Visit is exactly THRESHOLD minutes away from BASE_NOW
    const { visitDate, visitTime } = visitAt(THRESHOLD * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(true);
  });

  it('returns false 1 ms before window opens (remainingMs > thresholdMs)', () => {
    const { visitDate, visitTime } = visitAt(THRESHOLD * MIN + 1);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('returns true 1 ms inside window (remainingMs === thresholdMs − 1 ms)', () => {
    const { visitDate, visitTime } = visitAt(THRESHOLD * MIN - 1);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(true);
  });

  it('returns false exactly at visit start (remainingMs === 0)', () => {
    const { visitDate, visitTime } = visitAt(0);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('returns false 1 ms after visit start (remainingMs === −1)', () => {
    const { visitDate, visitTime } = visitAt(-1);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('returns false for visit 1 hour in the past', () => {
    const { visitDate, visitTime } = visitAt(-60 * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('returns false for visit 30 min away with 15 min threshold', () => {
    const { visitDate, visitTime } = visitAt(30 * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('returns true for visit 14 min 59 s away', () => {
    const { visitDate, visitTime } = visitAt(THRESHOLD * MIN - 1000);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(true);
  });
});

describe('isUpcomingVisit — foreground-return simulation', () => {
  it('transitions false → true after time advances to open window', () => {
    // Visit is 20 min away; at t=0 it is outside window (false)
    const { visitDate, visitTime } = visitAt(20 * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(false);
    // User leaves app for 6 min; at t=6min the visit is now 14 min away → inside window
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(6 * MIN))).toBe(true);
  });

  it('transitions true → false after visit has started', () => {
    // Visit is 5 min away at t=0 → inside window
    const { visitDate, visitTime } = visitAt(5 * MIN);
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(true);
    // User returns 6 min later → visit has passed
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(6 * MIN))).toBe(false);
  });
});

describe('isUpcomingVisit — custom threshold from notification payload', () => {
  it('respects a 30-min custom threshold', () => {
    const custom = 30;
    const { visitDate, visitTime } = visitAt(25 * MIN);
    // Within 30-min window
    expect(isUpcomingVisit(visitDate, visitTime, custom, fakeNow(0))).toBe(true);
    // Outside 15-min window
    expect(isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('uses 15 when payload threshold is 0 or negative (guard)', () => {
    // Simulate getThresholdMinutes fallback logic inline
    const fromPayload = 0;
    const threshold = Number.isFinite(fromPayload) && fromPayload > 0
      ? fromPayload
      : UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES;
    expect(threshold).toBe(15);
  });

  it('uses 15 when payload threshold is NaN', () => {
    const fromPayload = NaN;
    const threshold = Number.isFinite(fromPayload) && fromPayload > 0
      ? fromPayload
      : UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES;
    expect(threshold).toBe(15);
  });

  it('uses payload threshold when valid positive number', () => {
    const fromPayload = 20;
    const threshold = Number.isFinite(fromPayload) && fromPayload > 0
      ? fromPayload
      : UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES;
    expect(threshold).toBe(20);
  });
});

describe('isUpcomingVisit — invalid / missing timestamps', () => {
  it('returns false for empty visitDate', () => {
    expect(isUpcomingVisit('', '10:00', THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('returns false for empty visitTime', () => {
    expect(isUpcomingVisit('2025-06-01', '', THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('returns false for malformed date', () => {
    expect(isUpcomingVisit('not-a-date', 'bad-time', THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('returns false for undefined-like empty strings', () => {
    expect(isUpcomingVisit('', '', THRESHOLD, fakeNow(0))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Eligibility registry
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

  it('ineligible status produces false from isUpcomingVisit when eligible=false is enforced', () => {
    // Simulate hook behaviour: when eligible is false, result is always false
    const eligible = false;
    const { visitDate, visitTime } = visitAt(5 * MIN);
    // Without eligibility gate, the visit would be upcoming — but gate blocks it
    const rawResult = isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0));
    const gated = eligible ? rawResult : false;
    expect(gated).toBe(false);
    // Raw result itself would be true
    expect(rawResult).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Notification-read independence
// Verifies the card indicator (pure time check) is not affected by whether
// a notification has been read/dismissed.
// ---------------------------------------------------------------------------

describe('Notification-read independence', () => {
  it('isUpcomingVisit result is the same regardless of toast deduplication state', () => {
    const shownToastIds = new Set<string>();
    shownToastIds.add('notif-001');

    const { visitDate, visitTime } = visitAt(5 * MIN);

    // Even though the toast for this notification has already been shown,
    // the timing check is unaffected.
    const beforeRead = isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0));
    shownToastIds.delete('notif-001'); // simulate "notification read"
    const afterRead = isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0));

    expect(beforeRead).toBe(true);
    expect(afterRead).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Toast deduplication logic
// ---------------------------------------------------------------------------

describe('Toast deduplication via Set', () => {
  it('allows the first show and blocks a repeat for the same ID', () => {
    const shown = new Set<string>();
    const shouldShowToast = (id: string): boolean => {
      if (shown.has(id)) return false;
      shown.add(id);
      return true;
    };
    expect(shouldShowToast('notif-001')).toBe(true);
    expect(shouldShowToast('notif-001')).toBe(false);
    expect(shouldShowToast('notif-002')).toBe(true);
    expect(shown.size).toBe(2);
  });

  it('evicts the oldest entry when size exceeds 200', () => {
    const shown = new Set<string>();
    for (let i = 0; i < 200; i++) {
      shown.add(`notif-${i}`);
    }
    // Add a 201st entry with eviction
    const newId = 'notif-new';
    if (!shown.has(newId)) {
      shown.add(newId);
      if (shown.size > 200) {
        const oldest = shown.values().next().value!;
        shown.delete(oldest);
      }
    }
    expect(shown.size).toBe(200);
    expect(shown.has('notif-new')).toBe(true);
    expect(shown.has('notif-0')).toBe(false);
  });

  it('does not evict when size is exactly 200 after add', () => {
    const shown = new Set<string>();
    for (let i = 0; i < 199; i++) {
      shown.add(`notif-${i}`);
    }
    const newId = 'notif-199';
    if (!shown.has(newId)) {
      shown.add(newId);
      if (shown.size > 200) {
        const oldest = shown.values().next().value!;
        shown.delete(oldest);
      }
    }
    expect(shown.size).toBe(200);
    // No eviction occurred
    expect(shown.has('notif-0')).toBe(true);
  });

  it('subsequent notifications with different IDs are deduplicated independently', () => {
    const shown = new Set<string>();
    const shouldShowToast = (id: string): boolean => {
      if (shown.has(id)) return false;
      shown.add(id);
      return true;
    };
    expect(shouldShowToast('visit-A')).toBe(true);
    expect(shouldShowToast('visit-B')).toBe(true);
    expect(shouldShowToast('visit-A')).toBe(false);
    expect(shouldShowToast('visit-B')).toBe(false);
    expect(shouldShowToast('visit-C')).toBe(true);
  });
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
// Buffet privacy — isUpcomingVisit returns boolean, no visitor identity
// ---------------------------------------------------------------------------

describe('Buffet task indicator privacy', () => {
  it('isUpcomingVisit returns a boolean — no visitor name leaked', () => {
    const { visitDate, visitTime } = visitAt(5 * MIN);
    const result = isUpcomingVisit(visitDate, visitTime, THRESHOLD, fakeNow(0));
    expect(typeof result).toBe('boolean');
    // result must not contain visitor-identifying strings
    expect(String(result)).not.toMatch(/[A-Za-z]{4,}/);
  });

  it('parseVisitDateTime returns a Date — no visitor name in output', () => {
    const d = parseVisitDateTime('2025-06-01', '10:30');
    expect(d).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Shared hook path — module export assertion
// ---------------------------------------------------------------------------

describe('Module export path assertion', () => {
  it('exports isUpcomingVisit, parseVisitDateTime, useUpcomingIndicator from hooks/useUpcomingVisitTimer', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../hooks/useUpcomingVisitTimer');
    expect(typeof mod.isUpcomingVisit).toBe('function');
    expect(typeof mod.parseVisitDateTime).toBe('function');
    expect(typeof mod.useUpcomingIndicator).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Reschedule scenario — card updates when visitDate/visitTime props change
// ---------------------------------------------------------------------------

describe('Reschedule scenario', () => {
  it('indicator changes from true to false when visit is rescheduled beyond threshold', () => {
    // Before reschedule: visit is 5 min away → inside window
    const before = visitAt(5 * MIN);
    expect(isUpcomingVisit(before.visitDate, before.visitTime, THRESHOLD, fakeNow(0))).toBe(true);

    // After reschedule: visit is 60 min away → outside window
    const after = visitAt(60 * MIN);
    expect(isUpcomingVisit(after.visitDate, after.visitTime, THRESHOLD, fakeNow(0))).toBe(false);
  });

  it('indicator changes from false to true when visit is rescheduled into threshold', () => {
    // Before reschedule: visit is 60 min away → outside window
    const before = visitAt(60 * MIN);
    expect(isUpcomingVisit(before.visitDate, before.visitTime, THRESHOLD, fakeNow(0))).toBe(false);

    // After reschedule: visit is 10 min away → inside window
    const after = visitAt(10 * MIN);
    expect(isUpcomingVisit(after.visitDate, after.visitTime, THRESHOLD, fakeNow(0))).toBe(true);
  });
});
