import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicInviteService } from '@/services/api/publicInviteService';
import type { AcceptInviteDto, RejectInviteDto, PublicInviteDto } from '@/types/api.types';

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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}

export function useAcceptInviteMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: AcceptInviteDto) => publicInviteService.accept(token, data),
    onSuccess: (_response, variables) => {
      // Immediately update the cache with the submitted parking info
      // so the accepted screen shows the correct data without waiting for refetch
      queryClient.setQueryData(
        publicInviteKeys.byToken(token),
        (oldData: PublicInviteDto | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            status: 'visitor_accepted' as const,
            canAccept: false,
            canReject: false,
            visitorDecision: {
              accepted: true,
              decidedAt: new Date().toISOString(),
            },
            parkingInfo: variables?.needsParking ? {
              ...oldData.parkingInfo,
              needsParking: true,
              licensePlate: variables.licensePlate || null,
              carModel: variables.carModel || null,
              carColor: variables.carColor || null,
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
