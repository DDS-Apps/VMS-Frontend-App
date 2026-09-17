import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { notificationApiService } from '@/services/api/notificationApiService';
import { notificationKeys } from '@/hooks/queries/useNotificationQueries';
import { pushNotificationService } from '@/services/push';
import { InAppNotificationToast } from '@/components/InAppNotificationToast';
import { navigateFromInAppNotification } from '@/utils/notificationNavigator';
import { removeValetVehicleInfo, sanitizeParkingNotificationMessage } from '@/utils/notificationLocalization';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnreadNotificationCountQuery } from '@/hooks/queries/useNotificationQueries';
import type { ApiError } from '@/api/errors';

// Check if notifications are supported in this environment
// Note: The main notification handler is set in pushNotificationService.ts
// This context only manages unread counts, badge, and permission status
import { valetAdminKeys } from '@/hooks/queries/useValetAdminQueries';
import { valetKeys } from '@/hooks/queries/useValetQueries';
let notificationsSupported = true;
try {
  // Just check if the module is available, don't set handler (handled by pushNotificationService)
  if (typeof Notifications.getPermissionsAsync !== 'function') {
    notificationsSupported = false;
  }
} catch {
  console.log('[NotificationContext] expo-notifications not supported in this environment');
  notificationsSupported = false;
}

interface NotificationContextType {
  unreadCount: number;
  isLoading: boolean;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | 'unsupported' | null;
  pushToken: string | null;
  requestPermission: () => Promise<boolean>;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  unreadError: ApiError | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  
  const [manualRefreshLoading, setManualRefreshLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'unsupported' | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    body: string;
    notificationType?: string;
    notificationData?: Record<string, unknown>;
  }>({
    visible: false,
    title: '',
    body: '',
  });
  
  const notificationListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const accountId = isAuthenticated ? user?.id : undefined;
  const unreadQuery = useUnreadNotificationCountQuery(accountId, {
    enabled: Boolean(accountId),
  });
  const [retainedUnread, setRetainedUnread] = useState<{ accountId?: string; count: number }>({
    count: 0,
  });

  useEffect(() => {
    if (!accountId) {
      setRetainedUnread({ count: 0 });
    } else if (unreadQuery.data !== undefined) {
      setRetainedUnread({ accountId, count: unreadQuery.data.count });
    }
  }, [accountId, unreadQuery.data]);

  // Fetch unread count from backend
  const fetchUnreadCount = useCallback(async () => {
    if (!accountId) return;
    await unreadQuery.refetch();
  }, [accountId, unreadQuery.refetch]);

  const unreadCount = accountId && retainedUnread.accountId === accountId
    ? retainedUnread.count
    : 0;

  // Do not update the badge on a failed request: a failure is not zero.
  useEffect(() => {
    if (!accountId || unreadQuery.data === undefined) return;
    if (Platform.OS !== 'web' && notificationsSupported) {
      Notifications.setBadgeCountAsync(unreadQuery.data.count).catch(() => undefined);
    }
  }, [accountId, unreadQuery.data]);

  // Check and update permission status from pushNotificationService
  const updatePermissionStatus = useCallback(async () => {
    try {
      const status = await pushNotificationService.getPermissionStatus();
      setPermissionStatus(status);
      
      // Also get the current token if available
      const token = pushNotificationService.getToken();
      setPushToken(token);
    } catch {
      console.warn('[NotificationContext] Unable to read notification permission status');
    }
  }, []);

  // Request permission - delegates to pushNotificationService which handles token registration
  const requestPermission = useCallback(async (): Promise<boolean> => {
    console.log('[NotificationContext] requestPermission called');
    
    if (Platform.OS === 'web') {
      // For web, pushNotificationService handles everything
      const success = await pushNotificationService.initialize();
      await updatePermissionStatus();
      return success;
    }

    if (!notificationsSupported || !Device.isDevice) {
      console.log('[NotificationContext] Push notifications not supported');
      setPermissionStatus('unsupported');
      return false;
    }

    try {
      // Request permission via expo-notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('[NotificationContext] Requesting notification permission...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('[NotificationContext] Permission result:', finalStatus);
      }

      if (finalStatus === 'granted') {
        setPermissionStatus('granted');
        // Let pushNotificationService handle token registration (it's already initialized in AuthContext)
        const token = pushNotificationService.getToken();
        setPushToken(token);
        return true;
      } else {
        setPermissionStatus('denied');
        return false;
      }
    } catch {
      console.warn('[NotificationContext] Notification permission request failed');
      return false;
    }
  }, [updatePermissionStatus]);

  const refreshUnreadCount = useCallback(async () => {
    setManualRefreshLoading(true);
    try {
      await fetchUnreadCount();
    } finally {
      setManualRefreshLoading(false);
    }
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApiService.markAsRead(id);
      queryClient.setQueryData(notificationKeys.unreadCount(accountId), (previous: { count: number } | undefined) =>
        previous ? { ...previous, count: Math.max(0, previous.count - 1) } : previous,
      );
      setRetainedUnread((previous) => ({
        accountId,
        count: Math.max(0, previous.accountId === accountId ? previous.count - 1 : 0),
      }));
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
      
      if (Platform.OS !== 'web' && notificationsSupported) {
        try {
          const newCount = Math.max(0, unreadCount - 1);
          await Notifications.setBadgeCountAsync(newCount);
        } catch (e) {
          // Badge not supported
        }
      }
    } catch (error) {
      throw error;
    }
  }, [accountId, queryClient, unreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApiService.markAllAsRead();
      queryClient.setQueryData(notificationKeys.unreadCount(accountId), (previous: { count: number } | undefined) =>
        previous ? { ...previous, count: 0 } : previous,
      );
      setRetainedUnread({ accountId, count: 0 });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      
      if (Platform.OS !== 'web' && notificationsSupported) {
        try {
          await Notifications.setBadgeCountAsync(0);
        } catch (e) {
          // Badge not supported
        }
      }
    } catch (error) {
      throw error;
    }
  }, [accountId, queryClient]);

  const clearNotification = useCallback(async (id: string) => {
    try {
      await notificationApiService.delete(id);
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
      await fetchUnreadCount();
    } catch (error) {
      throw error;
    }
  }, [accountId, queryClient, fetchUnreadCount]);

  // Initialize on authentication change
  useEffect(() => {
    if (!isAuthenticated) {
      setRetainedUnread({ count: 0 });
      setPushToken(null);
      setPermissionStatus(null);
      if (Platform.OS !== 'web' && notificationsSupported) {
        try {
          Notifications.setBadgeCountAsync(0);
        } catch (e) {
          // Badge not supported
        }
      }
      return;
    }

    void updatePermissionStatus();
  }, [isAuthenticated, updatePermissionStatus]);

  // Set up notification listeners for badge/count updates (not for navigation - that's in pushNotificationService)
  useEffect(() => {
    if (Platform.OS === 'web' || !isAuthenticated || !notificationsSupported) {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
        notificationListenerRef.current = null;
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
        responseListenerRef.current = null;
      }
      return;
    }

    try {
      // Listen for incoming notifications to update unread count
      notificationListenerRef.current = Notifications.addNotificationReceivedListener(
        (_notification: Notifications.Notification) => {
          fetchUnreadCount();
        }
      );

      // Listen for notification responses to mark as read
      responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
        (response: Notifications.NotificationResponse) => {
          const data = response.notification.request.content.data;
          if (data?.notificationId) {
            markAsRead(data.notificationId as string);
          }
        }
      );
    } catch {
      console.warn('[NotificationContext] Notification listeners unavailable');
    }

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
        notificationListenerRef.current = null;
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
        responseListenerRef.current = null;
      }
    };
  }, [isAuthenticated, fetchUnreadCount, markAsRead]);

  // Register in-app toast callback with push service so it fires even after
  // initialize() has already been called without a callback (e.g. from AuthContext).
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = (notification: Notifications.Notification) => {
      const content = notification.request.content;
      const data = (content.data ?? {}) as Record<string, unknown>;
      const notificationType = data.type as string | undefined;
      const notificationBody = sanitizeParkingNotificationMessage(
        notificationType ?? '',
        removeValetVehicleInfo(notificationType ?? '', content.body ?? ''),
        locale,
      );
      const notificationTitle = sanitizeParkingNotificationMessage(
        notificationType ?? '',
        content.title ?? '',
        locale,
      );
      setToast({
        visible: true,
        title: notificationTitle,
        body: notificationBody,
        notificationType,
        notificationData: data,
      });
      fetchUnreadCount();
    };
    pushNotificationService.setCallback(handler);
    return () => {
      // Clear the callback on logout so the stale handler doesn't fire.
      pushNotificationService.setCallback(undefined);
    };
  }, [isAuthenticated, fetchUnreadCount, locale]);

  // Refresh unread count when app comes to foreground
  useEffect(() => {
    if (!isAuthenticated) return;

    pushNotificationService.processLastNotificationResponse().then((response) => {
      const notificationId = response?.notification.request.content.data?.notificationId;
      if (notificationId) {
        markAsRead(notificationId as string);
      }
    }).catch(() => {
      console.log('[NotificationContext] Failed to process launch notification');
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        fetchUnreadCount();
        updatePermissionStatus();
        if (user?.role === 'valet_admin') {
          queryClient.invalidateQueries({ queryKey: valetAdminKeys.all });
          queryClient.invalidateQueries({ queryKey: valetKeys.all });
        }
        pushNotificationService.processLastNotificationResponse().catch(() => {
          console.log('[NotificationContext] Failed to process resumed notification');
        });
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [
    isAuthenticated,
    fetchUnreadCount,
    updatePermissionStatus,
    markAsRead,
    queryClient,
    user?.role,
  ]);

  const value: NotificationContextType = {
    unreadCount,
    isLoading: manualRefreshLoading || unreadQuery.isLoading,
    permissionStatus,
    pushToken,
    requestPermission,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    unreadError: unreadQuery.error ?? null,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <InAppNotificationToast
        visible={toast.visible}
        title={toast.title}
        body={toast.body}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
        onPress={toast.notificationType ? () => {
          navigateFromInAppNotification({
            type: toast.notificationType!,
            data: toast.notificationData,
          });
          setToast((prev) => ({ ...prev, visible: false }));
        } : undefined}
        type="info"
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
