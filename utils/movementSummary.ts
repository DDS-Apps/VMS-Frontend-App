import type { MovementSummary, MovementSummaryMetadata } from '@/types/movementSummary';

export interface MovementSummarySource extends MovementSummaryMetadata {
  movementSummary?: MovementSummary;
  timezone?: string;
}

function validTimestamp(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.exec(value);
  if (!parts || !Number.isFinite(Date.parse(value))) return false;
  const [, y, m, d, h, min, sec] = parts.map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return m >= 1 && m <= 12 && d >= 1 && d <= days && h < 24 && min < 60 && sec < 60;
}

/** Availability wins over contradictory data, especially restricted responses. */
export function readMovementDisplay(source: MovementSummarySource) {
  if (!source || typeof source !== 'object') return { state: 'malformed' as const };
  if (source.movementSummaryAvailability === 'restricted') return { state: 'restricted' as const };
  if (source.movementSummaryAvailability === 'unavailable') return { state: 'temporarily-unavailable' as const };
  if (source.movementSummaryAvailability !== undefined) return { state: 'malformed' as const };
  if (source.movementSummary === undefined) return { state: 'unsupported' as const };
  const value = source.movementSummary;
  if (value && typeof value === 'object' && typeof value.version === 'number' && value.version !== 1) {
    return { state: 'unsupported-version' as const };
  }
  const result = readMovementSummary(value);
  return result.state === 'supported' ? result : { state: 'malformed' as const };
}

const reported = new Set<string>();
/** Bounded diagnostics: never log payloads, identifiers, timestamps or server errors. */
export function reportMovementDisplayIssue(state: ReturnType<typeof readMovementDisplay>['state']) {
  if (!['malformed', 'unsupported-version', 'unsupported'].includes(state) || reported.has(state)) return;
  reported.add(state);
  console.warn(`[movement-summary] ${state}`);
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
