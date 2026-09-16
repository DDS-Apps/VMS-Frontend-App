import React, { useState, useMemo } from "react";
import { useUpcomingIndicator } from "@/hooks/useUpcomingVisitTimer";
import { getInitials } from "@/utils/formatters";
import { UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES, isUpcomingIndicatorEligibleStatus } from "@/constants/requestConstants";
import { View, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions, Platform } from "react-native";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
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
import {
  RTLHorizontalScrollView,
  RequestStatusBadge,
  FilterChip,
  DashboardKpiSection,
  VisitorMatrixTable,
} from "@/components/shared";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { applyOpacity, getStatusConfig } from "@/utils/statusStyles";
import { useSecurityVisitorsQuery } from "@/hooks/queries/useSecurityQueries";
import type { SecurityVisitorDto } from "@/types";
import type { SecurityCheckInScreenProps } from "@/types/securityNavigation.types";
import type { Theme } from "@/types/theme.types";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import { mapSecurityVisitorToMatrixItem } from "@/utils/securityVisitorTable";
import { useRetainedDatedData } from "@/hooks/useRetainedDatedData";

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  avatarSize: 44,
};

const SecurityUpcomingAlertIcon = React.memo(({ visitDate, visitTime, status, visitStartAt }: { visitDate: string; visitTime: string; status: string; visitStartAt?: string }) => {
  const { theme } = useTheme();
  const eligible = isUpcomingIndicatorEligibleStatus(status);
  const isUpcoming = useUpcomingIndicator({
    visitDate,
    visitTime,
    visitStartAt,
    eligible,
    thresholdMinutes: UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES,
  });
  if (!isUpcoming) return null;
  return (
    <View accessibilityLabel="Visit starts soon" accessibilityRole="image" style={{ marginEnd: 4 }}>
      <DDIcon name="alert-circle" size={14} color={theme.error} />
    </View>
  );
});

const VisitorAvatar = ({ name, theme, size = 44 }: { name: string; theme: Theme; size?: number }) => {
  const initials = getInitials(name);
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
      <ThemedText
        style={[styles.avatarText, { color: theme.primary, fontSize: size * 0.36 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {initials}
      </ThemedText>
    </View>
  );
};

type SecurityVisitorStatus = 'expected' | 'checked_in' | 'checked_out';

interface SecurityVisitor {
  id: string;
  name: string;
  company: string;
  visitDate: string;
  visitTime: string;
  visitStartAt?: string;
  endTime?: string;
  duration?: string;
  host: string;
  purpose?: string;
  email?: string;
  phone?: string;
  status: SecurityVisitorStatus;
  originalStatus: string;
  checkInTime?: string;
  checkOutTime?: string;
  parking: {
    parkingDecision?: unknown;
    hasParking?: boolean | null;
    isVisitorNeedsParking?: boolean;
    visitorNeedsParking?: boolean;
    hasParkingAllocation?: boolean;
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
    visitStartAt: dto.visitStartAt,
    endTime: dto.endTime,
    duration: dto.duration,
    host: dto.hostName,
    purpose: dto.purpose,
    email: dto.visitorEmail,
    phone: dto.visitorPhone,
    status: mapStatus(dto.status),
    originalStatus: dto.status,
    checkInTime: dto.checkInTime,
    checkOutTime: dto.checkOutTime,
    parking: {
      parkingDecision: (dto as any).parkingDecision,
      hasParking: (dto as any).hasParking,
      isVisitorNeedsParking: dto.isVisitorNeedsParking,
      visitorNeedsParking: dto.visitorNeedsParking,
      hasParkingAllocation: dto.parkingAssigned,
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
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth >= 900 ? 3 : screenWidth >= 600 ? 2 : 1;

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

  const sourceContext = useMemo(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    if (dateRange.startDate && dateRange.endDate) {
      return {
        selection: 'range' as const,
        startDate: formatDate(dateRange.startDate),
        endDate: formatDate(dateRange.endDate),
        status: statusFilter,
      };
    }
    const date = formatDate(selectedDate);
    return { selection: 'date' as const, date, status: statusFilter };
  }, [dateRange.startDate, dateRange.endDate, selectedDate, statusFilter]);

  const {
    data: apiResponse,
    isLoading,
    isFetching,
    isError,
    isPlaceholderData,
    refetch,
  } = useSecurityVisitorsQuery(queryParams, {
    placeholderData: (previousData) => previousData,
  });

  const retainedInput = useMemo(
    () => apiResponse !== undefined && !isPlaceholderData
      ? { response: apiResponse, context: sourceContext }
      : undefined,
    [apiResponse, isPlaceholderData, sourceContext],
  );
  const retainedVisitors = useRetainedDatedData(
    JSON.stringify(sourceContext),
    retainedInput,
  );
  const displayedApiResponse = retainedVisitors.data?.response;
  const displayedSourceContext = retainedVisitors.data?.context ?? sourceContext;
  const isShowingPreviousQueryData = retainedVisitors.isRetained || isPlaceholderData;

  const visitors = useMemo(() => {
    if (!displayedApiResponse?.data) return [];
    // Security only sees invitation-verified visits — pending, rejected, cancelled are excluded.
    const SECURITY_VISIBLE_STATUSES = ['approved', 'visitor_accepted', 'checked_in', 'on_site', 'checked_out', 'completed'];
    return displayedApiResponse.data
      .filter(dto => SECURITY_VISIBLE_STATUSES.includes(dto.status))
      .map(mapApiToSecurityVisitor);
  }, [displayedApiResponse]);


  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'expected', label: t('visitor.expectedVisitors').split(' ')[0] },
    { key: 'checked_in', label: t('status.checkedIn') },
    { key: 'checked_out', label: t('status.checkedOut') },
  ];
  const effectiveStatusFilter = isShowingPreviousQueryData
    ? displayedSourceContext.status
    : statusFilter;
  const displayedSourceLabel = displayedSourceContext.selection === 'range'
    ? `${displayedSourceContext.startDate} – ${displayedSourceContext.endDate}`
    : displayedSourceContext.date;

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

  const getVisitTimestamp = (visitor: SecurityVisitor): number => {
    if (visitor.visitStartAt) {
      const timestamp = Date.parse(visitor.visitStartAt);
      if (!Number.isNaN(timestamp)) return timestamp;
    }

    const dateStart = Date.parse(`${visitor.visitDate}T00:00:00+03:00`);
    if (Number.isNaN(dateStart)) return Number.MAX_SAFE_INTEGER;
    return dateStart + parseTimeToMinutes(visitor.visitTime) * 60 * 1000;
  };

  const dateFilteredVisitors = visitors.filter(visitor => {
    if (displayedSourceContext.selection === 'range') {
      return visitor.visitDate >= displayedSourceContext.startDate &&
        visitor.visitDate <= displayedSourceContext.endDate;
    }
    return visitor.visitDate === displayedSourceContext.date;
  });

  const filteredVisitors = dateFilteredVisitors
    .filter(visitor =>
      visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.host.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(visitor => {
      if (effectiveStatusFilter === 'all') return true;
      return visitor.status === effectiveStatusFilter;
    })
    .sort((a, b) => {
      // Show cards in chronological order, matching the requested Buffet Admin behavior.
      const timeDifference = getVisitTimestamp(a) - getVisitTimestamp(b);
      if (timeDifference !== 0) return timeDifference;

      // Use status order only when visits have the same date and time.
      const statusOrder: Record<SecurityVisitorStatus, number> = { expected: 0, checked_in: 1, checked_out: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }

      // Keep the order deterministic when all visible values are identical.
      return a.id.localeCompare(b.id);
    });

  const tableVisitors = useMemo(
    () => filteredVisitors.map(mapSecurityVisitorToMatrixItem),
    [filteredVisitors],
  );

  
  const formatDisplayDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (displayedSourceContext.selection === 'range') {
      const start = new Date(`${displayedSourceContext.startDate}T00:00:00`);
      const end = new Date(`${displayedSourceContext.endDate}T00:00:00`);
      if (start.toDateString() === end.toDateString()) {
        if (start.toDateString() === today.toDateString()) return t('time.today');
        return `${start.getDate()} ${t(`months.${getMonthKey(start.getMonth())}`).slice(0, 3)} ${start.getFullYear()}`;
      }
      return `${start.getDate()} - ${end.getDate()} ${t(`months.${getMonthKey(end.getMonth())}`).slice(0, 3)} ${end.getFullYear()}`;
    }
    
    const displayDate = displayedSourceContext.selection === 'date'
      ? new Date(`${displayedSourceContext.date}T00:00:00`)
      : selectedDate;
    if (displayDate.toDateString() === today.toDateString()) {
      return t('time.today');
    }
    if (displayDate.toDateString() === tomorrow.toDateString()) {
      return t('time.tomorrow');
    }
    if (displayDate.toDateString() === yesterday.toDateString()) {
      return t('time.yesterday');
    }
    return `${displayDate.getDate()} ${t(`months.${getMonthKey(displayDate.getMonth())}`).slice(0, 3)} ${displayDate.getFullYear()}`;
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


  const localizeNumber = (num: number): string => {
    if (!isRTL) return String(num);
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d, 10)]);
  };

  const localizeDuration = (duration: string): string => {
    if (!isRTL) return duration;
    let result = duration
      .replace(/\bhours?\b/gi, (m) => m.toLowerCase().endsWith('s') ? t('time.hours') : t('time.hour'))
      .replace(/\bmin(ute)?s?\b/gi, (m) => m.toLowerCase().includes('utes') || m.toLowerCase().endsWith('s') ? t('time.minutes') : t('time.minute'));
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    result = result.replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d, 10)]);
    return result;
  };

  const calculateDuration = (startTime: string, endTime?: string, apiDuration?: string): string => {
    if (apiDuration) return localizeDuration(apiDuration);
    if (!endTime) return `${localizeNumber(1)} ${t('time.hour')}`;
    
    const parseTime = (timeStr: string): number => {
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
    
    if (diffMinutes <= 0) diffMinutes += 24 * 60;
    
    if (diffMinutes < 60) return `${localizeNumber(diffMinutes)} ${t('time.minute')}`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (mins === 0) return `${localizeNumber(hours)} ${hours > 1 ? t('time.hours') : t('time.hour')}`;
    return `${localizeNumber(hours)}${isRTL ? 'س' : 'h'} ${localizeNumber(mins)}${isRTL ? 'د' : 'm'}`;
  };

  const renderVisitorCard = (visitor: SecurityVisitor, isGridMode: boolean = false) => {
    const statusConfig = getStatusConfig(theme, visitor.originalStatus, t);
    const parkingDecision = resolveParkingDisplayDecision(visitor.parking);
    const hasParking = parkingDecision === 'required';
    const duration = calculateDuration(visitor.visitTime, visitor.endTime, visitor.duration);
    
    return (
      <Pressable 
        key={visitor.id}
        onPress={() => navigation.navigate(ROUTES.SECURITY_VISITOR_DETAIL as any, { visitorId: visitor.id } as any)}
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
              
              <View style={styles.cardNameSection}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 16 }]}>
                  {visitor.name}
                </ThemedText>
                {visitor.company ? (
                  <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
                    {visitor.company}
                  </ThemedText>
                ) : null}
              </View>

              <DirectionalRow style={{ alignItems: 'center' }}>
                <SecurityUpcomingAlertIcon visitDate={visitor.visitDate} visitTime={visitor.visitTime} status={visitor.status} visitStartAt={visitor.visitStartAt} />
                <RequestStatusBadge status={visitor.originalStatus} />
              </DirectionalRow>
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
                {hasParking ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                    <DDIcon name="map-pin" size={14} color={theme.info} />
                  </View>
                ) : null}
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
                {!visitor.isBuffet && !visitor.isMeetingRoom && (
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
    if (isLoading && !displayedApiResponse) {
      return (
        <View style={styles.loadingState}>
          <SkeletonCard showImage={false} lines={3} />
          <SkeletonCard showImage={false} lines={3} />
          <SkeletonCard showImage={false} lines={3} />
        </View>
      );
    }

    if (isError && !displayedApiResponse) {
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
      if (viewMode === 'list') {
        return (
          <VisitorMatrixTable
            visitors={tableVisitors}
            variant="matrix"
            onPressRow={(visitorId) =>
              navigation.navigate(
                ROUTES.SECURITY_VISITOR_DETAIL as any,
                { visitorId } as any,
              )
            }
          />
        );
      }

      // Grid view for card mode on web/tablet (numColumns > 1)
      if (numColumns > 1) {
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
      
      // Single-column card view on mobile.
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
          
          {Platform.OS === 'web' ? (
            <View style={[styles.viewToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
            </View>
          ) : null}
        </DirectionalRow>
        
        <Spacer height={Spacing.sm} />

        <DashboardKpiSection />

        <Spacer height={Spacing.lg} />
        
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

        <RTLHorizontalScrollView
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          nestedScrollEnabled={true}
        >
          {FILTER_OPTIONS.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
               isSelected={effectiveStatusFilter === option.key}
              count={statusCounts[option.key]}
              onPress={() => setStatusFilter(option.key)}
            />
          ))}
        </RTLHorizontalScrollView>

        <Spacer height={Spacing.xl} />

        {isFetching || (isError && displayedApiResponse) ? (
          <DirectionalRow
            style={[
              styles.inlineQueryState,
              {
                backgroundColor: applyOpacity(
                  isError && !isFetching ? theme.error : theme.primary,
                  "10",
                ),
              },
            ]}
          >
            {isError && !isFetching ? (
              <DDIcon name="alert-circle" size={16} color={theme.error} />
            ) : (
              <ActivityIndicator size="small" color={theme.primary} />
            )}
            <ThemedText
              style={[
                Typography.caption,
                {
                  color:
                    isError && !isFetching
                      ? theme.error
                      : theme.textSecondary,
                  flex: 1,
                },
              ]}
            >
              {isShowingPreviousQueryData
                ? t('requests.showingPreviousDataFrom').replace('{{source}}', displayedSourceLabel)
                : t(
                    isError && !isFetching
                      ? "errors.failedToLoadData"
                      : "common.loading",
                  )}
            </ThemedText>
            {isError && !isFetching ? (
              <Pressable onPress={() => refetch()} hitSlop={8}>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.primary, fontWeight: "600" },
                  ]}
                >
                  {t("common.retry")}
                </ThemedText>
              </Pressable>
            ) : null}
          </DirectionalRow>
        ) : null}

        {isFetching || (isError && displayedApiResponse) ? (
          <Spacer height={Spacing.md} />
        ) : null}

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
    lineHeight: 26,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  cardNameSection: {
    flex: 1,
    marginHorizontal: Spacing.md,
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
  inlineQueryState: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
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
