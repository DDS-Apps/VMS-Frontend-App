import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicInviteService } from '@/services/api/publicInviteService';
import type { AcceptInviteDto, RejectInviteDto, PublicInviteDto } from '@/types/api.types';
import { useActiveVisitView } from '@/hooks/useActiveVisitView';
import { qrPollingInterval } from '@/utils/movementPolling';

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
    onSuccess: (response, variables) => {
      // Immediately update the cache with the submitted parking info
      // so the accepted screen shows the correct data without waiting for refetch
      queryClient.setQueryData(
        publicInviteKeys.byToken(token),
        (oldData: PublicInviteDto | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            qrCode: response.qrCode,
            status: 'visitor_accepted' as const,
            canAccept: false,
            canReject: false,
            visitorDecision: {
              accepted: true,
              decidedAt: new Date().toISOString(),
            },
            // Only the parking requirement is collected from visitors; vehicle
            // details are never part of the invite flow (see AcceptInviteDto).
            parkingInfo: variables?.needsParking ? {
              ...oldData.parkingInfo,
              needsParking: true,
            } : {
              ...oldData.parkingInfo,
              needsParking: false,
              licensePlate: null,
              carModel: null,
              carColor: null,
            },
          };
        }
      );
      // Also invalidate to get the server's authoritative data in background
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
