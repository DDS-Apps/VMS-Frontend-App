import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  invalidateQueriesForNotification,
  refreshAllNotificationData,
} from '@/services/push/notificationQueryMapper';
import { notificationKeys } from '@/hooks/queries/useNotificationQueries';

export function useNotificationRefresh() {
  const queryClient = useQueryClient();

  const refreshForNotificationType = useCallback(
    (notificationType: string) => {
      invalidateQueriesForNotification(queryClient, notificationType);
    },
    [queryClient]
  );

  const refreshNotifications = useCallback(() => {
    refreshAllNotificationData(queryClient);
  }, [queryClient]);

  const refreshUnreadCount = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
  }, [queryClient]);

  return {
    refreshForNotificationType,
    refreshNotifications,
    refreshUnreadCount,
  };
}

export function useRefreshOnFocus(queryKeys: readonly unknown[][]) {
  const queryClient = useQueryClient();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useFocusEffect(
    useCallback(() => {
      const invalidateStaleQueries = () => {
        queryKeys.forEach(queryKey => {
          const state = queryClient.getQueryState(queryKey);
          if (state?.isInvalidated || state?.dataUpdateCount === 0) {
            queryClient.invalidateQueries({ queryKey });
          }
        });
      };

      invalidateStaleQueries();

      const handleAppStateChange = (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          invalidateStaleQueries();
        }
        appStateRef.current = nextState;
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        subscription.remove();
      };
    }, [queryClient, queryKeys])
  );
}

export function useFallbackPolling(enabled: boolean = true) {
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  
  return {
    refetchInterval: enabled ? FIFTEEN_MINUTES : false,
    staleTime: 5 * 60 * 1000,
  };
}
