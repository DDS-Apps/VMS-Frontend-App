import type { MovementSummary } from '@/types/movementSummary';

export interface MovementSummarySource {
  movementSummary?: MovementSummary;
  timezone?: string;
}

function validTimestamp(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    Number.isFinite(Date.parse(value)));
}

export function readMovementSummary(value: unknown):
  | { state: 'legacy' | 'unavailable' }
  | { state: 'supported'; summary: MovementSummary } {
  if (value === undefined) return { state: 'legacy' };
  if (value === null || typeof value !== 'object') return { state: 'unavailable' };
  const candidate = value as Partial<MovementSummary>;
  if (candidate.version !== 1 ||
      !validTimestamp(candidate.latestCheckInAt) ||
      !validTimestamp(candidate.latestCheckOutAt)) return { state: 'unavailable' };
  return { state: 'supported', summary: candidate as MovementSummary };
}

export function formatActualMovement(value: string | null, timezone: string | undefined, rtl: boolean, includeDate = false): string {
  if (value === null) return '—';
  if (!validTimestamp(value)) return '—';
  try {
    return new Intl.DateTimeFormat(rtl ? 'ar-SA' : 'en-US', {
      timeZone: timezone ?? 'Asia/Riyadh',
      hour: 'numeric', minute: '2-digit', hour12: true,
      ...(includeDate ? { year: 'numeric', month: 'short', day: 'numeric' } as const : {}),
    }).format(new Date(value));
  } catch {
    // Do not silently reinterpret a bad server timezone as device-local time.
    return '—';
  }
}
