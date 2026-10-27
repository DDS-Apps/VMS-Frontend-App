jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  return Object.defineProperty(Object.create(native), 'Platform', { value: { OS: 'web' } });
});
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  dismissAllNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-device', () => ({ modelName: 'Fixture browser' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '3.0.9' } } }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/services/api/deviceApiService', () => ({
  deviceApiService: { registerToken: jest.fn(), unregisterToken: jest.fn() },
}));
jest.mock('@/services/firebase', () => ({
  initializeFirebaseWeb: jest.fn().mockResolvedValue(true),
  registerServiceWorker: jest.fn().mockResolvedValue(undefined),
  getWebFcmToken: jest.fn(),
  revokeWebFcmToken: jest.fn().mockResolvedValue(undefined),
  onWebForegroundMessage: jest.fn().mockReturnValue(jest.fn()),
  getWebNotificationPermissionStatus: jest.fn().mockReturnValue('granted'),
}));
jest.mock('@/utils/notificationNavigator', () => ({
  handleNotificationTap: jest.fn(), isNotificationNavigationReady: jest.fn().mockReturnValue(false),
  navigateFromInAppNotification: jest.fn(),
}));
jest.mock('../notificationQueryMapper', () => ({
  invalidateQueriesForNotification: jest.fn(), refreshAllNotificationData: jest.fn(),
}));
jest.mock('@/services/crashlytics/crashlyticsService', () => ({
  crashlyticsService: { recordError: jest.fn(), log: jest.fn() },
}));

import service from '../pushNotificationService';
import { deviceApiService } from '@/services/api/deviceApiService';
import * as firebase from '@/services/firebase';
import { beginSession, setAccessToken, getSessionEpoch, clearTokens } from '@/api/httpClient';

const svc = service as any;
const register = deviceApiService.registerToken as jest.Mock;
const remove = deviceApiService.unregisterToken as jest.Mock;
const token = firebase.getWebFcmToken as jest.Mock;
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
function signIn(identity: string) { beginSession(); setAccessToken(`fixture-access-${identity}`); }

describe('push ownership across web sessions', () => {
  let originalWindow: PropertyDescriptor | undefined;
  let originalNavigator: PropertyDescriptor | undefined;
  let focus: (() => void) | undefined;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Fixture Chrome' } });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
      addEventListener: jest.fn((event: string, handler: () => void) => { if (event === 'focus') focus = handler; }),
      removeEventListener: jest.fn(),
    } });
    svc.cleanup();
    svc.owner = null;
    svc.initializing = null;
    svc.removing = null;
    svc.backendQueue = Promise.resolve();
    register.mockReset().mockResolvedValue({});
    remove.mockReset().mockResolvedValue(undefined);
    token.mockReset().mockResolvedValue('fixture-browser-token');
    (firebase.revokeWebFcmToken as jest.Mock).mockClear();
    signIn('A');
  });
  afterEach(() => {
    svc.cleanup();
    clearTokens();
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('cancels old SDK initialization and registers only B after A removal', async () => {
    const sdk = deferred<string>();
    token.mockReturnValueOnce(sdk.promise);
    const oldInitialization = service.initialize();
    await flush();
    expect(token).toHaveBeenCalledTimes(1);
    const removal = service.unregister('fixture-access-A');
    signIn('B');
    const newEpoch = getSessionEpoch();
    const newInitialization = service.initialize();
    await flush();
    expect(register).not.toHaveBeenCalled();
    sdk.resolve('fixture-browser-token');
    await oldInitialization;
    await removal;
    expect(await newInitialization).toBe(true);
    expect(remove).toHaveBeenCalledWith('fixture-browser-token', 'fixture-access-A');
    expect(register).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[0][1]).toBe(newEpoch);
    expect(svc.owner.epoch).toBe(newEpoch);
    expect(svc.isInitialized).toBe(true);
  });

  it('settles in-flight A registration before DELETE, then allows B registration', async () => {
    const inFlight = deferred<any>();
    const trace: string[] = [];
    register.mockImplementationOnce(() => { trace.push('POST A'); return inFlight.promise; })
      .mockImplementationOnce(async () => { trace.push('POST B'); return {}; });
    remove.mockImplementationOnce(async () => { trace.push('DELETE A'); });
    const oldInitialization = service.initialize();
    await flush();
    expect(trace).toEqual(['POST A']);
    const removal = service.unregister('fixture-access-A');
    signIn('B');
    const newInitialization = service.initialize();
    await flush();
    expect(trace).toEqual(['POST A']);
    inFlight.resolve({});
    await oldInitialization;
    await removal;
    expect(await newInitialization).toBe(true);
    expect(trace).toEqual(['POST A', 'DELETE A', 'POST B']);
  });

  it('does not skip B registration while an old DELETE is pending', async () => {
    await service.initialize();
    const gate = deferred();
    remove.mockReturnValueOnce(gate.promise);
    const removal = service.unregister('fixture-access-A');
    await flush();
    signIn('B');
    const newInitialization = service.initialize();
    await flush();
    expect(register).toHaveBeenCalledTimes(1);
    gate.resolve();
    await removal;
    expect(await newInitialization).toBe(true);
    expect(register).toHaveBeenCalledTimes(2);
    expect(svc.isInitialized).toBe(true);
  });

  it('retains the browser token for retry when removal is not confirmed', async () => {
    await service.initialize();
    remove.mockRejectedValueOnce(new Error('Fixture 401'));
    await expect(service.unregister('fixture-access-A')).rejects.toThrow();
    expect(svc.token).toBe('fixture-browser-token');
    await service.unregister('fixture-access-A');
    expect(remove).toHaveBeenCalledTimes(2);
    expect(svc.token).toBeNull();
  });

  it('re-registers a rotated web token and removes its latest value on logout', async () => {
    await service.initialize();
    token.mockResolvedValue('fixture-rotated-token');
    focus!();
    await flush();
    expect(register.mock.calls[1][0].deviceToken).toBe('fixture-rotated-token');
    await service.unregister('fixture-access-A');
    expect(remove).toHaveBeenCalledWith('fixture-rotated-token', 'fixture-access-A');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('ignores a token-rotation result that finishes after logout', async () => {
    await service.initialize();
    const gate = deferred<string>();
    token.mockReturnValueOnce(gate.promise);
    focus!();
    await flush();
    await service.unregister('fixture-access-A');
    gate.resolve('fixture-stale-rotation');
    await flush();
    expect(register).toHaveBeenCalledTimes(1);
    expect(svc.token).toBeNull();
  });

  it('does not restore old listeners when a cancelled SDK initialization finishes', async () => {
    const gate = deferred<string>();
    token.mockReturnValueOnce(gate.promise);
    const oldInitialization = service.initialize();
    await flush();
    signIn('B');
    expect(await service.initialize()).toBe(true);
    const unsubscribe = svc.webUnsubscribe;
    gate.resolve('fixture-old-token');
    expect(await oldInitialization).toBe(false);
    expect(svc.webUnsubscribe).toBe(unsubscribe);
    expect(svc.token).toBe('fixture-browser-token');
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('revokes only this browser subscription after forced cleanup cannot authenticate', async () => {
    await service.initialize();
    remove.mockRejectedValueOnce(new Error('Fixture 401'));
    clearTokens();
    await expect(service.unregister(null, true)).rejects.toThrow();
    expect(firebase.revokeWebFcmToken).toHaveBeenCalledTimes(1);
    expect(svc.token).toBeNull();
    expect(svc.isInitialized).toBe(false);
  });

  it('recovers the browser token for removal when restored initialization did not retain it', async () => {
    svc.token = null;
    await service.unregister('fixture-access-A');
    expect(token).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('fixture-browser-token', 'fixture-access-A');
  });

  it('rejects unregistration when notifications are allowed but the browser token is unavailable', async () => {
    svc.token = null;
    token.mockResolvedValueOnce(null);
    await expect(service.unregister('fixture-access-A')).rejects.toThrow('Browser push token could not be accessed');
    expect(remove).not.toHaveBeenCalled();
  });

  it('detects token rotation on the periodic check, not only on focus', async () => {
    expect(await service.initialize()).toBe(true);
    token.mockResolvedValue('fixture-timer-rotation');
    await jest.advanceTimersByTimeAsync(60_000);
    expect(register.mock.calls[1][0].deviceToken).toBe('fixture-timer-rotation');
  });
});
