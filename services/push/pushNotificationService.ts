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
import { handleNotificationTap, navigateFromInAppNotification } from '@/utils/notificationNavigator';
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
  private webMessageHandler: ((event: MessageEvent) => void) | null = null;
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

    console.log('[Push Web] Step 5: Setting up service worker message listener for notification clicks...');
    this.setupWebNotificationClickHandler();

    this.isInitialized = true;
    console.log('[Push Web] Initialization COMPLETE!');
    return true;
  }

  private setupWebNotificationClickHandler(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[Push Web] Service worker not available, skipping click handler');
      return;
    }

    this.webMessageHandler = (event: MessageEvent) => {
      console.log('[Push Web] Received message from service worker:', event.data);
      
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const data = event.data.data || {};
        console.log('[Push Web] Notification clicked, navigating with data:', data);
        
        const notificationType = data.type as string;
        if (notificationType) {
          navigateFromInAppNotification({ type: notificationType, data });
        } else {
          console.log('[Push Web] No notification type in data, cannot navigate');
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', this.webMessageHandler);
    console.log('[Push Web] Service worker message listener registered');
  }

  private async initializeMobile(
    onNotificationReceived?: NotificationCallback
  ): Promise<boolean> {
    console.log('[Push Mobile] Step 1: Checking if physical device...');
    if (!Device.isDevice) {
      console.log('[Push Mobile] Not a physical device (simulator/emulator), skipping');
      return false;
    }
    console.log('[Push Mobile] Device info:', {
      brand: Device.brand,
      modelName: Device.modelName,
      deviceName: Device.deviceName,
      osName: Device.osName,
      osVersion: Device.osVersion,
    });

    console.log('[Push Mobile] Step 2: Checking existing permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Push Mobile] Existing permission status:', existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[Push Mobile] Step 3: Requesting permission...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Push Mobile] Permission request result:', status);
    }

    if (finalStatus !== 'granted') {
      console.log('[Push Mobile] Permission denied, cannot proceed');
      return false;
    }
    console.log('[Push Mobile] Permission granted!');

    try {
      console.log('[Push Mobile] Step 4: Getting device push token (native APNs/FCM)...');
      const tokenData = await Notifications.getDevicePushTokenAsync();
      this.token = tokenData.data;
      console.log('[Push Mobile] Token type:', tokenData.type);
      console.log('[Push Mobile] Token obtained:', this.token?.substring(0, 40) + '...');
    } catch (error) {
      console.error('[Push Mobile] ERROR getting token:', error);
      return false;
    }

    if (Platform.OS === 'android') {
      console.log('[Push Mobile] Step 5: Setting up Android notification channels...');
      await this.setupAndroidChannels();
      console.log('[Push Mobile] Android channels configured');
    }

    console.log('[Push Mobile] Step 6: Registering token with backend...');
    await this.registerTokenWithBackend();
    console.log('[Push Mobile] Backend registration complete');

    console.log('[Push Mobile] Step 7: Setting up notification listeners...');
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push Mobile] Notification received:', notification.request.content.title);
      const data = notification.request.content.data as Record<string, unknown>;
      this.handleNotificationReceived(data);
      onNotificationReceived?.(notification);
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push Mobile] Notification tapped:', response.notification.request.content.title);
      const data = response.notification.request.content.data as Record<string, unknown>;
      this.handleNotificationReceived(data);
      handleNotificationTap(response);
    });

    this.isInitialized = true;
    console.log('[Push Mobile] Initialization COMPLETE! Ready to receive notifications.');
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
      console.log('[Push Backend] No token available, skipping registration');
      return;
    }

    const platform: DevicePlatform = Platform.OS as DevicePlatform;
    const deviceName = this.getDeviceName();
    const deviceModel = Device.modelName || undefined;
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    console.log('[Push Backend] Registering token with backend:', {
      platform,
      deviceName,
      deviceModel,
      appVersion,
      tokenPreview: this.token.substring(0, 30) + '...',
    });

    try {
      const response = await deviceApiService.registerToken({
        deviceToken: this.token,
        platform,
        deviceName,
        deviceModel,
        appVersion,
      });
      console.log('[Push Backend] Registration successful:', response);
    } catch (error) {
      console.error('[Push Backend] Registration FAILED:', error);
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
    console.log('[Push] Unregistering push notifications...');
    if (!this.token) {
      console.log('[Push] No token to unregister, cleaning up listeners');
      this.cleanup();
      return;
    }

    const tokenToUnregister = this.token;
    console.log('[Push] Unregistering token from backend:', tokenToUnregister.substring(0, 30) + '...');

    try {
      await deviceApiService.unregisterToken(tokenToUnregister);
      console.log('[Push] Token unregistered successfully');
    } catch (error) {
      console.error('[Push] Unregister failed:', error);
    }

    this.cleanup();
    console.log('[Push] Cleanup complete');
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
    if (this.webMessageHandler && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.webMessageHandler);
      this.webMessageHandler = null;
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
