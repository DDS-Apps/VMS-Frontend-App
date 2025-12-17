import { get, post, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type {
  ReportType,
  ExportFormat,
  ScheduleFrequency,
  ExportRequestDto,
  ExportResponse,
  ExportStatusResponse,
  ScheduledReportDto,
  ScheduledReport,
  AnalyticsSummary,
  ListSchedulesParams,
  PaginatedResponse,
} from '@/types';

const { admin } = apiConfig.endpoints;

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const analyticsApiService = {
  getSummary: (startDate?: string, endDate?: string): Promise<AnalyticsSummary> => {
    const params: Record<string, unknown> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const queryString = buildQueryString(params);
    return get<AnalyticsSummary>(`${admin.analytics.summary}${queryString}`);
  },

  requestExport: (data: ExportRequestDto): Promise<ExportResponse> => {
    return post<ExportResponse, ExportRequestDto>(admin.analytics.export, data);
  },

  getExportStatus: (exportId: string): Promise<ExportStatusResponse> => {
    return get<ExportStatusResponse>(`${admin.analytics.export}/${exportId}`);
  },

  listScheduledReports: (params?: ListSchedulesParams): Promise<PaginatedResponse<ScheduledReport>> => {
    const queryString = params ? buildQueryString(params as Record<string, unknown>) : '';
    return get<PaginatedResponse<ScheduledReport>>(`${admin.analytics.schedules}${queryString}`);
  },

  createScheduledReport: (data: ScheduledReportDto): Promise<ScheduledReport> => {
    return post<ScheduledReport, ScheduledReportDto>(admin.analytics.schedule, data);
  },

  getScheduledReport: (scheduleId: string): Promise<ScheduledReport> => {
    return get<ScheduledReport>(`${admin.analytics.schedules}/${scheduleId}`);
  },

  deleteScheduledReport: (scheduleId: string): Promise<void> => {
    return del<void>(`${admin.analytics.schedules}/${scheduleId}`);
  },

  toggleScheduledReport: (scheduleId: string, isActive: boolean): Promise<ScheduledReport> => {
    return post<ScheduledReport, { isActive: boolean }>(
      `${admin.analytics.schedules}/${scheduleId}/toggle`,
      { isActive }
    );
  },
};

export default analyticsApiService;
