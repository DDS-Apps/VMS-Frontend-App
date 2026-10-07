import type { QueryClient } from '@tanstack/react-query';
import { MOVEMENT_SUMMARY_ENABLED } from '@/constants/movementSummary';

/** Refresh existing active lists only; never fetch a new role or per-row detail. */
export function invalidateMovementSummaries(client: QueryClient) {
  if (!MOVEMENT_SUMMARY_ENABLED) return;
  return client.invalidateQueries({
    predicate: query => {
      const [root, group] = query.queryKey;
      return (root === 'requests' && ['visits', 'reception-requests'].includes(String(group))) ||
        (root === 'security' && group === 'visitors') ||
        (root === 'reception' && ['today', 'search'].includes(String(group))) ||
        (root === 'all-requests' && group === 'visits') ||
        (root === 'valetAdmin' && group === 'parkingDashboard');
    },
    refetchType: 'active',
  });
}
