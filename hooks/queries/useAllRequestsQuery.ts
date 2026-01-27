import { useQueries } from '@tanstack/react-query';
import { requestApiService } from '@/services/api/requestApiService';
import { buffetApiService } from '@/services/api/buffetApiService';
import { valetApiService } from '@/services/api/valetApiService';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  VisitListItemDto, 
  VisitListParams,
  BuffetAdminTaskDto,
  ListBuffetAdminTasksParams,
  ValetTaskDto,
  ListValetTasksParams,
} from '@/types/api.types';
import type { UserRole } from '@/types/vms.types';

const ROLES_WITH_BUFFET_ACCESS: UserRole[] = ['buffet_admin', 'building_admin'];
const ROLES_WITH_VALET_ACCESS: UserRole[] = ['valet_admin', 'building_admin'];

export type UnifiedRequestType = 'visitor' | 'buffet' | 'valet';
export type UnifiedStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'auto_cancelled' | 'rejected';

export interface UnifiedRequest {
  id: string;
  type: UnifiedRequestType;
  visitorName: string;
  hostName: string;
  date: string;
  time: string;
  status: UnifiedStatus;
  location?: string;
  originalData: VisitListItemDto | BuffetAdminTaskDto | ValetTaskDto;
  canApprove: boolean;
  canCancel: boolean;
  createdAt: string;
  purpose?: string;
  company?: string;
  mealType?: string;
  guestCount?: number;
  vehicleInfo?: ValetTaskDto['vehicleInfo'];
}

function normalizeVisitStatus(status: string): UnifiedStatus {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'pending':
    case 'pending_approval':
    case 'pending_host_approval':
    case 'visitor_pending':
      return 'pending';
    case 'approved':
    case 'confirmed':
    case 'accepted':
    case 'visitor_accepted':
      return 'approved';
    case 'checked_in':
    case 'in_progress':
      return 'in_progress';
    case 'checked_out':
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'auto_cancelled':
      return 'auto_cancelled';
    case 'rejected':
    case 'visitor_rejected':
    case 'expired':
      return 'rejected';
    default:
      return 'pending';
  }
}

function normalizeBuffetStatus(status: string): UnifiedStatus {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'pending':
    case 'pending_assignment':
      return 'pending';
    case 'assigned':
    case 'confirmed':
      return 'approved';
    case 'preparing':
    case 'ready':
    case 'in_progress':
      return 'in_progress';
    case 'delivered':
    case 'completed':
    case 'served':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'auto_cancelled':
      return 'auto_cancelled';
    default:
      return 'pending';
  }
}

function normalizeValetStatus(status?: string): UnifiedStatus {
  if (!status) return 'pending';
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'pending':
    case 'unassigned':
      return 'pending';
    case 'assigned':
    case 'accepted':
      return 'approved';
    case 'in_progress':
    case 'picking_up':
    case 'parking':
      return 'in_progress';
    case 'completed':
    case 'parked':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'auto_cancelled':
      return 'auto_cancelled';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
}

function mapVisitToUnified(visit: VisitListItemDto): UnifiedRequest {
  const normalizedStatus = normalizeVisitStatus(visit.status);
  return {
    id: visit.id,
    type: 'visitor',
    visitorName: visit.visitor?.fullName || 'Unknown Visitor',
    hostName: visit.employeeName || 'Unknown Host',
    date: visit.visitDate,
    time: visit.visitTime,
    status: normalizedStatus,
    location: visit.purpose,
    originalData: visit,
    canApprove: normalizedStatus === 'pending',
    canCancel: normalizedStatus === 'pending' || normalizedStatus === 'approved',
    createdAt: visit.createdAt,
    purpose: visit.purpose,
    company: visit.visitor?.company,
  };
}

function mapBuffetToUnified(buffet: BuffetAdminTaskDto): UnifiedRequest {
  const normalizedStatus = normalizeBuffetStatus(buffet.status);
  return {
    id: buffet.id,
    type: 'buffet',
    visitorName: buffet.visitorName || 'Unknown',
    hostName: buffet.hostName || 'Unknown Host',
    date: buffet.visitDate,
    time: buffet.visitTime,
    status: normalizedStatus,
    location: buffet.location,
    originalData: buffet,
    canApprove: normalizedStatus === 'pending',
    canCancel: normalizedStatus === 'pending' || normalizedStatus === 'approved',
    createdAt: buffet.createdAt || buffet.visitDate,
    mealType: buffet.mealType,
    guestCount: buffet.guestCount,
    company: buffet.company,
  };
}

function mapValetToUnified(valet: ValetTaskDto): UnifiedRequest {
  const normalizedStatus = normalizeValetStatus(valet.valet?.status);
  const visitorName = valet.visitorName || valet.employeeName || 'Valet Request';
  return {
    id: valet.id,
    type: 'valet',
    visitorName,
    hostName: valet.hostName || valet.employeeName || 'Unknown',
    date: valet.visitDate,
    time: valet.pickupTime || '',
    status: normalizedStatus,
    location: valet.location || valet.dropOffLocation,
    originalData: valet,
    canApprove: normalizedStatus === 'pending',
    canCancel: normalizedStatus === 'pending' || normalizedStatus === 'approved',
    createdAt: valet.visitDate,
    vehicleInfo: valet.vehicleInfo,
    company: valet.visitorCompany,
  };
}

export interface AllRequestsFilters {
  type?: UnifiedRequestType | 'all';
  status?: UnifiedStatus | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export function useAllRequestsQuery(filters: AllRequestsFilters = {}) {
  const { user } = useAuth();
  const { type = 'all', status = 'all', startDate, endDate } = filters;
  const userRole = user?.role;

  const hasBuffetAccess = userRole ? ROLES_WITH_BUFFET_ACCESS.includes(userRole) : false;
  const hasValetAccess = userRole ? ROLES_WITH_VALET_ACCESS.includes(userRole) : false;

  const visitParams: VisitListParams = {
    limit: 100,
    startDate,
    endDate,
  };

  const buffetParams: ListBuffetAdminTasksParams = {
    date: startDate,
  };

  const valetParams: ListValetTasksParams = {
    date: startDate,
  };

  const shouldFetchVisits = type === 'all' || type === 'visitor';
  const shouldFetchBuffet = (type === 'all' || type === 'buffet') && hasBuffetAccess;
  const shouldFetchValet = (type === 'all' || type === 'valet') && hasValetAccess;

  const results = useQueries({
    queries: [
      {
        queryKey: ['all-requests', 'visits', visitParams],
        queryFn: () => requestApiService.listVisits(visitParams),
        enabled: shouldFetchVisits,
        staleTime: 30 * 1000,
        retry: false,
      },
      {
        queryKey: ['all-requests', 'buffet-admin-tasks', buffetParams],
        queryFn: () => buffetApiService.getBuffetAdminTasks(buffetParams),
        enabled: shouldFetchBuffet,
        staleTime: 30 * 1000,
        retry: false,
      },
      {
        queryKey: ['all-requests', 'valet-admin-tasks', valetParams],
        queryFn: () => valetApiService.listTasks(valetParams),
        enabled: shouldFetchValet,
        staleTime: 30 * 1000,
        retry: false,
      },
    ],
  });

  const [visitsResult, buffetResult, valetResult] = results;

  const isLoading = results.some(r => r.isLoading);
  const isFetching = results.some(r => r.isFetching);
  const isError = results.some(r => r.isError);
  const error = results.find(r => r.error)?.error;

  const allRequests: UnifiedRequest[] = [];

  // Helper to extract array from nested API response structures
  const extractArray = <T>(data: unknown): T[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data) {
      const nested = (data as { data: unknown }).data;
      if (Array.isArray(nested)) return nested;
      if (nested && typeof nested === 'object' && 'data' in nested) {
        const deepNested = (nested as { data: unknown }).data;
        if (Array.isArray(deepNested)) return deepNested;
      }
    }
    return [];
  };

  if (shouldFetchVisits && visitsResult.data) {
    const rawVisits = extractArray<VisitListItemDto>(visitsResult.data);
    allRequests.push(...rawVisits.map(mapVisitToUnified));
  }

  if (shouldFetchBuffet && buffetResult.data) {
    const rawBuffetTasks = extractArray<BuffetAdminTaskDto>(buffetResult.data);
    allRequests.push(...rawBuffetTasks.map(mapBuffetToUnified));
  }

  if (shouldFetchValet && valetResult.data) {
    const rawValetTasks = extractArray<ValetTaskDto>(valetResult.data);
    allRequests.push(...rawValetTasks.map(mapValetToUnified));
  }

  const isReadOnlyRole = userRole === 'building_admin';
  
  const processedRequests = isReadOnlyRole 
    ? allRequests.map(r => ({ ...r, canApprove: false, canCancel: false }))
    : allRequests;

  let filteredRequests = processedRequests;

  if (status !== 'all') {
    filteredRequests = filteredRequests.filter(r => r.status === status);
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredRequests = filteredRequests.filter(r => 
      r.visitorName.toLowerCase().includes(query) ||
      r.hostName.toLowerCase().includes(query) ||
      (r.location && r.location.toLowerCase().includes(query)) ||
      (r.company && r.company.toLowerCase().includes(query))
    );
  }

  filteredRequests.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const stats = {
    total: allRequests.length,
    pending: allRequests.filter(r => r.status === 'pending').length,
    approved: allRequests.filter(r => r.status === 'approved').length,
    inProgress: allRequests.filter(r => r.status === 'in_progress').length,
    completed: allRequests.filter(r => r.status === 'completed').length,
    cancelled: allRequests.filter(r => r.status === 'cancelled').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length,
    byType: {
      visitor: allRequests.filter(r => r.type === 'visitor').length,
      buffet: allRequests.filter(r => r.type === 'buffet').length,
      valet: allRequests.filter(r => r.type === 'valet').length,
    },
  };

  const refetch = async () => {
    await Promise.all(results.map(r => r.refetch()));
  };

  return {
    data: filteredRequests,
    allData: processedRequests,
    stats,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}

export const allRequestsKeys = {
  all: ['all-requests'] as const,
  visits: (params?: VisitListParams) => [...allRequestsKeys.all, 'visits', params] as const,
  buffet: (params?: ListBuffetAdminTasksParams) => [...allRequestsKeys.all, 'buffet-admin-tasks', params] as const,
  valet: (params?: ListValetTasksParams) => [...allRequestsKeys.all, 'valet-admin-tasks', params] as const,
};
