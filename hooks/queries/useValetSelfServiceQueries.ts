import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { valetSelfServiceApiService } from '@/services/valetSelfServiceApiService';
import type {
  CreateSelfValetRequestDto,
  SelfValetRequestDto,
  ListSelfValetRequestsParams,
  SelfValetRequestsResponse,
} from '@/types/api.types';
import type { ApiError } from '@/api/errors';

export const valetSelfServiceKeys = {
  all: ['valetSelfService'] as const,
  lists: () => [...valetSelfServiceKeys.all, 'list'] as const,
  list: (params?: ListSelfValetRequestsParams) => [...valetSelfServiceKeys.lists(), params] as const,
  details: () => [...valetSelfServiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...valetSelfServiceKeys.details(), id] as const,
};

export function useMyValetRequestsQuery(params?: ListSelfValetRequestsParams) {
  return useQuery<SelfValetRequestsResponse, ApiError>({
    queryKey: valetSelfServiceKeys.list(params),
    queryFn: () => valetSelfServiceApiService.list(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useMyValetRequestDetailQuery(id: string, enabled = true) {
  return useQuery<SelfValetRequestDto, ApiError>({
    queryKey: valetSelfServiceKeys.detail(id),
    queryFn: () => valetSelfServiceApiService.getById(id),
    enabled: enabled && !!id,
  });
}

export function useCreateSelfValetRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<SelfValetRequestDto, ApiError, CreateSelfValetRequestDto>({
    mutationFn: (data) => valetSelfServiceApiService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: valetSelfServiceKeys.lists() });
    },
  });
}
