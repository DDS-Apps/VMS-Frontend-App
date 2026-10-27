import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { QueryClient } from '@tanstack/react-query';
import { deviceApiService } from '@/services/api/deviceApiService';
import { getAccessToken, getSessionEpoch } from '@/api/httpClient';
import {
  initializeFirebaseWeb,
  getWebFcmToken,
  revokeWebFcmToken,
  onWebForegroundMessage,
  registerServiceWorker,
  getWebNotificationPermissionStatus,
} from '@/services/firebase';
import {
  handleNotificationTap,
  isNotificationNavigationReady,
  navigateFromInAppNotification,
} from '@/utils/notificationNavigator';
import { invalidateQueriesForNotification, refreshAllNotificationData } from './notificationQueryMapper';
import { NOTIFICATION_TYPES } from '@/constants/notificationTypes';
import { UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES } from '@/constants/requestConstants';
import type { DevicePlatform, NotificationPayload } from '@/types';
import { crashlyticsService } from '@/services/crashlytics/crashlyticsService';

// Firebase Messaging for iOS FCM token retrieval
let firebaseMessaging: typeof import('@react-native-firebase/messaging').default | null = null;
if (Platform.OS === 'ios') {
  try {
    firebaseMessaging = require('@react-native-firebase/messaging').default;
    console.log('[Push] Firebase Messaging module loaded for iOS');
  } catch (error) {
    console.log('[Push] Firebase Messaging not available (Expo Go or web):', error);
  }
}

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
type PushOwner = { epoch: number; cancelled: boolean; token: string | null };

class PushNotificationService {
  private static instance: PushNotificationService;
  private static readonly SHOWN_IDS_STORAGE_KEY = 'vms_push_shown_toast_ids';
  private static readonly SHOWN_IDS_TTL_MS = 30 * 60 * 1000; // 30 minutes

  private token: string | null = null;
  private isInitialized = false;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;
  private webUnsubscribe: (() => void) | null = null;
  private webMessageHandler: ((event: MessageEvent) => void) | null = null;
  private queryClient: QueryClient | null = null;
  private shownToastIds = new Set<string>();
  private handledResponseIds = new Set<string>();
  private notificationCallback: NotificationCallback | undefined;
  private owner: PushOwner | null = null;
  private initializing: Promise<boolean> | null = null;
  private removing: Promise<void> | null = null;
  private backendQueue: Promise<unknown> = Promise.resolve();
  private stopTokenMonitor: (() => void) | null = null;

  private isCurrent(owner: PushOwner): boolean {
    return this.owner === owner && !owner.cancelled && owner.epoch === getSessionEpoch();
  }

  private enqueueBackend<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.backendQueue.then(operation, operation);
    this.backendQueue = result.catch(() => {});
    return result;
  }

  setQueryClient(client: QueryClient): void {
    this.queryClient = client;
  }

  /**
   * Register (or replace) the callback invoked when a foreground push
   * notification should be shown as an in-app toast.  Safe to call after
   * initialization; the new callback is picked up immediately by the
   * already-running listeners.
   */
  setCallback(cb: NotificationCallback | undefined): void {
    this.notificationCallback = cb;
  }

  /**
   * Invalidates queries for the given notification type and extracts any
   * per-notification threshold (`upcomingVisitReminderMinutes`) so callers
   * can use it when constructing in-app notifications.
   */
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

  handleNotificationResponse(response: Notifications.NotificationResponse): boolean {
    const identifier = response.notification.request.identifier;
    if (identifier && this.handledResponseIds.has(identifier)) {
      return false;
    }
    if (!isNotificationNavigationReady()) {
      return false;
    }
    if (identifier) {
      this.handledResponseIds.add(identifier);
    }

    const data = response.notification.request.content.data as Record<string, unknown>;
    this.handleNotificationReceived(data);
    handleNotificationTap(response);
    return true;
  }

  async processLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) {
      return null;
    }

    if (!this.handleNotificationResponse(response)) {
      return null;
    }

    await Notifications.clearLastNotificationResponseAsync();
    return response;
  }

  /**
   * Extracts the reminder threshold from the notification payload.
   * Falls back to the app-wide default (15 min) when the field is absent.
   */
  private getThresholdMinutes(data: Record<string, unknown>): number {
    const fromPayload = Number(data?.upcomingVisitReminderMinutes);
    return Number.isFinite(fromPayload) && fromPayload > 0
      ? fromPayload
      : UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES;
  }

  /**
   * Hydrates the in-memory shownToastIds Set from AsyncStorage on startup,
   * discarding any entries older than SHOWN_IDS_TTL_MS (30 min). Must be
   * called before notification listeners are registered so that a cold-launch
   * triggered by tapping a notification does not re-show its toast.
   */
  private async hydrateShownIds(): Promise<void> {
    try {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      const raw: string | null = await AsyncStorage.getItem(
        PushNotificationService.SHOWN_IDS_STORAGE_KEY
      );
      if (!raw) return;
      const entries: Array<{ id: string; ts: number }> = JSON.parse(raw);
      const now = Date.now();
      const ttl = PushNotificationService.SHOWN_IDS_TTL_MS;
      for (const entry of entries) {
        if (now - entry.ts < ttl) {
          this.shownToastIds.add(entry.id);
        }
      }
      console.log(
        '[Push] Hydrated shown toast IDs from storage:',
        this.shownToastIds.size
      );
    } catch (error) {
      console.warn('[Push] Failed to hydrate shown toast IDs:', error);
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      crashlyticsService.recordError(wrappedError, 'Push.hydrateShownIds');

      if (error instanceof SyntaxError) {
        try {
          const AsyncStorage =
            require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem(PushNotificationService.SHOWN_IDS_STORAGE_KEY);
          const healMsg =
            '[Push] Corrupted deduplication storage cleared — next launch will start clean.';
          console.warn(healMsg);
          crashlyticsService.log(healMsg);
        } catch (removeError) {
          const removeWrapped =
            removeError instanceof Error
              ? removeError
              : new Error(String(removeError));
          console.warn('[Push] Failed to clear corrupted storage key:', removeWrapped);
          crashlyticsService.recordError(removeWrapped, 'Push.hydrateShownIds.clearCorrupted');
        }
      }
    }
  }

  /**
   * Persists a newly seen notification ID to AsyncStorage so it survives
   * process termination. Expired entries are pruned on each write. This is
   * fire-and-forget; failures are logged but do not block the caller.
   */
  private persistShownId(id: string): void {
    (async () => {
      try {
        const AsyncStorage =
          require('@react-native-async-storage/async-storage').default;
        const now = Date.now();
        const ttl = PushNotificationService.SHOWN_IDS_TTL_MS;
        const storageKey = PushNotificationService.SHOWN_IDS_STORAGE_KEY;
        const raw: string | null = await AsyncStorage.getItem(storageKey);
        let entries: Array<{ id: string; ts: number }>;
        try {
          entries = raw ? JSON.parse(raw) : [];
        } catch (parseError) {
          console.warn(
            '[Push] persistShownId: corrupt storage detected, discarding and starting fresh:',
            parseError
          );
          crashlyticsService.recordError(
            parseError instanceof Error
              ? parseError
              : new Error(String(parseError)),
            'Push.persistShownId.corrupt'
          );
          entries = [];
        }
        // Prune expired entries
        entries = entries.filter((e) => now - e.ts < ttl);
        // Append the new entry
        entries.push({ id, ts: now });
        // Cap at 200 to bound storage size
        if (entries.length > 200) {
          entries = entries.slice(entries.length - 200);
        }
        await AsyncStorage.setItem(storageKey, JSON.stringify(entries));
      } catch (error) {
        console.warn('[Push] Failed to persist shown toast ID:', error);
        crashlyticsService.recordError(
          error instanceof Error ? error : new Error(String(error)),
          'Push.persistShownId'
        );
      }
    })();
  }

  /**
   * Tracks whether we have already triggered the in-app notification toast
   * for a given notification identifier. Used to prevent duplicate toasts
   * when an `upcoming_visit` push arrives via multiple channels (e.g. several
   * open web tabs or a reconnect) or when both the received and response
   * listeners fire for the same notification.
   *
   * The Set is hydrated from AsyncStorage on cold launch (see hydrateShownIds)
   * so duplicate suppression survives process termination. New IDs are also
   * persisted asynchronously via persistShownId.
   *
   * Capped at 200 entries; oldest entry is evicted when the cap is exceeded.
   */
  private shouldShowToast(notificationId: string): boolean {
    if (this.shownToastIds.has(notificationId)) {
      return false;
    }
    this.shownToastIds.add(notificationId);
    if (this.shownToastIds.size > 200) {
      const oldest = this.shownToastIds.values().next().value;
      if (oldest !== undefined) {
        this.shownToastIds.delete(oldest);
      }
    }
    this.persistShownId(notificationId);
    return true;
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
    const epoch = getSessionEpoch();
    const pendingRemoval = this.removing;
    if (pendingRemoval) {
      await pendingRemoval.catch(() => {});
      if (epoch !== getSessionEpoch() || !getAccessToken()) return false;
      return this.initialize(onNotificationReceived);
    }
    
    if (this.owner && this.isCurrent(this.owner)) {
      if (this.isInitialized) return true;
      if (this.initializing) return this.initializing;
    }
    if (!getAccessToken()) return false;
    if (this.owner) this.owner.cancelled = true;
    this.cleanup();
    const owner: PushOwner = { epoch: getSessionEpoch(), cancelled: false, token: null };
    this.owner = owner;
    const operation = (async () => {
      if (!this.isCurrent(owner)) return false;
      // Hydrate before listeners fire, but never initialize an ended session.
      await this.hydrateShownIds();
      if (!this.isCurrent(owner)) return false;
      try {
        return Platform.OS === 'web'
          ? await this.initializeWeb(owner, onNotificationReceived)
          : await this.initializeMobile(owner, onNotificationReceived);
      } catch {
        console.warn('[Push] Initialization failed');
        return false;
      }
    })();
    this.initializing = operation;
    try {
      return await operation;
    } finally {
      if (this.owner === owner) this.initializing = null;
    }
  }

  private async initializeWeb(
    owner: PushOwner,
    onNotificationReceived?: NotificationCallback
  ): Promise<boolean> {
    console.log('[Push Web] Step 1: initializeFirebaseWeb...');
    const initialized = await initializeFirebaseWeb();
    if (!this.isCurrent(owner)) return false;
    console.log('[Push Web] Firebase initialized:', initialized);
    if (!initialized) {
      console.log('[Push Web] Firebase init failed, stopping');
      return false;
    }

    console.log('[Push Web] Step 2: registerServiceWorker...');
    await registerServiceWorker();
    if (!this.isCurrent(owner)) return false;

    console.log('[Push Web] Step 3: getWebFcmToken...');
    owner.token = await getWebFcmToken();
    if (!this.isCurrent(owner)) return false;
    this.token = owner.token;
    console.log('[Push Web] Token obtained:', !!this.token);
    if (!this.token) {
      console.log('[Push Web] No token, stopping');
      return false;
    }

    console.log('[Push Web] Step 4: registerTokenWithBackend...');
    await this.registerTokenWithBackend(owner);
    if (!this.isCurrent(owner)) return false;

    if (onNotificationReceived) {
      this.notificationCallback = onNotificationReceived;
    }

    this.webUnsubscribe = onWebForegroundMessage((payload: unknown) => {
      if (!this.isCurrent(owner)) return;
      const typedPayload = payload as Record<string, unknown>;
      const data = typedPayload.data as Record<string, unknown> || {};
      this.handleNotificationReceived(data);

      if (this.notificationCallback && typedPayload.notification) {
        const mockNotification = {
          request: {
            content: {
              title: (typedPayload.notification as { title?: string })?.title || '',
              body: (typedPayload.notification as { body?: string })?.body || '',
              data,
            },
          },
        } as unknown as Notifications.Notification;

        const notifType = data?.type as string | undefined;
        if (notifType === NOTIFICATION_TYPES.UPCOMING_VISIT) {
          // Deduplicate by a stable ID derived from the payload (FCM messageId,
          // a backend-supplied notification_id, or the visitId as fallback).
          const webNotifId = String(
            data?.messageId || data?.notification_id || data?.visitId || data?.requestId || Date.now()
          );
          const thresholdMinutes = this.getThresholdMinutes(data);
          console.log('[Push Web] upcoming_visit threshold:', thresholdMinutes, 'min');
          if (this.shouldShowToast(webNotifId)) {
            this.notificationCallback(mockNotification);
          }
        } else {
          this.notificationCallback(mockNotification);
        }
      }
    });

    console.log('[Push Web] Step 5: Setting up service worker message listener for notification clicks...');
    this.setupWebNotificationClickHandler();

    this.isInitialized = true;
    this.startWebTokenMonitor(owner);
    console.log('[Push Web] Initialization COMPLETE!');
    return true;
  }

  private setupWebNotificationClickHandler(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[Push Web] Service worker not available, skipping click handler');
      return;
    }

    this.webMessageHandler = (event: MessageEvent) => {
      if (!this.owner || !this.isCurrent(this.owner)) return;
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
    owner: PushOwner,
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

    try {
      if (Platform.OS === 'ios') {
        // iOS uses Firebase Messaging to get FCM tokens (backend expects FCM, not APNs)
        if (!firebaseMessaging) {
          console.error('[Push Mobile iOS] Firebase Messaging not available - cannot get FCM token');
          console.error('[Push Mobile iOS] This app requires EAS Build with @react-native-firebase/messaging');
          return false;
        }
        
        console.log('[Push Mobile iOS] Step 2: Requesting permission via Firebase Messaging...');
        const authStatus = await firebaseMessaging().requestPermission();
        console.log('[Push Mobile iOS] Firebase auth status:', authStatus);
        
        const enabled = authStatus === firebaseMessaging.AuthorizationStatus.AUTHORIZED ||
                        authStatus === firebaseMessaging.AuthorizationStatus.PROVISIONAL;
        
        if (!enabled) {
          console.log('[Push Mobile iOS] Firebase messaging permission not granted');
          return false;
        }
        console.log('[Push Mobile iOS] Permission granted!');
        
        console.log('[Push Mobile iOS] Step 3: Registering for remote messages...');
        await firebaseMessaging().registerDeviceForRemoteMessages();
        console.log('[Push Mobile iOS] Registered for remote messages');
        
        console.log('[Push Mobile iOS] Step 4: Getting FCM token...');
        const fcmToken = await firebaseMessaging().getToken();
        if (!fcmToken) {
          console.error('[Push Mobile iOS] Failed to get FCM token - backend requires FCM token, not APNs');
          console.error('[Push Mobile iOS] Check Firebase project APNs configuration');
          return false;
        }
        owner.token = fcmToken;
        if (!this.isCurrent(owner)) return false;
        this.token = fcmToken;
        console.log('[Push Mobile iOS] FCM token obtained');
      } else {
        console.log('[Push Mobile Android] Step 2: Checking permissions...');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        console.log('[Push Mobile Android] Existing permission status:', existingStatus);
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          console.log('[Push Mobile Android] Requesting permission...');
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
          console.log('[Push Mobile Android] Permission request result:', status);
        }

        if (finalStatus !== 'granted') {
          console.log('[Push Mobile Android] Permission denied, cannot proceed');
          return false;
        }
        console.log('[Push Mobile Android] Permission granted!');
        
        console.log('[Push Mobile Android] Step 3: Getting device push token (native FCM)...');
        const tokenData = await Notifications.getDevicePushTokenAsync();
        owner.token = tokenData.data;
        if (!this.isCurrent(owner)) return false;
        this.token = tokenData.data;
        console.log('[Push Mobile Android] Token type:', tokenData.type);
        console.log('[Push Mobile Android] FCM token obtained');
      }
      
      try {
        await Notifications.getExpoPushTokenAsync();
      } catch {
        console.log('[Push Mobile] Could not get Expo push token (expected in production builds)');
      }
    } catch (error) {
      console.warn('[Push Mobile] Could not acquire push token');
      return false;
    }

    if (!this.isCurrent(owner)) return false;
    if (Platform.OS === 'android') {
      console.log('[Push Mobile] Step 5: Setting up Android notification channels...');
      await this.setupAndroidChannels();
      console.log('[Push Mobile] Android channels configured');
    }

    console.log('[Push Mobile] Step 6: Registering token with backend...');
    if (!this.isCurrent(owner)) return false;
    await this.registerTokenWithBackend(owner);
    if (!this.isCurrent(owner)) return false;
    console.log('[Push Mobile] Backend registration complete');

    if (onNotificationReceived) {
      this.notificationCallback = onNotificationReceived;
    }

    console.log('[Push Mobile] Step 7: Setting up notification listeners...');
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      if (!this.isCurrent(owner)) return;
      console.log('[Push Mobile] Notification received:', notification.request.content.title);
      const data = notification.request.content.data as Record<string, unknown>;
      this.handleNotificationReceived(data);
      // For upcoming_visit: route through tappable in-app notification toast,
      // deduplicated by notification identifier so multi-delivery doesn't
      // show the toast more than once.
      const notifType = data?.type as string | undefined;
      if (notifType === NOTIFICATION_TYPES.UPCOMING_VISIT) {
        const thresholdMinutes = this.getThresholdMinutes(data);
        console.log('[Push Mobile] upcoming_visit threshold:', thresholdMinutes, 'min');
        if (this.shouldShowToast(notification.request.identifier)) {
          this.notificationCallback?.(notification);
        }
      } else {
        this.notificationCallback?.(notification);
      }
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!this.isCurrent(owner)) return;
      console.log('[Push Mobile] Notification tapped:', response.notification.request.content.title);
      if (this.handleNotificationResponse(response)) {
        Notifications.clearLastNotificationResponseAsync().catch((error) => {
          console.warn('[Push Mobile] Failed to clear handled notification response:', error);
        });
      }
    });

    this.isInitialized = true;
    await this.processLastNotificationResponse();
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

  private async registerTokenWithBackend(owner: PushOwner): Promise<void> {
    if (!owner.token || !this.isCurrent(owner)) {
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
    });

    try {
      await this.enqueueBackend(async () => {
        if (!this.isCurrent(owner) || !owner.token) return;
        await deviceApiService.registerToken({
          deviceToken: owner.token,
          platform,
          deviceName,
          deviceModel,
          appVersion,
        }, owner.epoch);
      });
      console.log('[Push Backend] Registration finished');
    } catch (error) {
      console.warn('[Push Backend] Registration failed');
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

  async unregister(accessSnapshot: string | null = getAccessToken(), forceLocalCleanup = false): Promise<void> {
    const owner = this.owner;
    if (owner) owner.cancelled = true;
    const initializing = this.initializing;
    const tokenSnapshot = this.token;
    const removal = this.enqueueBackend(async () => {
      // Work already dispatched must settle before DELETE and the next user's
      // registration. SDK work not yet dispatched observes the cancelled owner.
      if (initializing) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            initializing,
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => reject(new Error('Push initialization did not settle.')), 15_000);
            }),
          ]);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      let token = owner?.token ?? tokenSnapshot;
      if (!token && Platform.OS === 'web' && getWebNotificationPermissionStatus() === 'granted') {
        // A restored tab may have a server registration even if SDK startup
        // failed before populating our in-memory token. Do not claim detachment
        // while notifications are allowed but the browser token is unknown.
        if (!(await initializeFirebaseWeb())) throw new Error('Browser push token could not be accessed.');
        token = await getWebFcmToken();
        if (!token) throw new Error('Browser push token could not be accessed.');
        if (owner) owner.token = token;
      }
      if (token) await deviceApiService.unregisterToken(token, accessSnapshot);
    });
    const completed = removal.then(async () => {
      if (this.owner === owner) {
        this.cleanup();
        this.owner = null;
        await this.clearLocalNotifications();
      }
    }, async error => {
      console.warn('[Push] Device-token removal failed; unregistration not confirmed');
      if (forceLocalCleanup && this.owner === owner) {
        if (Platform.OS === 'web') {
          try { await revokeWebFcmToken(); }
          catch { console.warn('[Push] Browser subscription removal could not be confirmed'); }
        }
        this.cleanup();
        this.owner = null;
        await this.clearLocalNotifications();
      }
      throw error;
    });
    this.removing = completed;
    try { await completed; } finally {
      if (this.removing === completed) this.removing = null;
    }
  }

  private async clearLocalNotifications(): Promise<void> {
    this.shownToastIds.clear();
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
        await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => {});
      }
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
        const notifications = await registration?.getNotifications().catch(() => []);
        notifications?.forEach(notification => notification.close());
      }
    } else {
      await Notifications.setBadgeCountAsync(0).catch(() => {});
      await Notifications.dismissAllNotificationsAsync().catch(() => {});
    }
    try {
      const storage = require('@react-native-async-storage/async-storage').default;
      await storage.removeItem(PushNotificationService.SHOWN_IDS_STORAGE_KEY);
    } catch { /* Notification cleanup must not restore an ended session. */ }
  }

  private startWebTokenMonitor(owner: PushOwner): void {
    if (typeof window === 'undefined') return;
    let checking = false;
    const check = async () => {
      if (checking || !this.isCurrent(owner) || getWebNotificationPermissionStatus() !== 'granted') return;
      checking = true;
      try {
        const token = await getWebFcmToken();
        if (!token || !this.isCurrent(owner) || token === owner.token) return;
        owner.token = token;
        this.token = token;
        await this.registerTokenWithBackend(owner);
      } catch {
        console.warn('[Push] Token rotation registration failed; will retry');
        if (this.isCurrent(owner)) owner.token = null;
      } finally { checking = false; }
    };
    const interval = setInterval(() => { void check(); }, 60_000);
    const onFocus = () => { void check(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    this.stopTokenMonitor = () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }

  private cleanup(): void {
    this.stopTokenMonitor?.();
    this.stopTokenMonitor = null;
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
    this.handledResponseIds.clear();
  }

  async getStatus() {
    try {
      return await deviceApiService.getPushStatus();
    } catch (error) {
      console.warn('[Push] Failed to get status');
      return null;
    }
  }

  async sendTestNotification(): Promise<{ success: boolean; debugInfo: string }> {
    const debugInfo: string[] = [];
    debugInfo.push(`Platform: ${Platform.OS}`);
    debugInfo.push(`Initialized: ${this.isInitialized}`);
    debugInfo.push(`Token exists: ${!!this.token}`);
    debugInfo.push(`Device token: ${this.token ? '[REDACTED]' : 'none'}`);
    
    if (!this.token) {
      const msg = 'No push token available. Push notifications not initialized.';
      debugInfo.push(`Error: ${msg}`);
      return { success: false, debugInfo: debugInfo.join('\n') };
    }
    
    try {
      const result = await deviceApiService.sendTestNotification();
      debugInfo.push('Backend test request completed; response payload omitted.');
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
      info.push('Device token: [REDACTED]');
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
