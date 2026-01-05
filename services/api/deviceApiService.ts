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

  sendTestNotification: (data?: TestNotificationPayload): Promise<{ success: boolean }> => {
    return post<{ success: boolean }, TestNotificationPayload>(devices.test, data || {
      title: 'Test Notification',
      body: 'Push notifications are working!',
    });
  },
};

export default deviceApiService;
