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
import { getPlatformFlexDirection } from '@/utils/rtlInitializer';

interface ValetTasksScreenProps {
  onNavigateToDetail: (taskId: string) => void;
}

interface StatusBadgeProps {
  status: ValetService['status'];
  theme: ReturnType<typeof useTheme>['theme'];
  t: (key: string) => string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, theme, t }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return { label: t('status.pending').toUpperCase(), color: theme.warning, bgColor: `${theme.warning}15` };
      case 'assigned':
        return { label: t('status.scheduled').toUpperCase(), color: theme.info, bgColor: `${theme.info}15` };
      case 'in_progress':
        return { label: t('status.inProgress').toUpperCase(), color: theme.primary, bgColor: `${theme.primary}15` };
      case 'completed':
        return { label: t('status.completed').toUpperCase(), color: theme.success, bgColor: `${theme.success}15` };
      default:
        return { label: status.toUpperCase(), color: theme.textSecondary, bgColor: `${theme.textSecondary}15` };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: config.bgColor, borderColor: config.color },
      ]}
    >
      <ThemedText
        style={[
          Typography.caption,
          {
            color: config.color,
            fontWeight: '600',
            fontSize: 11,
          },
        ]}
      >
        {config.label}
      </ThemedText>
    </View>
  );
};

export default function ValetTasksScreen({ onNavigateToDetail }: ValetTasksScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
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
        <View style={[styles.cardHeader, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
              {item.visitorName}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {item.visitorCompany}
            </ThemedText>
          </View>
          <StatusBadge status={item.valet.status} theme={theme} t={t} />
        </View>

        <Spacer height={Spacing.md} />

        <View style={[styles.infoRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <DDIcon name="user" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginStart: Spacing.sm, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('reception.hostName')}: {item.hostName}
          </ThemedText>
        </View>

        <Spacer height={Spacing.sm} />

        <View style={[styles.infoRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <DDIcon name="calendar" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginStart: Spacing.sm, textAlign: isRTL ? 'right' : 'left' }]}>
            {item.visitDate} • {item.pickupTime} - {item.returnTime}
          </ThemedText>
        </View>

        <Spacer height={Spacing.sm} />

        <View style={[styles.infoRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <DDIcon name="map-pin" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginStart: Spacing.sm, textAlign: isRTL ? 'right' : 'left' }]}>
            {item.location}
          </ThemedText>
        </View>

        {item.valet.driver ? (
          <>
            <Spacer height={Spacing.md} />
            <View
              style={[
                styles.driverInfo,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={[styles.infoRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
                <DDIcon name="truck" size={16} variant="primary" />
                <ThemedText
                  style={[Typography.body, { fontWeight: '600', marginStart: Spacing.sm, textAlign: isRTL ? 'right' : 'left' }]}
                >
                  {item.valet.driver.name}
                </ThemedText>
              </View>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
                {item.valet.driver.phone}
              </ThemedText>
            </View>
          </>
        ) : (
          <>
            <Spacer height={Spacing.md} />
            <View
              style={[
                styles.noDiverInfo,
                { backgroundColor: `${theme.warning}10`, borderColor: theme.warning, flexDirection: getPlatformFlexDirection(isRTL) },
              ]}
            >
              <DDIcon name="alert-circle" size={16} variant="warning" />
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.warning, marginStart: Spacing.sm, fontWeight: '600', textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('actions.assignDriver')}
              </ThemedText>
            </View>
          </>
        )}

        {item.vehicleInfo ? (
          <>
            <Spacer height={Spacing.sm} />
            <View style={[styles.infoRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
              <DDIcon name="truck" size={16} variant="muted" />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: Spacing.sm, textAlign: isRTL ? 'right' : 'left' }]}>
                {item.vehicleInfo.color} {item.vehicleInfo.make} {item.vehicleInfo.model} • {item.vehicleInfo.plateNumber}
              </ThemedText>
            </View>
          </>
        ) : null}
      </ThemedView>
    </Pressable>
  );

  const renderFilterButton = (
    filterValue: typeof filter,
    label: string,
    count: number
  ) => {
    const isActive = filter === filterValue;
    return (
      <Pressable
        onPress={() => setFilter(filterValue)}
        style={({ pressed }) => [
          styles.filterButton,
          {
            backgroundColor: isActive ? theme.primary : theme.surface,
            borderColor: isActive ? theme.primary : theme.border,
            opacity: pressed ? 0.7 : 1,
            flexDirection: getPlatformFlexDirection(isRTL),
          },
        ]}
      >
        <ThemedText
          style={[
            Typography.body,
            {
              color: isActive ? theme.buttonText : theme.text,
              fontWeight: isActive ? '600' : '400',
            },
          ]}
        >
          {label}
        </ThemedText>
        <ThemedText
          style={[
            Typography.caption,
            {
              color: isActive ? theme.buttonText : theme.textSecondary,
              marginStart: Spacing.xs,
              fontWeight: '600',
            },
          ]}
        >
          {count}
        </ThemedText>
      </Pressable>
    );
  };

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

      <View style={[styles.filterContainer, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
        {renderFilterButton('all', t('common.all'), tasks.length)}
        {renderFilterButton('pending', t('status.pending'), pendingCount)}
        {renderFilterButton('in_progress', t('status.inProgress'), inProgressCount)}
        {renderFilterButton('completed', t('status.completed'), completedCount)}
      </View>
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
      ListHeaderComponent={renderHeader}
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
  },
  filterButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
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
