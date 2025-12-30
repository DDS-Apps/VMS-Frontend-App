import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { securityApiService } from '@/services/securityApiService';
import type {
  SecurityVisitorDto,
  SecuritySummary,
  SecurityAlert,
  GateLogEntry,
  QRScanResult,
  BlacklistCheckResult,
  GateCheckInDto,
  GateCheckOutDto,
  ListSecurityTodayParams,
  ListGateLogsParams,
  PaginatedResponse,
} from '@/types';
import { ApiError } from '@/api/errors';

export const securityKeys = {
  all: ['security'] as const,
  today: () => [...securityKeys.all, 'today'] as const,
  todayList: (params?: ListSecurityTodayParams) => [...securityKeys.today(), 'list', params] as const,
  todaySummary: () => [...securityKeys.today(), 'summary'] as const,
  alerts: () => [...securityKeys.all, 'alerts'] as const,
  gateLogs: () => [...securityKeys.all, 'gate-logs'] as const,
  gateLogsList: (params?: ListGateLogsParams) => [...securityKeys.gateLogs(), params] as const,
  visitor: (visitId: string) => [...securityKeys.all, 'visitor', visitId] as const,
  onSite: () => [...securityKeys.all, 'on-site'] as const,
  blacklistCheck: (params: { email?: string; phone?: string; idNumber?: string }) =>
    [...securityKeys.all, 'blacklist-check', params] as const,
};

export function useSecurityTodayVisitorsQuery(
  params?: ListSecurityTodayParams,
  options?: Omit<UseQueryOptions<SecurityVisitorDto[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SecurityVisitorDto[], ApiError>({
    queryKey: securityKeys.todayList(params),
    queryFn: () => securityApiService.getTodayVisitors(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

export function useSecuritySummaryQuery(
  options?: Omit<UseQueryOptions<SecuritySummary, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SecuritySummary, ApiError>({
    queryKey: securityKeys.todaySummary(),
    queryFn: () => securityApiService.getTodaySummary(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

export function useSecurityAlertsQuery(
  options?: Omit<UseQueryOptions<SecurityAlert[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SecurityAlert[], ApiError>({
    queryKey: securityKeys.alerts(),
    queryFn: () => securityApiService.getAlerts(),
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000,
    ...options,
  });
}

export function useSecurityGateLogsQuery(
  params?: ListGateLogsParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<GateLogEntry>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<GateLogEntry>, ApiError>({
    queryKey: securityKeys.gateLogsList(params),
    queryFn: () => securityApiService.getGateLogs(params),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useSecurityVisitorQuery(
  visitId: string,
  options?: Omit<UseQueryOptions<SecurityVisitorDto, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SecurityVisitorDto, ApiError>({
    queryKey: securityKeys.visitor(visitId),
    queryFn: () => securityApiService.getVisitorDetails(visitId),
    enabled: !!visitId,
    ...options,
  });
}

export function useOnSiteVisitorsQuery(
  options?: Omit<UseQueryOptions<SecurityVisitorDto[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SecurityVisitorDto[], ApiError>({
    queryKey: securityKeys.onSite(),
    queryFn: () => securityApiService.getOnSiteVisitors(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

export function useBlacklistCheckQuery(
  params: { email?: string; phone?: string; idNumber?: string },
  options?: Omit<UseQueryOptions<BlacklistCheckResult, ApiError>, 'queryKey' | 'queryFn'>
) {
  const hasParams = params.email || params.phone || params.idNumber;
  
  return useQuery<BlacklistCheckResult, ApiError>({
    queryKey: securityKeys.blacklistCheck(params),
    queryFn: () => securityApiService.checkBlacklist(params),
    enabled: !!hasParams,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useMarkSecurityAlertAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (alertId) => securityApiService.markAlertAsRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.alerts() });
    },
  });
}

export function useAcknowledgeSecurityAlertMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { alertId: string; notes?: string }>({
    mutationFn: ({ alertId, notes }) => securityApiService.acknowledgeAlert(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.alerts() });
    },
  });
}

export function useScanQRCodeMutation() {
  return useMutation<QRScanResult, ApiError, string>({
    mutationFn: (qrCode) => securityApiService.scanQRCode(qrCode),
  });
}

export function useGateCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation<SecurityVisitorDto, ApiError, GateCheckInDto>({
    mutationFn: (data) => securityApiService.gateCheckIn(data),
    onSuccess: (data) => {
      queryClient.setQueryData(securityKeys.visitor(data.id), data);
      queryClient.invalidateQueries({ queryKey: securityKeys.today() });
      queryClient.invalidateQueries({ queryKey: securityKeys.onSite() });
      queryClient.invalidateQueries({ queryKey: securityKeys.gateLogs() });
    },
  });
}

export function useGateCheckOutMutation() {
  const queryClient = useQueryClient();

  return useMutation<SecurityVisitorDto, ApiError, GateCheckOutDto>({
    mutationFn: (data) => securityApiService.gateCheckOut(data),
    onSuccess: (data) => {
      queryClient.setQueryData(securityKeys.visitor(data.id), data);
      queryClient.invalidateQueries({ queryKey: securityKeys.today() });
      queryClient.invalidateQueries({ queryKey: securityKeys.onSite() });
      queryClient.invalidateQueries({ queryKey: securityKeys.gateLogs() });
    },
  });
}
