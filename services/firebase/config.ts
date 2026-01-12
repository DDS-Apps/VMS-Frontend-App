import { Platform } from 'react-native';
import Constants from 'expo-constants';

const firebaseExtra = Constants.expoConfig?.extra?.firebase;

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || firebaseExtra?.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseExtra?.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || firebaseExtra?.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseExtra?.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseExtra?.messagingSenderId,
  appId: Platform.select({
    web: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || firebaseExtra?.appIdWeb,
    android: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || firebaseExtra?.appIdAndroid,
    ios: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || firebaseExtra?.appIdIos,
    default: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || firebaseExtra?.appIdWeb,
  }),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || firebaseExtra?.measurementId,
};

export const VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || firebaseExtra?.vapidKey;
