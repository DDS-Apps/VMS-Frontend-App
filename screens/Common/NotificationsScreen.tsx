import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StatusAccent } from "@/components/shared/StatusBadge";
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

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

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

  const getNotificationConfig = (type: NotificationEventType | string): { icon: IconName; variant: BadgeVariant } => {
    switch (type) {
      // Success variants (green)
      case 'request_approved': return { icon: 'check-circle', variant: 'success' };
      case 'visitor_accepted': return { icon: 'user-check', variant: 'success' };
      case 'check_in': return { icon: 'log-in', variant: 'success' };
      case 'check_out': return { icon: 'log-out', variant: 'success' };
      case 'parking_assigned': return { icon: 'map-pin', variant: 'success' };
      case 'buffet_completed': return { icon: 'check-circle', variant: 'success' };
      case 'valet_completed': return { icon: 'check-circle', variant: 'success' };
      
      // Error variants (red)
      case 'request_rejected': return { icon: 'x-circle', variant: 'error' };
      case 'request_cancelled': return { icon: 'x-circle', variant: 'error' };
      case 'visitor_rejected': return { icon: 'user-x', variant: 'error' };
      case 'auto_cancelled': return { icon: 'x-octagon', variant: 'error' };
      case 'room_cancelled': return { icon: 'x-circle', variant: 'error' };
      case 'room_conflict': return { icon: 'alert-triangle', variant: 'error' };
      case 'valet_cancelled': return { icon: 'x-circle', variant: 'error' };
      
      // Warning variants (orange/yellow)
      case 'pending_approval': return { icon: 'clock', variant: 'warning' };
      case 'visitor_no_show': return { icon: 'user-x', variant: 'warning' };
      case 'visitor_arrival': return { icon: 'navigation', variant: 'warning' };
      case 'expected_today': return { icon: 'calendar', variant: 'warning' };
      case 'reminder_tomorrow': return { icon: 'bell', variant: 'warning' };
      case 'reminder_2hours': return { icon: 'bell', variant: 'warning' };
      case 'reminder_30min': return { icon: 'bell', variant: 'warning' };
      case 'reminder_now': return { icon: 'bell', variant: 'warning' };
      case 'room_reminder': return { icon: 'bell', variant: 'warning' };
      case 'parking_full': return { icon: 'alert-circle', variant: 'warning' };
      case 'valet_task_assigned': return { icon: 'key', variant: 'warning' };
      
      // Info variants (blue/neutral)
      case 'request_created': return { icon: 'send', variant: 'info' };
      case 'request_updated': return { icon: 'edit-2', variant: 'info' };
      case 'room_booked': return { icon: 'home', variant: 'info' };
      case 'room_reassigned': return { icon: 'refresh-cw', variant: 'info' };
      case 'buffet_new_request': return { icon: 'disc', variant: 'info' };
      case 'buffet_request_created': return { icon: 'plus-circle', variant: 'info' };
      case 'buffet_task_assigned': return { icon: 'user-plus', variant: 'info' };
      case 'buffet_scheduled': return { icon: 'clock', variant: 'info' };
      case 'buffet_status_update': return { icon: 'refresh-cw', variant: 'info' };
      case 'buffet_staff_update': return { icon: 'users', variant: 'info' };
      case 'valet_new_request': return { icon: 'truck', variant: 'info' };
      case 'valet_scheduled': return { icon: 'clock', variant: 'info' };
      case 'security_access_update': return { icon: 'shield', variant: 'info' };
      case 'security_gate_pass': return { icon: 'key', variant: 'info' };
      
      default: return { icon: 'bell', variant: 'muted' };
    }
  };

  const getVariantColor = (variant: BadgeVariant): string => {
    switch (variant) {
      case 'success': return theme.success;
      case 'warning': return theme.warning;
      case 'error': return theme.error;
      case 'info': return theme.info;
      default: return theme.textSecondary;
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
          const { icon, variant } = getNotificationConfig(notification.type);
          const accentColor = getVariantColor(variant);
          return (
            <View key={notification.id}>
              <Pressable
                onPress={() => handleNotificationPress(notification)}
                style={({ pressed }) => [
                  styles.notificationCard,
                  { 
                    backgroundColor: theme.surface,
                    opacity: pressed ? 0.95 : 1,
                    borderColor: theme.border,
                    shadowColor: '#000',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <StatusAccent color={accentColor} width={4} />

                {!notification.isRead ? (
                  <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                ) : null}

                <View style={[styles.iconContainer, { backgroundColor: applyOpacity(accentColor, '15') }]}>
                  <DDIcon name={icon} size={20} color={accentColor} />
                </View>

                <View style={styles.notificationContent}>
                  <ThemedText style={[styles.notificationTitle, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {getLocalizedTitle(notification)}
                  </ThemedText>
                  <Spacer height={Spacing.xs} />
                  <ThemedText style={[styles.notificationMessage, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={3}>
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
  activeTab: {},
  notificationCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingStart: Spacing.xl,
    borderRadius: BorderRadius.md,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginStart: Spacing.md,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
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
  unreadDot: {
    position: 'absolute',
    top: Spacing.md,
    end: Spacing.md,
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
