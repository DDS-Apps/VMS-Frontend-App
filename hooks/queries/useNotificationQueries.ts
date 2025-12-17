import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { notificationApiService } from '@/services/notificationApiService';
import type {
  NotificationDto,
  NotificationPreferences,
  UpdateNotificationPreferencesDto,
  SendNotificationDto,
  RegisterDeviceTokenDto,
  DeviceTokenResponse,
  ListNotificationsParams,
  PaginatedResponse,
  UnreadCountResponse,
} from '@/services/notificationApiService';
import { ApiError } from '@/api/errors';

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: ListNotificationsParams) => [...notificationKeys.lists(), params] as const,
  detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  deviceTokens: () => [...notificationKeys.all, 'device-tokens'] as const,
};

export function useNotificationsQuery(
  params?: ListNotificationsParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<NotificationDto>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<NotificationDto>, ApiError>({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApiService.list(params),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useNotificationQuery(
  id: string,
  options?: Omit<UseQueryOptions<NotificationDto, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<NotificationDto, ApiError>({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationApiService.getById(id),
    enabled: !!id,
    ...options,
  });
}

export function useUnreadNotificationCountQuery(
  options?: Omit<UseQueryOptions<UnreadCountResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<UnreadCountResponse, ApiError>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationApiService.getUnreadCount(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

export function useNotificationPreferencesQuery(
  options?: Omit<UseQueryOptions<NotificationPreferences, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<NotificationPreferences, ApiError>({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationApiService.getPreferences(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useMarkNotificationAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<NotificationDto, ApiError, string>({
    mutationFn: (id) => notificationApiService.markAsRead(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(notificationKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ count: number }, ApiError>({
    mutationFn: () => notificationApiService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => notificationApiService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: notificationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation<NotificationPreferences, ApiError, UpdateNotificationPreferencesDto>({
    mutationFn: (preferences) => notificationApiService.updatePreferences(preferences),
    onSuccess: (data) => {
      queryClient.setQueryData(notificationKeys.preferences(), data);
    },
  });
}

export function useRegisterDeviceTokenMutation() {
  const queryClient = useQueryClient();

  return useMutation<DeviceTokenResponse, ApiError, RegisterDeviceTokenDto>({
    mutationFn: (data) => notificationApiService.registerDeviceToken(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.deviceTokens() });
    },
  });
}

export function useRemoveDeviceTokenMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (tokenId) => notificationApiService.removeDeviceToken(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.deviceTokens() });
    },
  });
}

export function useSendNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation<NotificationDto, ApiError, SendNotificationDto>({
    mutationFn: (data) => notificationApiService.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

export function useBroadcastNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ sent: number }, ApiError, Omit<SendNotificationDto, 'userId' | 'userIds'>>({
    mutationFn: (data) => notificationApiService.sendBroadcast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}
