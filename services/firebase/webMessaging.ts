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
  
  // On Replit, the proxy strips the port - we need to use the base URL without port
  // Check if we're on Replit by looking for replit.dev or replit.app in hostname
  const isReplit = hostname.includes('replit.dev') || hostname.includes('replit.app');
  
  if (isReplit) {
    // Use the full origin without port for Replit
    const baseUrl = `${protocol}//${hostname}`;
    console.log('[Firebase Web] Replit detected, using base URL:', baseUrl);
    return `${baseUrl}/firebase-messaging-sw.js`;
  }
  
  // For other environments, use relative path
  return '/firebase-messaging-sw.js';
}

async function tryRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[Firebase Web] Service workers not supported');
    return null;
  }
  
  try {
    const swUrl = getServiceWorkerUrl();
    console.log('[Firebase Web] Attempting to register service worker at:', swUrl);
    
    // First check if there's an existing registration
    const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
    if (existingRegistration) {
      console.log('[Firebase Web] Using existing service worker registration');
      return existingRegistration;
    }
    
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/firebase-cloud-messaging-push-scope'
    });
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    
    console.log('[Firebase Web] Service worker registered successfully');
    return registration;
  } catch (error) {
    console.warn('[Firebase Web] Service worker registration failed:', error);
    console.log('[Firebase Web] Background messages may not work, but foreground messaging should still function');
    return null;
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

    console.log('[Firebase Web] Checking browser support...');
    console.log('[Firebase Web] window defined:', typeof window !== 'undefined');
    console.log('[Firebase Web] serviceWorker in navigator:', 'serviceWorker' in navigator);

    if (typeof window !== 'undefined') {
      console.log('[Firebase Web] Getting messaging instance...');
      messaging = messagingModule.getMessaging(firebaseApp);
      
      serviceWorkerRegistration = await tryRegisterServiceWorker();
      
      console.log('[Firebase Web] Service worker registered:', !!serviceWorkerRegistration);
      console.log('[Firebase Web] ========== INITIALIZE SUCCESS ==========');
      return true;
    }
    console.log('[Firebase Web] ========== INITIALIZE END (no window object) ==========');
    return false;
  } catch (error) {
    console.error('[Firebase Web] ========== INITIALIZATION ERROR ==========');
    console.error('[Firebase Web] Initialization error:', error);
    return false;
  }
}

export async function getWebFcmToken(): Promise<string | null> {
  console.log('[Firebase Web] ========== GET FCM TOKEN START ==========');
  console.log('[Firebase Web] Platform:', Platform.OS);
  console.log('[Firebase Web] Messaging available:', !!messaging);
  console.log('[Firebase Web] Service worker registered:', !!serviceWorkerRegistration);
  console.log('[Firebase Web] VAPID key configured:', !!VAPID_KEY);

  if (Platform.OS !== 'web' || !messaging) {
    console.log('[Firebase Web] Cannot get token - not web or no messaging');
    return null;
  }

  try {
    console.log('[Firebase Web] Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('[Firebase Web] Permission result:', permission);
    if (permission !== 'granted') {
      console.log('[Firebase Web] Notification permission denied');
      return null;
    }

    console.log('[Firebase Web] Getting real FCM token with VAPID key...');
    const { getToken } = await import('firebase/messaging');
    
    const tokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = { 
      vapidKey: VAPID_KEY 
    };
    
    if (serviceWorkerRegistration) {
      tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
      console.log('[Firebase Web] Using registered service worker for FCM');
    } else {
      console.log('[Firebase Web] No service worker, requesting token without it');
    }
    
    const token = await getToken(messaging, tokenOptions);
    
    if (!token) {
      console.error('[Firebase Web] getToken returned empty token');
      return null;
    }
    
    console.log('[Firebase Web] FCM Token obtained successfully');
    console.log('[Firebase Web] Token prefix:', token.substring(0, 30) + '...');
    console.log('[Firebase Web] ========== GET FCM TOKEN SUCCESS ==========');
    return token;
  } catch (error) {
    console.error('[Firebase Web] ========== GET FCM TOKEN ERROR ==========');
    console.error('[Firebase Web] Error getting FCM token:', error);
    
    if (isLocalDevEnvironment()) {
      console.warn('[Firebase Web] Running on localhost - FCM tokens require HTTPS. Push notifications will not work locally.');
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

  if (serviceWorkerRegistration) {
    console.log('[Firebase Web] Service worker already registered');
    return serviceWorkerRegistration;
  }

  return tryRegisterServiceWorker();
}

export function isWebPushAvailable(): boolean {
  return Platform.OS === 'web' && messaging !== null;
}
