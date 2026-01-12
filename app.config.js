const PRODUCTION_BACKEND_URL = "https://vms-backend-folio3.replit.app";

export default ({ config }) => ({
  ...config,
  owner: "ahsanshafiq",
  extra: {
    ...config.extra,
    eas: {
      projectId: "33b6baff-6c89-44be-905f-006d0da4434d",
    },
    apiBaseUrl: PRODUCTION_BACKEND_URL,
    microsoftAuthUrl: PRODUCTION_BACKEND_URL,
    firebase: {
      apiKey: "AIzaSyDYMIEEPJLFkpZIkhxmHDcMhfL-BNkSdjw",
      authDomain: "dallahdigital-vms.firebaseapp.com",
      projectId: "dallahdigital-vms",
      storageBucket: "dallahdigital-vms.firebasestorage.app",
      messagingSenderId: "224821384776",
      measurementId: "G-27R412QL3Q",
      appIdWeb: "1:224821384776:web:f759f8d4805d5965d0aa7d",
      appIdAndroid: "1:224821384776:android:ce145b6bbcbf94ecd0aa7d",
      appIdIos: "1:224821384776:ios:fd73944c70ae83e5d0aa7d",
      vapidKey:
        "BKVbpaIfbFwy4mf6bsA6dDNONAjM8gIVQsYd8mLCo1RPwOc9miHHeKK4vOsAOMP5LOViNnYA9X2YnM85Tfoq984",
    },
  },
});
