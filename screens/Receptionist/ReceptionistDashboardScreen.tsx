import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useUpcomingIndicator } from "@/hooks/useUpcomingVisitTimer";
import { UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES, isUpcomingIndicatorEligibleStatus } from "@/constants/requestConstants";
import { View, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager, ActivityIndicator, useWindowDimensions } from "react-native";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon, IconName } from "@/components/DDIcon";
import { applyOpacity, getStatusConfig as getSharedStatusConfig } from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTodayVisitorsQuery } from "@/hooks/queries/useReceptionQueries";
import { useInfiniteVisitsQuery } from "@/hooks/queries/useApprovalQueries";
import { getBusinessDateKey } from "@/utils/dateTimeUtils";
import {
  formatVisitDateLabel,
  groupVisitsByDate,
} from "@/utils/groupVisitsByDate";
import type { TodayVisitorDto } from "@/types";
import type { VisitListItemDto } from "@/types/api.types";
import { SkeletonCard, SkeletonDashboard, WalkInBadge, RTLHorizontalScrollView, RequestStatusBadge, VisitorMatrixTable, FilterChip, VisitorRequestCard } from "@/components/shared";
import { mapVisitListItemToVisitorRequest } from "@/utils/requestMappers";
import type { VisitorMatrixItem } from "@/components/shared";
import type { ReceptionistDashboardScreenProps } from "@/types/receptionistNavigation.types";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import {
  isReceptionistDashboardVisitorVisible,
  isReceptionistAllVisitorsRecordVisible,
} from "@/utils/receptionistVisitorRules";
import { DashboardKpiSection } from "@/components/shared/DashboardKpiSection";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsPendingHostWalkInExpired,
  getPendingApprovalWalkInScheduledEndMs,
} from "@/utils/visitExpiredGuard";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";
import { getInitials } from "@/utils/formatters";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Parse a time string to minutes since midnight for sorting.
 * Handles formats: "HH:MM", "H:MM", "HH:MM AM/PM", "H:MM AM/PM"
 * Returns Infinity for invalid/empty times (sorts to end)
 */
const parseTimeToMinutes = (timeStr: string | undefined | null): number => {
  if (!timeStr) return Infinity;
  
  const cleanTime = timeStr.trim().toUpperCase();
  
  // Check for AM/PM format
  const isPM = cleanTime.includes('PM');
  const isAM = cleanTime.includes('AM');
  
  // Remove AM/PM and extra spaces
  const timePart = cleanTime.replace(/\s*(AM|PM)\s*/gi, '').trim();
  
  // Split by colon
  const parts = timePart.split(':');
  if (parts.length < 2) return Infinity;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return Infinity;
  
  // Convert to 24-hour format if AM/PM was specified
  if (isAM || isPM) {
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
  }
  
  return hours * 60 + minutes;
};

const shiftDateKey = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const LAYOUT = {
  contentGap: Spacing.md,
};

interface QuickActionProps {
  icon: IconName;
  label: string;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, iconBgColor, iconColor, onPress }: QuickActionProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon} size={24} color={iconColor} />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[styles.quickActionLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const ReceptionistUpcomingAlertIcon = React.memo(({ visitDate, visitTime, status, visitStartAt }: { visitDate: string; visitTime: string; status: string; visitStartAt?: string }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
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
        {t('admin.upcoming')}
      </ThemedText>
    </View>
  );
});

const ServiceIconsRow = ({ visitor, size = 14 }: { visitor: TodayVisitorDto; size?: number }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  
  const showParking = resolveParkingDisplayDecision({
    parkingDecision: (visitor as any).parkingDecision,
    visitorNeedsParking: visitor.visitorNeedsParking,
    isVisitorNeedsParking: visitor.isVisitorNeedsParking,
    hasParking: visitor.hasParking,
  }) === 'required';
  const showMeetingRoom = visitor.isMeetingRoom === true || visitor.hasMeetingRoom === true || !!visitor.meetingRoom;
  const showBuffet = visitor.isBuffet === true || visitor.hasBuffet === true;
  
  const hasServices = showParking || showMeetingRoom || showBuffet;
  
  if (!hasServices) {
    return <View />;
  }

  return (
    <DirectionalRow style={styles.servicesRow}>
      {showBuffet ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
          <DDIcon name="cloche" size={size} color={theme.warning} />
        </View>
      ) : null}
      {showMeetingRoom ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
          <DDIcon name="briefcase" size={size} color={theme.secondary} />
        </View>
      ) : null}
      {showParking ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
          <DDIcon name="map-pin" size={size} color={theme.info} />
        </View>
      ) : null}
    </DirectionalRow>
  );
};

export default function ReceptionistDashboardScreen({ navigation }: ReceptionistDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString } = useFormatters();
  const { isRTL, localeCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();

  // Column count: desktop gets 3, tablet gets 2, mobile gets 1 — same screenWidth-based
  // breakpoints used on the Manager and Employee dashboards, so this grid matches them.
  // Widths are percentages (not fixed pixel math) so they never fight with the row's
  // gap/padding — each card's own end-padding creates the gutter instead.
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth >= 900 ? 3 : screenWidth >= 600 ? 2 : 1;
  const cardWidthPercent: `${number}%` | undefined =
    numColumns === 3 ? '33.33%' : numColumns === 2 ? '50%' : undefined;

  const [expandedVisitors, setExpandedVisitors] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'to_be_checked' | 'checked_in' | 'checked_out'>('all');

  // Today's visitors power the dashboard preview.
  const {
    data: todayResponse,
    isLoading,
    isFetching,
    isError,
    error: visitorError,
    refetch: refetchToday,
  } = useTodayVisitorsQuery();

  // Today includes every active request scheduled for the Riyadh business date,
  // including requests that are still awaiting host approval.
  const todaysVisitors = useMemo(() => {
    const visitors = todayResponse?.data ?? [];
    const allowed = visitors.filter(isReceptionistDashboardVisitorVisible);
    return [...allowed].sort((a, b) => {
      const timeA = parseTimeToMinutes(a.visitTime);
      const timeB = parseTimeToMinutes(b.visitTime);
      return timeA - timeB;
    });
  }, [todayResponse?.data]);

  const errorMessage = visitorError?.message || t('common.loadError');

  const TO_BE_CHECKED_STATUSES = ['expected', 'pending', 'approved', 'visitor_accepted'];

  const filteredTodaysVisitors = useMemo(() => {
    let result = todaysVisitors;

    if (visitorFilter === 'to_be_checked') {
      result = result.filter((v) => TO_BE_CHECKED_STATUSES.includes(v.status));
    } else if (visitorFilter === 'checked_in') {
      result = result.filter((v) => v.status === 'checked_in');
    } else if (visitorFilter === 'checked_out') {
      // Accept both 'checked_out' (general visits API) and 'completed' (today endpoint legacy)
      result = result.filter((v) => v.status === 'checked_out' || v.status === 'completed');
    }
    return result;
  }, [todaysVisitors, visitorFilter]);

  // All Visitors dashboard preview: include today and the previous
  // 3 Riyadh calendar dates so recent history can be grouped by visit date.
  const allVisitorsEndDate = getBusinessDateKey(new Date(), 'Asia/Riyadh');
  const allVisitorsStartDate = shiftDateKey(allVisitorsEndDate, -3);
  
  const {
    data: allVisitsData,
    isLoading: isLoadingAllVisitors,
    isFetching: isFetchingAllVisitors,
    isError: isAllVisitorsError,
    refetch: refetchAllVisitors,
    hasNextPage: allVisitorsHasNextPage,
    fetchNextPage: fetchAllVisitorsNextPage,
    isFetchingNextPage: isFetchingAllVisitorsNextPage,
  } = useInfiniteVisitsQuery({
    startDate: allVisitorsStartDate,
    endDate: allVisitorsEndDate,
    myRequestsOnly: false,
    limit: 100,
  });

  useEffect(() => {
    if (allVisitorsHasNextPage && !isFetchingAllVisitorsNextPage) {
      fetchAllVisitorsNextPage();
    }
  }, [
    allVisitorsHasNextPage,
    fetchAllVisitorsNextPage,
    isFetchingAllVisitorsNextPage,
  ]);
  
  // Newest visit dates first so recent history is visible before older dates.
  const allVisitors = useMemo(() => {
    return (allVisitsData?.pages.flatMap(page => page.data) ?? [])
      .filter((visitor) => isReceptionistAllVisitorsRecordVisible(visitor));
  }, [allVisitsData]);

  const expirationBoundaries = useMemo(
    () =>
      [...todaysVisitors, ...allVisitors].map((visitor) =>
        getPendingApprovalWalkInScheduledEndMs({
          isWalkIn: visitor.isWalkIn,
          status: visitor.status,
          visitDate: visitor.visitDate,
          visitTime: visitor.visitTime,
          endTime: visitor.endTime,
          duration: (visitor as any).duration,
        }),
      ),
    [allVisitors, todaysVisitors],
  );
  const expirationTick = useTimeBoundaryTick(expirationBoundaries);

  const groupedAllVisitors = useMemo(
    () =>
      groupVisitsByDate(allVisitors).sort((a, b) => {
        if (a.date === 'unknown') return 1;
        if (b.date === 'unknown') return -1;
        return b.date.localeCompare(a.date);
      }),
    [allVisitors],
  );

  const hasTodayData = todayResponse !== undefined;
  const hasAllVisitorsData = allVisitsData !== undefined;
  const hasAnyUsableData = hasTodayData || hasAllVisitorsData;
  const isColdLoading =
    !hasAnyUsableData &&
    isLoading &&
    isLoadingAllVisitors;

  const isRefreshing =
    hasAnyUsableData &&
    (
      isFetching ||
      (isFetchingAllVisitors && !isFetchingAllVisitorsNextPage)
    );

  const renderSectionState = (
    loading: boolean,
    failed: boolean,
    retry: () => unknown,
  ) => loading ? (
    <SkeletonCard lines={2} />
  ) : failed ? (
    <ThemedView style={[styles.sectionState, { backgroundColor: theme.surface }]}>
      <DDIcon name="alert-triangle" size={24} variant="muted" />
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('common.loadError')}
      </ThemedText>
      <Pressable onPress={() => void retry()}>
        <ThemedText style={[Typography.bodySmall, { color: theme.primary, fontWeight: '600' }]}>
          {t('common.retry')}
        </ThemedText>
      </Pressable>
    </ThemedView>
  ) : null;

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const toggleVisitorExpanded = (visitorId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedVisitors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitorId)) {
        newSet.delete(visitorId);
      } else {
        newSet.add(visitorId);
      }
      return newSet;
    });
  };


  const getStatusConfig = (status: string) => {
    const config = getSharedStatusConfig(theme, status, t);
    return { label: config.label, bg: config.bg, text: config.text, border: config.borderColor || config.text };
  };

  const handleVisitorPress = (visitor: TodayVisitorDto) => {
    const today = new Date().toISOString().split('T')[0];
    const legacyVisitor = {
      id: visitor.id,
      name: visitor.visitor.fullName,
      company: visitor.visitor.company ?? '',
      time: visitor.visitTime,
      host: visitor.hostName,
      status: (visitor.status === 'expected' ? 'pending' : visitor.status) as 'pending' | 'checked_in' | 'completed',
      isWalkIn: false,
      phone: visitor.visitor.phone ?? '',
      origin: 'scheduled' as const,
      scheduledFor: today,
      createdAt: today,
    };
    navigation.navigate(ROUTES.VISITOR_DETAIL as any, { visitor: legacyVisitor } as any);
  };

  const toMatrixItem = useCallback((v: TodayVisitorDto | VisitListItemDto): VisitorMatrixItem => {
    const isTodayVisitor = 'hostName' in v;
    const isExpired = computeIsPendingHostWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
    }) || computeIsPendingApprovalWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
      visitTime: v.visitTime,
      endTime: v.endTime,
      duration: (v as any).duration,
    });

    return {
      id: v.id,
      visitorName: v.visitor.fullName,
      company: v.visitor.company ?? undefined,
      visitDate: v.visitDate ?? undefined,
      plannedInTime: v.visitTime,
      plannedOutTime: v.endTime ?? (isTodayVisitor ? v.scheduledEndTime : undefined) ?? undefined,
      // Preserve Pending Host Approval and render expiration separately.
      status: v.status,
      actualInTime: v.checkedInAt ?? undefined,
      actualOutTime: v.checkedOutAt ?? undefined,
      hasParking: resolveParkingDisplayDecision({
        parkingDecision: (v as any).parkingDecision,
        visitorNeedsParking: v.visitorNeedsParking,
        isVisitorNeedsParking: v.isVisitorNeedsParking,
        hasParking: v.hasParking,
      }) === 'required',
      hasBuffet: !!(v.isBuffet || v.hasBuffet),
      hasValet: !!v.hasValet,
      hasMeetingRoom: !!(
        v.isMeetingRoom ||
        v.hasMeetingRoom ||
        (isTodayVisitor && v.meetingRoom)
      ),
      hostName: isTodayVisitor ? v.hostName : v.employeeName,
      hostDepartment: isTodayVisitor ? v.hostDepartment : undefined,
      purpose: v.purpose ?? undefined,
      isExpired,
    };
  }, [expirationTick, riyadhBusinessDateKey]);

  const handleAllVisitorPress = (visitor: VisitListItemDto) => {
    navigation.navigate(ROUTES.VISITOR_DETAIL as any, {
      visitor: {
        id: visitor.id,
        name: visitor.visitor.fullName,
        company: visitor.visitor.company ?? '',
        time: visitor.visitTime,
        host: visitor.employeeName,
        status: (visitor.status === 'expected' ? 'pending' : visitor.status) as 'pending' | 'checked_in' | 'completed',
        isWalkIn: visitor.isWalkIn,
        phone: visitor.visitor.phone ?? '',
        origin: visitor.isWalkIn ? 'walk_in' as const : 'scheduled' as const,
        scheduledFor: visitor.visitDate,
        createdAt: visitor.createdAt,
      }
    } as any);
  };

  const renderVisitorCard = (item: TodayVisitorDto) => {
    const statusConfig = getStatusConfig(item.status);
    const isExpired = computeIsPendingHostWalkInExpired({
      isWalkIn: item.isWalkIn,
      status: item.status,
      visitDate: item.visitDate,
    }) || computeIsPendingApprovalWalkInExpired({
      isWalkIn: item.isWalkIn,
      status: item.status,
      visitDate: item.visitDate,
      visitTime: item.visitTime,
      endTime: item.endTime,
      duration: (item as any).duration,
    });
    const visitorName = item.visitor.fullName;
    const initials = getInitials(visitorName);
    const isExpanded = expandedVisitors.has(item.id);
    const hasDetails = item.visitor.phone;
    
    return (
      <GHTouchableOpacity 
        key={item.id}
        onPress={() => handleVisitorPress(item)}
        activeOpacity={0.9}
        style={[
          styles.visitorCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: statusConfig.border,
          },
        ]}
      >
        <DirectionalRow style={styles.visitorCardHeader}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <ThemedText
              style={[styles.avatarText, { color: theme.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {initials}
            </ThemedText>
          </View>
          <View style={[styles.visitorHeaderInfo, { marginStart: isRTL ? 0 : Spacing.sm, marginEnd: isRTL ? Spacing.sm : 0, flex: 1 }]}>
            <DirectionalRow style={[styles.nameRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <DirectionalRow style={{ flex: 1, alignItems: 'center', gap: Spacing.xs, marginEnd: Spacing.xs }}>
                <ThemedText style={[styles.visitorName, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                  {visitorName}
                </ThemedText>
                {item.isWalkIn ? <WalkInBadge size="sm" /> : null}
              </DirectionalRow>
              <DirectionalRow style={{ alignItems: 'center' }}>
                <ReceptionistUpcomingAlertIcon visitDate={item.visitDate ?? ''} visitTime={item.visitTime} status={item.status} visitStartAt={item.visitStartAt} />
                <RequestStatusBadge status={item.status} />
              </DirectionalRow>
            </DirectionalRow>
            <ThemedText style={[styles.visitorCompany, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.visitor.company ?? ''}
            </ThemedText>
          </View>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.visitorMetaRow}>
          <DDIcon name="clock" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.visitorMetaText, { color: theme.textSecondary }]}>
            {formatTimeFromString(item.visitTime)}
          </ThemedText>
          <View style={styles.metaDot} />
          <DDIcon name="user" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.visitorMetaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {t('reception.hostName')}: {item.hostName}{item.hostDepartment ? ` - ${item.hostDepartment}` : ''}
          </ThemedText>
        </DirectionalRow>

        {(item.endTime || item.scheduledEndTime) ? (
          <>
            <Spacer height={Spacing.xs} />
            <View style={{
              flexDirection: 'row',
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.border,
              paddingTop: Spacing.sm,
              gap: Spacing.md,
            }}>
              <View style={{ minWidth: 70 }}>
                <ThemedText style={{ fontSize: 10, fontWeight: '500', color: theme.textSecondary, marginBottom: 2 }}>
                  {t('visitor.plannedOut')}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                  {formatTimeFromString(item.endTime ?? item.scheduledEndTime ?? '')}
                </ThemedText>
              </View>
            </View>
          </>
        ) : null}

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.servicesStatusRow}>
          <ServiceIconsRow visitor={item} />
        </DirectionalRow>

        {isExpanded && hasDetails ? (
          <View style={styles.expandedSection}>
            {item.visitor.phone ? (
              <DirectionalRow style={styles.detailRow}>
                <DDIcon name="phone" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.detailText, { color: theme.text, writingDirection: 'ltr' }]} numberOfLines={1}>
                  {item.visitor.phone}
                </ThemedText>
              </DirectionalRow>
            ) : null}
          </View>
        ) : null}

        {isExpired ? (
          <DirectionalRow style={[styles.expiredNotice, { backgroundColor: applyOpacity(theme.textSecondary, '10'), borderColor: theme.border }]}>
            <DDIcon name="clock" size={14} color={theme.textSecondary} />
            <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
              {t('visitor.visitExpired')}
            </ThemedText>
          </DirectionalRow>
        ) : null}

      </GHTouchableOpacity>
    );
  };

  if (isColdLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.xl, paddingHorizontal: Spacing.lg }]}>
        <SkeletonDashboard cards={3} />
      </View>
    );
  }

  return (
    <>
      <ScreenScrollView skipTopPadding contentContainerStyle={scrollContentStyle}>
        {hasAnyUsableData && (isRefreshing || isError || isAllVisitorsError) ? (
          <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(
            isError || isAllVisitorsError ? theme.error : theme.primary,
            '10',
          ) }]}>
            {isRefreshing ? <ActivityIndicator size="small" color={theme.primary} /> : (
              <DDIcon name="alert-triangle" size={16} color={theme.error} />
            )}
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, flex: 1 }]}>
              {isError || isAllVisitorsError
                ? errorMessage
                : t('common.loading')}
            </ThemedText>
            {(isError || isAllVisitorsError) && !isRefreshing ? (
              <Pressable onPress={() => {
                if (isError) void refetchToday();
                else void refetchAllVisitors();
              }}>
                <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                  {t('common.retry')}
                </ThemedText>
              </Pressable>
            ) : null}
          </DirectionalRow>
        ) : null}

        <DashboardKpiSection />

        <Spacer height={Spacing.xl} />

        <DirectionalRow style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              {t('navigation.todaysVisitors')}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4, fontSize: 12 }]}>
              {t('dashboard.checkInsToday')}
            </ThemedText>
          </View>
          <DirectionalRow style={styles.viewToggle}>
            <Pressable
              style={[styles.viewToggleBtn, styles.viewToggleBtnLeft, { backgroundColor: viewMode === 'card' ? theme.primary : theme.surface, borderColor: theme.border }]}
              onPress={() => setViewMode('card')}
            >
              <DDIcon name="grid" size={16} color={viewMode === 'card' ? theme.buttonText : theme.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.viewToggleBtn, styles.viewToggleBtnRight, { backgroundColor: viewMode === 'table' ? theme.primary : theme.surface, borderColor: theme.border }]}
              onPress={() => setViewMode('table')}
            >
              <DDIcon name="menu" size={16} color={viewMode === 'table' ? theme.buttonText : theme.textSecondary} />
            </Pressable>
          </DirectionalRow>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <DirectionalRow style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <RTLHorizontalScrollView
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.sm, paddingBottom: 2 }}
              nestedScrollEnabled={true}
            >
              {(
                [
                  { key: 'all', label: t('common.all') },
                  { key: 'to_be_checked', label: t('status.toBeChecked') },
                  { key: 'checked_in', label: t('status.checkedIn') },
                  { key: 'checked_out', label: t('status.checkedOut') },
                ] as const
              ).map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={opt.label}
                  isSelected={visitorFilter === opt.key}
                  onPress={() => setVisitorFilter(opt.key)}
                />
              ))}
            </RTLHorizontalScrollView>
          </View>
          {todaysVisitors.length > 0 ? (
            <Pressable
              onPress={() => navigation.navigate(ROUTES.ALL_VISITORS_TODAY as any)}
              style={({ pressed }) => [
                styles.viewAllButton,
                { opacity: pressed ? 0.7 : 1, flexDirection: getFlexDirection(isRTL), marginStart: Spacing.sm }
              ]}
            >
              <ThemedText style={[styles.viewAllText, { color: theme.primary }]}>
                {t('common.viewAll')}
              </ThemedText>
              <DDIcon name="chevron-right" size={16} variant="primary" directionAware />
            </Pressable>
          ) : null}
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        {!hasTodayData ? (
          renderSectionState(isLoading, isError, refetchToday)
        ) : filteredTodaysVisitors.length > 0 ? (
          viewMode === 'card' ? (
            <View style={styles.verticalCardList}>
              {filteredTodaysVisitors.slice(0, 10).map((visitor) => (
                <View
                  key={visitor.id}
                  style={cardWidthPercent
                    ? { width: cardWidthPercent, paddingEnd: Spacing.md, marginBottom: Spacing.md }
                    : styles.verticalCardWrapper}
                >
                  {renderVisitorCard(visitor)}
                </View>
              ))}
            </View>
          ) : (
            <VisitorMatrixTable
              variant="matrix"
              visitors={filteredTodaysVisitors.slice(0, 10).map(toMatrixItem)}
              showExpiredState={true}
              onPressRow={(id) => {
                const item = filteredTodaysVisitors.find(visitor => visitor.id === id);
                if (item) handleVisitorPress(item);
              }}
            />
          )
        ) : (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <DDIcon name="users" size={32} variant="muted" />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('dashboard.noUpcomingVisitors')}
            </ThemedText>
          </ThemedView>
        )}

        <Spacer height={Spacing.xl} />

        <DirectionalRow style={styles.sectionHeader} justifyContent="space-between">
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              {t('navigation.allVisitors')}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4, fontSize: 12 }]}>
              {t('dashboard.allVisitorsList')}
            </ThemedText>
          </View>
          {allVisitors.length > 5 ? (
            <Pressable 
              onPress={() => navigation.navigate(ROUTES.ALL_VISITORS as any)}
              style={({ pressed }) => [
                styles.viewAllButton,
                { opacity: pressed ? 0.7 : 1, flexDirection: getFlexDirection(isRTL) }
              ]}
            >
              <ThemedText style={[styles.viewAllText, { color: theme.primary }]}>
                {t('common.viewAll')}
              </ThemedText>
              <DDIcon name="chevron-right" size={16} variant="primary" directionAware />
            </Pressable>
          ) : null}
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        {!hasAllVisitorsData ? (
          renderSectionState(isLoadingAllVisitors, isAllVisitorsError, refetchAllVisitors)
        ) : groupedAllVisitors.length > 0 ? (
          <>
            {groupedAllVisitors.map((group, index) => (
              <View key={group.date}>
                <DirectionalRow
                  style={[
                    styles.dateGroupHeader,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dateGroupAccent,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <ThemedText style={[styles.dateGroupLabel, { color: theme.text }]}>
                    {group.date === 'unknown'
                      ? t('common.date')
                      : formatVisitDateLabel(group.date, localeCode, {
                          today: t('common.today'),
                          tomorrow: t('time.tomorrow'),
                        })}
                  </ThemedText>
                  <ThemedText
                    style={[styles.dateGroupCount, { color: theme.textSecondary }]}
                  >
                    {group.visits.length}
                  </ThemedText>
                </DirectionalRow>

                <Spacer height={Spacing.md} />

                {viewMode === 'table' ? (
                  <VisitorMatrixTable
                    variant="matrix"
                    visitors={group.visits.map(toMatrixItem)}
                    showExpiredState={true}
                    onPressRow={(id) => {
                      const visitor = group.visits.find((item) => item.id === id);
                      if (visitor) handleAllVisitorPress(visitor);
                    }}
                  />
                ) : (
                  <RTLHorizontalScrollView
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScrollContent}
                  >
                    {group.visits.map((visitor) => (
                      <View key={visitor.id} style={styles.horizontalCardWrapper}>
                        <VisitorRequestCard
                          request={mapVisitListItemToVisitorRequest(visitor)}
                          hostName={visitor.employeeName}
                          isExpired={computeIsPendingHostWalkInExpired({
                            isWalkIn: visitor.isWalkIn,
                            status: visitor.status,
                            visitDate: visitor.visitDate,
                          }) || computeIsPendingApprovalWalkInExpired({
                            isWalkIn: visitor.isWalkIn,
                            status: visitor.status,
                            visitDate: visitor.visitDate,
                            visitTime: visitor.visitTime,
                            endTime: visitor.endTime,
                            duration: (visitor as any).duration,
                          })}
                          showExpiredState={true}
                          width={300}
                          onPress={() => handleAllVisitorPress(visitor)}
                        />
                      </View>
                    ))}
                  </RTLHorizontalScrollView>
                )}

                {index < groupedAllVisitors.length - 1 ? (
                  <Spacer height={Spacing.xl} />
                ) : null}
              </View>
            ))}
          </>
        ) : (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <DDIcon name="users" size={32} variant="muted" />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('dashboard.noVisitors')}
            </ThemedText>
          </ThemedView>
        )}

        <Spacer height={Spacing.xl} />
      </ScreenScrollView>

      <Pressable
        style={[
          styles.fab,
          { 
            backgroundColor: theme.primary,
            bottom: insets.bottom + 80 + Spacing.lg,
          },
        ]}
        onPress={() => navigation.navigate(ROUTES.WALK_IN_REGISTRATION as any)}
      >
        <DDIcon name="user-plus" size={24} color="#FFFFFF" />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  kpiRow: {
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 0,
    elevation: 0,
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsRow: {
    gap: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
  },
  quickActionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  meetingsContainer: {
    gap: Spacing.sm,
  },
  roomCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  roomHeader: {
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomHeaderLeft: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  roomIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomFloor: {
    fontSize: 12,
    marginTop: 2,
  },
  roomHeaderRight: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  meetingCountBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  meetingCountText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  meetingsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
  meetingItem: {
    paddingVertical: Spacing.sm,
  },
  meetingTimeSlot: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  meetingTime: {
    fontSize: 12,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  meetingMeta: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  meetingHost: {
    fontSize: 12,
  },
  visitorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  horizontalScrollContent: {
    paddingEnd: Spacing.lg,
    gap: Spacing.md,
  },
  horizontalCardWrapper: {
    width: 300,
    minWidth: 280,
  },
  verticalCardList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  verticalCardWrapper: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  dateGroupHeader: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 42,
    overflow: 'hidden',
    paddingEnd: Spacing.md,
  },
  dateGroupAccent: {
    alignSelf: 'stretch',
    width: 4,
    marginEnd: Spacing.sm,
  },
  dateGroupLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  dateGroupCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  visitorCard: {
    borderRadius: 12,
    padding: Spacing.md,
    borderStartWidth: 4,
  },
  visitorCardHeader: {
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  visitorHeaderInfo: {
    flex: 1,
    marginStart: Spacing.sm,
  },
  nameRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  visitorCompany: {
    fontSize: 12,
    marginTop: 2,
  },
  companyRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  visitorMetaRow: {
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  visitorMetaText: {
    fontSize: 12,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  servicesStatusRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servicesRow: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  servicePill: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  expiredNotice: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  visitorCardFooter: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionState: {
    minHeight: 112,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  inlineFeedback: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  viewToggle: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  viewToggleBtn: {
    padding: Spacing.sm,
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  viewToggleBtnLeft: {
    borderTopStartRadius: BorderRadius.sm,
    borderBottomStartRadius: BorderRadius.sm,
    borderTopEndRadius: 0,
    borderBottomEndRadius: 0,
    borderEndWidth: 0,
  },
  viewToggleBtnRight: {
    borderTopEndRadius: BorderRadius.sm,
    borderBottomEndRadius: BorderRadius.sm,
    borderTopStartRadius: 0,
    borderBottomStartRadius: 0,
  },
});
