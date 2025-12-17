import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { analyticsApiService } from '@/services/analyticsApiService';
import type {
  AnalyticsSummary,
  ExportRequestDto,
  ExportResponse,
  ExportStatusResponse,
  ScheduledReportDto,
  ScheduledReport,
  ListSchedulesParams,
  PaginatedResponse,
} from '@/services/analyticsApiService';
import { ApiError } from '@/api/errors';

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (startDate?: string, endDate?: string) => [...analyticsKeys.all, 'summary', { startDate, endDate }] as const,
  exports: () => [...analyticsKeys.all, 'exports'] as const,
  export: (exportId: string) => [...analyticsKeys.exports(), exportId] as const,
  schedules: () => [...analyticsKeys.all, 'schedules'] as const,
  schedulesList: (params?: ListSchedulesParams) => [...analyticsKeys.schedules(), 'list', params] as const,
  schedule: (scheduleId: string) => [...analyticsKeys.schedules(), scheduleId] as const,
};

export function useAnalyticsSummaryQuery(
  startDate?: string,
  endDate?: string,
  options?: Omit<UseQueryOptions<AnalyticsSummary, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AnalyticsSummary, ApiError>({
    queryKey: analyticsKeys.summary(startDate, endDate),
    queryFn: () => analyticsApiService.getSummary(startDate, endDate),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useExportStatusQuery(
  exportId: string,
  options?: Omit<UseQueryOptions<ExportStatusResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ExportStatusResponse, ApiError>({
    queryKey: analyticsKeys.export(exportId),
    queryFn: () => analyticsApiService.getExportStatus(exportId),
    enabled: !!exportId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 3000;
    },
    ...options,
  });
}

export function useScheduledReportsQuery(
  params?: ListSchedulesParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<ScheduledReport>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<ScheduledReport>, ApiError>({
    queryKey: analyticsKeys.schedulesList(params),
    queryFn: () => analyticsApiService.listScheduledReports(params),
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useScheduledReportQuery(
  scheduleId: string,
  options?: Omit<UseQueryOptions<ScheduledReport, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ScheduledReport, ApiError>({
    queryKey: analyticsKeys.schedule(scheduleId),
    queryFn: () => analyticsApiService.getScheduledReport(scheduleId),
    enabled: !!scheduleId,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useRequestExportMutation() {
  const queryClient = useQueryClient();

  return useMutation<ExportResponse, ApiError, ExportRequestDto>({
    mutationFn: (data) => analyticsApiService.requestExport(data),
    onSuccess: (result) => {
      queryClient.setQueryData(analyticsKeys.export(result.exportId), result);
    },
  });
}

export function useCreateScheduledReportMutation() {
  const queryClient = useQueryClient();

  return useMutation<ScheduledReport, ApiError, ScheduledReportDto>({
    mutationFn: (data) => analyticsApiService.createScheduledReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.schedules() });
    },
  });
}

export function useDeleteScheduledReportMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (scheduleId) => analyticsApiService.deleteScheduledReport(scheduleId),
    onSuccess: (_, scheduleId) => {
      queryClient.removeQueries({ queryKey: analyticsKeys.schedule(scheduleId) });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.schedules() });
    },
  });
}

export function useToggleScheduledReportMutation() {
  const queryClient = useQueryClient();

  return useMutation<ScheduledReport, ApiError, { scheduleId: string; isActive: boolean }>({
    mutationFn: ({ scheduleId, isActive }) => analyticsApiService.toggleScheduledReport(scheduleId, isActive),
    onSuccess: (result) => {
      queryClient.setQueryData(analyticsKeys.schedule(result.id), result);
      queryClient.invalidateQueries({ queryKey: analyticsKeys.schedules() });
    },
  });
}
