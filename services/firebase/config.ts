import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDYMIEEPJLFkpZIkhxmHDcMhfL-BNkSdjw",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "dallahdigital-vms.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "dallahdigital-vms",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "dallahdigital-vms.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "224821384776",
  appId: Platform.select({
    web: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || "1:224821384776:web:f759f8d4805d5965d0aa7d",
    android: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || "1:224821384776:android:ce145b6bbcbf94ecd0aa7d",
    ios: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || "1:224821384776:ios:fd73944c70ae83e5d0aa7d",
    default: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || "1:224821384776:web:f759f8d4805d5965d0aa7d",
  }),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-27R412QL3Q",
};

export const VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || "r3rPC3NrVDTboJFF-__a6yvj4VECzhd6Y966qGs9KtY";
