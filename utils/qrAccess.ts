import type { QrAccessFields } from '@/types/qrAccess';

export interface QrAccessSource extends QrAccessFields {
  /** Local query freshness marker, not a backend contract field. */
  accessReadUnavailable?: boolean;
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

export type QrAccessState = 'notActive' | 'valid' | 'retained' | 'expired' | 'revocationPending' | 'unavailable' | 'invalidSchedule';

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
    let hour = Number(match[1]);
    if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    const [year, month, day] = date.split('-').map(Number);
    const desired = Date.UTC(year, month - 1, day, hour, Number(match[2]));
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: source.timezone || 'Asia/Riyadh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    const wallTime = (instant: number) => {
      const parts = formatter.formatToParts(instant);
      const part = (name: string) => Number(parts.find(p => p.type === name)?.value);
      return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'));
    };
    let time = desired;
    for (let attempt = 0; attempt < 3; attempt++) time += desired - wallTime(time);
    return wallTime(time) === desired ? time : undefined;
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
  const validity = source.movementHistory?.qrValidity ?? source.qrValidity;
  if (validity?.expired === true && validity.revocationPending === true) return 'revocationPending';
  if (hasInvalidQrSchedule(source)) return 'invalidSchedule';
  if (validity?.expired === true || validity?.terminal === true || source.isExpired === true || source.movementHistory?.isExpired === true ||
      ['expired', 'cancelled', 'auto_cancelled', 'rejected', 'visitor_rejected'].includes(source.status || '')) return 'expired';
  if (source.accessReadUnavailable) return 'unavailable';
  const expires = absoluteTime(validity?.expiresAt ?? source.qrExpiresAt ?? source.expiresAt);
  // Reaching a server-provided cutoff requires a fresh authority read. Do not
  // continue claiming valid access, or fabricate expiry from a local meeting end.
  if (expires !== undefined && now >= expires) return 'unavailable';
  const start = absoluteTime(source.visitStartAt) ??
    scheduledTime(source, source.visitTime || source.scheduledTime || source.startTime);
  if (start === undefined) return 'unavailable';
  if (now < start - 60 * 60_000) return 'notActive';
  const knownValid = validity?.expired === false || source.isExpired === false || source.movementHistory?.isExpired === false ||
    (!!source.qrCode && expires !== undefined && expires > now);
  if (!knownValid) return 'unavailable';
  const end = scheduledTime(source, source.endTime);
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
