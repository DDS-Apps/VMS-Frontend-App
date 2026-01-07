import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { QueryClient } from '@tanstack/react-query';
import { deviceApiService } from '@/services/api/deviceApiService';
import {
  initializeFirebaseWeb,
  getWebFcmToken,
  onWebForegroundMessage,
  registerServiceWorker,
  getWebNotificationPermissionStatus,
} from '@/services/firebase';
import { handleNotificationTap } from '@/utils/notificationNavigator';
import { invalidateQueriesForNotification, refreshAllNotificationData } from './notificationQueryMapper';
import type { DevicePlatform, NotificationPayload } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationCallback = (notification: Notifications.Notification) => void;

class PushNotificationService {
  private static instance: PushNotificationService;
  private token: string | null = null;
  private isInitialized = false;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;
  private webUnsubscribe: (() => void) | null = null;
  private queryClient: QueryClient | null = null;

  setQueryClient(client: QueryClient): void {
    this.queryClient = client;
    console.log('[Push] QueryClient set for automatic data refresh');
  }

  private handleNotificationReceived(data: Record<string, unknown>): void {
    if (!this.queryClient) {
      console.log('[Push] QueryClient not set, skipping data refresh');
      return;
    }

    const notificationType = data?.type as string;
    if (notificationType) {
      console.log(`[Push] Refreshing data for notification type: ${notificationType}`);
      invalidateQueriesForNotification(this.queryClient, notificationType);
    } else {
      console.log('[Push] No notification type, refreshing all notification data');
      refreshAllNotificationData(this.queryClient);
    }
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(
    onNotificationReceived?: NotificationCallback
  ): Promise<boolean> {
    console.log('[Push] ========== INITIALIZE START ==========');
    console.log('[Push] Platform:', Platform.OS);
    console.log('[Push] Already initialized:', this.isInitialized);
    console.log('[Push] Current token exists:', !!this.token);
    
    if (this.isInitialized) {
      console.log('[Push] Already initialized, skipping re-initialization');
      console.log('[Push] ========== INITIALIZE SKIPPED (already done) ==========');
      return true;
    }

    try {
      let result: boolean;
      if (Platform.OS === 'web') {
        console.log('[Push] Calling initializeWeb()...');
        result = await this.initializeWeb(onNotificationReceived);
      } else {
        console.log('[Push] Calling initializeMobile()...');
        result = await this.initializeMobile(onNotificationReceived);
      }
      console.log('[Push] Initialization result:', result);
      console.log('[Push] ========== INITIALIZE END ==========');
      return result;
    } catch (error) {
      console.error('[Push] ========== INITIALIZE FAILED ==========');
      console.error('[Push] Initialization error:', error);
      return false;
    }
  }

  private async initializeWeb(
    onNotificationReceived?: NotificationCallback
  ): Promise<boolean> {
    const initialized = await initializeFirebaseWeb();
    if (!initialized) {
      console.log('[Push Web] Firebase not available');
      return false;
    }

    await registerServiceWorker();

    this.token = await getWebFcmToken();
    if (!this.token) {
      console.log('[Push Web] No token obtained');
      return false;
    }

    await this.registerTokenWithBackend();

    this.webUnsubscribe = onWebForegroundMessage((payload: unknown) => {
      console.log('[Push Web] Foreground message:', payload);
      const typedPayload = payload as Record<string, unknown>;
      const data = typedPayload.data as Record<string, unknown> || {};
      
      this.handleNotificationReceived(data);
      
      if (onNotificationReceived && typedPayload.notification) {
        const mockNotification = {
          request: {
            content: {
              title: (typedPayload.notification as { title?: string })?.title || '',
              body: (typedPayload.notification as { body?: string })?.body || '',
              data,
            },
          },
        } as unknown as Notifications.Notification;
        onNotificationReceived(mockNotification);
      }
    });

    this.isInitialized = true;
    console.log('[Push Web] Initialized successfully');
    return true;
  }

  private async initializeMobile(
    onNotificationReceived?: NotificationCallback
  ): Promise<boolean> {
    console.log('[Push Mobile] ========== INITIALIZE MOBILE START ==========');
    console.log('[Push Mobile] Is physical device:', Device.isDevice);
    
    if (!Device.isDevice) {
      console.log('[Push Mobile] Push notifications require a physical device, skipping');
      console.log('[Push Mobile] ========== INITIALIZE MOBILE SKIPPED ==========');
      return false;
    }

    console.log('[Push Mobile] Checking notification permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Push Mobile] Existing permission status:', existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[Push Mobile] Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Push Mobile] New permission status:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('[Push Mobile] Permission denied, cannot proceed');
      console.log('[Push Mobile] ========== INITIALIZE MOBILE FAILED (no permission) ==========');
      return false;
    }

    console.log('[Push Mobile] Permission granted, getting device push token...');
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const tokenValue = tokenData.data;
      this.token = tokenValue;
      console.log('[Push Mobile] Token obtained successfully');
      console.log('[Push Mobile] Token (first 30 chars):', tokenValue.substring(0, 30) + '...');
    } catch (error) {
      console.error('[Push Mobile] Error getting token:', error);
      console.log('[Push Mobile] ========== INITIALIZE MOBILE FAILED (token error) ==========');
      return false;
    }

    if (Platform.OS === 'android') {
      console.log('[Push Mobile] Setting up Android notification channels...');
      await this.setupAndroidChannels();
    }

    console.log('[Push Mobile] Registering token with backend...');
    await this.registerTokenWithBackend();

    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push Mobile] Notification received:', notification);
      const data = notification.request.content.data as Record<string, unknown>;
      this.handleNotificationReceived(data);
      onNotificationReceived?.(notification);
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push Mobile] Notification tapped:', response);
      const data = response.notification.request.content.data as Record<string, unknown>;
      this.handleNotificationReceived(data);
      handleNotificationTap(response);
    });

    this.isInitialized = true;
    console.log('[Push Mobile] Initialized successfully');
    return true;
  }

  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F58423',
    });

    await Notifications.setNotificationChannelAsync('visitors', {
      name: 'Visitor Updates',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Notifications about visitor arrivals and departures',
    });

    await Notifications.setNotificationChannelAsync('approvals', {
      name: 'Approval Requests',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Notifications when approval is needed',
    });

    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task Assignments',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Notifications for valet and buffet task assignments',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Visit reminders and scheduled notifications',
    });
  }

  private async registerTokenWithBackend(): Promise<void> {
    console.log('[Push] ========== REGISTER TOKEN WITH BACKEND START ==========');
    console.log('[Push] Token exists:', !!this.token);
    console.log('[Push] Token value (first 30 chars):', this.token ? this.token.substring(0, 30) + '...' : 'null');
    
    if (!this.token) {
      console.log('[Push] No token to register, skipping API call');
      console.log('[Push] ========== REGISTER TOKEN WITH BACKEND SKIPPED ==========');
      return;
    }

    const platform: DevicePlatform = Platform.OS as DevicePlatform;
    const deviceName = this.getDeviceName();
    const deviceModel = Device.modelName || undefined;
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    console.log('[Push] Preparing registration request:', {
      platform,
      deviceName,
      deviceModel,
      appVersion,
      tokenPrefix: this.token.substring(0, 30) + '...',
    });

    try {
      console.log('[Push] Calling deviceApiService.registerToken()...');
      const result = await deviceApiService.registerToken({
        deviceToken: this.token,
        platform,
        deviceName,
        deviceModel,
        appVersion,
      });
      console.log('[Push] Token registered with backend successfully, result:', JSON.stringify(result));
      console.log('[Push] ========== REGISTER TOKEN WITH BACKEND SUCCESS ==========');
    } catch (error) {
      console.error('[Push] ========== REGISTER TOKEN WITH BACKEND FAILED ==========');
      console.error('[Push] Error:', error);
      throw error;
    }
  }

  private getDeviceName(): string {
    if (Platform.OS === 'web') {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome Browser';
      if (ua.includes('Firefox')) return 'Firefox Browser';
      if (ua.includes('Safari')) return 'Safari Browser';
      if (ua.includes('Edge')) return 'Edge Browser';
      return 'Web Browser';
    }
    return Device.deviceName || `${Device.brand} ${Device.modelName}`;
  }

  async unregister(): Promise<void> {
    console.log('[Push] ========== UNREGISTER START ==========');
    console.log('[Push] Token exists:', !!this.token);
    console.log('[Push] Token value (first 30 chars):', this.token ? this.token.substring(0, 30) + '...' : 'null');
    
    if (!this.token) {
      console.log('[Push] No token to unregister, skipping API call');
      console.log('[Push] ========== UNREGISTER SKIPPED ==========');
      this.cleanup();
      return;
    }

    const tokenToUnregister = this.token;

    try {
      console.log('[Push] Calling deviceApiService.unregisterToken()...');
      await deviceApiService.unregisterToken(tokenToUnregister);
      console.log('[Push] Token unregistered from backend successfully');
      console.log('[Push] ========== UNREGISTER SUCCESS ==========');
    } catch (error) {
      console.error('[Push] ========== UNREGISTER FAILED ==========');
      console.error('[Push] Error:', error);
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    if (this.webUnsubscribe) {
      this.webUnsubscribe();
      this.webUnsubscribe = null;
    }
    this.token = null;
    this.isInitialized = false;
  }

  async getStatus() {
    try {
      return await deviceApiService.getPushStatus();
    } catch (error) {
      console.error('[Push] Failed to get status:', error);
      return null;
    }
  }

  async sendTestNotification(): Promise<{ success: boolean; debugInfo: string }> {
    const debugInfo: string[] = [];
    debugInfo.push(`Platform: ${Platform.OS}`);
    debugInfo.push(`Initialized: ${this.isInitialized}`);
    debugInfo.push(`Token exists: ${!!this.token}`);
    debugInfo.push(`Token (first 20 chars): ${this.token?.substring(0, 20) || 'none'}...`);
    
    console.log('[Push Debug] ===== SEND TEST NOTIFICATION =====');
    console.log('[Push Debug] Platform:', Platform.OS);
    console.log('[Push Debug] Initialized:', this.isInitialized);
    console.log('[Push Debug] Token exists:', !!this.token);
    
    if (!this.token) {
      const msg = 'No push token available. Push notifications not initialized.';
      console.warn('[Push Debug]', msg);
      debugInfo.push(`Error: ${msg}`);
      return { success: false, debugInfo: debugInfo.join('\n') };
    }
    
    try {
      console.log('[Push Debug] Calling backend API to send test notification...');
      const result = await deviceApiService.sendTestNotification();
      console.log('[Push Debug] Backend response:', result);
      debugInfo.push(`Backend response: ${JSON.stringify(result)}`);
      return { success: result.success, debugInfo: debugInfo.join('\n') };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Push Debug] Failed to send test notification:', errorMsg);
      debugInfo.push(`Error: ${errorMsg}`);
      return { success: false, debugInfo: debugInfo.join('\n') };
    }
  }

  getDebugInfo(): string {
    const info: string[] = [];
    info.push(`Platform: ${Platform.OS}`);
    info.push(`Initialized: ${this.isInitialized}`);
    info.push(`Token exists: ${!!this.token}`);
    if (this.token) {
      info.push(`Token preview: ${this.token.substring(0, 30)}...`);
    }
    info.push(`Notification listener active: ${!!this.notificationListener}`);
    info.push(`Response listener active: ${!!this.responseListener}`);
    info.push(`Web unsubscribe active: ${!!this.webUnsubscribe}`);
    return info.join('\n');
  }

  getToken(): string | null {
    return this.token;
  }

  isReady(): boolean {
    return this.isInitialized && this.token !== null;
  }

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
    if (Platform.OS === 'web') {
      const status = getWebNotificationPermissionStatus();
      if (status === 'unsupported') return 'unsupported';
      if (status === 'granted') return 'granted';
      if (status === 'denied') return 'denied';
      return 'undetermined';
    }

    if (!Device.isDevice) {
      return 'unsupported';
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  }

  shouldShowEnablePrompt(): boolean {
    if (this.isInitialized && this.token) {
      return false;
    }
    
    if (Platform.OS === 'web') {
      const status = getWebNotificationPermissionStatus();
      return status === 'default';
    }
    
    return true;
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
