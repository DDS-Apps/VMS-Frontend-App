import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { SearchInput } from '@/components/SearchInput';
import { DDIcon, IconName } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { CalendarDatePicker } from '@/components/CalendarDatePicker';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormatters } from '@/hooks/useFormatters';
import { applyOpacity } from '@/utils/statusStyles';
import {
  getRequestsByStaffId,
  updateBuffetRequestStatus,
  getCurrentStaff,
  BuffetRequest,
} from '@/services/mock/buffetAdminState';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export default function BuffetBoardScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<BuffetRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [currentStaffInfo, setCurrentStaffInfo] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'pending', label: t('status.pending') },
    { key: 'in_progress', label: t('status.inProgress') },
    { key: 'completed', label: t('status.completed') },
    { key: 'cancelled', label: t('status.cancelled') },
  ];

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
  };

  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, [])
  );

  const loadTasks = () => {
    const staff = getCurrentStaff();
    setCurrentStaffInfo(staff);
    
    if (staff.id) {
      const staffTasks = getRequestsByStaffId(staff.id);
      setTasks(staffTasks);
    } else {
      setTasks([]);
    }
  };

  const formatDateForFilter = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const isDateInRange = (visitDateStr: string) => {
    if (dateRange.startDate && dateRange.endDate) {
      const startDateStr = formatDateForFilter(dateRange.startDate);
      const endDateStr = formatDateForFilter(dateRange.endDate);
      return visitDateStr >= startDateStr && visitDateStr <= endDateStr;
    }
    return visitDateStr === formatDateForFilter(selectedDate);
  };

  const dateFilteredTasks = tasks.filter(task => {
    return isDateInRange(task.visitDate);
  });

  const filteredTasks = dateFilteredTasks
    .filter(task =>
      task.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(task => {
      if (statusFilter === 'all') return true;
      return task.status === statusFilter;
    })
    .sort((a, b) => {
      const statusOrder = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return parseTimeToMinutes(a.timeSlot) - parseTimeToMinutes(b.timeSlot);
    });

  const getStatusConfig = (status: BuffetRequest['status']) => {
    switch (status) {
      case 'pending':
        return { 
          color: theme.primary, 
          bgColor: applyOpacity(theme.primary, '12'), 
          label: t('status.pending'),
          borderColor: theme.primary 
        };
      case 'in_progress':
        return { 
          color: theme.warning, 
          bgColor: applyOpacity(theme.warning, '12'), 
          label: t('status.inProgress'),
          borderColor: theme.warning 
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

  const getNextStatus = (currentStatus: BuffetRequest['status']): BuffetRequest['status'] | null => {
    switch (currentStatus) {
      case 'pending':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      default:
        return null;
    }
  };

  const getActionButtonConfig = (status: BuffetRequest['status']) => {
    switch (status) {
      case 'pending':
        return { 
          label: t('actions.startTask'), 
          icon: 'play',
          color: theme.warning,
          bgColor: applyOpacity(theme.warning, '15')
        };
      case 'in_progress':
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

  const handleStatusUpdate = (taskId: string, newStatus: BuffetRequest['status']) => {
    setUpdatingTaskId(taskId);
    setTimeout(() => {
      updateBuffetRequestStatus(taskId, newStatus);
      loadTasks();
      setUpdatingTaskId(null);
    }, 300);
  };

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
      all: dateFilteredTasks.length,
      pending: dateFilteredTasks.filter(t => t.status === 'pending').length,
      in_progress: dateFilteredTasks.filter(t => t.status === 'in_progress').length,
      completed: dateFilteredTasks.filter(t => t.status === 'completed').length,
      cancelled: dateFilteredTasks.filter(t => t.status === 'cancelled').length,
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
      case 'in_progress':
        return {
          bg: applyOpacity(theme.warning, '15'),
          text: theme.warning,
          countBg: applyOpacity(theme.warning, '25'),
          countText: theme.warning,
        };
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

  const renderTaskCard = (task: BuffetRequest) => {
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
            <View style={styles.cardHeader}>
              <View style={styles.nameSection}>
                <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                  {task.visitorName}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {t('reception.hostName')}: {task.hostName}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </View>

            <Spacer height={Spacing.md} />

            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <DDIcon name="users" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {task.guestCount} {t('buffet.guestCount').toLowerCase()}
                </ThemedText>
              </View>

              <View style={styles.infoRow}>
                <DDIcon name="calendar" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {formatDate(task.visitDate, 'short')}
                </ThemedText>
                <View style={styles.dotSeparator}>
                  <ThemedText style={{ color: theme.textSecondary }}>-</ThemedText>
                </View>
                <DDIcon name="clock" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4 }]}>
                  {task.timeSlot}
                </ThemedText>
              </View>

              <View style={styles.infoRow}>
                <DDIcon name="map-pin" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {task.location}
                </ThemedText>
              </View>
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
                  <DDIcon name={actionConfig.icon as IconName} size={16} color={actionConfig.color} />
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

  if (!currentStaffInfo.id) {
    return (
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <View style={styles.emptyState}>
          <DDIcon name="alert-circle" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.subtitle, { color: theme.textSecondary, textAlign: 'center', fontWeight: '500' }]}>
            {t('auth.login')}
          </ThemedText>
          <Spacer height={4} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', opacity: 0.7 }]}>
            {t('errors.unauthorized')}
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '600' }]}>
          {t('navigation.myTasks')}
        </ThemedText>
        
        <Spacer height={Spacing.xs} />
        
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
          {t('roles.buffetStaff')}: {currentStaffInfo.name}
        </ThemedText>
        
        <Spacer height={Spacing.md} />
        
        <View style={styles.dateDisplayRow}>
          <ThemedText style={[Typography.bodySmall, { fontWeight: '600' }]}>
            {formatDisplayDate()}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {dateFilteredTasks.length} {t('navigation.myTasks').toLowerCase()}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.searchBarWrapper}>
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
        </View>

        <Spacer height={Spacing.lg} />

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
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
        </ScrollView>

        <Spacer height={Spacing.xl} />

        {filteredTasks.length > 0 ? (
          <View style={styles.cardList}>
            {filteredTasks.map(renderTaskCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <DDIcon name="coffee" size={48} variant="muted" />
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
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
});
