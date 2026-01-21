import { Platform } from 'react-native';
import { firebaseConfig, VAPID_KEY } from './config';

type FirebaseApp = any;
type FirebaseMessaging = any;

let messaging: FirebaseMessaging | null = null;
let firebaseApp: FirebaseApp | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

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
    return null;
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

    if (typeof window !== 'undefined') {
      messaging = messagingModule.getMessaging(firebaseApp);
      serviceWorkerRegistration = await tryRegisterServiceWorker();
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export async function getWebFcmToken(): Promise<string | null> {
  
  if (Platform.OS !== 'web' || !messaging) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return null;
    }

    const { getToken } = await import('firebase/messaging');
    
    const tokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = { 
      vapidKey: VAPID_KEY 
    };
    
    if (serviceWorkerRegistration) {
      tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
    }
    
    const token = await getToken(messaging, tokenOptions);
    
    if (!token) {
      return null;
    }
    
    return token;
  } catch (error) {
    
    if (isLocalDevEnvironment()) {
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
