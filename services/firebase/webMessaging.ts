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
  try {
    const response = await fetch('/firebase-messaging-sw.js', { method: 'HEAD' });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.includes('javascript');
  } catch {
    return false;
  }
}

export async function initializeFirebaseWeb(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    return false;
  }

  try {
    const firebase = await import('firebase/app');
    const messagingModule = await import('firebase/messaging');

    if (!firebaseApp) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      serviceWorkerAvailable = await checkServiceWorkerAvailable();
      
      if (!serviceWorkerAvailable && isDevEnvironment()) {
        console.log('[Firebase Web] Service worker not available in development. Web push notifications will work in production builds.');
        return false;
      }
      
      if (serviceWorkerAvailable) {
        messaging = messagingModule.getMessaging(firebaseApp);
        return true;
      }
    }
    return false;
  } catch (error) {
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
