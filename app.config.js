const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const {
  APP_LINK_PATH_PREFIXES,
  PRODUCTION_VARIANT,
  assertProductionConfig,
  resolveEnvironment,
} = require('./config/app-environments');

// APP_VARIANT selects the environment: `production` builds target
// https://vms.dallah.com, anything else (default `staging`) targets QA.
// eas.json sets it per build profile; scripts/build-web.js sets it for web.
const APP_VARIANT = process.env.APP_VARIANT || 'staging';
const IS_PRODUCTION = APP_VARIANT === PRODUCTION_VARIANT;

// Optional, git-ignored local overrides. The file is parsed explicitly instead
// of being pushed into process.env so that the Expo CLI's own dotenv loading
// (which reads `.env.production` for every `expo export`) cannot cross-wire
// variants. Committed defaults live in config/app-environments.js.
function readVariantFile(fileName) {
  const filePath = path.resolve(__dirname, fileName);
  if (!fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath));
}

const fileEnv = readVariantFile(IS_PRODUCTION ? '.env.production' : '.env.staging');
// Production never takes URLs from the process environment: this workspace's
// shared env holds the QA hosts, and `eas build --profile production` would
// otherwise evaluate against them. The app reads Constants.expoConfig.extra
// (resolved here) before process.env, so ignoring them is sufficient.
const environment = resolveEnvironment({
  appVariant: APP_VARIANT,
  fileEnv,
  ignoreProcessEnv: IS_PRODUCTION,
});
assertProductionConfig(environment);
if (environment.ignored.length > 0) {
  console.warn(
    `[app.config] APP_VARIANT=production: ignoring ${environment.ignored.join(', ')} from the environment; ` +
      `using ${environment.apiBaseUrl} (${environment.sources.apiBaseUrl}).`,
  );
}

const envValue = (key, fallback) =>
  process.env[`EXPO_PUBLIC_${key}`] || fileEnv[key] || fileEnv[`EXPO_PUBLIC_${key}`] || fallback;

// QA and production backends share the same Firebase project. Keep the native
// Firebase files aligned with the public Firebase configuration below so FCM
// tokens are always issued by dallah-albaraka-vms (sender 913604772710).
const FIREBASE_CONFIG_PATH = 'qa';

const FIREBASE_API_KEY = envValue('FIREBASE_API_KEY', 'AIzaSyAY6g-50Gu5zlB3sbkKHuuG5DpBOLZd_xo');
const FIREBASE_AUTH_DOMAIN = envValue('FIREBASE_AUTH_DOMAIN', 'dallah-albaraka-vms.firebaseapp.com');
const FIREBASE_PROJECT_ID = envValue('FIREBASE_PROJECT_ID', 'dallah-albaraka-vms');
const FIREBASE_STORAGE_BUCKET = envValue('FIREBASE_STORAGE_BUCKET', 'dallah-albaraka-vms.firebasestorage.app');
const FIREBASE_MESSAGING_SENDER_ID = envValue('FIREBASE_MESSAGING_SENDER_ID', '913604772710');
const FIREBASE_MEASUREMENT_ID = envValue('FIREBASE_MEASUREMENT_ID', 'G-Y5G46SXSQB');
const FIREBASE_APP_ID_WEB = envValue('FIREBASE_APP_ID_WEB', '1:913604772710:web:46c93bf8fbcd061362bea7');
const FIREBASE_APP_ID_ANDROID = envValue('FIREBASE_APP_ID_ANDROID', '1:913604772710:android:a9320215a876705e62bea7');
const FIREBASE_APP_ID_IOS = envValue('FIREBASE_APP_ID_IOS', '1:913604772710:ios:ea764c22ce480dec62bea7');
const FIREBASE_VAPID_KEY = envValue(
  'FIREBASE_VAPID_KEY',
  'BKXyeihYX0n_rNHIEIP26eNGnbVZL_rCsiLnA7jv0ZuIThHmbV0FJqENbmt-QnikL4uqKbh3lYqp0sqAQImDass',
);

// Universal Links / App Links follow the environment's public web domain, so a
// production build claims vms.dallah.com while QA builds claim the Replit host.
const appLinkIntentFilter = {
  action: 'VIEW',
  autoVerify: true,
  data: APP_LINK_PATH_PREFIXES.map((pathPrefix) => ({
    scheme: 'https',
    host: environment.appDomain,
    pathPrefix,
  })),
  category: ['BROWSABLE', 'DEFAULT'],
};

module.exports = ({ config }) => ({
  ...config,
  owner: 'ahsanshafiq',
  android: {
    ...config.android,
    googleServicesFile: `./config/${FIREBASE_CONFIG_PATH}/google-services.json`,
    intentFilters: [appLinkIntentFilter],
  },
  ios: {
    ...config.ios,
    googleServicesFile: `./config/${FIREBASE_CONFIG_PATH}/GoogleService-Info.plist`,
    associatedDomains: [`applinks:${environment.appDomain}`],
  },
  extra: {
    ...config.extra,
    eas: {
      projectId: '33b6baff-6c89-44be-905f-006d0da4434d',
    },
    environment: environment.variant,
    apiBaseUrl: environment.apiBaseUrl,
    microsoftAuthUrl: environment.microsoftAuthUrl,
    appDomain: environment.appDomain,
    legalPagesUrl: environment.legalPagesUrl,
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
