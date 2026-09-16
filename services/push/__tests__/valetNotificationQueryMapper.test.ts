import { QueryClient } from '@tanstack/react-query';
import { invalidateQueriesForNotification } from '../notificationQueryMapper';
import { notificationKeys } from '@/hooks/queries/useNotificationQueries';
import { valetAdminKeys } from '@/hooks/queries/useValetAdminQueries';
import { valetKeys } from '@/hooks/queries/useValetQueries';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('valet new-request query refresh', () => {
  it('invalidates unread/list and valet task data', () => {
    const queryClient = new QueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    invalidateQueriesForNotification(queryClient, 'valet_new_request');

    expect(invalidate).toHaveBeenCalledWith({ queryKey: notificationKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: notificationKeys.unreadCount() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: valetAdminKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: valetKeys.all });
  });
});