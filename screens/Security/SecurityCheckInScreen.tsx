import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from "@/constants";
import { DDIcon } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SearchInput } from "@/components/SearchInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { Spacing, BorderRadius, Typography, FontFamily } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { applyOpacity, getStatusConfig } from "@/utils/statusStyles";
import { useSecurityVisitorsQuery } from "@/hooks/queries/useSecurityQueries";
import type { SecurityVisitorDto } from "@/types";
import type { SecurityCheckInScreenProps } from "@/types/securityNavigation.types";
import type { Theme } from "@/types/theme.types";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  avatarSize: 44,
};

const VisitorAvatar = ({ name, theme, size = 44 }: { name: string; theme: Theme; size?: number }) => {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    <View style={[
      styles.avatar, 
      { 
        backgroundColor: applyOpacity(theme.primary, '15'),
        width: size,
        height: size,
        borderRadius: LAYOUT.cardRadius - 2,
      }
    ]}>
      <ThemedText style={[styles.avatarText, { color: theme.primary, fontSize: size * 0.36 }]}>
        {initials}
      </ThemedText>
    </View>
  );
};

type SecurityVisitorStatus = 'expected' | 'checked_in' | 'checked_out' | 'cancelled';

interface SecurityVisitor {
  id: string;
  name: string;
  company: string;
  visitDate: string;
  visitTime: string;
  endTime?: string;
  duration?: string;
  host: string;
  status: SecurityVisitorStatus;
  originalStatus: string;
  checkInTime?: string;
  checkOutTime?: string;
  parking: {
    hasParking: boolean;
    slotNumber?: string;
    location?: string;
    floor?: string;
    isVisitorNeedsParking?: boolean;
    visitorNeedsParking?: boolean;
    licensePlate?: string | null;
    carModel?: string | null;
    carColor?: string | null;
  };
  valet: {
    hasValet: boolean;
    driverName?: string;
    status?: string;
  };
  isBuffet?: boolean;
  isMeetingRoom?: boolean;
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
      case 'auto_cancelled':
      case 'rejected':
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
    endTime: dto.endTime,
    duration: dto.duration,
    host: dto.hostName,
    status: mapStatus(dto.status),
    originalStatus: dto.status,
    checkInTime: dto.checkInTime,
    checkOutTime: dto.checkOutTime,
    parking: {
      hasParking: dto.parkingAssigned || false,
      slotNumber: dto.parkingSpot,
      isVisitorNeedsParking: dto.isVisitorNeedsParking,
      visitorNeedsParking: dto.visitorNeedsParking,
      licensePlate: dto.licensePlate,
      carModel: dto.carModel,
      carColor: dto.carColor,
    },
    valet: {
      hasValet: dto.valetAssigned || false,
      driverName: dto.valetDriverName,
      status: dto.valetStatus,
    },
    isBuffet: dto.isBuffet,
    isMeetingRoom: dto.isMeetingRoom,
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
  const { formatDate, formatTimeFromString } = useFormatters();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth > 1024 ? 3 : screenWidth >= 768 ? 2 : 1;

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
      // First sort by visitDate descending (latest first)
      if (a.visitDate !== b.visitDate) {
        return b.visitDate.localeCompare(a.visitDate);
      }
      // Then by status order
      const statusOrder: Record<SecurityVisitorStatus, number> = { expected: 0, checked_in: 1, checked_out: 2, cancelled: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Then by time descending (latest first)
      return parseTimeToMinutes(b.visitTime) - parseTimeToMinutes(a.visitTime);
    });

  
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


  // Calculate duration from visitTime and endTime (fallback when API doesn't provide duration)
  const calculateDuration = (startTime: string, endTime?: string, apiDuration?: string): string => {
    // Prefer API-provided duration if available
    if (apiDuration) return apiDuration;
    if (!endTime) return '1 hour';
    
    const parseTime = (timeStr: string): number => {
      // Support both 12h (AM/PM) and 24h formats
      const match12h = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      const match24h = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      
      if (match12h) {
        let hours = parseInt(match12h[1], 10);
        const minutes = parseInt(match12h[2], 10);
        const period = match12h[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      
      if (match24h) {
        const hours = parseInt(match24h[1], 10);
        const minutes = parseInt(match24h[2], 10);
        return hours * 60 + minutes;
      }
      
      return 0;
    };
    
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    let diffMinutes = endMinutes - startMinutes;
    
    // Handle overnight visits
    if (diffMinutes <= 0) diffMinutes += 24 * 60;
    
    if (diffMinutes < 60) return `${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const renderVisitorCard = (visitor: SecurityVisitor, isGridMode: boolean = false) => {
    const statusConfig = getStatusConfig(theme, visitor.originalStatus, t);
    const hasParking = visitor.parking.isVisitorNeedsParking === true || visitor.parking.visitorNeedsParking === true || visitor.parking.hasParking;
    const duration = calculateDuration(visitor.visitTime, visitor.endTime, visitor.duration);
    
    return (
      <Pressable 
        key={visitor.id}
        onPress={() => navigation.navigate(ROUTES.SECURITY_VISITOR_DETAIL as never, { visitorId: visitor.id } as never)}
        style={isGridMode ? { flex: 1 } : undefined}
      >
        <ThemedView 
          style={[
            styles.visitorCard, 
            { backgroundColor: theme.surface }
          ]}
        >
          <View style={[styles.cardAccent, { backgroundColor: statusConfig.text }]} />
          
          <View style={styles.cardMainSection}>
            <DirectionalRow style={styles.cardHeaderRow}>
              <VisitorAvatar name={visitor.name} theme={theme} size={LAYOUT.avatarSize} />
              
              <View style={[styles.cardNameSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 16 }]}>
                  {visitor.name}
                </ThemedText>
                {visitor.company ? (
                  <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
                    {visitor.company}
                  </ThemedText>
                ) : null}
              </View>

              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </DirectionalRow>

            <Spacer height={Spacing.sm} />

            <DirectionalRow style={styles.dateTimeRow}>
              <DirectionalRow style={styles.dateTimeItem}>
                <DDIcon name="calendar" size={13} variant="muted" />
                <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
                  {formatDate(new Date(visitor.visitDate), 'short')}
                </ThemedText>
              </DirectionalRow>
              <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
              <DirectionalRow style={styles.dateTimeItem}>
                <DDIcon name="clock" size={13} variant="muted" />
                <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
                  {formatTimeFromString(visitor.visitTime)}
                </ThemedText>
              </DirectionalRow>
              <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
              <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
                {duration}
              </ThemedText>
            </DirectionalRow>

            <Spacer height={Spacing.sm} />

            <DirectionalRow style={styles.servicesStatusRow}>
              <DirectionalRow style={styles.servicesContainer}>
                {hasParking && (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                    <DDIcon name="map-pin" size={14} color={theme.info} />
                  </View>
                )}
                {visitor.isBuffet && (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
                    <DDIcon name="cloche" size={14} variant="warning" />
                  </View>
                )}
                {visitor.isMeetingRoom && (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
                    <DDIcon name="briefcase" size={14} color={theme.secondary} />
                  </View>
                )}
                {!hasParking && !visitor.isBuffet && !visitor.isMeetingRoom && (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>-</ThemedText>
                )}
              </DirectionalRow>
            </DirectionalRow>
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
      // Grid view for card mode on web/tablet (numColumns > 1)
      if (viewMode === 'card' && numColumns > 1) {
        // Calculate flex basis based on numColumns: 3 cols = 31%, 2 cols = 48%
        const itemBasis = numColumns === 3 ? '31%' : '48%';
        return (
          <View style={styles.webGridContainer}>
            {filteredVisitors.map((visitor) => (
              <View key={visitor.id} style={[styles.webGridItem, { flexBasis: itemBasis }]}>
                {renderVisitorCard(visitor, true)}
              </View>
            ))}
          </View>
        );
      }
      
      // List view or single column mobile (always single column)
      return (
        <View style={styles.cardList}>
          {filteredVisitors.map((visitor) => renderVisitorCard(visitor, false))}
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
        <DirectionalRow style={styles.titleRow}>
          <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '600' }]}>
            {t('navigation.visitorVerification')}
          </ThemedText>
          
          <DirectionalRow style={styles.viewToggle}>
            <Pressable
              style={[
                styles.viewToggleButton,
                styles.viewToggleButtonLeft,
                {
                  backgroundColor: viewMode === 'card' ? theme.primary : theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setViewMode('card')}
            >
              <DDIcon
                name="grid"
                size={16}
                color={viewMode === 'card' ? theme.buttonText : theme.textSecondary}
              />
            </Pressable>
            <Pressable
              style={[
                styles.viewToggleButton,
                styles.viewToggleButtonRight,
                {
                  backgroundColor: viewMode === 'list' ? theme.primary : theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setViewMode('list')}
            >
              <DDIcon
                name="menu"
                size={16}
                color={viewMode === 'list' ? theme.buttonText : theme.textSecondary}
              />
            </Pressable>
          </DirectionalRow>
        </DirectionalRow>
        
        <Spacer height={Spacing.sm} />
        
        <DirectionalRow style={styles.dateDisplayRow}>
          <ThemedText style={[Typography.bodySmall, { fontWeight: '600' }]}>
            {formatDisplayDate()}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {filteredVisitors.length} {filteredVisitors.length === 1 ? t('roles.visitor').toLowerCase() : t('navigation.allVisitors').toLowerCase()}
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
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewToggle: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  viewToggleButton: {
    padding: Spacing.sm,
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  viewToggleButtonLeft: {
    borderTopStartRadius: BorderRadius.sm,
    borderBottomStartRadius: BorderRadius.sm,
    borderTopEndRadius: 0,
    borderBottomEndRadius: 0,
    borderEndWidth: 0,
  },
  viewToggleButtonRight: {
    borderTopEndRadius: BorderRadius.sm,
    borderBottomEndRadius: BorderRadius.sm,
    borderTopStartRadius: 0,
    borderBottomStartRadius: 0,
  },
  webGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  webGridItem: {
    flexGrow: 1,
    minWidth: 280,
  },
  dateDisplayRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBarWrapper: {
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
  visitorCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
  },
  cardMainSection: {
    flex: 1,
    padding: Spacing.lg,
  },
  cardHeaderRow: {
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '600',
    fontFamily: FontFamily.latinSemiBold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  cardNameSection: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FontFamily.latinSemiBold,
  },
  dateTimeRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  dateTimeItem: {
    alignItems: 'center',
    gap: 4,
  },
  dateTimeText: {
    fontSize: 13,
    fontFamily: FontFamily.latinRegular,
  },
  separator: {
    fontSize: 10,
    marginHorizontal: 2,
  },
  servicesStatusRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servicesContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  servicePill: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  checkInButtonText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FontFamily.latinSemiBold,
    color: '#FFFFFF',
  },
  valetBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  valetBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: FontFamily.latinMedium,
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
