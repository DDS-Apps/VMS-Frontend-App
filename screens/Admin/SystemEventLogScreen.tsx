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
import { VisitEventLog, getAllEventLogs } from "@/services/mock/visitorRequestState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatTimestamp as formatTimestampUtil } from "@/services/utils/dateTimeUtils";

type EventTypeFilter = 'all' | 'created' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled' | 'checked_in' | 'checked_out';

const getEventIcon = (eventType: VisitEventLog['eventType']): IconName => {
  switch (eventType) {
    case 'created':
      return 'plus-circle';
    case 'approved':
      return 'check-circle';
    case 'rejected':
      return 'x-circle';
    case 'rescheduled':
      return 'calendar';
    case 'cancelled':
      return 'slash';
    case 'visitor_accepted':
      return 'user-check';
    case 'visitor_rejected':
      return 'user-x';
    case 'checked_in':
      return 'log-in';
    case 'checked_out':
      return 'log-out';
    default:
      return 'activity';
  }
};

const getEventColor = (eventType: VisitEventLog['eventType'], theme: ReturnType<typeof useTheme>['theme']): string => {
  switch (eventType) {
    case 'created':
      return theme.info;
    case 'approved':
    case 'visitor_accepted':
    case 'checked_in':
      return theme.success;
    case 'rejected':
    case 'visitor_rejected':
    case 'cancelled':
      return theme.error;
    case 'rescheduled':
      return theme.warning;
    case 'checked_out':
      return theme.textSecondary;
    default:
      return theme.primary;
  }
};

export default function SystemEventLogScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<VisitEventLog[]>([]);
  const [filter, setFilter] = useState<EventTypeFilter>('all');

  useFocusEffect(
    useCallback(() => {
      const allEvents = getAllEventLogs();
      const sortedEvents = [...allEvents].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEvents(sortedEvents);
    }, [])
  );

  const filterOptions: { key: EventTypeFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'created', label: t('admin.eventCreated') },
    { key: 'approved', label: t('status.approved') },
    { key: 'rejected', label: t('status.rejected') },
    { key: 'cancelled', label: t('status.cancelled') },
    { key: 'checked_in', label: t('admin.eventCheckedIn') },
  ];

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.eventType === filter || 
        (filter === 'cancelled' && (e.eventType === 'cancelled' || e.eventType === 'visitor_rejected')) ||
        (filter === 'approved' && (e.eventType === 'approved' || e.eventType === 'visitor_accepted')));

  const formatTimestamp = (timestamp: string): string => {
    const result = formatTimestampUtil(timestamp, isRTL);
    
    if (result.diffMins < 1) return t('time.justNow');
    if (result.diffMins < 60) return t('time.minutesAgo', { count: result.diffMins });
    if (result.diffHours < 24) return t('time.hoursAgo', { count: result.diffHours });
    if (result.diffDays < 7) return t('time.daysAgo', { count: result.diffDays });
    return result.date;
  };

  const getRoleLabel = (role: VisitEventLog['performedByRole']): string => {
    const roleMap: Record<string, string> = {
      employee: t('roles.employee'),
      manager: t('roles.manager'),
      visitor: t('roles.visitor'),
      receptionist: t('roles.receptionist'),
      security: t('roles.security'),
      system: t('admin.system'),
    };
    return roleMap[role] || role;
  };

  const renderEventItem: ListRenderItem<VisitEventLog> = ({ item }) => {
    const eventColor = getEventColor(item.eventType, theme);
    const eventIcon = getEventIcon(item.eventType);

    return (
      <ThemedView style={[styles.eventCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.iconContainer, { backgroundColor: eventColor + '15' }]}>
          <DDIcon name={eventIcon} size={20} color={eventColor} />
        </View>
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <ThemedText style={[styles.eventType, { color: eventColor }]}>
              {t(`admin.event${item.eventType.charAt(0).toUpperCase() + item.eventType.slice(1).replace('_', '')}`)}
            </ThemedText>
            <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
              {formatTimestamp(item.timestamp)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.description, { color: theme.text }]} numberOfLines={2}>
            {item.description}
          </ThemedText>
          <View style={styles.metaRow}>
            <View style={[styles.roleBadge, { backgroundColor: theme.surfaceSecondary }]}>
              <DDIcon name="user" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.roleText, { color: theme.textSecondary }]}>
                {getRoleLabel(item.performedByRole)}
              </ThemedText>
            </View>
            <ThemedText style={[styles.requestId, { color: theme.textSecondary }]}>
              #{item.requestId.slice(-6)}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <DDIcon name="activity" size={48} color={theme.textSecondary} />
      <Spacer height={Spacing.md} />
      <ThemedText style={[Typography.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('admin.noEventsFound')}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center', marginTop: 4 }]}>
        {t('admin.noEventsDescription')}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          nestedScrollEnabled={true}
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

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.statValue, { color: theme.primary }]}>
            {events.length}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t('admin.totalEvents')}
          </ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.statValue, { color: theme.success }]}>
            {events.filter(e => e.eventType === 'approved' || e.eventType === 'visitor_accepted').length}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t('status.approved')}
          </ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.statValue, { color: theme.error }]}>
            {events.filter(e => e.eventType === 'rejected' || e.eventType === 'cancelled').length}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t('admin.cancelled')}
          </ThemedText>
        </View>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
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
  filterContainer: {
    paddingVertical: Spacing.md,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginEnd: Spacing.sm,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  eventCard: {
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
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 11,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  roleText: {
    fontSize: 11,
  },
  requestId: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
});
