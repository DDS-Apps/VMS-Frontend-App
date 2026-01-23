import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { notificationApiService } from '@/services/api/notificationApiService';
import { notificationKeys } from '@/hooks/queries/useNotificationQueries';
import { pushNotificationService } from '@/services/push';
import type { UserRole } from '@/types/vms.types';

// Check if notifications are supported in this environment
// Note: The main notification handler is set in pushNotificationService.ts
// This context only manages unread counts, badge, and permission status
let notificationsSupported = true;
try {
  // Just check if the module is available, don't set handler (handled by pushNotificationService)
  if (typeof Notifications.getPermissionsAsync !== 'function') {
    notificationsSupported = false;
  }
} catch (error) {
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

const getPollingIntervalForRole = (role: UserRole | undefined): number => {
  switch (role) {
    case 'receptionist':
    case 'security':
      return 20 * 1000;
    case 'manager':
    case 'building_admin':
      return 45 * 1000;
    default:
      return 60 * 1000;
  }
};

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'unsupported' | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Fetch unread count from backend
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await notificationApiService.getUnreadCount();
      setUnreadCount(response.count);
      
      // Update badge count on mobile
      if (Platform.OS !== 'web' && notificationsSupported) {
        try {
          await Notifications.setBadgeCountAsync(response.count);
        } catch (e) {
          // Badge not supported
        }
      }
    } catch (error) {
      // Silently fail - unread count is not critical
    }
  }, [isAuthenticated]);

  // Check and update permission status from pushNotificationService
  const updatePermissionStatus = useCallback(async () => {
    try {
      const status = await pushNotificationService.getPermissionStatus();
      setPermissionStatus(status);
      
      // Also get the current token if available
      const token = pushNotificationService.getToken();
      setPushToken(token);
    } catch (error) {
      console.log('[NotificationContext] Error getting permission status:', error);
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
    } catch (error) {
      console.error('[NotificationContext] Error requesting permission:', error);
      return false;
    }
  }, [updatePermissionStatus]);

  const refreshUnreadCount = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchUnreadCount();
    } finally {
      setIsLoading(false);
    }
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApiService.markAsRead(id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      
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
  }, [queryClient, unreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApiService.markAllAsRead();
      setUnreadCount(0);
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
  }, [queryClient]);

  const clearNotification = useCallback(async (id: string) => {
    try {
      await notificationApiService.delete(id);
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      await fetchUnreadCount();
    } catch (error) {
      throw error;
    }
  }, [queryClient, fetchUnreadCount]);

  // Initialize on authentication change
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (!isAuthenticated) {
      setUnreadCount(0);
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

    let isMounted = true;

    const initNotifications = async () => {
      if (!isMounted) return;
      await fetchUnreadCount();
      if (!isMounted) return;
      await updatePermissionStatus();
    };

    initNotifications();

    // Set up polling based on role
    const pollingInterval = getPollingIntervalForRole(user?.role);
    pollingIntervalRef.current = setInterval(() => {
      if (isMounted && isAuthenticated) {
        fetchUnreadCount();
      }
    }, pollingInterval);

    return () => {
      isMounted = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, user?.role, fetchUnreadCount, updatePermissionStatus]);

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
    } catch (e) {
      console.log('[NotificationContext] Failed to set up notification listeners');
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

  // Refresh unread count when app comes to foreground
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        fetchUnreadCount();
        updatePermissionStatus();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, fetchUnreadCount, updatePermissionStatus]);

  const value: NotificationContextType = {
    unreadCount,
    isLoading,
    permissionStatus,
    pushToken,
    requestPermission,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
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
