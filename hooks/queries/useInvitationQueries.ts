import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invitationApiService, type ListInvitationsParams } from '@/services/api/invitationApiService';
import type { PaginatedResponse } from '@/types';
import type {
  InvitationDto,
  CreateInvitationDto,
  UpdateInvitationDto,
  RespondToInvitationDto,
} from '@/types/api.types';

export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (params?: ListInvitationsParams) => [...invitationKeys.lists(), params] as const,
  details: () => [...invitationKeys.all, 'detail'] as const,
  detail: (id: string) => [...invitationKeys.details(), id] as const,
  today: () => [...invitationKeys.all, 'today'] as const,
  myUpcoming: () => [...invitationKeys.all, 'my-upcoming'] as const,
  byToken: (token: string) => [...invitationKeys.all, 'token', token] as const,
};

export function useInvitationsQuery(params?: ListInvitationsParams, enabled = true) {
  return useQuery<PaginatedResponse<InvitationDto>>({
    queryKey: invitationKeys.list(params),
    queryFn: () => invitationApiService.list(params),
    enabled,
  });
}

export function useInvitationQuery(id: string, enabled = true) {
  return useQuery<InvitationDto>({
    queryKey: invitationKeys.detail(id),
    queryFn: () => invitationApiService.getById(id),
    enabled: enabled && !!id,
  });
}

export function useTodaysInvitationsQuery() {
  return useQuery<InvitationDto[]>({
    queryKey: invitationKeys.today(),
    queryFn: () => invitationApiService.getToday(),
    staleTime: 30 * 1000,
  });
}

export function useMyUpcomingInvitationsQuery() {
  return useQuery<InvitationDto[]>({
    queryKey: invitationKeys.myUpcoming(),
    queryFn: () => invitationApiService.getMyUpcoming(),
  });
}

export function useInvitationByTokenQuery(token: string, enabled = true) {
  return useQuery<InvitationDto>({
    queryKey: invitationKeys.byToken(token),
    queryFn: () => invitationApiService.getByToken(token),
    enabled: enabled && !!token,
  });
}

export function useCreateInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation<InvitationDto, Error, CreateInvitationDto>({
    mutationFn: (data) => invitationApiService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.today() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.myUpcoming() });
    },
  });
}

export function useUpdateInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation<InvitationDto, Error, { id: string; data: UpdateInvitationDto }>({
    mutationFn: ({ id, data }) => invitationApiService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(invitationKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.today() });
    },
  });
}

export function useDeleteInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => invitationApiService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: invitationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.today() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.myUpcoming() });
    },
  });
}

export function useRespondToInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation<InvitationDto, Error, { token: string; data: RespondToInvitationDto }>({
    mutationFn: ({ token, data }) => invitationApiService.respond(token, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(invitationKeys.byToken(variables.token), data);
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
    },
  });
}

export function useCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation<InvitationDto, Error, string>({
    mutationFn: (id) => invitationApiService.checkIn(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(invitationKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.today() });
    },
  });
}

export function useCheckOutMutation() {
  const queryClient = useQueryClient();

  return useMutation<InvitationDto, Error, string>({
    mutationFn: (id) => invitationApiService.checkOut(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(invitationKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.today() });
    },
  });
}
