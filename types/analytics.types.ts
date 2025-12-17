import type { BaseListParams } from './common.types';

export type ReportType =
  | 'visits_summary'
  | 'visits_by_department'
  | 'visits_by_host'
  | 'visits_by_purpose'
  | 'parking_utilization'
  | 'meeting_room_utilization'
  | 'valet_performance'
  | 'buffet_summary'
  | 'security_logs'
  | 'user_activity';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportRequestDto {
  reportType: ReportType;
  format: ExportFormat;
  startDate: string;
  endDate: string;
  filters?: Record<string, unknown>;
  includeCharts?: boolean;
}

export interface ExportResponse {
  exportId: string;
  status: ExportStatus;
  downloadUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ExportStatusResponse {
  exportId: string;
  status: ExportStatus;
  progress?: number;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ScheduledReportDto {
  name: string;
  reportType: ReportType;
  format: ExportFormat;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone?: string;
  recipients: string[];
  filters?: Record<string, unknown>;
  includeCharts?: boolean;
  isActive?: boolean;
}

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: ReportType;
  format: ExportFormat;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
  recipients: string[];
  filters?: Record<string, unknown>;
  includeCharts: boolean;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  createdBy: string;
}

export interface DepartmentStat {
  name: string;
  count: number;
}

export interface PurposeStat {
  name: string;
  count: number;
}

export interface VisitOverTime {
  date: string;
  count: number;
}

export interface PeakHour {
  hour: number;
  count: number;
}

export interface AnalyticsSummary {
  totalVisits: number;
  totalVisitsChange: number;
  averageVisitDuration: number;
  checkInRate: number;
  noShowRate: number;
  topDepartments: DepartmentStat[];
  topPurposes: PurposeStat[];
  visitsOverTime: VisitOverTime[];
  peakHours: PeakHour[];
}

export interface ListSchedulesParams extends BaseListParams {
  reportType?: ReportType;
  isActive?: boolean;
}
