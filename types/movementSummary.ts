/**
 * Revised backend V1 contract: latestCheckInAt is FIRST physical arrival,
 * including parking. The legacy wire name is deliberately retained.
 * latestCheckOutAt is the latest physical departure, retained across re-entry.
 * Historical display only: never use this pair for current-presence decisions.
 * Older V1 deployments used latest-IN, so version alone cannot prove readiness.
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
