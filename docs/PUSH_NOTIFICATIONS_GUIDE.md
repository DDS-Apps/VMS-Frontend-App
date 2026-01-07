# Push Notifications Implementation Guide

This guide provides complete instructions for implementing push notifications in your frontend application (Web, iOS, Android) to integrate with the VMS Enterprise API backend.

## Table of Contents

1. [Overview](#overview)
2. [Firebase Project Setup](#firebase-project-setup)
3. [API Endpoints](#api-endpoints)
4. [Web Implementation](#web-implementation)
5. [React Native / Expo Implementation](#react-native--expo-implementation)
6. [Handling Notifications](#handling-notifications)
7. [Deep Linking](#deep-linking)
8. [User Preferences](#user-preferences)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The VMS API uses Firebase Cloud Messaging (FCM) for push notifications across all platforms:

| Platform | Delivery Method |
|----------|-----------------|
| Android | FCM directly |
| iOS | FCM → APNs |
| Web | FCM via Service Worker |

### Notification Events

The backend sends push notifications through the `NotificationDispatcherService`, which routes notifications to the appropriate channels (push, email, SMS) based on user preferences. The following events are integrated:

| Event | Recipients | Integration Status |
|-------|------------|-------------------|
| Request approved/rejected | Host | Integrated via ApprovalsService |
| Visitor accepts/rejects invite | Host | Integrated via ApprovalsService |
| Visitor checks in | Host | Integrated via ReceptionService |
| Visitor checks out | Host | Integrated via ReceptionService |
| Reminder (no response) | Visitor | Integrated via ReminderSchedulerService |
| Auto-cancellation | Host + Visitor | Integrated via ReminderSchedulerService |
| Valet task assigned | Valet staff | Integrated via ValetAdminService |
| Buffet task assigned | Buffet staff | Integrated via BuffetAdminService |

**Note:** Push notifications are only delivered if:
1. The user has registered a device token
2. Push is enabled in their notification preferences
3. The notification category is enabled (e.g., `visitorArrivals`, `valetTasks`)
4. It's not during their quiet hours

---

## Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the wizard
3. Enable Google Analytics (optional)

### Step 2: Get Configuration

#### For Web:
1. Go to Project Settings → General
2. Under "Your apps", click the web icon (`</>`)
3. Register your app and copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

#### For Mobile (iOS/Android):
1. Go to Project Settings → General
2. Add your iOS/Android app
3. Download `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)

### Step 3: Get VAPID Key (Web Only)

1. Go to Project Settings → Cloud Messaging
2. Under "Web configuration", generate or copy the VAPID key pair
3. Save the public key for your web app

---

## API Endpoints

Base URL: `https://your-api-domain/api/v1`

All endpoints require JWT authentication:
```
Authorization: Bearer <your_jwt_token>
```

### Register Device Token

**POST** `/devices/token`

Register a device to receive push notifications.

```json
{
  "deviceToken": "your-device-token-from-firebase",
  "platform": "android",
  "deviceName": "John's Phone",
  "deviceModel": "Samsung Galaxy S23",
  "appVersion": "1.0.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceToken | string | Yes | Device token from Firebase SDK |
| platform | string | Yes | `android`, `ios`, or `web` |
| deviceName | string | No | User-friendly device name |
| deviceModel | string | No | Device model identifier |
| appVersion | string | No | Your app version |

**Response (201):**
```json
{
  "id": "device-uuid",
  "platform": "android",
  "deviceName": "John's Phone",
  "isActive": true,
  "registeredAt": "2025-01-01T10:00:00Z"
}
```

### Unregister Device Token

**DELETE** `/devices/token`

Unregister a specific device (e.g., on logout).

```json
{
  "deviceToken": "your-device-token"
}
```

### Unregister All Devices

**DELETE** `/devices/tokens`

Unregister all devices for the current user.

### Get Registered Devices

**GET** `/devices/tokens`

List all registered devices for the current user.

**Response (200):**
```json
{
  "devices": [
    {
      "id": "device-uuid",
      "platform": "android",
      "deviceName": "John's Phone",
      "deviceModel": "Samsung Galaxy S23",
      "appVersion": "1.0.0",
      "lastUsedAt": "2025-01-01T12:00:00Z",
      "registeredAt": "2025-01-01T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Get Push Status

**GET** `/devices/status`

Check if push notifications are enabled and get device count.

**Response (200):**
```json
{
  "pushEnabled": true,
  "registeredDevices": 2,
  "platforms": ["android", "web"]
}
```

### Send Test Notification

**POST** `/devices/test`

Send a test notification to all your registered devices.

```json
{
  "title": "Test Notification",
  "body": "This is a test push notification!",
  "data": {
    "screen": "notifications",
    "testId": "123"
  }
}
```

---

## Web Implementation

### Step 1: Install Firebase SDK

```bash
npm install firebase
```

### Step 2: Initialize Firebase

Create `src/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
let messaging: Messaging | null = null;

// Only initialize messaging in browser environment
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messaging = getMessaging(app);
}

export { messaging };

// Get FCM token
export async function getFcmToken(): Promise<string | null> {
  if (!messaging) {
    console.warn('Firebase messaging not available');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get token
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_PUBLIC_KEY'
    });

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}
```

### Step 3: Create Service Worker

Create `public/firebase-messaging-sw.js`:

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'VMS Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: payload.data?.notificationId || 'vms-notification',
    data: payload.data,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let targetUrl = '/';

  // Deep link based on notification type
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
        // Focus existing window or open new one
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
```

### Step 4: Register Token with Backend

Create `src/services/pushService.ts`:

```typescript
import { getFcmToken, onForegroundMessage } from '../firebase';
import { apiClient } from './apiClient'; // Your API client

export class PushNotificationService {
  private static instance: PushNotificationService;
  private token: string | null = null;

  static getInstance() {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize() {
    // Get FCM token
    this.token = await getFcmToken();
    
    if (this.token) {
      // Register with backend
      await this.registerToken();
      
      // Listen for foreground messages
      onForegroundMessage((payload) => {
        this.handleForegroundNotification(payload);
      });
    }
  }

  private async registerToken() {
    if (!this.token) return;

    try {
      await apiClient.post('/devices/token', {
        deviceToken: this.token,
        platform: 'web',
        deviceName: this.getBrowserName(),
        appVersion: '1.0.0'
      });
      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  async unregister() {
    if (!this.token) return;

    try {
      await apiClient.delete('/devices/token', {
        data: { deviceToken: this.token }
      });
      console.log('Push token unregistered');
    } catch (error) {
      console.error('Failed to unregister push token:', error);
    }
  }

  private handleForegroundNotification(payload: any) {
    // Show in-app notification (e.g., toast)
    const { title, body } = payload.notification || {};
    
    // Use your preferred notification library
    // Example with browser Notification API:
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }

    // Or dispatch to your state management
    // store.dispatch(addNotification(payload));
  }

  private getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Safari')) return 'Safari Browser';
    if (ua.includes('Edge')) return 'Edge Browser';
    return 'Web Browser';
  }
}
```

### Step 5: Initialize on Login

```typescript
// After successful login
import { PushNotificationService } from './services/pushService';

async function onLoginSuccess() {
  // ... your login logic
  
  // Initialize push notifications
  const pushService = PushNotificationService.getInstance();
  await pushService.initialize();
}

// On logout
async function onLogout() {
  const pushService = PushNotificationService.getInstance();
  await pushService.unregister();
  
  // ... your logout logic
}
```

---

## React Native / Expo Implementation

### Step 1: Install Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

### Step 2: Configure Firebase

For Expo managed workflow with EAS Build:

1. Place `google-services.json` in your project root
2. Update `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

### Step 3: Create Push Service

Create `src/services/pushNotifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class PushNotificationService {
  private static instance: PushNotificationService;
  private token: string | null = null;
  private notificationListener: any;
  private responseListener: any;

  static getInstance() {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(onNotificationReceived?: (notification: any) => void, onNotificationTapped?: (response: any) => void) {
    // Must be physical device
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Get FCM token (not Expo push token)
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      this.token = tokenData.data;
      
      // Register with backend
      await this.registerToken();
    } catch (error) {
      console.error('Failed to get push token:', error);
      return;
    }

    // Android channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
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
    }

    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    // Listen for notification taps
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      onNotificationTapped?.(response);
      this.handleNotificationTap(response);
    });
  }

  private async registerToken() {
    if (!this.token) return;

    const platform = Platform.OS as 'android' | 'ios';
    const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;
    const deviceModel = Device.modelName || 'Unknown';

    try {
      await apiClient.post('/devices/token', {
        deviceToken: this.token,
        platform,
        deviceName,
        deviceModel,
        appVersion: '1.0.0' // Get from app.json or Constants
      });
      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  async unregister() {
    if (!this.token) return;

    try {
      await apiClient.delete('/devices/token', {
        data: { deviceToken: this.token }
      });
    } catch (error) {
      console.error('Failed to unregister:', error);
    }

    // Cleanup listeners
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  private handleNotificationTap(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    // Use your navigation library (e.g., React Navigation)
    switch (data?.type) {
      case 'visitor_arrived':
        // navigation.navigate('VisitDetails', { id: data.requestId });
        break;
      case 'approval_required':
        // navigation.navigate('Approvals');
        break;
      case 'security_alert':
        // navigation.navigate('SecurityAlerts');
        break;
      default:
        // navigation.navigate('Notifications');
        break;
    }
  }

  async getStatus() {
    try {
      const response = await apiClient.get('/devices/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get push status:', error);
      return null;
    }
  }

  async sendTestNotification() {
    try {
      const response = await apiClient.post('/devices/test', {
        title: 'Test Notification',
        body: 'Push notifications are working!'
      });
      return response.data;
    } catch (error) {
      console.error('Test notification failed:', error);
      throw error;
    }
  }
}
```

### Step 4: Initialize in App

In `App.tsx` or your root component:

```typescript
import { useEffect, useRef } from 'react';
import { PushNotificationService } from './services/pushNotifications';
import { useNavigation } from '@react-navigation/native';

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Initialize after user is authenticated
    async function setupPushNotifications() {
      const pushService = PushNotificationService.getInstance();
      
      await pushService.initialize(
        // On notification received (foreground)
        (notification) => {
          console.log('Notification:', notification);
          // Show in-app banner or update UI
        },
        // On notification tapped
        (response) => {
          const data = response.notification.request.content.data;
          // Handle navigation
        }
      );
    }

    setupPushNotifications();

    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  return (
    // Your app component
  );
}
```

---

## Handling Notifications

### Notification Payload Structure

The backend sends notifications with this structure:

```json
{
  "notification": {
    "title": "Visitor Arrived",
    "body": "John Smith has checked in at the main gate"
  },
  "data": {
    "type": "visitor_arrived",
    "requestId": "uuid-here",
    "visitorName": "John Smith",
    "notificationId": "notification-uuid",
    "timestamp": "2025-01-01T10:00:00Z"
  }
}
```

### Notification Types

| Type | Description | Data Fields |
|------|-------------|-------------|
| `approval_required` | Manager needs to approve request | `requestId`, `visitorName`, `hostName` |
| `request_approved` | Request was approved | `requestId` |
| `request_rejected` | Request was rejected | `requestId`, `reason` |
| `visitor_accepted` | Visitor accepted invitation | `requestId`, `visitorName` |
| `visitor_rejected` | Visitor rejected invitation | `requestId`, `visitorName` |
| `visitor_arrived` | Visitor checked in | `requestId`, `visitorName`, `gateLocation` |
| `visitor_departed` | Visitor checked out | `requestId`, `visitorName` |
| `reminder` | Reminder notification | `requestId`, `reminderType` |
| `auto_cancelled` | Request auto-cancelled | `requestId`, `reason` |
| `security_alert` | Security incident | `alertId`, `alertType`, `location` |
| `valet_task` | Valet task assigned | `taskId`, `taskType` |
| `buffet_task` | Buffet task assigned | `taskId`, `location` |

---

## Deep Linking

### URL Scheme Setup

For mobile apps, configure deep linking with the `dallahvms://` scheme:

**app.json (Expo):**
```json
{
  "expo": {
    "scheme": "dallahvms",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "dallahvms" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### Deep Link Routes

| Route | Description |
|-------|-------------|
| `dallahvms://visits/{id}` | Open visit details |
| `dallahvms://approvals` | Open approvals list |
| `dallahvms://approvals/{id}` | Open specific approval |
| `dallahvms://notifications` | Open notifications |
| `dallahvms://security/alerts` | Open security alerts |
| `dallahvms://valet/tasks/{id}` | Open valet task |
| `dallahvms://buffet/tasks/{id}` | Open buffet task |

---

## User Preferences

### Get Notification Preferences

**GET** `/users/me/notification-preferences`

```json
{
  "pushEnabled": true,
  "emailEnabled": true,
  "smsEnabled": false,
  "whatsappEnabled": false,
  "requestUpdates": true,
  "visitorResponses": true,
  "visitorArrivals": true,
  "approvalRequests": true,
  "buffetTasks": true,
  "valetTasks": true,
  "securityAlerts": true,
  "gateEvents": false,
  "systemAlerts": true,
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00"
}
```

### Update Preferences

**PUT** `/users/me/notification-preferences`

```json
{
  "pushEnabled": true,
  "visitorArrivals": true,
  "quietHoursEnabled": true,
  "quietHoursStart": "23:00",
  "quietHoursEnd": "06:00"
}
```

---

## Troubleshooting

### Common Issues

#### 1. Token Registration Fails

- **Check:** JWT token is valid and not expired
- **Check:** Network connectivity
- **Check:** FCM token format (should be a long string)

#### 2. Notifications Not Received

- **Check:** Device token is registered (`GET /devices/status`)
- **Check:** User preferences allow the notification category
- **Check:** Not in quiet hours
- **Check:** For iOS: APNs certificate is configured in Firebase
- **Check:** For web: Service worker is registered

#### 3. Service Worker Not Loading (Web)

- **Check:** File is in `public/` directory
- **Check:** HTTPS is enabled (required for service workers)
- **Check:** No JavaScript errors in the service worker

#### 4. "messaging/permission-blocked" Error

User denied notification permission. Guide them to:
- **Chrome:** Settings → Privacy → Site Settings → Notifications
- **iOS:** Settings → App → Notifications
- **Android:** Settings → Apps → App → Notifications

### Debug Endpoints

Use these for testing:

```bash
# Check if token is registered
GET /api/v1/devices/status

# List all registered devices
GET /api/v1/devices/tokens

# Send test notification
POST /api/v1/devices/test
{
  "title": "Debug Test",
  "body": "Testing push notifications"
}
```

### Logs to Check

Backend logs will show:
```
[PushService] Device token registered for user {userId} on {platform}
[PushService] Push sent: X success, Y failed, Z invalid tokens removed
```

---

## Quick Start Checklist

- [ ] Create Firebase project
- [ ] Get Firebase config (web) or download config files (mobile)
- [ ] Get VAPID key (web only)
- [ ] Install Firebase SDK
- [ ] Create service worker (web) or configure Expo (mobile)
- [ ] Implement token registration on login
- [ ] Implement token unregistration on logout
- [ ] Handle foreground notifications
- [ ] Handle notification taps with navigation
- [ ] Set up deep linking
- [ ] Test with `/devices/test` endpoint

---

## Support

For backend API issues, check:
- Swagger documentation at `/api/docs`
- Application logs for error details

For Firebase issues, check:
- [Firebase Console](https://console.firebase.google.com/) → Cloud Messaging
- [FCM Diagnostics](https://firebase.google.com/docs/cloud-messaging/understand-delivery)
