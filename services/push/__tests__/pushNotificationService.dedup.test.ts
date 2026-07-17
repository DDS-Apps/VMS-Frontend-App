/**
 * Tests for the cold-launch deduplication logic in pushNotificationService.ts.
 *
 * Covers:
 *  1. Warm-launch deduplication  — same ID seen twice in one session → toast shown once
 *  2. Cold-launch deduplication  — IDs written to storage in session A suppress the toast in session B
 *  3. 30-min TTL                 — an entry older than 30 min is NOT loaded from storage
 *  4. Storage cap                — more than 200 entries are pruned correctly
 *  5. Crashlytics error reporting — AsyncStorage failures are forwarded to crashlyticsService.recordError
 */

// ---------------------------------------------------------------------------
// Module mocks — declared BEFORE imports so jest hoisting works correctly
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

// AsyncStorage mock — exposes jest.fn() so tests can configure return values
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/services/crashlytics/crashlyticsService', () => ({
  crashlyticsService: {
    log: jest.fn(),
    recordError: jest.fn(),
    setUserAttributes: jest.fn(),
    clearUserAttributes: jest.fn(),
  },
}));

// Crashlytics mock — spy on recordError to verify error-path forwarding
jest.mock('@/services/crashlytics/crashlyticsService', () => ({
  crashlyticsService: {
    recordError: jest.fn(),
    log: jest.fn(),
    recordJSException: jest.fn(),
    crash: jest.fn(),
    setUserId: jest.fn().mockResolvedValue(undefined),
    setAttribute: jest.fn().mockResolvedValue(undefined),
    setAttributes: jest.fn().mockResolvedValue(undefined),
    setUserAttributes: jest.fn().mockResolvedValue(undefined),
    clearUserAttributes: jest.fn().mockResolvedValue(undefined),
    setCrashlyticsCollectionEnabled: jest.fn().mockResolvedValue(undefined),
    isNativeModuleAvailable: jest.fn().mockReturnValue(false),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are hoisted)
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import { crashlyticsService } from '@/services/crashlytics/crashlyticsService';
import pushNotificationService from '../pushNotificationService';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Flush all pending microtasks / promises (for fire-and-forget async ops). */
const flushPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0));

const STORAGE_KEY = 'vms_push_shown_toast_ids';

/**
 * Cast to `any` once so every test can reach the private members
 * (shownToastIds, hydrateShownIds, persistShownId, shouldShowToast).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const svc = pushNotificationService as any;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PushNotificationService — toast deduplication', () => {
  beforeEach(() => {
    // Reset the in-memory deduplication Set before every test
    svc.shownToastIds = new Set<string>();

    // Reset AsyncStorage mock state
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockReset();
    (AsyncStorage.removeItem as jest.Mock).mockReset();

    // Reset crashlytics mocks
    (crashlyticsService.log as jest.Mock).mockReset();
    (crashlyticsService.recordError as jest.Mock).mockReset();

    // Default: nothing in storage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  // -----------------------------------------------------------------------
  // 1. Warm-launch deduplication (in-memory Set only)
  // -----------------------------------------------------------------------
  describe('warm-launch deduplication', () => {
    it('returns true for a notification ID seen for the first time', () => {
      expect(svc.shouldShowToast('warm-first')).toBe(true);
    });

    it('returns false when the same ID is seen a second time in the same session', () => {
      svc.shouldShowToast('warm-dup');
      expect(svc.shouldShowToast('warm-dup')).toBe(false);
    });

    it('tracks different notification IDs independently', () => {
      expect(svc.shouldShowToast('alpha')).toBe(true);
      expect(svc.shouldShowToast('beta')).toBe(true);
      expect(svc.shouldShowToast('alpha')).toBe(false);
      expect(svc.shouldShowToast('beta')).toBe(false);
      expect(svc.shouldShowToast('gamma')).toBe(true);
    });

    it('adds the ID to shownToastIds on first call', () => {
      svc.shouldShowToast('track-me');
      expect(svc.shownToastIds.has('track-me')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Cold-launch: IDs persisted in session A suppress the toast in session B
  // -----------------------------------------------------------------------
  describe('cold-launch deduplication', () => {
    it('suppresses a toast whose ID was stored in a previous session', async () => {
      // --- Session A ---
      // Let persistShownId write to storage via the real async path.
      // Wire up setItem to capture what was written, and getItem to return null initially.
      let stored: string | null = null;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
        Promise.resolve(stored)
      );
      (AsyncStorage.setItem as jest.Mock).mockImplementation((_key: string, value: string) => {
        stored = value;
        return Promise.resolve();
      });

      svc.shouldShowToast('cross-session-id');
      await flushPromises(); // let the fire-and-forget IIFE complete

      expect(stored).not.toBeNull();
      expect(stored).toContain('cross-session-id');

      // --- Session B (cold launch simulation) ---
      svc.shownToastIds = new Set<string>(); // fresh in-memory state

      // hydrateShownIds will call AsyncStorage.getItem which returns `stored`
      await svc.hydrateShownIds();

      expect(svc.shownToastIds.has('cross-session-id')).toBe(true);
      expect(svc.shouldShowToast('cross-session-id')).toBe(false);
    });

    it('allows unseen IDs through even after hydration from a previous session', async () => {
      // Put a different ID in storage
      const entry = [{ id: 'other-id', ts: Date.now() }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(entry));

      svc.shownToastIds = new Set<string>();
      await svc.hydrateShownIds();

      // A completely different ID must still be shown
      expect(svc.shouldShowToast('brand-new-id')).toBe(true);
    });

    it('calls AsyncStorage.getItem with the correct storage key', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await svc.hydrateShownIds();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('handles empty storage gracefully without throwing', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await expect(svc.hydrateShownIds()).resolves.toBeUndefined();
      expect(svc.shownToastIds.size).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // 3. 30-minute TTL — stale entries must NOT be loaded from storage
  // -----------------------------------------------------------------------
  describe('30-minute TTL', () => {
    it('does not suppress a toast whose stored entry is older than 30 minutes', async () => {
      const thirtyOneMinAgo = Date.now() - 31 * 60 * 1000;
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: 'stale-notif', ts: thirtyOneMinAgo }])
      );

      await svc.hydrateShownIds();

      expect(svc.shownToastIds.has('stale-notif')).toBe(false);
      expect(svc.shouldShowToast('stale-notif')).toBe(true);
    });

    it('suppresses a toast whose stored entry is just under 30 minutes old', async () => {
      const twentyNineMinAgo = Date.now() - 29 * 60 * 1000;
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: 'fresh-notif', ts: twentyNineMinAgo }])
      );

      await svc.hydrateShownIds();

      expect(svc.shownToastIds.has('fresh-notif')).toBe(true);
      expect(svc.shouldShowToast('fresh-notif')).toBe(false);
    });

    it('loads only fresh entries when storage contains a mix of fresh and stale', async () => {
      const now = Date.now();
      const mixed = [
        { id: 'stale-a', ts: now - 31 * 60 * 1000 },
        { id: 'fresh-a', ts: now - 10 * 60 * 1000 },
        { id: 'stale-b', ts: now - 120 * 60 * 1000 },
        { id: 'fresh-b', ts: now - 1 * 60 * 1000 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mixed));

      await svc.hydrateShownIds();

      expect(svc.shownToastIds.has('stale-a')).toBe(false);
      expect(svc.shownToastIds.has('stale-b')).toBe(false);
      expect(svc.shownToastIds.has('fresh-a')).toBe(true);
      expect(svc.shownToastIds.has('fresh-b')).toBe(true);
    });

    it('prunes stale entries during persist so they are not written back', async () => {
      const now = Date.now();
      const existing = [
        { id: 'going-stale', ts: now - 35 * 60 * 1000 }, // expired
        { id: 'still-fresh', ts: now - 5 * 60 * 1000 },  // alive
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await svc.persistShownId('brand-new');
      await flushPromises();

      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const written: Array<{ id: string; ts: number }> = JSON.parse(setCall[1]);

      const ids = written.map((e: { id: string }) => e.id);
      expect(ids).not.toContain('going-stale');
      expect(ids).toContain('still-fresh');
      expect(ids).toContain('brand-new');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Storage cap — more than 200 entries must be pruned on each persist
  // -----------------------------------------------------------------------
  describe('storage cap (max 200 entries)', () => {
    it('prunes the oldest entries so the stored array never exceeds 200', async () => {
      const now = Date.now();
      // Pre-populate with 200 fresh entries (index 0 is the "oldest" in the array)
      const existing = Array.from({ length: 200 }, (_, i) => ({
        id: `entry-${i}`,
        ts: now - (200 - i) * 1000, // entry-0 is oldest, entry-199 is newest
      }));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await svc.persistShownId('entry-new');
      await flushPromises();

      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const written: Array<{ id: string }> = JSON.parse(setCall[1]);

      // Must be capped at 200
      expect(written.length).toBe(200);
      // The newest entry must be present
      expect(written[written.length - 1].id).toBe('entry-new');
      // The oldest entry (entry-0) must have been evicted
      expect(written.find(e => e.id === 'entry-0')).toBeUndefined();
      // entry-1 is now the first surviving element
      expect(written[0].id).toBe('entry-1');
    });

    it('does not prune when total entries are exactly 200 after the new push', async () => {
      const now = Date.now();
      // 199 existing + 1 new = 200, no pruning needed
      const existing = Array.from({ length: 199 }, (_, i) => ({
        id: `pre-${i}`,
        ts: now - i * 1000,
      }));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await svc.persistShownId('pre-new');
      await flushPromises();

      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const written: Array<{ id: string }> = JSON.parse(setCall[1]);

      expect(written.length).toBe(200);
      expect(written[written.length - 1].id).toBe('pre-new');
    });

    it('in-memory Set evicts the oldest entry when it exceeds 200 items', () => {
      // Fill exactly 200 slots
      for (let i = 0; i < 200; i++) {
        svc.shownToastIds.add(`set-item-${i}`);
      }
      expect(svc.shownToastIds.size).toBe(200);

      // Adding the 201st via shouldShowToast triggers the eviction branch
      svc.shouldShowToast('set-overflow');

      // Size stays at 200
      expect(svc.shownToastIds.size).toBe(200);
      // Overflow entry is present
      expect(svc.shownToastIds.has('set-overflow')).toBe(true);
      // The oldest entry (set-item-0) was evicted
      expect(svc.shownToastIds.has('set-item-0')).toBe(false);
    });

    it('starts with a single-entry storage when the storage is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await svc.persistShownId('first-ever');
      await flushPromises();

      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const written: Array<{ id: string; ts: number }> = JSON.parse(setCall[1]);

      expect(written.length).toBe(1);
      expect(written[0].id).toBe('first-ever');
    });
  });

  // -----------------------------------------------------------------------
  // 5. Self-heal path — corrupt (non-JSON) storage is cleared automatically
  // -----------------------------------------------------------------------
  describe('corrupt-storage self-heal', () => {
    const HEAL_MSG =
      '[Push] Corrupted deduplication storage cleared — next launch will start clean.';

    it('calls removeItem with the correct key when storage contains corrupt JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not valid json {{{{');

      await svc.hydrateShownIds();

      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('logs the heal message to crashlytics when corrupt storage is cleared', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not valid json {{{{');

      await svc.hydrateShownIds();

      expect(crashlyticsService.log).toHaveBeenCalledTimes(1);
      expect(crashlyticsService.log).toHaveBeenCalledWith(HEAL_MSG);
    });

    it('leaves shownToastIds empty after clearing corrupt storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not valid json {{{{');

      await svc.hydrateShownIds();

      expect(svc.shownToastIds.size).toBe(0);
    });

    it('does not call removeItem when storage contains valid JSON', async () => {
      const entry = [{ id: 'good-id', ts: Date.now() }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(entry));

      await svc.hydrateShownIds();

      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
      expect(crashlyticsService.log).not.toHaveBeenCalled();
      expect(svc.shownToastIds.has('good-id')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 6. Crashlytics error reporting — storage failures must surface in Crashlytics
  // -----------------------------------------------------------------------
  describe('Crashlytics error reporting on AsyncStorage failures', () => {
    // hydrateShownIds -------------------------------------------------------

    it('calls crashlyticsService.recordError when AsyncStorage.getItem throws in hydrateShownIds', async () => {
      const storageError = new Error('Disk full');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(storageError);

      await svc.hydrateShownIds();

      expect(crashlyticsService.recordError).toHaveBeenCalledTimes(1);
      expect(crashlyticsService.recordError).toHaveBeenCalledWith(
        storageError,
        'Push.hydrateShownIds'
      );
    });

    it('wraps non-Error throws from hydrateShownIds in an Error before forwarding to Crashlytics', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue('string error');

      await svc.hydrateShownIds();

      expect(crashlyticsService.recordError).toHaveBeenCalledTimes(1);
      const [firstArg, secondArg] = (crashlyticsService.recordError as jest.Mock).mock.calls[0];
      expect(firstArg).toBeInstanceOf(Error);
      expect(secondArg).toBe('Push.hydrateShownIds');
    });

    it('does not call crashlyticsService.recordError when hydrateShownIds succeeds', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await svc.hydrateShownIds();

      expect(crashlyticsService.recordError).not.toHaveBeenCalled();
    });

    // persistShownId --------------------------------------------------------

    it('calls crashlyticsService.recordError when AsyncStorage.getItem throws in persistShownId', async () => {
      const storageError = new Error('Storage unavailable');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(storageError);

      await svc.persistShownId('some-id');
      await flushPromises();

      expect(crashlyticsService.recordError).toHaveBeenCalledTimes(1);
      expect(crashlyticsService.recordError).toHaveBeenCalledWith(
        storageError,
        'Push.persistShownId'
      );
    });

    it('calls crashlyticsService.recordError when AsyncStorage.setItem throws in persistShownId', async () => {
      const writeError = new Error('Write failed');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(writeError);

      await svc.persistShownId('some-id');
      await flushPromises();

      expect(crashlyticsService.recordError).toHaveBeenCalledTimes(1);
      expect(crashlyticsService.recordError).toHaveBeenCalledWith(
        writeError,
        'Push.persistShownId'
      );
    });

    it('wraps non-Error throws from persistShownId in an Error before forwarding to Crashlytics', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(42);

      await svc.persistShownId('some-id');
      await flushPromises();

      expect(crashlyticsService.recordError).toHaveBeenCalledTimes(1);
      const [firstArg, secondArg] = (crashlyticsService.recordError as jest.Mock).mock.calls[0];
      expect(firstArg).toBeInstanceOf(Error);
      expect(secondArg).toBe('Push.persistShownId');
    });

    it('does not call crashlyticsService.recordError when persistShownId succeeds', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await svc.persistShownId('success-id');
      await flushPromises();

      expect(crashlyticsService.recordError).not.toHaveBeenCalled();
    });
  });
});
