/**
 * Tests for utils/visitStartGuard.ts — computeHasVisitStarted
 *
 * Two kinds of tests:
 *
 * 1. WIRING TESTS — verify that RequestDetailsScreen imports and uses
 *    `computeHasVisitStarted` and that the Edit button / openEditModal are
 *    both gated on `hasVisitStarted`. These fail if someone inlines the logic
 *    back into the component or removes a call-site.
 *
 * 2. PREDICATE TESTS — exercise the pure guard function for every relevant
 *    scenario, including the "clock advances past start time while screen is
 *    open" case modelled by changing the injected nowFn between calls.
 */

import * as fs from 'fs';
import * as path from 'path';

import { computeHasVisitStarted } from '../utils/visitStartGuard';

// ---------------------------------------------------------------------------
// Wiring tests — prove the component uses the extracted guard function
// ---------------------------------------------------------------------------
const SCREEN_PATH = path.resolve(
  __dirname,
  '../screens/Employee/RequestDetailsScreen.tsx',
);
const screenSource = fs.readFileSync(SCREEN_PATH, 'utf8');

describe('RequestDetailsScreen — visitStartGuard wiring', () => {
  it('imports computeHasVisitStarted from @/utils/visitStartGuard', () => {
    expect(screenSource).toMatch(
      /from\s+["']@\/utils\/visitStartGuard["']/,
    );
  });

  it('calls computeHasVisitStarted to derive hasVisitStarted', () => {
    expect(screenSource).toMatch(/computeHasVisitStarted\s*\(/);
  });

  it('non-walk-in full-edit button is hidden once the visit has started', () => {
    // The JSX must guard the full-edit button with both !hasVisitStarted AND !request.isWalkIn.
    // A bare !hasVisitStarted guard would also hide walk-in Edit Services, which must stay visible.
    expect(screenSource).toMatch(/!hasVisitStarted\s*&&\s*!request\.isWalkIn/);
  });

  it('walk-in Edit Services button is always rendered — not wrapped in !hasVisitStarted', () => {
    // Walk-in services editing is exempt from the start guard so managers can still
    // set services for a visitor who has already checked in.
    // The JSX must render the walk-in button inside `request.isWalkIn` (no hasVisitStarted check).
    expect(screenSource).toMatch(/request\.isWalkIn\s*\?/);
    // And the walk-in button must call openEditModal("services-only").
    expect(screenSource).toMatch(/openEditModal\s*\(\s*["']services-only["']\s*\)/);
  });

  it('openEditModal returns early when mode is "full" and hasVisitStarted is true', () => {
    // The guard: if (mode === "full" && hasVisitStarted) { return; }
    expect(screenSource).toMatch(/mode\s*===\s*["']full["']\s*&&\s*hasVisitStarted/);
  });

  it('minute-tick interval re-evaluates hasVisitStarted every 60 seconds', () => {
    // The setInterval driving minuteTick must fire at 60 000 ms.
    expect(screenSource).toMatch(/setInterval\s*\(.*60[_\s]?000/s);
  });

  it('services-only path is exempt — guard combines mode check with hasVisitStarted, not hasVisitStarted alone', () => {
    // If the guard were `if (hasVisitStarted)` without the mode check, the
    // services-only walk-in path would be wrongly blocked after check-in.
    // The combined expression `mode === "full" && hasVisitStarted` must be present.
    expect(screenSource).toMatch(/mode\s*===\s*["']full["']\s*&&\s*hasVisitStarted/);
  });
});

// ---------------------------------------------------------------------------
// computeHasVisitStarted — ISO visitStartAt path (primary)
// ---------------------------------------------------------------------------
describe('computeHasVisitStarted — ISO visitStartAt path', () => {
  // Canonical visit: 2026-08-18 10:00 Asia/Riyadh = 2026-08-18T07:00:00Z
  const START_ISO = '2026-08-18T07:00:00.000Z';
  const startMs = Date.parse(START_ISO);

  it('returns false 1 ms before the visit start', () => {
    const nowFn = () => new Date(startMs - 1);
    expect(computeHasVisitStarted(START_ISO, null, null, nowFn)).toBe(false);
  });

  it('returns true at the exact visit start moment', () => {
    const nowFn = () => new Date(startMs);
    expect(computeHasVisitStarted(START_ISO, null, null, nowFn)).toBe(true);
  });

  it('returns true 1 ms after the visit start', () => {
    const nowFn = () => new Date(startMs + 1);
    expect(computeHasVisitStarted(START_ISO, null, null, nowFn)).toBe(true);
  });

  it('returns true 60 seconds after the visit start', () => {
    const nowFn = () => new Date(startMs + 60_000);
    expect(computeHasVisitStarted(START_ISO, null, null, nowFn)).toBe(true);
  });

  it('simulates clock advancing past start while screen is open — false → true', () => {
    // Simulate the minute-tick scenario: first call before start, second call after.
    const beforeStart = () => new Date(startMs - 30_000);
    const afterStart  = () => new Date(startMs + 30_000);

    expect(computeHasVisitStarted(START_ISO, null, null, beforeStart)).toBe(false);
    expect(computeHasVisitStarted(START_ISO, null, null, afterStart)).toBe(true);
  });

  it('returns false for empty visitStartAt (falls through to date+time path which also lacks data)', () => {
    const nowFn = () => new Date(startMs + 60_000);
    expect(computeHasVisitStarted('', null, null, nowFn)).toBe(false);
  });

  it('returns false for undefined visitStartAt with no date/time fallback', () => {
    const nowFn = () => new Date(startMs + 60_000);
    expect(computeHasVisitStarted(undefined, undefined, undefined, nowFn)).toBe(false);
  });

  it('returns false for malformed visitStartAt with no date/time fallback', () => {
    const nowFn = () => new Date(startMs + 60_000);
    expect(computeHasVisitStarted('not-a-date', undefined, undefined, nowFn)).toBe(false);
  });

  it('ignores visitDate/visitTime when a valid visitStartAt is provided', () => {
    // visitDate/visitTime point to a completely different time — visitStartAt wins.
    const nowFn = () => new Date(startMs + 1);
    expect(
      computeHasVisitStarted(START_ISO, '2020-01-01', '08:00', nowFn),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeHasVisitStarted — date + time string fallback path
// ---------------------------------------------------------------------------
describe('computeHasVisitStarted — date+time string fallback path', () => {
  // Visit: 2026-08-18 10:00 Asia/Riyadh.
  // getServerDateParts maps any Date → Riyadh wall-clock time via Intl.DateTimeFormat.
  // Asia/Riyadh = UTC+3, so:
  //   09:59 Riyadh wall-clock = 06:59 UTC  → new Date('2026-08-18T06:59:00Z')
  //   10:00 Riyadh wall-clock = 07:00 UTC  → new Date('2026-08-18T07:00:00Z')
  //   10:01 Riyadh wall-clock = 07:01 UTC  → new Date('2026-08-18T07:01:00Z')

  const VISIT_DATE = '2026-08-18';

  describe('24-hour time format "HH:MM"', () => {
    const VISIT_TIME_24 = '10:00';

    it('returns false 1 minute before the visit (09:59 Riyadh = 06:59 UTC)', () => {
      const nowFn = () => new Date('2026-08-18T06:59:00Z');
      expect(computeHasVisitStarted(null, VISIT_DATE, VISIT_TIME_24, nowFn)).toBe(false);
    });

    it('returns true at the exact visit start (10:00 Riyadh = 07:00 UTC)', () => {
      const nowFn = () => new Date('2026-08-18T07:00:00Z');
      expect(computeHasVisitStarted(null, VISIT_DATE, VISIT_TIME_24, nowFn)).toBe(true);
    });

    it('returns true 1 minute after start (10:01 Riyadh = 07:01 UTC)', () => {
      const nowFn = () => new Date('2026-08-18T07:01:00Z');
      expect(computeHasVisitStarted(null, VISIT_DATE, VISIT_TIME_24, nowFn)).toBe(true);
    });

    it('simulates clock advancing — false → true across the start boundary', () => {
      const before = () => new Date('2026-08-18T06:59:00Z'); // 09:59 Riyadh
      const after  = () => new Date('2026-08-18T07:01:00Z'); // 10:01 Riyadh
      expect(computeHasVisitStarted(null, VISIT_DATE, VISIT_TIME_24, before)).toBe(false);
      expect(computeHasVisitStarted(null, VISIT_DATE, VISIT_TIME_24, after)).toBe(true);
    });
  });

  describe('12-hour AM/PM time format', () => {
    it('returns false before "10:00 AM" visit (09:59 Riyadh = 06:59 UTC)', () => {
      const nowFn = () => new Date('2026-08-18T06:59:00Z');
      expect(computeHasVisitStarted(null, VISIT_DATE, '10:00 AM', nowFn)).toBe(false);
    });

    it('returns true at "10:00 AM" visit start (07:00 UTC)', () => {
      const nowFn = () => new Date('2026-08-18T07:00:00Z');
      expect(computeHasVisitStarted(null, VISIT_DATE, '10:00 AM', nowFn)).toBe(true);
    });

    it('handles single-digit hour "8:25 AM" (08:25 Riyadh = 05:25 UTC)', () => {
      const before = () => new Date('2026-08-18T05:24:00Z'); // 08:24 Riyadh
      const after  = () => new Date('2026-08-18T05:25:00Z'); // 08:25 Riyadh
      expect(computeHasVisitStarted(null, VISIT_DATE, '8:25 AM', before)).toBe(false);
      expect(computeHasVisitStarted(null, VISIT_DATE, '8:25 AM', after)).toBe(true);
    });

    it('handles "2:30 PM" correctly (14:30 Riyadh = 11:30 UTC)', () => {
      const before = () => new Date('2026-08-18T11:29:00Z'); // 14:29 Riyadh
      const after  = () => new Date('2026-08-18T11:30:00Z'); // 14:30 Riyadh
      expect(computeHasVisitStarted(null, VISIT_DATE, '2:30 PM', before)).toBe(false);
      expect(computeHasVisitStarted(null, VISIT_DATE, '2:30 PM', after)).toBe(true);
    });

    it('handles "12:00 PM" noon correctly (12:00 Riyadh = 09:00 UTC)', () => {
      const before = () => new Date('2026-08-18T08:59:00Z'); // 11:59 Riyadh
      const at     = () => new Date('2026-08-18T09:00:00Z'); // 12:00 Riyadh
      expect(computeHasVisitStarted(null, VISIT_DATE, '12:00 PM', before)).toBe(false);
      expect(computeHasVisitStarted(null, VISIT_DATE, '12:00 PM', at)).toBe(true);
    });

    it('handles "12:00 AM" midnight correctly — h24 must become 0 (21:00 UTC prev day)', () => {
      // 12:00 AM Riyadh on 2026-08-18 = 2026-08-17T21:00:00Z
      const before = () => new Date('2026-08-17T20:59:00Z'); // 23:59 Riyadh on Aug 17
      const at     = () => new Date('2026-08-17T21:00:00Z'); // 00:00 Riyadh on Aug 18
      expect(computeHasVisitStarted(null, '2026-08-18', '12:00 AM', before)).toBe(false);
      expect(computeHasVisitStarted(null, '2026-08-18', '12:00 AM', at)).toBe(true);
    });
  });

  describe('time format with seconds "HH:MM:SS"', () => {
    it('parses "10:00:00" the same as "10:00" (10:00 Riyadh = 07:00 UTC)', () => {
      const nowFn = () => new Date('2026-08-18T07:00:00Z');
      expect(computeHasVisitStarted(null, VISIT_DATE, '10:00:00', nowFn)).toBe(true);
    });
  });

  describe('missing / invalid inputs', () => {
    it('returns false when visitDate is null', () => {
      expect(computeHasVisitStarted(null, null, '10:00')).toBe(false);
    });

    it('returns false when visitTime is null', () => {
      expect(computeHasVisitStarted(null, '2026-08-18', null)).toBe(false);
    });

    it('returns false when visitDate is empty string', () => {
      expect(computeHasVisitStarted(null, '', '10:00')).toBe(false);
    });

    it('returns false when visitTime is empty string', () => {
      expect(computeHasVisitStarted(null, '2026-08-18', '')).toBe(false);
    });

    it('returns false when visitTime is unparseable', () => {
      expect(computeHasVisitStarted(null, '2026-08-18', 'noon')).toBe(false);
    });

    it('returns false when all three inputs are undefined', () => {
      expect(computeHasVisitStarted(undefined, undefined, undefined)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// openEditModal gate — modelled as pure guard logic
// ---------------------------------------------------------------------------
// The component calls openEditModal which returns early when
// (mode === "full" && hasVisitStarted). These tests verify that the predicate
// which drives that guard (computeHasVisitStarted) produces the correct value
// so the gate triggers correctly after the clock advances.
describe('openEditModal gate — guard transitions with clock advance', () => {
  const START_ISO = '2026-09-01T06:00:00.000Z'; // 09:00 Asia/Riyadh
  const startMs = Date.parse(START_ISO);

  it('gate is OPEN (edit allowed) before visit starts', () => {
    const hasStarted = computeHasVisitStarted(
      START_ISO, null, null, () => new Date(startMs - 1),
    );
    // openEditModal proceeds when !hasStarted
    expect(hasStarted).toBe(false);
  });

  it('gate is CLOSED (edit blocked) once visit starts', () => {
    const hasStarted = computeHasVisitStarted(
      START_ISO, null, null, () => new Date(startMs),
    );
    expect(hasStarted).toBe(true);
  });

  it('gate stays CLOSED one full minute after start (post-tick)', () => {
    const hasStarted = computeHasVisitStarted(
      START_ISO, null, null, () => new Date(startMs + 60_000),
    );
    expect(hasStarted).toBe(true);
  });

  it('transitions OPEN → CLOSED when nowFn crosses the boundary (simulates minute tick)', () => {
    const preTick  = () => new Date(startMs - 45_000); // 45 s before start
    const postTick = () => new Date(startMs + 15_000); // 15 s after start

    const beforeTick = computeHasVisitStarted(START_ISO, null, null, preTick);
    const afterTick  = computeHasVisitStarted(START_ISO, null, null, postTick);

    expect(beforeTick).toBe(false); // Edit button shown, modal would open
    expect(afterTick).toBe(true);   // Edit button hidden, modal blocked
  });

  // ── services-only exemption ──────────────────────────────────────────────
  // After check-in, managers can still open the edit panel in services-only
  // mode to set walk-in services. The gate `mode === "full" && hasVisitStarted`
  // must leave the services-only path open even when the visit has started.

  it('services-only mode is EXEMPT — gate is OPEN even after visit starts', () => {
    const hasStarted = computeHasVisitStarted(
      START_ISO, null, null, () => new Date(startMs + 1),
    );
    // Confirm the visit is definitely in the started state.
    expect(hasStarted).toBe(true);

    // Model the component guard: `mode === "full" && hasVisitStarted`.
    // With mode = "services-only" the expression short-circuits to false,
    // meaning openEditModal does NOT return early — the panel opens.
    const mode: 'full' | 'services-only' = 'services-only';
    const gateWouldBlock = mode === 'full' && hasStarted;
    expect(gateWouldBlock).toBe(false);
  });

  it('full mode IS blocked after visit starts — contrast with services-only exemption', () => {
    const hasStarted = computeHasVisitStarted(
      START_ISO, null, null, () => new Date(startMs + 1),
    );
    expect(hasStarted).toBe(true);

    // With mode = "full" both sides of the guard are true — openEditModal returns early.
    const mode: 'full' | 'services-only' = 'full';
    const gateWouldBlock = mode === 'full' && hasStarted;
    expect(gateWouldBlock).toBe(true);
  });
});
