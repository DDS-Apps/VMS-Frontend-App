/**
 * Enabled by the supplied revised V1 display handoff.
 * latestCheckInAt means FIRST arrival (legacy wire name); latestCheckOutAt
 * means latest departure, retained across re-entry.
 * Missing/invalid summaries stay unavailable; never use operational fallbacks.
 * Source fixtures do not establish serving-backend or published-build readiness.
 */
export const MOVEMENT_SUMMARY_ENABLED = true;
