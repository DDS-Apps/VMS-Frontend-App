import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { deviceApiService } from '@/services/api/deviceApiService';
import {
  initializeFirebaseWeb,
  getWebFcmToken,
  onWebForegroundMessage,
  registerServiceWorker,
} from '@/services/firebase';
import { handleNotificationTap } from '@/utils/notificationNavigator';
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

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(
    onNotificationReceived?: NotificationCallback
  ): Promise<boolean> {
    if (this.isInitialized) {
      console.log('[Push] Already initialized');
      return true;
    }

    try {
      if (Platform.OS === 'web') {
        return await this.initializeWeb(onNotificationReceived);
      } else {
        return await this.initializeMobile(onNotificationReceived);
      }
    } catch (error) {
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
      if (onNotificationReceived && typedPayload.notification) {
        const mockNotification = {
          request: {
            content: {
              title: (typedPayload.notification as { title?: string })?.title || '',
              body: (typedPayload.notification as { body?: string })?.body || '',
              data: typedPayload.data as Record<string, unknown> || {},
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
    if (!Device.isDevice) {
      console.log('[Push Mobile] Push notifications require a physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push Mobile] Permission denied');
      return false;
    }

    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      this.token = tokenData.data;
      console.log('[Push Mobile] Token obtained');
    } catch (error) {
      console.error('[Push Mobile] Error getting token:', error);
      return false;
    }

    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    await this.registerTokenWithBackend();

    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push Mobile] Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push Mobile] Notification tapped:', response);
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
      lightColor: '#0e2342',
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
    if (!this.token) return;

    const platform: DevicePlatform = Platform.OS as DevicePlatform;
    const deviceName = this.getDeviceName();
    const deviceModel = Device.modelName || undefined;
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    try {
      await deviceApiService.registerToken({
        fcmToken: this.token,
        platform,
        deviceName,
        deviceModel,
        appVersion,
      });
      console.log('[Push] Token registered with backend');
    } catch (error) {
      console.error('[Push] Failed to register token with backend:', error);
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
    if (!this.token) return;

    try {
      await deviceApiService.unregisterToken(this.token);
      console.log('[Push] Token unregistered from backend');
    } catch (error) {
      console.error('[Push] Failed to unregister token:', error);
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
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
