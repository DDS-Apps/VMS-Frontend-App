import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buffetApiService, type ListBuffetRequestsParams } from '@/services/api/buffetApiService';
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
  AssignBuffetTaskResponseDto,
  UpdateBuffetAdminTaskStatusDto,
  UpdateBuffetAdminTaskStatusResponseDto,
  BuffetAdminLocationDto,
  BuffetAdminStaffDto,
  BuffetLoadSummaryDto,
  UpdateStaffDutyDto,
  UpdateStaffDutyResponseDto,
  CreateBuffetAdminLocationDto,
  CreateBuffetAdminLocationResponseDto,
} from '@/types/api.types';

export const buffetKeys = {
  all: ['buffet'] as const,
  locations: () => [...buffetKeys.all, 'locations'] as const,
  locationDetail: (id: string) => [...buffetKeys.locations(), 'detail', id] as const,
  staff: () => [...buffetKeys.all, 'staff'] as const,
  staffDetail: (id: string) => [...buffetKeys.staff(), 'detail', id] as const,
  onDutyStaff: () => [...buffetKeys.staff(), 'on-duty'] as const,
  requests: () => [...buffetKeys.all, 'requests'] as const,
  requestsList: (params?: ListBuffetRequestsParams) => [...buffetKeys.requests(), 'list', params] as const,
  requestDetail: (id: string) => [...buffetKeys.requests(), 'detail', id] as const,
  todaysRequests: () => [...buffetKeys.requests(), 'today'] as const,
  pendingRequests: () => [...buffetKeys.requests(), 'pending'] as const,
  // Buffet Staff keys
  staffTasks: () => [...buffetKeys.all, 'staff-tasks'] as const,
  myTasks: (params?: ListBuffetStaffTasksParams) => [...buffetKeys.staffTasks(), 'my', params] as const,
  // Buffet Admin keys
  adminTasks: () => [...buffetKeys.all, 'admin-tasks'] as const,
  adminTasksList: (params?: ListBuffetAdminTasksParams) => [...buffetKeys.adminTasks(), 'list', params] as const,
  adminTaskDetail: (id: string) => [...buffetKeys.adminTasks(), 'detail', id] as const,
  adminLocations: () => [...buffetKeys.all, 'admin-locations'] as const,
  adminStaff: () => [...buffetKeys.all, 'admin-staff'] as const,
  loadSummary: () => [...buffetKeys.all, 'load-summary'] as const,
};

export function useBuffetLocationsQuery() {
  return useQuery<BuffetLocationDto[]>({
    queryKey: buffetKeys.locations(),
    queryFn: () => buffetApiService.listLocations(),
  });
}

export function useBuffetLocationQuery(id: string, enabled = true) {
  return useQuery<BuffetLocationDto>({
    queryKey: buffetKeys.locationDetail(id),
    queryFn: () => buffetApiService.getLocation(id),
    enabled: enabled && !!id,
  });
}

export function useBuffetStaffQuery() {
  return useQuery<BuffetStaffDto[]>({
    queryKey: buffetKeys.staff(),
    queryFn: () => buffetApiService.listStaff(),
  });
}

export function useBuffetStaffDetailQuery(id: string, enabled = true) {
  return useQuery<BuffetStaffDto>({
    queryKey: buffetKeys.staffDetail(id),
    queryFn: () => buffetApiService.getStaff(id),
    enabled: enabled && !!id,
  });
}

export function useOnDutyBuffetStaffQuery() {
  return useQuery<BuffetStaffDto[]>({
    queryKey: buffetKeys.onDutyStaff(),
    queryFn: () => buffetApiService.getOnDutyStaff(),
  });
}

export function useBuffetRequestsQuery(params?: ListBuffetRequestsParams) {
  return useQuery<PaginatedResponse<BuffetRequestDto>>({
    queryKey: buffetKeys.requestsList(params),
    queryFn: () => buffetApiService.listRequests(params),
  });
}

export function useBuffetRequestQuery(id: string, enabled = true) {
  return useQuery<BuffetRequestDto>({
    queryKey: buffetKeys.requestDetail(id),
    queryFn: () => buffetApiService.getRequest(id),
    enabled: enabled && !!id,
  });
}

export function useTodaysBuffetRequestsQuery() {
  return useQuery<BuffetRequestDto[]>({
    queryKey: buffetKeys.todaysRequests(),
    queryFn: () => buffetApiService.getTodaysRequests(),
    staleTime: 30 * 1000,
  });
}

export function usePendingBuffetRequestsQuery() {
  return useQuery<BuffetRequestDto[]>({
    queryKey: buffetKeys.pendingRequests(),
    queryFn: () => buffetApiService.getPendingRequests(),
    staleTime: 30 * 1000,
  });
}

export function useCreateBuffetLocationMutation() {
  const queryClient = useQueryClient();

  return useMutation<BuffetLocationDto, Error, { name: string; floor?: string; building?: string; capacity?: number }>({
    mutationFn: (data) => buffetApiService.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buffetKeys.locations() });
    },
  });
}

export function useUpdateBuffetLocationMutation() {
  const queryClient = useQueryClient();

  return useMutation<BuffetLocationDto, Error, { id: string; data: Partial<BuffetLocationDto> }>({
    mutationFn: ({ id, data }) => buffetApiService.updateLocation(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(buffetKeys.locationDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: buffetKeys.locations() });
    },
  });
}

export function useCreateBuffetStaffMutation() {
  const queryClient = useQueryClient();

  return useMutation<BuffetStaffDto, Error, { userId: string; buffetLocationId: string }>({
    mutationFn: (data) => buffetApiService.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buffetKeys.staff() });
    },
  });
}

export function useUpdateBuffetStaffMutation() {
  const queryClient = useQueryClient();

  return useMutation<BuffetStaffDto, Error, { id: string; data: Partial<BuffetStaffDto> }>({
    mutationFn: ({ id, data }) => buffetApiService.updateStaff(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(buffetKeys.staffDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: buffetKeys.staff() });
    },
  });
}

export function useCreateBuffetRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<BuffetRequestDto, Error, CreateBuffetRequestDto>({
    mutationFn: (data) => buffetApiService.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buffetKeys.requests() });
    },
  });
}

export function useUpdateBuffetRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<BuffetRequestDto, Error, { id: string; data: UpdateBuffetRequestDto }>({
    mutationFn: ({ id, data }) => buffetApiService.updateRequest(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(buffetKeys.requestDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: buffetKeys.requests() });
    },
  });
}

export function useHandleBuffetRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<BuffetRequestDto, Error, { id: string; status: BuffetRequestStatus }>({
    mutationFn: ({ id, status }) => buffetApiService.handleRequest(id, status),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(buffetKeys.requestDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: buffetKeys.requests() });
    },
  });
}

// ========== Buffet Staff Queries ==========

export function useMyBuffetTasksQuery(params?: ListBuffetStaffTasksParams, enabled = true) {
  return useQuery<BuffetStaffTaskDto[]>({
    queryKey: buffetKeys.myTasks(params),
    queryFn: () => buffetApiService.getMyBuffetTasks(params),
    enabled,
  });
}

export function useUpdateBuffetTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateBuffetStaffTaskStatusResponseDto,
    Error,
    { taskId: string; data: UpdateBuffetStaffTaskStatusDto }
  >({
    mutationFn: ({ taskId, data }) =>
      buffetApiService.updateBuffetTaskStatus(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'buffet' &&
          (query.queryKey[1] === 'staff-tasks' || query.queryKey[1] === 'requests'),
      });
    },
  });
}

// ========== Buffet Admin Queries ==========

export function useBuffetAdminTasksQuery(params?: ListBuffetAdminTasksParams, enabled = true) {
  return useQuery<{ data: BuffetAdminTaskDto[] }>({
    queryKey: buffetKeys.adminTasksList(params),
    queryFn: () => buffetApiService.getBuffetAdminTasks(params),
    enabled,
  });
}

export function useBuffetAdminTaskQuery(id: string, enabled = true) {
  return useQuery<BuffetAdminTaskDto>({
    queryKey: buffetKeys.adminTaskDetail(id),
    queryFn: () => buffetApiService.getBuffetAdminTaskById(id),
    enabled: enabled && !!id,
  });
}

export function useAssignBuffetTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation<AssignBuffetTaskResponseDto, Error, { id: string; data: AssignBuffetTaskDto }>({
    mutationFn: ({ id, data }) => buffetApiService.assignBuffetTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'buffet' &&
          (query.queryKey[1] === 'admin-tasks' || query.queryKey[1] === 'requests'),
      });
    },
  });
}

export function useUpdateBuffetAdminTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateBuffetAdminTaskStatusResponseDto, Error, { id: string; data: UpdateBuffetAdminTaskStatusDto }>({
    mutationFn: ({ id, data }) => buffetApiService.updateBuffetAdminTaskStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'buffet' &&
          (query.queryKey[1] === 'admin-tasks' || query.queryKey[1] === 'requests'),
      });
    },
  });
}

export function useBuffetAdminLocationsQuery(enabled = true) {
  return useQuery<{ data: BuffetAdminLocationDto[] }>({
    queryKey: buffetKeys.adminLocations(),
    queryFn: () => buffetApiService.getBuffetAdminLocations(),
    enabled,
  });
}

export function useCreateBuffetAdminLocationMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateBuffetAdminLocationResponseDto, Error, CreateBuffetAdminLocationDto>({
    mutationFn: (data) => buffetApiService.createBuffetAdminLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'buffet' &&
          (query.queryKey[1] === 'admin-locations' || query.queryKey[1] === 'locations'),
      });
    },
  });
}

export function useBuffetAdminStaffQuery(enabled = true) {
  return useQuery<{ data: BuffetAdminStaffDto[] }>({
    queryKey: buffetKeys.adminStaff(),
    queryFn: () => buffetApiService.getBuffetAdminStaff(),
    enabled,
  });
}

export function useUpdateStaffDutyMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateStaffDutyResponseDto, Error, { id: string; data: UpdateStaffDutyDto }>({
    mutationFn: ({ id, data }) => buffetApiService.updateStaffDutyStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'buffet' &&
          (query.queryKey[1] === 'admin-staff' || query.queryKey[1] === 'staff'),
      });
    },
  });
}

export function useBuffetLoadSummaryQuery(enabled = true) {
  return useQuery<BuffetLoadSummaryDto>({
    queryKey: buffetKeys.loadSummary(),
    queryFn: () => buffetApiService.getBuffetLoadSummary(),
    enabled,
    staleTime: 30 * 1000,
  });
}
