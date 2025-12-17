import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { employeeParkingApiService } from '@/services/employeeParkingApiService';
import type {
  EmployeeParkingAssignment,
  AssignParkingDto,
  BulkAssignParkingDto,
  BulkAssignResult,
  ListEmployeeParkingParams,
  PaginatedResponse,
} from '@/services/employeeParkingApiService';
import { ApiError } from '@/api/errors';

export const employeeParkingKeys = {
  all: ['employee-parking'] as const,
  lists: () => [...employeeParkingKeys.all, 'list'] as const,
  list: (params?: ListEmployeeParkingParams) => [...employeeParkingKeys.lists(), params] as const,
  employee: (employeeId: string) => [...employeeParkingKeys.all, 'employee', employeeId] as const,
};

export function useEmployeeParkingListQuery(
  params?: ListEmployeeParkingParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<EmployeeParkingAssignment>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<EmployeeParkingAssignment>, ApiError>({
    queryKey: employeeParkingKeys.list(params),
    queryFn: () => employeeParkingApiService.list(params),
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useEmployeeParkingAssignmentQuery(
  employeeId: string,
  options?: Omit<UseQueryOptions<EmployeeParkingAssignment | null, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EmployeeParkingAssignment | null, ApiError>({
    queryKey: employeeParkingKeys.employee(employeeId),
    queryFn: () => employeeParkingApiService.getByEmployeeId(employeeId),
    enabled: !!employeeId,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useAssignEmployeeParkingMutation() {
  const queryClient = useQueryClient();

  return useMutation<EmployeeParkingAssignment, ApiError, { employeeId: string; data: AssignParkingDto }>({
    mutationFn: ({ employeeId, data }) => employeeParkingApiService.assign(employeeId, data),
    onSuccess: (result, { employeeId }) => {
      queryClient.setQueryData(employeeParkingKeys.employee(employeeId), result);
      queryClient.invalidateQueries({ queryKey: employeeParkingKeys.lists() });
    },
  });
}

export function useUnassignEmployeeParkingMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (employeeId) => employeeParkingApiService.unassign(employeeId),
    onSuccess: (_, employeeId) => {
      queryClient.setQueryData(employeeParkingKeys.employee(employeeId), null);
      queryClient.invalidateQueries({ queryKey: employeeParkingKeys.lists() });
    },
  });
}

export function useBulkAssignParkingMutation() {
  const queryClient = useQueryClient();

  return useMutation<BulkAssignResult, ApiError, BulkAssignParkingDto>({
    mutationFn: (data) => employeeParkingApiService.bulkAssign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeParkingKeys.all });
    },
  });
}
