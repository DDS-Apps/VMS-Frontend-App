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
    console.warn('[Firebase] Service worker registration failed:', error);
    return null;
  }
}

export async function initializeFirebaseWeb(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    return false;
  }

  try {
    console.log('[FCM] Step 1: Importing Firebase modules...');
    const firebase = await import('firebase/app');
    const messagingModule = await import('firebase/messaging');

    if (!firebaseApp) {
      console.log('[FCM] Step 2: Initializing Firebase app...');
      firebaseApp = firebase.initializeApp(firebaseConfig);
    }

    if (typeof window !== 'undefined') {
      console.log('[FCM] Step 3: Getting messaging instance...');
      messaging = messagingModule.getMessaging(firebaseApp);
      console.log('[FCM] Step 4: Registering service worker...');
      serviceWorkerRegistration = await tryRegisterServiceWorker();
      console.log('[FCM] Step 5: Firebase init complete, SW registered:', !!serviceWorkerRegistration);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[FCM] Init error:', error);
    return false;
  }
}

export async function getWebFcmToken(): Promise<string | null> {
  console.log('[FCM] getToken: Starting, messaging available:', !!messaging);
  
  if (Platform.OS !== 'web' || !messaging) {
    console.log('[FCM] getToken: Skipped - not web or no messaging');
    return null;
  }

  try {
    console.log('[FCM] getToken: Requesting permission...');
    const permission = await Notification.requestPermission();
    console.log('[FCM] getToken: Permission result:', permission);
    
    if (permission !== 'granted') {
      console.log('[FCM] getToken: Permission denied');
      return null;
    }

    console.log('[FCM] getToken: Importing getToken function...');
    const { getToken } = await import('firebase/messaging');
    
    console.log('[FCM] getToken: VAPID key exists:', !!VAPID_KEY);
    const tokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = { 
      vapidKey: VAPID_KEY 
    };
    
    if (serviceWorkerRegistration) {
      tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
      console.log('[FCM] getToken: Using service worker');
    }
    
    console.log('[FCM] getToken: Calling Firebase getToken...');
    const token = await getToken(messaging, tokenOptions);
    
    if (!token) {
      console.error('[FCM] getToken: Firebase returned empty token');
      return null;
    }
    
    console.log('[FCM] getToken: SUCCESS! Token obtained:', token.substring(0, 20) + '...');
    return token;
  } catch (error) {
    console.error('[FCM] getToken: ERROR:', error);
    
    if (isLocalDevEnvironment()) {
      console.warn('[FCM] FCM requires HTTPS');
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
