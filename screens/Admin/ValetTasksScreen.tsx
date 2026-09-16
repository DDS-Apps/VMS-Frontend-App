import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenFlatList } from '@/components/ScreenFlatList';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { getValetTasks, ValetTask } from '@/services/state/valetTasksState';
import type { ValetService } from '@/types/vms.types';
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { RTLHorizontalScrollView, FilterChip } from '@/components/shared';
import { applyOpacity } from '@/utils/statusStyles';
import { RequestStatusBadge } from '@/components/shared/RequestStatusBadge';
import { useUpcomingIndicator } from '@/hooks/useUpcomingVisitTimer';
import { UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES, isUpcomingIndicatorEligibleStatus } from '@/constants/requestConstants';
import { resolveParkingDisplayDecision } from '@/utils/parkingDecision';

interface ValetTasksScreenProps {
  onNavigateToDetail: (taskId: string) => void;
}

const normalizeValetStatusForEligibility = (status: ValetService['status']): string =>
  status === 'assigned' ? 'pending' : status;

const ValetTaskUpcomingAlertIcon = React.memo(({ visitDate, pickupTime, valetStatus, visitStartAt }: { visitDate: string; pickupTime: string; valetStatus: ValetService['status']; visitStartAt?: string }) => {
  const { theme } = useTheme();
  const eligible = isUpcomingIndicatorEligibleStatus(normalizeValetStatusForEligibility(valetStatus));
  const isUpcoming = useUpcomingIndicator({
    visitDate,
    visitTime: pickupTime,
    visitStartAt,
    eligible,
    thresholdMinutes: UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES,
  });
  if (!isUpcoming) return null;
  return (
    <View
      accessibilityLabel="Visit starts soon"
      accessibilityRole="image"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: applyOpacity(theme.error, '15'),
        borderWidth: 1,
        borderColor: theme.error,
        borderRadius: 100,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginEnd: 6,
      }}
    >
      <DDIcon name="alert-circle" size={12} color={theme.error} />
      <ThemedText style={{ color: theme.error, fontSize: 11, fontWeight: '700', lineHeight: 16 }}>
        Upcoming
      </ThemedText>
    </View>
  );
});

export default function ValetTasksScreen({ onNavigateToDetail }: ValetTasksScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<ValetTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  useFocusEffect(
    React.useCallback(() => {
      setTasks(getValetTasks());
    }, [])
  );

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.valet.status === 'pending';
    if (filter === 'in_progress')
      return task.valet.status === 'in_progress' || task.valet.status === 'assigned';
    if (filter === 'completed') return task.valet.status === 'completed';
    return true;
  });

  const renderTaskCard = ({ item }: { item: ValetTask }) => (
    <Pressable
      onPress={() => onNavigateToDetail(item.id)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <ThemedView style={[styles.taskCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <DirectionalRow style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.xs }]}>
              {item.visitorName}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
              {item.visitorCompany}
            </ThemedText>
          </View>
          <DirectionalRow alignItems="center" gap={Spacing.xs}>
            <ValetTaskUpcomingAlertIcon
              visitDate={item.visitDate}
              pickupTime={item.pickupTime}
              valetStatus={item.valet.status}
              visitStartAt={item.visitStartAt}
            />
            <RequestStatusBadge status={item.valet.status} />
          </DirectionalRow>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.infoRow}>
          <DDIcon name="user" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginEnd: Spacing.sm }]}>
            {t('reception.hostName')}: {item.hostName}
          </ThemedText>
        </DirectionalRow>

        <Spacer height={Spacing.sm} />

        <DirectionalRow style={styles.infoRow}>
          <DDIcon name="calendar" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginEnd: Spacing.sm }]}>
            {item.visitDate} • {item.pickupTime} - {item.returnTime}
          </ThemedText>
        </DirectionalRow>

        <Spacer height={Spacing.sm} />

        <DirectionalRow style={styles.infoRow}>
          <DDIcon name="map-pin" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginEnd: Spacing.sm }]}>
            {item.location}
          </ThemedText>
        </DirectionalRow>

        <Spacer height={Spacing.md} />
        {resolveParkingDisplayDecision({
          hasParkingAllocation: Boolean(item.vehicleInfo),
        }) === 'required' ? (
          <DirectionalRow style={styles.infoRow}>
            <DDIcon name="map-pin" size={16} variant="primary" />
          </DirectionalRow>
        ) : null}
      </ThemedView>
    </Pressable>
  );

  const pendingCount = tasks.filter((t) => t.valet.status === 'pending').length;
  const inProgressCount = tasks.filter(
    (t) => t.valet.status === 'in_progress' || t.valet.status === 'assigned'
  ).length;
  const completedCount = tasks.filter((t) => t.valet.status === 'completed').length;

  const renderHeader = () => (
    <>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText style={[Typography.title, { fontWeight: '700', fontSize: 28 }]}>{t('valet.assignedTasks')}</ThemedText>
        <ThemedText style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
          {filteredTasks.length} {t('valet.assignedTasks').toLowerCase()}
        </ThemedText>
      </View>

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        nestedScrollEnabled={true}
      >
        <FilterChip label={t('common.all')} count={tasks.length} isSelected={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label={t('status.pending')} count={pendingCount} isSelected={filter === 'pending'} onPress={() => setFilter('pending')} />
        <FilterChip label={t('status.inProgress')} count={inProgressCount} isSelected={filter === 'in_progress'} onPress={() => setFilter('in_progress')} />
        <FilterChip label={t('status.completed')} count={completedCount} isSelected={filter === 'completed'} onPress={() => setFilter('completed')} />
      </RTLHorizontalScrollView>
    </>
  );

  return (
    <ScreenFlatList
      data={filteredTasks}
      renderItem={renderTaskCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ 
        paddingHorizontal: Spacing.xl,
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl
      }}
      ListHeaderComponent={renderHeader()}
      ListFooterComponent={() => <View style={{ height: 100 }} />}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <DDIcon name="inbox" size={48} variant="muted" />
          <Spacer height={Spacing.lg} />
          <ThemedText style={[Typography.subtitle, { color: theme.textSecondary }]}>
            {t('common.noResults')}
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  filterContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  taskCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoRow: {
    alignItems: 'center',
  },
  driverInfo: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  noDiverInfo: {
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
});
