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
    queryFn: ({ signal }) => get<VisitMovementHistory>(
      `${apiConfig.endpoints.visits.byId(id)}/movement-history`, undefined, { signal },
    ),
    enabled: active && !!id && !!source,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: query => ![403, 410].includes(httpErrorStatus(query.state.error) ?? 0),
    refetchOnReconnect: query => ![403, 410].includes(httpErrorStatus(query.state.error) ?? 0),
    refetchInterval: query => active ? qrPollingInterval(source, query.state.error) : false,
    refetchIntervalInBackground: false,
  });
}
