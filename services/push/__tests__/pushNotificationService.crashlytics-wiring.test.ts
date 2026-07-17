/**
 * Crashlytics wiring guard for pushNotificationService.ts
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The main dedup test suite (pushNotificationService.dedup.test.ts) mocks the
 * entire `@/services/crashlytics/crashlyticsService` module.  That means if a
 * future refactor removes the `crashlyticsService` import from
 * `pushNotificationService.ts` (while leaving the jest.mock() call in place),
 * every dedup test still passes — but AsyncStorage errors are silently
 * swallowed in production.
 *
 * This file closes that gap with two complementary checks:
 *
 *  1. STATIC IMPORT GUARD — reads the source file as text and asserts that the
 *     `crashlyticsService` import statement is still present.
 *
 *  2. INTEGRATION SMOKE TESTS — the real `crashlyticsService` is loaded (no
 *     mock), a jest spy is placed on its `recordError` method, and AsyncStorage
 *     failures are triggered.  If the import is removed from the service file,
 *     the call path is broken and the spy never fires → tests fail.
 */

// ---------------------------------------------------------------------------
// Infrastructure mocks — everything EXCEPT @/services/crashlytics/crashlyticsService
// ---------------------------------------------------------------------------

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getDevicePushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token', type: 'fcm' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'expo-mock-token' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
}));

jest.mock('expo-device', () => ({
  isDevice: false,
  brand: 'TestBrand',
  modelName: 'TestModel',
  deviceName: 'TestDevice',
  osName: 'TestOS',
  osVersion: '1.0',
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0' } },
  __esModule: true,
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/services/api/deviceApiService', () => ({
  deviceApiService: {
    registerToken: jest.fn().mockResolvedValue({}),
    unregisterToken: jest.fn().mockResolvedValue({}),
    getPushStatus: jest.fn().mockResolvedValue({}),
    sendTestNotification: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('@/services/firebase', () => ({
  initializeFirebaseWeb: jest.fn().mockResolvedValue(false),
  getWebFcmToken: jest.fn().mockResolvedValue(null),
  onWebForegroundMessage: jest.fn().mockReturnValue(() => {}),
  registerServiceWorker: jest.fn().mockResolvedValue(undefined),
  getWebNotificationPermissionStatus: jest.fn().mockReturnValue('default'),
}));

jest.mock('@/utils/notificationNavigator', () => ({
  handleNotificationTap: jest.fn(),
  navigateFromInAppNotification: jest.fn(),
}));

jest.mock('../notificationQueryMapper', () => ({
  invalidateQueriesForNotification: jest.fn(),
  refreshAllNotificationData: jest.fn(),
}));

jest.mock('@/constants/notificationTypes', () => ({
  NOTIFICATION_TYPES: { UPCOMING_VISIT: 'upcoming_visit' },
}));

jest.mock('@/constants/requestConstants', () => ({
  UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES: 15,
}));

// AsyncStorage mock — configurable return values per test
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// NOTE: @/services/crashlytics/crashlyticsService is intentionally NOT mocked.
// The real module is loaded so that spy calls verify actual end-to-end wiring.
// The native Firebase module is unavailable in Jest, so initializeCrashlytics()
// falls back to noopCrashlytics automatically via its own try/catch.

// ---------------------------------------------------------------------------
// Imports (after mocks are hoisted by Jest)
// ---------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crashlyticsService } from '@/services/crashlytics/crashlyticsService';
import pushNotificationService from '../pushNotificationService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush all pending microtasks / promises (for fire-and-forget async ops). */
const flushPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0));

/**
 * Cast to `any` once so tests can reach private members
 * (shownToastIds, hydrateShownIds, persistShownId).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const svc = pushNotificationService as any;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('pushNotificationService — Crashlytics wiring guard', () => {
  let recordErrorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    svc.shownToastIds = new Set<string>();

    (AsyncStorage.getItem as jest.Mock).mockReset().mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockReset().mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockReset().mockResolvedValue(undefined);

    // Spy on the REAL crashlyticsService.recordError exported from the module.
    // Because Jest caches module instances, this is the same object reference
    // that pushNotificationService imported — so the spy fires on real calls.
    recordErrorSpy = jest.spyOn(crashlyticsService, 'recordError');

    // Spy on the REAL crashlyticsService.log to verify the heal-message path.
    logSpy = jest.spyOn(crashlyticsService, 'log');
  });

  afterEach(() => {
    recordErrorSpy.mockRestore();
    logSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // 1. Static import guard
  // -----------------------------------------------------------------------
  describe('static import guard', () => {
    it('has a top-level import of crashlyticsService in pushNotificationService.ts', () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, '../pushNotificationService.ts'),
        'utf-8'
      );
      // Matches:
      //   import { crashlyticsService } from '@/services/crashlytics/crashlyticsService'
      //   import { ..., crashlyticsService, ... } from '@/services/crashlytics/crashlyticsService'
      expect(src).toMatch(
        /import\s+\{[^}]*crashlyticsService[^}]*\}\s+from\s+['"]@\/services\/crashlytics\/crashlyticsService['"]/
      );
    });
  });

  // -----------------------------------------------------------------------
  // 2. Integration smoke tests — real crashlyticsService, no-op path
  //
  // If the import is removed from pushNotificationService.ts, these tests
  // fail because the spy on crashlyticsService.recordError never fires.
  // -----------------------------------------------------------------------
  describe('integration smoke tests — real crashlyticsService (no-op path)', () => {
    it('routes AsyncStorage.getItem errors through real crashlyticsService.recordError in hydrateShownIds', async () => {
      const storageError = new Error('Disk full');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(storageError);

      await svc.hydrateShownIds();

      expect(recordErrorSpy).toHaveBeenCalledTimes(1);
      expect(recordErrorSpy).toHaveBeenCalledWith(storageError, 'Push.hydrateShownIds');
    });

    it('routes non-Error throws through real crashlyticsService.recordError (wrapped) in hydrateShownIds', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue('string-rejection');

      await svc.hydrateShownIds();

      expect(recordErrorSpy).toHaveBeenCalledTimes(1);
      const [firstArg, secondArg] = recordErrorSpy.mock.calls[0];
      expect(firstArg).toBeInstanceOf(Error);
      expect(secondArg).toBe('Push.hydrateShownIds');
    });

    it('routes AsyncStorage.getItem errors through real crashlyticsService.recordError in persistShownId', async () => {
      const storageError = new Error('Storage unavailable');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(storageError);

      await svc.persistShownId('some-id');
      await flushPromises();

      expect(recordErrorSpy).toHaveBeenCalledTimes(1);
      expect(recordErrorSpy).toHaveBeenCalledWith(storageError, 'Push.persistShownId');
    });

    it('routes AsyncStorage.setItem errors through real crashlyticsService.recordError in persistShownId', async () => {
      const writeError = new Error('Write failed');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(writeError);

      await svc.persistShownId('some-id');
      await flushPromises();

      expect(recordErrorSpy).toHaveBeenCalledTimes(1);
      expect(recordErrorSpy).toHaveBeenCalledWith(writeError, 'Push.persistShownId');
    });

    it('routes removeItem failure through real crashlyticsService.recordError with clearCorrupted context', async () => {
      // Make getItem return corrupt JSON so JSON.parse throws a SyntaxError.
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-valid-json{{');
      // Make removeItem also fail so the nested catch runs.
      const removeError = new Error('removeItem disk error');
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(removeError);

      await svc.hydrateShownIds();

      // recordError is called twice:
      //   call 0 — outer catch: SyntaxError → 'Push.hydrateShownIds'
      //   call 1 — inner catch: removeItem failure → 'Push.hydrateShownIds.clearCorrupted'
      const contexts = recordErrorSpy.mock.calls.map(
        (args: [Error, string]) => args[1]
      );
      expect(contexts).toContain('Push.hydrateShownIds.clearCorrupted');

      const clearCorruptedCall = recordErrorSpy.mock.calls.find(
        (args: [Error, string]) => args[1] === 'Push.hydrateShownIds.clearCorrupted'
      );
      expect(clearCorruptedCall).toBeDefined();
      expect(clearCorruptedCall![0]).toBe(removeError);
    });

    it('routes clearCorrupted heal message through real crashlyticsService.log when removeItem succeeds', async () => {
      // Make getItem return corrupt JSON so JSON.parse throws a SyntaxError.
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-valid-json{{');
      // removeItem resolves successfully — this is the success path under test.
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await svc.hydrateShownIds();

      const expectedHealMsg =
        '[Push] Corrupted deduplication storage cleared — next launch will start clean.';
      expect(logSpy).toHaveBeenCalledWith(expectedHealMsg);
    });

    it('does not call crashlyticsService.recordError on the happy path in hydrateShownIds', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await svc.hydrateShownIds();

      expect(recordErrorSpy).not.toHaveBeenCalled();
    });

    it('does not call crashlyticsService.recordError on the happy path in persistShownId', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await svc.persistShownId('success-id');
      await flushPromises();

      expect(recordErrorSpy).not.toHaveBeenCalled();
    });
  });
});
