export { firebaseConfig, VAPID_KEY } from './config';
export {
  initializeFirebaseWeb,
  getWebFcmToken,
  revokeWebFcmToken,
  onWebForegroundMessage,
  registerServiceWorker,
  isWebPushAvailable,
  getWebNotificationPermissionStatus,
} from './webMessaging';
