import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { VisitMovementHistory } from '@/types/api.types';
import { httpErrorStatus, type QrAccessSource } from '@/utils/qrAccess';
import { qrPollingInterval } from '@/utils/movementPolling';

/** Separate permission boundary: a 403 here must not discard the visit detail. */
export function useVisitMovementHistory(id: string, source: QrAccessSource | undefined, active: boolean) {
  return useQuery<VisitMovementHistory>({
    queryKey: ['requests', 'movement-history', id],
    queryFn: async ({ signal }) => {
      const history = await get<VisitMovementHistory>(
        `${apiConfig.endpoints.visits.byId(id)}/movement-history`, undefined, { signal },
      );
      // An undocumented envelope must fail explicitly, never crash the timeline
      // or silently drop validity metadata while treating access as valid.
      if (!history || !Array.isArray(history.data) || typeof history.timezone !== 'string' ||
          !history.data.every(event => event && typeof event.id === 'string' &&
            typeof event.occurredAt === 'string' && typeof event.eventType === 'string')) {
        throw new Error('Unsupported movement-history response');
      }
      return history;
    },
    enabled: active && !!id && !!source,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: query => ![403, 410].includes(httpErrorStatus(query.state.error) ?? 0),
    refetchOnReconnect: query => ![403, 410].includes(httpErrorStatus(query.state.error) ?? 0),
    refetchInterval: query => active ? qrPollingInterval(source, query.state.error) : false,
    refetchIntervalInBackground: false,
  });
}
