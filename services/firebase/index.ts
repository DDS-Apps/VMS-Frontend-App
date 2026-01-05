export { firebaseConfig, VAPID_KEY } from './config';
export {
  initializeFirebaseWeb,
  getWebFcmToken,
  onWebForegroundMessage,
  registerServiceWorker,
  isWebPushAvailable,
} from './webMessaging';
