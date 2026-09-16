/**
 * visitStartGuard.ts
 *
 * Pure helper that determines whether a visit's start time has passed.
 * Extracted from RequestDetailsScreen so it can be unit-tested independently
 * of React rendering, context providers, and real timers.
 *
 * The injectable `nowFn` parameter lets tests freeze / advance the clock
 * without touching process.env.TZ or real Date.now().
 */

import { getServerDateParts } from './dateTimeUtils';

/**
 * Returns true when the visit start time is in the past (or right now).
 *
 * Resolution order:
 *  1. `visitStartAt` ISO string  – absolute, unambiguous, preferred.
 *  2. `visitDate` (YYYY-MM-DD) + `visitTime` (HH:MM[:SS] or H:MM AM/PM),
 *     compared against Asia/Riyadh wall-clock time so that Riyadh-local
 *     booking times are never mis-classified by device timezone differences.
 *
 * @param visitStartAt - ISO 8601 absolute timestamp (e.g. "2026-08-18T07:00:00Z")
 * @param visitDate    - Local date string "YYYY-MM-DD"
 * @param visitTime    - Local time string "HH:MM", "HH:MM:SS", or "H:MM AM/PM"
 * @param nowFn        - Injectable clock; defaults to `() => new Date()`.
 *                       Pass a stub in tests to simulate clock advance.
 */
export function computeHasVisitStarted(
  visitStartAt: string | null | undefined,
  visitDate: string | null | undefined,
  visitTime: string | null | undefined,
  nowFn: () => Date = () => new Date(),
): boolean {
  const now = nowFn();

  // ── Primary path: ISO absolute timestamp ──────────────────────────────────
  if (visitStartAt) {
    try {
      const startMs = Date.parse(visitStartAt);
      if (!isNaN(startMs)) {
        return startMs <= now.getTime();
      }
    } catch {
      // fall through to string-comparison path
    }
  }

  // ── Fallback: date + time strings, compared in Asia/Riyadh ───────────────
  if (!visitDate || !visitTime) return false;

  try {
    const { year, month, day, hours: rh, minutes: rm } = getServerDateParts(now, 'Asia/Riyadh');
    const nowKey =
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` +
      `T${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;

    // Parse visitTime — support "HH:MM[:SS]" and "H:MM AM/PM" formats.
    let h24 = -1;
    let mm = -1;

    const ampmMatch = visitTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      const hh = parseInt(ampmMatch[1], 10);
      mm = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[3].toUpperCase();
      h24 = period === 'AM' ? (hh === 12 ? 0 : hh) : (hh === 12 ? 12 : hh + 12);
    } else {
      const hhmm = visitTime.match(/^(\d{1,2}):(\d{2})/);
      if (hhmm) {
        h24 = parseInt(hhmm[1], 10);
        mm = parseInt(hhmm[2], 10);
      }
    }

    if (h24 < 0 || mm < 0) return false;

    const visitKey =
      `${visitDate}T${String(h24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    return visitKey <= nowKey;
  } catch {
    return false;
  }
}
