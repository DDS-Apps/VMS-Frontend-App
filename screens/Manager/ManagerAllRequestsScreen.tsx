import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { DDIcon } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { DirectionalRow } from "@/components/DirectionalRow";
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
  useApproveVisitMutation,
  useRejectVisitMutation,
  approvalHistoryKeys,
} from "@/hooks/queries/useApprovalQueries";
import { useQueryClient } from "@tanstack/react-query";
import type { ApprovalHistoryItemDto, ApprovalHistoryStatus } from "@/types/api.types";
import type { VisitorRequest } from "@/types/vms.types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ManagerStackParamList } from "@/types/managerNavigation.types";

const LAYOUT = {
  contentGap: Spacing.md,
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

export default function ManagerAllRequestsScreen({ navigation, route }: ScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const { paddingBottom } = useScreenInsets();
  const queryClient = useQueryClient();

  const initialTab = route?.params?.initialTab || "all";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);

  const statusFilter: ApprovalHistoryStatus | undefined = useMemo(() => {
    if (activeTab === "pending") return "pending";
    if (activeTab === "approved") return "approved";
    if (activeTab === "rejected") return "rejected";
    return undefined;
  }, [activeTab]);

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
    search: searchQuery || undefined,
    limit: 20,
  });

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

  const tabs: { key: TabType; label: string }[] = [
    { key: "all", label: t("common.all") },
    { key: "pending", label: t("navigation.pendingApprovals") },
    { key: "approved", label: t("status.approved") },
    { key: "rejected", label: t("status.rejected") },
  ];

  const renderTabBar = () => (
    <DirectionalRow style={[styles.tabBar, { borderBottomColor: theme.border }]}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => setActiveTab(tab.key)}
          style={[
            styles.tab,
            activeTab === tab.key && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === tab.key ? theme.primary : theme.textSecondary },
            ]}
          >
            {tab.label}
          </ThemedText>
        </Pressable>
      ))}
    </DirectionalRow>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <DirectionalRow style={{ alignItems: "center", justifyContent: "space-between" }}>
        <ThemedText style={[Typography.title, { fontSize: 20, fontWeight: "600" }]}>
          {t("navigation.allRequests")}
        </ThemedText>
        <DirectionalRow style={{ gap: Spacing.sm }}>
          <Pressable
            onPress={() => setViewMode("card")}
            style={[
              styles.toggleButton,
              { backgroundColor: viewMode === "card" ? theme.primary : "transparent" },
            ]}
          >
            <DDIcon
              name="grid"
              size={18}
              color={viewMode === "card" ? theme.buttonText : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => setViewMode("list")}
            style={[
              styles.toggleButton,
              { backgroundColor: viewMode === "list" ? theme.primary : "transparent" },
            ]}
          >
            <DDIcon
              name="list"
              size={18}
              color={viewMode === "list" ? theme.buttonText : theme.textSecondary}
            />
          </Pressable>
        </DirectionalRow>
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      <DirectionalRow
        style={[
          styles.searchBar,
          { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
        ]}
      >
        <DDIcon name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[
            styles.searchInput,
            {
              color: theme.text,
              textAlign: isRTL ? "right" : "left",
              writingDirection: isRTL ? "rtl" : "ltr",
            },
          ]}
          placeholder={t("common.search")}
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <DDIcon name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      {renderTabBar()}
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: ApprovalHistoryItemDto }) => {
      const request = mapHistoryToVisitorRequest(item);
      const isPending = item.status === "pending";
      const showActions = isPending && activeTab === "pending";

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
            onApprove={showActions ? () => handleApprove(item.id) : undefined}
            onReject={showActions ? () => handleReject(item.id) : undefined}
            approveLoading={approvingRequestId === item.id}
            rejectLoading={rejectingRequestId === item.id}
          />
        </View>
      );
    },
    [activeTab, numColumns, handleViewDetails, handleApprove, handleReject, approvingRequestId, rejectingRequestId]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <DDIcon name="inbox" size={48} color={theme.textSecondary} />
      <Spacer height={Spacing.md} />
      <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: "center" }]}>
        {t("common.noResults")}
      </ThemedText>
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
        key={`${viewMode}-${numColumns}`}
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
        ListEmptyComponent={renderEmptyState}
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginEnd: Spacing.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
});
