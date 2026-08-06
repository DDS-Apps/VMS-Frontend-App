importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDCXAFTLnvxbG8rH9LblvklbYH5t6pGYkA",
  authDomain: "dallah-vms.firebaseapp.com",
  projectId: "dallah-vms",
  storageBucket: "dallah-vms.firebasestorage.app",
  messagingSenderId: "858912458229",
  appId: "1:858912458229:web:5116cd8e271071a736ccbc"
});

const messaging = firebase.messaging();

// Detect Safari browser in service worker
function isSafari() {
  // Service workers don't have direct access to navigator.userAgent
  // But we can detect Safari by checking for missing features
  return typeof self.clients !== 'undefined' && 
         typeof Notification !== 'undefined' &&
         !('actions' in Notification.prototype);
}

// Build notification options (Safari doesn't support action buttons)
function buildNotificationOptions(payload) {
  const options = {
    body: payload.notification?.body || '',
    icon: '/assets/images/icon.png',
    badge: '/assets/images/icon.png',
    tag: payload.data?.notificationId || 'vms-notification',
    data: payload.data,
    // CRITICAL for Safari: Must show notification immediately or permission gets revoked
    requireInteraction: false,
    silent: false
  };

  // Only add actions for browsers that support them (not Safari)
  // Safari will ignore actions anyway, but being explicit improves compatibility
  if ('actions' in Notification.prototype) {
    options.actions = [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }

  return options;
}

// FCM background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'VMS Notification';
  const notificationOptions = buildNotificationOptions(payload);

  // Show notification immediately - CRITICAL for Safari
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Fallback push event handler for Safari and edge cases
// This ensures we ALWAYS show a notification when a push is received
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  // Let FCM handle it if possible, but ensure we show something
  if (!event.data) {
    console.log('[SW] Push event has no data, showing default notification');
    event.waitUntil(
      self.registration.showNotification('VMS Notification', {
        body: 'You have a new notification',
        icon: '/assets/images/icon.png',
        badge: '/assets/images/icon.png',
        tag: 'vms-fallback'
      })
    );
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[SW] Push payload:', payload);
    
    // Check if FCM will handle this (has FCM-specific structure)
    if (payload.notification || payload.data) {
      // FCM's onBackgroundMessage will handle this
      console.log('[SW] FCM message detected, letting FCM handler process');
      return;
    }
    
    // Non-FCM push, handle directly
    const title = payload.title || 'VMS Notification';
    const options = {
      body: payload.body || '',
      icon: '/assets/images/icon.png',
      badge: '/assets/images/icon.png',
      tag: payload.tag || 'vms-notification',
      data: payload.data || payload
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('[SW] Error parsing push data:', err);
    // Still show a notification to prevent Safari from revoking permissions
    event.waitUntil(
      self.registration.showNotification('VMS Notification', {
        body: 'You have a new notification',
        icon: '/assets/images/icon.png',
        badge: '/assets/images/icon.png',
        tag: 'vms-error-fallback'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let targetUrl = '/';

  if (data?.type === 'visitor_arrived') {
    targetUrl = `/visits/${data.requestId}`;
  } else if (data?.type === 'approval_required') {
    targetUrl = '/approvals';
  } else if (data?.screen) {
    targetUrl = `/${data.screen}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'NOTIFICATION_CLICK', data });
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
