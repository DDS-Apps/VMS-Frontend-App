import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

let mockAccount: string | undefined = 'A';
const mockRefetch = jest.fn().mockResolvedValue({ data: { count: 0 } });
const mockCount = { count: 0 };
const mockQueryClient = { invalidateQueries: jest.fn() };
const mockSetCallback = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: Boolean(mockAccount), user: mockAccount ? { id: mockAccount, role: 'employee' } : null }),
}));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockQueryClient }));
jest.mock('@/hooks/queries/useNotificationQueries', () => ({
  useUnreadNotificationCountQuery: () => ({ data: mockCount, isLoading: false, refetch: mockRefetch }),
  notificationKeys: { all: ['notifications'] },
}));
jest.mock('@/hooks/queries/useValetAdminQueries', () => ({ valetAdminKeys: { all: ['valet-admin'] } }));
jest.mock('@/hooks/queries/useValetQueries', () => ({ valetKeys: { all: ['valet'] } }));
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale: 'en' }) }));
jest.mock('@/services/push', () => ({
  pushNotificationService: {
    setCallback: (...args: unknown[]) => mockSetCallback(...args),
    setQueryClient: jest.fn(),
    getPermissionStatus: jest.fn().mockResolvedValue('granted'),
    getToken: jest.fn().mockReturnValue(null),
    processLastNotificationResponse: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('expo-notifications', () => ({
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('@/components/InAppNotificationToast', () => ({ InAppNotificationToast: 'NotificationToast' }));
jest.mock('@/utils/notificationNavigator', () => ({ navigateFromInAppNotification: jest.fn() }));
import { NotificationProvider } from '@/contexts/NotificationContext';

describe('notification toast ownership', () => {
  let tree: ReactTestRenderer;
  const render = () => <NotificationProvider><React.Fragment /></NotificationProvider>;
  const toast = () => tree.root.findByType('NotificationToast' as any);
  const notify = { request: { content: { title: 'Account notification', body: 'Private account message', data: {} } } };
  beforeEach(async () => {
    mockAccount = 'A';
    mockSetCallback.mockClear();
    await act(async () => { tree = create(render()); });
  });
  afterEach(() => { act(() => tree.unmount()); });

  it.each([undefined, 'B'])('clears A toast when identity changes to %s and ignores its delayed handler', async account => {
    const oldHandler = mockSetCallback.mock.calls.slice().reverse().find(args => typeof args[0] === 'function')![0];
    act(() => oldHandler(notify));
    expect(toast().props.visible).toBe(true);
    mockAccount = account;
    await act(async () => { tree.update(render()); });
    expect(toast().props.visible).toBe(false);
    expect(toast().props.title).toBe('');
    act(() => oldHandler(notify));
    expect(toast().props.visible).toBe(false);
    expect(toast().props.body).toBe('');
  });

  it('accepts only the new account callback after a switch', async () => {
    mockAccount = 'B';
    await act(async () => { tree.update(render()); });
    const handler = mockSetCallback.mock.calls.slice().reverse().find(args => typeof args[0] === 'function')![0];
    act(() => handler(notify));
    expect(toast().props.visible).toBe(true);
  });
});
