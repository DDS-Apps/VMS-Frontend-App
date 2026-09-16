import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Alert, Platform, UIManager, useWindowDimensions, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import type { AllVisitorsTodayScreenProps } from "@/types/receptionistNavigation.types";
import { ROUTES } from "@/constants";
import { SkeletonList } from "@/components/shared/Skeleton";
import { RTLHorizontalScrollView, FilterChip, RequestStatusBadge, VisitorMatrixTable, VisitorRequestCard } from "@/components/shared";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from "@/components/ScreenScrollView";
import type { VisitorMatrixItem } from "@/components/shared";
import { SearchInput } from "@/components/SearchInput";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { useTodayVisitorsQuery } from "@/hooks/queries/useReceptionQueries";
import { formatAbsoluteTimestamp } from "@/utils/dateTimeUtils";
import type { TodayVisitorDto, ListReceptionTodayParams } from "@/types";
import { KPICard, KPICardRow } from "@/components/shared/KPICard";
import { mapVisitListItemToVisitorRequest } from "@/utils/requestMappers";
import type { VisitListItemDto } from "@/types/api.types";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import { isReceptionistDashboardVisitorVisible } from "@/utils/receptionistVisitorRules";
import { useRetainedDatedData } from "@/hooks/useRetainedDatedData";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsPendingHostWalkInExpired,
  getPendingApprovalWalkInScheduledEndMs,
} from "@/utils/visitExpiredGuard";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";
import { useUpcomingIndicator } from "@/hooks/useUpcomingVisitTimer";
import { UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES, isUpcomingIndicatorEligibleStatus } from "@/constants/requestConstants";

const ReceptionistUpcomingAlertIcon = React.memo(({ visitDate, visitTime, status }: { visitDate: string; visitTime: string; status: string }) => {
  const { theme } = useTheme();
  const eligible = isUpcomingIndicatorEligibleStatus(status);
  const isUpcoming = useUpcomingIndicator({
    visitDate,
    visitTime,
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type StatusFilter = 'all' | 'walk_in' | 'expected' | 'checked_in' | 'completed';

// ─── Module-level status config helper ───────────────────────────────────────
const getReceptionStatusConfig = (
  status: string,
  theme: ReturnType<typeof useTheme>['theme'],
  t: (key: string) => string,
) => {
  switch (status) {
    case 'checked_in':
      return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
    case 'completed':
      return { label: t('timeline.visitCompleted'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
    case 'checked_out':
      return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
    case 'pending_approval':
      return { label: t('status.pendingApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    case 'pending_host_approval':
      return { label: t('status.pendingHostApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    case 'approved':
    case 'visitor_accepted':
    case 'expected':
      return { label: t('status.toBeChecked'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    case 'rejected':
      return { label: t('status.rejected'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
    case 'cancelled':
      return { label: t('status.cancelled'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
    default:
      return { label: t('status.pending'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
  }
};

// ─── Table Row Component ──────────────────────────────────────────────────────
const TABLE_FIXED_WIDTH = 170;
const TABLE_COL_WIDTH = 150;

const TodayVisitorTableRow = React.memo(({ item, onPress }: { item: TodayVisitorDto; onPress: () => void }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString, formatDateShort } = useFormatters();
  const { isRTL } = useLanguage();

  const statusConfig = getReceptionStatusConfig(item.status, theme, t);

  const fmtTime = (val?: string | null): string => {
    if (!val) return '—';
    if (val.includes('T') || val.includes('Z')) {
      return formatAbsoluteTimestamp(val, { isRTL }, item.timezone ?? 'Asia/Riyadh') || '—';
    }
    return formatTimeFromString(val) || '—';
  };

  return (
    <Pressable onPress={onPress} android_ripple={{ color: applyOpacity(theme.primary, '10') }}>
      <View style={[
        tableStyles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: getFlexDirection(isRTL) },
      ]}>
        {/* Status accent line */}
        <View style={[tableStyles.accentLine, { backgroundColor: statusConfig.border }]} />

        {/* Fixed: visitor name + company */}
        <View style={[tableStyles.fixedCol, { width: TABLE_FIXED_WIDTH, borderEndColor: theme.border }]}>
          <ThemedText style={tableStyles.fixedName} numberOfLines={2}>
            {item.visitor.fullName}
          </ThemedText>
          {item.visitor.company ? (
            <ThemedText style={[tableStyles.fixedCompany, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.visitor.company}
            </ThemedText>
          ) : null}
          {item.isWalkIn ? (
            <View style={{ marginTop: 4 }}>
              <DDIcon name="user-check" size={12} color={theme.warning} />
            </View>
          ) : null}
        </View>

        {/* Scrollable columns */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          persistentScrollbar
          nestedScrollEnabled
          directionalLockEnabled
          contentContainerStyle={{ paddingEnd: Spacing.xl }}
        >
          {/* Visit Date */}
          <View style={[tableStyles.col, { width: TABLE_COL_WIDTH }]}>
            <ThemedText style={[tableStyles.colHeader, { color: theme.textSecondary }]}>
              {t('form.visitDate').toUpperCase()}
            </ThemedText>
            <Spacer height={8} />
            <ThemedText style={tableStyles.colValue}>
              {item.visitDate ? formatDateShort(item.visitDate) : '—'}
            </ThemedText>
          </View>

          {/* Planned In */}
          <View style={[tableStyles.col, { width: TABLE_COL_WIDTH }]}>
            <ThemedText style={[tableStyles.colHeader, { color: theme.textSecondary }]}>
              {t('visitor.plannedIn').toUpperCase()}
            </ThemedText>
            <Spacer height={8} />
            <ThemedText style={tableStyles.colValue}>{fmtTime(item.visitTime)}</ThemedText>
          </View>

          {/* Planned Out */}
          <View style={[tableStyles.col, { width: TABLE_COL_WIDTH }]}>
            <ThemedText style={[tableStyles.colHeader, { color: theme.textSecondary }]}>
              {t('visitor.plannedOut').toUpperCase()}
            </ThemedText>
            <Spacer height={8} />
            <ThemedText style={tableStyles.colValue}>
              {fmtTime(item.endTime ?? item.scheduledEndTime)}
            </ThemedText>
          </View>

          {/* Status */}
          <View style={[tableStyles.col, { width: TABLE_COL_WIDTH }]}>
            <ThemedText style={[tableStyles.colHeader, { color: theme.textSecondary }]}>
              {t('common.status').toUpperCase()}
            </ThemedText>
            <Spacer height={8} />
            <RequestStatusBadge status={item.status} />
          </View>

          {/* Actual In */}
          <View style={[tableStyles.col, { width: TABLE_COL_WIDTH }]}>
            <ThemedText style={[tableStyles.colHeader, { color: theme.textSecondary }]}>
              {t('visitor.actualIn').toUpperCase()}
            </ThemedText>
            <Spacer height={8} />
            <ThemedText style={[tableStyles.colValue, item.checkedInAt ? { color: theme.success, fontWeight: '700' } : {}]}>
              {fmtTime(item.checkedInAt)}
            </ThemedText>
          </View>

          {/* Actual Out */}
          <View style={[tableStyles.col, { width: TABLE_COL_WIDTH }]}>
            <ThemedText style={[tableStyles.colHeader, { color: theme.textSecondary }]}>
              {t('visitor.actualOut').toUpperCase()}
            </ThemedText>
            <Spacer height={8} />
            <ThemedText style={tableStyles.colValue}>{fmtTime(item.checkedOutAt)}</ThemedText>
          </View>
        </ScrollView>
      </View>
    </Pressable>
  );
});

const tableStyles = StyleSheet.create({
  row: {
    minHeight: 90,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  accentLine: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopStartRadius: BorderRadius.md,
    borderBottomStartRadius: BorderRadius.md,
  },
  fixedCol: {
    justifyContent: 'center',
    padding: Spacing.md,
    paddingStart: Spacing.lg,
    borderEndWidth: StyleSheet.hairlineWidth,
  },
  fixedName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fixedCompany: {
    fontSize: 12,
    marginTop: 2,
  },
  col: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  colValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AllVisitorsTodayScreen({ navigation }: AllVisitorsTodayScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();

  // Subtract the fixed sidebar (280px) that is permanently visible on large screens (≥1024px)
  const SIDEBAR_WIDTH = 280;
  const contentWidth = screenWidth >= 1024 ? screenWidth - SIDEBAR_WIDTH : screenWidth;

  // Column count uses full screenWidth thresholds so "web" (≥1024px) always gets 3 cols.
  // Card pixel width uses contentWidth so cards don't overflow behind the sidebar.
  const numColumns = screenWidth >= 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  // Pixel-based width avoids the percentage + gap overflow issue in RN flexWrap
  const cardWidth = numColumns === 1
    ? undefined
    : (contentWidth - Spacing.lg * 2 - Spacing.md * (numColumns - 1)) / numColumns;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // walk_in filtering is client-side (API does not accept walk_in as a status)
  const queryParams = useMemo<ListReceptionTodayParams | undefined>(
    () =>
      statusFilter !== 'all' && statusFilter !== 'walk_in'
        ? { status: statusFilter }
        : undefined,
    [statusFilter],
  );

  const { data: todayResponse, isLoading, isFetching, isError, error, refetch, isPlaceholderData } = useTodayVisitorsQuery(queryParams);
  const retainedInput = useMemo(
    () => (!isPlaceholderData && todayResponse
      ? { response: todayResponse, params: queryParams }
      : undefined),
    [isPlaceholderData, todayResponse, queryParams],
  );
  const retainedQuery = useRetainedDatedData(
    JSON.stringify(queryParams ?? null),
    retainedInput,
  );
  const displayedResponse = retainedQuery.data?.response;
  const displayedQueryParams = retainedQuery.data?.params;
  const displayedQuerySourceLabel = useMemo(() => {
    switch (displayedQueryParams?.status) {
      case 'expected':
        return t('visitor.expectedVisitors');
      case 'checked_in':
        return t('status.checkedIn');
      case 'completed':
        return t('timeline.visitCompleted');
      default:
        return t('common.all');
    }
  }, [displayedQueryParams?.status, t]);

  const todaysVisitors = (displayedResponse?.data ?? []).filter(isReceptionistDashboardVisitorVisible);
  const summary = displayedResponse?.summary ?? { expected: 0, checkedIn: 0, completed: 0, pending: 0 };
  const expirationBoundaries = useMemo(
    () =>
      todaysVisitors.map((visitor) =>
        getPendingApprovalWalkInScheduledEndMs({
          isWalkIn: visitor.isWalkIn,
          status: visitor.status,
          visitDate: visitor.visitDate,
          visitTime: visitor.visitTime,
          endTime: visitor.endTime ?? visitor.scheduledEndTime,
          duration: (visitor as any).duration,
        }),
      ),
    [todaysVisitors],
  );
  const expirationTick = useTimeBoundaryTick(expirationBoundaries);


  const hasShownError = useRef(false);

  useEffect(() => {
    if (isError && error && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(t('common.error'), error?.message || t('common.loadError'));
    }
    if (!isError) {
      hasShownError.current = false;
    }
  }, [isError, error, t]);

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'walk_in', label: t('visitor.walkIn') },
    { key: 'expected', label: t('visitor.expectedVisitors') },
    { key: 'checked_in', label: t('status.checkedIn') },
    { key: 'completed', label: t('timeline.visitCompleted') },
  ];

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const filteredVisitors = useMemo(() => {
    let result = todaysVisitors;

    // Walk-in is filtered client-side since the API does not support that status value
    if (statusFilter === 'walk_in') {
      result = result.filter(v => v.isWalkIn === true);
    }

    if (!searchQuery.trim()) return result;

    return result.filter(visitor => {
      const name = visitor.visitor.fullName.toLowerCase();
      const phone = visitor.visitor.phone ?? '';
      const company = (visitor.visitor.company ?? '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || phone.includes(searchQuery) || company.includes(query);
    });
  }, [todaysVisitors, searchQuery, statusFilter]);

  if (isLoading && !displayedResponse) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (isError && !displayedResponse) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
        <Spacer height={Spacing.md} />
        <Pressable onPress={() => refetch()}>
          <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>{t('common.retry')}</ThemedText>
        </Pressable>
      </View>
    );
  }

  const toMatrixItem = useCallback((v: TodayVisitorDto): VisitorMatrixItem => ({
    id: v.id,
    visitorName: v.visitor.fullName,
    company: v.visitor.company ?? undefined,
    visitDate: v.visitDate ?? undefined,
    plannedInTime: v.visitTime,
    plannedOutTime: v.endTime ?? v.scheduledEndTime ?? undefined,
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
    hasMeetingRoom: !!(v.isMeetingRoom || v.hasMeetingRoom || v.meetingRoom),
    hostName: v.hostName ?? undefined,
    hostDepartment: v.hostDepartment ?? undefined,
    purpose: v.purpose ?? undefined,
    isExpired: computeIsPendingHostWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
    }) || computeIsPendingApprovalWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
      visitTime: v.visitTime,
      endTime: v.endTime ?? v.scheduledEndTime,
      duration: (v as any).duration,
    }),
  }), [expirationTick, riyadhBusinessDateKey]);

  const handleVisitorPress = (visitor: TodayVisitorDto) => {
    const today = new Date().toISOString().split('T')[0];
    const legacyVisitor = {
      id: visitor.id,
      name: visitor.visitor.fullName,
      company: visitor.visitor.company ?? '',
      time: visitor.visitTime,
      host: visitor.hostName,
      hostDepartment: visitor.hostDepartment,
      status: (visitor.status === 'expected' ? 'pending' : visitor.status) as 'pending' | 'checked_in' | 'completed',
      isWalkIn: false,
      phone: visitor.visitor.phone ?? '',
      meetingRoom: visitor.meetingRoom ? { name: visitor.meetingRoom.name, floor: visitor.meetingRoom.floor } : undefined,
      origin: 'scheduled' as const,
      scheduledFor: today,
      createdAt: today,
    };
    navigation.navigate(ROUTES.VISITOR_DETAIL as any, { visitor: legacyVisitor } as any);
  };

  const toVisitorRequest = (visitor: TodayVisitorDto) => mapVisitListItemToVisitorRequest({
    id: visitor.id,
    employeeName: visitor.hostName,
    visitor: visitor.visitor,
    visitDate: visitor.visitDate ?? '',
    visitTime: visitor.visitTime,
    visitStartAt: visitor.visitStartAt,
    timezone: visitor.timezone,
    endTime: visitor.endTime ?? visitor.scheduledEndTime ?? null,
    checkedInAt: visitor.checkedInAt,
    checkedOutAt: visitor.checkedOutAt,
    status: visitor.status,
    purpose: visitor.purpose ?? '',
    isWalkIn: visitor.isWalkIn ?? false,
    createdAt: visitor.visitDate ?? '',
    hasParking: visitor.hasParking,
    hasMeetingRoom: visitor.hasMeetingRoom,
    hasBuffet: visitor.hasBuffet,
    hasValet: visitor.hasValet,
    isBuffet: visitor.isBuffet,
    isMeetingRoom: visitor.isMeetingRoom,
    parkingDecision: (visitor as any).parkingDecision,
    isVisitorNeedsParking: visitor.isVisitorNeedsParking,
    visitorNeedsParking: visitor.visitorNeedsParking,
  } as VisitListItemDto);

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
        request={toVisitorRequest(item)}
        hostName={item.hostName}
        width={cardWidth}
        isExpired={isExpired}
        showExpiredState={true}
        onPress={() => handleVisitorPress(item)}
      />
    );
  };

  return (
    <ScreenScrollView
      contentContainerStyle={scrollContentStyle}
      directionalLockEnabled={true}
      refreshControl={<RefreshControl refreshing={isFetching && !!displayedResponse} onRefresh={refetch} tintColor={theme.primary} />}
    >
      <DirectionalRow style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '700' }]}>
            {t('navigation.todaysVisitors')}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {todaysVisitors.length} {t('dashboard.expectedToday').toLowerCase()}
          </ThemedText>
        </View>
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      {retainedQuery.isRetained ? (
        <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.primary, '10') }]}>
          <DDIcon name="info" size={16} color={theme.primary} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, flex: 1 }]}>
            {t('requests.showingPreviousDataFrom').replace('{{source}}', displayedQuerySourceLabel)}
          </ThemedText>
          {isError ? (
            <Pressable onPress={() => refetch()} hitSlop={8}>
              <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                {t('common.retry')}
              </ThemedText>
            </Pressable>
          ) : null}
        </DirectionalRow>
      ) : isError ? (
        <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.error, '10') }]}>
          <DDIcon name="alert-circle" size={16} color={theme.error} />
          <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>{t('common.loadError')}</ThemedText>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>{t('common.retry')}</ThemedText>
          </Pressable>
        </DirectionalRow>
      ) : isFetching && displayedResponse ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : null}

      {(retainedQuery.isRetained || isError || (isFetching && displayedResponse)) ? <Spacer height={Spacing.md} /> : null}

      <KPICardRow>
        <KPICard
          title={t('visitor.expectedVisitors')}
          value={todaysVisitors.length}
          icon="clock"
          color={theme.warning}
        />
        <KPICard
          title={t('status.checkedIn')}
          value={summary.checkedIn}
          icon="log-in"
          color={theme.success}
        />
        <KPICard
          title={t('status.checkedOut')}
          value={summary.completed}
          icon="log-out"
          color={theme.textSecondary}
        />
      </KPICardRow>

      <Spacer height={Spacing.lg} />

      <SearchInput
        placeholder={t('reception.searchVisitor')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.md} />

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        nestedScrollEnabled={true}
      >
        {FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            isSelected={statusFilter === option.key}
            onPress={() => setStatusFilter(option.key)}
          />
        ))}
      </RTLHorizontalScrollView>

      <Spacer height={Spacing.lg} />

      {filteredVisitors.length > 0 ? (
        <VisitorMatrixTable
          variant="matrix"
          visitors={filteredVisitors.map(toMatrixItem)}
          showExpiredState={true}
          onPressRow={(id) => {
            const v = filteredVisitors.find(x => x.id === id);
            if (v) handleVisitorPress(v);
          }}
        />
      ) : (
        <View style={styles.emptyState}>
          <DDIcon name="users" size={40} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {t('common.noResults')}
          </ThemedText>
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  filterScrollContent: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cardList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gridItem3: {
    flexBasis: '32%',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '32%',
    minWidth: 0,
  },
  gridItem2: {
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '48%',
    minWidth: 0,
  },
  gridItem1: {
    width: '100%',
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
  servicesIconsRow: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  serviceIconPill: {
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  loadingContainer: {
    flex: 1,
  },
  inlineFeedback: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  tableList: {
    gap: Spacing.md,
  },
  viewToggle: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
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
