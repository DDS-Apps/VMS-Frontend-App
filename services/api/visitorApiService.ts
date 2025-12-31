import { get, post, patch } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  VisitorDto,
  CreateVisitorDto,
  UpdateVisitorDto,
} from '@/types/api.types';

const { visitors } = apiConfig.endpoints;

export interface ListVisitorsParams {
  page?: number;
  limit?: number;
  search?: string;
  isBlacklisted?: boolean;
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

export const visitorApiService = {
  list: (params?: ListVisitorsParams): Promise<PaginatedResponse<VisitorDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<VisitorDto>>(`${visitors.base}${queryString}`);
  },

  getById: (id: string): Promise<VisitorDto> => {
    return get<VisitorDto>(visitors.byId(id));
  },

  create: (data: CreateVisitorDto): Promise<VisitorDto> => {
    return post<VisitorDto, CreateVisitorDto>(visitors.base, data);
  },

  update: (id: string, data: UpdateVisitorDto): Promise<VisitorDto> => {
    return patch<VisitorDto, UpdateVisitorDto>(visitors.byId(id), data);
  },

  getBlacklisted: (): Promise<VisitorDto[]> => {
    return get<VisitorDto[]>(visitors.blacklisted);
  },

  blacklist: (
    id: string,
    isBlacklisted: boolean,
    reason?: string
  ): Promise<VisitorDto> => {
    return patch<VisitorDto, { isBlacklisted: boolean; reason?: string }>(
      visitors.blacklist(id),
      { isBlacklisted, reason }
    );
  },
};

export default visitorApiService;
