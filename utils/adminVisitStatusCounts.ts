import type { VisitListResponse } from '@/types/api.types';
import type { UnifiedStatus } from '@/hooks/queries/useAllRequestsQuery';

export type VisitStatusCounts = Record<UnifiedStatus, number>;

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

/** Pure calculation: never initiates a request or counts a partial list as complete. */
export function getAdminVisitStatusCounts(
  pages: VisitListResponse[] | undefined,
  hasNextPage: boolean,
): VisitStatusCounts | null {
  const first = pages?.[0];
  if (!first) return null;
  const total = first.pagination?.total;
  if (!Number.isSafeInteger(total) || total < 0) return null;
  const keys = Object.keys(emptyCounts()) as UnifiedStatus[];
  const aggregate = first.statusCounts;
  if (aggregate && keys.every(key =>
    Number.isSafeInteger(aggregate[key]) && aggregate[key] >= 0,
  ) && keys.reduce((sum, key) => sum + aggregate[key], 0) === total) {
    return Object.fromEntries(keys.map(key => [key, aggregate[key]])) as VisitStatusCounts;
  }
  if (hasNextPage) return null;
  const visits = new Map(pages.flatMap(page => page.data).map(visit => [visit.id, visit]));
  if (visits.size !== total) return null;
  const counts = emptyCounts();
  for (const visit of visits.values()) counts[normalizeVisitStatus(visit.status)]++;
  return counts;
}