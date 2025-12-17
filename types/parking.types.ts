import type { BaseListParams } from './common.types';

export type EmployeeParkingSpotType = 'standard' | 'vip' | 'disabled' | 'ev_charging' | 'reserved';

export interface EmployeeParkingAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department?: string;
  spotId: string;
  spotNumber: string;
  spotType: EmployeeParkingSpotType;
  zone?: string;
  floor?: string;
  building?: string;
  assignedAt: string;
  assignedBy: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface AssignParkingDto {
  spotId: string;
  expiresAt?: string;
  notes?: string;
}

export interface BulkAssignmentItem {
  employeeId: string;
  spotId: string;
  expiresAt?: string;
}

export interface BulkAssignParkingDto {
  assignments: BulkAssignmentItem[];
}

export interface BulkAssignError {
  employeeId: string;
  spotId: string;
  error: string;
}

export interface BulkAssignResult {
  successful: number;
  failed: number;
  errors?: BulkAssignError[];
}

export interface ListEmployeeParkingParams extends BaseListParams {
  department?: string;
  zone?: string;
  isActive?: boolean;
}
