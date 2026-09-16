import type { NotificationResponse } from 'expo-notifications';
import { handleNotificationTap, navigateFromInAppNotification } from '../notificationNavigator';
import { navigate, isReady } from '@/navigation/navigationRef';
import { ROUTES } from '@/constants/routes';

jest.mock('@/navigation/navigationRef', () => ({
  navigate: jest.fn(),
  isReady: jest.fn(),
}));

const response = (data: Record<string, unknown>) => ({
  notification: { request: { content: { data } } },
}) as NotificationResponse;

describe('valet new-request navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isReady as jest.Mock).mockReturnValue(true);
  });

  it('opens the task from a taskId', () => {
    handleNotificationTap(response({ type: 'valet_new_request', taskId: 'task-1' }));
    expect(navigate).toHaveBeenCalledWith(ROUTES.VALET_TASK_DETAILS, { taskId: 'task-1' });
  });

  it('accepts requestId as a compatibility identifier', () => {
    navigateFromInAppNotification({
      type: 'valet_new_request',
      data: { requestId: 'request-1' },
    });
    expect(navigate).toHaveBeenCalledWith(ROUTES.VALET_TASK_DETAILS, { taskId: 'request-1' });
  });

  it('falls back to the valet task list without an identifier', () => {
    handleNotificationTap(response({ type: 'valet_new_request' }));
    expect(navigate).toHaveBeenCalledWith(ROUTES.VALET_TASKS);
  });
});