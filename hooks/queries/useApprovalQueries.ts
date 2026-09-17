import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { requestApiService, type ListRequestsParams } from '@/services/api/requestApiService';
import { invalidateDashboardKpis } from '@/hooks/queries/useDashboardKpiQuery';
import type { PaginatedResponse } from '@/types';
import type {
  RequestDto,
  CreateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  PendingApprovalListParams,
  PendingApprovalListResponse,
  ApproveVisitPayload,
  ApproveVisitResponse,
  RejectVisitPayload,
  RejectVisitResponse,
  BulkApprovePayload,
  BulkRejectPayload,
  BulkApprovalResponse,
  AwaitingVisitorListParams,
  AwaitingVisitorListResponse,
  PendingHostWalkInListParams,
  PendingHostWalkInListResponse,
  PendingHostWalkInDto,
  VisitListParams,
  VisitListResponse,
  CreateVisitPayload,
  CreateVisitResponse,
  VisitDetailsDto,
  UpdateVisitPayload,
  UpdateVisitResponse,
  CancelVisitResponse,
  HostApprovePayload,
  HostApproveResponse,
  HostRejectPayload,
  HostRejectResponse,
  ApprovalHistoryListParams,
  ApprovalHistoryResponse,
} from '@/types/api.types';
import type { VisitorRequest } from '@/types/vms.types';
import { invitationKeys } from './useInvitationQueries';

export const mapPendingHostWalkInToVisitorRequest = (walkIn: PendingHostWalkInDto): VisitorRequest => {
  return {
    id: walkIn.id,
    employeeId: '',
    employeeName: '',
    employeeDepartment: undefined,
    visitor: {
      id: walkIn.visitor?.id || '',
      fullName: walkIn.visitor?.fullName || 'Unknown Visitor',
      email: walkIn.visitor?.email || '',
      phone: walkIn.visitor?.phone || '',
      company: undefined,
    },
    visitDate: walkIn.visitDate,
    visitTime: walkIn.visitTime || '',
    duration: walkIn.duration || '1 hour',
    purpose: walkIn.purpose || '',
    status: 'pending_approval',
    communicationChannels: ['email'],
    parkingType: 'none',
    qrCode: undefined,
    approval: {
      requiresApproval: true,
      autoApproved: false,
    },
    reminders: {},
    createdAt: walkIn.createdAt || new Date().toISOString(),
    updatedAt: walkIn.createdAt || new Date().toISOString(),
    isWalkIn: true,
  };
};

export const requestKeys = {
  all: ['requests'] as const,
  lists: () => [...requestKeys.all, 'list'] as const,
  list: (params?: ListRequestsParams) => [...requestKeys.lists(), params] as const,
  details: () => [...requestKeys.all, 'detail'] as const,
  detail: (id: string) => [...requestKeys.details(), id] as const,
  myRequests: () => [...requestKeys.all, 'my-requests'] as const,
  pendingApprovals: (params?: PendingApprovalListParams) => [...requestKeys.all, 'pending-approvals', params] as const,
  awaitingVisitor: (params?: AwaitingVisitorListParams) => [...requestKeys.all, 'awaiting-visitor', params] as const,
  pendingHostWalkIns: (params?: PendingHostWalkInListParams) => [...requestKeys.all, 'pending-host-walk-ins', params] as const,
  visits: (params?: VisitListParams) => [...requestKeys.all, 'visits', params] as const,
  visitDetail: (id: string) => [...requestKeys.all, 'visit-detail', id] as const,
  receptionRequests: (params?: VisitListParams) => [...requestKeys.all, 'reception-requests', params] as const,
};

export function useRequestsQuery(params?: ListRequestsParams) {
  return useQuery<PaginatedResponse<RequestDto>>({
    queryKey: requestKeys.list(params),
    queryFn: ({ signal }) => requestApiService.list(params, { signal }),
    retry: false,
  });
}

export function useRequestQuery(id: string, enabled = true) {
  return useQuery<RequestDto>({
    queryKey: requestKeys.detail(id),
    queryFn: ({ signal }) => requestApiService.getById(id, { signal }),
    enabled: enabled && !!id,
    retry: false,
  });
}

export function useMyRequestsQuery() {
  return useQuery<RequestDto[]>({
    queryKey: requestKeys.myRequests(),
    queryFn: ({ signal }) => requestApiService.getMyRequests({ signal }),
    retry: false,
  });
}

export function usePendingApprovalsQuery(params?: PendingApprovalListParams, enabled = true) {
  return useQuery<PendingApprovalListResponse>({
    queryKey: requestKeys.pendingApprovals(params),
    queryFn: ({ signal }) => requestApiService.getPendingApprovals(params, { signal }),
    staleTime: 30 * 1000,
    enabled,
    retry: false,
  });
}

export function useCreateRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<RequestDto, Error, CreateRequestDto>({
    mutationFn: (data) => requestApiService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.myRequests() });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useApproveRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<RequestDto, Error, { id: string; data?: ApproveRequestDto }>({
    mutationFn: ({ id, data }) => requestApiService.approve(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(requestKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useRejectRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<RequestDto, Error, { id: string; data: RejectRequestDto }>({
    mutationFn: ({ id, data }) => requestApiService.reject(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(requestKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useCancelRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => requestApiService.cancel(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.myRequests() });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useBulkApproveRequestsMutation() {
  const queryClient = useQueryClient();

  return useMutation<BulkApprovalResponse, Error, BulkApprovePayload>({
    mutationFn: (payload) => requestApiService.bulkApprove(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ 
        queryKey: ['requests', 'pending-approvals'],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useBulkRejectRequestsMutation() {
  const queryClient = useQueryClient();

  return useMutation<BulkApprovalResponse, Error, BulkRejectPayload>({
    mutationFn: (payload) => requestApiService.bulkReject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ 
        queryKey: ['requests', 'pending-approvals'],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useApproveVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<ApproveVisitResponse, Error, { id: string; payload?: ApproveVisitPayload }>({
    mutationFn: ({ id, payload }) => requestApiService.approveVisit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ 
        queryKey: ['requests', 'pending-approvals'],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useRejectVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<RejectVisitResponse, Error, { id: string; payload: RejectVisitPayload }>({
    mutationFn: ({ id, payload }) => requestApiService.rejectVisit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ 
        queryKey: ['requests', 'pending-approvals'],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useAwaitingVisitorQuery(params?: AwaitingVisitorListParams, enabled = true) {
  return useQuery<AwaitingVisitorListResponse>({
    queryKey: requestKeys.awaitingVisitor(params),
    queryFn: ({ signal }) => requestApiService.getAwaitingVisitor(params, { signal }),
    staleTime: 30 * 1000,
    enabled,
    retry: false,
  });
}

export function usePendingHostWalkInsQuery(params?: PendingHostWalkInListParams, enabled = true) {
  return useQuery<PendingHostWalkInListResponse>({
    queryKey: requestKeys.pendingHostWalkIns(params),
    queryFn: ({ signal }) => requestApiService.getPendingHostWalkIns(params, { signal }),
    staleTime: 30 * 1000,
    enabled,
    retry: false,
  });
}

export function useVisitsQuery(params?: VisitListParams, enabled = true) {
  return useQuery<VisitListResponse>({
    queryKey: requestKeys.visits(params),
    queryFn: ({ signal }) => requestApiService.listVisits(params, { signal }),
    staleTime: 30 * 1000,
    enabled,
    retry: false,
  });
}

export function useDuplicateCheckQuery(params?: { date: string; phone?: string; email?: string }, enabled = true) {
  return useQuery<VisitListResponse>({
    queryKey: [...requestKeys.all, 'duplicate-check', params] as const,
    queryFn: ({ signal }) => requestApiService.checkDuplicateVisit(params || { date: '' }, { signal }),
    // Re-typing the same value (or a retry within the window) reuses the answer.
    staleTime: 30 * 1000,
    enabled: enabled && !!params?.date && !!(params?.phone || params?.email),
    retry: false,
  });
}

const DEFAULT_PAGE_SIZE = 20;

export function useInfiniteVisitsQuery(params?: Omit<VisitListParams, 'page'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...requestKeys.visits(params), 'infinite'] as const,
    queryFn: async ({ pageParam = 1, signal }) => {
      return requestApiService.listVisits(
        { ...params, page: pageParam, limit: params?.limit || DEFAULT_PAGE_SIZE },
        { signal },
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 30 * 1000,
    enabled,
    retry: false,
  });
}

export function useInfiniteReceptionRequestsQuery(params?: Omit<VisitListParams, 'page'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...requestKeys.receptionRequests(params), 'infinite'] as const,
    queryFn: async ({ pageParam = 1, signal }) => {
      return requestApiService.listReceptionRequests(
        { ...params, page: pageParam, limit: params?.limit || DEFAULT_PAGE_SIZE },
        { signal },
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 30 * 1000,
    enabled,
    retry: false,
  });
}

export function useInfinitePendingApprovalsQuery(params?: Omit<PendingApprovalListParams, 'page'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...requestKeys.pendingApprovals(params), 'infinite'] as const,
    queryFn: async ({ pageParam = 1, signal }) => {
      return requestApiService.getPendingApprovals(
        { ...params, page: pageParam, limit: params?.limit || DEFAULT_PAGE_SIZE },
        { signal },
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 30 * 1000,
    enabled,
    retry: false,
  });
}

export function useCreateVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateVisitResponse, Error, CreateVisitPayload>({
    mutationFn: (data) => requestApiService.createVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: requestKeys.visits() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useVisitDetailsQuery(id: string, enabled = true) {
  return useQuery<VisitDetailsDto>({
    queryKey: requestKeys.visitDetail(id),
    queryFn: ({ signal }) => requestApiService.getVisitById(id, { signal }),
    enabled: enabled && !!id,
    retry: false,
  });
}

export function useUpdateVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateVisitResponse, Error, { id: string; data: UpdateVisitPayload }>({
    mutationFn: ({ id, data }) => requestApiService.updateVisit(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.visitDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: requestKeys.visits() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useCancelVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<CancelVisitResponse, Error, string>({
    mutationFn: (id) => requestApiService.cancelVisit(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: requestKeys.visitDetail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: requestKeys.visits() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useHostApproveVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<HostApproveResponse, Error, { id: string; payload?: HostApprovePayload }>({
    mutationFn: ({ id, payload }) => requestApiService.hostApproveVisit(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.visitDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: requestKeys.visits() });
      queryClient.invalidateQueries({ queryKey: requestKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

export function useHostRejectVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<HostRejectResponse, Error, { id: string; payload: HostRejectPayload }>({
    mutationFn: ({ id, payload }) => requestApiService.hostRejectVisit(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.visitDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: requestKeys.visits() });
      queryClient.invalidateQueries({ queryKey: requestKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      invalidateDashboardKpis(queryClient);
    },
  });
}

// Manager Approval History Queries
export const approvalHistoryKeys = {
  all: ['approval-history'] as const,
  list: (params?: ApprovalHistoryListParams) => [...approvalHistoryKeys.all, 'list', params] as const,
};

export function useApprovalHistoryQuery(params?: ApprovalHistoryListParams, enabled = true) {
  return useQuery<ApprovalHistoryResponse>({
    queryKey: approvalHistoryKeys.list(params),
    queryFn: ({ signal }) => requestApiService.getApprovalHistory(params, { signal }),
    enabled,
    staleTime: 30 * 1000,
    retry: false,
  });
}

const APPROVAL_HISTORY_PAGE_SIZE = 20;

export function useInfiniteApprovalHistoryQuery(params?: Omit<ApprovalHistoryListParams, 'page'>) {
  return useInfiniteQuery<ApprovalHistoryResponse>({
    queryKey: [...approvalHistoryKeys.list(params), 'infinite'] as const,
    queryFn: async ({ pageParam = 1, signal }) => {
      return requestApiService.getApprovalHistory({ 
        ...params, 
        page: pageParam as number, 
        limit: params?.limit || APPROVAL_HISTORY_PAGE_SIZE 
      }, { signal });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) return undefined;
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    retry: false,
  });
}
