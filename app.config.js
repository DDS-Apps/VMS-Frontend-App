const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const webFirebaseConfig = require('./public/firebase-web-config');
const {
  APP_LINK_PATH_PREFIXES,
  PRODUCTION_VARIANT,
  assertProductionConfig,
  normalizeVariant,
  resolveEnvironment,
} = require('./config/app-environments');

// APP_VARIANT selects the environment: `production` builds target
// https://vms.dallah.com by default. QA requires explicit `qa`/`staging`.
// eas.json sets it per build profile; scripts/build-web.js sets it for web.
const APP_VARIANT = normalizeVariant(process.env.APP_VARIANT);
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

// Both web variants use the supplied dallah-vms client configuration, also
// loaded by the service worker. Stale process/file values cannot select another
// web project. Native files intentionally remain unchanged pending migration.
const FIREBASE_CONFIG_PATH = 'qa';

const FIREBASE_MEASUREMENT_ID = envValue('FIREBASE_MEASUREMENT_ID', '');
const FIREBASE_APP_ID_ANDROID = envValue('FIREBASE_APP_ID_ANDROID', '1:913604772710:android:a9320215a876705e62bea7');
const FIREBASE_APP_ID_IOS = envValue('FIREBASE_APP_ID_IOS', '1:913604772710:ios:ea764c22ce480dec62bea7');
// A project-specific web-push key must be configured, never inherited from the
// old project's hardcoded default. Existing configured values are preserved.
const FIREBASE_VAPID_KEY = envValue('FIREBASE_VAPID_KEY', '');

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
      apiKey: webFirebaseConfig.apiKey,
      authDomain: webFirebaseConfig.authDomain,
      projectId: webFirebaseConfig.projectId,
      storageBucket: webFirebaseConfig.storageBucket,
      messagingSenderId: webFirebaseConfig.messagingSenderId,
      measurementId: FIREBASE_MEASUREMENT_ID,
      appIdWeb: webFirebaseConfig.appId,
      appIdAndroid: FIREBASE_APP_ID_ANDROID,
      appIdIos: FIREBASE_APP_ID_IOS,
      vapidKey: FIREBASE_VAPID_KEY,
    },
  },
});
