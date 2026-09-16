/**
 * Tests for the submit-while-loading guards in VisitorRequestFormScreen.
 *
 * Two kinds of tests live here:
 *
 * 1. WIRING TESTS — verify that VisitorRequestFormScreen actually imports and
 *    calls each guard function from utils/formLoadingGuards. These fail if
 *    someone inlines the logic back into the component (decoupling it from the
 *    tested utility) or deletes a call-site.
 *
 * 2. PREDICATE TESTS — exercise the guard logic itself for every relevant
 *    loading-state scenario. Because the component imports these exact
 *    functions, a predicate failure means the component behaves incorrectly.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  computeHasCheckedAvailability,
  isSubmitDisabledByLoading,
  isEmployeeListStillLoading,
  isRoomAvailabilityStillLoading,
} from '../utils/formLoadingGuards';

// ---------------------------------------------------------------------------
// Wiring tests — prove the component uses the extracted guard functions
// ---------------------------------------------------------------------------
const COMPONENT_PATH = path.resolve(
  __dirname,
  '../screens/Employee/VisitorRequestFormScreen.tsx',
);
const componentSource = fs.readFileSync(COMPONENT_PATH, 'utf8');

describe('VisitorRequestFormScreen — guard function wiring', () => {
  it('imports from @/utils/formLoadingGuards', () => {
    expect(componentSource).toMatch(/from\s+["']@\/utils\/formLoadingGuards["']/);
  });

  it('calls computeHasCheckedAvailability to derive hasCheckedAvailability', () => {
    expect(componentSource).toMatch(/computeHasCheckedAvailability\s*\(/);
  });

  it('calls isSubmitDisabledByLoading in the submit button disabled prop', () => {
    expect(componentSource).toMatch(/isSubmitDisabledByLoading\s*\(\{/);
  });

  it('calls isEmployeeListStillLoading inside validateForm', () => {
    expect(componentSource).toMatch(/isEmployeeListStillLoading\s*\(/);
  });

  it('calls isRoomAvailabilityStillLoading inside validateForm', () => {
    expect(componentSource).toMatch(/isRoomAvailabilityStillLoading\s*\(\{/);
  });
});

// ---------------------------------------------------------------------------
// computeHasCheckedAvailability
// ---------------------------------------------------------------------------
describe('computeHasCheckedAvailability', () => {
  it('returns false while isLoadingRooms is true', () => {
    expect(computeHasCheckedAvailability(undefined, false, true, false)).toBe(false);
  });

  it('returns false while isFetchingRooms is true', () => {
    expect(computeHasCheckedAvailability({ rooms: [] }, false, false, true)).toBe(false);
  });

  it('returns false while both loading flags are true', () => {
    expect(computeHasCheckedAvailability({ rooms: [] }, false, true, true)).toBe(false);
  });

  it('returns true when data has arrived and neither flag is set', () => {
    expect(computeHasCheckedAvailability({ rooms: [] }, false, false, false)).toBe(true);
  });

  it('returns true when isRoomsError is true and loading flags are false', () => {
    expect(computeHasCheckedAvailability(undefined, true, false, false)).toBe(true);
  });

  it('returns false when data is still undefined, no error, and no loading flag set', () => {
    // Query has not fired yet — data is undefined with no error flag
    expect(computeHasCheckedAvailability(undefined, false, false, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSubmitDisabledByLoading — submit button disabled prop
// ---------------------------------------------------------------------------
describe('isSubmitDisabledByLoading', () => {
  const BASE = {
    isWalkIn: false,
    isLoadingUsers: false,
    needsMeetingRoom: false,
    isLoadingRooms: false,
    isFetchingRooms: false,
  };

  describe('walk-in: employee list still loading', () => {
    it('disables submit on walk-in while isLoadingUsers is true', () => {
      expect(isSubmitDisabledByLoading({ ...BASE, isWalkIn: true, isLoadingUsers: true })).toBe(true);
    });

    it('enables submit on walk-in once isLoadingUsers is false', () => {
      expect(isSubmitDisabledByLoading({ ...BASE, isWalkIn: true, isLoadingUsers: false })).toBe(false);
    });

    it('does NOT disable for non-walk-in even if isLoadingUsers is true', () => {
      expect(isSubmitDisabledByLoading({ ...BASE, isWalkIn: false, isLoadingUsers: true })).toBe(false);
    });
  });

  describe('meeting room requested: availability still loading', () => {
    it('disables submit while isLoadingRooms is true', () => {
      expect(isSubmitDisabledByLoading({ ...BASE, needsMeetingRoom: true, isLoadingRooms: true })).toBe(true);
    });

    it('disables submit while isFetchingRooms is true', () => {
      expect(isSubmitDisabledByLoading({ ...BASE, needsMeetingRoom: true, isFetchingRooms: true })).toBe(true);
    });

    it('disables submit while both isLoadingRooms and isFetchingRooms are true', () => {
      expect(
        isSubmitDisabledByLoading({ ...BASE, needsMeetingRoom: true, isLoadingRooms: true, isFetchingRooms: true }),
      ).toBe(true);
    });

    it('does not disable when needsMeetingRoom is false even if loading flags are true', () => {
      expect(
        isSubmitDisabledByLoading({ ...BASE, needsMeetingRoom: false, isLoadingRooms: true, isFetchingRooms: true }),
      ).toBe(false);
    });

    it('returns false when meeting room is requested but loading is complete', () => {
      expect(isSubmitDisabledByLoading({ ...BASE, needsMeetingRoom: true })).toBe(false);
    });
  });

  it('returns false when no loading is in progress', () => {
    expect(isSubmitDisabledByLoading(BASE)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isEmployeeListStillLoading — validateForm hostEmployee guard
// ---------------------------------------------------------------------------
describe('isEmployeeListStillLoading', () => {
  it('returns true on walk-in while users are loading', () => {
    expect(isEmployeeListStillLoading(true, true)).toBe(true);
  });

  it('returns false on walk-in once users have loaded', () => {
    expect(isEmployeeListStillLoading(true, false)).toBe(false);
  });

  it('returns false for non-walk-in even if users are loading', () => {
    expect(isEmployeeListStillLoading(false, true)).toBe(false);
  });

  it('returns false for non-walk-in with no loading', () => {
    expect(isEmployeeListStillLoading(false, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRoomAvailabilityStillLoading — validateForm roomAvailability guard
// ---------------------------------------------------------------------------
describe('isRoomAvailabilityStillLoading', () => {
  const READY_PARAMS = {
    isWalkIn: false,
    needsMeetingRoom: true,
    roomAvailabilityParamsFired: true,
    hasCheckedAvailability: false, // not yet checked → loading
  };

  it('returns true when params have fired but availability has not been checked yet', () => {
    expect(isRoomAvailabilityStillLoading(READY_PARAMS)).toBe(true);
  });

  it('returns false once availability has been checked', () => {
    expect(isRoomAvailabilityStillLoading({ ...READY_PARAMS, hasCheckedAvailability: true })).toBe(false);
  });

  it('returns false when needsMeetingRoom is false', () => {
    expect(isRoomAvailabilityStillLoading({ ...READY_PARAMS, needsMeetingRoom: false })).toBe(false);
  });

  it('returns false when params have not fired yet (date/time not set)', () => {
    expect(
      isRoomAvailabilityStillLoading({ ...READY_PARAMS, roomAvailabilityParamsFired: false }),
    ).toBe(false);
  });

  it('returns false on walk-in (room check is skipped for walk-ins)', () => {
    expect(isRoomAvailabilityStillLoading({ ...READY_PARAMS, isWalkIn: true })).toBe(false);
  });

  it('returns false on walk-in even with all other flags set', () => {
    expect(
      isRoomAvailabilityStillLoading({
        isWalkIn: true,
        needsMeetingRoom: true,
        roomAvailabilityParamsFired: true,
        hasCheckedAvailability: false,
      }),
    ).toBe(false);
  });
});
