import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { SearchInput } from '@/components/SearchInput';
import { DDIcon, IconName } from '@/components/DDIcon';
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { CalendarDatePicker } from '@/components/CalendarDatePicker';
import { Spacing, BorderRadius, Typography, FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormatters } from '@/hooks/useFormatters';
import { useLanguage } from '@/contexts/LanguageContext';
import { RTLHorizontalScrollView } from '@/components/shared';
import { applyOpacity } from '@/utils/statusStyles';
import { useMyBuffetTasksQuery, useUpdateBuffetTaskStatusMutation } from '@/hooks/queries/useBuffetQueries';
import type { BuffetStaffTaskDto, BuffetStaffTaskStatus } from '@/types/api.types';

type StatusFilter = 'all' | BuffetStaffTaskStatus;

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export default function BuffetBoardScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate: formatDateUtil } = useFormatters();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hasDateRange = dateRange.startDate && dateRange.endDate;

  const queryParams = {
    date: hasDateRange ? undefined : formatDateForApi(selectedDate),
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { 
    data: tasksResponse, 
    isLoading, 
    isError, 
    refetch,
    isRefetching 
  } = useMyBuffetTasksQuery(queryParams);

  const updateStatusMutation = useUpdateBuffetTaskStatusMutation();

  const allTasks: BuffetStaffTaskDto[] = tasksResponse || [];

  const isDateInRange = useCallback((visitDateStr: string) => {
    if (hasDateRange && dateRange.startDate && dateRange.endDate) {
      const startDateStr = formatDateForApi(dateRange.startDate);
      const endDateStr = formatDateForApi(dateRange.endDate);
      return visitDateStr >= startDateStr && visitDateStr <= endDateStr;
    }
    return visitDateStr === formatDateForApi(selectedDate);
  }, [hasDateRange, dateRange.startDate, dateRange.endDate, selectedDate]);

  const tasks = hasDateRange 
    ? allTasks.filter(task => isDateInRange(task.visitDate))
    : allTasks;

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'pending', label: t('status.pending') },
    { key: 'preparing', label: t('buffet.preparing') },
    { key: 'ready', label: t('buffet.ready') },
    { key: 'served', label: t('buffet.served') },
    { key: 'completed', label: t('status.completed') },
    { key: 'cancelled', label: t('status.cancelled') },
  ];

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  const filteredTasks = tasks
    .filter(task =>
      task.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const statusOrder: Record<BuffetStaffTaskStatus, number> = { 
        pending: 0, 
        preparing: 1, 
        ready: 2, 
        served: 3, 
        completed: 4, 
        cancelled: 5 
      };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      const dateA = new Date(a.visitDate + 'T' + (a.visitTime || '00:00')).getTime();
      const dateB = new Date(b.visitDate + 'T' + (b.visitTime || '00:00')).getTime();
      return dateB - dateA;
    });

  const getStatusConfig = (status: BuffetStaffTaskStatus) => {
    switch (status) {
      case 'pending':
        return { 
          color: theme.primary, 
          bgColor: applyOpacity(theme.primary, '12'), 
          label: t('status.pending'),
          borderColor: theme.primary 
        };
      case 'preparing':
        return { 
          color: theme.warning, 
          bgColor: applyOpacity(theme.warning, '12'), 
          label: t('buffet.preparing'),
          borderColor: theme.warning 
        };
      case 'ready':
        return { 
          color: '#10B981',
          bgColor: applyOpacity('#10B981', '12'), 
          label: t('buffet.ready'),
          borderColor: '#10B981'
        };
      case 'served':
        return { 
          color: theme.success, 
          bgColor: applyOpacity(theme.success, '12'), 
          label: t('buffet.served'),
          borderColor: theme.success 
        };
      case 'completed':
        return { 
          color: theme.success, 
          bgColor: applyOpacity(theme.success, '12'), 
          label: t('status.completed'),
          borderColor: theme.success 
        };
      case 'cancelled':
        return { 
          color: theme.textSecondary, 
          bgColor: applyOpacity(theme.textSecondary, '12'), 
          label: t('status.cancelled'),
          borderColor: theme.textSecondary 
        };
      default:
        return { 
          color: theme.textSecondary, 
          bgColor: applyOpacity(theme.textSecondary, '12'), 
          label: status,
          borderColor: theme.textSecondary 
        };
    }
  };

  const getNextStatus = (currentStatus: BuffetStaffTaskStatus): BuffetStaffTaskStatus | null => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'served';
      case 'served':
        return 'completed';
      default:
        return null;
    }
  };

  const getActionButtonConfig = (status: BuffetStaffTaskStatus) => {
    switch (status) {
      case 'pending':
        return { 
          label: t('buffet.startPreparing'), 
          icon: 'play',
          color: theme.warning,
          bgColor: applyOpacity(theme.warning, '15')
        };
      case 'preparing':
        return { 
          label: t('buffet.markReady'), 
          icon: 'check',
          color: '#10B981',
          bgColor: applyOpacity('#10B981', '15')
        };
      case 'ready':
        return { 
          label: t('buffet.markServed'), 
          icon: 'coffee',
          color: theme.success,
          bgColor: applyOpacity(theme.success, '15')
        };
      case 'served':
        return { 
          label: t('actions.markAsComplete'), 
          icon: 'check-circle',
          color: theme.success,
          bgColor: applyOpacity(theme.success, '15')
        };
      default:
        return null;
    }
  };

  const handleStatusUpdate = useCallback((taskId: string, newStatus: BuffetStaffTaskStatus) => {
    setUpdatingTaskId(taskId);
    updateStatusMutation.mutate(
      { 
        taskId, 
        data: { status: newStatus } 
      },
      {
        onSuccess: () => {
          setUpdatingTaskId(null);
          refetch();
        },
        onError: () => {
          setUpdatingTaskId(null);
        }
      }
    );
  }, [updateStatusMutation, refetch]);

  const formatDisplayDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const monthKeys = [
      'months.january', 'months.february', 'months.march', 'months.april',
      'months.may', 'months.june', 'months.july', 'months.august',
      'months.september', 'months.october', 'months.november', 'months.december'
    ];
    
    if (dateRange.startDate && dateRange.endDate) {
      const start = dateRange.startDate;
      const end = dateRange.endDate;
      if (start.toDateString() === end.toDateString()) {
        if (start.toDateString() === today.toDateString()) return t('time.today');
        return `${start.getDate()} ${t(monthKeys[start.getMonth()]).slice(0, 3)} ${start.getFullYear()}`;
      }
      return `${start.getDate()} - ${end.getDate()} ${t(monthKeys[end.getMonth()]).slice(0, 3)} ${end.getFullYear()}`;
    }
    
    if (selectedDate.toDateString() === today.toDateString()) {
      return t('time.today');
    }
    if (selectedDate.toDateString() === tomorrow.toDateString()) {
      return t('time.tomorrow');
    }
    if (selectedDate.toDateString() === yesterday.toDateString()) {
      return t('time.yesterday');
    }
    return `${selectedDate.getDate()} ${t(monthKeys[selectedDate.getMonth()]).slice(0, 3)} ${selectedDate.getFullYear()}`;
  };

  const getStatusCounts = () => {
    const counts: Record<StatusFilter, number> = {
      all: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      preparing: tasks.filter(t => t.status === 'preparing').length,
      ready: tasks.filter(t => t.status === 'ready').length,
      served: tasks.filter(t => t.status === 'served').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  const getFilterPillColors = (filterKey: StatusFilter, isActive: boolean) => {
    if (!isActive) {
      return {
        bg: theme.surfaceSecondary,
        text: theme.textSecondary,
        countBg: applyOpacity(theme.textSecondary, '15'),
        countText: theme.textSecondary,
      };
    }
    
    switch (filterKey) {
      case 'pending':
        return {
          bg: applyOpacity(theme.primary, '15'),
          text: theme.primary,
          countBg: applyOpacity(theme.primary, '25'),
          countText: theme.primary,
        };
      case 'preparing':
        return {
          bg: applyOpacity(theme.warning, '15'),
          text: theme.warning,
          countBg: applyOpacity(theme.warning, '25'),
          countText: theme.warning,
        };
      case 'ready':
        return {
          bg: applyOpacity('#10B981', '15'),
          text: '#10B981',
          countBg: applyOpacity('#10B981', '25'),
          countText: '#10B981',
        };
      case 'served':
      case 'completed':
        return {
          bg: applyOpacity(theme.success, '15'),
          text: theme.success,
          countBg: applyOpacity(theme.success, '25'),
          countText: theme.success,
        };
      case 'cancelled':
        return {
          bg: applyOpacity(theme.textSecondary, '15'),
          text: theme.textSecondary,
          countBg: applyOpacity(theme.textSecondary, '25'),
          countText: theme.textSecondary,
        };
      default:
        return {
          bg: applyOpacity(theme.primary, '15'),
          text: theme.primary,
          countBg: applyOpacity(theme.primary, '25'),
          countText: theme.primary,
        };
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setDateRange({ startDate: null, endDate: null });
  };

  const handleRangeSelect = (range: DateRange) => {
    setDateRange(range);
    if (range.startDate) {
      setSelectedDate(range.startDate);
    }
  };

  const renderTaskCard = (task: BuffetStaffTaskDto) => {
    const statusConfig = getStatusConfig(task.status);
    const actionConfig = getActionButtonConfig(task.status);
    const nextStatus = getNextStatus(task.status);
    const isUpdating = updatingTaskId === task.id;
    
    return (
      <View key={task.id}>
        <ThemedView 
          style={[
            styles.taskCard, 
            { backgroundColor: theme.surface }
          ]}
        >
          <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.borderColor }]} />
          
          <View style={styles.cardContent}>
            <DirectionalRow style={styles.cardHeader}>
              <View style={styles.nameSection}>
                <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                  {task.visitorName}
                </ThemedText>
                {task.company ? (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {task.company}
                  </ThemedText>
                ) : null}
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {t('reception.hostName')}: {task.hostName}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </DirectionalRow>

            <Spacer height={Spacing.md} />

            <View style={styles.infoGrid}>
              <DirectionalRow style={styles.infoRow}>
                <DDIcon name="users" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {task.guestCount} {t('buffet.guestCount').toLowerCase()}
                </ThemedText>
              </DirectionalRow>

              <DirectionalRow style={styles.infoRow}>
                <DDIcon name="calendar" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {formatDateUtil(task.visitDate, 'short')}
                </ThemedText>
                <View style={styles.dotSeparator}>
                  <ThemedText style={{ color: theme.textSecondary }}>-</ThemedText>
                </View>
                <DDIcon name="clock" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4 }]}>
                  {task.visitTime}
                </ThemedText>
              </DirectionalRow>

              <DirectionalRow style={styles.infoRow}>
                <DDIcon name="map-pin" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {task.location}
                </ThemedText>
              </DirectionalRow>

              {task.mealType ? (
                <DirectionalRow style={styles.infoRow}>
                  <DDIcon name="coffee" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                    {task.mealType.charAt(0).toUpperCase() + task.mealType.slice(1)}
                  </ThemedText>
                </DirectionalRow>
              ) : null}

              {task.dietaryRequirements && task.dietaryRequirements.length > 0 ? (
                <DirectionalRow style={styles.infoRow}>
                  <DDIcon name="alert-circle" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { color: theme.warning, marginStart: 6 }]}>
                    {task.dietaryRequirements.join(', ')}
                  </ThemedText>
                </DirectionalRow>
              ) : null}

              {task.notes ? (
                <DirectionalRow style={styles.infoRow}>
                  <DDIcon name="file-text" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                    {task.notes}
                  </ThemedText>
                </DirectionalRow>
              ) : null}
            </View>

            {actionConfig && nextStatus ? (
              <>
                <Spacer height={Spacing.md} />
                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: actionConfig.bgColor },
                    isUpdating && { opacity: 0.6 }
                  ]}
                  onPress={() => handleStatusUpdate(task.id, nextStatus)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={actionConfig.color} />
                  ) : (
                    <DDIcon name={actionConfig.icon as IconName} size={16} color={actionConfig.color} />
                  )}
                  <ThemedText style={[styles.actionButtonText, { color: actionConfig.color }]}>
                    {isUpdating ? t('common.loading') : actionConfig.label}
                  </ThemedText>
                </Pressable>
              </>
            ) : null}
          </View>
        </ThemedView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
          {t('common.loading')}
        </ThemedText>
      </View>
    );
  }

  if (isError) {
    return (
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <View style={styles.emptyState}>
          <DDIcon name="alert-circle" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.subtitle, { color: theme.textSecondary, textAlign: 'center', fontWeight: '500' }]}>
            {t('errors.generic')}
          </ThemedText>
          <Spacer height={Spacing.md} />
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={[styles.retryButtonText, { color: '#FFFFFF' }]}>
              {t('common.retry')}
            </ThemedText>
          </Pressable>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <>
      <ScreenScrollView 
        contentContainerStyle={scrollContentStyle}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '600' }]}>
          {t('navigation.myTasks')}
        </ThemedText>
        
        <Spacer height={Spacing.md} />
        
        <DirectionalRow style={styles.dateDisplayRow}>
          <ThemedText style={[Typography.bodySmall, { fontWeight: '600' }]}>
            {formatDisplayDate()}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {tasks.length} {t('navigation.myTasks').toLowerCase()}
          </ThemedText>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.searchBarWrapper}>
          <SearchInput
            placeholder={t('common.search')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            showClearButton={false}
            containerStyle={styles.searchInputFlex}
          />
          <Pressable 
            style={[styles.calendarIconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setShowDatePicker(true)}
            hitSlop={8}
          >
            <DDIcon name="calendar" size={20} color={theme.primary} />
          </Pressable>
        </DirectionalRow>

        <Spacer height={Spacing.lg} />

        <RTLHorizontalScrollView
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          nestedScrollEnabled={true}
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = statusFilter === option.key;
            const count = statusCounts[option.key];
            const colors = getFilterPillColors(option.key, isActive);
            
            return (
              <Pressable
                key={option.key}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.bg }
                ]}
                onPress={() => setStatusFilter(option.key)}
              >
                <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                  {option.label}
                </ThemedText>
                <View style={[styles.filterCount, { backgroundColor: colors.countBg }]}>
                  <ThemedText style={[styles.filterCountText, { color: colors.countText }]}>
                    {count}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </RTLHorizontalScrollView>

        <Spacer height={Spacing.xl} />

        {filteredTasks.length > 0 ? (
          <View style={styles.cardList}>
            {filteredTasks.map(renderTaskCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <DDIcon name="cloche" size={48} variant="muted" />
            <Spacer height={Spacing.md} />
            <ThemedText style={[Typography.subtitle, { color: theme.textSecondary, textAlign: 'center', fontWeight: '500' }]}>
              {t('common.noResults')}
            </ThemedText>
            <Spacer height={4} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', opacity: 0.7 }]}>
              {searchQuery 
                ? t('common.noResults')
                : t('common.noData')
              }
            </ThemedText>
          </View>
        )}
      </ScreenScrollView>

      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        dateRange={dateRange}
        onDateSelect={handleDateSelect}
        onRangeSelect={handleRangeSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInputFlex: {
    flex: 1,
  },
  calendarIconButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingEnd: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FontFamily.latinMedium,
  },
  filterCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 22,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FontFamily.latinSemiBold,
  },
  cardList: {
    gap: Spacing.md,
  },
  taskCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  statusBorderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    padding: Spacing.lg,
    paddingStart: Spacing.lg + 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameSection: {
    flex: 1,
    marginEnd: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FontFamily.latinSemiBold,
  },
  infoGrid: {
    gap: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotSeparator: {
    marginHorizontal: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FontFamily.latinSemiBold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FontFamily.latinSemiBold,
  },
});
