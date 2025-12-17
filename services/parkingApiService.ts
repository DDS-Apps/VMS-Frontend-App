import { get, post, patch } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  ParkingSpaceDto,
  ParkingAllocationDto,
  CreateParkingSpaceDto,
  UpdateParkingSpaceDto,
  AllocateParkingDto,
  ParkingStatsDto,
  ParkingStatus,
  ParkingLocation,
} from '@/types/api.types';

const { parking } = apiConfig.endpoints;

export interface ListParkingSpacesParams {
  page?: number;
  limit?: number;
  location?: ParkingLocation;
  status?: ParkingStatus;
  isActive?: boolean;
}

export interface ListParkingAllocationsParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
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

export const parkingApiService = {
  createSpace: (data: CreateParkingSpaceDto): Promise<ParkingSpaceDto> => {
    return post<ParkingSpaceDto, CreateParkingSpaceDto>(parking.spaces, data);
  },

  listSpaces: (params?: ListParkingSpacesParams): Promise<PaginatedResponse<ParkingSpaceDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<ParkingSpaceDto>>(`${parking.spaces}${queryString}`);
  },

  getSpace: (id: string): Promise<ParkingSpaceDto> => {
    return get<ParkingSpaceDto>(parking.spaceById(id));
  },

  updateSpace: (id: string, data: UpdateParkingSpaceDto): Promise<ParkingSpaceDto> => {
    return patch<ParkingSpaceDto, UpdateParkingSpaceDto>(parking.spaceById(id), data);
  },

  getAvailableSpaces: (location?: ParkingLocation): Promise<ParkingSpaceDto[]> => {
    const queryString = location ? `?location=${location}` : '';
    return get<ParkingSpaceDto[]>(`${parking.spacesAvailable}${queryString}`);
  },

  autoAllocate: (data: AllocateParkingDto): Promise<ParkingAllocationDto> => {
    return post<ParkingAllocationDto, AllocateParkingDto>(parking.allocateAuto, data);
  },

  manualAllocate: (spaceId: string, data: AllocateParkingDto): Promise<ParkingAllocationDto> => {
    return post<ParkingAllocationDto, AllocateParkingDto>(parking.allocateToSpace(spaceId), data);
  },

  listAllocations: (params?: ListParkingAllocationsParams): Promise<PaginatedResponse<ParkingAllocationDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<ParkingAllocationDto>>(`${parking.allocations}${queryString}`);
  },

  checkIn: (allocationId: string): Promise<ParkingAllocationDto> => {
    return post<ParkingAllocationDto>(parking.allocationCheckIn(allocationId));
  },

  checkOut: (allocationId: string): Promise<ParkingAllocationDto> => {
    return post<ParkingAllocationDto>(parking.allocationCheckOut(allocationId));
  },

  release: (allocationId: string): Promise<void> => {
    return post<void>(parking.allocationRelease(allocationId));
  },

  getStats: (): Promise<ParkingStatsDto> => {
    return get<ParkingStatsDto>(parking.stats);
  },
};

export default parkingApiService;
