/**
 * Version 1 means latest-IN/latest-OUT, NOT first arrival.
 * Never reinterpret latestCheckInAt or use this for current-presence decisions.
 * Proposed first-IN contract: docs/first-arrival-last-departure-backend-handoff.md.
 */
export interface MovementSummary {
  version: 1;
  latestCheckInAt: string | null;
  latestCheckOutAt: string | null;
}

export interface MovementSummaryMetadata {
  movementSummaryAvailability?: 'restricted' | 'unavailable';
  movementSummaryError?: string;
}
