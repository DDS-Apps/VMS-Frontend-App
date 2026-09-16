import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { DDIcon } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DirectionalRow } from "@/components/DirectionalRow";
import Spacer from "@/components/Spacer";
import {
  VisitorRequestCard,
  ListLoadingFooter,
  SkeletonList,
  RTLHorizontalScrollView,
  FilterChip,
  VisitorMatrixTable,
} from "@/components/shared";
import type { VisitorMatrixItem } from "@/components/shared";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import {
  useInfiniteApprovalHistoryQuery,
  useApproveVisitMutation,
  useRejectVisitMutation,
  approvalHistoryKeys,
  requestKeys,
} from "@/hooks/queries/useApprovalQueries";
import { useQueryClient } from "@tanstack/react-query";
import type { ApprovalHistoryItemDto, ApprovalHistoryStatus } from "@/types/api.types";
import type { VisitorRequest } from "@/types/vms.types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ManagerStackParamList } from "@/types/managerNavigation.types";
import { applyOpacity } from "@/utils/statusStyles";
import { isVisitExpired } from "@/utils/dateTimeUtils";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsPendingHostWalkInExpired,
  getPendingApprovalWalkInScheduledEndMs,
  isPendingManagerApprovalStatus,
} from "@/utils/visitExpiredGuard";
import { canAutomaticallyFetchNextPage } from "@/utils/queryPaginationState";
import { useRetainedDatedData } from "@/hooks/useRetainedDatedData";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import {
  buildManagerApprovalHistoryParams,
  hasSameApprovalHistoryDateRange,
} from "@/utils/managerApprovalHistoryFilters";

const LAYOUT = {
  contentGap: Spacing.md,
  cardRadius: BorderRadius.md,
};

type TabType = "all" | "pending" | "approved" | "rejected";

type ScreenProps = NativeStackScreenProps<ManagerStackParamList, "AllRequests">;

const mapStatusToVisitorRequestStatus = (status: string): VisitorRequest["status"] => {
  switch (status) {
    case "pending":
      return "pending_approval";
    case "pending_host_approval":
      return "pending_host_approval";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "visitor_pending":
      return "visitor_pending";
    case "visitor_accepted":
      return "visitor_accepted";
    case "visitor_rejected":
      return "visitor_rejected";
    case "checked_in":
      return "checked_in";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "auto_cancelled":
      return "auto_cancelled";
    default:
      return "pending_approval";
  }
};

const mapHistoryToVisitorRequest = (item: ApprovalHistoryItemDto): VisitorRequest => ({
  id: item.id,
  employeeId: "",
  employeeName: item.employeeName,
  employeeDepartment: item.employeeDepartment,
  visitor: {
    id: item.visitor.id,
    fullName: item.visitor.fullName,
    email: item.visitor.email,
    phone: item.visitor.phone,
    company: item.visitor.company,
  },
  visitDate: item.visitDate,
  visitTime: item.visitTime,
  visitStartAt: item.visitStartAt,
  timezone: item.timezone,
  endTime: item.endTime,
  duration: item.duration || "1 hour",
  purpose: item.purpose,
  status: mapStatusToVisitorRequestStatus(item.status),
  communicationChannels: ["email"],
  parkingType: "none",
  isMeetingRoom: item.hasMeetingRoom,
  isVisitorNeedsParking: item.hasParking,
  isBuffet: item.hasBuffet,
  approval: {
    requiresApproval: true,
    autoApproved: false,
  },
  reminders: {},
  createdAt: item.createdAt,
  updatedAt: item.createdAt,
  isWalkIn: item.isWalkIn,
});

// Section Header with Tabs Component (matching My Requests design)
const SectionHeaderWithTabs = ({
  title,
  selectedTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  isDateFilterActive,
  onDatePress,
  onClearDatePress,
  theme,
  t,
}: {
  title: string;
  selectedTab: TabType;
  onTabChange: (tab: TabType) => void;
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  isDateFilterActive: boolean;
  onDatePress: () => void;
  onClearDatePress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  t: (key: string) => string;
}) => {
  const tabs: TabType[] = ["all", "pending", "approved", "rejected"];

  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case "all":
        return t("common.all");
      case "pending":
        return t("navigation.pendingApprovals");
      case "approved":
        return t("status.approved");
      case "rejected":
        return t("status.rejected");
      default:
        return tab;
    }
  };

  const titleElement = (
    <ThemedText style={[Typography.title, { fontSize: 18, fontWeight: "600" }]}>
      {title}
    </ThemedText>
  );

  const viewToggleElement = (
    <DirectionalRow
      style={[
        styles.viewToggle,
        { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
      ]}
    >
      <Pressable
        onPress={() => onViewModeChange("card")}
        style={[
          styles.toggleButton,
          { backgroundColor: viewMode === "card" ? theme.primary : "transparent" },
        ]}
      >
        <DDIcon
          name="grid"
          size={16}
          color={viewMode === "card" ? theme.buttonText : theme.textSecondary}
        />
      </Pressable>
      <Pressable
        onPress={() => onViewModeChange("list")}
        style={[
          styles.toggleButton,
          { backgroundColor: viewMode === "list" ? theme.primary : "transparent" },
        ]}
      >
        <DDIcon
          name="list"
          size={16}
          color={viewMode === "list" ? theme.buttonText : theme.textSecondary}
        />
      </Pressable>
    </DirectionalRow>
  );

  return (
    <>
      <DirectionalRow style={[styles.sectionTitleRow, styles.paddedContent]}>
        {titleElement}
        {viewToggleElement}
      </DirectionalRow>

      <Spacer height={LAYOUT.contentGap} />

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {tabs.map((tab) => (
          <FilterChip
            key={tab}
            label={getTabLabel(tab)}
            isSelected={selectedTab === tab}
            onPress={() => onTabChange(tab)}
          />
        ))}
        <FilterChip
          label={t("visitor.date")}
          icon="calendar"
          color={theme.primary}
          isSelected={isDateFilterActive}
          onPress={onDatePress}
          onClear={onClearDatePress}
          clearAccessibilityLabel={t("common.clear")}
        />
      </RTLHorizontalScrollView>
    </>
  );
};

// Empty State Component
const EmptyState = ({
  theme,
  t,
}: {
  theme: ReturnType<typeof useTheme>["theme"];
  t: (key: string) => string;
}) => (
  <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
    <DDIcon name="inbox" size={48} variant="muted" />
    <Spacer height={Spacing.md} />
    <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
      {t("common.noResults")}
    </ThemedText>
  </ThemedView>
);

export default function ManagerAllRequestsScreen({ navigation, route }: ScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const { paddingBottom } = useScreenInsets();
  const queryClient = useQueryClient();
  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();

  const routeParams = route?.params;
  const validTabs: TabType[] = ["all", "pending", "approved", "rejected"];
  const isValidTab = (tab: string): tab is TabType => validTabs.includes(tab as TabType);

  const getInitialTab = (): TabType => {
    const paramTab = routeParams?.initialTab;
    if (paramTab && isValidTab(paramTab)) return paramTab;
    return "all";
  };

  const [selectedTab, setSelectedTab] = useState<TabType>(getInitialTab());
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [lastInitialTab, setLastInitialTab] = useState<string | undefined>(routeParams?.initialTab);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const paramTab = routeParams?.initialTab;
    if (!paramTab || paramTab === lastInitialTab) return;
    if (isValidTab(paramTab)) {
      setSelectedTab(paramTab);
      setLastInitialTab(paramTab);
    }
  }, [routeParams?.initialTab, lastInitialTab]);

  // Map tab to API status filter
  const statusFilter: ApprovalHistoryStatus | undefined = useMemo(() => {
    switch (selectedTab) {
      case "pending":
        return "pending";
      case "approved":
        return "approved";
      case "rejected":
        return "rejected";
      case "all":
      default:
        return undefined; // No filter for "all" tab
    }
  }, [selectedTab]);

  const approvalParams = useMemo(
    () => ({
      ...buildManagerApprovalHistoryParams({
        status: statusFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    }),
    [dateRange.endDate, dateRange.startDate, statusFilter],
  );
  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    error,
    refetch,
  } = useInfiniteApprovalHistoryQuery(approvalParams);
  const approvalSourceKey = JSON.stringify(approvalParams);
  const retainedApprovalData = useRetainedDatedData(approvalSourceKey, data);
  const retainedApprovalParams = useMemo(
    () =>
      JSON.parse(retainedApprovalData.dateKey) as Omit<
        import("@/types/api.types").ApprovalHistoryListParams,
        "page"
      >,
    [retainedApprovalData.dateKey],
  );
  const canDisplayRetainedApprovalData =
    !retainedApprovalData.isRetained ||
    hasSameApprovalHistoryDateRange(
      approvalParams,
      retainedApprovalParams,
    );
  const displayedApprovalData = canDisplayRetainedApprovalData
    ? retainedApprovalData.data
    : undefined;
  const isShowingPreviousApprovalData =
    canDisplayRetainedApprovalData && retainedApprovalData.isRetained;
  const displayedApprovalSourceKey = canDisplayRetainedApprovalData
    ? retainedApprovalData.dateKey
    : approvalSourceKey;
  /*
   * Retain the existing status-transition behavior, but never present records
   * from another date range as results for the active date filter.
   */
  const displayedApprovalSourceLabel = useMemo(() => {
    const source = JSON.parse(displayedApprovalSourceKey) as {
      status?: ApprovalHistoryStatus;
    };
    switch (source.status) {
      case "pending":
        return t("status.pending");
      case "approved":
        return t("status.approved");
      case "rejected":
        return t("status.rejected");
      default:
        return t("common.all");
    }
  }, [displayedApprovalSourceKey, t]);

  // Mutations for approve/reject
  const approveMutation = useApproveVisitMutation();
  const rejectMutation = useRejectVisitMutation();

  const items = useMemo(() => {
    if (!displayedApprovalData?.pages) return [];
    return displayedApprovalData.pages.flatMap((page) => page.data || []);
  }, [displayedApprovalData, riyadhBusinessDateKey]);
  const getItemIsExpired = useCallback((item: ApprovalHistoryItemDto) => {
    if (
      item.isWalkIn &&
      item.status?.toLowerCase() === "pending_host_approval"
    ) {
      return computeIsPendingHostWalkInExpired({
        isWalkIn: item.isWalkIn,
        status: item.status,
        visitDate: item.visitDate,
      });
    }

    if (item.isWalkIn && isPendingManagerApprovalStatus(item.status)) {
      return computeIsPendingApprovalWalkInExpired({
        isWalkIn: item.isWalkIn,
        status: item.status,
        visitDate: item.visitDate,
        visitTime: item.visitTime,
        endTime: item.endTime,
        duration: item.duration,
      });
    }

    return isVisitExpired(
      item.visitDate,
      item.visitTime,
      undefined,
      item.duration,
    );
  }, [riyadhBusinessDateKey]);
  const expirationBoundaries = useMemo(
    () =>
      items.map((item) =>
        getPendingApprovalWalkInScheduledEndMs({
          isWalkIn: item.isWalkIn,
          status: item.status,
          visitDate: item.visitDate,
          visitTime: item.visitTime,
          endTime: item.endTime,
          duration: item.duration,
        }),
      ),
    [items],
  );
  const expirationTick = useTimeBoundaryTick(expirationBoundaries);
  const filteredItems = items;
  const hasUsablePages = !!displayedApprovalData?.pages?.length;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleViewDetails = useCallback(
    (id: string) => {
      navigation.navigate("ManagerApprovalDetail", { requestId: id });
    },
    [navigation]
  );

  const handleTabChange = useCallback((tab: TabType) => {
    setSelectedTab(tab);
  }, []);

  // Approve handler
  const handleApprove = useCallback(
    (id: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item || getItemIsExpired(item)) return;
      setApprovingRequestId(id);
      approveMutation.mutate(
        { id },
        {
          onSuccess: () => {
            setApprovingRequestId(null);
            queryClient.invalidateQueries({ queryKey: approvalHistoryKeys.all });
            // Remove stale visitDetail cache so the detail page loads fresh data
            // rather than briefly showing pending-status action buttons.
            queryClient.removeQueries({ queryKey: requestKeys.visitDetail(id) });
          },
          onError: (error) => {
            setApprovingRequestId(null);
            Alert.alert(t("common.error"), error.message || t("approval.approveFailed"));
          },
        }
      );
    },
    [approveMutation, getItemIsExpired, items, queryClient, t]
  );

  // Reject handler
  const handleReject = useCallback(
    (id: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item || getItemIsExpired(item)) return;
      Alert.prompt(
        t("approval.rejectRequest"),
        t("approval.enterRejectionReason"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.reject"),
            style: "destructive",
            onPress: (reason: string | undefined) => {
              const item = items.find((candidate) => candidate.id === id);
              if (!item || getItemIsExpired(item)) return;
              setRejectingRequestId(id);
              rejectMutation.mutate(
                { id, payload: { reason: reason || "" } },
                {
                  onSuccess: () => {
                    setRejectingRequestId(null);
                    queryClient.invalidateQueries({ queryKey: approvalHistoryKeys.all });
                    // Remove stale visitDetail cache so the detail page loads fresh data.
                    queryClient.removeQueries({ queryKey: requestKeys.visitDetail(id) });
                  },
                  onError: (error) => {
                    setRejectingRequestId(null);
                    Alert.alert(t("common.error"), error.message || t("approval.rejectFailed"));
                  },
                }
              );
            },
          },
        ],
        "plain-text"
      );
    },
    [getItemIsExpired, items, rejectMutation, queryClient, t]
  );

  const isWebLayout = width > 768;
  const numColumns = isWebLayout && viewMode === "card" ? 3 : 1;

  const toMatrixItem = useCallback((item: ApprovalHistoryItemDto): VisitorMatrixItem => {
    const request = mapHistoryToVisitorRequest(item);
    const isExpired = getItemIsExpired(item);
    const showExpiredStatus =
      item.isWalkIn &&
      isPendingManagerApprovalStatus(item.status) &&
      isExpired;
    const isPendingHost =
      item.isWalkIn &&
      item.status?.toLowerCase() === "pending_host_approval";
    return {
      id: item.id,
      visitorName: request.visitor.fullName,
      company: request.visitor.company || undefined,
      visitDate: request.visitDate,
      plannedInTime: request.visitTime,
      plannedOutTime: request.endTime,
      status: item.status,
      hostName: request.employeeName || undefined,
      hostDepartment: request.employeeDepartment || undefined,
      hasParking: !!item.hasParking,
      hasBuffet: !!item.hasBuffet,
      hasValet: !!(request.valet),
      hasMeetingRoom: !!item.hasMeetingRoom,
      purpose: request.purpose || undefined,
      // `showExpiredState` is table-wide. Retain the original matrix banner
      // behavior for Manager-pending rows, and opt only host-pending rows into
      // the read-only banner; otherwise a historical approved/rejected row
      // could gain a new expired notice just because this table has one.
      isExpired:
        isExpired &&
        (isPendingManagerApprovalStatus(item.status) || isPendingHost),
    };
  }, [expirationTick, getItemIsExpired, riyadhBusinessDateKey]);

  const renderItem = useCallback(
    ({ item }: { item: ApprovalHistoryItemDto }) => {
      const request = mapHistoryToVisitorRequest(item);
      const isPending = isPendingManagerApprovalStatus(item.status);
      const isPendingHost =
        item.isWalkIn &&
        item.status?.toLowerCase() === "pending_host_approval";
      
      const isExpired = getItemIsExpired(item);
      const showExpiredStatus =
        item.isWalkIn &&
        isPendingManagerApprovalStatus(item.status) &&
        isExpired;
      
      // Show actions section for all pending items (expired will show banner, non-expired will show buttons)
      const showActions = isPending;
      // Only provide approve/reject handlers for non-expired pending items
      const canApproveReject = isPending && !isExpired;
      const isApproving = approvingRequestId === item.id;
      const isRejecting = rejectingRequestId === item.id;

      return (
        <View
          style={
            numColumns > 1
              ? { width: "33.33%", flexGrow: 0, marginBottom: LAYOUT.contentGap, paddingRight: Spacing.sm }
              : { width: "100%", marginBottom: LAYOUT.contentGap }
          }
        >
          <VisitorRequestCard
            request={request}
            onPress={() => handleViewDetails(item.id)}
            showRequestedBy
            showActions={showActions}
            onApprove={canApproveReject ? () => handleApprove(item.id) : undefined}
            onReject={canApproveReject ? () => handleReject(item.id) : undefined}
            approveLoading={isApproving}
            rejectLoading={isRejecting}
            isExpired={isExpired}
             showExpiredState={isPendingHost || showExpiredStatus}
          />
        </View>
      );
    },
    [numColumns, viewMode, handleViewDetails, handleApprove, handleReject, approvingRequestId, rejectingRequestId, expirationTick, getItemIsExpired, riyadhBusinessDateKey]
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <SectionHeaderWithTabs
        title={t("navigation.allRequests")}
        selectedTab={selectedTab}
        onTabChange={handleTabChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isDateFilterActive={dateRange.startDate !== null}
        onDatePress={() => setShowDatePicker(true)}
        onClearDatePress={() => setDateRange({ startDate: null, endDate: null })}
        theme={theme}
        t={t}
      />
      <Spacer height={Spacing.md} />
    </View>
  );

  if (isLoading && !hasUsablePages) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {renderHeader()}
        <SkeletonList count={6} />
      </View>
    );
  }

  if (error && !hasUsablePages) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {renderHeader()}
        <View style={styles.fullErrorState}>
          <DDIcon name="alert-circle" size={48} color={theme.error} />
          <Spacer height={Spacing.md} />
          <ThemedText
            style={[
              Typography.body,
              { color: theme.textSecondary, textAlign: "center" },
            ]}
          >
            {t("common.loadError")}
          </ThemedText>
          <Spacer height={Spacing.lg} />
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
              {t("common.retry")}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const queryFeedback = isShowingPreviousApprovalData ? (
    <DirectionalRow
      style={[
        styles.inlineQueryFeedback,
        { backgroundColor: applyOpacity(theme.primary, "10") },
      ]}
    >
      <DDIcon name="info" size={16} color={theme.primary} />
      <ThemedText
        style={[Typography.caption, { color: theme.textSecondary, flex: 1 }]}
      >
        {t("requests.showingPreviousDataFrom").replace(
          "{{source}}",
          displayedApprovalSourceLabel,
        )}
      </ThemedText>
      {error ? (
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
  ) : error && !isFetchNextPageError ? (
    <DirectionalRow
      style={[
        styles.inlineQueryFeedback,
        { backgroundColor: applyOpacity(theme.error, "10") },
      ]}
    >
      <DDIcon name="alert-circle" size={16} color={theme.error} />
      <ThemedText
        style={[Typography.caption, { color: theme.error, flex: 1 }]}
      >
        {t("common.loadError")}
      </ThemedText>
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
    </DirectionalRow>
  ) : isFetching && !isFetchingNextPage ? (
    <DirectionalRow
      style={[
        styles.inlineQueryFeedback,
        { backgroundColor: applyOpacity(theme.primary, "10") },
      ]}
    >
      <ActivityIndicator size="small" color={theme.primary} />
      <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
        {t("common.loading")}
      </ThemedText>
    </DirectionalRow>
  ) : null;
  const paginationFooter = (
    <>
      <ListLoadingFooter isLoading={isFetchingNextPage} />
      {isFetchNextPageError ? (
        <DirectionalRow
          style={[
            styles.paginationError,
            { backgroundColor: applyOpacity(theme.error, "10") },
          ]}
        >
          <DDIcon name="alert-circle" size={16} color={theme.error} />
          <ThemedText
            style={[Typography.caption, { color: theme.error, flex: 1 }]}
          >
            {t("common.loadError")}
          </ThemedText>
          <Pressable onPress={() => fetchNextPage()} hitSlop={8}>
            <ThemedText
              style={[
                Typography.caption,
                { color: theme.primary, fontWeight: "600" },
              ]}
            >
              {t("common.retry")}
            </ThemedText>
          </Pressable>
        </DirectionalRow>
      ) : null}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      {queryFeedback ? (
        <View style={styles.feedbackContainer}>{queryFeedback}</View>
      ) : null}
      {viewMode === "list" ? (
        <FlatList
          key={`list-${selectedTab}-${dateRange.startDate?.getTime() ?? "all"}-${dateRange.endDate?.getTime() ?? "all"}`}
          data={[]}
          extraData={riyadhBusinessDateKey}
          renderItem={() => null}
          keyExtractor={() => "_"}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: paddingBottom + Spacing.xxl },
          ]}
          ListHeaderComponent={
            <View style={{ width: "100%" }}>
              {filteredItems.length > 0 ? (
                <VisitorMatrixTable
                  variant="matrix"
                  visitors={filteredItems.map(toMatrixItem)}
                  onPressRow={handleViewDetails}
                  showApproveReject
                  showExpiredState
                  onApprove={handleApprove}
                  onReject={handleReject}
                  approveLoadingId={approvingRequestId ?? undefined}
                  rejectLoadingId={rejectingRequestId ?? undefined}
                  emptyMessage={t("common.noResults")}
                />
              ) : (
                <EmptyState theme={theme} t={t} />
              )}
            </View>
          }
          onEndReached={() => {
            if (
              canAutomaticallyFetchNextPage({
                hasNextPage,
                isFetching,
                isFetchNextPageError,
              })
            ) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={paginationFooter}
          refreshing={isFetching && !isFetchingNextPage}
          onRefresh={refetch}
        />
      ) : (
        <FlatList
          key={`${viewMode}-${numColumns}-${selectedTab}-${dateRange.startDate?.getTime() ?? "all"}-${dateRange.endDate?.getTime() ?? "all"}`}
          data={filteredItems}
          extraData={riyadhBusinessDateKey}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: paddingBottom + Spacing.xxl },
          ]}
          onEndReached={() => {
            if (
              canAutomaticallyFetchNextPage({
                hasNextPage,
                isFetching,
                isFetchNextPageError,
              })
            ) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={paginationFooter}
          ListEmptyComponent={
            <EmptyState theme={theme} t={t} />
          }
          refreshing={isFetching && !isFetchingNextPage}
          onRefresh={refetch}
        />
      )}
      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        mode="range"
        dateRange={dateRange}
        allowPastDates
        onDateSelect={(date) => {
          setDateRange({ startDate: date, endDate: date });
          setShowDatePicker(false);
        }}
        onRangeSelect={(range) => {
          setDateRange(range);
          setShowDatePicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Spacing.lg,
  },
  sectionTitleRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  paddedContent: {
    paddingHorizontal: Spacing.lg,
  },
  viewToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm - 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  feedbackContainer: {
    paddingHorizontal: Spacing.lg,
  },
  inlineQueryFeedback: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  paginationError: {
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  fullErrorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
    borderRadius: LAYOUT.cardRadius,
    marginHorizontal: Spacing.lg,
  },
});
