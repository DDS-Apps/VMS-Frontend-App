import { Platform } from 'react-native';
import { firebaseConfig, VAPID_KEY } from './config';

type FirebaseApp = any;
type FirebaseMessaging = any;

let messaging: FirebaseMessaging | null = null;
let firebaseApp: FirebaseApp | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

// Browser detection utilities
interface BrowserInfo {
  name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';
  version: string;
  isPrivateMode: boolean;
  supportsWebPush: boolean;
  supportMessage: string;
}

function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { name: 'unknown', version: '', isPrivateMode: false, supportsWebPush: false, supportMessage: 'Not in browser environment' };
  }

  const ua = navigator.userAgent;
  let name: BrowserInfo['name'] = 'unknown';
  let version = '';
  let supportsWebPush = true;
  let supportMessage = 'Web Push supported';

  // Detect browser
  if (ua.includes('Firefox/')) {
    name = 'firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || '';
    supportMessage = 'Firefox: Web Push supported. Note: Private browsing may block notifications.';
  } else if (ua.includes('Edg/')) {
    name = 'edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || '';
    supportMessage = 'Edge: Web Push fully supported.';
  } else if (ua.includes('Chrome/')) {
    name = 'chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || '';
    supportMessage = 'Chrome: Web Push fully supported.';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    name = 'safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || '';
    const majorVersion = parseInt(version, 10);
    
    // Check if iOS/iPadOS
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const iosVersion = ua.match(/OS (\d+)/)?.[1] || '';
    const iosMajorVersion = parseInt(iosVersion, 10);
    
    if (isIOS) {
      // iOS Safari 16.4+ supports Web Push, BUT only as installed PWA
      if (iosMajorVersion >= 16) {
        // Check if running as installed PWA (standalone mode)
        const isStandalone = (window.navigator as any).standalone === true || 
                            window.matchMedia('(display-mode: standalone)').matches;
        
        if (isStandalone) {
          supportsWebPush = true;
          supportMessage = `iOS Safari ${iosMajorVersion}: Web Push supported in installed PWA mode.`;
        } else {
          supportsWebPush = false;
          supportMessage = `iOS Safari ${iosMajorVersion}: Web Push only works when app is installed to Home Screen as PWA. Add this app to your Home Screen to enable notifications.`;
        }
      } else {
        supportsWebPush = false;
        supportMessage = `iOS Safari ${iosMajorVersion}: Web Push requires iOS 16.4+ and must be installed as PWA. Please use our mobile app for notifications.`;
      }
    } else {
      // macOS Safari
      if (majorVersion < 16) {
        supportsWebPush = false;
        supportMessage = `Safari ${version}: Web Push requires Safari 16+ (macOS Ventura or later). Your version does not support Web Push.`;
      } else {
        supportsWebPush = true;
        supportMessage = `Safari ${version}: Web Push supported on macOS. Note: Notifications must display immediately or permissions may be revoked.`;
      }
    }
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    name = 'opera';
    version = ua.match(/OPR\/(\d+)/)?.[1] || ua.match(/Opera\/(\d+)/)?.[1] || '';
    supportMessage = 'Opera: Web Push supported.';
  }

  console.log(`[FCM Browser] Detected: ${name} v${version}, Web Push support: ${supportsWebPush}`);

  return { name, version, isPrivateMode: false, supportsWebPush, supportMessage };
}

// Check for private/incognito mode (IndexedDB may be blocked)
async function checkPrivateBrowsingMode(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // Try to use IndexedDB - it's blocked or limited in private mode on some browsers
    const testDb = indexedDB.open('test-private-mode');
    
    return new Promise((resolve) => {
      testDb.onerror = () => {
        console.warn('[FCM Browser] Private browsing detected via IndexedDB test');
        resolve(true);
      };
      testDb.onsuccess = () => {
        testDb.result.close();
        indexedDB.deleteDatabase('test-private-mode');
        resolve(false);
      };
      // Timeout after 1 second
      setTimeout(() => resolve(false), 1000);
    });
  } catch {
    return false;
  }
}

export function getBrowserInfo(): BrowserInfo {
  return detectBrowser();
}

function isLocalDevEnvironment(): boolean {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  return false;
}

function getServiceWorkerUrl(): string {
  if (typeof window === 'undefined') {
    return '/firebase-messaging-sw.js';
  }
  
  const { protocol, hostname } = window.location;
  const isReplit = hostname.includes('replit.dev') || hostname.includes('replit.app');
  
  if (isReplit) {
    const baseUrl = `${protocol}//${hostname}`;
    return `${baseUrl}/firebase-messaging-sw.js`;
  }
  
  return '/firebase-messaging-sw.js';
}

async function tryRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    const swUrl = getServiceWorkerUrl();
    
    const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
    if (existingRegistration) {
      return existingRegistration;
    }
    
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/firebase-cloud-messaging-push-scope'
    });
    
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.warn('[Firebase] Service worker registration failed:', error);
    return null;
  }
}

export async function initializeFirebaseWeb(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    return false;
  }

  try {
    // Step 0: Check browser compatibility
    const browserInfo = detectBrowser();
    console.log('[FCM] Browser info:', JSON.stringify(browserInfo));
    
    if (!browserInfo.supportsWebPush) {
      console.warn('[FCM] Browser does not support Web Push:', browserInfo.supportMessage);
      return false;
    }

    // Check for private browsing mode
    const isPrivate = await checkPrivateBrowsingMode();
    if (isPrivate) {
      console.warn('[FCM] Private/Incognito mode detected - FCM may not work properly');
    }

    console.log('[FCM] Step 1: Importing Firebase modules...');
    const firebase = await import('firebase/app');
    const messagingModule = await import('firebase/messaging');

    if (!firebaseApp) {
      console.log('[FCM] Step 2: Initializing Firebase app...');
      firebaseApp = firebase.initializeApp(firebaseConfig);
    }

    if (typeof window !== 'undefined') {
      console.log('[FCM] Step 3: Getting messaging instance...');
      try {
        messaging = messagingModule.getMessaging(firebaseApp);
        console.log('[FCM] Messaging instance created:', !!messaging);
      } catch (msgError) {
        console.error('[FCM] Failed to get messaging instance:', msgError);
        // Firefox-specific: Try alternative approach
        if (browserInfo.name === 'firefox') {
          console.log('[FCM] Firefox detected, trying alternative messaging init...');
        }
        throw msgError;
      }
      
      console.log('[FCM] Step 4: Registering service worker...');
      serviceWorkerRegistration = await tryRegisterServiceWorker();
      console.log('[FCM] Step 5: Firebase init complete, SW registered:', !!serviceWorkerRegistration);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[FCM] Init error:', error);
    if (error instanceof Error) {
      console.error('[FCM] Error name:', error.name);
      console.error('[FCM] Error message:', error.message);
      console.error('[FCM] Error stack:', error.stack);
    }
    return false;
  }
}

export async function getWebFcmToken(): Promise<string | null> {
  const browserInfo = detectBrowser();
  console.log('[FCM] getToken: Starting, messaging available:', !!messaging, 'browser:', browserInfo.name);
  
  if (Platform.OS !== 'web' || !messaging) {
    console.log('[FCM] getToken: Skipped - not web or no messaging');
    return null;
  }

  // Pre-flight checks
  if (!browserInfo.supportsWebPush) {
    console.warn('[FCM] getToken: Browser does not support Web Push -', browserInfo.supportMessage);
    return null;
  }

  try {
    // Check if Notification API is available
    if (typeof Notification === 'undefined') {
      console.error('[FCM] getToken: Notification API not available');
      return null;
    }

    console.log('[FCM] getToken: Current permission status:', Notification.permission);
    console.log('[FCM] getToken: Requesting permission...');
    
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch (permError) {
      console.error('[FCM] getToken: Permission request failed:', permError);
      // Firefox may throw if permission was already denied
      permission = Notification.permission;
    }
    
    console.log('[FCM] getToken: Permission result:', permission);
    
    if (permission !== 'granted') {
      console.log('[FCM] getToken: Permission not granted (status:', permission, ')');
      if (permission === 'denied') {
        console.warn('[FCM] getToken: User has denied notifications. They must enable them in browser settings.');
      }
      return null;
    }

    console.log('[FCM] getToken: Importing getToken function...');
    const { getToken } = await import('firebase/messaging');
    
    console.log('[FCM] getToken: VAPID key exists:', !!VAPID_KEY, 'length:', VAPID_KEY?.length);
    const tokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = { 
      vapidKey: VAPID_KEY 
    };
    
    if (serviceWorkerRegistration) {
      tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
      console.log('[FCM] getToken: Using service worker, state:', serviceWorkerRegistration.active?.state);
    } else {
      console.warn('[FCM] getToken: No service worker registration available');
      // Try to register again
      console.log('[FCM] getToken: Attempting to register service worker...');
      const newReg = await tryRegisterServiceWorker();
      if (newReg) {
        tokenOptions.serviceWorkerRegistration = newReg;
        serviceWorkerRegistration = newReg;
        console.log('[FCM] getToken: Service worker registered on retry');
      }
    }
    
    console.log('[FCM] getToken: Calling Firebase getToken...');
    console.log('[FCM] getToken: Token options:', { 
      hasVapidKey: !!tokenOptions.vapidKey, 
      hasServiceWorker: !!tokenOptions.serviceWorkerRegistration 
    });
    
    let token: string | undefined;
    try {
      token = await getToken(messaging, tokenOptions);
    } catch (tokenError) {
      console.error('[FCM] getToken: Firebase getToken threw error:', tokenError);
      if (tokenError instanceof Error) {
        console.error('[FCM] getToken: Error name:', tokenError.name);
        console.error('[FCM] getToken: Error message:', tokenError.message);
        
        // Firefox-specific error handling
        if (browserInfo.name === 'firefox') {
          if (tokenError.message.includes('storage')) {
            console.error('[FCM] getToken: Firefox storage error - may be in private browsing mode');
          }
          if (tokenError.message.includes('AbortError')) {
            console.error('[FCM] getToken: Firefox AbortError - service worker may have terminated');
          }
        }
      }
      throw tokenError;
    }
    
    if (!token) {
      console.error('[FCM] getToken: Firebase returned empty token');
      return null;
    }
    
    console.log('[FCM] getToken: SUCCESS! Token obtained:', token.substring(0, 20) + '...');
    return token;
  } catch (error) {
    console.error('[FCM] getToken: ERROR:', error);
    
    if (error instanceof Error) {
      console.error('[FCM] getToken: Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
    }
    
    if (isLocalDevEnvironment()) {
      console.warn('[FCM] FCM requires HTTPS');
    }
    
    // Browser-specific troubleshooting hints
    if (browserInfo.name === 'firefox') {
      console.warn('[FCM] Firefox troubleshooting: Check if private browsing mode is enabled, or if notifications are blocked in browser settings.');
    } else if (browserInfo.name === 'safari') {
      console.warn('[FCM] Safari troubleshooting: Ensure you are on macOS Ventura+ with Safari 16+. Web Push is not supported on iOS Safari.');
    }
    
    return null;
  }
}

export function onWebForegroundMessage(callback: (payload: unknown) => void): () => void {
  if (Platform.OS !== 'web' || !messaging) {
    return () => {};
  }

  let unsubscribe: (() => void) | null = null;

  import('firebase/messaging').then(({ onMessage }) => {
    unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
    });
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  return tryRegisterServiceWorker();
}

export function isWebPushAvailable(): boolean {
  return Platform.OS === 'web' && messaging !== null;
}

export function getWebNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return 'unsupported';
  }
  
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  return Notification.permission;
}
