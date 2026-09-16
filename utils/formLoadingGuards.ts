/**
 * Pure predicates for submit-while-loading guards in VisitorRequestFormScreen.
 *
 * Extracting these from the component lets tests import and exercise the exact
 * production logic — so a refactor that accidentally removes a guard causes the
 * tests to fail rather than silently pass.
 */

/**
 * Returns true when the room-availability check has completed (data arrived or
 * an error was returned) and neither loading nor fetching flags are set.
 *
 * Used in both the submit-button `disabled` expression and `validateForm`.
 */
export function computeHasCheckedAvailability(
  roomAvailability: unknown,
  isRoomsError: boolean,
  isLoadingRooms: boolean,
  isFetchingRooms: boolean,
): boolean {
  return (
    (roomAvailability !== undefined || isRoomsError) &&
    !isLoadingRooms &&
    !isFetchingRooms
  );
}

/**
 * Returns true when at least one mandatory async query is still in-flight and
 * the submit button should therefore be disabled.
 *
 * Covers:
 *  - Walk-in host-employee list  (isLoadingUsers)
 *  - Meeting-room availability   (isLoadingRooms / isFetchingRooms)
 */
export function isSubmitDisabledByLoading(opts: {
  isWalkIn: boolean;
  isLoadingUsers: boolean;
  needsMeetingRoom: boolean;
  isLoadingRooms: boolean;
  isFetchingRooms: boolean;
}): boolean {
  return (
    (opts.isWalkIn && opts.isLoadingUsers) ||
    (opts.needsMeetingRoom && (opts.isLoadingRooms || opts.isFetchingRooms))
  );
}

/**
 * Returns true when the walk-in employee-list query is still loading.
 *
 * `validateForm` sets a `hostEmployee` error when this returns true so that a
 * programmatic submit cannot bypass the loading state even if the button is
 * somehow enabled.
 */
export function isEmployeeListStillLoading(
  isWalkIn: boolean,
  isLoadingUsers: boolean,
): boolean {
  return isWalkIn === true && isLoadingUsers;
}

/**
 * Returns true when the room-availability query has been fired but has not yet
 * completed.
 *
 * `validateForm` sets a `roomAvailability` error when this returns true so that
 * a programmatic submit cannot bypass the loading state.
 */
export function isRoomAvailabilityStillLoading(opts: {
  /** Skip room checks entirely for walk-in registrations. */
  isWalkIn: boolean;
  needsMeetingRoom: boolean;
  /** Pass true when roomAvailabilityParams !== null (query has been fired). */
  roomAvailabilityParamsFired: boolean;
  hasCheckedAvailability: boolean;
}): boolean {
  if (opts.isWalkIn) return false;
  if (!opts.needsMeetingRoom) return false;
  if (!opts.roomAvailabilityParamsFired) return false;
  return !opts.hasCheckedAvailability;
}
