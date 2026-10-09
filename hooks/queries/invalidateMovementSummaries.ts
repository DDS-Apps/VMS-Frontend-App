import type { Query, QueryClient } from '@tanstack/react-query';
import { MOVEMENT_SUMMARY_ENABLED } from '@/constants/movementSummary';

export function isMovementSummaryQuery(query: { queryKey: readonly unknown[] }) {
  const [root, group] = query.queryKey;
  return (root === 'requests' && ['visits', 'reception-requests', 'visit-detail', 'pending-approvals', 'awaiting-visitor', 'pending-host-walk-ins'].includes(String(group))) ||
    (root === 'security' && ['visitors', 'visitor', 'today', 'on-site'].includes(String(group))) ||
    (root === 'reception' && ['today', 'search'].includes(String(group))) ||
    (root === 'all-requests' && group === 'visits') ||
    root === 'approval-history' ||
    (root === 'valetAdmin' && group === 'parkingDashboard');
}

const refreshes = new WeakMap<Query, { again: boolean; promise: Promise<void> }>();

/** A pre-action read must settle before the canonical post-action read starts.
 * Some services share transport GETs without consuming React Query's AbortSignal:
 * cancelling only the query could still let the replacement join the old HTTP read.
 */
function refreshAfterPendingRead(client: QueryClient, query: Query): Promise<void> {
  const pending = refreshes.get(query);
  if (pending) {
    pending.again = true;
    return pending.promise;
  }
  const entry = { again: false, promise: Promise.resolve() };
  refreshes.set(query, entry);
  entry.promise = (async () => {
    try {
      if (query.state.fetchStatus !== 'idle' && query.promise) {
        await query.promise.catch(() => undefined);
      }
      do {
        entry.again = false;
        // Logout/cache removal must not recreate another session's queries.
        if (client.getQueryCache().get(query.queryHash) !== query) return;
        // Exact invalidation retains inactive data without fetching it, and leaves
        // failed refreshes attached to the existing row/filter/page state.
        await client.invalidateQueries({
          queryKey: query.queryKey, exact: true, refetchType: 'active',
        }, { cancelRefetch: false });
      } while (entry.again);
    } finally {
      // Remove ownership before resolving, so a new signal cannot join a
      // completed queue during a separate Promise.finally microtask.
      refreshes.delete(query);
    }
  })();
  return entry.promise;
}

/** Refresh existing active lists/details only; no new role or per-row detail fetch. */
export function refreshMovementRecords(client: QueryClient) {
  void client.invalidateQueries({
    predicate: isMovementSummaryQuery,
    refetchType: 'none',
  });
  return Promise.all(client.getQueryCache().findAll({
    predicate: isMovementSummaryQuery, type: 'active',
  }).map(query => refreshAfterPendingRead(client, query)));
}

/** Background summary refresh remains gated; committed actions must refresh
 * canonical records even when the historical-summary display is disabled.
 */
export function invalidateMovementSummaries(client: QueryClient) {
  if (!MOVEMENT_SUMMARY_ENABLED) return;
  return refreshMovementRecords(client);
}
