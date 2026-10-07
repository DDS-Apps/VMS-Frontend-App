/** Additive read-only historical summary; never use for current-presence decisions. */
export interface MovementSummary {
  version: 1;
  latestCheckInAt: string | null;
  latestCheckOutAt: string | null;
}

export interface MovementSummaryMetadata {
  movementSummaryAvailability?: 'restricted' | 'unavailable';
  movementSummaryError?: string;
}
