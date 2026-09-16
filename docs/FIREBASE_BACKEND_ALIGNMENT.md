# Firebase Backend Alignment

This document is the source of truth for aligning the VMS backend, Android,
iOS, and web push notification configuration.

QA and production use different backend environments, but they intentionally
use the **same Firebase project and client applications**.

## Security Boundary

The identifiers and client API keys in this document are public Firebase client
configuration. They are included so teams can compare configurations exactly.

Never add any of the following to this document, source control, tickets, chat,
or application logs:

- Firebase service-account JSON
- A service-account `private_key`
- Access tokens or refresh tokens
- Apple APNs `.p8` file contents
- Apple account passwords
- Replit secret values

Store private values in the backend environment's secret manager. Only secret
names and validation instructions belong in source control.

## Authoritative Firebase Project

| Setting | Required value |
| --- | --- |
| Firebase project name | Dallah Albaraka VMS |
| Firebase project ID | `dallah-albaraka-vms` |
| Google Cloud project number | `913604772710` |
| FCM sender ID | `913604772710` |
| Auth domain | `dallah-albaraka-vms.firebaseapp.com` |
| Storage bucket | `dallah-albaraka-vms.firebasestorage.app` |
| Web measurement ID | `G-Y5G46SXSQB` |

Do not use the obsolete `dallahdigital-vms` project or sender
`224821384776`. Tokens created by that sender are not compatible with Firebase
Admin credentials from `dallah-albaraka-vms`.

## Registered Firebase Applications

### Web

| Setting | Required value |
| --- | --- |
| Firebase app ID | `1:913604772710:web:46c93bf8fbcd061362bea7` |
| Web API key | `AIzaSyAY6g-50Gu5zlB3sbkKHuuG5DpBOLZd_xo` |
| VAPID public key | `BKXyeihYX0n_rNHIEIP26eNGnbVZL_rCsiLnA7jv0ZuIThHmbV0FJqENbmt-QnikL4uqKbh3lYqp0sqAQImDass` |

### Android

| Setting | Required value |
| --- | --- |
| Package name | `com.dallah.vms` |
| Firebase app ID | `1:913604772710:android:a9320215a876705e62bea7` |
| Android client API key | `AIzaSyApEOEi6r3jUU0njwUlMDg55T4cxvRXv8g` |
| Native configuration | `config/qa/google-services.json` |

### iOS

| Setting | Required value |
| --- | --- |
| Bundle ID | `com.dallah.vms` |
| Firebase app ID | `1:913604772710:ios:ea764c22ce480dec62bea7` |
| iOS client API key | `AIzaSyCxE8cPiT2IMRlQcNURZjqboEebnqKz4HA` |
| Apple Team ID | `SNJM77V43A` |
| Native configuration | `config/qa/GoogleService-Info.plist` |

The production copies under `config/prod/` must remain byte-for-byte identical
to the QA native files. The Expo configuration currently selects the QA paths
for every build profile to make the shared Firebase project explicit.

Expected SHA-256 checksums:

| File content | SHA-256 |
| --- | --- |
| Android `google-services.json` | `48e8d140ad8b2f6cdb7328629d636aeb65105bbeb2d45cb3c452591022da3f57` |
| iOS `GoogleService-Info.plist` | `46163250977e30b9185b7df8f33a645ba73fd9fe1ad32f01196316da01130b34` |

## Frontend Environment Variables

These variables are public client configuration. If they are set remotely for
an EAS profile or deployment, their values must match this document.

```text
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=dallah-albaraka-vms.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=dallah-albaraka-vms
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=dallah-albaraka-vms.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=913604772710
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Y5G46SXSQB
EXPO_PUBLIC_FIREBASE_APP_ID_WEB=1:913604772710:web:46c93bf8fbcd061362bea7
EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID=1:913604772710:android:a9320215a876705e62bea7
EXPO_PUBLIC_FIREBASE_APP_ID_IOS=1:913604772710:ios:ea764c22ce480dec62bea7
EXPO_PUBLIC_FIREBASE_VAPID_KEY
```

`EXPO_PUBLIC_FIREBASE_API_KEY` uses the web API key, and
`EXPO_PUBLIC_FIREBASE_VAPID_KEY` uses the VAPID public key listed above.

Backend URLs remain environment-specific. Do not infer QA versus production
from the Firebase project ID because both environments share it.

## Backend Firebase Admin Secrets

The backend must initialize Firebase Admin with a service account downloaded
from:

```text
Firebase Console
→ dallah-albaraka-vms
→ Project settings
→ Service accounts
→ Firebase Admin SDK
```

Use one of the following secret layouts. Use the names already established by
the backend when possible; do not configure both layouts simultaneously.

### Option A: one JSON secret

Recommended secret:

```text
FIREBASE_SERVICE_ACCOUNT_JSON=<complete service-account JSON>
```

The JSON must remain a secret. Do not commit it to a file.

Required JSON metadata:

```json
{
  "type": "service_account",
  "project_id": "dallah-albaraka-vms",
  "private_key_id": "<secret metadata>",
  "private_key": "<secret>",
  "client_email": "<service account>@dallah-albaraka-vms.iam.gserviceaccount.com",
  "client_id": "<secret metadata>",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### Option B: separate secrets

```text
FIREBASE_PROJECT_ID=dallah-albaraka-vms
FIREBASE_CLIENT_EMAIL=<service account>@dallah-albaraka-vms.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=<secret PEM private key>
```

If the secret manager stores newlines as the two characters `\` and `n`, the
backend may need to convert `\\n` to real newline characters before passing the
key to Firebase Admin. Never print the converted key.

For this layout, construct the same in-memory service-account object used by
Option A:

```ts
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};
```

Run every assertion below against this constructed object before initializing
Firebase Admin.

### Backend startup assertions

Before accepting traffic, the backend should fail startup if:

- The credential `project_id` is not exactly `dallah-albaraka-vms`.
- An explicitly configured Firebase project ID disagrees with the credential.
- The client email does not end in
  `@dallah-albaraka-vms.iam.gserviceaccount.com`.
- Required credential fields are missing.

Safe startup logging:

```text
Firebase Admin initialized
projectId=dallah-albaraka-vms
senderId=913604772710
clientEmailDomain=dallah-albaraka-vms.iam.gserviceaccount.com
```

Do not log the service-account JSON, private key, access token, or full device
token.

## Firebase Admin Initialization Example

Adapt this example to the backend framework. It intentionally reads credentials
from secrets and logs only non-sensitive metadata.

```ts
import { cert, getApps, initializeApp } from "firebase-admin/app";

const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!rawCredential) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required");
}

const serviceAccount = JSON.parse(rawCredential);
const expectedProjectId = "dallah-albaraka-vms";

if (serviceAccount.project_id !== expectedProjectId) {
  throw new Error(
    `Firebase project mismatch: expected ${expectedProjectId}`
  );
}

if (
  typeof serviceAccount.client_email !== "string" ||
  !serviceAccount.client_email.endsWith(
    "@dallah-albaraka-vms.iam.gserviceaccount.com"
  )
) {
  throw new Error("Firebase service-account email belongs to another project");
}

const firebaseAppName = "vms-backend";
const existingFirebaseApp = getApps().find(
  (app) => app.name === firebaseAppName
);

if (existingFirebaseApp) {
  throw new Error(
    "Firebase Admin was initialized before credential validation"
  );
}

export const firebaseApp = initializeApp(
  {
    credential: cert(serviceAccount),
    projectId: expectedProjectId,
    serviceAccountId: serviceAccount.client_email,
  },
  firebaseAppName
);
```

If the backend uses separate secrets, construct the credential object in memory
and normalize escaped private-key newlines before running the same validation
and initialization code. Do not write the object to disk.

Create the Admin app in one startup module only. Every notification sender must
import the exported `firebaseApp` and call `getMessaging(firebaseApp)`. Never
reuse `getApps()[0]`, and never call parameterless `getMessaging()` in this
backend, because either can select an app that bypassed the alignment checks.

## Device Token Contract

The frontend registers a native FCM token with the backend device-token
endpoint. The registration includes:

```json
{
  "deviceToken": "<native FCM token>",
  "platform": "android | ios | web",
  "deviceName": "<device name>",
  "deviceModel": "<device model when available>",
  "appVersion": "<installed app version>"
}
```

Backend storage should:

- Upsert by token and current user rather than creating uncontrolled duplicates.
- Preserve the platform and app version for diagnostics.
- Update the last-seen timestamp when the same token registers again.
- Remove or disable a token when FCM reports it as unregistered or invalid.
- Never log a complete token. A short prefix is enough for correlation.
- Treat tokens from old app installations as stale after the shared-Firebase
  rebuild.

An FCM registration token does not directly reveal its sender ID. Sender
alignment is proven by the native configuration that generated it and by a
successful send using the matching Firebase Admin project.

## Android Delivery Requirements

1. Build `com.dallah.vms` with the approved `google-services.json`.
2. Ensure the backend uses Firebase Admin credentials from
   `dallah-albaraka-vms`.
3. Send a notification payload containing `title` and `body` for background
   display, plus the application data fields needed for navigation.
4. If `android.notification.channelId` is set, it must match an application
   channel such as `default`, `visitors`, `approvals`, `tasks`, or `reminders`.
5. After installing the new build, register a fresh token and retire the old
   sender's token.

### Valet New-Request Contract

When visit creation selects valet parking (`parkingDecision: "required"`), the
backend must send the event to active `valet_admin` device tokens using this
contract:

```ts
{
  notification: {
    title: "New Valet Request",
    body: "New valet request for <visitor name>"
  },
  data: {
    type: "valet_new_request",
    taskId: "<valet task/request identifier>",
    notificationId: "<stored notification identifier>"
  },
  android: {
    priority: "high",
    notification: {
      channelId: "tasks",
      sound: "default"
    }
  }
}
```

- `notification.title` and `notification.body` are required so Android shows
  the push while the app is backgrounded or terminated.
- `data.type` must be exactly `valet_new_request` in every delivery path.
- Prefer `taskId`; `requestId` is accepted as a compatibility alias. At least
  one must identify a record that the valet task detail endpoint can open.
- The title/body may be localized by recipient preference, but must not contain
  vehicle make, model, color, plate data, or a `{{vehicleInfo}}` placeholder.
- `tasks` is created by the app at high importance. The manifest fallback
  channel remains `default`, which is created at maximum importance.
- Foreground delivery is displayed by the Expo notification handler and
  in-app toast; receipt invalidates valet-admin/task queries and notification
  list/unread-count queries.

## iOS APNs Requirements

The iOS plist identifies the Firebase app but does not contain credentials that
allow Firebase to send through Apple Push Notification service.

Configure APNs in:

```text
Firebase Console
→ dallah-albaraka-vms
→ Project settings
→ Cloud Messaging
→ Apple app configuration
→ com.dallah.vms
```

Upload or verify an APNs authentication key with:

| Setting | Required value |
| --- | --- |
| Apple Team ID | `SNJM77V43A` |
| Bundle ID | `com.dallah.vms` |
| Key ID | Value shown for the selected key in Apple Developer |
| APNs private key | The matching `.p8` file, stored only in Firebase/Apple |

Also verify:

- Push Notifications capability is enabled for the App ID.
- The signed build contains the `aps-environment` entitlement.
- The provisioning profile belongs to Team `SNJM77V43A`.
- Background Modes includes remote notifications when background processing is
  required.
- Testing is done on a physical iPhone, not a simulator.

The backend sends to the iOS FCM token through Firebase Admin. It must not send
the FCM token directly to APNs.

## Backend Send Example

The data object must contain strings because FCM data values are string values.
Use the notification block when the operating system must display the message
while the app is backgrounded or terminated.

```ts
import { getMessaging } from "firebase-admin/messaging";

const response = await getMessaging(firebaseApp).send({
  token: deviceToken,
  notification: {
    title: "Test Notification",
    body: "Firebase configuration is aligned.",
  },
  data: {
    type: "test_notification",
  },
  android: {
    notification: {
      channelId: "default",
    },
  },
  apns: {
    payload: {
      aps: {
        sound: "default",
      },
    },
  },
});
```

Log the FCM message ID and a short token prefix. Do not log the complete token
or credential.

## Verification Checklist

### Configuration

- [ ] Backend credential project ID is `dallah-albaraka-vms`.
- [ ] Backend service-account email belongs to `dallah-albaraka-vms`.
- [ ] Backend expected sender/project number is `913604772710`.
- [ ] Android package is `com.dallah.vms`.
- [ ] iOS bundle ID is `com.dallah.vms`.
- [ ] Firebase Android app ID matches this document.
- [ ] Firebase iOS app ID matches this document.
- [ ] Firebase web app ID and VAPID public key match this document.
- [ ] Firebase has an APNs key for Team `SNJM77V43A`.

### Rollout

- [ ] Create new QA and production Android builds.
- [ ] Create new QA and production iOS builds.
- [ ] Remove the previous app from each test device.
- [ ] Install the new build; Firebase config is native and cannot be corrected
      by an over-the-air JavaScript update.
- [ ] Grant notification permission.
- [ ] Sign in so the app registers a new token with the correct user.
- [ ] Confirm the backend records the current platform and app version.
- [ ] Disable or remove old tokens associated with previous installations.

### Delivery tests

- [ ] Android foreground notification arrives.
- [ ] Android background/terminated notification arrives.
- [ ] iOS foreground notification arrives.
- [ ] iOS background/terminated notification arrives.
- [ ] Web foreground notification arrives.
- [ ] Web background notification arrives through the service worker.
- [ ] Tapping each notification opens the expected application destination.
- [ ] Backend logs contain an FCM message ID and no credential mismatch.

## Troubleshooting Matrix

| Error or symptom | Most likely cause | Required check |
| --- | --- | --- |
| `messaging/mismatched-credential` | Token and Firebase Admin credential belong to different Firebase projects | Confirm Admin `project_id` is `dallah-albaraka-vms`; rebuild/reinstall and register a fresh token |
| `SenderId mismatch` | Token was issued by sender `224821384776` or another sender | Remove old app/token and use sender `913604772710` everywhere |
| `messaging/registration-token-not-registered` | App was removed, token rotated, or token is stale | Disable the stored token and allow the current installation to register again |
| `messaging/invalid-registration-token` | Token is malformed, truncated, or not an FCM registration token | Verify storage and registration endpoint; never modify token text |
| iOS token exists but no notification arrives | Firebase APNs key, Team ID, bundle ID, entitlement, or provisioning does not align | Check the iOS APNs Requirements section and Firebase delivery response |
| APNs authentication/key error | Missing, revoked, or incorrect `.p8` key in Firebase | Upload the valid key with its correct Key ID and Team ID |
| Android foreground works but background does not | Payload lacks a display notification or uses an unavailable channel | Include `notification.title/body` and use an existing channel |
| Web works but native fails | Web credentials are aligned, but native file or Firebase Admin sender is not | Compare native app IDs, sender, clean-install token, and Admin project |
| Backend reports success but user sees nothing | Permission, foreground handling, channel, APNs, or recipient token state differs | Check platform permission, app state, payload, token last-seen, and native logs |

## Non-Secret Evidence to Request

When escalation is necessary, request only:

- Firebase Admin project ID
- Service-account client email domain, not the full credential JSON
- FCM sender/project number
- Platform and app version
- Short token prefix
- FCM message ID
- Firebase Admin error code and message
- iOS bundle ID, Apple Team ID, APNs Key ID, and entitlement environment

Never request private keys or credentials in chat or tickets.
