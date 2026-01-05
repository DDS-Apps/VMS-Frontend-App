import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: "AIzaSyDYMIEEPJLFkpZIkhxmHDcMhfL-BNkSdjw",
  authDomain: "dallahdigital-vms.firebaseapp.com",
  projectId: "dallahdigital-vms",
  storageBucket: "dallahdigital-vms.firebasestorage.app",
  messagingSenderId: "224821384776",
  appId: Platform.select({
    web: "1:224821384776:web:f759f8d4805d5965d0aa7d",
    android: "1:224821384776:android:ce145b6bbcbf94ecd0aa7d",
    ios: "1:224821384776:ios:fd73944c70ae83e5d0aa7d",
    default: "1:224821384776:web:f759f8d4805d5965d0aa7d",
  }),
  measurementId: "G-27R412QL3Q",
};

export const VAPID_KEY = "r3rPC3NrVDTboJFF-__a6yvj4VECzhd6Y966qGs9KtY";
