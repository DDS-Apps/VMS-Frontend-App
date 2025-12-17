import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  parkingApiService, 
  type ListParkingSpacesParams, 
  type ListParkingAllocationsParams 
} from '@/services/parkingApiService';
import type {
  ParkingSpaceDto,
  ParkingAllocationDto,
  CreateParkingSpaceDto,
  UpdateParkingSpaceDto,
  AllocateParkingDto,
  PaginatedResponse,
  ParkingStatsDto,
  ParkingLocation,
} from '@/types/api.types';

export const parkingKeys = {
  all: ['parking'] as const,
  spaces: () => [...parkingKeys.all, 'spaces'] as const,
  spacesList: (params?: ListParkingSpacesParams) => [...parkingKeys.spaces(), 'list', params] as const,
  spaceDetail: (id: string) => [...parkingKeys.spaces(), 'detail', id] as const,
  availableSpaces: (location?: ParkingLocation) => [...parkingKeys.spaces(), 'available', location] as const,
  allocations: () => [...parkingKeys.all, 'allocations'] as const,
  allocationsList: (params?: ListParkingAllocationsParams) => [...parkingKeys.allocations(), 'list', params] as const,
  stats: () => [...parkingKeys.all, 'stats'] as const,
};

export function useParkingSpacesQuery(params?: ListParkingSpacesParams) {
  return useQuery<PaginatedResponse<ParkingSpaceDto>>({
    queryKey: parkingKeys.spacesList(params),
    queryFn: () => parkingApiService.listSpaces(params),
  });
}

export function useParkingSpaceQuery(id: string, enabled = true) {
  return useQuery<ParkingSpaceDto>({
    queryKey: parkingKeys.spaceDetail(id),
    queryFn: () => parkingApiService.getSpace(id),
    enabled: enabled && !!id,
  });
}

export function useAvailableParkingSpacesQuery(location?: ParkingLocation) {
  return useQuery<ParkingSpaceDto[]>({
    queryKey: parkingKeys.availableSpaces(location),
    queryFn: () => parkingApiService.getAvailableSpaces(location),
  });
}

export function useParkingAllocationsQuery(params?: ListParkingAllocationsParams) {
  return useQuery<PaginatedResponse<ParkingAllocationDto>>({
    queryKey: parkingKeys.allocationsList(params),
    queryFn: () => parkingApiService.listAllocations(params),
  });
}

export function useParkingStatsQuery() {
  return useQuery<ParkingStatsDto>({
    queryKey: parkingKeys.stats(),
    queryFn: () => parkingApiService.getStats(),
    staleTime: 60 * 1000,
  });
}

export function useCreateParkingSpaceMutation() {
  const queryClient = useQueryClient();

  return useMutation<ParkingSpaceDto, Error, CreateParkingSpaceDto>({
    mutationFn: (data) => parkingApiService.createSpace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingKeys.spaces() });
      queryClient.invalidateQueries({ queryKey: parkingKeys.stats() });
    },
  });
}

export function useUpdateParkingSpaceMutation() {
  const queryClient = useQueryClient();

  return useMutation<ParkingSpaceDto, Error, { id: string; data: UpdateParkingSpaceDto }>({
    mutationFn: ({ id, data }) => parkingApiService.updateSpace(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(parkingKeys.spaceDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: parkingKeys.spaces() });
      queryClient.invalidateQueries({ queryKey: parkingKeys.stats() });
    },
  });
}

export function useAutoAllocateParkingMutation() {
  const queryClient = useQueryClient();

  return useMutation<ParkingAllocationDto, Error, AllocateParkingDto>({
    mutationFn: (data) => parkingApiService.autoAllocate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useManualAllocateParkingMutation() {
  const queryClient = useQueryClient();

  return useMutation<ParkingAllocationDto, Error, { spaceId: string; data: AllocateParkingDto }>({
    mutationFn: ({ spaceId, data }) => parkingApiService.manualAllocate(spaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useParkingCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation<ParkingAllocationDto, Error, string>({
    mutationFn: (allocationId) => parkingApiService.checkIn(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingKeys.allocations() });
      queryClient.invalidateQueries({ queryKey: parkingKeys.spaces() });
      queryClient.invalidateQueries({ queryKey: parkingKeys.stats() });
    },
  });
}

export function useParkingCheckOutMutation() {
  const queryClient = useQueryClient();

  return useMutation<ParkingAllocationDto, Error, string>({
    mutationFn: (allocationId) => parkingApiService.checkOut(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingKeys.allocations() });
      queryClient.invalidateQueries({ queryKey: parkingKeys.spaces() });
      queryClient.invalidateQueries({ queryKey: parkingKeys.stats() });
    },
  });
}

export function useReleaseParkingMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (allocationId) => parkingApiService.release(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}
