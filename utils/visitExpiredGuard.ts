/**
 * visitExpiredGuard.ts
 *
 * Pure helper that determines whether a visit's END time has passed.
 * Extracted from RequestDetailsScreen so it can be unit-tested independently
 * of React rendering, context providers, and real timers.
 *
 * The injectable `nowFn` parameter lets tests freeze / advance the clock
 * without touching process.env.TZ or real Date.now().
 *
 * Walk-ins expire only after their Riyadh calendar date has passed because
 * their start/end times are not reliable. Scheduled visits are considered
 * expired only when their END time has passed, not their start time:
 *  1. `endTime` field  +  `visitDate`  — explicit end time, most precise.
 *  2. `visitTime` (start) + `duration` — calculates the end from start + length.
 *  3. `visitDate` end-of-day          — last-resort fallback when no time data.
 */

import { getBusinessDateKey } from "@/utils/dateTimeUtils";

const RIYADH_TIME_ZONE = "Asia/Riyadh";
const RIYADH_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const PENDING_MANAGER_APPROVAL_STATUSES = new Set([
  "pending",
  "pending_approval",
]);

export interface VisitExpirationOptions {
  isWalkIn?: boolean;
  nowFn?: () => Date;
}

/** Pending Host approval is date-only; never apply the Manager end-time rule. */
export function computeIsPendingHostWalkInExpired({
  isWalkIn,
  status,
  visitDate,
  nowFn,
}: {
  isWalkIn?: boolean | null;
  status?: string | null;
  visitDate?: string | null;
  nowFn?: () => Date;
}): boolean {
  return isWalkIn === true && status === "pending_host_approval" &&
    computeIsVisitExpired(visitDate, undefined, undefined, undefined, {
      isWalkIn: true,
      nowFn,
    });
}

export interface PendingApprovalWalkInExpirationInput {
  isWalkIn: boolean | null | undefined;
  status: string | null | undefined;
  visitDate: string | null | undefined;
  visitTime: string | null | undefined;
  endTime: string | null | undefined;
  duration: string | null | undefined;
  nowFn?: () => Date;
}

type PendingApprovalWalkInScheduleInput = Omit<
  PendingApprovalWalkInExpirationInput,
  "nowFn"
>;

function isCanonicalDateKey(dateKey: string): boolean {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

// ---------------------------------------------------------------------------
// Duration string → milliseconds
// Supports ISO 8601 ("PT1H30M", "P1D"), human-readable ("2 hours 10 minutes"),
// and "Full Day" shorthand.
// ---------------------------------------------------------------------------
export function parseDurationToMs(duration: string): number {
  if (!duration) return 60 * 60 * 1000; // default 1 hour

  const s = String(duration).trim();

  if (/full\s*day/i.test(s)) {
    return 24 * 60 * 60 * 1000;
  }

  // ISO 8601 — "PT1H30M", "PT24H", "P1D"
  if (s.startsWith("P")) {
    let total = 0;
    const d = s.match(/(\d+)D/i);
    const h = s.match(/(\d+)H/i);
    const m = s.match(/(\d+)M(?!O)/i); // M but not MO (month)
    if (d) total += parseInt(d[1], 10) * 24 * 60 * 60 * 1000;
    if (h) total += parseInt(h[1], 10) * 60 * 60 * 1000;
    if (m) total += parseInt(m[1], 10) * 60 * 1000;
    return total > 0 ? total : 60 * 60 * 1000;
  }

  // Human-readable — "2 hours 10 minutes", "1.5 hours", "30 minutes"
  let total = 0;
  const dMatch = s.match(/(\d+(?:\.\d+)?)\s*days?/i);
  const hMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:hours?|h\b)/i);
  const mMatch = s.match(/(\d+)\s*(?:minutes?|mins?|m\b)/i);
  if (dMatch) total += parseFloat(dMatch[1]) * 24 * 60 * 60 * 1000;
  if (hMatch) total += parseFloat(hMatch[1]) * 60 * 60 * 1000;
  if (mMatch) total += parseInt(mMatch[1], 10) * 60 * 1000;
  return total > 0 ? total : 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Parse a "YYYY-MM-DD" + "HH:MM[:SS]" / "H:MM AM/PM" / ISO-with-T pair into
// a device-local Date — matching the behaviour of useServerDateTime.parseDateTime.
// ---------------------------------------------------------------------------
function parseDateTimeLocal(dateStr: string, timeStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3) return null;
  const [year, month, day] = parts;

  let hours = 0;
  let minutes = 0;

  if (timeStr) {
    if (timeStr.includes("T")) {
      // Full ISO timestamp — extract hours/minutes in local time
      const iso = new Date(timeStr);
      if (!isNaN(iso.getTime())) {
        hours = iso.getHours();
        minutes = iso.getMinutes();
      }
    } else {
      const m = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
      if (m) {
        hours = parseInt(m[1], 10);
        minutes = parseInt(m[2], 10);
        const period = m[3];
        if (period) {
          if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
          else if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
        }
      }
    }
  }

  const d = new Date(year, month - 1, day, hours, minutes);
  return isNaN(d.getTime()) ? null : d;
}

function parseClockTime(timeStr: string): {
  hours: number;
  minutes: number;
  seconds: number;
} | null {
  const match = timeStr.match(
    /(?:T|\b)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
  );
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  const period = match[4]?.toUpperCase();

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return { hours, minutes, seconds };
}

function parseRiyadhDateTimeMs(dateStr: string, timeStr: string): number | null {
  if (!isCanonicalDateKey(dateStr)) return null;

  if (
    timeStr.includes("T") &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(timeStr.trim())
  ) {
    const timestamp = Date.parse(timeStr);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  const time = parseClockTime(timeStr);
  if (!time) return null;

  const [year, month, day] = dateStr.split("-").map(Number);
  return (
    Date.UTC(
      year,
      month - 1,
      day,
      time.hours,
      time.minutes,
      time.seconds,
    ) - RIYADH_UTC_OFFSET_MS
  );
}

export function isPendingManagerApprovalStatus(
  status: string | null | undefined,
): boolean {
  return !!status && PENDING_MANAGER_APPROVAL_STATUSES.has(status.toLowerCase());
}

/**
 * Returns the exact scheduled end instant for the targeted walk-in workflow.
 * The value is UTC milliseconds even when the API supplies Riyadh wall-clock
 * values.
 */
export function getPendingApprovalWalkInScheduledEndMs({
  isWalkIn,
  status,
  visitDate,
  visitTime,
  endTime,
  duration,
}: PendingApprovalWalkInScheduleInput): number | null {
  if (
    !isWalkIn ||
    !isPendingManagerApprovalStatus(status) ||
    !visitDate
  ) {
    return null;
  }

  try {
    const startMs = visitTime
      ? parseRiyadhDateTimeMs(visitDate, visitTime)
      : null;
    let scheduledEndMs = endTime
      ? parseRiyadhDateTimeMs(visitDate, endTime)
      : null;

    if (
      scheduledEndMs !== null &&
      startMs !== null &&
      scheduledEndMs <= startMs
    ) {
      scheduledEndMs += DAY_MS;
    }

    if (scheduledEndMs === null && startMs !== null && duration) {
      scheduledEndMs = startMs + parseDurationToMs(duration);
    }

    return scheduledEndMs;
  } catch {
    return null;
  }
}

/**
 * Targeted expiration rule for a host-accepted walk-in that is waiting for
 * Manager approval. Other walk-in states continue to use their existing rule.
 */
export function computeIsPendingApprovalWalkInExpired({
  nowFn = () => new Date(),
  ...schedule
}: PendingApprovalWalkInExpirationInput): boolean {
  const scheduledEndMs =
    getPendingApprovalWalkInScheduledEndMs(schedule);
  return scheduledEndMs !== null && scheduledEndMs < nowFn().getTime();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns true when the visit's end time is in the past.
 *
 * @param visitDate  - "YYYY-MM-DD" local date string
 * @param visitTime  - Start time string (HH:MM, HH:MM:SS, or H:MM AM/PM)
 * @param endTime    - End time string (same formats); preferred over duration
 * @param duration   - Duration string (ISO 8601 or human-readable); used when endTime absent
 * @param nowFn      - Injectable clock; defaults to `() => new Date()`.
 *                     Pass a stub in tests to simulate clock advance.
 */
export function computeIsVisitExpired(
  visitDate: string | null | undefined,
  visitTime: string | null | undefined,
  endTime: string | null | undefined,
  duration: string | null | undefined,
  nowOrOptions: (() => Date) | VisitExpirationOptions = () => new Date(),
): boolean {
  if (!visitDate) return false;

  try {
    const options =
      typeof nowOrOptions === "function"
        ? { nowFn: nowOrOptions }
        : nowOrOptions;
    const nowFn = options.nowFn ?? (() => new Date());
    const now = nowFn();

    if (options.isWalkIn) {
      if (!isCanonicalDateKey(visitDate)) return false;
      return visitDate < getBusinessDateKey(now, RIYADH_TIME_ZONE);
    }

    // Priority 1: explicit end time field
    if (endTime && visitDate) {
      const end = parseDateTimeLocal(visitDate, endTime);
      if (end) return end < now;
    }

    // Priority 2: start time + duration
    if (visitTime && duration) {
      const start = parseDateTimeLocal(visitDate, visitTime);
      if (start) {
        const endMs = start.getTime() + parseDurationToMs(duration);
        return endMs < now.getTime();
      }
    }

    // Fallback: end of the visit date (23:59:59)
    const [y, mo, d] = visitDate.split("-").map(Number);
    if (y && mo && d) {
      const endOfDay = new Date(y, mo - 1, d, 23, 59, 59);
      return endOfDay < now;
    }

    return false;
  } catch {
    return false;
  }
}
