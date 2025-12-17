export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BaseListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export type VisitStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'waiting_acceptance'
  | 'accepted'
  | 'checked_in'
  | 'checked_out'
  | 'no_show'
  | 'expired';

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';

export type SortOrder = 'asc' | 'desc';
