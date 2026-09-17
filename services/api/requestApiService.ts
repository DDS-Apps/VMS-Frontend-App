import { get, post, put, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  RequestDto,
  CreateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  RequestStatus,
  PendingApprovalDto,
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

const { requests, approvals, visits, reception } = apiConfig.endpoints;

export interface ListRequestsParams {
  page?: number;
  limit?: number;
  status?: RequestStatus;
  requesterId?: string;
  approverId?: string;
  requestType?: string;
}

export interface RequestReadOptions {
  signal?: AbortSignal;
}

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

function normalizeUpdateVisitServices(
  data: UpdateVisitPayload,
): UpdateVisitPayload {
  if (data.needsBuffet === true && data.needsMeetingRoom !== true) {
    return {
      ...data,
      needsMeetingRoom: true,
    };
  }

  return data;
}

export const requestApiService = {
  list: (params?: ListRequestsParams, options?: RequestReadOptions): Promise<PaginatedResponse<RequestDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<RequestDto>>(`${requests.base}${queryString}`, undefined, options);
  },

  getById: (id: string, options?: RequestReadOptions): Promise<RequestDto> => {
    return get<RequestDto>(requests.byId(id), undefined, options);
  },

  create: (data: CreateRequestDto): Promise<RequestDto> => {
    return post<RequestDto, CreateRequestDto>(requests.base, data);
  },

  getMyRequests: (options?: RequestReadOptions): Promise<RequestDto[]> => {
    return get<RequestDto[]>(requests.myRequests, undefined, options);
  },

  getPendingApprovals: (
    params?: PendingApprovalListParams,
    options?: RequestReadOptions,
  ): Promise<PendingApprovalListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PendingApprovalListResponse>(`${approvals.pending}${queryString}`, undefined, options);
  },

  approve: (id: string, data?: ApproveRequestDto): Promise<RequestDto> => {
    return post<RequestDto, ApproveRequestDto | undefined>(requests.approve(id), data);
  },

  reject: (id: string, data: RejectRequestDto): Promise<RequestDto> => {
    return post<RequestDto, RejectRequestDto>(requests.reject(id), data);
  },

  cancel: (id: string): Promise<void> => {
    return del<void>(requests.byId(id));
  },

  approveVisit: (id: string, payload?: ApproveVisitPayload): Promise<ApproveVisitResponse> => {
    return post<ApproveVisitResponse, ApproveVisitPayload | undefined>(visits.approve(id), payload);
  },

  rejectVisit: (id: string, payload: RejectVisitPayload): Promise<RejectVisitResponse> => {
    return post<RejectVisitResponse, RejectVisitPayload>(visits.reject(id), payload);
  },

  bulkApprove: (payload: BulkApprovePayload): Promise<BulkApprovalResponse> => {
    return post<BulkApprovalResponse, BulkApprovePayload>(approvals.bulkApprove, payload);
  },

  bulkReject: (payload: BulkRejectPayload): Promise<BulkApprovalResponse> => {
    return post<BulkApprovalResponse, BulkRejectPayload>(approvals.bulkReject, payload);
  },

  getAwaitingVisitor: (
    params?: AwaitingVisitorListParams,
    options?: RequestReadOptions,
  ): Promise<AwaitingVisitorListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<AwaitingVisitorListResponse>(`${approvals.awaitingVisitor}${queryString}`, undefined, options);
  },

  getPendingHostWalkIns: (
    params?: PendingHostWalkInListParams,
    options?: RequestReadOptions,
  ): Promise<PendingHostWalkInListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PendingHostWalkInListResponse>(`${approvals.pendingHost}${queryString}`, undefined, options);
  },

  listVisits: (params?: VisitListParams, options?: RequestReadOptions): Promise<VisitListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<VisitListResponse>(`${visits.base}${queryString}`, undefined, options);
  },

  listReceptionRequests: (params?: VisitListParams, options?: RequestReadOptions): Promise<VisitListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<VisitListResponse>(`${reception.requests}${queryString}`, undefined, options);
  },

  createVisit: async (data: CreateVisitPayload): Promise<CreateVisitResponse> => {
    return post<CreateVisitResponse, CreateVisitPayload>(visits.base, data);
  },

  getVisitById: (id: string, options?: RequestReadOptions): Promise<VisitDetailsDto> => {
    return get<VisitDetailsDto>(visits.byId(id), undefined, options);
  },

  updateVisit: (id: string, data: UpdateVisitPayload): Promise<UpdateVisitResponse> => {
    return put<UpdateVisitResponse, UpdateVisitPayload>(
      visits.byId(id),
      normalizeUpdateVisitServices(data),
    );
  },

  cancelVisit: (id: string): Promise<CancelVisitResponse> => {
    return del<CancelVisitResponse>(visits.byId(id)) as Promise<CancelVisitResponse>;
  },

  hostApproveVisit: (id: string, payload?: HostApprovePayload): Promise<HostApproveResponse> => {
    return post<HostApproveResponse, HostApprovePayload | undefined>(visits.hostApprove(id), payload);
  },

  hostRejectVisit: (id: string, payload: HostRejectPayload): Promise<HostRejectResponse> => {
    return post<HostRejectResponse, HostRejectPayload>(visits.hostReject(id), payload);
  },

  getApprovalHistory: (
    params?: ApprovalHistoryListParams,
    options?: RequestReadOptions,
  ): Promise<ApprovalHistoryResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<ApprovalHistoryResponse>(`${approvals.history}${queryString}`, undefined, options);
  },

  checkDuplicateVisit: async (
    params: { date: string; phone?: string; email?: string },
    options?: RequestReadOptions,
  ): Promise<VisitListResponse> => {
    const queryString = buildQueryString(params as unknown as Record<string, unknown>);
    return get<VisitListResponse>(`${visits.base}${queryString}`, undefined, options);
  },
};

export default requestApiService;
