import React, { useState } from "react";
import { View, StyleSheet, Pressable, I18nManager } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from "@/components/DDIcon";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { Notification, UserRole, NotificationType } from "@/types/vms.types";
import { getNotificationsByRole as getNotificationsFromState, markAllAsRead as markAllNotificationsAsRead, markAsRead } from "@/services/mock/notificationState";
import { applyOpacity } from "@/utils/statusStyles";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  useFocusEffect(
    React.useCallback(() => {
      setNotifications(getNotificationsFromState(userRole));
    }, [userRole])
  );

  const getRoleNotifications = () => {
    return notifications.filter(n => {
      if (!n.targetRoles || n.targetRoles.length === 0) return true;
      if (!userRole) return true;
      return n.targetRoles.includes(userRole);
    });
  };

  const markAllAsRead = () => {
    markAllNotificationsAsRead(userRole);
    setNotifications(getNotificationsFromState(userRole));
  };

  const handleNotificationPress = (notificationId: string) => {
    markAsRead(notificationId);
    setNotifications(getNotificationsFromState(userRole));
  };

  const roleNotifications = getRoleNotifications();
  const filteredNotifications = selectedTab === 'all' 
    ? roleNotifications 
    : roleNotifications.filter((n: Notification) => !n.read);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'request_submitted': return { icon: 'send', color: theme.info };
      case 'request_approved': return { icon: 'check-circle', color: theme.success };
      case 'request_rejected': return { icon: 'x-circle', color: theme.error };
      case 'request_cancelled': return { icon: 'x-circle', color: theme.error };
      case 'request_modified': return { icon: 'edit-2', color: theme.info };
      case 'visitor_accepted': return { icon: 'user-check', color: theme.success };
      case 'visitor_rejected': return { icon: 'user-x', color: theme.error };
      case 'visitor_reminder': return { icon: 'bell', color: theme.warning };
      case 'visitor_arrival': return { icon: 'navigation', color: theme.primary };
      case 'check_in': return { icon: 'log-in', color: theme.primary };
      case 'check_out': return { icon: 'log-out', color: theme.secondary };
      case 'update': return { icon: 'alert-circle', color: theme.info };
      case 'assignment': return { icon: 'user-plus', color: theme.secondary };
      case 'auto_cancelled': return { icon: 'x-octagon', color: theme.error };
      case 'pending_approval': return { icon: 'clock', color: theme.warning };
      case 'walk_in_registered': return { icon: 'user-plus', color: theme.info };
      case 'walk_in_approved': return { icon: 'check-circle', color: theme.success };
      case 'expected_today': return { icon: 'calendar', color: theme.primary };
      case 'buffet_new_request': return { icon: 'disc', color: theme.primary };
      case 'buffet_scheduled': return { icon: 'clock', color: theme.info };
      case 'buffet_completed': return { icon: 'check-circle', color: theme.success };
      case 'buffet_staff_update': return { icon: 'users', color: theme.secondary };
      case 'valet_new_request': return { icon: 'truck', color: theme.primary };
      case 'valet_scheduled': return { icon: 'clock', color: theme.info };
      case 'valet_completed': return { icon: 'check-circle', color: theme.success };
      case 'valet_cancelled': return { icon: 'x-circle', color: theme.error };
      case 'valet_task_assigned': return { icon: 'key', color: theme.warning };
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

  const getLocalizedTitle = (notification: Notification): string => {
    const typeToTitleKey: Record<NotificationType, string> = {
      'request_submitted': 'notifications.types.requestSubmitted',
      'request_approved': 'notifications.types.requestApproved',
      'request_rejected': 'notifications.types.requestRejected',
      'request_cancelled': 'notifications.types.requestCancelled',
      'request_modified': 'notifications.types.requestModified',
      'visitor_accepted': 'notifications.types.visitorAccepted',
      'visitor_rejected': 'notifications.types.visitorDeclined',
      'visitor_reminder': 'notifications.types.visitorReminder',
      'visitor_arrival': 'notifications.types.visitorArrival',
      'check_in': 'notifications.types.checkIn',
      'check_out': 'notifications.types.checkOut',
      'update': 'notifications.types.update',
      'assignment': 'notifications.types.assignment',
      'auto_cancelled': 'notifications.types.autoCancelled',
      'pending_approval': 'notifications.types.pendingApproval',
      'walk_in_registered': 'notifications.types.walkInRegistered',
      'walk_in_approved': 'notifications.types.walkInApproved',
      'expected_today': 'notifications.types.expectedToday',
      'buffet_new_request': 'notifications.types.buffetNewRequest',
      'buffet_scheduled': 'notifications.types.buffetScheduled',
      'buffet_completed': 'notifications.types.buffetCompleted',
      'buffet_staff_update': 'notifications.types.buffetStaffUpdate',
      'buffet_task_assigned': 'notifications.types.buffetTaskAssigned',
      'buffet_request_created': 'notifications.types.buffetRequestCreated',
      'buffet_status_update': 'notifications.types.buffetStatusUpdate',
      'valet_new_request': 'notifications.types.valetNewRequest',
      'valet_scheduled': 'notifications.types.valetScheduled',
      'valet_completed': 'notifications.types.valetCompleted',
      'valet_cancelled': 'notifications.types.valetCancelled',
      'valet_task_assigned': 'notifications.types.valetTaskAssigned',
      'security_access_update': 'notifications.types.securityAccessUpdate',
      'security_gate_pass': 'notifications.types.securityGatePass',
    };
    
    const key = typeToTitleKey[notification.type];
    return key ? t(key) : notification.title;
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.header}>
        <ThemedText style={[Typography.title]}>
          {t('notifications.title')}
        </ThemedText>
        <Pressable onPress={markAllAsRead}>
          <ThemedText style={[Typography.bodySmall, { color: theme.primary }]}>
            {t('notifications.markAllRead')}
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
            {t('common.all')} ({roleNotifications.length})
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
            {t('notifications.unread')} ({roleNotifications.filter((n: Notification) => !n.read).length})
          </ThemedText>
        </Pressable>
      </View>

      <Spacer height={Spacing.lg} />

      {filteredNotifications.length === 0 ? (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="inbox" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
            {t('notifications.noNotifications')}
          </ThemedText>
        </ThemedView>
      ) : (
        filteredNotifications.map((notification) => {
          const iconConfig = getNotificationIcon(notification.type);
          return (
            <View key={notification.id}>
              <Pressable
                onPress={() => handleNotificationPress(notification.id)}
                style={({ pressed }) => [
                  styles.notificationCard,
                  { 
                    backgroundColor: notification.read ? theme.surface : applyOpacity(theme.primary, '10'),
                    opacity: pressed ? 0.95 : 1,
                    borderColor: notification.read ? theme.border : applyOpacity(theme.primary, '30'),
                    shadowColor: '#000',
                  },
                  !notification.read && styles.unreadBorder,
                ]}
              >
                {!notification.read && (
                  <View style={[
                    styles.leftBorderLine, 
                    { 
                      backgroundColor: theme.primary,
                      ...(isRTL ? { left: 'auto', right: 0 } : { left: 0, right: 'auto' }),
                    }
                  ]} />
                )}

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
                    {notification.message}
                  </ThemedText>
                  <Spacer height={Spacing.sm} />
                  <View style={[styles.timeContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <DDIcon name="clock" size={12} variant="muted" />
                    <ThemedText style={[styles.timeText, { color: theme.textSecondary }]}>
                      {formatTime(notification.timestamp)}
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
    borderWidth: 1,
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
