import type { VisitListItemDto, VisitListParams, VisitListResponse } from '@/types/api.types';
import type { UnifiedStatus } from '@/hooks/queries/useAllRequestsQuery';
import { requestApiService } from '@/services/api/requestApiService';

export type VisitStatusCounts = Record<UnifiedStatus, number>;

const PROBE_STATUSES = [
  'pending', 'pending_approval', 'pending_host_approval', 'visitor_pending',
  'approved', 'confirmed', 'accepted', 'visitor_accepted',
  'checked_in', 'in_progress', 'checked_out', 'completed',
  'cancelled', 'auto_cancelled', 'rejected', 'visitor_rejected', 'expired',
  'expected', 'awaiting_visitor', 'waiting_acceptance', 'no_show', 'draft',
] as const;

const emptyCounts = (): VisitStatusCounts => ({
  pending: 0,
  approved: 0,
  in_progress: 0,
  completed: 0,
  cancelled: 0,
  auto_cancelled: 0,
  rejected: 0,
});

export function normalizeVisitStatus(status: string): UnifiedStatus {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'pending_approval':
    case 'pending_host_approval':
    case 'visitor_pending':
      return 'pending';
    case 'approved':
    case 'confirmed':
    case 'accepted':
    case 'visitor_accepted':
      return 'approved';
    case 'checked_in':
    case 'in_progress':
      return 'in_progress';
    case 'checked_out':
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'auto_cancelled':
      return 'auto_cancelled';
    case 'rejected':
    case 'visitor_rejected':
    case 'expired':
      return 'rejected';
    default:
      return 'pending';
  }
}

type FetchVisits = (
  params: VisitListParams,
  options?: { signal?: AbortSignal },
) => Promise<VisitListResponse>;

function validatedTotal(response: VisitListResponse): number {
  const total = Number(response.pagination?.total);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error('Visit status total is unavailable');
  }
  return total;
}

async function countAllPages(
  startDate: string | undefined,
  endDate: string | undefined,
  expectedTotal: number,
  signal: AbortSignal | undefined,
  fetchVisits: FetchVisits,
): Promise<VisitStatusCounts> {
  const params = { startDate, endDate, limit: 100 };
  const first = await fetchVisits({ ...params, page: 1 }, { signal });
  const total = validatedTotal(first);
  if (total !== expectedTotal) {
    throw new Error('Visit totals changed during counting; refresh to retry');
  }
  const totalPages = Number(first.pagination?.totalPages);
  if (!Number.isSafeInteger(totalPages) || totalPages < 0 || (total > 0 && totalPages < 1)) {
    throw new Error('Visit pagination is unavailable');
  }
  const pages: VisitListResponse[] = [first];
  let nextPage = 2;
  await Promise.all(Array.from({ length: Math.min(4, Math.max(0, totalPages - 1)) }, async () => {
    while (nextPage <= totalPages) {
      const page = nextPage++;
      pages[page - 1] = await fetchVisits({ ...params, page }, { signal });
    }
  }));
  const visits = new Map<string, VisitListItemDto>();
  for (const page of pages) {
    if (!Array.isArray(page?.data)) throw new Error('Visit page is incomplete');
    for (const visit of page.data) visits.set(visit.id, visit);
  }
  if (visits.size !== total) throw new Error('Visit totals changed during counting; refresh to retry');
  const counts = emptyCounts();
  for (const visit of visits.values()) counts[normalizeVisitStatus(visit.status)]++;
  return counts;
}

/**
 * Prefer small, status-filtered total requests. If the API ignores a status,
 * rejects a legacy status, or totals don't reconcile, count full pages instead.
 * Never show partial-page counts as complete totals.
 */
export async function fetchAdminVisitStatusCounts(
  { startDate, endDate, expectedTotal, signal }: {
    startDate?: string;
    endDate?: string;
    expectedTotal: number;
    signal?: AbortSignal;
  },
  fetchVisits: FetchVisits = requestApiService.listVisits,
): Promise<VisitStatusCounts> {
  if (expectedTotal === 0) return emptyCounts();
  const counts = emptyCounts();
  let nextStatus = 0;
  let probeFailed = false;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (!probeFailed && nextStatus < PROBE_STATUSES.length) {
      const status = PROBE_STATUSES[nextStatus++];
      try {
        const result = await fetchVisits(
          { status, startDate, endDate, page: 1, limit: 1 },
          { signal },
        );
        const total = validatedTotal(result);
        // A backend that ignores status returns its unfiltered first row.
        if (!Array.isArray(result.data) ||
            (total > 0 && (result.data.length === 0 || result.data.some(visit => visit.status.toLowerCase() !== status)))) {
          probeFailed = true;
          break;
        }
        counts[normalizeVisitStatus(status)] += total;
      } catch {
        probeFailed = true;
      }
    }
  }));
  if (signal?.aborted) throw new Error('Visit count request cancelled');
  const sum = Object.values(counts).reduce((acc, value) => acc + value, 0);
  if (!probeFailed && sum === expectedTotal) return counts;
  return countAllPages(startDate, endDate, expectedTotal, signal, fetchVisits);
}