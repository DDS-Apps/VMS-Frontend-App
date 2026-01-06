import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/vms.types";
import type { NotificationItemDto, NotificationEventType } from "@/types/notification.types";
import { applyOpacity } from "@/utils/statusStyles";
import { navigateFromInAppNotification } from "@/utils/notificationNavigator";
import { 
  useNotificationsQuery, 
  useMarkNotificationAsReadMutation, 
  useMarkAllNotificationsAsReadMutation 
} from "@/hooks/queries/useNotificationQueries";

interface NotificationsScreenProps {
  userRole?: UserRole;
}

export default function NotificationsScreen({ userRole }: NotificationsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { toLocalNumerals } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('all');

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const isReadFilter = selectedTab === 'unread' ? false : undefined;
  const { data, isLoading, refetch } = useNotificationsQuery({ isRead: isReadFilter, limit: 50 });
  const markAsReadMutation = useMarkNotificationAsReadMutation();
  const markAllAsReadMutation = useMarkAllNotificationsAsReadMutation();

  const notifications = data?.data ?? [];
  const totalCount = data?.total ?? 0;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const handleNotificationPress = useCallback((notification: NotificationItemDto) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    navigateFromInAppNotification({
      type: notification.type,
      data: notification.data,
    });
  }, [markAsReadMutation]);

  const getNotificationIcon = (type: NotificationEventType | string) => {
    switch (type) {
      case 'request_created': return { icon: 'send', color: theme.info };
      case 'request_approved': return { icon: 'check-circle', color: theme.success };
      case 'request_rejected': return { icon: 'x-circle', color: theme.error };
      case 'request_cancelled': return { icon: 'x-circle', color: theme.error };
      case 'request_updated': return { icon: 'edit-2', color: theme.info };
      case 'visitor_accepted': return { icon: 'user-check', color: theme.success };
      case 'visitor_rejected': return { icon: 'user-x', color: theme.error };
      case 'visitor_arrival': return { icon: 'navigation', color: theme.primary };
      case 'visitor_no_show': return { icon: 'user-x', color: theme.warning };
      case 'check_in': return { icon: 'log-in', color: theme.primary };
      case 'check_out': return { icon: 'log-out', color: theme.secondary };
      case 'auto_cancelled': return { icon: 'x-octagon', color: theme.error };
      case 'pending_approval': return { icon: 'clock', color: theme.warning };
      case 'expected_today': return { icon: 'calendar', color: theme.primary };
      case 'reminder_tomorrow':
      case 'reminder_2hours':
      case 'reminder_30min':
      case 'reminder_now': return { icon: 'bell', color: theme.warning };
      case 'room_booked': return { icon: 'home', color: theme.info };
      case 'room_reminder': return { icon: 'bell', color: theme.warning };
      case 'room_cancelled': return { icon: 'x-circle', color: theme.error };
      case 'room_conflict': return { icon: 'alert-triangle', color: theme.error };
      case 'room_reassigned': return { icon: 'refresh-cw', color: theme.info };
      case 'parking_assigned': return { icon: 'map-pin', color: theme.success };
      case 'parking_full': return { icon: 'alert-circle', color: theme.warning };
      case 'buffet_new_request': return { icon: 'disc', color: theme.primary };
      case 'buffet_request_created': return { icon: 'plus-circle', color: theme.info };
      case 'buffet_task_assigned': return { icon: 'user-plus', color: theme.secondary };
      case 'buffet_scheduled': return { icon: 'clock', color: theme.info };
      case 'buffet_status_update': return { icon: 'refresh-cw', color: theme.info };
      case 'buffet_staff_update': return { icon: 'users', color: theme.secondary };
      case 'buffet_completed': return { icon: 'check-circle', color: theme.success };
      case 'valet_new_request': return { icon: 'truck', color: theme.primary };
      case 'valet_task_assigned': return { icon: 'key', color: theme.warning };
      case 'valet_scheduled': return { icon: 'clock', color: theme.info };
      case 'valet_completed': return { icon: 'check-circle', color: theme.success };
      case 'valet_cancelled': return { icon: 'x-circle', color: theme.error };
      case 'security_access_update': return { icon: 'shield', color: theme.secondary };
      case 'security_gate_pass': return { icon: 'key', color: theme.primary };
      default: return { icon: 'bell', color: theme.textSecondary };
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return t('time.minutesAgo', { count: toLocalNumerals(String(diffMins)) });
    if (diffHours < 24) return t('time.hoursAgo', { count: toLocalNumerals(String(diffHours)) });
    return t('time.daysAgo', { count: toLocalNumerals(String(diffDays)) });
  };

  const getLocalizedTitle = (notification: NotificationItemDto): string => {
    const typeToTitleKey: Record<string, string> = {
      'request_created': 'notifications.types.requestSubmitted',
      'request_approved': 'notifications.types.requestApproved',
      'request_rejected': 'notifications.types.requestRejected',
      'request_cancelled': 'notifications.types.requestCancelled',
      'request_updated': 'notifications.types.requestModified',
      'visitor_accepted': 'notifications.types.visitorAccepted',
      'visitor_rejected': 'notifications.types.visitorDeclined',
      'visitor_arrival': 'notifications.types.visitorArrival',
      'visitor_no_show': 'notifications.types.visitorNoShow',
      'check_in': 'notifications.types.checkIn',
      'check_out': 'notifications.types.checkOut',
      'auto_cancelled': 'notifications.types.autoCancelled',
      'pending_approval': 'notifications.types.pendingApproval',
      'expected_today': 'notifications.types.expectedToday',
      'reminder_tomorrow': 'notifications.types.reminderTomorrow',
      'reminder_2hours': 'notifications.types.reminder2Hours',
      'reminder_30min': 'notifications.types.reminder30Min',
      'reminder_now': 'notifications.types.reminderNow',
      'room_booked': 'notifications.types.roomBooked',
      'room_reminder': 'notifications.types.roomReminder',
      'room_cancelled': 'notifications.types.roomCancelled',
      'room_conflict': 'notifications.types.roomConflict',
      'room_reassigned': 'notifications.types.roomReassigned',
      'parking_assigned': 'notifications.types.parkingAssigned',
      'parking_full': 'notifications.types.parkingFull',
      'buffet_new_request': 'notifications.types.buffetNewRequest',
      'buffet_request_created': 'notifications.types.buffetRequestCreated',
      'buffet_task_assigned': 'notifications.types.buffetTaskAssigned',
      'buffet_scheduled': 'notifications.types.buffetScheduled',
      'buffet_status_update': 'notifications.types.buffetStatusUpdate',
      'buffet_staff_update': 'notifications.types.buffetStaffUpdate',
      'buffet_completed': 'notifications.types.buffetCompleted',
      'valet_new_request': 'notifications.types.valetNewRequest',
      'valet_task_assigned': 'notifications.types.valetTaskAssigned',
      'valet_scheduled': 'notifications.types.valetScheduled',
      'valet_completed': 'notifications.types.valetCompleted',
      'valet_cancelled': 'notifications.types.valetCancelled',
      'security_access_update': 'notifications.types.securityAccessUpdate',
      'security_gate_pass': 'notifications.types.securityGatePass',
    };
    
    const key = typeToTitleKey[notification.type];
    return key ? t(key) : notification.title;
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ThemedText style={[Typography.title]}>
          {t('notifications.title')}
        </ThemedText>
        <Pressable 
          onPress={handleMarkAllAsRead}
          disabled={markAllAsReadMutation.isPending}
        >
          <ThemedText style={[Typography.bodySmall, { color: theme.primary }]}>
            {markAllAsReadMutation.isPending ? t('common.loading') : t('notifications.markAllRead')}
          </ThemedText>
        </Pressable>
      </View>

      <Spacer height={Spacing.lg} />

      <View style={styles.tabsContainer}>
        <Pressable
          style={[
            styles.tab,
            selectedTab === 'all' && [styles.activeTab, { backgroundColor: theme.primary }],
          ]}
          onPress={() => setSelectedTab('all')}
        >
          <ThemedText
            style={[
              Typography.body,
              { color: selectedTab === 'all' ? theme.buttonText : theme.text },
            ]}
          >
            {t('common.all')} ({toLocalNumerals(String(totalCount))})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            selectedTab === 'unread' && [styles.activeTab, { backgroundColor: theme.primary }],
          ]}
          onPress={() => setSelectedTab('unread')}
        >
          <ThemedText
            style={[
              Typography.body,
              { color: selectedTab === 'unread' ? theme.buttonText : theme.text },
            ]}
          >
            {t('notifications.unread')} ({toLocalNumerals(String(unreadCount))})
          </ThemedText>
        </Pressable>
      </View>

      <Spacer height={Spacing.lg} />

      {isLoading ? (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </ThemedView>
      ) : notifications.length === 0 ? (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="inbox" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
            {t('notifications.noNotifications')}
          </ThemedText>
        </ThemedView>
      ) : (
        notifications.map((notification) => {
          const iconConfig = getNotificationIcon(notification.type);
          return (
            <View key={notification.id}>
              <Pressable
                onPress={() => handleNotificationPress(notification)}
                style={({ pressed }) => [
                  styles.notificationCard,
                  { 
                    backgroundColor: notification.isRead ? theme.surface : applyOpacity(theme.primary, '10'),
                    opacity: pressed ? 0.95 : 1,
                    borderColor: notification.isRead ? theme.border : applyOpacity(theme.primary, '30'),
                    shadowColor: '#000',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                  !notification.isRead && styles.unreadBorder,
                ]}
              >
                {!notification.isRead ? (
                  <View style={[
                    styles.leftBorderLine, 
                    { 
                      backgroundColor: theme.primary,
                      ...(isRTL ? { left: 'auto', right: 0 } : { left: 0, right: 'auto' }),
                    }
                  ]} />
                ) : null}

                <View style={[styles.iconContainer, { backgroundColor: applyOpacity(iconConfig.color, '20') }]}>
                  <DDIcon name={iconConfig.icon as IconName} size={20} color={iconConfig.color} />
                </View>

                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <ThemedText style={[styles.notificationTitle, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                      {getLocalizedTitle(notification)}
                    </ThemedText>
                  </View>
                  <Spacer height={Spacing.sm} />
                  <ThemedText style={[styles.notificationMessage, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {notification.body}
                  </ThemedText>
                  <Spacer height={Spacing.sm} />
                  <View style={[styles.timeContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <DDIcon name="clock" size={12} variant="muted" />
                    <ThemedText style={[styles.timeText, { color: theme.textSecondary }]}>
                      {formatTime(notification.createdAt)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
              <Spacer height={Spacing.md} />
            </View>
          );
        })
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  activeTab: {
  },
  notificationCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingStart: Spacing.lg,
    borderRadius: BorderRadius.md,
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  unreadBorder: {
  },
  leftBorderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    borderTopStartRadius: 10,
    borderBottomStartRadius: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginStart: Spacing.xs,
  },
  notificationContent: {
    flex: 1,
    marginStart: Spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 19,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  unreadDot: {
    position: 'absolute',
    top: Spacing.lg,
    end: Spacing.lg,
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    padding: Spacing.xxl * 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
