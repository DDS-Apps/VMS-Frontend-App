import { get, post, patch } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  BuffetLocationDto,
  BuffetStaffDto,
  BuffetRequestDto,
  CreateBuffetRequestDto,
  UpdateBuffetRequestDto,
  BuffetRequestStatus,
  BuffetStaffTaskDto,
  ListBuffetStaffTasksParams,
  UpdateBuffetStaffTaskStatusDto,
  UpdateBuffetStaffTaskStatusResponseDto,
  BuffetAdminTaskDto,
  ListBuffetAdminTasksParams,
  AssignBuffetTaskDto,
  UpdateBuffetAdminTaskStatusDto,
  AssignBuffetTaskResponseDto,
  UpdateBuffetAdminTaskStatusResponseDto,
  BuffetAdminLocationDto,
  BuffetAdminStaffDto,
  BuffetLoadSummaryDto,
  UpdateStaffDutyDto,
  UpdateStaffDutyResponseDto,
} from '@/types/api.types';

const { buffet, buffetStaff, buffetAdmin } = apiConfig.endpoints;

export interface ListBuffetRequestsParams {
  page?: number;
  limit?: number;
  status?: BuffetRequestStatus;
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

export const buffetApiService = {
  createLocation: (data: { name: string; floor?: string; building?: string; capacity?: number }): Promise<BuffetLocationDto> => {
    return post<BuffetLocationDto>(buffet.locations, data);
  },

  listLocations: (): Promise<BuffetLocationDto[]> => {
    return get<BuffetLocationDto[]>(buffet.locations);
  },

  getLocation: (id: string): Promise<BuffetLocationDto> => {
    return get<BuffetLocationDto>(buffet.locationById(id));
  },

  updateLocation: (id: string, data: Partial<BuffetLocationDto>): Promise<BuffetLocationDto> => {
    return patch<BuffetLocationDto, Partial<BuffetLocationDto>>(buffet.locationById(id), data);
  },

  createStaff: (data: { userId: string; buffetLocationId: string }): Promise<BuffetStaffDto> => {
    return post<BuffetStaffDto>(buffet.staff, data);
  },

  listStaff: (): Promise<BuffetStaffDto[]> => {
    return get<BuffetStaffDto[]>(buffet.staff);
  },

  getStaff: (id: string): Promise<BuffetStaffDto> => {
    return get<BuffetStaffDto>(buffet.staffById(id));
  },

  updateStaff: (id: string, data: Partial<BuffetStaffDto>): Promise<BuffetStaffDto> => {
    return patch<BuffetStaffDto, Partial<BuffetStaffDto>>(buffet.staffById(id), data);
  },

  getOnDutyStaff: (): Promise<BuffetStaffDto[]> => {
    return get<BuffetStaffDto[]>(buffet.staffOnDuty);
  },

  createRequest: (data: CreateBuffetRequestDto): Promise<BuffetRequestDto> => {
    return post<BuffetRequestDto, CreateBuffetRequestDto>(buffet.requests, data);
  },

  listRequests: (params?: ListBuffetRequestsParams): Promise<PaginatedResponse<BuffetRequestDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<BuffetRequestDto>>(`${buffet.requests}${queryString}`);
  },

  getRequest: (id: string): Promise<BuffetRequestDto> => {
    return get<BuffetRequestDto>(buffet.requestById(id));
  },

  updateRequest: (id: string, data: UpdateBuffetRequestDto): Promise<BuffetRequestDto> => {
    return patch<BuffetRequestDto, UpdateBuffetRequestDto>(buffet.requestById(id), data);
  },

  handleRequest: (id: string, status: BuffetRequestStatus): Promise<BuffetRequestDto> => {
    return post<BuffetRequestDto, { status: BuffetRequestStatus }>(buffet.requestHandle(id), { status });
  },

  getTodaysRequests: (): Promise<BuffetRequestDto[]> => {
    return get<BuffetRequestDto[]>(buffet.requestsToday);
  },

  getPendingRequests: (): Promise<BuffetRequestDto[]> => {
    return get<BuffetRequestDto[]>(buffet.requestsPending);
  },

  // Buffet Staff endpoints
  getMyBuffetTasks: async (params?: ListBuffetStaffTasksParams): Promise<BuffetStaffTaskDto[]> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    const response = await get<{ success?: boolean; message?: string; data?: { data?: BuffetStaffTaskDto[] } | BuffetStaffTaskDto[] } | BuffetStaffTaskDto[]>(`${buffetStaff.myTasks}${queryString}`);
    
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      if ('data' in response.data && Array.isArray((response.data as { data: BuffetStaffTaskDto[] }).data)) {
        return (response.data as { data: BuffetStaffTaskDto[] }).data;
      }
      return response.data as BuffetStaffTaskDto[];
    }
    if (response?.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as { data: BuffetStaffTaskDto[] }).data || [];
    }
    return [];
  },

  updateBuffetTaskStatus: (
    taskId: string,
    data: UpdateBuffetStaffTaskStatusDto
  ): Promise<UpdateBuffetStaffTaskStatusResponseDto> => {
    return patch<UpdateBuffetStaffTaskStatusResponseDto, UpdateBuffetStaffTaskStatusDto>(
      buffetStaff.taskStatus(taskId),
      data
    );
  },

  // Buffet Admin endpoints
  getBuffetAdminTasks: (params?: ListBuffetAdminTasksParams): Promise<{ data: BuffetAdminTaskDto[] }> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<{ data: BuffetAdminTaskDto[] }>(`${buffetAdmin.tasks}${queryString}`);
  },

  getBuffetAdminTaskById: (id: string): Promise<BuffetAdminTaskDto> => {
    return get<BuffetAdminTaskDto>(buffetAdmin.taskById(id));
  },

  assignBuffetTask: (id: string, data: AssignBuffetTaskDto): Promise<AssignBuffetTaskResponseDto> => {
    return post<AssignBuffetTaskResponseDto, AssignBuffetTaskDto>(buffetAdmin.assignTask(id), data);
  },

  updateBuffetAdminTaskStatus: (id: string, data: UpdateBuffetAdminTaskStatusDto): Promise<UpdateBuffetAdminTaskStatusResponseDto> => {
    return patch<UpdateBuffetAdminTaskStatusResponseDto, UpdateBuffetAdminTaskStatusDto>(buffetAdmin.taskStatus(id), data);
  },

  getBuffetAdminLocations: (): Promise<{ data: BuffetAdminLocationDto[] }> => {
    return get<{ data: BuffetAdminLocationDto[] }>(buffetAdmin.locations);
  },

  getBuffetAdminStaff: (): Promise<{ data: BuffetAdminStaffDto[] }> => {
    return get<{ data: BuffetAdminStaffDto[] }>(buffetAdmin.staff);
  },

  updateStaffDutyStatus: (id: string, data: UpdateStaffDutyDto): Promise<UpdateStaffDutyResponseDto> => {
    return patch<UpdateStaffDutyResponseDto, UpdateStaffDutyDto>(buffetAdmin.staffDuty(id), data);
  },

  getBuffetLoadSummary: (): Promise<BuffetLoadSummaryDto> => {
    return get<BuffetLoadSummaryDto>(buffetAdmin.loadSummary);
  },
};

export default buffetApiService;
