import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon, IconName } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection, getPhysicalToggleStyle } from '@/components/DirectionalRow';

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
import { SkeletonCard, SkeletonDashboard, RTLHorizontalScrollView, VisitorMatrixTable, FilterChip, VisitorRequestCard } from "@/components/shared";
import { mapVisitListItemToVisitorRequest } from "@/utils/requestMappers";
import type { VisitorMatrixItem } from "@/components/shared";
import type { ReceptionistDashboardScreenProps } from "@/types/receptionistNavigation.types";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import {
  isReceptionistDashboardVisitorVisible,
  isReceptionistAwaitingCheckIn,
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
import { getLocalizedApiErrorMessage } from "@/utils/apiErrorMessage";
import { StatusDropdown } from "@/components/shared/RequestStatusDropdown";

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

export default function ReceptionistDashboardScreen({ navigation }: ReceptionistDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
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

  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [visitorFilter, setVisitorFilter] =
    useState<'all' | 'to_be_checked' | 'checked_in' | 'checked_out'>('all');
  const [preciseVisitorStatus, setPreciseVisitorStatus] = useState<string | null>(null);

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

  const errorMessage = getLocalizedApiErrorMessage(visitorError, t) || t('common.loadError');

  const filteredTodaysVisitors = useMemo(() => {
    let result = todaysVisitors;

    if (preciseVisitorStatus) {
      result = result.filter((visitor) =>
        preciseVisitorStatus === 'completed'
          ? visitor.status === 'completed' || visitor.status === 'checked_out'
          : visitor.status === preciseVisitorStatus,
      );
    } else if (visitorFilter === 'to_be_checked') {
      result = result.filter(isReceptionistAwaitingCheckIn);
    } else if (visitorFilter === 'checked_in') {
      result = result.filter((visitor) => visitor.status === 'checked_in');
    } else if (visitorFilter === 'checked_out') {
      result = result.filter((visitor) => {
        return visitor.status === 'checked_out' || visitor.status === 'completed';
      });
    }
    return result;
  }, [todaysVisitors, visitorFilter, preciseVisitorStatus]);

  const RECEPTIONIST_STATUS_OPTIONS = [
    'pending',
    'expected',
    'approved',
    'visitor_accepted',
    'checked_in',
    'completed',
  ];

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
      movementSummary: v.movementSummary,
      movementSummaryAvailability: v.movementSummaryAvailability,
      movementSummaryError: v.movementSummaryError,
      timezone: v.timezone,
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

  const toTodayVisitorRequest = (item: TodayVisitorDto) => {
    const parkingDecision = (item as any).parkingDecision;
    const hasParking = resolveParkingDisplayDecision({
      parkingDecision,
      visitorNeedsParking: item.visitorNeedsParking,
      isVisitorNeedsParking: item.isVisitorNeedsParking,
      hasParking: item.hasParking,
    }) === 'required';
    const hasMeetingRoom =
      item.isMeetingRoom === true ||
      item.hasMeetingRoom === true ||
      !!item.meetingRoom;
    const hasBuffet = item.isBuffet === true || item.hasBuffet === true;

    const request = mapVisitListItemToVisitorRequest({
      movementSummary: item.movementSummary,
      movementSummaryAvailability: item.movementSummaryAvailability,
      movementSummaryError: item.movementSummaryError,
      id: item.id,
      employeeName: item.hostName,
      visitor: {
        fullName: item.visitor.fullName,
        company: item.visitor.company,
        phone: item.visitor.phone,
        email: item.visitor.email,
      },
      visitDate: item.visitDate ?? '',
      visitTime: item.visitTime,
      visitStartAt: item.visitStartAt,
      timezone: item.timezone,
      endTime: item.endTime ?? item.scheduledEndTime ?? undefined,
      checkedInAt: item.checkedInAt,
      checkedOutAt: item.checkedOutAt,
      status: item.status,
      purpose: item.purpose ?? '',
      isWalkIn: item.isWalkIn ?? false,
      createdAt: item.visitDate ?? '',
      hasParking,
      hasMeetingRoom,
      hasBuffet,
      hasValet: item.hasValet === true,
      meetingRoom: item.meetingRoom,
      isBuffet: item.isBuffet,
      isMeetingRoom: item.isMeetingRoom,
      isVisitorNeedsParking: item.isVisitorNeedsParking,
      visitorNeedsParking: item.visitorNeedsParking,
      parkingDecision,
    } as VisitListItemDto & { meetingRoom?: TodayVisitorDto['meetingRoom'] });

    return {
      ...request,
      visitor: { ...request.visitor, id: item.visitor.id },
      employeeDepartment: item.hostDepartment,
    };
  };

  const renderVisitorCard = (item: TodayVisitorDto) => {
    const isExpired = computeIsPendingHostWalkInExpired({
      isWalkIn: item.isWalkIn,
      status: item.status,
      visitDate: item.visitDate,
    }) || computeIsPendingApprovalWalkInExpired({
      isWalkIn: item.isWalkIn,
      status: item.status,
      visitDate: item.visitDate,
      visitTime: item.visitTime,
      endTime: item.endTime ?? item.scheduledEndTime,
      duration: (item as any).duration,
    });

    return (
      <VisitorRequestCard
        key={item.id}
        request={toTodayVisitorRequest(item)}
        hostName={item.hostDepartment ? `${item.hostName} - ${item.hostDepartment}` : item.hostName}
        isExpired={isExpired}
        showExpiredState={true}
        onPress={() => handleVisitorPress(item)}
      />
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
          <View style={[styles.viewToggle, getPhysicalToggleStyle(isRTL)]}>
            {(['card', 'table'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[
                  styles.viewToggleBtn,
                  {
                    backgroundColor: viewMode === mode ? theme.primary : theme.surface,
                    borderColor: viewMode === mode ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setViewMode(mode)}
              >
                <DDIcon name={mode === 'card' ? 'grid' : 'menu'} size={16} color={viewMode === mode ? theme.buttonText : theme.textSecondary} />
              </Pressable>
            ))}
          </View>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <DirectionalRow style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <RTLHorizontalScrollView
              wrapOnIOS
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.sm, paddingBottom: 2, alignItems: 'center' }}
              nestedScrollEnabled={true}
            >
              {(
                [
                  { key: 'all', label: t('common.all') },
                  { key: 'to_be_checked', label: t('status.toBeChecked') },
                  { key: 'checked_in', label: t('status.checkedIn') },
                  { key: 'checked_out', label: t('status.checkedOut') },
                ] as const
              ).map((option) => (
                <FilterChip
                  key={option.key}
                  label={option.label}
                  isSelected={visitorFilter === option.key && !preciseVisitorStatus}
                  onPress={() => {
                    setVisitorFilter(option.key);
                    setPreciseVisitorStatus(null);
                  }}
                />
              ))}
              <View style={{ flexShrink: 0, alignItems: 'flex-start' }}>
                <StatusDropdown
                  value={preciseVisitorStatus}
                  onChange={(status) => {
                    setPreciseVisitorStatus(status);
                    setVisitorFilter('all');
                  }}
                  statuses={RECEPTIONIST_STATUS_OPTIONS}
                  language={localeCode}
                />
              </View>
            </RTLHorizontalScrollView>
          </View>
          {todaysVisitors.length > 0 ? (
            <Pressable
              onPress={() => navigation.navigate(ROUTES.ALL_VISITORS_TODAY as any)}
              style={({ pressed }) => [
                styles.viewAllButton,
                { opacity: pressed ? 0.7 : 1, flexDirection: getFlexDirection(isRTL), marginStart: Spacing.sm, flexShrink: 0 }
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
                      {
                        backgroundColor: theme.primary,
                        ...(isRTL ? { right: 0 } : { left: 0 }),
                      },
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
    position: 'relative',
    paddingStart: Spacing.lg,
    paddingEnd: Spacing.md,
  },
  dateGroupAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
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
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  viewToggleBtn: {
    padding: Spacing.sm,
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
});
