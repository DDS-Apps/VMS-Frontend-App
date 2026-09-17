/**
 * In-app API timing log.
 *
 * Every request through the HTTP client records how long it took and how it
 * ended. The most recent samples are kept in memory so slow endpoints can be
 * identified from a running app (dev console, Hermes debugger, or the browser
 * console via `__vmsApiTimings()`), which is the evidence the backend team
 * needs when a screen feels slow.
 */
export type RequestOutcome = 'ok' | 'http_error' | 'timeout' | 'network' | 'cancelled' | 'unknown';
export type RequestEndReason =
  | 'axios_timeout'
  | 'transport_timeout'
  | 'navigation'
  | 'last_subscriber_cancelled'
  | 'session_changed'
  | 'cancelled'
  | 'unknown';

export interface RequestTimingSample {
  method: string;
  /** Query-free path with non-allowlisted segments redacted to `:id`. */
  path: string;
  status: number | null;
  durationMs: number;
  outcome: RequestOutcome;
  /** Safe, normalized reason for a timeout or cancellation, if applicable. */
  reason?: RequestEndReason;
  /** Zero for an initial request; one for the coordinated auth replay. */
  retryAttempt?: number;
  /** Epoch ms when the request finished. */
  finishedAt: number;
}

export interface EndpointTimingSummary {
  method: string;
  path: string;
  count: number;
  errors: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export const MAX_TIMING_SAMPLES = 300;
/** Responses at or above this take long enough to be worth a warning in the log. */
export const SLOW_REQUEST_THRESHOLD_MS = 2000;

/**
 * Only known route literals are retained. Every other path segment is treated
 * as an identifier, rather than trying to guess whether a short opaque value,
 * percent-encoded email, phone number, or future token is safe to log.
 */
const SAFE_ROUTE_SEGMENTS = new Set([
  'api', 'v1', 'health', 'db', 'auth', 'config', 'login', 'azure', 'callback',
  'microsoft', 'refresh', 'logout', 'password', 'forgot-password',
  'reset-password', 'reset-password-with-otp', 'send-otp', 'verify-otp',
  'resend-otp', 'notification-preferences', 'biometric', 'register', 'devices',
  'challenge', 'settings', 'dashboard', 'kpis', 'users', 'me', 'photo',
  'on-vacation', 'by-role', 'team', 'visitors', 'check', 'blacklisted',
  'blacklist', 'invitations', 'today', 'my-upcoming', 'respond', 'check-in',
  'check-out', 'invites', 'accept', 'reject', 'visits', 'rooms', 'availability',
  'approve', 'host-approve', 'host-reject', 'requests', 'my-requests',
  'pending-approvals', 'approvals', 'pending', 'pending-host',
  'awaiting-visitor', 'bulk', 'history', 'notifications', 'unread-count',
  'meeting-rooms', 'available', 'bookings', 'all', 'parking', 'spaces',
  'allocate', 'allocations', 'stats', 'employees', 'release', 'spots',
  'buffet', 'locations', 'staff', 'on-duty', 'buffet-staff', 'tasks', 'status',
  'buffet-admin', 'load-summary', 'valet', 'drivers', 'assignments',
  'valet-admin', 'zones', 'parking-dashboard', 'assign', 'valet-driver',
  'self-service', 'security', 'summary', 'alerts', 'gate', 'scan',
  'gate-logs', 'reception', 'search', 'walk-in', 'communication-override',
  'admin', 'analytics', 'export', 'schedules', 'schedule', 'reminder-rules',
  'send', 'token', 'unregister', 'test',
]);

const samples: RequestTimingSample[] = [];

export function normalizeRequestPath(url: string | undefined): string {
  if (!url) return '(unknown)';
  const withoutQuery = url.split('?')[0].split('#')[0];
  // Configured base URLs are not diagnostic data. Keep only their route so a
  // credential-bearing override can never appear in logs or timing samples.
  let path = withoutQuery;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(withoutQuery)) {
    try {
      path = new URL(withoutQuery).pathname || '/';
    } catch {
      path = '(unknown)';
    }
  }
  return path
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      try {
        const decoded = decodeURIComponent(segment).toLowerCase();
        return SAFE_ROUTE_SEGMENTS.has(decoded) ? decoded : ':id';
      } catch {
        // Malformed percent encodings should never make it to a diagnostic log.
        return ':id';
      }
    })
    .join('/') || '/';
}

export function recordRequestTiming(sample: RequestTimingSample): void {
  samples.push(sample);
  if (samples.length > MAX_TIMING_SAMPLES) {
    samples.splice(0, samples.length - MAX_TIMING_SAMPLES);
  }

  if (sample.durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
    console.warn(
      `[HTTP Slow] ${sample.method} ${sample.path} took ${sample.durationMs}ms ` +
        `(${sample.outcome}${sample.status !== null ? ` ${sample.status}` : ''})`,
    );
  }
}

export function getRequestTimings(): readonly RequestTimingSample[] {
  return samples;
}

export function clearRequestTimings(): void {
  samples.length = 0;
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

/** Per-endpoint percentiles over the retained samples, slowest p95 first. */
export function summarizeRequestTimings(
  source: readonly RequestTimingSample[] = samples,
): EndpointTimingSummary[] {
  const groups = new Map<string, RequestTimingSample[]>();
  for (const sample of source) {
    const key = `${sample.method} ${sample.path}`;
    const group = groups.get(key);
    if (group) {
      group.push(sample);
    } else {
      groups.set(key, [sample]);
    }
  }

  return Array.from(groups.entries())
    .map(([, group]) => {
      const durations = group.map((sample) => sample.durationMs).sort((a, b) => a - b);
      return {
        method: group[0].method,
        path: group[0].path,
        count: group.length,
        errors: group.filter((sample) => sample.outcome !== 'ok').length,
        p50Ms: percentile(durations, 0.5),
        p95Ms: percentile(durations, 0.95),
        maxMs: durations[durations.length - 1],
      };
    })
    .sort((a, b) => b.p95Ms - a.p95Ms);
}

// Convenience hook for inspection from a debugger or the browser console:
//   __vmsApiTimings()        -> per-endpoint summary table data
//   __vmsApiTimings(true)    -> raw samples
const globalScope = globalThis as unknown as Record<string, unknown>;
if (typeof globalScope.__vmsApiTimings !== 'function') {
  globalScope.__vmsApiTimings = (raw?: boolean) =>
    raw ? getRequestTimings().slice() : summarizeRequestTimings();
}
