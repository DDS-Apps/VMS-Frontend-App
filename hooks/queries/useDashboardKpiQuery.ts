import { useCallback } from 'react';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { dashboardApiService } from '@/services/api/dashboardApiService';
import type { DashboardKpiData } from '@/types/api.types';

export const dashboardKpiKeys = {
  all: ['dashboard', 'kpis'] as const,
  byIdentity: (identityKey: string) => [...dashboardKpiKeys.all, identityKey] as const,
};

export function useDashboardKpisQuery(
  identityKey: string | undefined,
  options?: Omit<UseQueryOptions<DashboardKpiData, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<DashboardKpiData, ApiError>({
    queryKey: dashboardKpiKeys.byIdentity(identityKey ?? 'anonymous'),
    queryFn: () => dashboardApiService.getKpis(),
    enabled: Boolean(identityKey),
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
}

export function invalidateDashboardKpis(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: dashboardKpiKeys.all });
}

export function useRefreshDashboardKpis() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.refetchQueries({ queryKey: dashboardKpiKeys.all, type: 'active' }),
    [queryClient],
  );
}