import { get, post } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  GateAccessLogDto,
  VerifyGateAccessDto,
  GateVerificationResponse,
  GateConfigDto,
  GateStatsDto,
} from '@/types/api.types';

const { gates } = apiConfig.endpoints;

export interface ListGateLogsParams {
  page?: number;
  limit?: number;
  gateId?: string;
  startDate?: string;
  endDate?: string;
}

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

export const gateApiService = {
  getConfig: (): Promise<GateConfigDto> => {
    return get<GateConfigDto>(gates.config);
  },

  verify: (data: VerifyGateAccessDto): Promise<GateVerificationResponse> => {
    return post<GateVerificationResponse, VerifyGateAccessDto>(gates.verify, data);
  },

  listLogs: (params?: ListGateLogsParams): Promise<PaginatedResponse<GateAccessLogDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<GateAccessLogDto>>(`${gates.logs}${queryString}`);
  },

  getTodaysLogs: (): Promise<GateAccessLogDto[]> => {
    return get<GateAccessLogDto[]>(gates.logsToday);
  },

  getStats: (startDate: string, endDate: string): Promise<GateStatsDto> => {
    return get<GateStatsDto>(`${gates.stats}?startDate=${startDate}&endDate=${endDate}`);
  },
};

export default gateApiService;
