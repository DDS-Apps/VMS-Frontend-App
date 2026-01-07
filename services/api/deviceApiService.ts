import { get, post, del } from '@/api/httpClient';
import { httpClient } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import {
  RegisterDeviceTokenDto,
  DeviceTokenResponse,
  DeviceListResponse,
  PushStatusResponse,
  TestNotificationPayload,
} from '@/types';

const { devices } = apiConfig.endpoints;

export const deviceApiService = {
  registerToken: async (data: RegisterDeviceTokenDto): Promise<DeviceTokenResponse> => {
    console.log('[Device API] Registering token:', data.fcmToken.substring(0, 20) + '...', 'platform:', data.platform);
    const response = await post<DeviceTokenResponse, RegisterDeviceTokenDto>(devices.token, data);
    console.log('[Device API] Token registered successfully');
    return response;
  },

  unregisterToken: async (fcmToken: string): Promise<void> => {
    console.log('[Device API] Unregistering token:', fcmToken.substring(0, 20) + '...');
    await del<void, { fcmToken: string }>(devices.token, { fcmToken });
  },

  unregisterAllTokens: (): Promise<void> => {
    return del<void>(devices.tokens);
  },

  getRegisteredDevices: (): Promise<DeviceListResponse> => {
    return get<DeviceListResponse>(devices.tokens);
  },

  getPushStatus: (): Promise<PushStatusResponse> => {
    return get<PushStatusResponse>(devices.status);
  },

  sendTestNotification: async (data?: TestNotificationPayload): Promise<{ success: boolean }> => {
    const payload = data || {
      title: 'Test Notification',
      body: 'Push notifications are working!',
    };
    console.log('[Device API] Sending test notification to:', devices.test);
    console.log('[Device API] Payload:', JSON.stringify(payload));
    try {
      const result = await post<{ success: boolean }, TestNotificationPayload>(devices.test, payload);
      console.log('[Device API] Test notification response:', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('[Device API] Test notification error:', error);
      throw error;
    }
  },
};

export default deviceApiService;
