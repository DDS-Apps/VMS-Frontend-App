import { useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
import { compareRequestsNewestFirst } from '@/utils/allRequestsPresentation';
import {
  extractAllRequestsArray,
  fetchValetTasksForDateRange,
  getBuffetSingleDateParams,
  getNextVisitPageParam,
  shouldAutoFetchAllVisitorPages,
} from '@/utils/allRequestsQueryHelpers';

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
  originalStatus: string;
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
  endTime?: string;
  duration?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
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
    originalStatus: visit.status,
    location: visit.purpose,
    originalData: visit,
    canApprove: normalizedStatus === 'pending',
    canCancel: normalizedStatus === 'pending' || normalizedStatus === 'approved',
    createdAt: visit.createdAt,
    purpose: visit.purpose,
    company: visit.visitor?.company,
    endTime: visit.endTime ?? undefined,
    duration: visit.duration ?? undefined,
    checkedInAt: visit.checkedInAt ?? undefined,
    checkedOutAt: visit.checkedOutAt ?? undefined,
  };
}

function mapBuffetToUnified(buffet: BuffetAdminTaskDto): UnifiedRequest {
  // Buffet tasks carry the same visit-lifecycle status values as regular visits
  // (visitor_accepted, checked_in, checked_out, completed, cancelled, etc.),
  // not the old food-prep enum, so reuse the same normalization.
  const normalizedStatus = normalizeVisitStatus(buffet.status);
  return {
    id: buffet.id,
    type: 'buffet',
    // The server omits visitorName/company only when the requester is buffet_admin;
    // admin/building_admin oversight views receive the real values.
    visitorName: buffet.visitorName || 'Unknown',
    hostName: buffet.hostName || 'Unknown Host',
    date: buffet.visitDate,
    time: buffet.visitTime,
    status: normalizedStatus,
    originalStatus: buffet.status,
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
    originalStatus: valet.valet?.status || 'pending',
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
  status?: UnifiedStatus | 'all' | 'visitor_accepted' | 'visitor_rejected';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface AllRequestsQueryOptions {
  includeValet?: boolean;
}

const VISIT_PAGE_SIZE = 20;

export function useAllRequestsQuery(
  filters: AllRequestsFilters = {},
  options: AllRequestsQueryOptions = {},
) {
  const { user } = useAuth();
  const { type = 'all', status = 'all', startDate, endDate } = filters;
  const userRole = user?.role;

  const hasBuffetAccess = userRole ? ROLES_WITH_BUFFET_ACCESS.includes(userRole) : false;
  const hasValetAccess = userRole ? ROLES_WITH_VALET_ACCESS.includes(userRole) : false;

  const visitParams: VisitListParams = {
    limit: VISIT_PAGE_SIZE,
    startDate,
    endDate,
  };

  const valetParams: ListValetTasksParams = {
    date: startDate,
  };

  const shouldFetchVisits = type === 'all' || type === 'visitor';
  const shouldFetchBuffet = (type === 'all' || type === 'buffet') && hasBuffetAccess;
  const shouldFetchValet =
    (type === 'all' || type === 'valet') &&
    hasValetAccess &&
    options.includeValet !== false;

  const visitsResult = useInfiniteQuery({
    queryKey: ['all-requests', 'visits', type, visitParams],
    queryFn: ({ pageParam, signal }) => requestApiService.listVisits({
      ...visitParams,
      page: pageParam,
    }, { signal }),
    initialPageParam: 1,
    getNextPageParam: getNextVisitPageParam,
    enabled: shouldFetchVisits,
    staleTime: 30 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (shouldAutoFetchAllVisitorPages({
      requestType: type,
      status,
      searchQuery: filters.searchQuery,
      hasNextPage: Boolean(visitsResult.hasNextPage),
      isFetchingNextPage: visitsResult.isFetchingNextPage,
      hasNextPageError: visitsResult.isFetchNextPageError,
    })) {
      void visitsResult.fetchNextPage();
    }
  }, [
    filters.searchQuery,
    status,
    type,
    visitsResult.fetchNextPage,
    visitsResult.hasNextPage,
    visitsResult.isFetchNextPageError,
    visitsResult.isFetchingNextPage,
  ]);

  const buffetResult = useQuery({
    queryKey: ['all-requests', 'buffet-admin-tasks', type, startDate],
    queryFn: () => buffetApiService.getBuffetAdminTasks(
      getBuffetSingleDateParams(startDate),
    ),
    enabled: shouldFetchBuffet,
    staleTime: 30 * 1000,
    retry: false,
  });

  const valetResult = useQuery({
    queryKey: ['all-requests', 'valet-admin-tasks', type, startDate, endDate],
    queryFn: async () => type === 'all'
      ? {
          data: await fetchValetTasksForDateRange<ValetTaskDto>(
            startDate,
            endDate,
            date => valetApiService.listTasks(date ? { date } : undefined),
          ),
        }
      : valetApiService.listTasks(valetParams),
    enabled: shouldFetchValet,
    staleTime: 30 * 1000,
    retry: false,
  });

  const results = [visitsResult, buffetResult, valetResult];
  const enabledResults = [
    shouldFetchVisits ? visitsResult : null,
    shouldFetchBuffet ? buffetResult : null,
    shouldFetchValet ? valetResult : null,
  ].filter(Boolean);

  const isLoading = enabledResults.some(r => r?.isLoading);
  const isFetching = enabledResults.some(r => r?.isFetching);
  const isError = enabledResults.some(r => r?.isError);
  const error = enabledResults.find(r => r?.error)?.error;
  const hasResolvedData =
    enabledResults.length > 0 &&
    enabledResults.every(result => result?.data !== undefined);
  const dataUpdatedAt = Math.max(
    0,
    ...enabledResults.map(result => result?.dataUpdatedAt ?? 0),
  );

  const allRequests: UnifiedRequest[] = [];
  let visitTotal = 0;

  if (shouldFetchVisits && visitsResult.data) {
    const rawVisits = visitsResult.data.pages.flatMap(page => extractAllRequestsArray<VisitListItemDto>(page));
    const uniqueVisits = Array.from(new Map(rawVisits.map(visit => [visit.id, visit])).values());
    allRequests.push(...uniqueVisits.map(mapVisitToUnified));
    visitTotal = Number(
      visitsResult.data.pages[0]?.pagination?.total ?? uniqueVisits.length,
    );
  }

  if (shouldFetchBuffet && buffetResult.data) {
    const rawBuffetTasks = extractAllRequestsArray<BuffetAdminTaskDto>(buffetResult.data);
    allRequests.push(...rawBuffetTasks.map(mapBuffetToUnified));
  }

  if (shouldFetchValet && valetResult.data) {
    const rawValetTasks = extractAllRequestsArray<ValetTaskDto>(valetResult.data);
    allRequests.push(...rawValetTasks.map(mapValetToUnified));
  }

  const isReadOnlyRole = userRole === 'building_admin';
  
  const processedRequests = isReadOnlyRole 
    ? allRequests.map(r => ({ ...r, canApprove: false, canCancel: false }))
    : allRequests;

  let filteredRequests = processedRequests;

  if (status !== 'all') {
    if (status === 'visitor_accepted' || status === 'visitor_rejected') {
      filteredRequests = filteredRequests.filter(r => r.originalStatus === status);
    } else {
      filteredRequests = filteredRequests.filter(r => r.status === status);
    }
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

  filteredRequests.sort(compareRequestsNewestFirst);

  const areStatusCountsComplete = !shouldFetchVisits || !visitsResult.hasNextPage;
  const statusCount = (statusToCount: UnifiedStatus): number | null =>
    areStatusCountsComplete
      ? allRequests.filter(r => r.status === statusToCount).length
      : null;
  const nonVisitorCount = allRequests.filter(r => r.type !== 'visitor').length;

  const stats = {
    total: shouldFetchVisits ? visitTotal + nonVisitorCount : allRequests.length,
    pending: statusCount('pending'),
    approved: statusCount('approved'),
    inProgress: statusCount('in_progress'),
    completed: statusCount('completed'),
    cancelled: statusCount('cancelled'),
    rejected: statusCount('rejected'),
    areStatusCountsComplete,
    byType: {
      visitor: shouldFetchVisits
        ? visitTotal
        : allRequests.filter(r => r.type === 'visitor').length,
      buffet: allRequests.filter(r => r.type === 'buffet').length,
      valet: allRequests.filter(r => r.type === 'valet').length,
    },
  };

  const refetch = async () => {
    await Promise.all(enabledResults.map(r => r!.refetch()));
  };

  return {
    data: filteredRequests,
    allData: processedRequests,
    stats,
    isLoading,
    isFetching,
    isError,
    error,
    hasResolvedData,
    dataUpdatedAt,
    refetch,
    hasNextPage: shouldFetchVisits ? visitsResult.hasNextPage : false,
    isFetchingNextPage: shouldFetchVisits ? visitsResult.isFetchingNextPage : false,
    hasNextPageError: shouldFetchVisits ? visitsResult.isFetchNextPageError : false,
    fetchNextPage: visitsResult.fetchNextPage,
  };
}

export const allRequestsKeys = {
  all: ['all-requests'] as const,
  visits: (params?: VisitListParams) => [...allRequestsKeys.all, 'visits', params] as const,
  buffet: (params?: ListBuffetAdminTasksParams) => [...allRequestsKeys.all, 'buffet-admin-tasks', params] as const,
  valet: (params?: ListValetTasksParams) => [...allRequestsKeys.all, 'valet-admin-tasks', params] as const,
};
