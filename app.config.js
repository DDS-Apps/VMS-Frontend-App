const QA_BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://vms-backend-app-qa.replit.app";

export default ({ config }) => ({
  ...config,
  owner: "ahsanshafiq",
  android: {
    ...config.android,
    googleServicesFile: "./config/qa/google-services.json",
  },
  ios: {
    ...config.ios,
    googleServicesFile: "./config/qa/GoogleService-Info.plist",
  },
  extra: {
    ...config.extra,
    eas: {
      projectId: "33b6baff-6c89-44be-905f-006d0da4434d",
    },
    apiBaseUrl: QA_BACKEND_URL,
    microsoftAuthUrl: process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL || QA_BACKEND_URL,
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAY6g-50Gu5zlB3sbkKHuuG5DpBOLZd_xo",
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "dallah-albaraka-vms.firebaseapp.com",
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "dallah-albaraka-vms",
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "dallah-albaraka-vms.firebasestorage.app",
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "913604772710",
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-Y5G46SXSQB",
      appIdWeb: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || "1:913604772710:web:46c93bf8fbcd061362bea7",
      appIdAndroid: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || "1:913604772710:android:a9320215a876705e62bea7",
      appIdIos: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || "1:913604772710:ios:ea764c22ce480dec62bea7",
      vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || "BKXyeihYX0n_rNHIEIP26eNGnbVZL_rCsiLnA7jv0ZuIThHmbV0FJqENbmt-QnikL4uqKbh3lYqp0sqAQImDass",
    },
  },
});
