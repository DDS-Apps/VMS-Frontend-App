/**
 * Resolves the only parking state that may be shown to end users.
 * Operational allocation data is intentionally a last-resort compatibility
 * signal; an API decision or request flag always takes precedence.
 */
export type ParkingDisplayDecision = 'required' | 'not_required';

export interface ParkingDecisionInput {
  parkingDecision?: unknown;
  visitorNeedsParking?: boolean | null;
  isVisitorNeedsParking?: boolean | null;
  hasParking?: boolean | null;
  /** Legacy-only fallback when no decision or boolean flag was supplied. */
  hasParkingAllocation?: boolean;
}

export const resolveParkingDisplayDecision = ({
  parkingDecision,
  visitorNeedsParking,
  isVisitorNeedsParking,
  hasParking,
  hasParkingAllocation = false,
}: ParkingDecisionInput): ParkingDisplayDecision => {
  if (typeof parkingDecision === 'string') {
    const decision = parkingDecision.trim().toLowerCase();
    if (['required', 'needs_parking', 'parking_required', 'yes', 'true'].includes(decision)) {
      return 'required';
    }
    if (['not_required', 'no_parking', 'parking_not_required', 'none', 'no', 'false'].includes(decision)) {
      return 'not_required';
    }
  }

  const flags = [visitorNeedsParking, isVisitorNeedsParking, hasParking];
  if (flags.some((flag) => flag === true)) return 'required';
  if (flags.some((flag) => flag === false)) return 'not_required';

  return hasParkingAllocation ? 'required' : 'not_required';
};