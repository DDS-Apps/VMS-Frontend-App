import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SearchInput } from "@/components/SearchInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { applyOpacity } from "@/utils/statusStyles";
import { useSecurityVisitorsQuery } from "@/hooks/queries/useSecurityQueries";
import type { SecurityVisitorDto } from "@/types";
import type { SecurityCheckInScreenProps } from "@/types/securityNavigation.types";

type SecurityVisitorStatus = 'expected' | 'checked_in' | 'checked_out' | 'cancelled';

interface SecurityVisitor {
  id: string;
  name: string;
  company: string;
  visitDate: string;
  visitTime: string;
  host: string;
  status: SecurityVisitorStatus;
  checkInTime?: string;
  checkOutTime?: string;
  parking: {
    hasParking: boolean;
    slotNumber?: string;
    location?: string;
    floor?: string;
  };
  valet: {
    hasValet: boolean;
    driverName?: string;
    status?: string;
  };
  meetingRoom?: {
    roomName: string;
    floor: string;
    timeSlot: string;
  };
}

const mapApiToSecurityVisitor = (dto: SecurityVisitorDto): SecurityVisitor => {
  const mapStatus = (status: string): SecurityVisitorStatus => {
    switch (status) {
      case 'checked_in':
      case 'on_site':
        return 'checked_in';
      case 'checked_out':
      case 'completed':
        return 'checked_out';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'expected';
    }
  };

  return {
    id: dto.id,
    name: dto.visitorName,
    company: dto.visitorCompany || '',
    visitDate: dto.scheduledDate,
    visitTime: dto.scheduledTime,
    host: dto.hostName,
    status: mapStatus(dto.status),
    checkInTime: dto.checkInTime,
    checkOutTime: dto.checkOutTime,
    parking: {
      hasParking: dto.parkingAssigned || false,
      slotNumber: dto.parkingSpot,
    },
    valet: {
      hasValet: dto.valetAssigned || false,
      driverName: dto.valetDriverName,
      status: dto.valetStatus,
    },
  };
};

type StatusFilter = 'all' | SecurityVisitorStatus;

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export default function SecurityCheckInScreen({ navigation }: SecurityCheckInScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const { formatTimeFromString } = useFormatters();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const queryParams = useMemo(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (dateRange.startDate && dateRange.endDate) {
      return {
        startDate: formatDate(dateRange.startDate),
        endDate: formatDate(dateRange.endDate),
        limit: 100,
      };
    }
    
    const dateStr = formatDate(selectedDate);
    return {
      startDate: dateStr,
      endDate: dateStr,
      limit: 100,
    };
  }, [selectedDate, dateRange]);

  const { data: apiResponse, isLoading, isError, refetch } = useSecurityVisitorsQuery(queryParams);

  const visitors = useMemo(() => {
    if (!apiResponse?.data) return [];
    return apiResponse.data.map(mapApiToSecurityVisitor);
  }, [apiResponse]);

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'expected', label: t('visitor.expectedVisitors').split(' ')[0] },
    { key: 'checked_in', label: t('status.checkedIn') },
    { key: 'checked_out', label: t('status.checkedOut') },
    { key: 'cancelled', label: t('status.cancelled') },
  ];

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
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

  const dateFilteredVisitors = visitors.filter(visitor => {
    return isDateInRange(visitor.visitDate);
  });

  const filteredVisitors = dateFilteredVisitors
    .filter(visitor =>
      visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.host.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(visitor => {
      if (statusFilter === 'all') return true;
      return visitor.status === statusFilter;
    })
    .sort((a, b) => {
      const statusOrder: Record<SecurityVisitorStatus, number> = { expected: 0, checked_in: 1, checked_out: 2, cancelled: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return parseTimeToMinutes(a.visitTime) - parseTimeToMinutes(b.visitTime);
    });

  const getStatusConfig = (status: SecurityVisitor['status']) => {
    switch (status) {
      case 'expected':
        return { 
          color: theme.warning, 
          bgColor: applyOpacity(theme.warning, '12'), 
          label: t('visitor.expectedVisitors').split(' ')[0],
          borderColor: theme.warning 
        };
      case 'checked_in':
        return { 
          color: theme.success, 
          bgColor: applyOpacity(theme.success, '12'), 
          label: t('status.checkedIn'),
          borderColor: theme.success 
        };
      case 'checked_out':
        return { 
          color: theme.textSecondary, 
          bgColor: applyOpacity(theme.textSecondary, '12'), 
          label: t('status.checkedOut'),
          borderColor: theme.textSecondary 
        };
      case 'cancelled':
        return { 
          color: theme.error, 
          bgColor: applyOpacity(theme.error, '12'), 
          label: t('status.cancelled'),
          borderColor: theme.error 
        };
    }
  };

  const formatDisplayDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateRange.startDate && dateRange.endDate) {
      const start = dateRange.startDate;
      const end = dateRange.endDate;
      if (start.toDateString() === end.toDateString()) {
        if (start.toDateString() === today.toDateString()) return t('time.today');
        return `${start.getDate()} ${t(`months.${getMonthKey(start.getMonth())}`).slice(0, 3)} ${start.getFullYear()}`;
      }
      return `${start.getDate()} - ${end.getDate()} ${t(`months.${getMonthKey(end.getMonth())}`).slice(0, 3)} ${end.getFullYear()}`;
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
    return `${selectedDate.getDate()} ${t(`months.${getMonthKey(selectedDate.getMonth())}`).slice(0, 3)} ${selectedDate.getFullYear()}`;
  };

  const getMonthKey = (monthIndex: number): string => {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    return months[monthIndex];
  };

  const getStatusCounts = (): Record<StatusFilter, number> => {
    return {
      all: dateFilteredVisitors.length,
      expected: dateFilteredVisitors.filter(v => v.status === 'expected').length,
      checked_in: dateFilteredVisitors.filter(v => v.status === 'checked_in').length,
      checked_out: dateFilteredVisitors.filter(v => v.status === 'checked_out').length,
      cancelled: dateFilteredVisitors.filter(v => v.status === 'cancelled').length,
    };
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
      case 'expected':
        return {
          bg: applyOpacity(theme.warning, '15'),
          text: theme.warning,
          countBg: applyOpacity(theme.warning, '25'),
          countText: theme.warning,
        };
      case 'checked_in':
        return {
          bg: applyOpacity(theme.success, '15'),
          text: theme.success,
          countBg: applyOpacity(theme.success, '25'),
          countText: theme.success,
        };
      case 'checked_out':
        return {
          bg: applyOpacity(theme.textSecondary, '15'),
          text: theme.textSecondary,
          countBg: applyOpacity(theme.textSecondary, '25'),
          countText: theme.textSecondary,
        };
      case 'cancelled':
        return {
          bg: applyOpacity(theme.error, '15'),
          text: theme.error,
          countBg: applyOpacity(theme.error, '25'),
          countText: theme.error,
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


  const renderVisitorCard = (visitor: SecurityVisitor) => {
    const statusConfig = getStatusConfig(visitor.status);
    
    return (
      <Pressable 
        key={visitor.id}
        onPress={() => navigation.navigate('SecurityVisitorDetail', { visitorId: visitor.id })}
      >
        <ThemedView 
          style={[
            styles.visitorCard, 
            { backgroundColor: theme.surface }
          ]}
        >
          <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.borderColor }]} />
          
          <View style={styles.cardContent}>
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.nameSection}>
                <ThemedText style={[Typography.body, { fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
                  {visitor.name}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {visitor.company}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </View>

            <View style={styles.cardDetails}>
              <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <DDIcon name="user" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('reception.hostName')}: {visitor.host}
                </ThemedText>
              </View>
              {visitor.meetingRoom ? (
                <View style={[styles.detailRow, { marginTop: Spacing.xs, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="home" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {visitor.meetingRoom.roomName} ({visitor.meetingRoom.floor})
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <View style={[styles.serviceBadgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {visitor.parking.hasParking ? (
                <View style={[styles.serviceBadge, { backgroundColor: applyOpacity(theme.primary, '12'), flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="map-pin" size={12} color={theme.primary} />
                  <ThemedText style={[styles.serviceBadgeText, { color: theme.primary }]}>
                    {visitor.parking.slotNumber}
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.serviceBadge, { backgroundColor: applyOpacity(theme.textSecondary, '12'), flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="x-circle" size={12} color={theme.textSecondary} />
                  <ThemedText style={[styles.serviceBadgeText, { color: theme.textSecondary }]}>
                    {t('security.noParking')}
                  </ThemedText>
                </View>
              )}
              {visitor.valet.hasValet ? (
                <View style={[styles.serviceBadge, { backgroundColor: applyOpacity(theme.accent, '12'), flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="truck" size={12} color={theme.accent} />
                  <ThemedText style={[styles.serviceBadgeText, { color: theme.accent }]}>
                    {t('security.valetService')}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <View style={[styles.timestampsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.timestampChip, { backgroundColor: applyOpacity(theme.primary, '10'), flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <DDIcon name="clock" size={12} color={theme.primary} />
                <ThemedText style={[styles.timestampText, { color: theme.primary }]}>
                  {formatTimeFromString(visitor.visitTime)}
                </ThemedText>
              </View>
              
              {visitor.checkInTime ? (
                <View style={[styles.timestampChip, { backgroundColor: applyOpacity(theme.success, '10'), flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="log-in" size={12} color={theme.success} />
                  <ThemedText style={[styles.timestampText, { color: theme.success }]}>
                    {t('actions.checkIn')}: {formatTimeFromString(visitor.checkInTime)}
                  </ThemedText>
                </View>
              ) : null}
              
              {visitor.checkOutTime ? (
                <View style={[styles.timestampChip, { backgroundColor: applyOpacity(theme.textSecondary, '10'), flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="log-out" size={12} color={theme.textSecondary} />
                  <ThemedText style={[styles.timestampText, { color: theme.textSecondary }]}>
                    {t('actions.checkOut')}: {formatTimeFromString(visitor.checkOutTime)}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </ThemedView>
      </Pressable>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingState}>
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
        <View style={styles.errorState}>
          <DDIcon name="alert-circle" size={48} color={theme.error} />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { color: theme.error, textAlign: 'center' }]}>
            {t('errors.failedToLoadData')}
          </ThemedText>
          <Spacer height={Spacing.lg} />
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={[Typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
              {t('common.retry')}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    if (filteredVisitors.length > 0) {
      return (
        <View style={styles.cardList}>
          {filteredVisitors.map(renderVisitorCard)}
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <DDIcon name="users" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.subtitle, { color: theme.textSecondary, textAlign: 'center', fontWeight: '500' }]}>
          {t('security.visitorNotFound')}
        </ThemedText>
        <Spacer height={4} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', opacity: 0.7 }]}>
          {searchQuery 
            ? t('common.noResults')
            : t('common.noData')
          }
        </ThemedText>
      </View>
    );
  };

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '600' }]}>
          {t('navigation.visitorVerification')}
        </ThemedText>
        
        <Spacer height={Spacing.sm} />
        
        <View style={[styles.dateDisplayRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ThemedText style={[Typography.bodySmall, { fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
            {formatDisplayDate()}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'left' : 'right' }]}>
            {filteredVisitors.length} {filteredVisitors.length === 1 ? t('roles.visitor').toLowerCase() : t('navigation.allVisitors').toLowerCase()}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <View style={[styles.searchBarWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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

        {renderContent()}
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
  visitorCard: {
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
  cardDetails: {
    marginTop: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  serviceBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  timestampsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  timestampChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
