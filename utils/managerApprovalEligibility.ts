import {
  computeIsPendingApprovalWalkInExpired,
  getPendingApprovalWalkInScheduledEndMs,
  isPendingManagerApprovalStatus,
  parseRiyadhDateTimeMs,
} from "./visitExpiredGuard";

export interface ApprovalSchedule {
  canApprove?: boolean | null;
  status?: string | null;
  isWalkIn?: boolean | null;
  visitDate?: string | null;
  visitTime?: string | null;
  visitStartAt?: string | null;
  endTime?: string | null;
  duration?: string | null;
}

function instant(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/i);
  if (!match || +match[1] > 23 || +match[2] > 59 || +match[3] > 59 ||
      +(match[4] || 0) > 23 || +(match[5] || 0) > 59) return null;
  if (parseRiyadhDateTimeMs(value.slice(0, 10), "00:00") === null) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function durationMs(value?: string | null): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (/^full\s+day$/i.test(normalized)) return 86_400_000;
  const iso = normalized.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  const human = normalized.match(/^(?:(\d+(?:\.\d+)?)\s*days?)?(?:\s*(\d+(?:\.\d+)?)\s*(?:hours?|h))?(?:\s*(\d+)\s*(?:minutes?|mins?|m))?$/i);
  const ms = iso
    ? ((+(iso[1] || 0) * 24 + +(iso[2] || 0)) * 3600 + +(iso[3] || 0) * 60 + +(iso[4] || 0)) * 1000
    : human ? (+(human[1] || 0) * 1440 + +(human[2] || 0) * 60 + +(human[3] || 0)) * 60_000 : 0;
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** Approval only: never use QR validity or a guessed end-of-day deadline. */
export function getManagerApprovalEndMs(schedule?: ApprovalSchedule | null): number | null {
  if (!schedule) return null;
  if (schedule.isWalkIn) {
    return getPendingApprovalWalkInScheduledEndMs({
      ...schedule, isWalkIn: schedule.isWalkIn, status: schedule.status,
      visitDate: schedule.visitDate, visitTime: schedule.visitTime,
      endTime: schedule.endTime, duration: schedule.duration,
    });
  }
  const start = instant(schedule.visitStartAt) ??
    (schedule.visitDate && schedule.visitTime &&
      /^\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?$/i.test(schedule.visitTime.trim())
      ? parseRiyadhDateTimeMs(schedule.visitDate, schedule.visitTime) : null);
  if (schedule.endTime) {
    const end = instant(schedule.endTime) ??
      (schedule.visitDate && /^(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)$/i.test(schedule.endTime.trim())
        ? parseRiyadhDateTimeMs(schedule.visitDate, schedule.endTime) : null);
    // Only a wall-clock end may roll over to the next day.
    if (end === null) return null;
    if (start !== null && end === start) return null;
    if (start !== null && end < start) {
      return instant(schedule.endTime) === null && end + 86_400_000 > start ? end + 86_400_000 : null;
    }
    return end;
  }
  const duration = durationMs(schedule.duration);
  return start !== null && duration !== null ? start + duration : null;
}

export function getManagerApprovalState(schedule?: ApprovalSchedule | null, now = Date.now()):
  "eligible" | "expired" | "unavailable" | "not_pending" {
  if (!schedule || !isPendingManagerApprovalStatus(schedule.status)) return "not_pending";
  if (schedule.isWalkIn) {
    return computeIsPendingApprovalWalkInExpired({
      ...schedule, isWalkIn: schedule.isWalkIn, status: schedule.status,
      visitDate: schedule.visitDate, visitTime: schedule.visitTime,
      endTime: schedule.endTime, duration: schedule.duration,
      nowFn: () => new Date(now),
    }) ? "expired" : schedule.canApprove === false ? "not_pending" : "eligible";
  }
  const end = getManagerApprovalEndMs(schedule);
  return end === null ? "unavailable" : now >= end ? "expired" :
    schedule.canApprove === false ? "not_pending" : "eligible";
}
