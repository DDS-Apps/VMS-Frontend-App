import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
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
import { applyOpacity } from '@/utils/statusStyles';
import {
  getRequestsByDriverId,
  getCurrentDriver,
  driverRejectRequest,
  driverCompleteRequest,
  driverParkVehicle,
  driverMarkReadyForPickup,
  getAvailableParkingSlots,
  ValetRequest,
  ValetParkingSlot,
} from '@/services/state/valetAdminState';

type StatusFilter = 'all' | 'assigned' | 'parked' | 'ready_for_pickup' | 'completed' | 'cancelled';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DriverTasksScreenProps {
  onNavigateToDetail: (taskId: string) => void;
}

export default function DriverTasksScreen({ onNavigateToDetail }: DriverTasksScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<ValetRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [currentDriverInfo, setCurrentDriverInfo] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  const [showParkingModal, setShowParkingModal] = useState(false);
  const [selectedTaskForParking, setSelectedTaskForParking] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<ValetParkingSlot[]>([]);

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'assigned', label: t('status.assigned') },
    { key: 'parked', label: t('parking.parked') },
    { key: 'ready_for_pickup', label: t('valet.readyForPickup') },
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
    const driver = getCurrentDriver();
    setCurrentDriverInfo(driver);
    
    if (driver.id) {
      const driverTasks = getRequestsByDriverId(driver.id);
      setTasks(driverTasks);
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
      (task.vehicleInfo?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (task.vehicleInfo?.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
    .filter(task => {
      if (statusFilter === 'all') return true;
      return task.status === statusFilter;
    })
    .sort((a, b) => {
      const statusOrder = { assigned: 0, parked: 1, ready_for_pickup: 2, pending: 3, completed: 4, cancelled: 5 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return parseTimeToMinutes(a.pickupTime) - parseTimeToMinutes(b.pickupTime);
    });

  const getStatusConfig = (status: ValetRequest['status']) => {
    switch (status) {
      case 'pending':
        return { 
          color: theme.primary, 
          bgColor: applyOpacity(theme.primary, '12'), 
          label: t('status.pending'),
          borderColor: theme.primary 
        };
      case 'assigned':
        return { 
          color: theme.warning, 
          bgColor: applyOpacity(theme.warning, '12'), 
          label: t('status.assigned'),
          borderColor: theme.warning 
        };
      case 'parked':
        return { 
          color: theme.info, 
          bgColor: applyOpacity(theme.info, '12'), 
          label: t('parking.parked'),
          borderColor: theme.info 
        };
      case 'ready_for_pickup':
        return { 
          color: theme.success, 
          bgColor: applyOpacity(theme.success, '12'), 
          label: t('valet.readyForPickup'),
          borderColor: theme.success 
        };
      case 'completed':
        return { 
          color: theme.secondary, 
          bgColor: applyOpacity(theme.secondary, '12'), 
          label: t('status.completed'),
          borderColor: theme.secondary 
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

  const getActionButtons = (task: ValetRequest) => {
    switch (task.status) {
      case 'assigned':
        return [
          { 
            label: t('valet.parkVehicle'), 
            icon: 'navigation',
            color: theme.info,
            bgColor: applyOpacity(theme.info, '15'),
            action: () => handleOpenParkingModal(task.id)
          },
          { 
            label: t('actions.reject'), 
            icon: 'x-circle',
            color: theme.error,
            bgColor: applyOpacity(theme.error, '15'),
            action: () => handleReject(task.id)
          }
        ];
      case 'parked':
        return [
          { 
            label: t('valet.readyForPickup'), 
            icon: 'bell',
            color: theme.success,
            bgColor: applyOpacity(theme.success, '15'),
            action: () => handleReadyForPickup(task.id)
          }
        ];
      case 'ready_for_pickup':
        return [
          { 
            label: t('valet.returnVehicle'), 
            icon: 'check-circle',
            color: theme.success,
            bgColor: applyOpacity(theme.success, '15'),
            action: () => handleComplete(task.id)
          }
        ];
      default:
        return [];
    }
  };

  const handleOpenParkingModal = (taskId: string) => {
    const slots = getAvailableParkingSlots();
    setAvailableSlots(slots);
    setSelectedTaskForParking(taskId);
    setShowParkingModal(true);
  };

  const handleSelectSlot = (slot: ValetParkingSlot) => {
    if (selectedTaskForParking) {
      setUpdatingTaskId(selectedTaskForParking);
      setTimeout(() => {
        driverParkVehicle(selectedTaskForParking, slot.slotNumber);
        loadTasks();
        setUpdatingTaskId(null);
        setShowParkingModal(false);
        setSelectedTaskForParking(null);
      }, 300);
    }
  };

  const handleReadyForPickup = (taskId: string) => {
    setUpdatingTaskId(taskId);
    setTimeout(() => {
      driverMarkReadyForPickup(taskId);
      loadTasks();
      setUpdatingTaskId(null);
    }, 300);
  };

  const handleComplete = (taskId: string) => {
    setUpdatingTaskId(taskId);
    setTimeout(() => {
      driverCompleteRequest(taskId);
      loadTasks();
      setUpdatingTaskId(null);
    }, 300);
  };

  const handleReject = (taskId: string) => {
    setUpdatingTaskId(taskId);
    setTimeout(() => {
      driverRejectRequest(taskId);
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
      assigned: dateFilteredTasks.filter(t => t.status === 'assigned').length,
      parked: dateFilteredTasks.filter(t => t.status === 'parked').length,
      ready_for_pickup: dateFilteredTasks.filter(t => t.status === 'ready_for_pickup').length,
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
      case 'assigned':
        return {
          bg: applyOpacity(theme.warning, '15'),
          text: theme.warning,
          countBg: applyOpacity(theme.warning, '25'),
          countText: theme.warning,
        };
      case 'parked':
        return {
          bg: applyOpacity(theme.info, '15'),
          text: theme.info,
          countBg: applyOpacity(theme.info, '25'),
          countText: theme.info,
        };
      case 'ready_for_pickup':
        return {
          bg: applyOpacity(theme.success, '15'),
          text: theme.success,
          countBg: applyOpacity(theme.success, '25'),
          countText: theme.success,
        };
      case 'completed':
        return {
          bg: applyOpacity(theme.secondary, '15'),
          text: theme.secondary,
          countBg: applyOpacity(theme.secondary, '25'),
          countText: theme.secondary,
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

  const renderTaskCard = (task: ValetRequest) => {
    const statusConfig = getStatusConfig(task.status);
    const actionButtons = getActionButtons(task);
    const isUpdating = updatingTaskId === task.id;
    
    return (
      <Pressable 
        key={task.id}
        onPress={() => onNavigateToDetail(task.id)}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
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
              {task.vehicleInfo ? (
                <View style={styles.infoRow}>
                  <DDIcon name="truck" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                    {task.vehicleInfo.make} {task.vehicleInfo.model} - {task.vehicleInfo.color}
                  </ThemedText>
                </View>
              ) : null}

              {task.vehicleInfo?.plateNumber ? (
                <View style={styles.infoRow}>
                  <DDIcon name="hash" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                    {t('valet.plateNumber')}: {task.vehicleInfo.plateNumber}
                  </ThemedText>
                </View>
              ) : null}

              {task.parkingSlot ? (
                <View style={styles.infoRow}>
                  <DDIcon name="map-pin" size={14} variant="primary" />
                  <ThemedText style={[Typography.caption, { color: theme.primary, marginStart: 6, fontWeight: '500' }]}>
                    {t('parking.slot')}: {task.parkingSlot}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.infoRow}>
                <DDIcon name="clock" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {t('valet.pickupVehicle')}: {task.pickupTime}
                </ThemedText>
                <View style={styles.dotSeparator}>
                  <ThemedText style={{ color: theme.textSecondary }}>-</ThemedText>
                </View>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {t('valet.returnVehicle')}: {task.returnTime}
                </ThemedText>
              </View>

              <View style={styles.infoRow}>
                <DDIcon name="map-pin" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {task.location}
                </ThemedText>
              </View>
            </View>

            {actionButtons.length > 0 ? (
              <>
                <Spacer height={Spacing.md} />
                <View style={styles.actionButtonsRow}>
                  {actionButtons.map((btn, index) => (
                    <Pressable
                      key={index}
                      style={[
                        styles.actionButton,
                        { backgroundColor: btn.bgColor, flex: 1 },
                        index > 0 && { marginStart: Spacing.sm },
                        isUpdating && { opacity: 0.6 }
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        btn.action();
                      }}
                      disabled={isUpdating}
                    >
                      <DDIcon name={btn.icon as IconName} size={16} color={btn.color} />
                      <ThemedText style={[styles.actionButtonText, { color: btn.color }]}>
                        {isUpdating ? t('common.loading') : btn.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </ThemedView>
      </Pressable>
    );
  };

  const renderParkingModal = () => (
    <Modal
      visible={showParkingModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowParkingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
              {t('parking.assignSlot')}
            </ThemedText>
            <Pressable onPress={() => setShowParkingModal(false)} hitSlop={8}>
              <DDIcon name="x" size={24} variant="muted" />
            </Pressable>
          </View>

          <Spacer height={Spacing.lg} />

          {availableSlots.length > 0 ? (
            <ScrollView style={styles.slotsList}>
              {availableSlots.map((slot) => (
                <Pressable
                  key={slot.id}
                  style={[styles.slotCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handleSelectSlot(slot)}
                >
                  <View style={[styles.slotIcon, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                    <DDIcon name="check-circle" size={20} color={theme.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                      {slot.slotNumber}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                      {slot.zone}
                    </ThemedText>
                  </View>
                  <DDIcon name="chevron-right" size={20} variant="muted" />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptySlots}>
              <DDIcon name="alert-circle" size={48} variant="muted" />
              <Spacer height={Spacing.md} />
              <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
                {t('valet.noDriversAvailable')}
              </ThemedText>
            </View>
          )}
        </ThemedView>
      </View>
    </Modal>
  );

  if (!currentDriverInfo.id) {
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
          {t('valet.driver')}: {currentDriverInfo.name}
        </ThemedText>
        
        <Spacer height={Spacing.md} />
        
        <View style={styles.dateDisplayRow}>
          <ThemedText style={[Typography.bodySmall, { fontWeight: '600' }]}>
            {formatDisplayDate()}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {dateFilteredTasks.length} {dateFilteredTasks.length === 1 ? t('navigation.myTasks').split(' ')[1] : t('navigation.myTasks').split(' ')[1]}
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
        </ScrollView>

        <Spacer height={Spacing.xl} />

        {filteredTasks.length > 0 ? (
          <View style={styles.cardList}>
            {filteredTasks.map(renderTaskCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <DDIcon name="truck" size={48} variant="muted" />
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

      {renderParkingModal()}
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
    borderTopStartRadius: BorderRadius.lg,
    borderBottomStartRadius: BorderRadius.lg,
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
  actionButtonsRow: {
    flexDirection: 'row',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotsList: {
    flex: 1,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  slotIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlots: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
});
