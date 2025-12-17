import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateApiService, type ListGateLogsParams } from '@/services/gateApiService';
import type {
  GateAccessLogDto,
  VerifyGateAccessDto,
  GateVerificationResponse,
  PaginatedResponse,
  GateConfigDto,
  GateStatsDto,
} from '@/types/api.types';

export const gateKeys = {
  all: ['gates'] as const,
  config: () => [...gateKeys.all, 'config'] as const,
  logs: () => [...gateKeys.all, 'logs'] as const,
  logsList: (params?: ListGateLogsParams) => [...gateKeys.logs(), 'list', params] as const,
  todaysLogs: () => [...gateKeys.logs(), 'today'] as const,
  stats: (startDate: string, endDate: string) => [...gateKeys.all, 'stats', startDate, endDate] as const,
};

export function useGateConfigQuery() {
  return useQuery<GateConfigDto>({
    queryKey: gateKeys.config(),
    queryFn: () => gateApiService.getConfig(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGateLogsQuery(params?: ListGateLogsParams) {
  return useQuery<PaginatedResponse<GateAccessLogDto>>({
    queryKey: gateKeys.logsList(params),
    queryFn: () => gateApiService.listLogs(params),
  });
}

export function useTodaysGateLogsQuery() {
  return useQuery<GateAccessLogDto[]>({
    queryKey: gateKeys.todaysLogs(),
    queryFn: () => gateApiService.getTodaysLogs(),
    staleTime: 30 * 1000,
  });
}

export function useGateStatsQuery(startDate: string, endDate: string, enabled = true) {
  return useQuery<GateStatsDto>({
    queryKey: gateKeys.stats(startDate, endDate),
    queryFn: () => gateApiService.getStats(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
  });
}

export function useVerifyGateAccessMutation() {
  const queryClient = useQueryClient();

  return useMutation<GateVerificationResponse, Error, VerifyGateAccessDto>({
    mutationFn: (data) => gateApiService.verify(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gateKeys.logs() });
    },
  });
}
