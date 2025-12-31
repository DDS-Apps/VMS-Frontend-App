import { get, post, patch, put, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import {
  NotificationEventType,
  NotificationPriority,
  NotificationChannel,
  NotificationItemDto,
  UnreadCountResponse,
  NotificationPreferences,
  UpdateNotificationPreferencesDto,
  RegisterDeviceTokenDto,
  DeviceTokenResponse,
  SendNotificationPayload,
  ListNotificationsParams,
  PaginatedResponse,
} from '@/types';

const { notifications, auth, admin } = apiConfig.endpoints;

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const notificationApiService = {
  list: (params?: ListNotificationsParams): Promise<PaginatedResponse<NotificationItemDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<NotificationItemDto>>(`${notifications}${queryString}`);
  },

  getById: (id: string): Promise<NotificationItemDto> => {
    return get<NotificationItemDto>(`${notifications}/${id}`);
  },

  markAsRead: (id: string): Promise<NotificationItemDto> => {
    return patch<NotificationItemDto>(`${notifications}/${id}/read`);
  },

  markAllAsRead: (): Promise<{ count: number }> => {
    return post<{ count: number }>(`${notifications}/mark-all-read`);
  },

  delete: (id: string): Promise<void> => {
    return del<void>(`${notifications}/${id}`);
  },

  getUnreadCount: (): Promise<UnreadCountResponse> => {
    return get<UnreadCountResponse>(`${notifications}/unread-count`);
  },

  getPreferences: (): Promise<NotificationPreferences> => {
    return get<NotificationPreferences>(auth.notificationPreferences);
  },

  updatePreferences: (preferences: UpdateNotificationPreferencesDto): Promise<NotificationPreferences> => {
    return put<NotificationPreferences, UpdateNotificationPreferencesDto>(
      auth.notificationPreferences,
      preferences
    );
  },

  registerDeviceToken: (data: RegisterDeviceTokenDto): Promise<DeviceTokenResponse> => {
    return post<DeviceTokenResponse, RegisterDeviceTokenDto>(`${notifications}/device-tokens`, data);
  },

  removeDeviceToken: (tokenId: string): Promise<void> => {
    return del<void>(`${notifications}/device-tokens/${tokenId}`);
  },

  send: (data: SendNotificationPayload): Promise<NotificationItemDto> => {
    return post<NotificationItemDto, SendNotificationPayload>(`${notifications}/send`, data);
  },

  sendBroadcast: (data: Omit<SendNotificationPayload, 'userId' | 'userIds'>): Promise<{ sent: number }> => {
    return post<{ sent: number }, Omit<SendNotificationPayload, 'userId' | 'userIds'>>(
      admin.notifications.send,
      data
    );
  },
};

export default notificationApiService;
