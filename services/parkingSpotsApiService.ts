import { apiConfig } from '@/api/config';
import { get, post, put, del } from '@/api/httpClient';
import type {
  ParkingSpotDto,
  CreateParkingSpotDto,
  UpdateParkingSpotDto,
  ListParkingSpotsParams,
  ParkingSpotsResponse,
} from '@/types/parkingSpots.types';

const { parking } = apiConfig.endpoints;

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

export const parkingSpotsApiService = {
  list: async (params?: ListParkingSpotsParams): Promise<ParkingSpotsResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    const url = `${parking.spots}${queryString}`;
    return get<ParkingSpotsResponse>(url);
  },

  getById: async (id: string): Promise<ParkingSpotDto> => {
    return get<ParkingSpotDto>(parking.spotById(id));
  },

  create: async (data: CreateParkingSpotDto): Promise<ParkingSpotDto> => {
    return post<ParkingSpotDto, CreateParkingSpotDto>(parking.spots, data);
  },

  update: async (id: string, data: UpdateParkingSpotDto): Promise<ParkingSpotDto> => {
    return put<ParkingSpotDto, UpdateParkingSpotDto>(parking.spotById(id), data);
  },

  delete: async (id: string): Promise<void> => {
    return del<void>(parking.spotById(id));
  },
};

export default parkingSpotsApiService;
