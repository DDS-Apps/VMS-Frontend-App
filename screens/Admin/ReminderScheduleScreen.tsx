import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, FlatList, ListRenderItem } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { DDIcon, IconName } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useServerTimezone } from "@/hooks/useServerTimezone";
import { getVisitorRequests } from "@/services/mock/visitorRequestState";
import { VisitorRequest } from "@/types/vms.types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatFullDate } from "@/services/utils/dateTimeUtils";

interface ScheduledReminder {
  id: string;
  requestId: string;
  visitorName: string;
  hostName: string;
  reminderType: 'first_reminder' | 'second_reminder' | 'auto_cancel';
  scheduledTime: Date;
  visitTime: string;
  visitDate: string;
  status: 'pending' | 'sent' | 'cancelled';
}

const generateRemindersFromRequests = (requests: VisitorRequest[]): ScheduledReminder[] => {
  const reminders: ScheduledReminder[] = [];
  const now = new Date();
  
  const pendingRequests = requests.filter(r => 
    r.status === 'pending_approval' || 
    (r.status === 'approved' && r.reminders)
  );

  pendingRequests.forEach(request => {
    if (!request.reminders) return;

    const { firstReminderAt, secondReminderAt, autoCancelAt } = request.reminders;
    
    if (firstReminderAt) {
      const firstTime = new Date(firstReminderAt);
      reminders.push({
        id: `${request.id}_first`,
        requestId: request.id,
        visitorName: request.visitor.fullName,
        hostName: request.employeeName,
        reminderType: 'first_reminder',
        scheduledTime: firstTime,
        visitTime: request.visitTime,
        visitDate: request.visitDate,
        status: firstTime > now ? 'pending' : 'sent',
      });
    }

    if (secondReminderAt) {
      const secondTime = new Date(secondReminderAt);
      reminders.push({
        id: `${request.id}_second`,
        requestId: request.id,
        visitorName: request.visitor.fullName,
        hostName: request.employeeName,
        reminderType: 'second_reminder',
        scheduledTime: secondTime,
        visitTime: request.visitTime,
        visitDate: request.visitDate,
        status: secondTime > now ? 'pending' : 'sent',
      });
    }

    if (autoCancelAt) {
      const cancelTime = new Date(autoCancelAt);
      reminders.push({
        id: `${request.id}_cancel`,
        requestId: request.id,
        visitorName: request.visitor.fullName,
        hostName: request.employeeName,
        reminderType: 'auto_cancel',
        scheduledTime: cancelTime,
        visitTime: request.visitTime,
        visitDate: request.visitDate,
        status: cancelTime > now ? 'pending' : 'cancelled',
      });
    }
  });

  return reminders.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
};

type ReminderFilter = 'all' | 'upcoming' | 'first_reminder' | 'second_reminder' | 'auto_cancel';

export default function ReminderScheduleScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const { formatTimeFromString } = useFormatters();
  const serverTimezone = useServerTimezone();
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [filter, setFilter] = useState<ReminderFilter>('upcoming');

  useFocusEffect(
    useCallback(() => {
      const requests = getVisitorRequests();
      const generatedReminders = generateRemindersFromRequests(requests);
      setReminders(generatedReminders);
    }, [])
  );

  const filterOptions: { key: ReminderFilter; label: string; icon: IconName }[] = [
    { key: 'upcoming', label: t('admin.upcoming'), icon: 'clock' },
    { key: 'all', label: t('common.all'), icon: 'list' },
    { key: 'first_reminder', label: t('admin.firstReminder'), icon: 'bell' },
    { key: 'second_reminder', label: t('admin.secondReminder'), icon: 'bell' },
    { key: 'auto_cancel', label: t('admin.autoCancel'), icon: 'x-circle' },
  ];

  const now = new Date();
  const filteredReminders = reminders.filter(r => {
    if (filter === 'upcoming') {
      return r.scheduledTime > now && r.status === 'pending';
    }
    if (filter === 'all') return true;
    return r.reminderType === filter;
  });

  const upcomingCount = reminders.filter(r => r.scheduledTime > now && r.status === 'pending').length;
  const next24Hours = reminders.filter(r => {
    const diff = r.scheduledTime.getTime() - now.getTime();
    return diff > 0 && diff < 24 * 60 * 60 * 1000 && r.status === 'pending';
  }).length;

  const getReminderTypeLabel = (type: ScheduledReminder['reminderType']): string => {
    const labels: Record<string, string> = {
      first_reminder: t('admin.firstReminder'),
      second_reminder: t('admin.secondReminder'),
      auto_cancel: t('admin.autoCancel'),
    };
    return labels[type] || type;
  };

  const getReminderIcon = (type: ScheduledReminder['reminderType']): IconName => {
    switch (type) {
      case 'first_reminder':
        return 'bell';
      case 'second_reminder':
        return 'bell';
      case 'auto_cancel':
        return 'x-circle';
      default:
        return 'clock';
    }
  };

  const getReminderColor = (type: ScheduledReminder['reminderType'], theme: ReturnType<typeof useTheme>['theme']): string => {
    switch (type) {
      case 'first_reminder':
        return theme.info;
      case 'second_reminder':
        return theme.warning;
      case 'auto_cancel':
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const formatScheduledTime = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return t('time.passed');
    }
    
    const absDiffMs = Math.abs(diffMs);
    const hours = Math.floor(absDiffMs / 3600000);
    const minutes = Math.floor((absDiffMs % 3600000) / 60000);
    const days = Math.floor(hours / 24);
    
    if (hours < 24) {
      if (hours === 0) {
        return t('time.inMinutes', { count: minutes });
      }
      return t('time.inHours', { count: hours });
    }
    return t('time.inDays', { count: days });
  };

  const formatDate = (date: Date): string => {
    return formatFullDate(date, isRTL, serverTimezone);
  };

  const renderReminderItem: ListRenderItem<ScheduledReminder> = ({ item }) => {
    const reminderColor = getReminderColor(item.reminderType, theme);
    const reminderIcon = getReminderIcon(item.reminderType);
    const isPast = item.scheduledTime < now;

    return (
      <ThemedView 
        style={[
          styles.reminderCard, 
          { 
            backgroundColor: theme.surface,
            opacity: isPast ? 0.6 : 1,
          }
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: reminderColor + '15' }]}>
          <DDIcon name={reminderIcon} size={20} color={reminderColor} />
        </View>
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <View style={[styles.typeBadge, { backgroundColor: reminderColor + '20' }]}>
              <ThemedText style={[styles.typeText, { color: reminderColor }]}>
                {getReminderTypeLabel(item.reminderType)}
              </ThemedText>
            </View>
            <ThemedText style={[styles.countdown, { color: isPast ? theme.error : theme.success }]}>
              {formatScheduledTime(item.scheduledTime)}
            </ThemedText>
          </View>
          
          <ThemedText style={[styles.visitorName, { color: theme.text }]}>
            {item.visitorName}
          </ThemedText>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <DDIcon name="user" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.hostName}
              </ThemedText>
            </View>
            <View style={styles.detailItem}>
              <DDIcon name="calendar" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.visitDate} {formatTimeFromString(item.visitTime)}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.scheduledDate, { color: theme.textSecondary }]}>
            {formatDate(item.scheduledTime)}
          </ThemedText>
        </View>
      </ThemedView>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <DDIcon name="calendar" size={48} color={theme.textSecondary} />
      <Spacer height={Spacing.md} />
      <ThemedText style={[Typography.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('admin.noRemindersScheduled')}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center', marginTop: 4 }]}>
        {t('admin.noRemindersDescription')}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <DDIcon name="clock" size={24} color={theme.primary} />
          <ThemedText style={[styles.statValue, { color: theme.primary }]}>
            {upcomingCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t('admin.upcoming')}
          </ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <DDIcon name="zap" size={24} color={theme.warning} />
          <ThemedText style={[styles.statValue, { color: theme.warning }]}>
            {next24Hours}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t('admin.next24Hours')}
          </ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <DDIcon name="list" size={24} color={theme.info} />
          <ThemedText style={[styles.statValue, { color: theme.info }]}>
            {reminders.length}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t('admin.totalEvents')}
          </ThemedText>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: filter === item.key ? theme.primary : theme.surface,
                  borderColor: filter === item.key ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setFilter(item.key)}
            >
              <DDIcon 
                name={item.icon} 
                size={14} 
                color={filter === item.key ? theme.buttonText : theme.text} 
              />
              <ThemedText
                style={[
                  styles.filterText,
                  { color: filter === item.key ? theme.buttonText : theme.text },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={filteredReminders}
        keyExtractor={(item) => item.id}
        renderItem={renderReminderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <Spacer height={Spacing.sm} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  filterContainer: {
    paddingVertical: Spacing.md,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginEnd: Spacing.sm,
    gap: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  reminderCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: Spacing.md,
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  countdown: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  scheduledDate: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
});
