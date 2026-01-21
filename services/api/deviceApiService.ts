import { get, post, del, getAccessToken } from '@/api/httpClient';
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
    const endpoint = devices.token;
    const hasAuthToken = !!getAccessToken();
    
    try {
      const response = await post<DeviceTokenResponse, RegisterDeviceTokenDto>(endpoint, data);
      return response;
    } catch (error: unknown) {
      const err = error as Error & { response?: { status?: number; data?: unknown } };
      throw error;
    }
  },

  unregisterToken: async (deviceToken: string): Promise<void> => {
    const endpoint = devices.token;
    const hasAuthToken = !!getAccessToken();
    
    try {
      await del<void, { deviceToken: string }>(endpoint, { deviceToken });
    } catch (error: unknown) {
      const err = error as Error & { response?: { status?: number; data?: unknown } };
      throw error;
    }
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
    try {
      const result = await post<{ success: boolean }, TestNotificationPayload>(devices.test, payload);
      return result;
    } catch (error) {
      throw error;
    }
  },
};

export default deviceApiService;
