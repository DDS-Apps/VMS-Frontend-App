import { useQueries } from '@tanstack/react-query';
import { invitationApiService, type ListInvitationsParams } from '@/services/invitationApiService';
import { buffetApiService, type ListBuffetRequestsParams } from '@/services/buffetApiService';
import { valetApiService, type ListValetAssignmentsParams } from '@/services/valetApiService';
import type { 
  InvitationDto, 
  BuffetRequestDto, 
  ValetAssignmentDto,
} from '@/types/api.types';
import { 
  InvitationStatus, 
  BuffetRequestStatus, 
  ValetAssignmentStatus,
} from '@/types/api.types';
import type { PaginatedResponse } from '@/types';

export type UnifiedRequestType = 'visitor' | 'buffet' | 'valet';
export type UnifiedStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';

export interface UnifiedRequest {
  id: string;
  type: UnifiedRequestType;
  visitorName: string;
  hostName: string;
  date: string;
  time: string;
  status: UnifiedStatus;
  location?: string;
  originalData: InvitationDto | BuffetRequestDto | ValetAssignmentDto;
  canApprove: boolean;
  canCancel: boolean;
  createdAt: string;
}

function normalizeInvitationStatus(status: InvitationStatus): UnifiedStatus {
  switch (status) {
    case InvitationStatus.PENDING:
      return 'pending';
    case InvitationStatus.ACCEPTED:
      return 'approved';
    case InvitationStatus.CHECKED_IN:
      return 'in_progress';
    case InvitationStatus.CHECKED_OUT:
      return 'completed';
    case InvitationStatus.CANCELLED:
      return 'cancelled';
    case InvitationStatus.REJECTED:
    case InvitationStatus.EXPIRED:
      return 'rejected';
    default:
      return 'pending';
  }
}

function normalizeBuffetStatus(status: BuffetRequestStatus): UnifiedStatus {
  switch (status) {
    case BuffetRequestStatus.PENDING:
      return 'pending';
    case BuffetRequestStatus.CONFIRMED:
      return 'approved';
    case BuffetRequestStatus.PREPARING:
    case BuffetRequestStatus.READY:
      return 'in_progress';
    case BuffetRequestStatus.DELIVERED:
      return 'completed';
    case BuffetRequestStatus.CANCELLED:
      return 'cancelled';
    default:
      return 'pending';
  }
}

function normalizeValetStatus(status: ValetAssignmentStatus): UnifiedStatus {
  switch (status) {
    case ValetAssignmentStatus.PENDING:
      return 'pending';
    case ValetAssignmentStatus.ACCEPTED:
      return 'approved';
    case ValetAssignmentStatus.IN_PROGRESS:
      return 'in_progress';
    case ValetAssignmentStatus.COMPLETED:
      return 'completed';
    case ValetAssignmentStatus.CANCELLED:
      return 'cancelled';
    case ValetAssignmentStatus.REJECTED:
      return 'rejected';
    default:
      return 'pending';
  }
}

function getVisitorName(visitor?: { firstName?: string; lastName?: string; email?: string }): string {
  if (!visitor) return 'Unknown Visitor';
  const fullName = [visitor.firstName, visitor.lastName].filter(Boolean).join(' ').trim();
  return fullName || visitor.email || 'Unknown Visitor';
}

function getUserName(user?: { name?: string; firstName?: string; lastName?: string; email?: string }): string {
  if (!user) return 'Unknown';
  if (user.name) return user.name;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.email || 'Unknown';
}

function mapInvitationToUnified(invitation: InvitationDto): UnifiedRequest {
  const normalizedStatus = normalizeInvitationStatus(invitation.status);
  return {
    id: invitation.id,
    type: 'visitor',
    visitorName: getVisitorName(invitation.visitor),
    hostName: getUserName(invitation.host),
    date: invitation.visitDate,
    time: invitation.startTime,
    status: normalizedStatus,
    location: invitation.notes,
    originalData: invitation,
    canApprove: normalizedStatus === 'pending',
    canCancel: normalizedStatus === 'pending' || normalizedStatus === 'approved',
    createdAt: invitation.createdAt,
  };
}

function mapBuffetToUnified(buffet: BuffetRequestDto): UnifiedRequest {
  const normalizedStatus = normalizeBuffetStatus(buffet.status);
  return {
    id: buffet.id,
    type: 'buffet',
    visitorName: getVisitorName(buffet.invitation?.visitor) || getUserName(buffet.requestedBy) || 'Buffet Request',
    hostName: getUserName(buffet.requestedBy),
    date: buffet.scheduledTime.split('T')[0],
    time: buffet.scheduledTime,
    status: normalizedStatus,
    location: buffet.buffetLocation?.name,
    originalData: buffet,
    canApprove: normalizedStatus === 'pending',
    canCancel: normalizedStatus === 'pending' || normalizedStatus === 'approved',
    createdAt: buffet.createdAt,
  };
}

function mapValetToUnified(valet: ValetAssignmentDto): UnifiedRequest {
  const normalizedStatus = normalizeValetStatus(valet.status);
  return {
    id: valet.id,
    type: 'valet',
    visitorName: getVisitorName(valet.invitation?.visitor) || getUserName(valet.requestedBy) || 'Valet Request',
    hostName: getUserName(valet.requestedBy),
    date: valet.pickupTime?.split('T')[0] || valet.createdAt.split('T')[0],
    time: valet.pickupTime || valet.createdAt,
    status: normalizedStatus,
    location: valet.parkedAtLocation,
    originalData: valet,
    canApprove: normalizedStatus === 'pending',
    canCancel: normalizedStatus === 'pending' || normalizedStatus === 'approved',
    createdAt: valet.createdAt,
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
  const { type = 'all', status = 'all', startDate, endDate } = filters;

  const invitationParams: ListInvitationsParams = {
    limit: 100,
    startDate,
    endDate,
  };

  const buffetParams: ListBuffetRequestsParams = {
    limit: 100,
  };

  const valetParams: ListValetAssignmentsParams = {
    limit: 100,
  };

  const shouldFetchInvitations = type === 'all' || type === 'visitor';
  const shouldFetchBuffet = type === 'all' || type === 'buffet';
  const shouldFetchValet = type === 'all' || type === 'valet';

  const results = useQueries({
    queries: [
      {
        queryKey: ['all-requests', 'invitations', invitationParams],
        queryFn: () => invitationApiService.list(invitationParams),
        enabled: shouldFetchInvitations,
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['all-requests', 'buffet', buffetParams],
        queryFn: () => buffetApiService.listRequests(buffetParams),
        enabled: shouldFetchBuffet,
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['all-requests', 'valet', valetParams],
        queryFn: () => valetApiService.listAssignments(valetParams),
        enabled: shouldFetchValet,
        staleTime: 30 * 1000,
      },
    ],
  });

  const [invitationsResult, buffetResult, valetResult] = results;

  const isLoading = results.some(r => r.isLoading);
  const isFetching = results.some(r => r.isFetching);
  const isError = results.some(r => r.isError);
  const error = results.find(r => r.error)?.error;

  const allRequests: UnifiedRequest[] = [];

  if (shouldFetchInvitations && invitationsResult.data) {
    const invitations = (invitationsResult.data as PaginatedResponse<InvitationDto>).data || [];
    allRequests.push(...invitations.map(mapInvitationToUnified));
  }

  if (shouldFetchBuffet && buffetResult.data) {
    const buffetRequests = (buffetResult.data as PaginatedResponse<BuffetRequestDto>).data || [];
    allRequests.push(...buffetRequests.map(mapBuffetToUnified));
  }

  if (shouldFetchValet && valetResult.data) {
    const valetAssignments = (valetResult.data as PaginatedResponse<ValetAssignmentDto>).data || [];
    allRequests.push(...valetAssignments.map(mapValetToUnified));
  }

  let filteredRequests = allRequests;

  if (status !== 'all') {
    filteredRequests = filteredRequests.filter(r => r.status === status);
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredRequests = filteredRequests.filter(r => 
      r.visitorName.toLowerCase().includes(query) ||
      r.hostName.toLowerCase().includes(query) ||
      (r.location && r.location.toLowerCase().includes(query))
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
    cancelled: allRequests.filter(r => r.status === 'cancelled' || r.status === 'rejected').length,
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
    allData: allRequests,
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
  invitations: (params?: ListInvitationsParams) => [...allRequestsKeys.all, 'invitations', params] as const,
  buffet: (params?: ListBuffetRequestsParams) => [...allRequestsKeys.all, 'buffet', params] as const,
  valet: (params?: ListValetAssignmentsParams) => [...allRequestsKeys.all, 'valet', params] as const,
};
