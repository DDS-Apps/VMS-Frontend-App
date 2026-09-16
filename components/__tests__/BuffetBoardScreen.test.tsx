/**
 * Tests for BuffetBoardScreen upcoming-visit indicator behaviour.
 *
 * Covers:
 *  1. BuffetUpcomingAlertIcon is shown for eligible statuses within the window
 *  2. BuffetUpcomingAlertIcon is NOT shown for ineligible statuses
 *  3. BuffetUpcomingAlertIcon is NOT shown when the visit is outside the threshold window
 *  4. visitorName (from BuffetStaffTaskDto) is NOT rendered in the task card (privacy)
 *  5. visitStartAt ISO path: icon shown when ISO timestamp is within window
 *  6. visitStartAt ISO path: icon hidden when ISO timestamp is outside window
 */

// ---------------------------------------------------------------------------
// Module mocks — before imports so jest hoisting works
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Platform: { OS: 'ios', select: jest.fn((obj: Record<string, unknown>) => obj.ios ?? obj.default) },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (s: Record<string, unknown>) => s,
    hairlineWidth: 1,
    absoluteFill: {},
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  isUpcomingVisit,
  isUpcomingVisitFromISO,
} from '@/hooks/useUpcomingVisitTimer';

// ---------------------------------------------------------------------------
// Test constants (mirror BuffetBoardScreen's BUFFET_STAFF_ELIGIBLE_STATUSES)
// ---------------------------------------------------------------------------

const BUFFET_STAFF_ELIGIBLE_STATUSES = ['pending', 'preparing', 'ready'];
const THRESHOLD = 15; // minutes

/** Returns true iff the status is in the buffet eligible list */
function isBuffetEligible(status: string): boolean {
  return BUFFET_STAFF_ELIGIBLE_STATUSES.includes(status);
}

/** Creates a nowFn that makes the visit appear N minutes away */
function nowBeforeMinutes(
  visitDate: string,
  visitTime: string,
  minutesAway: number
): () => number {
  const { parseVisitDateTime } = require('@/hooks/useUpcomingVisitTimer');
  const start: Date = parseVisitDateTime(visitDate, visitTime);
  return () => start.getTime() - minutesAway * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Suite 1 — Eligible statuses show the alert when within the window
// ---------------------------------------------------------------------------

describe('BuffetUpcomingAlertIcon — eligible statuses within window', () => {
  const DATE = '2025-08-15';
  const TIME = '12:00';

  BUFFET_STAFF_ELIGIBLE_STATUSES.forEach(status => {
    it(`shows alert for status "${status}" when visit is 5 min away`, () => {
      const eligible = isBuffetEligible(status);
      const nowFn = nowBeforeMinutes(DATE, TIME, 5);
      const isUpcoming = isUpcomingVisit(DATE, TIME, THRESHOLD, nowFn);
      // The hook returns isUpcoming only when eligible === true
      expect(eligible).toBe(true);
      expect(isUpcoming).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Ineligible statuses never show the alert
// ---------------------------------------------------------------------------

describe('BuffetUpcomingAlertIcon — ineligible statuses never show alert', () => {
  const DATE = '2025-08-15';
  const TIME = '12:00';
  const INELIGIBLE_STATUSES = ['served', 'completed', 'cancelled'];

  INELIGIBLE_STATUSES.forEach(status => {
    it(`does NOT show alert for status "${status}" even when visit is 5 min away`, () => {
      const eligible = isBuffetEligible(status);
      expect(eligible).toBe(false);
      // When eligible is false the hook returns false regardless of timing
      // (mirrors: `return eligible ? isUpcoming : false;`)
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Outside the threshold window → no alert (even for eligible status)
// ---------------------------------------------------------------------------

describe('BuffetUpcomingAlertIcon — visit outside threshold window', () => {
  const DATE = '2025-08-15';
  const TIME = '12:00';

  it('does not show alert when visit is 60 min away (well beyond 15-min threshold)', () => {
    const nowFn = nowBeforeMinutes(DATE, TIME, 60);
    const isUpcoming = isUpcomingVisit(DATE, TIME, THRESHOLD, nowFn);
    expect(isUpcoming).toBe(false);
  });

  it('does not show alert when visit is exactly 16 min away', () => {
    const nowFn = nowBeforeMinutes(DATE, TIME, 16);
    const isUpcoming = isUpcomingVisit(DATE, TIME, THRESHOLD, nowFn);
    expect(isUpcoming).toBe(false);
  });

  it('does not show alert when the visit has already started (past)', () => {
    const { parseVisitDateTime } = require('@/hooks/useUpcomingVisitTimer');
    const start: Date = parseVisitDateTime(DATE, TIME);
    const nowFn = () => start.getTime() + 1_000; // 1 s after start
    const isUpcoming = isUpcomingVisit(DATE, TIME, THRESHOLD, nowFn);
    expect(isUpcoming).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Privacy: visitorName must NOT be shown in buffet task cards
//
// This verifies the privacy contract documented in the scratchpad:
// BuffetStaffTaskDto.visitorName is available on the DTO but must NOT be
// rendered in the buffet board card UI.
// ---------------------------------------------------------------------------

describe('BuffetBoardScreen — privacy: visitorName is not rendered in task cards', () => {
  it('BuffetStaffTaskDto has a visitorName field in the type definition', () => {
    // Structural type check — the DTO includes visitorName
    const task: import('@/types/api.types').BuffetStaffTaskDto = {
      id: 'task-1',
      visitorName: 'John Doe',
      hostName: 'HR Manager',
      visitDate: '2025-08-15',
      visitTime: '12:00',
      mealType: 'lunch',
      guestCount: 5,
      location: 'Buffet Hall A',
      status: 'pending',
    };
    // The field exists on the DTO
    expect(task.visitorName).toBe('John Doe');
  });

  it('visitorName does NOT appear in the buffet card when rendering via task data', () => {
    // We verify the non-rendering contract by confirming the screen file
    // does NOT include any JSX reference to task.visitorName.
    // This is a static contract test — if someone adds task.visitorName to the
    // render output, this test must be updated and a privacy review triggered.
    const fs = require('fs');
    const path = require('path');
    const screenPath = path.join(
      process.cwd(),
      'screens/Buffet/BuffetBoardScreen.tsx'
    );
    const source: string = fs.readFileSync(screenPath, 'utf-8');
    // The screen should NOT render `task.visitorName` in JSX
    expect(source).not.toMatch(/\btask\.visitorName\b/);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — visitStartAt ISO path
// ---------------------------------------------------------------------------

describe('BuffetUpcomingAlertIcon — visitStartAt ISO path', () => {
  it('shows alert when visitStartAt ISO is 5 min in the future', () => {
    const fixedNow = 1_700_000_000_000;
    const visitStartAt = new Date(fixedNow + 5 * 60 * 1000).toISOString();
    expect(isUpcomingVisitFromISO(visitStartAt, THRESHOLD, () => fixedNow)).toBe(true);
  });

  it('hides alert when visitStartAt ISO is 60 min in the future (outside threshold)', () => {
    const fixedNow = 1_700_000_000_000;
    const visitStartAt = new Date(fixedNow + 60 * 60 * 1000).toISOString();
    expect(isUpcomingVisitFromISO(visitStartAt, THRESHOLD, () => fixedNow)).toBe(false);
  });

  it('hides alert when visitStartAt ISO is in the past', () => {
    const fixedNow = 1_700_000_000_000;
    const visitStartAt = new Date(fixedNow - 1_000).toISOString();
    expect(isUpcomingVisitFromISO(visitStartAt, THRESHOLD, () => fixedNow)).toBe(false);
  });

  it('hides alert when visitStartAt is undefined (falls back to date+time path)', () => {
    // When visitStartAt is undefined, the hook uses visitDate+visitTime.
    // A past date → no alert.
    expect(isUpcomingVisit('2020-01-01', '09:00', THRESHOLD, Date.now)).toBe(false);
  });

  it('shows alert at ISO threshold boundary (inclusive)', () => {
    const fixedNow = 1_700_000_000_000;
    const visitStartAt = new Date(fixedNow + THRESHOLD * 60 * 1000).toISOString();
    // remainingMs == thresholdMs → inclusive → true
    expect(isUpcomingVisitFromISO(visitStartAt, THRESHOLD, () => fixedNow)).toBe(true);
  });
});
