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
    console.log('[Device API] ========== REGISTER TOKEN START ==========');
    console.log('[Device API] Endpoint:', apiConfig.baseUrl + endpoint);
    console.log('[Device API] Auth token present:', hasAuthToken);
    console.log('[Device API] Platform:', data.platform);
    console.log('[Device API] Device:', data.deviceName, data.deviceModel);
    console.log('[Device API] Token (first 30 chars):', data.deviceToken.substring(0, 30) + '...');
    
    try {
      const response = await post<DeviceTokenResponse, RegisterDeviceTokenDto>(endpoint, data);
      console.log('[Device API] Token registered successfully, response:', JSON.stringify(response));
      console.log('[Device API] ========== REGISTER TOKEN SUCCESS ==========');
      return response;
    } catch (error: unknown) {
      const err = error as Error & { response?: { status?: number; data?: unknown } };
      console.error('[Device API] ========== REGISTER TOKEN FAILED ==========');
      console.error('[Device API] Error message:', err.message);
      console.error('[Device API] Error response status:', err.response?.status);
      console.error('[Device API] Error response data:', JSON.stringify(err.response?.data));
      throw error;
    }
  },

  unregisterToken: async (deviceToken: string): Promise<void> => {
    const endpoint = devices.token;
    const hasAuthToken = !!getAccessToken();
    console.log('[Device API] ========== UNREGISTER TOKEN START ==========');
    console.log('[Device API] Endpoint:', apiConfig.baseUrl + endpoint);
    console.log('[Device API] Auth token present:', hasAuthToken);
    console.log('[Device API] Token (first 30 chars):', deviceToken.substring(0, 30) + '...');
    
    try {
      await del<void, { deviceToken: string }>(endpoint, { deviceToken });
      console.log('[Device API] Token unregistered successfully');
      console.log('[Device API] ========== UNREGISTER TOKEN SUCCESS ==========');
    } catch (error: unknown) {
      const err = error as Error & { response?: { status?: number; data?: unknown } };
      console.error('[Device API] ========== UNREGISTER TOKEN FAILED ==========');
      console.error('[Device API] Error message:', err.message);
      console.error('[Device API] Error response status:', err.response?.status);
      console.error('[Device API] Error response data:', JSON.stringify(err.response?.data));
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
