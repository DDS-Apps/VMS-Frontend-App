import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { DDIcon } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import Spacer from "@/components/Spacer";
import {
  VisitorRequestCard,
  ApprovalRequestListRow,
  COLUMN_WIDTHS,
  ListLoadingFooter,
  SkeletonList,
} from "@/components/shared";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import {
  useInfiniteApprovalHistoryQuery,
  useApproveVisitMutation,
  useRejectVisitMutation,
  approvalHistoryKeys,
} from "@/hooks/queries/useApprovalQueries";
import { useQueryClient } from "@tanstack/react-query";
import type { ApprovalHistoryItemDto, ApprovalHistoryStatus } from "@/types/api.types";
import type { VisitorRequest } from "@/types/vms.types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ManagerStackParamList } from "@/types/managerNavigation.types";
import { applyOpacity } from "@/utils/statusStyles";
import { isVisitExpired } from "@/utils/dateTimeUtils";

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
  theme,
  t,
  isRTL,
}: {
  title: string;
  selectedTab: TabType;
  onTabChange: (tab: TabType) => void;
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  theme: ReturnType<typeof useTheme>["theme"];
  t: (key: string) => string;
  isRTL: boolean;
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

  const displayTabs = isRTL ? [...tabs].reverse() : tabs;

  return (
    <>
      <DirectionalRow style={[styles.sectionTitleRow, styles.paddedContent]}>
        {titleElement}
        {viewToggleElement}
      </DirectionalRow>

      <Spacer height={LAYOUT.contentGap} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.tabsContainer,
          { flexDirection: getFlexDirection(isRTL) },
        ]}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {displayTabs.map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && {
                borderBottomWidth: 2,
                borderBottomColor: theme.primary,
              },
            ]}
            onPress={() => onTabChange(tab)}
            android_ripple={{ color: applyOpacity(theme.primary, "10") }}
          >
            <ThemedText
              style={[
                Typography.body,
                {
                  color: selectedTab === tab ? theme.primary : theme.textSecondary,
                  fontWeight: "600",
                },
              ]}
              numberOfLines={1}
            >
              {getTabLabel(tab)}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
};

// List Column Header Component
const ListColumnHeader = ({
  theme,
  t,
  isRTL,
}: {
  theme: ReturnType<typeof useTheme>["theme"];
  t: (key: string) => string;
  isRTL: boolean;
}) => (
  <View style={[listHeaderStyles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={listHeaderStyles.scrollContent}
    >
      <DirectionalRow style={listHeaderStyles.row} alignItems="center">
        <View style={[listHeaderStyles.column, { minWidth: COLUMN_WIDTHS.visitor }]}>
          <ThemedText style={[listHeaderStyles.headerText, { color: theme.textSecondary }]}>
            {t("form.visitorName").toUpperCase()}
          </ThemedText>
        </View>
        <View style={[listHeaderStyles.column, { minWidth: COLUMN_WIDTHS.company }]}>
          <ThemedText style={[listHeaderStyles.headerText, { color: theme.textSecondary }]}>
            {t("form.company").toUpperCase()}
          </ThemedText>
        </View>
        <View style={[listHeaderStyles.column, { minWidth: COLUMN_WIDTHS.requestedBy }]}>
          <ThemedText style={[listHeaderStyles.headerText, { color: theme.textSecondary }]}>
            {t("dashboard.requestedBy").toUpperCase()}
          </ThemedText>
        </View>
        <View style={[listHeaderStyles.column, { minWidth: COLUMN_WIDTHS.purpose }]}>
          <ThemedText style={[listHeaderStyles.headerText, { color: theme.textSecondary }]}>
            {t("form.purpose").toUpperCase()}
          </ThemedText>
        </View>
        <View style={[listHeaderStyles.column, { minWidth: COLUMN_WIDTHS.services }]}>
          <ThemedText style={[listHeaderStyles.headerText, { color: theme.textSecondary }]}>
            {t("services.additionalServices").toUpperCase()}
          </ThemedText>
        </View>
        <View style={[listHeaderStyles.column, { minWidth: COLUMN_WIDTHS.actions }]}>
          <ThemedText style={[listHeaderStyles.headerText, { color: theme.textSecondary }]}>
            {t("common.actions").toUpperCase()}
          </ThemedText>
        </View>
      </DirectionalRow>
    </ScrollView>
  </View>
);

const listHeaderStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 1,
  },
  row: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  column: {
    justifyContent: "center",
  },
  headerText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

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

  const routeParams = route?.params;
  const validTabs: TabType[] = ["all", "pending", "approved", "rejected"];
  const isValidTab = (tab: string): tab is TabType => validTabs.includes(tab as TabType);

  const getInitialTab = (): TabType => {
    const paramTab = routeParams?.initialTab;
    if (paramTab && isValidTab(paramTab)) return paramTab;
    return "all";
  };

  const [selectedTab, setSelectedTab] = useState<TabType>(getInitialTab());
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [lastInitialTab, setLastInitialTab] = useState<string | undefined>(routeParams?.initialTab);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);

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

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteApprovalHistoryQuery({
    status: statusFilter,
    limit: 20,
  });

  // Mutations for approve/reject
  const approveMutation = useApproveVisitMutation();
  const rejectMutation = useRejectVisitMutation();

  const items = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data || []);
  }, [data]);

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
      setApprovingRequestId(id);
      approveMutation.mutate(
        { id },
        {
          onSuccess: () => {
            setApprovingRequestId(null);
            queryClient.invalidateQueries({ queryKey: approvalHistoryKeys.all });
          },
          onError: (error) => {
            setApprovingRequestId(null);
            Alert.alert(t("common.error"), error.message || t("approval.approveFailed"));
          },
        }
      );
    },
    [approveMutation, queryClient, t]
  );

  // Reject handler
  const handleReject = useCallback(
    (id: string) => {
      Alert.prompt(
        t("approval.rejectRequest"),
        t("approval.enterRejectionReason"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.reject"),
            style: "destructive",
            onPress: (reason: string | undefined) => {
              setRejectingRequestId(id);
              rejectMutation.mutate(
                { id, payload: { reason: reason || "" } },
                {
                  onSuccess: () => {
                    setRejectingRequestId(null);
                    queryClient.invalidateQueries({ queryKey: approvalHistoryKeys.all });
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
    [rejectMutation, queryClient, t]
  );

  const isWebLayout = width > 768;
  const numColumns = isWebLayout && viewMode === "card" ? 3 : 1;

  const renderItem = useCallback(
    ({ item }: { item: ApprovalHistoryItemDto }) => {
      const request = mapHistoryToVisitorRequest(item);
      const isPending = item.status === "pending" || item.status === "pending_approval";
      
      // Check if visit has expired (visit date/time has passed)
      const isExpired = isVisitExpired(item.visitDate, item.visitTime, undefined, item.duration);
      
      // Show actions section for all pending items (expired will show banner, non-expired will show buttons)
      const showActions = isPending;
      // Only provide approve/reject handlers for non-expired pending items
      const canApproveReject = isPending && !isExpired;
      const isApproving = approvingRequestId === item.id;
      const isRejecting = rejectingRequestId === item.id;

      // Use list row component for list view mode
      if (viewMode === "list") {
        return (
          <View style={{ width: "100%", marginBottom: LAYOUT.contentGap }}>
            <ApprovalRequestListRow
              request={request}
              onPress={() => handleViewDetails(item.id)}
              showActions={showActions}
              onApprove={canApproveReject ? () => handleApprove(item.id) : undefined}
              onReject={canApproveReject ? () => handleReject(item.id) : undefined}
              approveLoading={isApproving}
              rejectLoading={isRejecting}
              isExpired={isExpired}
            />
          </View>
        );
      }

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
          />
        </View>
      );
    },
    [numColumns, viewMode, handleViewDetails, handleApprove, handleReject, approvingRequestId, rejectingRequestId]
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <SectionHeaderWithTabs
        title={t("navigation.allRequests")}
        selectedTab={selectedTab}
        onTabChange={handleTabChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        theme={theme}
        t={t}
        isRTL={isRTL}
      />
      <Spacer height={Spacing.md} />
      {viewMode === "list" && (
        <ListColumnHeader theme={theme} t={t} isRTL={isRTL} />
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {renderHeader()}
        <SkeletonList count={6} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      <FlatList
        key={`${viewMode}-${numColumns}-${selectedTab}`}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: paddingBottom + Spacing.xxl },
        ]}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={<ListLoadingFooter isLoading={isFetchingNextPage} />}
        ListEmptyComponent={<EmptyState theme={theme} t={t} />}
        refreshing={isFetching && !isFetchingNextPage}
        onRefresh={refetch}
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
    gap: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
    borderRadius: LAYOUT.cardRadius,
    marginHorizontal: Spacing.lg,
  },
});
