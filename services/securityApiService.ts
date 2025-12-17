import { get, post } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type {
  VisitStatus,
  PaginatedResponse,
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
} from '@/types';

const { security, visitors } = apiConfig.endpoints;

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

export const securityApiService = {
  getTodayVisitors: (params?: ListSecurityTodayParams): Promise<SecurityVisitorDto[]> => {
    const queryString = params ? buildQueryString(params as Record<string, unknown>) : '';
    return get<SecurityVisitorDto[]>(`${security.today}${queryString}`);
  },

  getTodaySummary: (): Promise<SecuritySummary> => {
    return get<SecuritySummary>(security.todaySummary);
  },

  getAlerts: (): Promise<SecurityAlert[]> => {
    return get<SecurityAlert[]>(security.alerts);
  },

  markAlertAsRead: (alertId: string): Promise<void> => {
    return post<void>(`${security.alerts}/${alertId}/read`);
  },

  acknowledgeAlert: (alertId: string, notes?: string): Promise<void> => {
    return post<void, { notes?: string }>(`${security.alerts}/${alertId}/acknowledge`, { notes });
  },

  scanQRCode: (qrCode: string): Promise<QRScanResult> => {
    return post<QRScanResult, { qrCode: string }>(security.gate.scan, { qrCode });
  },

  gateCheckIn: (data: GateCheckInDto): Promise<SecurityVisitorDto> => {
    return post<SecurityVisitorDto, GateCheckInDto>(security.gate.checkIn, data);
  },

  gateCheckOut: (data: GateCheckOutDto): Promise<SecurityVisitorDto> => {
    return post<SecurityVisitorDto, GateCheckOutDto>(security.gate.checkOut, data);
  },

  getGateLogs: (params?: ListGateLogsParams): Promise<PaginatedResponse<GateLogEntry>> => {
    const queryString = params ? buildQueryString(params as Record<string, unknown>) : '';
    return get<PaginatedResponse<GateLogEntry>>(`${security.gateLogs}${queryString}`);
  },

  checkBlacklist: (params: { email?: string; phone?: string; idNumber?: string }): Promise<BlacklistCheckResult> => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return get<BlacklistCheckResult>(`${visitors.check}${queryString}`);
  },

  getVisitorDetails: (visitId: string): Promise<SecurityVisitorDto> => {
    return get<SecurityVisitorDto>(`${security.visits}/${visitId}`);
  },

  getOnSiteVisitors: (): Promise<SecurityVisitorDto[]> => {
    return get<SecurityVisitorDto[]>(`${security.today}?status=checked_in`);
  },
};

export default securityApiService;
