import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Platform.select({
    web: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB,
    android: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID,
    ios: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS,
    default: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB,
  }),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
