import { get, post, patch, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  InvitationDto,
  CreateInvitationDto,
  UpdateInvitationDto,
  RespondToInvitationDto,
  InvitationStatus,
} from '@/types/api.types';

const { invitations } = apiConfig.endpoints;

export interface ListInvitationsParams {
  page?: number;
  limit?: number;
  status?: InvitationStatus;
  hostId?: string;
  visitorId?: string;
  startDate?: string;
  endDate?: string;
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

export const invitationApiService = {
  list: (params?: ListInvitationsParams): Promise<PaginatedResponse<InvitationDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<InvitationDto>>(`${invitations.base}${queryString}`);
  },

  getById: (id: string): Promise<InvitationDto> => {
    return get<InvitationDto>(invitations.byId(id));
  },

  create: (data: CreateInvitationDto): Promise<InvitationDto> => {
    return post<InvitationDto, CreateInvitationDto>(invitations.base, data);
  },

  update: (id: string, data: UpdateInvitationDto): Promise<InvitationDto> => {
    return patch<InvitationDto, UpdateInvitationDto>(invitations.byId(id), data);
  },

  delete: (id: string): Promise<void> => {
    return del<void>(invitations.byId(id));
  },

  getToday: (): Promise<InvitationDto[]> => {
    return get<InvitationDto[]>(invitations.today);
  },

  getMyUpcoming: (): Promise<InvitationDto[]> => {
    return get<InvitationDto[]>(invitations.myUpcoming);
  },

  getByToken: (token: string): Promise<InvitationDto> => {
    return get<InvitationDto>(invitations.respond(token));
  },

  respond: (token: string, data: RespondToInvitationDto): Promise<InvitationDto> => {
    return post<InvitationDto, RespondToInvitationDto>(invitations.respond(token), data);
  },

  checkIn: (id: string): Promise<InvitationDto> => {
    return post<InvitationDto>(invitations.checkIn(id));
  },

  checkOut: (id: string): Promise<InvitationDto> => {
    return post<InvitationDto>(invitations.checkOut(id));
  },
};

export default invitationApiService;
