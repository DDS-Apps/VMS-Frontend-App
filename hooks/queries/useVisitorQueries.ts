import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitorApiService, type ListVisitorsParams } from '@/services/api/visitorApiService';
import type { VisitorDto, CreateVisitorDto, UpdateVisitorDto } from '@/types/api.types';
import type { PaginatedResponse } from '@/types';

export const visitorKeys = {
  all: ['visitors'] as const,
  lists: () => [...visitorKeys.all, 'list'] as const,
  list: (params?: ListVisitorsParams) => [...visitorKeys.lists(), params] as const,
  details: () => [...visitorKeys.all, 'detail'] as const,
  detail: (id: string) => [...visitorKeys.details(), id] as const,
  blacklisted: () => [...visitorKeys.all, 'blacklisted'] as const,
};

export function useVisitorsQuery(params?: ListVisitorsParams) {
  return useQuery<PaginatedResponse<VisitorDto>>({
    queryKey: visitorKeys.list(params),
    queryFn: () => visitorApiService.list(params),
  });
}

export function useVisitorQuery(id: string, enabled = true) {
  return useQuery<VisitorDto>({
    queryKey: visitorKeys.detail(id),
    queryFn: () => visitorApiService.getById(id),
    enabled: enabled && !!id,
  });
}

export function useBlacklistedVisitorsQuery() {
  return useQuery<VisitorDto[]>({
    queryKey: visitorKeys.blacklisted(),
    queryFn: () => visitorApiService.getBlacklisted(),
  });
}

export function useCreateVisitorMutation() {
  const queryClient = useQueryClient();

  return useMutation<VisitorDto, Error, CreateVisitorDto>({
    mutationFn: (data) => visitorApiService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.lists() });
    },
  });
}

export function useUpdateVisitorMutation() {
  const queryClient = useQueryClient();

  return useMutation<VisitorDto, Error, { id: string; data: UpdateVisitorDto }>({
    mutationFn: ({ id, data }) => visitorApiService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(visitorKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: visitorKeys.lists() });
    },
  });
}

export function useBlacklistVisitorMutation() {
  const queryClient = useQueryClient();

  return useMutation<VisitorDto, Error, { id: string; isBlacklisted: boolean; reason?: string }>({
    mutationFn: ({ id, isBlacklisted, reason }) =>
      visitorApiService.blacklist(id, isBlacklisted, reason),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(visitorKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: visitorKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.blacklisted() });
    },
  });
}
