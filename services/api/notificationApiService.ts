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

interface ApiNotificationItem {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message?: string;
  body?: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  read?: boolean;
  isRead?: boolean;
  readAt?: string;
  timestamp?: string;
  createdAt?: string;
  expiresAt?: string;
  actionRequired?: boolean;
  params?: {
    visitorName?: string;
    hostName?: string;
    managerName?: string;
    reason?: string;
    cancelledBy?: string;
    updatedBy?: string;
    company?: string;
    roomName?: string;
    error?: string;
    [key: string]: string | undefined;
  };
}

interface ApiPaginatedNotifications {
  data: ApiNotificationItem[];
  unreadCount?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

const typeMapping: Record<string, NotificationEventType> = {
  'request_submitted': 'request_created',
  'request_created': 'request_created',
  'request_approved': 'request_approved',
  'request_rejected': 'request_rejected',
  'request_cancelled': 'request_cancelled',
  'request_updated': 'request_updated',
};

function mapApiNotificationToDto(item: ApiNotificationItem): NotificationItemDto {
  const mappedType = typeMapping[item.type] || (item.type as NotificationEventType);
  
  const dataParams: Record<string, string | undefined> = {};
  if (item.data) {
    if (item.data.visitorName) dataParams.visitorName = String(item.data.visitorName);
    if (item.data.hostName) dataParams.hostName = String(item.data.hostName);
    if (item.data.managerName) dataParams.managerName = String(item.data.managerName);
    if (item.data.reason) dataParams.reason = String(item.data.reason);
    if (item.data.cancelledBy) dataParams.cancelledBy = String(item.data.cancelledBy);
    if (item.data.updatedBy) dataParams.updatedBy = String(item.data.updatedBy);
    if (item.data.company) dataParams.company = String(item.data.company);
    if (item.data.roomName) dataParams.roomName = String(item.data.roomName);
    if (item.data.visitDate) dataParams.visitDate = String(item.data.visitDate);
    if (item.data.visitTime) dataParams.visitTime = String(item.data.visitTime);
    if (item.data.visitorCount) dataParams.visitorCount = String(item.data.visitorCount);
    if (item.data.error) dataParams.error = String(item.data.error);
  }
  
  const mergedParams = {
    ...dataParams,
    ...item.params,
  };
  
  const hasParams = Object.values(mergedParams).some(v => v !== undefined);
  
  return {
    id: item.id,
    userId: item.userId || '',
    type: mappedType,
    title: item.title,
    body: item.body || item.message || '',
    data: item.data,
    priority: item.priority || 'medium',
    channels: item.channels || ['in_app'],
    isRead: item.isRead ?? item.read ?? false,
    readAt: item.readAt,
    createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
    expiresAt: item.expiresAt,
    params: hasParams ? mergedParams : item.params,
  };
}

function mapApiResponse(response: ApiPaginatedNotifications): PaginatedResponse<NotificationItemDto> {
  const pagination = response.pagination || {
    page: response.page || 1,
    limit: response.limit || 50,
    total: response.total || response.data.length,
    totalPages: response.totalPages || 1,
  };
  
  return {
    data: response.data.map(mapApiNotificationToDto),
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages: pagination.totalPages,
  };
}

export const notificationApiService = {
  list: async (params?: ListNotificationsParams): Promise<PaginatedResponse<NotificationItemDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    const response = await get<ApiPaginatedNotifications>(`${notifications}${queryString}`);
    return mapApiResponse(response);
  },

  getById: async (id: string): Promise<NotificationItemDto> => {
    const response = await get<ApiNotificationItem>(`${notifications}/${id}`);
    return mapApiNotificationToDto(response);
  },

  markAsRead: async (id: string): Promise<NotificationItemDto> => {
    const response = await patch<ApiNotificationItem>(`${notifications}/${id}/read`);
    return mapApiNotificationToDto(response);
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
