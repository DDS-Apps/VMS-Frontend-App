import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { notificationApiService } from '@/services/api/notificationApiService';
import type {
  NotificationItemDto,
  NotificationPreferences,
  UpdateNotificationPreferencesDto,
  SendNotificationPayload,
  RegisterDeviceTokenDto,
  DeviceTokenResponse,
  ListNotificationsParams,
  PaginatedResponse,
  UnreadCountResponse,
} from '@/types';
import { ApiError } from '@/api/errors';

type NotificationDto = NotificationItemDto;
type SendNotificationDto = SendNotificationPayload;

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: ListNotificationsParams) => [...notificationKeys.lists(), params] as const,
  detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
  // The account identity is part of this key. React Query otherwise retains
  // the previous user's unread count while a new session is being restored.
  unreadCounts: () => [...notificationKeys.all, 'unread-count'] as const,
  unreadCount: (accountId?: string) => [...notificationKeys.unreadCounts(), accountId ?? 'anonymous'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  deviceTokens: () => [...notificationKeys.all, 'device-tokens'] as const,
};

export function useNotificationsQuery(
  params?: ListNotificationsParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<NotificationDto>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<NotificationDto>, ApiError>({
    queryKey: notificationKeys.list(params),
    queryFn: ({ signal }) => notificationApiService.list(params, { signal }),
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
    queryFn: ({ signal }) => notificationApiService.getById(id, { signal }),
    enabled: !!id,
    ...options,
  });
}

const TWO_MINUTES = 2 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

export function useUnreadNotificationCountQuery(
  accountIdOrOptions?: string | Omit<UseQueryOptions<UnreadCountResponse, ApiError>, 'queryKey' | 'queryFn'>,
  maybeOptions?: Omit<UseQueryOptions<UnreadCountResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  const accountId = typeof accountIdOrOptions === 'string' ? accountIdOrOptions : undefined;
  const options = typeof accountIdOrOptions === 'string' ? maybeOptions : accountIdOrOptions;
  return useQuery<UnreadCountResponse, ApiError>({
    queryKey: notificationKeys.unreadCount(accountId),
    queryFn: ({ signal }) => notificationApiService.getUnreadCount({ signal }),
    staleTime: ONE_MINUTE,
    refetchInterval: TWO_MINUTES,
    // Polling is deliberately owned by this account-scoped query. Recoverable
    // failures are surfaced with the retained count and the explicit Retry
    // action rather than multiplying background retries.
    retry: false,
    ...options,
  });
}

export function useNotificationPreferencesQuery(
  options?: Omit<UseQueryOptions<NotificationPreferences, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<NotificationPreferences, ApiError>({
    queryKey: notificationKeys.preferences(),
    queryFn: ({ signal }) => notificationApiService.getPreferences({ signal }),
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
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
    },
  });
}

export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ count: number }, ApiError>({
    mutationFn: () => notificationApiService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
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
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
    },
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    NotificationPreferences,
    ApiError,
    UpdateNotificationPreferencesDto,
    { previousPrefs: NotificationPreferences | undefined }
  >({
    mutationFn: (preferences) => notificationApiService.updatePreferences(preferences),
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences() });
      const previousPrefs = queryClient.getQueryData<NotificationPreferences>(notificationKeys.preferences());
      if (previousPrefs) {
        queryClient.setQueryData<NotificationPreferences>(notificationKeys.preferences(), {
          ...previousPrefs,
          ...newPrefs,
        });
      }
      return { previousPrefs };
    },
    onError: (_err, _newPrefs, context) => {
      if (context?.previousPrefs) {
        queryClient.setQueryData(notificationKeys.preferences(), context.previousPrefs);
      }
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
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
