# Push Notifications Debugging Guide

This document explains how the VMS mobile app registers devices for push notifications, what data is sent to Firebase and the backend, and how to debug notification delivery failures.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Platform-Specific Token Retrieval](#platform-specific-token-retrieval)
3. [Device Registration Flow](#device-registration-flow)
4. [Backend API Endpoints](#backend-api-endpoints)
5. [Firebase Configuration Requirements](#firebase-configuration-requirements)
6. [Debugging Checklist](#debugging-checklist)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Log Examples](#log-examples)

---

## Architecture Overview

The VMS app uses **Firebase Cloud Messaging (FCM)** as the unified push notification service for all platforms. The backend always receives FCM tokens, regardless of the platform.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PUSH NOTIFICATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    FCM Token    ┌──────────────┐    Send Push    ┌─────┐ │
│  │  iOS Device  │ ───────────────>│   Backend    │ ───────────────>│ FCM │ │
│  │ (Firebase    │                 │   Server     │                 │     │ │
│  │  Messaging)  │                 │              │                 └──┬──┘ │
│  └──────────────┘                 │              │                    │    │
│                                   │              │                    │    │
│  ┌──────────────┐    FCM Token    │              │    FCM routes     │    │
│  │Android Device│ ───────────────>│              │    to APNs        │    │
│  │ (expo-notif) │                 │              │         │         │    │
│  └──────────────┘                 │              │         ▼         │    │
│                                   │              │    ┌─────────┐    │    │
│  ┌──────────────┐    FCM Token    │              │    │  APNs   │    │    │
│  │  Web Browser │ ───────────────>│              │    │(for iOS)│    │    │
│  │  (Firebase)  │                 └──────────────┘    └─────────┘    │    │
│  └──────────────┘                                                    │    │
│                                                                      │    │
│  All platforms send FCM tokens to backend.                          │    │
│  Backend sends to FCM, which routes iOS to APNs automatically.      │    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Points:
- **iOS**: Uses `@react-native-firebase/messaging` to get FCM tokens (not APNs tokens)
- **Android**: Uses `expo-notifications` which returns native FCM tokens directly
- **Web**: Uses Firebase SDK with VAPID key to get FCM tokens

---

## Platform-Specific Token Retrieval

### iOS (via @react-native-firebase/messaging)

```typescript
// 1. Request permission
const authStatus = await firebase.messaging().requestPermission();

// 2. Register for remote messages
await firebase.messaging().registerDeviceForRemoteMessages();

// 3. Get FCM token (NOT APNs token)
const fcmToken = await firebase.messaging().getToken();
```

**Important iOS Notes:**
- Requires EAS Build with `@react-native-firebase/app` and `@react-native-firebase/messaging`
- Will NOT work in Expo Go - requires production/development build
- Firebase project must have APNs key configured in Cloud Messaging settings
- FCM automatically routes to APNs for iOS devices

### Android (via expo-notifications)

```typescript
// 1. Request permission
const { status } = await Notifications.requestPermissionsAsync();

// 2. Get device push token (native FCM token)
const tokenData = await Notifications.getDevicePushTokenAsync();
const fcmToken = tokenData.data;
// tokenData.type will be 'firebase' on Android
```

**Important Android Notes:**
- `getDevicePushTokenAsync()` returns the native FCM token directly
- Do NOT use `getExpoPushTokenAsync()` - that returns an Expo token, not FCM

### Web (via Firebase SDK)

```typescript
// 1. Initialize Firebase
initializeApp(firebaseConfig);

// 2. Get messaging instance
const messaging = getMessaging();

// 3. Request permission and get token
const token = await getToken(messaging, { vapidKey: VAPID_KEY });
```

**Important Web Notes:**
- Requires VAPID key from Firebase Console → Project Settings → Cloud Messaging
- Requires service worker for background notifications
- User must grant notification permission in browser

---

## Device Registration Flow

### When Registration Happens

Registration is triggered from `contexts/AuthContext.tsx` in these scenarios:

1. **On SSO Login**: After successful SSO hash token handling, `pushNotificationService.initialize()` is called
2. **On Standard Login**: After `handleTokenResponse()` processes login, `pushNotificationService.initialize()` is called
3. **On App Launch (with stored tokens)**: In `initializeAuth()`, if valid stored tokens exist and user is restored, `pushNotificationService.initialize()` is called
4. **On Logout**: `pushNotificationService.unregister()` is called in `handleLogout()` to remove the device token

### Registration Sequence

```
User Login
    │
    ▼
AuthContext.login()
    │
    ▼
pushNotificationService.initialize()
    │
    ├── Check if physical device (skip on simulator/emulator)
    │
    ├── Request notification permission
    │
    ├── Get platform-specific FCM token
    │   ├── iOS: firebase.messaging().getToken()
    │   ├── Android: Notifications.getDevicePushTokenAsync()
    │   └── Web: getToken(messaging, { vapidKey })
    │
    ├── Register token with backend
    │   └── POST /api/v1/devices/token
    │
    └── Set up notification listeners
```

### Token Unregistration (On Logout)

```
User Logout
    │
    ▼
AuthContext.logout()
    │
    ▼
pushNotificationService.unregister()
    │
    └── DELETE /api/v1/devices/token
        Body: { deviceToken: "..." }
```

---

## Backend API Endpoints

### Register Device Token

**Endpoint:** `POST /api/v1/devices/token`

**Request Headers:**
```
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "deviceToken": "cXyZ123...(FCM token)...",
  "platform": "ios" | "android" | "web",
  "deviceName": "iPhone 14 Pro" | "Chrome Browser",
  "deviceModel": "iPhone14,2" | null,
  "appVersion": "1.0.22"
}
```

**Expected Response (200 OK):**
```json
{
  "id": "device-uuid-123",
  "platform": "ios",
  "deviceName": "iPhone 14 Pro",
  "isActive": true,
  "registeredAt": "2025-01-27T10:30:00Z"
}
```

### Unregister Device Token

**Endpoint:** `DELETE /api/v1/devices/token`

**Request Headers:**
```
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "deviceToken": "cXyZ123...(FCM token)..."
}
```

### Get Registered Devices

**Endpoint:** `GET /api/v1/devices/tokens`

**Response:**
```json
{
  "devices": [
    {
      "id": "device-uuid-123",
      "platform": "ios",
      "deviceName": "iPhone 14 Pro",
      "isActive": true,
      "registeredAt": "2025-01-27T10:30:00Z"
    }
  ],
  "count": 1
}
```

### Send Test Notification

**Endpoint:** `POST /api/v1/devices/test`

**Request Body:**
```json
{
  "title": "Test Notification",
  "body": "Push notifications are working!"
}
```

---

## Firebase Configuration Requirements

### iOS Requirements

1. **APNs Key in Firebase Console:**
   - Go to Firebase Console → Project Settings → Cloud Messaging
   - Under "Apple app configuration", add APNs Authentication Key
   - Download .p8 file from Apple Developer Portal
   - Upload to Firebase with Key ID and Team ID

2. **app.json Configuration:**
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.dallah.vms",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ]
  }
}
```

3. **GoogleService-Info.plist:**
   - Download from Firebase Console → Project Settings → Your Apps → iOS
   - Must match bundle identifier: `com.dallah.vms`
   - Place in project root

### Android Requirements

1. **google-services.json:**
   - Download from Firebase Console → Project Settings → Your Apps → Android
   - Must match package name: `com.dallah.vms`
   - Place in project root

2. **app.json Configuration:**
```json
{
  "expo": {
    "android": {
      "package": "com.dallah.vms",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### Web Requirements

1. **VAPID Key:**
   - Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
   - Generate key pair and copy the public key
   - Set as environment variable: `EXPO_PUBLIC_FIREBASE_VAPID_KEY`
   - Can also be configured in `app.json` extra config as `firebase.vapidKey` (fallback)

2. **Service Worker:**
   - `firebase-messaging-sw.js` is located in `web/` folder (not public)
   - Must contain Firebase initialization and messaging handler
   - Deployed alongside web build output

---

## Debugging Checklist

### Device Side (Mobile App)

- [ ] **Is this a physical device?** Push notifications don't work on simulators/emulators
- [ ] **Is notification permission granted?** Check device settings
- [ ] **Is the app built with EAS?** Expo Go doesn't support Firebase Messaging
- [ ] **Is there network connectivity?** Token retrieval requires internet
- [ ] **Check console logs for `[Push]` prefix** - all push-related logs use this prefix

### Backend Side

- [ ] **Is the device token stored in database?** Query by user ID
- [ ] **Is the token still valid?** FCM tokens can expire/rotate
- [ ] **Is the notification being sent?** Check backend logs for FCM API calls
- [ ] **What is FCM returning?** Check for error responses from FCM

### Firebase Side

- [ ] **iOS: Is APNs key configured?** Check Firebase Console → Cloud Messaging
- [ ] **Is the bundle ID correct?** Must match `com.dallah.vms`
- [ ] **Is the Firebase project correct?** QA uses `dallah-albaraka-vms`
- [ ] **Are there FCM quota limits?** Check Firebase Console for quotas

### Common Log Searches

```bash
# Mobile app logs - look for these prefixes:
[Push Mobile]       # Mobile initialization
[Push Mobile iOS]   # iOS-specific logs
[Push Mobile Android] # Android-specific logs
[Push Web]          # Web initialization
[Push Backend]      # Backend registration
[Device API]        # API calls to backend

# Backend logs - look for:
- Device token registration requests
- FCM send requests
- FCM error responses
```

---

## Common Issues and Solutions

### Issue 1: Token Not Being Retrieved (iOS)

**Symptoms:**
- Log shows: `[Push Mobile iOS] Failed to get FCM token`
- No token registered with backend

**Causes & Solutions:**
1. **Not using EAS build**: Build with `eas build` instead of Expo Go
2. **APNs not configured**: Add APNs key to Firebase Console
3. **Wrong GoogleService-Info.plist**: Verify bundle ID matches

### Issue 2: Token Not Being Retrieved (Android)

**Symptoms:**
- Log shows error in `getDevicePushTokenAsync()`
- Token is undefined or empty

**Causes & Solutions:**
1. **google-services.json missing**: Download from Firebase Console
2. **Package name mismatch**: Verify package name in google-services.json
3. **Play Services outdated**: Update Google Play Services on device

### Issue 3: Backend Returns 401 Unauthorized

**Symptoms:**
- Log shows: `[Device API] Error response status: 401`

**Causes & Solutions:**
1. **Token expired**: Refresh the access token
2. **User not logged in**: Ensure auth flow completed
3. **Wrong backend URL**: Verify using correct QA/prod environment

### Issue 4: Notification Sent But Not Received

**Symptoms:**
- Backend logs show successful FCM send
- Device never receives notification

**Causes & Solutions:**
1. **Token rotated**: FCM tokens can change - re-register on app launch
2. **App killed by OS**: Background restrictions on Android/iOS
3. **Do Not Disturb**: Check device notification settings
4. **Wrong Firebase project**: Verify app and backend use same project

### Issue 5: iOS Notification Arrives But No Alert

**Symptoms:**
- Notification received in code
- No visual alert shown

**Causes & Solutions:**
1. **Missing notification payload**: FCM must include `notification` object, not just `data`
2. **App in foreground**: Ensure notification handler is set to show alert
3. **Notification permission**: Check permission is `authorized`, not `provisional`

---

## Log Examples

### Successful iOS Registration

```
[Push] Initialize called, platform: ios, already init: false
[Push Mobile] Step 1: Checking if physical device...
[Push Mobile] Device info: { brand: 'Apple', modelName: 'iPhone 14 Pro', ... }
[Push Mobile iOS] Step 2: Requesting permission via Firebase Messaging...
[Push Mobile iOS] Firebase auth status: 1
[Push Mobile iOS] Permission granted!
[Push Mobile iOS] Step 3: Registering for remote messages...
[Push Mobile iOS] Registered for remote messages
[Push Mobile iOS] Step 4: Getting FCM token...
[Push Mobile iOS] FCM token obtained successfully: cXyZ123abc456def789ghi...
[Push Mobile] Step 6: Registering token with backend...
[Device API] ========== REGISTER TOKEN START ==========
[Device API] Endpoint: https://vms-backend-folio3.replit.app/api/v1/devices/token
[Device API] Auth token present: true
[Device API] Platform: ios
[Device API] Device: iPhone 14 Pro, iPhone14,2
[Device API] Token (first 30 chars): cXyZ123abc456def789ghijklmnop...
[Device API] Token registered successfully, response: {"id":"uuid","platform":"ios",...}
[Device API] ========== REGISTER TOKEN SUCCESS ==========
[Push Mobile] Backend registration complete
[Push Mobile] Initialization COMPLETE! Ready to receive notifications.
```

### Failed Registration (No Auth Token)

```
[Push Mobile] Step 6: Registering token with backend...
[Device API] ========== REGISTER TOKEN START ==========
[Device API] Auth token present: false
[Device API] ========== REGISTER TOKEN FAILED ==========
[Device API] Error message: Request failed with status code 401
[Device API] Error response status: 401
```

### Successful Notification Receipt

```
[Push Mobile] Notification received: New Visitor Request
[Push Mobile] Notification data: { type: "request_created", requestId: "123", ... }
```

---

## Backend Sending Notifications

When sending push notifications from the backend to FCM, use this payload structure:

### FCM HTTP v1 API Payload

```json
{
  "message": {
    "token": "<device_fcm_token>",
    "notification": {
      "title": "New Visitor Request",
      "body": "John Doe is requesting to visit you"
    },
    "data": {
      "type": "request_created",
      "requestId": "123",
      "visitorName": "John Doe",
      "hostName": "Jane Smith"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "visitors"
      }
    },
    "apns": {
      "payload": {
        "aps": {
          "alert": {
            "title": "New Visitor Request",
            "body": "John Doe is requesting to visit you"
          },
          "sound": "default",
          "badge": 1
        }
      }
    }
  }
}
```

### Important Notes for Backend:

1. **Always include both `notification` and `data` objects** - notification for alert display, data for app logic
2. **Use `priority: high` for Android** - ensures delivery when device is in Doze mode
3. **Include `channel_id` for Android** - matches app's notification channels
4. **Include `apns.payload` for iOS** - ensures proper display settings
5. **Use the `data.type` field** - app uses this for navigation and query invalidation

---

## Environment Variables

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `EXPO_PUBLIC_FIREBASE_VAPID_KEY` | Web push certificate key (VAPID) | Firebase Console → Cloud Messaging → Web Push certificates |
| `FIREBASE_PROJECT_ID` | Firebase project identifier | Firebase Console → Project Settings |

**Note:** The VAPID key is loaded from `process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY` or from `app.json` extra config as fallback. See `services/firebase/config.ts`.

---

## Contact & Support

For issues not covered here:
1. Check Firebase Console for FCM delivery reports
2. Review backend logs for FCM API responses
3. Test with `/api/v1/devices/test` endpoint to verify end-to-end flow
