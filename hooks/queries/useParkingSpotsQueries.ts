import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parkingSpotsApiService } from '@/services/parkingSpotsApiService';
import type {
  ParkingSpotDto,
  CreateParkingSpotDto,
  UpdateParkingSpotDto,
  ListParkingSpotsParams,
  ParkingSpotsResponse,
} from '@/types/parkingSpots.types';
import type { ApiError } from '@/api/errors';

export const parkingSpotsKeys = {
  all: ['parkingSpots'] as const,
  lists: () => [...parkingSpotsKeys.all, 'list'] as const,
  list: (params?: ListParkingSpotsParams) => [...parkingSpotsKeys.lists(), params] as const,
  details: () => [...parkingSpotsKeys.all, 'detail'] as const,
  detail: (id: string) => [...parkingSpotsKeys.details(), id] as const,
};

export function useParkingSpotsQuery(params?: ListParkingSpotsParams) {
  return useQuery<ParkingSpotsResponse, ApiError>({
    queryKey: parkingSpotsKeys.list(params),
    queryFn: () => parkingSpotsApiService.list(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useParkingSpotDetailQuery(id: string, enabled = true) {
  return useQuery<ParkingSpotDto, ApiError>({
    queryKey: parkingSpotsKeys.detail(id),
    queryFn: () => parkingSpotsApiService.getById(id),
    enabled: enabled && !!id,
  });
}

export function useCreateParkingSpotMutation() {
  const queryClient = useQueryClient();

  return useMutation<ParkingSpotDto, ApiError, CreateParkingSpotDto>({
    mutationFn: (data) => parkingSpotsApiService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingSpotsKeys.lists() });
    },
  });
}

export function useUpdateParkingSpotMutation() {
  const queryClient = useQueryClient();

  return useMutation<ParkingSpotDto, ApiError, { id: string; data: UpdateParkingSpotDto }>({
    mutationFn: ({ id, data }) => parkingSpotsApiService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: parkingSpotsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: parkingSpotsKeys.detail(id) });
    },
  });
}

export function useDeleteParkingSpotMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => parkingSpotsApiService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingSpotsKeys.lists() });
    },
  });
}
