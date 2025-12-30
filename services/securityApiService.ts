import { get, post } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type {
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
  VisitListItemDto,
  VisitListResponse,
  VisitDetailsDto,
} from '@/types';

const { security, visitors, visits } = apiConfig.endpoints;

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

function mapVisitToSecurityVisitor(visit: VisitListItemDto): SecurityVisitorDto {
  return {
    id: visit.id,
    visitorName: visit.visitor.fullName,
    visitorEmail: visit.visitor.email || '',
    visitorPhone: visit.visitor.phone,
    visitorCompany: visit.visitor.company,
    hostId: '',
    hostName: visit.employeeName,
    purpose: visit.purpose,
    scheduledDate: visit.visitDate,
    scheduledTime: visit.visitTime,
    status: visit.status as SecurityVisitorDto['status'],
    isBlacklisted: false,
    parkingAssigned: visit.hasParking || false,
  };
}

function mapVisitDetailsToSecurityVisitor(visit: VisitDetailsDto): SecurityVisitorDto {
  return {
    id: visit.id,
    visitorName: visit.visitor?.fullName || '',
    visitorEmail: visit.visitor?.email || '',
    visitorPhone: visit.visitor?.phone,
    visitorCompany: visit.visitor?.company,
    hostId: visit.employeeId || '',
    hostName: visit.employeeName || '',
    hostDepartment: visit.employeeDepartment,
    purpose: visit.purpose || '',
    scheduledDate: visit.visitDate,
    scheduledTime: visit.visitTime,
    status: visit.status as SecurityVisitorDto['status'],
    isBlacklisted: false,
    parkingAssigned: !!visit.parkingAllocation,
    parkingSpot: visit.parkingAllocation?.spotNumber,
    qrCode: visit.qrCode,
  };
}

export interface SecurityVisitorsParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SecurityVisitorsResponse {
  data: SecurityVisitorDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const securityApiService = {
  getVisitors: async (params?: SecurityVisitorsParams): Promise<SecurityVisitorsResponse> => {
    const queryParams: Record<string, unknown> = {
      myRequestsOnly: false,
      ...params,
    };
    const queryString = buildQueryString(queryParams);
    const response = await get<VisitListResponse>(`${visits.base}${queryString}`);
    
    return {
      data: response.data.map(mapVisitToSecurityVisitor),
      pagination: response.pagination,
    };
  },

  getTodayVisitors: async (params?: ListSecurityTodayParams): Promise<SecurityVisitorDto[]> => {
    const today = new Date().toISOString().split('T')[0];
    const queryParams: Record<string, unknown> = {
      startDate: today,
      endDate: today,
      myRequestsOnly: false,
      limit: 100,
      ...params,
    };
    const queryString = buildQueryString(queryParams);
    const response = await get<VisitListResponse>(`${visits.base}${queryString}`);
    
    return response.data.map(mapVisitToSecurityVisitor);
  },

  getTodaySummary: async (): Promise<SecuritySummary> => {
    const today = new Date().toISOString().split('T')[0];
    const queryString = buildQueryString({
      startDate: today,
      endDate: today,
      myRequestsOnly: false,
      limit: 500,
    });
    const response = await get<VisitListResponse>(`${visits.base}${queryString}`);
    
    const statuses = response.data.map(v => v.status);
    const expectedStatuses = ['approved', 'checked_in', 'checked_out'];
    const expectedToday = statuses.filter(s => expectedStatuses.includes(s)).length;
    const checkedIn = statuses.filter(s => s === 'checked_in').length;
    const checkedOut = statuses.filter(s => s === 'checked_out').length;
    
    return {
      expectedToday,
      checkedIn,
      checkedOut,
      currentlyOnSite: checkedIn,
      blockedEntries: 0,
    };
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

  getVisitorDetails: async (visitId: string): Promise<SecurityVisitorDto> => {
    const response = await get<VisitDetailsDto>(visits.byId(visitId));
    return mapVisitDetailsToSecurityVisitor(response);
  },

  getOnSiteVisitors: async (): Promise<SecurityVisitorDto[]> => {
    const today = new Date().toISOString().split('T')[0];
    const queryParams: Record<string, unknown> = {
      startDate: today,
      endDate: today,
      status: 'checked_in',
      myRequestsOnly: false,
      limit: 100,
    };
    const queryString = buildQueryString(queryParams);
    const response = await get<VisitListResponse>(`${visits.base}${queryString}`);
    
    return response.data.map(mapVisitToSecurityVisitor);
  },
};

export default securityApiService;
