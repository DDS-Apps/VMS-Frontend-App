import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicInviteService } from '@/services/publicInviteService';
import type { AcceptInviteDto, RejectInviteDto } from '@/types/api.types';

export const publicInviteKeys = {
  all: ['publicInvites'] as const,
  byToken: (token: string) => [...publicInviteKeys.all, 'byToken', token] as const,
};

export function usePublicInviteQuery(token: string | undefined) {
  return useQuery({
    queryKey: publicInviteKeys.byToken(token || ''),
    queryFn: () => publicInviteService.getByToken(token!),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useAcceptInviteMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: AcceptInviteDto) => publicInviteService.accept(token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicInviteKeys.byToken(token) });
    },
  });
}

export function useRejectInviteMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: RejectInviteDto) => publicInviteService.reject(token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicInviteKeys.byToken(token) });
    },
  });
}
