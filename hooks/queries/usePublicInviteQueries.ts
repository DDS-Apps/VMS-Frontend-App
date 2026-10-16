import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicInviteService } from '@/services/api/publicInviteService';
import type { AcceptInviteDto, RejectInviteDto, PublicInviteDto } from '@/types/api.types';
import { useActiveVisitView } from '@/hooks/useActiveVisitView';
import { qrPollingInterval } from '@/utils/movementPolling';
import { refreshAfterPendingRead } from './invalidateMovementSummaries';

export const publicInviteKeys = {
  all: ['publicInvites'] as const,
  byToken: (token: string) => [...publicInviteKeys.all, 'byToken', token] as const,
};

export function usePublicInviteQuery(token: string | undefined) {
  const active = useActiveVisitView();
  return useQuery({
    queryKey: publicInviteKeys.byToken(token || ''),
    queryFn: () => publicInviteService.getByToken(token!),
    enabled: !!token && active,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: query => active ? qrPollingInterval(query.state.data, query.state.error) : false,
    refetchIntervalInBackground: false,
  });
}

export function useAcceptInviteMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: AcceptInviteDto) => publicInviteService.accept(token, data),
    onSuccess: async () => {
      // Wait out any pre-action read, then obtain the current QR and decision
      // permissions. Never resurrect a mutation-result QR over a newer GET/410.
      const query = queryClient.getQueryCache().find({ queryKey: publicInviteKeys.byToken(token), exact: true });
      if (query) await refreshAfterPendingRead(queryClient, query);
    },
  });
}

export function useRejectInviteMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: RejectInviteDto) => publicInviteService.reject(token, data),
    onSuccess: async () => {
      const query = queryClient.getQueryCache().find({ queryKey: publicInviteKeys.byToken(token), exact: true });
      if (query) await refreshAfterPendingRead(queryClient, query);
    },
  });
}
