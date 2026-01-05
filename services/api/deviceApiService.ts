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
  registerToken: (data: RegisterDeviceTokenDto): Promise<DeviceTokenResponse> => {
    return post<DeviceTokenResponse, RegisterDeviceTokenDto>(devices.token, data);
  },

  unregisterToken: async (fcmToken: string): Promise<void> => {
    await post<void, { fcmToken: string }>(`${devices.token}/unregister`, { fcmToken });
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
