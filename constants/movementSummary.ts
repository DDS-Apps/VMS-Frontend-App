/**
 * Enable only after backend contract fixtures and authenticated QA pass.
 * Revised V1 uses latestCheckInAt for FIRST arrival (legacy wire name).
 * Backend source was not restarted/published at handoff. The old and revised
 * contracts both report version 1; verify the serving build before enabling.
 * Disabled historical columns show Unavailable, never operational timestamps.
 */
export const MOVEMENT_SUMMARY_ENABLED = false;
