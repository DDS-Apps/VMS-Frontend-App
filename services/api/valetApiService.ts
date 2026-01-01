import { get, post, patch, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  ValetDriverDto,
  ValetAssignmentDto,
  CreateValetAssignmentDto,
  UpdateValetAssignmentDto,
  ValetAssignmentStatus,
  ValetTaskDto,
  ValetAdminDriverDto,
  ValetDriverLoadSummaryDto,
  ValetZoneDto,
  AssignValetDriverDto,
  AssignValetDriverResponseDto,
  ListValetTasksParams,
  ListValetAdminDriversParams,
  ValetDriverStatus,
  ValetTaskType,
  DriverTaskDto,
  ListDriverTasksParams,
  UpdateDriverTaskStatusDto,
  UpdateDriverTaskStatusResponseDto,
  ParkingDashboardDto,
} from '@/types/api.types';

const { valet, valetAdmin, valetDriver } = apiConfig.endpoints;

export interface ListValetAssignmentsParams {
  page?: number;
  limit?: number;
  status?: ValetAssignmentStatus;
  driverId?: string;
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

export const valetApiService = {
  createDriver: (data: { userId: string; licenseNumber?: string }): Promise<ValetDriverDto> => {
    return post<ValetDriverDto>(valet.drivers, data);
  },

  listDrivers: (): Promise<ValetDriverDto[]> => {
    return get<ValetDriverDto[]>(valet.drivers);
  },

  getDriver: (id: string): Promise<ValetDriverDto> => {
    return get<ValetDriverDto>(valet.driverById(id));
  },

  updateDriver: (id: string, data: Partial<ValetDriverDto>): Promise<ValetDriverDto> => {
    return patch<ValetDriverDto, Partial<ValetDriverDto>>(valet.driverById(id), data);
  },

  getAvailableDrivers: (): Promise<ValetDriverDto[]> => {
    return get<ValetDriverDto[]>(valet.driversAvailable);
  },

  createAssignment: (data: CreateValetAssignmentDto): Promise<ValetAssignmentDto> => {
    return post<ValetAssignmentDto, CreateValetAssignmentDto>(valet.assignments, data);
  },

  listAssignments: (params?: ListValetAssignmentsParams): Promise<PaginatedResponse<ValetAssignmentDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<ValetAssignmentDto>>(`${valet.assignments}${queryString}`);
  },

  getAssignment: (id: string): Promise<ValetAssignmentDto> => {
    return get<ValetAssignmentDto>(valet.assignmentById(id));
  },

  updateAssignment: (id: string, data: UpdateValetAssignmentDto): Promise<ValetAssignmentDto> => {
    return patch<ValetAssignmentDto, UpdateValetAssignmentDto>(valet.assignmentById(id), data);
  },

  deleteAssignment: (id: string): Promise<void> => {
    return del<void>(valet.assignmentById(id));
  },

  getMyAssignments: (): Promise<ValetAssignmentDto[]> => {
    return get<ValetAssignmentDto[]>(valet.assignmentsMy);
  },

  getTodaysAssignments: (): Promise<ValetAssignmentDto[]> => {
    return get<ValetAssignmentDto[]>(valet.assignmentsToday);
  },

  acceptAssignment: (id: string): Promise<ValetAssignmentDto> => {
    return post<ValetAssignmentDto>(valet.assignmentAccept(id));
  },

  rejectAssignment: (id: string): Promise<ValetAssignmentDto> => {
    return post<ValetAssignmentDto>(valet.assignmentReject(id));
  },

  startAssignment: (id: string): Promise<ValetAssignmentDto> => {
    return post<ValetAssignmentDto>(valet.assignmentStart(id));
  },

  completeAssignment: (id: string, parkedAtLocation?: string): Promise<ValetAssignmentDto> => {
    return post<ValetAssignmentDto, { parkedAtLocation?: string }>(
      valet.assignmentComplete(id),
      { parkedAtLocation }
    );
  },

  // Valet Admin endpoints
  listTasks: (params?: ListValetTasksParams): Promise<{ data: ValetTaskDto[] }> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<{ data: ValetTaskDto[] }>(`${valetAdmin.tasks}${queryString}`);
  },

  assignDriverToTask: (
    taskId: string,
    taskType: ValetTaskType,
    data: AssignValetDriverDto
  ): Promise<AssignValetDriverResponseDto> => {
    return post<AssignValetDriverResponseDto, AssignValetDriverDto>(
      valetAdmin.assignTask(taskId, taskType),
      data
    );
  },

  listAdminDrivers: (params?: ListValetAdminDriversParams): Promise<{ data: ValetAdminDriverDto[] }> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<{ data: ValetAdminDriverDto[] }>(`${valetAdmin.drivers}${queryString}`);
  },

  getDriverLoadSummary: (): Promise<ValetDriverLoadSummaryDto> => {
    return get<ValetDriverLoadSummaryDto>(valetAdmin.driversLoad);
  },

  listZones: (): Promise<{ data: ValetZoneDto[] }> => {
    return get<{ data: ValetZoneDto[] }>(valetAdmin.zones);
  },

  getParkingDashboard: (): Promise<ParkingDashboardDto> => {
    return get<ParkingDashboardDto>(valetAdmin.parkingDashboard);
  },

  // Valet Driver endpoints
  getMyTasks: (params?: ListDriverTasksParams): Promise<{ data: DriverTaskDto[] }> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<{ data: DriverTaskDto[] }>(`${valetDriver.myTasks}${queryString}`);
  },

  getDriverTaskDetail: (taskId: string): Promise<DriverTaskDto> => {
    return get<DriverTaskDto>(valetDriver.taskById(taskId));
  },

  updateDriverTaskStatus: (
    taskId: string,
    data: UpdateDriverTaskStatusDto
  ): Promise<UpdateDriverTaskStatusResponseDto> => {
    return patch<UpdateDriverTaskStatusResponseDto, UpdateDriverTaskStatusDto>(
      valetDriver.taskStatus(taskId),
      data
    );
  },
};

export default valetApiService;
