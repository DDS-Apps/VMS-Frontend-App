import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { notificationApiService } from '@/services/api/notificationApiService';
import { notificationKeys } from '@/hooks/queries/useNotificationQueries';
import type { UserRole } from '@/types/vms.types';

let notificationsSupported = true;

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  console.log('expo-notifications not supported in this environment (likely Expo Go on Android SDK 53+)');
  notificationsSupported = false;
}

interface NotificationContextType {
  unreadCount: number;
  isLoading: boolean;
  permissionStatus: Notifications.PermissionStatus | null;
  expoPushToken: string | null;
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
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await notificationApiService.getUnreadCount();
      setUnreadCount(response.count);
      
      if (Platform.OS !== 'web' && notificationsSupported) {
        try {
          await Notifications.setBadgeCountAsync(response.count);
        } catch (e) {
        }
      }
    } catch (error) {
    }
  }, [isAuthenticated]);

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return null;
    }

    if (!notificationsSupported) {
      console.log('Push notifications not supported in this environment');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== 'granted') {
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#307BF2',
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'dallah-vms',
      });
      
      const token = tokenData.data;
      setExpoPushToken(token);

      if (isAuthenticated && token) {
        try {
          await notificationApiService.registerDeviceToken({
            token,
            platform: Platform.OS as 'ios' | 'android',
            deviceName: Device.deviceName || undefined,
          });
        } catch (error) {
        }
      }

      return token;
    } catch (error) {
      return null;
    }
  }, [isAuthenticated]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const token = await registerForPushNotifications();
    return token !== null;
  }, [registerForPushNotifications]);

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

  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (!isAuthenticated) {
      setUnreadCount(0);
      setExpoPushToken(null);
      if (Platform.OS !== 'web' && notificationsSupported) {
        try {
          Notifications.setBadgeCountAsync(0);
        } catch (e) {
        }
      }
      return;
    }

    let isMounted = true;

    const initNotifications = async () => {
      if (!isMounted) return;
      await fetchUnreadCount();
      if (!isMounted) return;
      await registerForPushNotifications();
    };

    initNotifications();

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
  }, [isAuthenticated, user?.role, fetchUnreadCount, registerForPushNotifications]);

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
      notificationListenerRef.current = Notifications.addNotificationReceivedListener(
        (_notification: Notifications.Notification) => {
          fetchUnreadCount();
        }
      );

      responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
        (response: Notifications.NotificationResponse) => {
          const data = response.notification.request.content.data;
          if (data?.notificationId) {
            markAsRead(data.notificationId as string);
          }
        }
      );
    } catch (e) {
      console.log('Failed to set up notification listeners');
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        fetchUnreadCount();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, fetchUnreadCount]);

  const value: NotificationContextType = {
    unreadCount,
    isLoading,
    permissionStatus,
    expoPushToken,
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

export { NotificationContext };
