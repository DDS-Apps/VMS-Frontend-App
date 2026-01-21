importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAY6g-50Gu5zlB3sbkKHuuG5DpBOLZd_xo",
  authDomain: "dallah-albaraka-vms.firebaseapp.com",
  projectId: "dallah-albaraka-vms",
  storageBucket: "dallah-albaraka-vms.firebasestorage.app",
  messagingSenderId: "913604772710",
  appId: "1:913604772710:web:46c93bf8fbcd061362bea7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  
  const notificationTitle = payload.notification?.title || 'VMS Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/assets/images/icon.png',
    badge: '/assets/images/icon.png',
    tag: payload.data?.notificationId || 'vms-notification',
    data: payload.data,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
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
