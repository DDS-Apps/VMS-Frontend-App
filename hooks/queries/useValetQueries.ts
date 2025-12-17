import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { valetApiService, type ListValetAssignmentsParams } from '@/services/valetApiService';
import type { PaginatedResponse } from '@/types';
import type {
  ValetDriverDto,
  ValetAssignmentDto,
  CreateValetAssignmentDto,
  UpdateValetAssignmentDto,
  ValetTaskDto,
  ValetAdminDriverDto,
  ValetDriverLoadSummaryDto,
  ValetZoneDto,
  AssignValetDriverDto,
  AssignValetDriverResponseDto,
  ListValetTasksParams,
  ListValetAdminDriversParams,
  ValetTaskType,
  DriverTaskDto,
  ListDriverTasksParams,
  UpdateDriverTaskStatusDto,
  UpdateDriverTaskStatusResponseDto,
} from '@/types/api.types';

export const valetKeys = {
  all: ['valet'] as const,
  drivers: () => [...valetKeys.all, 'drivers'] as const,
  driverDetail: (id: string) => [...valetKeys.drivers(), 'detail', id] as const,
  availableDrivers: () => [...valetKeys.drivers(), 'available'] as const,
  assignments: () => [...valetKeys.all, 'assignments'] as const,
  assignmentsList: (params?: ListValetAssignmentsParams) => [...valetKeys.assignments(), 'list', params] as const,
  assignmentDetail: (id: string) => [...valetKeys.assignments(), 'detail', id] as const,
  myAssignments: () => [...valetKeys.assignments(), 'my'] as const,
  todaysAssignments: () => [...valetKeys.assignments(), 'today'] as const,
  // Valet Admin keys
  admin: () => [...valetKeys.all, 'admin'] as const,
  tasks: (params?: ListValetTasksParams) => [...valetKeys.admin(), 'tasks', params] as const,
  adminDrivers: (params?: ListValetAdminDriversParams) => [...valetKeys.admin(), 'drivers', params] as const,
  driverLoad: () => [...valetKeys.admin(), 'driver-load'] as const,
  zones: () => [...valetKeys.admin(), 'zones'] as const,
  // Valet Driver keys
  driver: () => [...valetKeys.all, 'driver'] as const,
  myTasks: (params?: ListDriverTasksParams) => [...valetKeys.driver(), 'my-tasks', params] as const,
  driverTaskDetail: (id: string) => [...valetKeys.driver(), 'task', id] as const,
};

export function useValetDriversQuery() {
  return useQuery<ValetDriverDto[]>({
    queryKey: valetKeys.drivers(),
    queryFn: () => valetApiService.listDrivers(),
  });
}

export function useValetDriverQuery(id: string, enabled = true) {
  return useQuery<ValetDriverDto>({
    queryKey: valetKeys.driverDetail(id),
    queryFn: () => valetApiService.getDriver(id),
    enabled: enabled && !!id,
  });
}

export function useAvailableValetDriversQuery() {
  return useQuery<ValetDriverDto[]>({
    queryKey: valetKeys.availableDrivers(),
    queryFn: () => valetApiService.getAvailableDrivers(),
  });
}

export function useValetAssignmentsQuery(params?: ListValetAssignmentsParams) {
  return useQuery<PaginatedResponse<ValetAssignmentDto>>({
    queryKey: valetKeys.assignmentsList(params),
    queryFn: () => valetApiService.listAssignments(params),
  });
}

export function useValetAssignmentQuery(id: string, enabled = true) {
  return useQuery<ValetAssignmentDto>({
    queryKey: valetKeys.assignmentDetail(id),
    queryFn: () => valetApiService.getAssignment(id),
    enabled: enabled && !!id,
  });
}

export function useMyValetAssignmentsQuery() {
  return useQuery<ValetAssignmentDto[]>({
    queryKey: valetKeys.myAssignments(),
    queryFn: () => valetApiService.getMyAssignments(),
  });
}

export function useTodaysValetAssignmentsQuery() {
  return useQuery<ValetAssignmentDto[]>({
    queryKey: valetKeys.todaysAssignments(),
    queryFn: () => valetApiService.getTodaysAssignments(),
    staleTime: 30 * 1000,
  });
}

export function useCreateValetDriverMutation() {
  const queryClient = useQueryClient();

  return useMutation<ValetDriverDto, Error, { userId: string; licenseNumber?: string }>({
    mutationFn: (data) => valetApiService.createDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: valetKeys.drivers() });
    },
  });
}

export function useUpdateValetDriverMutation() {
  const queryClient = useQueryClient();

  return useMutation<ValetDriverDto, Error, { id: string; data: Partial<ValetDriverDto> }>({
    mutationFn: ({ id, data }) => valetApiService.updateDriver(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(valetKeys.driverDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: valetKeys.drivers() });
    },
  });
}

export function useCreateValetAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<ValetAssignmentDto, Error, CreateValetAssignmentDto>({
    mutationFn: (data) => valetApiService.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: valetKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: valetKeys.drivers() });
    },
  });
}

export function useUpdateValetAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<ValetAssignmentDto, Error, { id: string; data: UpdateValetAssignmentDto }>({
    mutationFn: ({ id, data }) => valetApiService.updateAssignment(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(valetKeys.assignmentDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: valetKeys.assignments() });
    },
  });
}

export function useDeleteValetAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => valetApiService.deleteAssignment(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: valetKeys.assignmentDetail(id) });
      queryClient.invalidateQueries({ queryKey: valetKeys.assignments() });
    },
  });
}

export function useAcceptValetAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<ValetAssignmentDto, Error, string>({
    mutationFn: (id) => valetApiService.acceptAssignment(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(valetKeys.assignmentDetail(id), data);
      queryClient.invalidateQueries({ queryKey: valetKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: valetKeys.drivers() });
    },
  });
}

export function useRejectValetAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<ValetAssignmentDto, Error, string>({
    mutationFn: (id) => valetApiService.rejectAssignment(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(valetKeys.assignmentDetail(id), data);
      queryClient.invalidateQueries({ queryKey: valetKeys.assignments() });
    },
  });
}

export function useStartValetAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<ValetAssignmentDto, Error, string>({
    mutationFn: (id) => valetApiService.startAssignment(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(valetKeys.assignmentDetail(id), data);
      queryClient.invalidateQueries({ queryKey: valetKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: valetKeys.drivers() });
    },
  });
}

export function useCompleteValetAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<ValetAssignmentDto, Error, { id: string; parkedAtLocation?: string }>({
    mutationFn: ({ id, parkedAtLocation }) => valetApiService.completeAssignment(id, parkedAtLocation),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(valetKeys.assignmentDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: valetKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: valetKeys.drivers() });
    },
  });
}

// ========== Valet Admin Queries ==========

export function useValetTasksQuery(params?: ListValetTasksParams, enabled = true) {
  return useQuery<{ data: ValetTaskDto[] }>({
    queryKey: valetKeys.tasks(params),
    queryFn: () => valetApiService.listTasks(params),
    enabled,
  });
}

export function useValetAdminDriversQuery(params?: ListValetAdminDriversParams) {
  return useQuery<{ data: ValetAdminDriverDto[] }>({
    queryKey: valetKeys.adminDrivers(params),
    queryFn: () => valetApiService.listAdminDrivers(params),
  });
}

export function useValetDriverLoadQuery() {
  return useQuery<ValetDriverLoadSummaryDto>({
    queryKey: valetKeys.driverLoad(),
    queryFn: () => valetApiService.getDriverLoadSummary(),
  });
}

export function useValetZonesQuery() {
  return useQuery<{ data: ValetZoneDto[] }>({
    queryKey: valetKeys.zones(),
    queryFn: () => valetApiService.listZones(),
  });
}

export function useAssignValetDriverMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    AssignValetDriverResponseDto,
    Error,
    { taskId: string; taskType: ValetTaskType; data: AssignValetDriverDto }
  >({
    mutationFn: ({ taskId, taskType, data }) =>
      valetApiService.assignDriverToTask(taskId, taskType, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: valetKeys.admin() });
      queryClient.invalidateQueries({ queryKey: valetKeys.drivers() });
      queryClient.invalidateQueries({ queryKey: valetKeys.availableDrivers() });
    },
  });
}

// ========== Valet Driver Queries ==========

export function useMyDriverTasksQuery(params?: ListDriverTasksParams, enabled = true) {
  return useQuery<{ data: DriverTaskDto[] }>({
    queryKey: valetKeys.myTasks(params),
    queryFn: () => valetApiService.getMyTasks(params),
    enabled,
  });
}

export function useDriverTaskDetailQuery(taskId: string, enabled = true) {
  return useQuery<DriverTaskDto>({
    queryKey: valetKeys.driverTaskDetail(taskId),
    queryFn: () => valetApiService.getDriverTaskDetail(taskId),
    enabled: enabled && !!taskId,
  });
}

export function useUpdateDriverTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateDriverTaskStatusResponseDto,
    Error,
    { taskId: string; data: UpdateDriverTaskStatusDto }
  >({
    mutationFn: ({ taskId, data }) =>
      valetApiService.updateDriverTaskStatus(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'valet' &&
          (query.queryKey[1] === 'driver' || query.queryKey[1] === 'admin'),
      });
    },
  });
}
