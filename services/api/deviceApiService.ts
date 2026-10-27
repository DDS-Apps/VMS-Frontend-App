import { get, post, del, getAccessToken } from '@/api/httpClient';
import { httpClient } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import { sendSessionCleanup } from '@/api/sessionCleanup';
import {
  RegisterDeviceTokenDto,
  DeviceTokenResponse,
  DeviceListResponse,
  PushStatusResponse,
  TestNotificationPayload,
} from '@/types';

const { devices } = apiConfig.endpoints;

export const deviceApiService = {
  registerToken: async (data: RegisterDeviceTokenDto, sessionEpoch?: number): Promise<DeviceTokenResponse> => {
    const endpoint = devices.token;
    const hasAuthToken = !!getAccessToken();
    console.log('[Device API] ========== REGISTER TOKEN START ==========');
    console.log('[Device API] Endpoint:', apiConfig.baseUrl + endpoint);
    console.log('[Device API] Auth token present:', hasAuthToken);
    console.log('[Device API] Platform:', data.platform);
    console.log('[Device API] Device:', data.deviceName, data.deviceModel);
    
    try {
      const response = await post<DeviceTokenResponse, RegisterDeviceTokenDto>(endpoint, data, { __sessionEpoch: sessionEpoch });
      console.log('[Device API] Token registered successfully');
      console.log('[Device API] ========== REGISTER TOKEN SUCCESS ==========');
      return response;
    } catch (error: unknown) {
      const err = error as Error & { response?: { status?: number; data?: unknown } };
      console.error('[Device API] ========== REGISTER TOKEN FAILED ==========');
      console.error('[Device API] Error response status:', err.response?.status);
      throw error;
    }
  },

  unregisterToken: async (deviceToken: string, accessTokenSnapshot: string | null = getAccessToken()): Promise<void> => {
    const endpoint = devices.token;
    const hasAuthToken = !!accessTokenSnapshot;
    console.log('[Device API] ========== UNREGISTER TOKEN START ==========');
    console.log('[Device API] Endpoint:', apiConfig.baseUrl + endpoint);
    console.log('[Device API] Auth token present:', hasAuthToken);
    
    try {
      await sendSessionCleanup('delete', endpoint, { deviceToken }, accessTokenSnapshot);
      console.log('[Device API] Token unregistered successfully');
      console.log('[Device API] ========== UNREGISTER TOKEN SUCCESS ==========');
    } catch (error: unknown) {
      const err = error as Error & { response?: { status?: number; data?: unknown } };
      console.error('[Device API] ========== UNREGISTER TOKEN FAILED ==========');
      console.error('[Device API] Error response status:', err.response?.status);
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
    try {
      const result = await post<{ success: boolean }, TestNotificationPayload>(devices.test, payload);
      console.log('[Device API] Test notification completed');
      return result;
    } catch (error) {
      console.warn('[Device API] Test notification failed');
      throw error;
    }
  },
};

export default deviceApiService;
