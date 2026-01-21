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
  }

  private handleNotificationReceived(data: Record<string, unknown>): void {
    if (!this.queryClient) {
      return;
    }

    const notificationType = data?.type as string;
    if (notificationType) {
      invalidateQueriesForNotification(this.queryClient, notificationType);
    } else {
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
    console.log('[Push] Initialize called, platform:', Platform.OS, 'already init:', this.isInitialized);
    
    if (this.isInitialized) {
      return true;
    }

    try {
      let result: boolean;
      if (Platform.OS === 'web') {
        console.log('[Push] Calling initializeWeb...');
        result = await this.initializeWeb(onNotificationReceived);
        console.log('[Push] initializeWeb result:', result);
      } else {
        result = await this.initializeMobile(onNotificationReceived);
      }
      return result;
    } catch (error) {
      console.error('[Push] Initialization error:', error);
      return false;
    }
  }

  private async initializeWeb(
    onNotificationReceived?: NotificationCallback
  ): Promise<boolean> {
    console.log('[Push Web] Step 1: initializeFirebaseWeb...');
    const initialized = await initializeFirebaseWeb();
    console.log('[Push Web] Firebase initialized:', initialized);
    if (!initialized) {
      console.log('[Push Web] Firebase init failed, stopping');
      return false;
    }

    console.log('[Push Web] Step 2: registerServiceWorker...');
    await registerServiceWorker();

    console.log('[Push Web] Step 3: getWebFcmToken...');
    this.token = await getWebFcmToken();
    console.log('[Push Web] Token obtained:', !!this.token);
    if (!this.token) {
      console.log('[Push Web] No token, stopping');
      return false;
    }

    console.log('[Push Web] Step 4: registerTokenWithBackend...');
    await this.registerTokenWithBackend();

    this.webUnsubscribe = onWebForegroundMessage((payload: unknown) => {
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
    return true;
  }

  private async initializeMobile(
    onNotificationReceived?: NotificationCallback
  ): Promise<boolean> {
    if (!Device.isDevice) {
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      this.token = tokenData.data;
    } catch (error) {
      console.error('[Push] Error getting mobile token:', error);
      return false;
    }

    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    await this.registerTokenWithBackend();

    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      this.handleNotificationReceived(data);
      onNotificationReceived?.(notification);
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      this.handleNotificationReceived(data);
      handleNotificationTap(response);
    });

    this.isInitialized = true;
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
    if (!this.token) {
      return;
    }

    const platform: DevicePlatform = Platform.OS as DevicePlatform;
    const deviceName = this.getDeviceName();
    const deviceModel = Device.modelName || undefined;
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    try {
      await deviceApiService.registerToken({
        deviceToken: this.token,
        platform,
        deviceName,
        deviceModel,
        appVersion,
      });
    } catch (error) {
      console.error('[Push] Token registration failed:', error);
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
    if (!this.token) {
      this.cleanup();
      return;
    }

    const tokenToUnregister = this.token;

    try {
      await deviceApiService.unregisterToken(tokenToUnregister);
    } catch (error) {
      console.error('[Push] Unregister failed:', error);
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
    
    if (!this.token) {
      const msg = 'No push token available. Push notifications not initialized.';
      debugInfo.push(`Error: ${msg}`);
      return { success: false, debugInfo: debugInfo.join('\n') };
    }
    
    try {
      const result = await deviceApiService.sendTestNotification();
      debugInfo.push(`Backend response: ${JSON.stringify(result)}`);
      return { success: result.success, debugInfo: debugInfo.join('\n') };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
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
