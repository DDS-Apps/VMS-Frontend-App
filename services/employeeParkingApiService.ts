import { get, post, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type {
  EmployeeParkingAssignment,
  AssignParkingDto,
  BulkAssignParkingDto,
  BulkAssignResult,
  ListEmployeeParkingParams,
  PaginatedResponse,
} from '@/types';

const { parking } = apiConfig.endpoints;

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

export const employeeParkingApiService = {
  list: (params?: ListEmployeeParkingParams): Promise<PaginatedResponse<EmployeeParkingAssignment>> => {
    const queryString = params ? buildQueryString(params as Record<string, unknown>) : '';
    return get<PaginatedResponse<EmployeeParkingAssignment>>(`${parking.employees}${queryString}`);
  },

  getByEmployeeId: (employeeId: string): Promise<EmployeeParkingAssignment | null> => {
    return get<EmployeeParkingAssignment | null>(`${parking.employees}/${employeeId}/assignment`);
  },

  assign: (employeeId: string, data: AssignParkingDto): Promise<EmployeeParkingAssignment> => {
    return post<EmployeeParkingAssignment, AssignParkingDto>(
      `${parking.employees}/${employeeId}/assign`,
      data
    );
  },

  unassign: (employeeId: string): Promise<void> => {
    return del<void>(`${parking.employees}/${employeeId}/assign`);
  },

  bulkAssign: (data: BulkAssignParkingDto): Promise<BulkAssignResult> => {
    return post<BulkAssignResult, BulkAssignParkingDto>(parking.bulkAssign, data);
  },
};

export default employeeParkingApiService;
