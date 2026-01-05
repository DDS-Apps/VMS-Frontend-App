export { firebaseConfig, VAPID_KEY } from './config';
export {
  initializeFirebaseWeb,
  getWebFcmToken,
  onWebForegroundMessage,
  registerServiceWorker,
} from './webMessaging';
