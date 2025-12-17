import { apiConfig } from '@/api/config';
import { get, post } from '@/api/httpClient';
import type {
  CreateSelfValetRequestDto,
  SelfValetRequestDto,
  ListSelfValetRequestsParams,
  SelfValetRequestsResponse,
} from '@/types/api.types';

const { valetSelfService } = apiConfig.endpoints;

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const valetSelfServiceApiService = {
  list: (params?: ListSelfValetRequestsParams): Promise<SelfValetRequestsResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<SelfValetRequestsResponse>(`${valetSelfService.base}${queryString}`);
  },

  getById: (id: string): Promise<SelfValetRequestDto> => {
    return get<SelfValetRequestDto>(valetSelfService.byId(id));
  },

  create: (data: CreateSelfValetRequestDto): Promise<SelfValetRequestDto> => {
    return post<SelfValetRequestDto, CreateSelfValetRequestDto>(valetSelfService.base, data);
  },
};

export default valetSelfServiceApiService;
