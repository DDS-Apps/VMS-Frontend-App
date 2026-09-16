jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getDevicePushTokenAsync: jest.fn().mockResolvedValue({ data: 'fcm-token', type: 'fcm' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'expo-token' }),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Brand',
  modelName: 'Model',
  deviceName: 'Device',
  osName: 'Android',
  osVersion: '14',
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));
jest.mock('@/services/api/deviceApiService', () => ({
  deviceApiService: { registerToken: jest.fn().mockResolvedValue({}) },
}));
jest.mock('@/services/firebase', () => ({
  initializeFirebaseWeb: jest.fn(),
  getWebFcmToken: jest.fn(),
  onWebForegroundMessage: jest.fn(),
  registerServiceWorker: jest.fn(),
  getWebNotificationPermissionStatus: jest.fn(),
}));
jest.mock('@/services/crashlytics/crashlyticsService', () => ({
  crashlyticsService: { recordError: jest.fn(), log: jest.fn() },
}));
jest.mock('@/utils/notificationNavigator', () => ({
  handleNotificationTap: jest.fn(),
  isNotificationNavigationReady: jest.fn(() => true),
  navigateFromInAppNotification: jest.fn(),
}));
jest.mock('../notificationQueryMapper', () => ({
  invalidateQueriesForNotification: jest.fn(),
  refreshAllNotificationData: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn() },
}));

import pushNotificationService from '../pushNotificationService';
import * as Notifications from 'expo-notifications';
import {
  handleNotificationTap,
  isNotificationNavigationReady,
} from '@/utils/notificationNavigator';
import { invalidateQueriesForNotification } from '../notificationQueryMapper';

const mockLastResponse =
  Notifications.getLastNotificationResponseAsync as jest.Mock;
const mockResponseListener =
  Notifications.addNotificationResponseReceivedListener as jest.Mock;

const makeResponse = (identifier: string) => ({
  notification: {
    request: {
      identifier,
      content: {
        title: 'New Valet Request',
        data: { type: 'valet_new_request', taskId: 'task-1' },
      },
    },
  },
});

describe('valet notification Android lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pushNotificationService as any).isInitialized = false;
    (pushNotificationService as any).handledResponseIds.clear();
    pushNotificationService.setQueryClient({ invalidateQueries: jest.fn() } as any);
  });

  it('processes a notification tap that cold-launches the app', async () => {
    const response = makeResponse('cold-1');
    mockLastResponse.mockResolvedValue(response);

    await pushNotificationService.initialize();

    expect(invalidateQueriesForNotification).toHaveBeenCalledWith(
      expect.anything(),
      'valet_new_request'
    );
    expect(handleNotificationTap).toHaveBeenCalledWith(response);
  });

  it('deduplicates the same response across launch and resume', async () => {
    const response = makeResponse('cold-2');
    mockLastResponse.mockResolvedValue(response);

    await pushNotificationService.initialize();
    await pushNotificationService.processLastNotificationResponse();

    expect(handleNotificationTap).toHaveBeenCalledTimes(1);
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps an unhandled response pending until navigation is ready', async () => {
    const response = makeResponse('cold-3');
    mockLastResponse.mockResolvedValue(response);
    (isNotificationNavigationReady as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    await pushNotificationService.initialize();
    expect(handleNotificationTap).not.toHaveBeenCalled();
    expect(Notifications.clearLastNotificationResponseAsync).not.toHaveBeenCalled();

    await pushNotificationService.processLastNotificationResponse();
    expect(handleNotificationTap).toHaveBeenCalledWith(response);
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  });

  it('clears a warm-background response after handling it', async () => {
    mockLastResponse.mockResolvedValue(null);
    await pushNotificationService.initialize();
    const listener = mockResponseListener.mock.calls[0][0];
    const response = makeResponse('warm-1');

    listener(response);
    await Promise.resolve();

    expect(handleNotificationTap).toHaveBeenCalledWith(response);
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  });
});