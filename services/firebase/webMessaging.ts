import { Platform } from 'react-native';
import { firebaseConfig, VAPID_KEY } from './config';

type FirebaseApp = any;
type FirebaseMessaging = any;

let messaging: FirebaseMessaging | null = null;
let firebaseApp: FirebaseApp | null = null;
let serviceWorkerAvailable = false;

function isDevEnvironment(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return true;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname.includes('localhost') || 
           hostname.includes('127.0.0.1') || 
           hostname.includes('.replit.dev');
  }
  return false;
}

async function checkServiceWorkerAvailable(): Promise<boolean> {
  console.log('[Firebase Web] Checking service worker file at /firebase-messaging-sw.js...');
  try {
    const response = await fetch('/firebase-messaging-sw.js', { method: 'HEAD' });
    const contentType = response.headers.get('content-type') || '';
    console.log('[Firebase Web] SW check response:', response.ok, 'content-type:', contentType);
    const isAvailable = response.ok && contentType.includes('javascript');
    console.log('[Firebase Web] Service worker file available:', isAvailable);
    return isAvailable;
  } catch (error) {
    console.error('[Firebase Web] SW check error:', error);
    return false;
  }
}

export async function initializeFirebaseWeb(): Promise<boolean> {
  console.log('[Firebase Web] ========== INITIALIZE START ==========');
  if (Platform.OS !== 'web') {
    console.log('[Firebase Web] Not web platform, skipping');
    return false;
  }

  try {
    console.log('[Firebase Web] Importing firebase modules...');
    const firebase = await import('firebase/app');
    const messagingModule = await import('firebase/messaging');

    if (!firebaseApp) {
      console.log('[Firebase Web] Initializing Firebase app...');
      firebaseApp = firebase.initializeApp(firebaseConfig);
    }

    console.log('[Firebase Web] Checking service worker support...');
    console.log('[Firebase Web] window defined:', typeof window !== 'undefined');
    console.log('[Firebase Web] serviceWorker in navigator:', 'serviceWorker' in navigator);

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('[Firebase Web] Checking service worker availability...');
      serviceWorkerAvailable = await checkServiceWorkerAvailable();
      console.log('[Firebase Web] Service worker available:', serviceWorkerAvailable);
      console.log('[Firebase Web] Is dev environment:', isDevEnvironment());
      
      if (!serviceWorkerAvailable && isDevEnvironment()) {
        console.log('[Firebase Web] Service worker not available in development. Web push notifications will work in production builds.');
        console.log('[Firebase Web] ========== INITIALIZE END (dev, no sw) ==========');
        return false;
      }
      
      if (serviceWorkerAvailable) {
        console.log('[Firebase Web] Getting messaging instance...');
        messaging = messagingModule.getMessaging(firebaseApp);
        console.log('[Firebase Web] ========== INITIALIZE SUCCESS ==========');
        return true;
      }
    }
    console.log('[Firebase Web] ========== INITIALIZE END (no sw support) ==========');
    return false;
  } catch (error) {
    console.error('[Firebase Web] ========== INITIALIZATION ERROR ==========');
    console.error('[Firebase Web] Initialization error:', error);
    return false;
  }
}

export async function getWebFcmToken(): Promise<string | null> {
  if (Platform.OS !== 'web' || !messaging || !serviceWorkerAvailable) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Firebase Web] Notification permission denied');
      return null;
    }

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('[Firebase Web] FCM Token obtained');
    return token;
  } catch (error) {
    console.error('[Firebase Web] Error getting FCM token:', error);
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
      console.log('[Firebase Web] Foreground message received:', payload);
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

  if (!serviceWorkerAvailable) {
    if (isDevEnvironment()) {
      console.log('[Firebase Web] Skipping service worker registration in development environment.');
    }
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[Firebase Web] Service worker registered');
    return registration;
  } catch (error) {
    console.error('[Firebase Web] Service worker registration failed:', error);
    return null;
  }
}

export function isWebPushAvailable(): boolean {
  return Platform.OS === 'web' && serviceWorkerAvailable && messaging !== null;
}
