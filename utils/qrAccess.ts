import type { QrAccessFields } from '@/types/qrAccess';
import { parseServerDateTimeStrings } from './dateTimeUtils';

export interface QrAccessSource extends QrAccessFields {
  status?: string;
  qrCode?: string | null;
  expiresAt?: string;
  visitStartAt?: string;
  visitDate?: string;
  visitTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  startTime?: string;
  endTime?: string | null;
  timezone?: string;
  movementHistory?: QrAccessFields;
}

export type QrAccessState = 'notActive' | 'valid' | 'retained' | 'expired' | 'unavailable' | 'invalidSchedule';

/** Reject ambiguous/invalid timestamps instead of falling back to the device clock. */
export function absoluteTime(value?: string | null): number | undefined {
  if (!value || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

function scheduledTime(source: QrAccessSource, value?: string | null): number | undefined {
  const absolute = absoluteTime(value);
  if (absolute !== undefined) return absolute;
  const date = source.visitDate || source.scheduledDate;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !value) return undefined;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match || Number(match[2]) > 59 || Number(match[1]) > (match[3] ? 12 : 23) ||
      (match[3] && Number(match[1]) < 1)) return undefined;
  const calendarDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) return undefined;
  try {
    const time = parseServerDateTimeStrings(date, value.toUpperCase(), source.timezone || 'Asia/Riyadh').getTime();
    return Number.isFinite(time) ? time : undefined;
  } catch {
    return undefined;
  }
}

export function hasInvalidQrSchedule(source: QrAccessSource): boolean {
  return source.scheduleWarning === 'invalid_legacy_schedule' ||
    source.movementHistory?.scheduleWarning === 'invalid_legacy_schedule';
}

/** A presentation decision, NEVER an authorization check for a gate mutation.
 * Meeting end selects retention copy only. It cannot expire a QR.
 * No undocumented qrValidity activation/revocation properties are interpreted.
 */
export function getQrAccessState(source: QrAccessSource, now = Date.now()): QrAccessState {
  if (hasInvalidQrSchedule(source)) return 'invalidSchedule';
  if (source.isExpired === true || source.movementHistory?.isExpired === true ||
      ['expired', 'cancelled', 'auto_cancelled', 'rejected', 'visitor_rejected'].includes(source.status || '')) return 'expired';
  const expires = absoluteTime(source.qrExpiresAt ?? source.expiresAt);
  // Reaching a server-provided cutoff requires a fresh authority read. Do not
  // continue claiming valid access, or fabricate expiry from a local meeting end.
  if (expires !== undefined && now >= expires) return 'unavailable';
  const start = absoluteTime(source.visitStartAt) ??
    scheduledTime(source, source.visitTime || source.scheduledTime || source.startTime);
  if (start === undefined) return 'unavailable';
  if (now < start - 60 * 60_000) return 'notActive';
  const knownValid = source.isExpired === false || source.movementHistory?.isExpired === false ||
    (!!source.qrCode && expires !== undefined && expires > now);
  if (!knownValid) return 'unavailable';
  const end = scheduledTime(source, source.endTime);
  const validity = source.movementHistory?.qrValidity ?? source.qrValidity;
  if (validity?.retainedUntilCheckout === true && end !== undefined && now >= end) return 'retained';
  return 'valid';
}

export function canDisplayQr(source: QrAccessSource, now = Date.now()): boolean {
  return !!source.qrCode && ['notActive', 'valid', 'retained'].includes(getQrAccessState(source, now));
}

export function httpErrorStatus(error: unknown): number | undefined {
  const candidate = error as { status?: number; response?: { status?: number } } | null;
  return candidate?.response?.status ?? candidate?.status;
}

/** Preserve false and null, and do not collapse missing fields to "valid". */
export function qrAccessFields(source: QrAccessFields): QrAccessFields {
  return {
    isExpired: source.isExpired,
    qrExpiresAt: source.qrExpiresAt,
    qrValidity: source.qrValidity,
    scheduleWarning: source.scheduleWarning,
  };
}
