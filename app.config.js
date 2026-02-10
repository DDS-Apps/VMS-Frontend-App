const path = require('path');
const dotenv = require('dotenv');

const APP_VARIANT = process.env.APP_VARIANT || 'staging';
const envFile = APP_VARIANT === 'production' ? '.env.production' : '.env.staging';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const CONFIG_PATH = APP_VARIANT === 'production' ? 'prod' : 'qa';
const ENVIRONMENT = APP_VARIANT === 'production' ? 'production' : 'qa';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'https://vms-backend-folio3.replit.app';
const MICROSOFT_AUTH_URL = process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL || process.env.MICROSOFT_AUTH_URL || BACKEND_URL;

const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyAY6g-50Gu5zlB3sbkKHuuG5DpBOLZd_xo';
const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || 'dallah-albaraka-vms.firebaseapp.com';
const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'dallah-albaraka-vms';
const FIREBASE_STORAGE_BUCKET = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'dallah-albaraka-vms.firebasestorage.app';
const FIREBASE_MESSAGING_SENDER_ID = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '913604772710';
const FIREBASE_MEASUREMENT_ID = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || 'G-Y5G46SXSQB';
const FIREBASE_APP_ID_WEB = process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || process.env.FIREBASE_APP_ID_WEB || '1:913604772710:web:46c93bf8fbcd061362bea7';
const FIREBASE_APP_ID_ANDROID = process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || process.env.FIREBASE_APP_ID_ANDROID || '1:913604772710:android:a9320215a876705e62bea7';
const FIREBASE_APP_ID_IOS = process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || process.env.FIREBASE_APP_ID_IOS || '1:913604772710:ios:ea764c22ce480dec62bea7';
const FIREBASE_VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || 'BKXyeihYX0n_rNHIEIP26eNGnbVZL_rCsiLnA7jv0ZuIThHmbV0FJqENbmt-QnikL4uqKbh3lYqp0sqAQImDass';

module.exports = ({ config }) => ({
  ...config,
  owner: "ahsanshafiq",
  android: {
    ...config.android,
    googleServicesFile: `./config/${CONFIG_PATH}/google-services.json`,
  },
  ios: {
    ...config.ios,
    googleServicesFile: `./config/${CONFIG_PATH}/GoogleService-Info.plist`,
  },
  extra: {
    ...config.extra,
    eas: {
      projectId: "33b6baff-6c89-44be-905f-006d0da4434d",
    },
    environment: ENVIRONMENT,
    apiBaseUrl: BACKEND_URL,
    microsoftAuthUrl: MICROSOFT_AUTH_URL,
    firebase: {
      apiKey: FIREBASE_API_KEY,
      authDomain: FIREBASE_AUTH_DOMAIN,
      projectId: FIREBASE_PROJECT_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
      messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
      measurementId: FIREBASE_MEASUREMENT_ID,
      appIdWeb: FIREBASE_APP_ID_WEB,
      appIdAndroid: FIREBASE_APP_ID_ANDROID,
      appIdIos: FIREBASE_APP_ID_IOS,
      vapidKey: FIREBASE_VAPID_KEY,
    },
  },
});
