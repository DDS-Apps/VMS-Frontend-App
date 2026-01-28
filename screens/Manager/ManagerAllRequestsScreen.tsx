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
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { DDIcon } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import Spacer from "@/components/Spacer";
import {
  VisitorRequestCard,
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
  approvalHistoryKeys,
} from "@/hooks/queries/useApprovalQueries";
import { useQueryClient } from "@tanstack/react-query";
import type { ApprovalHistoryItemDto, ApprovalHistoryStatus } from "@/types/api.types";
import type { VisitorRequest } from "@/types/vms.types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ManagerStackParamList } from "@/types/managerNavigation.types";
import { applyOpacity } from "@/utils/statusStyles";

const LAYOUT = {
  contentGap: Spacing.md,
  cardRadius: BorderRadius.md,
};

type TabType = "all" | "approved" | "rejected";

type ScreenProps = NativeStackScreenProps<ManagerStackParamList, "AllRequests">;

const mapStatusToVisitorRequestStatus = (status: string): VisitorRequest["status"] => {
  switch (status) {
    case "pending":
      return "pending_approval";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
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
  const tabs: TabType[] = ["all", "approved", "rejected"];

  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case "all":
        return t("common.all");
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
  const validTabs: TabType[] = ["all", "approved", "rejected"];
  const isValidTab = (tab: string): tab is TabType => validTabs.includes(tab as TabType);

  const getInitialTab = (): TabType => {
    const paramTab = routeParams?.initialTab;
    if (paramTab && isValidTab(paramTab)) return paramTab;
    return "all";
  };

  const [selectedTab, setSelectedTab] = useState<TabType>(getInitialTab());
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [lastInitialTab, setLastInitialTab] = useState<string | undefined>(routeParams?.initialTab);

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

  const isWebLayout = width > 768;
  const numColumns = isWebLayout && viewMode === "card" ? 3 : 1;

  const renderItem = useCallback(
    ({ item }: { item: ApprovalHistoryItemDto }) => {
      const request = mapHistoryToVisitorRequest(item);

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
          />
        </View>
      );
    },
    [numColumns, handleViewDetails]
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
