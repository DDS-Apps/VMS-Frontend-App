/**
 * Tests for utils/visitExpiredGuard.ts — computeIsVisitExpired
 *
 * Two kinds of tests:
 *
 * 1. WIRING TESTS — verify that RequestDetailsScreen imports and uses
 *    `computeIsVisitExpired` and that `minuteTick` is in the isVisitExpired
 *    dependency array. These fail if someone inlines the logic back into the
 *    component or removes minuteTick from the deps.
 *
 * 2. PREDICATE TESTS — exercise the pure guard function for every relevant
 *    scenario, including the "clock advances past end time while screen is
 *    open" case modelled by changing the injected nowFn between calls.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  computeIsPendingApprovalWalkInExpired,
  computeIsVisitExpired,
  parseDurationToMs,
} from '../utils/visitExpiredGuard';

// ---------------------------------------------------------------------------
// Wiring tests — prove the component uses the extracted guard function
// ---------------------------------------------------------------------------
const SCREEN_PATH = path.resolve(
  __dirname,
  '../screens/Employee/RequestDetailsScreen.tsx',
);
const screenSource = fs.readFileSync(SCREEN_PATH, 'utf8');
const MANAGER_SCREEN_PATH = path.resolve(
  __dirname,
  '../screens/Manager/ManagerApprovalDetailScreen.tsx',
);
const managerScreenSource = fs.readFileSync(MANAGER_SCREEN_PATH, 'utf8');

describe('RequestDetailsScreen — visitExpiredGuard wiring', () => {
  it('imports computeIsVisitExpired from @/utils/visitExpiredGuard', () => {
    expect(screenSource).toMatch(
      /from\s+["']@\/utils\/visitExpiredGuard["']/,
    );
  });

  it('calls computeIsVisitExpired to derive isVisitExpired', () => {
    expect(screenSource).toMatch(/computeIsVisitExpired\s*\(/);
    expect(screenSource).toMatch(/isWalkIn:\s*request\?\.isWalkIn/);
  });

  it('includes minuteTick in the isVisitExpired useMemo dependency array', () => {
    // The dependency array must include minuteTick so the memo re-evaluates
    // every minute while the screen is open.
    expect(screenSource).toMatch(/minuteTick/);
  });

  it('host-approval sticky footer is gated by the targeted expiration result', () => {
    // The walk-in pending_host_approval footer must only render when the
    // visit has not yet expired so the Approve/Reject buttons disappear
    // automatically once the visit end time passes.
    expect(screenSource).toMatch(
      /PENDING_HOST_APPROVAL[\s\S]{0,80}!isExpiredPendingHostWalkIn/,
    );
  });

  it('showStickyFooter uses the non-expired walk-in approval predicate', () => {
    expect(screenSource).toMatch(
      /canHostApproveWalkIn[\s\S]{0,160}PENDING_HOST_APPROVAL[\s\S]{0,80}!isExpiredPendingHostWalkIn/,
    );
    expect(screenSource).toMatch(
      /showStickyFooter\s*=\s*[\s\S]{0,80}canHostApproveWalkIn/,
    );
  });

  it('handleHostApprove recomputes pending-host walk-in expiration at invocation time', () => {
    // Defensive guard prevents firing a host-approve mutation on a visit
    // whose end time passed between the last minuteTick re-render and the tap.
    expect(screenSource).toMatch(
      /handleHostApprove\s*=\s*\(\)\s*=>\s*\{[\s\S]{0,240}computeCurrentPendingHostWalkInExpiration\(\)[\s\S]{0,30}return/,
    );
  });

  it('blocks every host approval and rejection entry point after expiration', () => {
    expect(screenSource).toMatch(
      /handleHostApproveForTimeline\s*=\s*\(\)\s*=>\s*\{\s*if \(computeCurrentPendingHostWalkInExpiration\(\)\) return;/,
    );
    expect(screenSource).toMatch(
      /handleHostReject\s*=\s*\(\)\s*=>\s*\{\s*if \(computeCurrentPendingHostWalkInExpiration\(\)\) return;/,
    );
    expect(screenSource).toMatch(
      /timelineActionCallbacks[\s\S]{0,180}pending_host_approval["'][\s\S]{0,40}!isExpiredPendingHostWalkIn/,
    );
    expect(screenSource).toMatch(
      /showActions:[\s\S]{0,120}pending_host_approval["'][\s\S]{0,40}!isExpiredPendingHostWalkIn/,
    );
    expect(screenSource).toMatch(
      /computeCurrentPendingHostWalkInExpiration[\s\S]{0,180}!request\?\.isWalkIn[\s\S]{0,100}PENDING_HOST_APPROVAL/,
    );
  });

  it('closes an open host-rejection modal when the Riyadh date expires', () => {
    expect(screenSource).toMatch(
      /if \(!isExpiredPendingHostWalkIn \|\| !showHostRejectModal\) return;[\s\S]{0,120}setShowHostRejectModal\(false\);[\s\S]{0,120}setHostRejectReason\(""\)/,
    );
  });

  it('declares the rejection-modal cleanup hook before loading and error returns', () => {
    const cleanupHookIndex = screenSource.indexOf(
      'if (!isExpiredPendingHostWalkIn || !showHostRejectModal) return;',
    );
    const loadingReturnIndex = screenSource.indexOf(
      'if (isLoading || isFetching)',
    );

    expect(cleanupHookIndex).toBeGreaterThan(-1);
    expect(loadingReturnIndex).toBeGreaterThan(-1);
    expect(cleanupHookIndex).toBeLessThan(loadingReturnIndex);
  });

  it('manager ApprovalActionGroup is gated by !isVisitExpired', () => {
    expect(screenSource).toMatch(/canManagerApproveRequest[\s\S]{0,200}!isVisitExpired/);
  });

  it('pins the expired notice for pending-host-approval walk-ins', () => {
    expect(screenSource).toMatch(
      /showExpiredWalkInFooter\s*=[\s\S]{0,100}request\??\.isWalkIn[\s\S]{0,120}PENDING_HOST_APPROVAL[\s\S]{0,80}isExpiredPendingHostWalkIn/,
    );
    expect(screenSource).toMatch(
      /\{showExpiredWalkInFooter \? \([\s\S]{0,300}styles\.stickyFooter[\s\S]{0,500}<ExpiredVisitFooter/,
    );
    expect(screenSource).toMatch(
      /const showStickyFooter\s*=\s*showExpiredWalkInFooter/,
    );
  });

  it('keeps the pending-host status badge unchanged while showing the banner', () => {
    expect(screenSource).toContain(
      '<RequestStatusBadge status={request.status} />',
    );
    expect(screenSource).not.toMatch(
      /RequestStatusBadge status=\{isVisitExpired \? ["']expired["']/,
    );
  });

  it('preserves the manager pending-approval expired notice condition', () => {
    expect(screenSource).toMatch(
      /showInlineExpiredVisitNotice\s*=[\s\S]{0,80}!request\.isWalkIn[\s\S]{0,100}PENDING_APPROVAL[\s\S]{0,80}userRole === ["']manager["']/,
    );
    expect(screenSource).toContain(
      "{showInlineExpiredVisitNotice ? expiredVisitNotice : null}",
    );
  });

  it('keeps alternatively mapped walk-ins in the fixed expired footer', () => {
    expect(screenSource).toMatch(
      /showExpiredWalkInFooter\s*=[\s\S]{0,300}PENDING_HOST_APPROVAL[\s\S]{0,160}isPendingApprovalWalkInExpired/,
    );
  });

  it('keeps scheduled pending-host requests outside the targeted expiration rule', () => {
    expect(screenSource).toMatch(
      /computeCurrentPendingHostWalkInExpiration[\s\S]{0,180}!request\?\.isWalkIn[\s\S]{0,100}return false/,
    );
  });

  it('keeps host and manager approval footers mutually exclusive', () => {
    expect(screenSource).toMatch(
      /canManagerApproveRequest[\s\S]{0,160}!canHostApproveWalkIn/,
    );
  });

  it('anchors sticky approval actions inside a full-height native container', () => {
    expect(screenSource).toContain('<View style={styles.screenContainer}>');
    expect(screenSource).toMatch(/screenContainer:\s*\{\s*flex:\s*1/);
  });
});

describe('ManagerApprovalDetailScreen — visitExpiredGuard wiring', () => {
  it('uses the targeted pending-approval walk-in expiration helper', () => {
    expect(managerScreenSource).toMatch(
      /from\s+["']@\/utils\/visitExpiredGuard["']/,
    );
    expect(managerScreenSource).toMatch(
      /computeIsPendingApprovalWalkInExpired\s*\(\{/,
    );
    expect(managerScreenSource).toMatch(/isWalkIn:\s*visitData\?\.isWalkIn/);
    expect(managerScreenSource).toMatch(
      /const expirationStatus\s*=\s*request\?\.status\s*\?\?\s*visitData\?\.status/,
    );
  });

  it('re-evaluates expiration on the existing minute tick', () => {
    expect(managerScreenSource).toMatch(
      /computeIsPendingApprovalWalkInExpired[\s\S]{0,800}minuteTick/,
    );
  });
});

// ---------------------------------------------------------------------------
// parseDurationToMs — helper coverage
// ---------------------------------------------------------------------------
describe('parseDurationToMs', () => {
  it('returns 1 hour (3 600 000 ms) for empty string', () => {
    expect(parseDurationToMs('')).toBe(3_600_000);
  });

  it('parses "Full Day" to 24 hours', () => {
    expect(parseDurationToMs('Full Day')).toBe(24 * 3_600_000);
  });

  it('parses ISO 8601 "PT1H30M" correctly', () => {
    expect(parseDurationToMs('PT1H30M')).toBe(90 * 60_000);
  });

  it('parses ISO 8601 "PT24H" to 24 hours', () => {
    expect(parseDurationToMs('PT24H')).toBe(24 * 3_600_000);
  });

  it('parses ISO 8601 "P1D" to 24 hours', () => {
    expect(parseDurationToMs('P1D')).toBe(24 * 3_600_000);
  });

  it('parses human-readable "2 hours" correctly', () => {
    expect(parseDurationToMs('2 hours')).toBe(2 * 3_600_000);
  });

  it('parses human-readable "30 minutes" correctly', () => {
    expect(parseDurationToMs('30 minutes')).toBe(30 * 60_000);
  });

  it('parses human-readable "1 hour 30 minutes" correctly', () => {
    expect(parseDurationToMs('1 hour 30 minutes')).toBe(90 * 60_000);
  });
});

// ---------------------------------------------------------------------------
// computeIsVisitExpired — priority 1: explicit endTime field
// ---------------------------------------------------------------------------
describe('computeIsVisitExpired — explicit endTime (priority 1)', () => {
  // Visit end: 2026-08-18 12:00 device-local time
  // We represent it as a "HH:MM" string which parseDateTimeLocal turns into a
  // device-local Date — so we compare against device-local nowFn dates.
  const VISIT_DATE = '2026-08-18';
  const END_TIME = '12:00'; // device-local noon

  const endMs = new Date(2026, 7 /* Aug */, 18, 12, 0).getTime();

  it('returns false 1 ms before the visit end time', () => {
    const nowFn = () => new Date(endMs - 1);
    expect(computeIsVisitExpired(VISIT_DATE, '10:00', END_TIME, null, nowFn)).toBe(false);
  });

  it('returns false at the exact end moment (< is strict)', () => {
    // end < now → false when they are equal
    const nowFn = () => new Date(endMs);
    expect(computeIsVisitExpired(VISIT_DATE, '10:00', END_TIME, null, nowFn)).toBe(false);
  });

  it('returns true 1 ms after the visit end time', () => {
    const nowFn = () => new Date(endMs + 1);
    expect(computeIsVisitExpired(VISIT_DATE, '10:00', END_TIME, null, nowFn)).toBe(true);
  });

  it('returns true 60 seconds after the visit end time', () => {
    const nowFn = () => new Date(endMs + 60_000);
    expect(computeIsVisitExpired(VISIT_DATE, '10:00', END_TIME, null, nowFn)).toBe(true);
  });

  it('simulates clock advancing past end while screen is open — false → true', () => {
    const beforeEnd = () => new Date(endMs - 30_000); // 30 s before end
    const afterEnd  = () => new Date(endMs + 30_000); // 30 s after end

    expect(computeIsVisitExpired(VISIT_DATE, '10:00', END_TIME, null, beforeEnd)).toBe(false);
    expect(computeIsVisitExpired(VISIT_DATE, '10:00', END_TIME, null, afterEnd)).toBe(true);
  });

  it('handles PM end time "2:00 PM" correctly', () => {
    const pmEndMs = new Date(2026, 7, 18, 14, 0).getTime();
    const before  = () => new Date(pmEndMs - 1);
    const after   = () => new Date(pmEndMs + 1);
    expect(computeIsVisitExpired(VISIT_DATE, '10:00', '2:00 PM', null, before)).toBe(false);
    expect(computeIsVisitExpired(VISIT_DATE, '10:00', '2:00 PM', null, after)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeIsVisitExpired — priority 2: start time + duration
// ---------------------------------------------------------------------------
describe('computeIsVisitExpired — start + duration fallback (priority 2)', () => {
  // Visit: 2026-08-18, start 10:00 local, duration 2 hours → ends 12:00 local
  const VISIT_DATE = '2026-08-18';
  const VISIT_TIME = '10:00';
  const DURATION   = '2 hours';
  const endMs = new Date(2026, 7, 18, 12, 0).getTime(); // 12:00 local

  it('returns false before the calculated end time', () => {
    const nowFn = () => new Date(endMs - 1);
    expect(computeIsVisitExpired(VISIT_DATE, VISIT_TIME, undefined, DURATION, nowFn)).toBe(false);
  });

  it('returns true after the calculated end time', () => {
    const nowFn = () => new Date(endMs + 1);
    expect(computeIsVisitExpired(VISIT_DATE, VISIT_TIME, undefined, DURATION, nowFn)).toBe(true);
  });

  it('simulates clock advancing past end — false → true', () => {
    const before = () => new Date(endMs - 60_000);
    const after  = () => new Date(endMs + 60_000);
    expect(computeIsVisitExpired(VISIT_DATE, VISIT_TIME, undefined, DURATION, before)).toBe(false);
    expect(computeIsVisitExpired(VISIT_DATE, VISIT_TIME, undefined, DURATION, after)).toBe(true);
  });

  it('uses ISO 8601 duration "PT2H" correctly', () => {
    const before = () => new Date(endMs - 1);
    const after  = () => new Date(endMs + 1);
    expect(computeIsVisitExpired(VISIT_DATE, VISIT_TIME, undefined, 'PT2H', before)).toBe(false);
    expect(computeIsVisitExpired(VISIT_DATE, VISIT_TIME, undefined, 'PT2H', after)).toBe(true);
  });

  it('Full Day duration expires at end of day from start + 24 h', () => {
    // start 10:00 + 24h = 10:00 next day
    const fullDayEndMs = new Date(2026, 7, 19, 10, 0).getTime();
    const before = () => new Date(fullDayEndMs - 1);
    const after  = () => new Date(fullDayEndMs + 1);
    expect(computeIsVisitExpired(VISIT_DATE, VISIT_TIME, undefined, 'Full Day', before)).toBe(false);
    expect(computeIsVisitExpired(VISIT_DATE, VISIT_TIME, undefined, 'Full Day', after)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeIsVisitExpired — fallback: end of visit date
// ---------------------------------------------------------------------------
describe('computeIsVisitExpired — end-of-day fallback (priority 3)', () => {
  const VISIT_DATE = '2026-08-18';
  const endOfDayMs = new Date(2026, 7, 18, 23, 59, 59).getTime();

  it('returns false before 23:59:59 on the visit date (no time data)', () => {
    const nowFn = () => new Date(endOfDayMs - 1);
    expect(computeIsVisitExpired(VISIT_DATE, undefined, undefined, undefined, nowFn)).toBe(false);
  });

  it('returns true after 23:59:59 on the visit date (no time data)', () => {
    const nowFn = () => new Date(endOfDayMs + 1);
    expect(computeIsVisitExpired(VISIT_DATE, undefined, undefined, undefined, nowFn)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeIsVisitExpired — edge / invalid inputs
// ---------------------------------------------------------------------------
describe('computeIsVisitExpired — missing / invalid inputs', () => {
  it('returns false when visitDate is null', () => {
    expect(computeIsVisitExpired(null, '10:00', '12:00', null)).toBe(false);
  });

  it('returns false when visitDate is undefined', () => {
    expect(computeIsVisitExpired(undefined, '10:00', '12:00', null)).toBe(false);
  });

  it('returns false when all inputs are undefined', () => {
    expect(computeIsVisitExpired(undefined, undefined, undefined, undefined)).toBe(false);
  });
});

describe('computeIsVisitExpired — walk-ins use Riyadh calendar dates', () => {
  const nowInRiyadhSeptember8 = () => new Date('2026-09-07T21:30:00.000Z');

  it('expires a walk-in from the previous Riyadh date', () => {
    expect(
      computeIsVisitExpired(
        '2026-09-07',
        undefined,
        undefined,
        undefined,
        { isWalkIn: true, nowFn: nowInRiyadhSeptember8 },
      ),
    ).toBe(true);
  });

  it('keeps a same-date walk-in active for the whole Riyadh day', () => {
    expect(
      computeIsVisitExpired(
        '2026-09-08',
        '12:00 AM',
        '12:01 AM',
        '1 minute',
        { isWalkIn: true, nowFn: nowInRiyadhSeptember8 },
      ),
    ).toBe(false);
  });

  it('keeps a future-date walk-in active', () => {
    expect(
      computeIsVisitExpired(
        '2026-09-09',
        undefined,
        undefined,
        undefined,
        { isWalkIn: true, nowFn: nowInRiyadhSeptember8 },
      ),
    ).toBe(false);
  });

  it('changes at the exact Riyadh midnight boundary', () => {
    const immediatelyBeforeMidnight = () =>
      new Date('2026-09-07T20:59:59.999Z');
    const atMidnight = () => new Date('2026-09-07T21:00:00.000Z');

    expect(
      computeIsVisitExpired(
        '2026-09-07',
        undefined,
        undefined,
        undefined,
        { isWalkIn: true, nowFn: immediatelyBeforeMidnight },
      ),
    ).toBe(false);
    expect(
      computeIsVisitExpired(
        '2026-09-07',
        undefined,
        undefined,
        undefined,
        { isWalkIn: true, nowFn: atMidnight },
      ),
    ).toBe(true);
  });

  it.each(['2026-13-01', '2026-02-31', '2026-9-07', 'not-a-date'])(
    'fails safely for invalid walk-in date %s',
    (visitDate) => {
      expect(
        computeIsVisitExpired(
          visitDate,
          undefined,
          undefined,
          undefined,
          { isWalkIn: true, nowFn: nowInRiyadhSeptember8 },
        ),
      ).toBe(false);
    },
  );

  it('does not change scheduled-visit end-time expiration', () => {
    const scheduledNow = () => new Date(2026, 8, 8, 12, 0, 1);
    expect(
      computeIsVisitExpired(
        '2026-09-08',
        '10:00',
        '12:00',
        '2 hours',
        { isWalkIn: false, nowFn: scheduledNow },
      ),
    ).toBe(true);
  });
});

describe('computeIsPendingApprovalWalkInExpired', () => {
  const makeInput = (overrides: Record<string, unknown> = {}) => ({
    isWalkIn: true,
    status: 'pending_approval',
    visitDate: '2026-09-10',
    visitTime: '10:00 AM',
    endTime: '12:00 PM',
    duration: '2 hours',
    ...overrides,
  });

  it('keeps the request active before and exactly at the Riyadh end time', () => {
    expect(
      computeIsPendingApprovalWalkInExpired(
        makeInput({ nowFn: () => new Date('2026-09-10T08:59:59.999Z') }),
      ),
    ).toBe(false);
    expect(
      computeIsPendingApprovalWalkInExpired(
        makeInput({ nowFn: () => new Date('2026-09-10T09:00:00.000Z') }),
      ),
    ).toBe(false);
  });

  it('expires immediately after the Riyadh end time', () => {
    expect(
      computeIsPendingApprovalWalkInExpired(
        makeInput({ nowFn: () => new Date('2026-09-10T09:00:00.001Z') }),
      ),
    ).toBe(true);
  });

  it.each(['pending', 'pending_approval'])(
    'supports the Manager-approval API status %s',
    (status) => {
      expect(
        computeIsPendingApprovalWalkInExpired(
          makeInput({
            status,
            nowFn: () => new Date('2026-09-10T09:01:00.000Z'),
          }),
        ),
      ).toBe(true);
    },
  );

  it('does not affect scheduled visits or other walk-in workflow stages', () => {
    const afterEnd = () => new Date('2026-09-10T09:01:00.000Z');
    expect(
      computeIsPendingApprovalWalkInExpired(
        makeInput({ isWalkIn: false, nowFn: afterEnd }),
      ),
    ).toBe(false);
    expect(
      computeIsPendingApprovalWalkInExpired(
        makeInput({ status: 'pending_host_approval', nowFn: afterEnd }),
      ),
    ).toBe(false);
    expect(
      computeIsPendingApprovalWalkInExpired(
        makeInput({ status: 'approved', nowFn: afterEnd }),
      ),
    ).toBe(false);
  });

  it('treats an end time before the start time as the following Riyadh date', () => {
    const overnightInput = makeInput({
      visitTime: '11:30 PM',
      endTime: '12:30 AM',
    });

    expect(
      computeIsPendingApprovalWalkInExpired({
        ...overnightInput,
        nowFn: () => new Date('2026-09-10T21:30:00.000Z'),
      }),
    ).toBe(false);
    expect(
      computeIsPendingApprovalWalkInExpired({
        ...overnightInput,
        nowFn: () => new Date('2026-09-10T21:30:00.001Z'),
      }),
    ).toBe(true);
  });

  it('derives the scheduled end from duration when endTime is unavailable', () => {
    expect(
      computeIsPendingApprovalWalkInExpired(
        makeInput({
          endTime: undefined,
          duration: '2 hours',
          nowFn: () => new Date('2026-09-10T09:00:00.001Z'),
        }),
      ),
    ).toBe(true);
  });

  it('fails safely when no scheduled end can be determined', () => {
    expect(
      computeIsPendingApprovalWalkInExpired(
        makeInput({
          visitTime: undefined,
          endTime: undefined,
          duration: undefined,
          nowFn: () => new Date('2026-09-11T00:00:00.000Z'),
        }),
      ),
    ).toBe(false);
  });
});
