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

export const requestApiService = {
  list: (params?: ListRequestsParams): Promise<PaginatedResponse<RequestDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<RequestDto>>(`${requests.base}${queryString}`);
  },

  getById: (id: string): Promise<RequestDto> => {
    return get<RequestDto>(requests.byId(id));
  },

  create: (data: CreateRequestDto): Promise<RequestDto> => {
    return post<RequestDto, CreateRequestDto>(requests.base, data);
  },

  getMyRequests: (): Promise<RequestDto[]> => {
    return get<RequestDto[]>(requests.myRequests);
  },

  getPendingApprovals: (params?: PendingApprovalListParams): Promise<PendingApprovalListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PendingApprovalListResponse>(`${approvals.pending}${queryString}`);
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

  getAwaitingVisitor: (params?: AwaitingVisitorListParams): Promise<AwaitingVisitorListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<AwaitingVisitorListResponse>(`${approvals.awaitingVisitor}${queryString}`);
  },

  getPendingHostWalkIns: (params?: PendingHostWalkInListParams): Promise<PendingHostWalkInListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PendingHostWalkInListResponse>(`${approvals.pendingHost}${queryString}`);
  },

  listVisits: (params?: VisitListParams): Promise<VisitListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<VisitListResponse>(`${visits.base}${queryString}`);
  },

  listReceptionRequests: (params?: VisitListParams): Promise<VisitListResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<VisitListResponse>(`${reception.requests}${queryString}`);
  },

  createVisit: async (data: CreateVisitPayload): Promise<CreateVisitResponse> => {
    console.log('[requestApiService.createVisit] Sending POST to:', visits.base);
    console.log('[requestApiService.createVisit] Payload:', JSON.stringify(data, null, 2));
    try {
      const result = await post<CreateVisitResponse, CreateVisitPayload>(visits.base, data);
      console.log('[requestApiService.createVisit] Response received:', result);
      return result;
    } catch (error) {
      console.error('[requestApiService.createVisit] Error:', error);
      throw error;
    }
  },

  getVisitById: (id: string): Promise<VisitDetailsDto> => {
    return get<VisitDetailsDto>(visits.byId(id));
  },

  updateVisit: (id: string, data: UpdateVisitPayload): Promise<UpdateVisitResponse> => {
    return put<UpdateVisitResponse, UpdateVisitPayload>(visits.byId(id), data);
  },

  cancelVisit: (id: string): Promise<CancelVisitResponse> => {
    return del<CancelVisitResponse>(visits.byId(id));
  },

  hostApproveVisit: (id: string, payload?: HostApprovePayload): Promise<HostApproveResponse> => {
    return post<HostApproveResponse, HostApprovePayload | undefined>(visits.hostApprove(id), payload);
  },

  hostRejectVisit: (id: string, payload: HostRejectPayload): Promise<HostRejectResponse> => {
    return post<HostRejectResponse, HostRejectPayload>(visits.hostReject(id), payload);
  },
};

export default requestApiService;
