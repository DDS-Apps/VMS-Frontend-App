export type NotificationEventType =
  | 'request_created'
  | 'request_approved'
  | 'request_rejected'
  | 'request_cancelled'
  | 'request_updated'
  | 'pending_approval'
  | 'visitor_accepted'
  | 'visitor_rejected'
  | 'visitor_arrival'
  | 'visitor_no_show'
  | 'check_in'
  | 'check_out'
  | 'reminder_tomorrow'
  | 'reminder_2hours'
  | 'reminder_30min'
  | 'reminder_now'
  | 'expected_today'
  | 'auto_cancelled'
  | 'room_booked'
  | 'room_reminder'
  | 'room_cancelled'
  | 'room_conflict'
  | 'room_reassigned'
  | 'parking_assigned'
  | 'parking_full'
  | 'buffet_new_request'
  | 'buffet_request_created'
  | 'buffet_task_assigned'
  | 'buffet_scheduled'
  | 'buffet_status_update'
  | 'buffet_staff_update'
  | 'buffet_completed'
  | 'valet_new_request'
  | 'valet_task_assigned'
  | 'valet_scheduled'
  | 'valet_completed'
  | 'valet_cancelled'
  | 'security_access_update'
  | 'security_gate_pass';

export type NotificationPriority = 'high' | 'medium' | 'low';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'whatsapp' | 'in_app';

export type DevicePlatform = 'ios' | 'android' | 'web';

export interface NotificationItemDto {
  id: string;
  userId: string;
  type: NotificationEventType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  visitReminders: boolean;
  approvalRequests: boolean;
  checkInOut: boolean;
  dailyAgenda: boolean;
}

export interface UpdateNotificationPreferencesDto {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  pushEnabled?: boolean;
  visitReminders?: boolean;
  approvalRequests?: boolean;
  checkInOut?: boolean;
  dailyAgenda?: boolean;
}

export interface RegisterDeviceTokenDto {
  deviceToken: string;
  platform: DevicePlatform;
  deviceName?: string;
  deviceModel?: string;
  appVersion?: string;
}

export interface DeviceTokenResponse {
  id: string;
  platform: DevicePlatform;
  deviceName?: string;
  isActive: boolean;
  registeredAt: string;
}

export interface DeviceListResponse {
  devices: DeviceTokenResponse[];
  count: number;
}

export interface PushStatusResponse {
  pushEnabled: boolean;
  registeredDevices: number;
  platforms: DevicePlatform[];
}

export interface TestNotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: {
    type?: string;
    requestId?: string;
    visitorName?: string;
    notificationId?: string;
    timestamp?: string;
    screen?: string;
    [key: string]: unknown;
  };
}

export interface SendNotificationPayload {
  userId?: string;
  userIds?: string[];
  roles?: string[];
  type: NotificationEventType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  scheduledAt?: string;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  type?: NotificationEventType;
  isRead?: boolean;
  priority?: NotificationPriority;
}
