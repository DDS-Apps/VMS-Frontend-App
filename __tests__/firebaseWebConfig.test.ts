import fs from 'fs';
import path from 'path';
import vm from 'vm';

const supplied = require('../public/firebase-web-config');
const root = path.resolve(__dirname, '..');
const originalEnv = process.env;

afterEach(() => { process.env = originalEnv; jest.restoreAllMocks(); });

function expoConfig(variant: string, overrides: Record<string, string> = {}) {
  process.env = { PATH: originalEnv.PATH, APP_VARIANT: variant, ...overrides };
  let resolved: any;
  jest.isolateModules(() => {
    resolved = require('../app.config')({ config: require('../app.json').expo });
  });
  return resolved;
}

it.each(['staging', 'production'])('uses supplied web identity despite stale process overrides (%s)', variant => {
  const config = expoConfig(variant, {
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'old-project',
    EXPO_PUBLIC_FIREBASE_API_KEY: 'stale-public-key',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'old-project.firebaseapp.com',
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'old-project.firebasestorage.app',
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'old-sender',
    EXPO_PUBLIC_FIREBASE_APP_ID_WEB: 'old-web-app',
  });
  const { appId, ...identifiers } = supplied;
  expect(config.extra.firebase).toMatchObject({ ...identifiers, appIdWeb: appId });
});

it('ignores stale identity in the variant file and has no old-project VAPID default', () => {
  const read = fs.readFileSync;
  jest.spyOn(fs, 'readFileSync').mockImplementation(((file: any, ...args: any[]) => {
    if (String(file) === path.join(root, '.env.staging')) {
      return 'FIREBASE_PROJECT_ID=old-project\nFIREBASE_MESSAGING_SENDER_ID=old-sender\n';
    }
    return (read as any)(file, ...args);
  }) as any);
  const config = expoConfig('staging');
  expect(config.extra.firebase.projectId).toBe('dallah-vms');
  expect(config.extra.firebase.messagingSenderId).toBe(supplied.messagingSenderId);
  expect(config.extra.firebase.vapidKey).toBe('');
});

it('preserves an explicitly configured VAPID key without logging its value', () => {
  expect(expoConfig('production', {
    EXPO_PUBLIC_FIREBASE_VAPID_KEY: 'configured-test-public-key',
  }).extra.firebase.vapidKey).toBe('configured-test-public-key');
});

it('runs worker initialization with the same shared config as the web SDK', () => {
  let initialized: any;
  const context = vm.createContext({
    firebase: {
      initializeApp: (config: unknown) => { initialized = config; },
      messaging: () => ({ onBackgroundMessage: () => {} }),
    },
    self: { addEventListener: () => {} },
    console,
    importScripts: (url: string) => {
      if (url === '/firebase-web-config.js') {
        vm.runInContext(fs.readFileSync(path.join(root, 'public', url), 'utf8'), context);
      } else {
        expect(url).toMatch(/^https:\/\/www\.gstatic\.com\/firebasejs\//);
      }
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'public/firebase-messaging-sw.js'), 'utf8'), context);
  expect(initialized).toEqual(supplied);
  expect(initialized.projectId).toBe('dallah-vms');
});

it('web runtime cannot be redirected by stale inlined env or Expo extra', () => {
  process.env = { ...originalEnv, EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'old-project', EXPO_PUBLIC_FIREBASE_VAPID_KEY: 'stale-test-key' };
  jest.doMock('react-native', () => ({ Platform: { OS: 'web', select: (values: any) => values.web } }));
  jest.doMock('expo-constants', () => ({
    __esModule: true, default: { expoConfig: { extra: { firebase: { projectId: 'old-project', vapidKey: '' } } } },
  }));
  jest.isolateModules(() => {
    const config = require('../services/firebase/config');
    expect(config.firebaseConfig).toEqual(supplied);
    expect(config.VAPID_KEY).toBe('');
  });
});

it('leaves native files and app IDs on their existing project pending a separate migration', () => {
  const config = expoConfig('production');
  expect(config.android.googleServicesFile).toBe('./config/qa/google-services.json');
  expect(config.ios.googleServicesFile).toBe('./config/qa/GoogleService-Info.plist');
  const android = JSON.parse(fs.readFileSync(path.join(root, config.android.googleServicesFile), 'utf8'));
  expect(android.project_info.project_id).toBe('dallah-albaraka-vms');
  expect(config.extra.firebase.appIdAndroid).toBe(android.client[0].client_info.mobilesdk_app_id);
  const ios = fs.readFileSync(path.join(root, config.ios.googleServicesFile), 'utf8');
  expect(ios).toMatch(/<key>PROJECT_ID<\/key>\s*<string>dallah-albaraka-vms<\/string>/);
  expect(ios).toContain(config.extra.firebase.appIdIos);
});
