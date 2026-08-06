const path = require('path');
const dotenv = require('dotenv');

const APP_VARIANT = process.env.APP_VARIANT || 'staging';
const envFile = APP_VARIANT === 'production' ? '.env.production' : '.env.staging';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const CONFIG_PATH = APP_VARIANT === 'production' ? 'prod' : 'qa';
const ENVIRONMENT = APP_VARIANT === 'production' ? 'production' : 'qa';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'https://vms.dallah.com';
const MICROSOFT_AUTH_URL = process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL || process.env.MICROSOFT_AUTH_URL || BACKEND_URL;

const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyDCXAFTLnvxbG8rH9LblvklbYH5t6pGYkA';
const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || 'dallah-vms.firebaseapp.com';
const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'dallah-vms';
const FIREBASE_STORAGE_BUCKET = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'dallah-vms.firebasestorage.app';
const FIREBASE_MESSAGING_SENDER_ID = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '858912458229';
const FIREBASE_MEASUREMENT_ID = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || 'G-Y5G46SXSQB';
const FIREBASE_APP_ID_WEB = process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || process.env.FIREBASE_APP_ID_WEB || '1:858912458229:web:5116cd8e271071a736ccbc';
const FIREBASE_APP_ID_ANDROID = process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || process.env.FIREBASE_APP_ID_ANDROID || '1:858912458229:web:5116cd8e271071a736ccbc';
const FIREBASE_APP_ID_IOS = process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || process.env.FIREBASE_APP_ID_IOS || '1:858912458229:web:5116cd8e271071a736ccbc';
const FIREBASE_VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || 'BMzlLuaiRcznVMPTGOPigPYhLAyf8KR56t8PPTST3a7B6aAcre5yAZ3RgwLGZhzlGGjD1P0jwW_mK_FEI8EH3RY';

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
