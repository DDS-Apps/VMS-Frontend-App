import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import {
  useNavigation,
  ParamListBase,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ROUTES } from "@/constants";
import { useRefetchOnRefocus } from "@/hooks/useRefetchOnRefocus";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography, getInputFontFamily } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/vms.types";
import { SkeletonCard, VisitorRequestCard, LoadingButton, RTLHorizontalScrollView, FilterChip, VisitorMatrixTable } from "@/components/shared";
import type { VisitorMatrixItem } from "@/components/shared";
import { BlurView } from 'expo-blur';
import {
  useInfiniteVisitsQuery,
  usePendingApprovalsQuery,
  useAwaitingVisitorQuery,
  usePendingHostWalkInsQuery,
  useApproveVisitMutation,
  useRejectVisitMutation,
} from "@/hooks/queries/useApprovalQueries";
import {
  mapVisitListItemToVisitorRequest,
  mapAwaitingVisitorToVisitorRequest,
  mapPendingApprovalToVisitorRequest,
  mapPendingHostWalkInToVisitorRequest,
} from "@/utils/requestMappers";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { isVisitExpired, getServerDateParts, getBusinessDateKey } from "@/utils/dateTimeUtils";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsPendingHostWalkInExpired,
  computeIsVisitExpired,
} from "@/utils/visitExpiredGuard";
import {
  formatVisitDateLabel,
  groupVisitsByDate,
} from "@/utils/groupVisitsByDate";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import { DashboardKpiSection } from "@/components/shared/DashboardKpiSection";
import { getLocalizedApiErrorMessage } from "@/utils/apiErrorMessage";

const { width: screenWidth } = Dimensions.get("window");

interface OverviewScreenProps {
  userRole: UserRole;
  userName?: string;
}

export default function OverviewScreen({
  userRole,
  userName,
}: OverviewScreenProps) {
  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL, localeCode } = useLanguage();
  const { formatDate: fmtDate } = useFormatters();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  // ScreenScrollView already provides paddingHorizontal: Spacing.xl
  const scrollContentStyle = {};

  const {
    data: pendingData,
    isLoading: pendingLoading,
    isFetching: pendingFetching,
    error: pendingError,
    refetch: refetchPending,
  } = usePendingApprovalsQuery({ limit: 10 }, userRole === "manager");
  const {
    data: awaitingData,
    isLoading: awaitingLoading,
    isFetching: awaitingFetching,
    error: awaitingError,
    refetch: refetchAwaiting,
  } = useAwaitingVisitorQuery(
    { limit: 10 },
    userRole === "manager" || userRole === "employee",
  );
  const {
    data: walkInData,
    isLoading: walkInLoading,
    isFetching: walkInFetching,
    error: walkInError,
    refetch: refetchWalkIn,
  } = usePendingHostWalkInsQuery(
    { limit: 10 },
    userRole === "manager" || userRole === "employee",
  );

  // Approval mutations
  const approveMutation = useApproveVisitMutation();
  const rejectMutation = useRejectVisitMutation();
  
  // State for approval actions
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [dashboardViewMode, setDashboardViewMode] = useState<'card' | 'list'>('list');
  
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;
  const { isDark } = useTheme();

  const handleApprove = useCallback((requestId: string) => {
    if (isProcessing) return;
    setApprovingRequestId(requestId);
    approveMutation.mutate(
      { id: requestId, payload: {} },
      {
        onSuccess: () => {
          setApprovingRequestId(null);
          refetchPending();
        },
        onError: (error) => {
          setApprovingRequestId(null);
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  }, [isProcessing, approveMutation, refetchPending, t]);

  const handleReject = useCallback((requestId: string) => {
    if (isProcessing) return;
    setActiveRequestId(requestId);
    setShowRejectModal(true);
  }, [isProcessing]);

  const handleRejectSubmit = useCallback(() => {
    if (!activeRequestId) return;
    const reason = rejectionReason.trim() || 'No reason provided';
    setRejectingRequestId(activeRequestId);
    rejectMutation.mutate(
      { id: activeRequestId, payload: { reason } },
      {
        onSuccess: () => {
          setRejectingRequestId(null);
          setShowRejectModal(false);
          setActiveRequestId(null);
          setRejectionReason('');
          refetchPending();
        },
        onError: (error) => {
          setRejectingRequestId(null);
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  }, [activeRequestId, rejectionReason, rejectMutation, refetchPending, t]);

  const handleRejectCancel = useCallback(() => {
    if (rejectMutation.isPending) return;
    setShowRejectModal(false);
    setActiveRequestId(null);
    setRejectionReason('');
  }, [rejectMutation.isPending]);

  // Refresh the sections when the screen regains focus (the mount fetch covers
  // the first focus). refetch() bypasses 'enabled', so the role guards stay:
  // pending approvals return 403 for non-managers.
  const refocusRefetchers = useMemo(() => {
    const refetchers: Array<(options?: { cancelRefetch?: boolean }) => unknown> = [];
    if (userRole === "manager") {
      refetchers.push(refetchPending);
    }
    if (userRole === "manager" || userRole === "employee") {
      refetchers.push(refetchAwaiting, refetchWalkIn);
    }
    return refetchers;
  }, [refetchPending, refetchAwaiting, refetchWalkIn, userRole]);
  useRefetchOnRefocus(refocusRefetchers);

  const pendingApprovals = useMemo(() => {
    return pendingData?.data?.map(mapPendingApprovalToVisitorRequest) || [];
  }, [pendingData]);

  const pendingApprovalTableItems = useMemo<VisitorMatrixItem[]>(
    () => pendingApprovals.slice(0, 5).map((request) => ({
      id: request.id,
      visitorName: request.visitor.fullName,
      company: request.visitor.company || undefined,
      visitDate: request.visitDate,
      plannedInTime: request.visitTime,
      plannedOutTime: request.endTime,
      status: request.status,
      hostName: request.employeeName || undefined,
      hasParking: resolveParkingDisplayDecision(request) === 'required',
      hasBuffet: !!request.buffet,
      hasValet: !!request.valet,
      hasMeetingRoom: !!request.meetingRoom,
      purpose: request.purpose || undefined,
      isExpired: isVisitExpired(request.visitDate, request.visitTime, request.endTime, request.duration),
    })),
    [pendingApprovals],
  );

  const awaitingVisitorAcceptance = useMemo(() => {
    return awaitingData?.data?.map(mapAwaitingVisitorToVisitorRequest) || [];
  }, [awaitingData]);

  const walkInVisitors = useMemo(() => {
    return walkInData?.data?.map(mapPendingHostWalkInToVisitorRequest) || [];
  }, [walkInData]);

  const awaitingVisitorTableItems = useMemo<VisitorMatrixItem[]>(
    () => awaitingVisitorAcceptance.slice(0, 5).map((request) => ({
      id: request.id,
      visitorName: request.visitor.fullName,
      company: request.visitor.company || undefined,
      visitDate: request.visitDate,
      plannedInTime: request.visitTime,
      plannedOutTime: request.endTime,
      status: request.status,
      hostName: request.employeeName || undefined,
      hasParking: resolveParkingDisplayDecision(request) === 'required',
      hasBuffet: !!request.buffet,
      hasValet: !!request.valet,
      hasMeetingRoom: !!request.meetingRoom,
      purpose: request.purpose || undefined,
      isExpired: isVisitExpired(request.visitDate, request.visitTime, request.endTime, request.duration),
    })),
    [awaitingVisitorAcceptance],
  );

  const walkInVisitorTableItems = useMemo<VisitorMatrixItem[]>(
    () => walkInVisitors.slice(0, 5).map((request) => ({
      id: request.id,
      visitorName: request.visitor.fullName,
      company: request.visitor.company || undefined,
      visitDate: request.visitDate,
      plannedInTime: request.visitTime,
      plannedOutTime: request.endTime,
      status: request.status,
      hostName: request.employeeName || undefined,
      hasParking: resolveParkingDisplayDecision(request) === 'required',
      hasBuffet: !!request.buffet,
      hasValet: !!request.valet,
      hasMeetingRoom: !!request.meetingRoom,
      purpose: request.purpose || undefined,
      isExpired: computeIsVisitExpired(
        request.visitDate,
        request.visitTime,
        request.endTime,
        request.duration,
        { isWalkIn: request.isWalkIn },
      ),
    })),
    [walkInVisitors, riyadhBusinessDateKey],
  );

  // Upcoming Visits only ever shows today onward, so the query starts at the
  // current Riyadh business date rather than the 1st of the month: days already
  // gone would be downloaded (100 rows a page) and then discarded. The range
  // still ends at the Riyadh month boundary to match server-side business logic.
  const { year: _ry, month: _rm } = getServerDateParts(new Date(), 'Asia/Riyadh');
  const _lastDayOfMonth = new Date(_ry, _rm, 0).getDate();
  const endOfCurrentMonthStr = `${_ry}-${String(_rm).padStart(2, '0')}-${String(_lastDayOfMonth).padStart(2, '0')}`;
  const upcomingRangeStartStr =
    riyadhBusinessDateKey <= endOfCurrentMonthStr ? riyadhBusinessDateKey : endOfCurrentMonthStr;
  const isEmployeeOrManager = userRole === 'employee' || userRole === 'manager';

  // Employee/Manager dashboard query — pages through all of the current user's
  // remaining records this month so the preview is never capped by a single
  // page limit.
  const {
    data: monthlyVisitsInfinite,
    hasNextPage: monthlyHasNextPage,
    fetchNextPage: monthlyFetchNextPage,
    isFetchingNextPage: monthlyIsFetchingNextPage,
    isLoading: monthlyVisitsLoading,
    isFetching: monthlyVisitsFetching,
    error: monthlyVisitsError,
    refetch: refetchMonthlyVisits,
  } = useInfiniteVisitsQuery(
    { startDate: upcomingRangeStartStr, endDate: endOfCurrentMonthStr, myRequestsOnly: true, limit: 100 },
    isEmployeeOrManager,
  );

  // Auto-page through the remaining records so the upcoming visit preview is complete.
  useEffect(() => {
    if (isEmployeeOrManager && monthlyHasNextPage && !monthlyIsFetchingNextPage) {
      monthlyFetchNextPage();
    }
  }, [isEmployeeOrManager, monthlyHasNextPage, monthlyIsFetchingNextPage, monthlyFetchNextPage]);

  // ── Upcoming Visits status filter (employee & manager home) ────────────────
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'to_be_checked' | 'checked_in' | 'checked_out'>('all');

  const TO_BE_CHECKED_STATUSES = ['expected', 'pending', 'approved', 'visitor_accepted'];

  const allMonthlyRequests = useMemo(() => {
    return (monthlyVisitsInfinite?.pages.flatMap((p) => p.data) ?? []).map(
      mapVisitListItemToVisitorRequest,
    );
  }, [monthlyVisitsInfinite]);

  const filteredDashboardRequests = useMemo(() => {
    let result = allMonthlyRequests;
    if (visitorFilter === 'to_be_checked') {
      result = result.filter((r) => TO_BE_CHECKED_STATUSES.includes(r.status));
    } else if (visitorFilter === 'checked_in') {
      result = result.filter((r) => r.status === 'checked_in');
    } else if (visitorFilter === 'checked_out') {
      result = result.filter((r) => r.status === 'completed');
    }
    return result;
  }, [allMonthlyRequests, visitorFilter]);

  // Upcoming Visits must mean upcoming: today onward, earliest first — never a
  // past date, and never today buried behind earlier records. The query already
  // starts at today's Riyadh date, but cached pages can predate a midnight
  // rollover, so filter to today-or-later here before picking the 10-card preview.
  const upcomingDashboardRequests = useMemo(() => {
    const todayKey = getBusinessDateKey(new Date(), 'Asia/Riyadh');
    return filteredDashboardRequests
      .filter((r) => Boolean(r.visitDate) && r.visitDate >= todayKey)
      .sort((a, b) => {
        const timeA = a.visitStartAt ? Date.parse(a.visitStartAt) : NaN;
        const timeB = b.visitStartAt ? Date.parse(b.visitStartAt) : NaN;
        if (!Number.isNaN(timeA) && !Number.isNaN(timeB)) return timeA - timeB;
        // Fall back to the date/time strings when a canonical timestamp is missing.
        if (a.visitDate !== b.visitDate) return a.visitDate.localeCompare(b.visitDate);
        return (a.visitTime || '').localeCompare(b.visitTime || '');
      });
  }, [filteredDashboardRequests, riyadhBusinessDateKey]);

  // Keep the existing 10-card dashboard preview, but present those cards in
  // chronological visit-date sections instead of a flat list.
  const groupedDashboardRequests = useMemo(
    () => groupVisitsByDate(upcomingDashboardRequests.slice(0, 10)),
    [upcomingDashboardRequests],
  );

  const upcomingVisitTableItems = useMemo<VisitorMatrixItem[]>(
    () => upcomingDashboardRequests.slice(0, 10).map((request) => ({
      id: request.id,
      visitorName: request.visitor.fullName,
      company: request.visitor.company || undefined,
      visitDate: request.visitDate,
      plannedInTime: request.visitTime,
      plannedOutTime: request.endTime,
      status: request.status,
      hostName: request.employeeName || undefined,
      hasParking: resolveParkingDisplayDecision(request) === 'required',
      hasBuffet: !!request.buffet,
      hasValet: !!request.valet,
      hasMeetingRoom: !!request.meetingRoom,
      purpose: request.purpose || undefined,
      isExpired: request.isWalkIn && request.status === "pending_host_approval"
        ? computeIsPendingHostWalkInExpired(request)
        : isVisitExpired(request.visitDate, request.visitTime, request.endTime, request.duration),
    })),
    [upcomingDashboardRequests],
  );

  const cardWidth = Math.min(screenWidth - 2 * Spacing.lg, 320);

  const renderSectionFeedback = (
    hasUsableData: boolean,
    loading: boolean,
    fetching: boolean,
    error: unknown,
    retry: () => unknown,
  ) => {
    const localizedError = error ? getLocalizedApiErrorMessage(error, t) : "";
    // React Query normally ignores an aborted query. Keep this defensive
    // guard so an intentional navigation cancellation never becomes an error
    // banner or a misleading empty-state success.
    if (error && !localizedError) return null;

    if (!hasUsableData) {
      if (loading || fetching) {
        return <SkeletonCard showImage={false} lines={2} />;
      }
      return (
        <View style={[styles.sectionFeedback, { backgroundColor: theme.surface }]}>
          <DDIcon name="alert-triangle" size={20} color={theme.error} />
          <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
            {localizedError || t("common.loadError")}
          </ThemedText>
          <Pressable onPress={retry} hitSlop={8}>
            <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: "600" }]}>
              {t("common.retry")}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    if (!fetching && !error) return null;
    return (
      <View style={[styles.sectionFeedback, { backgroundColor: theme.surface }]}>
        {fetching ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <DDIcon name="alert-circle" size={16} color={theme.error} />
        )}
        <ThemedText style={[Typography.caption, { color: error && !fetching ? theme.error : theme.textSecondary, flex: 1 }]}>
          {fetching ? t("common.loading") : localizedError || t("common.loadError")}
        </ThemedText>
        {error && !fetching ? (
          <Pressable onPress={retry} hitSlop={8}>
            <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: "600" }]}>
              {t("common.retry")}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <ScreenScrollView skipTopPadding contentContainerStyle={scrollContentStyle}>
        {/* 1. Welcome Heading - Employee & Manager */}
        {(userRole === "employee" || userRole === "manager") && (
          <>
            <View style={styles.welcomeSection}>
              <ThemedText
                style={[
                  Typography.title,
                  { fontSize: 20, textAlign: "center", fontWeight: "600" },
                ]}
              >
                {t("dashboard.hello")}, {userName || "User"}
              </ThemedText>
              <ThemedText
                style={[
                  Typography.bodySmall,
                  {
                    color: theme.textSecondary,
                    textAlign: "center",
                    marginTop: 4,
                    fontSize: 13,
                  },
                ]}
              >
                {t("time.today")} {fmtDate(new Date(), "short")}
              </ThemedText>
            </View>

            <Spacer height={Spacing.lg} />
          </>
        )}

        {/* 2. API KPI cards are supported for employee and manager dashboards only. */}
        {isEmployeeOrManager ? (
          <DashboardKpiSection />
        ) : null}

        <Spacer height={Spacing.xxl} />

        {/* 3. Upcoming Visits Section - Employee & Manager */}
        {(userRole === "employee" || userRole === "manager") && (
          <>
            <View>
              <DirectionalRow style={styles.header}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                    {t("dashboard.upcomingVisits")}
                  </ThemedText>
                  <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4, fontSize: 12 }]}>
                    {t("time.thisMonth")}
                  </ThemedText>
                </View>
                <DirectionalRow style={styles.viewToggle}>
                  <Pressable
                    onPress={() => setDashboardViewMode('card')}
                    style={[
                      styles.viewToggleBtn,
                      styles.viewToggleBtnLeft,
                      {
                        backgroundColor: dashboardViewMode === 'card' ? theme.primary : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <DDIcon
                      name="grid"
                      size={16}
                      color={dashboardViewMode === 'card' ? theme.buttonText : theme.textSecondary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => setDashboardViewMode('list')}
                    style={[
                      styles.viewToggleBtn,
                      styles.viewToggleBtnRight,
                      {
                        backgroundColor: dashboardViewMode === 'list' ? theme.primary : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <DDIcon
                      name="menu"
                      size={16}
                      color={dashboardViewMode === 'list' ? theme.buttonText : theme.textSecondary}
                    />
                  </Pressable>
                </DirectionalRow>
              </DirectionalRow>

              <Spacer height={Spacing.md} />

              {/* Status filter chips */}
              <DirectionalRow style={styles.upcomingFilterRow}>
                <RTLHorizontalScrollView
                  style={styles.upcomingFilterScroller}
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
                <Pressable
                  onPress={() =>
                    navigation.navigate(
                      ROUTES.VISITOR_REQUESTS as any,
                      { initialTab: "all" } as any,
                    )
                  }
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    {
                      opacity: pressed ? 0.7 : 1,
                      flexDirection: getFlexDirection(isRTL),
                      gap: Spacing.xs,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      { color: theme.primary, fontWeight: "500", fontSize: 13 },
                    ]}
                  >
                    {t("common.viewAll")}
                  </ThemedText>
                  <DDIcon name="chevron-right" size={16} color={theme.primary} directionAware />
                </Pressable>
              </DirectionalRow>

              <Spacer height={Spacing.lg} />

              {monthlyVisitsInfinite === undefined ? (
                renderSectionFeedback(
                  false,
                  monthlyVisitsLoading,
                  monthlyVisitsFetching,
                  monthlyVisitsError,
                  refetchMonthlyVisits,
                )
              ) : (
                <>
                  {renderSectionFeedback(true, monthlyVisitsLoading, monthlyVisitsFetching, monthlyVisitsError, refetchMonthlyVisits)}
                  {upcomingDashboardRequests.length > 0 && dashboardViewMode === 'list' ? (
                <VisitorMatrixTable
                  variant="matrix"
                  visitors={upcomingVisitTableItems}
                  onPressRow={(requestId) =>
                    navigation.navigate(
                      ROUTES.REQUEST_DETAILS as any,
                      { requestId } as any,
                    )
                  }
                  emptyMessage={t("dashboard.noUpcomingVisitors")}
                />
              ) : upcomingDashboardRequests.length > 0 ? (
                <>
                  {groupedDashboardRequests.map((group, index) => (
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
                        <ThemedText
                          style={[styles.dateGroupLabel, { color: theme.text }]}
                        >
                          {group.date === "unknown"
                            ? t("common.date")
                            : formatVisitDateLabel(group.date, localeCode, {
                                today: t("common.today"),
                                tomorrow: t("time.tomorrow"),
                              })}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.dateGroupCount,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {group.visits.length}
                        </ThemedText>
                      </DirectionalRow>

                      <Spacer height={Spacing.md} />

                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: Spacing.sm,
                        }}
                      >
                        {group.visits.map((request) => (
                          <View
                            key={request.id}
                            style={
                              screenWidth >= 900
                                ? { flex: 1, minWidth: 260 }
                                : screenWidth >= 600
                                ? { flex: 1, minWidth: 280 }
                                : { width: '100%' }
                            }
                          >
                            <VisitorRequestCard
                              request={request}
                              onPress={() =>
                                navigation.navigate(
                                  ROUTES.REQUEST_DETAILS as any,
                                  { requestId: request.id } as any,
                                )
                              }
                            />
                          </View>
                        ))}
                      </View>

                      {index < groupedDashboardRequests.length - 1 ? (
                        <Spacer height={Spacing.xl} />
                      ) : null}
                    </View>
                  ))}
                </>
                  ) : (
                <ThemedView
                  style={[
                    styles.emptyCarousel,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <DDIcon name="calendar" size={32} color={theme.textSecondary} />
                  <Spacer height={Spacing.sm} />
                  <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                    {t("dashboard.noUpcomingVisitors")}
                  </ThemedText>
                </ThemedView>
                  )}
                </>
              )}
            </View>

            <Spacer height={Spacing.xxl} />

          </>
        )}

        {/* 5. Pending Approvals Section - Manager Only */}
        {userRole === "manager" && (
          <>
            <View>
              <DirectionalRow style={styles.header}>
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <ThemedText
                    style={[
                      styles.sectionTitle,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    {t("dashboard.pendingApprovals")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        color: theme.textSecondary,
                        marginTop: 4,
                        fontSize: 12,
                      },
                    ]}
                  >
                    {t("dashboard.requestsAwaitingApproval")}
                  </ThemedText>
                </View>
                <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                  {pendingApprovals.length > 0 ? (
                    <Pressable
                      onPress={() => navigation.navigate(ROUTES.APPROVALS as any)}
                      style={({ pressed }) => [
                        styles.viewAllButton,
                        {
                          opacity: pressed ? 0.7 : 1,
                          flexDirection: getFlexDirection(isRTL),
                          gap: Spacing.xs,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          Typography.bodySmall,
                          {
                            color: theme.primary,
                            fontWeight: "500",
                            fontSize: 13,
                          },
                        ]}
                      >
                        {t("common.viewAll")}
                      </ThemedText>
                      <DDIcon
                        name="chevron-right"
                        size={16}
                        color={theme.primary}
                        directionAware
                      />
                    </Pressable>
                  ) : null}
                </DirectionalRow>
              </DirectionalRow>

              <Spacer height={Spacing.lg} />

              {pendingData === undefined ? (
                renderSectionFeedback(false, pendingLoading, pendingFetching, pendingError, refetchPending)
              ) : (
                <>
                  {renderSectionFeedback(true, pendingLoading, pendingFetching, pendingError, refetchPending)}
                  {pendingApprovals.length > 0 && dashboardViewMode === 'list' ? (
                <VisitorMatrixTable
                  variant="matrix"
                  visitors={pendingApprovalTableItems}
                  onPressRow={(requestId) => {
                    navigation.navigate(
                      ROUTES.MANAGER_APPROVAL_DETAIL as any,
                      { requestId } as any,
                    );
                  }}
                  showApproveReject
                  onApprove={handleApprove}
                  onReject={handleReject}
                  emptyMessage={t("common.noResults")}
                />
              ) : pendingApprovals.length > 0 ? (
                <RTLHorizontalScrollView
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  snapToInterval={cardWidth + Spacing.md}
                  decelerationRate="fast"
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  directionalLockEnabled={true}
                  scrollEventThrottle={16}
                >
                  {pendingApprovals.slice(0, 5).map((request, index) => {
                    const expired = isVisitExpired(request.visitDate, request.visitTime, request.endTime, request.duration);
                    return (
                      <VisitorRequestCard
                        key={request.id}
                        request={request}
                        onPress={() => {
                          navigation.navigate(
                            ROUTES.MANAGER_APPROVAL_DETAIL as any,
                            { requestId: request.id } as any,
                          );
                        }}
                        width={cardWidth}
                        accentColor={theme.primary}
                        showRequestedBy={true}
                        showActions={true}
                        onApprove={() => handleApprove(request.id)}
                        onReject={() => handleReject(request.id)}
                        isProcessing={isProcessing}
                        approveLoading={approvingRequestId === request.id}
                        rejectLoading={rejectingRequestId === request.id}
                        isExpired={expired}
                        style={
                          index > 0
                            ? isRTL
                              ? { marginEnd: Spacing.md }
                              : { marginStart: Spacing.md }
                            : undefined
                        }
                      />
                    );
                  })}
                </RTLHorizontalScrollView>
                  ) : (
                <ThemedView
                  style={[
                    styles.emptyCarousel,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <DDIcon name="check-circle" size={32} color={theme.success} />
                  <Spacer height={Spacing.sm} />
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {t("dashboard.noPendingApprovals")}
                  </ThemedText>
                </ThemedView>
                  )}
                </>
              )}
            </View>

            <Spacer height={Spacing.xxl} />
          </>
        )}

        {/* 6. Awaiting Visitor Acceptance Section - Manager & Employee */}
        {(userRole === "manager" || userRole === "employee") && (
          <>
            <View>
              <DirectionalRow style={styles.header}>
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <ThemedText
                    style={[
                      styles.sectionTitle,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    {t("navigation.awaitingVisitor")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        color: theme.textSecondary,
                        marginTop: 4,
                        fontSize: 12,
                      },
                    ]}
                  >
                    {t("dashboard.awaitingResponse")}
                  </ThemedText>
                </View>
                {awaitingVisitorAcceptance.length > 0 && (
                  <Pressable
                    onPress={() =>
                      navigation.navigate("VisitorRequests", {
                        initialTab:
                          userRole === "manager" ? "awaiting" : "waiting",
                      })
                    }
                    style={({ pressed }) => [
                      styles.viewAllButton,
                      {
                        opacity: pressed ? 0.7 : 1,
                        flexDirection: getFlexDirection(isRTL),
                        gap: Spacing.xs,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        Typography.bodySmall,
                        {
                          color: theme.primary,
                          fontWeight: "500",
                          fontSize: 13,
                        },
                      ]}
                    >
                      {t("common.viewAll")}
                    </ThemedText>
                    <DDIcon
                      name="chevron-right"
                      size={16}
                      color={theme.primary}
                      directionAware
                    />
                  </Pressable>
                )}
              </DirectionalRow>

              <Spacer height={Spacing.lg} />

              {awaitingData === undefined ? (
                renderSectionFeedback(false, awaitingLoading, awaitingFetching, awaitingError, refetchAwaiting)
              ) : (
                <>
                  {renderSectionFeedback(true, awaitingLoading, awaitingFetching, awaitingError, refetchAwaiting)}
                  {awaitingVisitorAcceptance.length > 0 && dashboardViewMode === 'list' ? (
                <VisitorMatrixTable
                  variant="matrix"
                  visitors={awaitingVisitorTableItems}
                  onPressRow={(requestId) => {
                    navigation.navigate(
                      ROUTES.REQUEST_DETAILS as any,
                      { requestId } as any,
                    );
                  }}
                  emptyMessage={t("dashboard.noAwaitingVisitors")}
                />
              ) : awaitingVisitorAcceptance.length > 0 ? (
                <RTLHorizontalScrollView
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  snapToInterval={cardWidth + Spacing.md}
                  decelerationRate="fast"
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  directionalLockEnabled={true}
                  scrollEventThrottle={16}
                >
                  {awaitingVisitorAcceptance
                    .slice(0, 5)
                    .map((request, index) => (
                      <VisitorRequestCard
                        key={request.id}
                        request={request}
                        onPress={() => {
                          navigation.navigate(
                            ROUTES.REQUEST_DETAILS as any,
                            { requestId: request.id } as any,
                          );
                        }}
                        width={cardWidth}
                        accentColor={theme.warning}
                        showRequestedBy={true}
                        style={
                          index > 0
                            ? isRTL
                              ? { marginEnd: Spacing.md }
                              : { marginStart: Spacing.md }
                            : undefined
                        }
                      />
                    ))}
                </RTLHorizontalScrollView>
                  ) : (
                <ThemedView
                  style={[
                    styles.emptyCarousel,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <DDIcon name="clock" size={32} color={theme.textSecondary} />
                  <Spacer height={Spacing.sm} />
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {t("dashboard.noAwaitingVisitors")}
                  </ThemedText>
                </ThemedView>
                  )}
                </>
              )}
            </View>

            <Spacer height={Spacing.xxl} />
          </>
        )}

        {/* 7. Walk-In Visitors Section - Manager & Employee */}
        {(userRole === "manager" || userRole === "employee") && (
          <>
            <View>
              <DirectionalRow style={styles.header}>
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <ThemedText
                    style={[
                      styles.sectionTitle,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    {t("navigation.walkInVisitors")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        color: theme.textSecondary,
                        marginTop: 4,
                        fontSize: 12,
                      },
                    ]}
                  >
                    {t("dashboard.walkIns")}
                  </ThemedText>
                </View>
                {walkInVisitors.length > 0 &&
                  (userRole === "manager" || userRole === "employee") && (
                    <Pressable
                      onPress={() =>
                        navigation.navigate(
                          ROUTES.VISITOR_REQUESTS as any,
                          { initialTab: "walkin" } as any,
                        )
                      }
                      style={({ pressed }) => [
                        styles.viewAllButton,
                        {
                          opacity: pressed ? 0.7 : 1,
                          flexDirection: getFlexDirection(isRTL),
                          gap: Spacing.xs,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          Typography.bodySmall,
                          {
                            color: theme.primary,
                            fontWeight: "500",
                            fontSize: 13,
                          },
                        ]}
                      >
                        {t("common.viewAll")}
                      </ThemedText>
                      <DDIcon
                        name="chevron-right"
                        size={16}
                        color={theme.primary}
                        directionAware
                      />
                    </Pressable>
                  )}
              </DirectionalRow>

              <Spacer height={Spacing.lg} />

              {walkInData === undefined ? (
                renderSectionFeedback(false, walkInLoading, walkInFetching, walkInError, refetchWalkIn)
              ) : (
                <>
                  {renderSectionFeedback(true, walkInLoading, walkInFetching, walkInError, refetchWalkIn)}
                  {walkInVisitors.length > 0 && dashboardViewMode === 'list' ? (
                <VisitorMatrixTable
                  variant="matrix"
                  visitors={walkInVisitorTableItems}
                  showExpiredState={true}
                  onPressRow={(requestId) => {
                    navigation.navigate(
                      ROUTES.REQUEST_DETAILS as any,
                      { requestId } as any,
                    );
                  }}
                  emptyMessage={t("dashboard.noWalkInVisitors")}
                />
              ) : walkInVisitors.length > 0 ? (
                <RTLHorizontalScrollView
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  snapToInterval={cardWidth + Spacing.md}
                  decelerationRate="fast"
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  directionalLockEnabled={true}
                  scrollEventThrottle={16}
                >
                  {walkInVisitors.slice(0, 5).map((request, index) => {
                    const expired = computeIsVisitExpired(
                      request.visitDate,
                      request.visitTime,
                      request.endTime,
                      request.duration,
                      { isWalkIn: request.isWalkIn },
                    );
                    return (
                      <VisitorRequestCard
                        key={request.id}
                        request={request}
                        onPress={() => {
                          navigation.navigate(
                            ROUTES.REQUEST_DETAILS as any,
                            { requestId: request.id } as any,
                          );
                        }}
                        width={cardWidth}
                        accentColor={theme.info}
                        showRequestedBy={true}
                        showExpiredState={true}
                        isExpired={expired}
                        style={
                          index > 0
                            ? isRTL
                              ? { marginEnd: Spacing.md }
                              : { marginStart: Spacing.md }
                            : undefined
                        }
                      />
                    );
                  })}
                </RTLHorizontalScrollView>
                  ) : (
                <ThemedView
                  style={[
                    styles.emptyCarousel,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <DDIcon
                    name="user-plus"
                    size={32}
                    color={theme.textSecondary}
                  />
                  <Spacer height={Spacing.sm} />
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {t("dashboard.noWalkInVisitors")}
                  </ThemedText>
                </ThemedView>
                  )}
                </>
              )}
            </View>

            <Spacer height={Spacing.xxl} />
          </>
        )}

        {userRole === "buffet_admin" && (
          <>
            <View style={styles.chartsRow}>
              <ThemedView
                style={[
                  styles.chartCard,
                  { backgroundColor: theme.surface, flex: 1 },
                ]}
              >
                <View style={styles.chartHeader}>
                  <View>
                    <ThemedText style={[Typography.subtitle]}>
                      {t("dashboard.visitorForecast")}
                    </ThemedText>
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t("dashboard.expectedVisitors")}
                    </ThemedText>
                  </View>
                </View>

                <Spacer height={Spacing.lg} />

                <View style={{ padding: Spacing.md }}>
                  <DirectionalRow style={{ justifyContent: "space-around" }}>
                    <View style={{ alignItems: "center" }}>
                      <DDIcon name="calendar" size={24} color={theme.primary} />
                      <Spacer height={Spacing.xs} />
                      <ThemedText
                        style={[
                          Typography.display,
                          { fontSize: 28, lineHeight: 36, fontWeight: "600" },
                        ]}
                      >
                        2
                      </ThemedText>
                      <ThemedText
                        style={[
                          Typography.caption,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {t("time.today")}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <DDIcon name="clock" size={24} color={theme.info} />
                      <Spacer height={Spacing.xs} />
                      <ThemedText
                        style={[
                          Typography.display,
                          { fontSize: 28, lineHeight: 36, fontWeight: "600" },
                        ]}
                      >
                        1
                      </ThemedText>
                      <ThemedText
                        style={[
                          Typography.caption,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {t("time.tomorrow")}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <DDIcon
                        name="trending-up"
                        size={24}
                        color={theme.success}
                      />
                      <Spacer height={Spacing.xs} />
                      <ThemedText
                        style={[
                          Typography.display,
                          { fontSize: 28, lineHeight: 36, fontWeight: "600" },
                        ]}
                      >
                        1
                      </ThemedText>
                      <ThemedText
                        style={[
                          Typography.caption,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {t("dashboard.next7Days")}
                      </ThemedText>
                    </View>
                  </DirectionalRow>
                </View>
              </ThemedView>

              <Spacer width={Spacing.lg} />

              <ThemedView
                style={[
                  styles.chartCard,
                  { backgroundColor: theme.surface, flex: 1 },
                ]}
              >
                <View style={styles.chartHeader}>
                  <View>
                    <ThemedText style={[Typography.subtitle]}>
                      {t("dashboard.staffOverview")}
                    </ThemedText>
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t("dashboard.currentStaffStatus")}
                    </ThemedText>
                  </View>
                </View>

                <Spacer height={Spacing.lg} />

                <View style={{ padding: Spacing.md }}>
                  <DirectionalRow style={{ justifyContent: "space-around" }}>
                    <View style={{ alignItems: "center" }}>
                      <DDIcon name="users" size={24} color={theme.primary} />
                      <Spacer height={Spacing.xs} />
                      <ThemedText
                        style={[
                          Typography.display,
                          { fontSize: 28, lineHeight: 36, fontWeight: "600" },
                        ]}
                      >
                        12
                      </ThemedText>
                      <ThemedText
                        style={[
                          Typography.caption,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {t("dashboard.totalStaff")}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <DDIcon
                        name="user-check"
                        size={24}
                        color={theme.success}
                      />
                      <Spacer height={Spacing.xs} />
                      <ThemedText
                        style={[
                          Typography.display,
                          { fontSize: 28, lineHeight: 36, fontWeight: "600" },
                        ]}
                      >
                        8
                      </ThemedText>
                      <ThemedText
                        style={[
                          Typography.caption,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {t("dashboard.active")}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <DDIcon name="briefcase" size={24} color={theme.info} />
                      <Spacer height={Spacing.xs} />
                      <ThemedText
                        style={[
                          Typography.display,
                          { fontSize: 28, lineHeight: 36, fontWeight: "600" },
                        ]}
                      >
                        6
                      </ThemedText>
                      <ThemedText
                        style={[
                          Typography.caption,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {t("dashboard.onDuty")}
                      </ThemedText>
                    </View>
                  </DirectionalRow>
                </View>
              </ThemedView>
            </View>
          </>
        )}
      </ScreenScrollView>

      {(userRole === "employee" || userRole === "manager") && (
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              bottom: insets.bottom + 80 + Spacing.lg,
            },
          ]}
          onPress={() =>
            navigation.navigate(ROUTES.VISITOR_REQUEST_FORM as any)
          }
        >
          <DDIcon name="user-plus" size={24} color={theme.buttonText} />
        </Pressable>
      )}

      {/* Reject Request Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={handleRejectCancel}
        statusBarTranslucent
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={Keyboard.dismiss}
          accessible={false}
        >
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            accessibilityViewIsModal
          >
            <Pressable 
              style={[
                styles.rejectModalContainer,
                { 
                  backgroundColor: theme.surface,
                  marginBottom: insets.bottom,
                }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                Keyboard.dismiss();
              }}
              accessible={false}
            >
              <ThemedView style={styles.rejectModalContent}>
                <Pressable 
                  onPress={handleRejectCancel}
                  style={styles.rejectModalCloseButton}
                >
                  <DDIcon name="x" size={20} variant="muted" />
                </Pressable>
                
                <ThemedText style={[Typography.h3, { textAlign: 'center' }]}>
                  {t('manager.rejectRequest')}
                </ThemedText>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
                  {t('manager.rejectReasonPrompt')}
                </ThemedText>
                
                <Spacer height={Spacing.lg} />
                
                <TextInput
                  style={[
                    styles.rejectReasonInput,
                    { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                      textAlign: isRTL ? 'right' : 'left',
                      fontFamily: getInputFontFamily(rejectionReason, isRTL),
                    }
                  ]}
                  placeholder={t('manager.rejectReasonPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!rejectMutation.isPending}
                />
                
                <Spacer height={Spacing.lg} />
                
                <View style={styles.rejectModalButtons}>
                  <LoadingButton
                    onPress={handleRejectCancel}
                    variant="outline"
                    disabled={rejectMutation.isPending}
                    style={{ flex: 1 }}
                  >
                    {t('common.cancel')}
                  </LoadingButton>
                  <Spacer width={Spacing.md} />
                  <LoadingButton
                    onPress={handleRejectSubmit}
                    variant="danger"
                    loading={rejectMutation.isPending}
                    loadingText={t('common.rejecting')}
                    style={{ flex: 1 }}
                  >
                    {t('actions.reject')}
                  </LoadingButton>
                </View>
              </ThemedView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  upcomingFilterRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  upcomingFilterScroller: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
  },
  welcomeSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  sectionDivider: {
    height: 1,
    width: "100%",
    marginTop: Spacing.xs,
  },
  header: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  carouselContainer: {
    paddingEnd: Spacing.lg,
  },
  upcomingVisitorCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  upcomingVisitorCardContent: {
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emptyCarousel: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  employeeStatsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginHorizontal: -Spacing.xs,
  },
  kpiCard: {
    width: screenWidth > 768 ? "23%" : "48%",
    margin: "1%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  kpiValue: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  kpiSubtitle: {
    fontSize: 12,
    fontWeight: "400",
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: "600",
  },
  chartsRow: {
    flexDirection: screenWidth > 768 ? "row" : "column",
  },
  chartCard: {
    flex: 1,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  visitorListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewToggle: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    flexDirection: "row",
  },
  viewToggleBtn: {
    padding: Spacing.sm,
    minWidth: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
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
  visitorCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: "row",
    overflow: "hidden",
  },
  statusBorder: {
    position: "absolute",
    start: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  visitorCardContent: {
    flex: 1,
  },
  visitorCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  servicesRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  servicePill: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  listItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listItemMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  listItemLeft: {
    flex: 1,
  },
  listItemRight: {
    marginStart: Spacing.sm,
  },
  listItemBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemIcons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  listIconBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  viewDetailsButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  viewAllButton: {
    alignItems: "center",
    alignSelf: "flex-end",
  },
  sectionFeedback: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dateGroupHeader: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 42,
    overflow: "hidden",
    paddingEnd: Spacing.md,
  },
  dateGroupAccent: {
    alignSelf: "stretch",
    width: 4,
    marginEnd: Spacing.sm,
  },
  dateGroupLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  dateGroupCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    end: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tableCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  tableContainer: {
    paddingHorizontal: Spacing.md,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  tableHeaderCell: {
    fontWeight: "600",
    fontSize: 13,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tableCell: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectModalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  rejectModalContent: {
    padding: Spacing.xl,
  },
  rejectModalCloseButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
  },
  rejectReasonInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    fontSize: 14,
  },
  rejectModalButtons: {
    flexDirection: 'row',
  },
});
