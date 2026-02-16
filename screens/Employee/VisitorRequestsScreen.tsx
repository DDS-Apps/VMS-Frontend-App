import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, Alert, Platform, useWindowDimensions } from "react-native";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { capitalizeFirst } from "@/utils/formatters";
import { DDIcon } from "@/components/DDIcon";
import { SkeletonList } from "@/components/shared/Skeleton";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenFlatList } from "@/components/ScreenFlatList";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import {
  REQUEST_STATUS,
  UPCOMING_STATUSES,
  CANCELLED_STATUSES,
  PURPOSE_VALUE_TO_KEY,
  normalizePurposeValue,
} from "@/constants/requestConstants";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitorRequest } from "@/types/vms.types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  useInfiniteVisitsQuery,
  usePendingHostWalkInsQuery,
} from "@/hooks/queries/useApprovalQueries";
import { ListLoadingFooter, VisitorRequestCard, RTLHorizontalScrollView } from "@/components/shared";
import type { VisitListItemDto } from "@/types/api.types";
import {
  getStatusConfig as getStatusStyle,
  applyOpacity,
  StatusConfig,
} from "@/utils/statusStyles";
import type { Theme } from "@/types/theme.types";
import type { EmployeeStackParamList } from "@/types/employeeNavigation.types";
import type { ManagerStackParamList } from "@/types/managerNavigation.types";
import {
  mapVisitListItemToVisitorRequest,
  mapPendingHostWalkInToVisitorRequest,
} from "@/utils/requestMappers";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { KPICard, KPICardRow } from "@/components/shared/KPICard";

// Unified Layout Tokens
const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.xxl,
  contentGap: Spacing.md,
  statCardRadius: BorderRadius.md,
  statusBorderWidth: 3,
  // Table-specific
  tableRowHeight: 110,
  tableFixedColumnWidth: 160,
  tableScrollColumnWidth: 240,
};

type EmployeeTab = "upcoming" | "waiting" | "past" | "all" | "walkin";
type ManagerTab = "all" | "pending" | "awaiting" | "walkin";
type TabType = EmployeeTab | ManagerTab;

interface VisitorRequestsScreenProps {
  navigation?: NativeStackNavigationProp<EmployeeStackParamList>;
  userRole?: "employee" | "manager";
}

// Shared: Status Accent Bar Component
const StatusAccent = ({ color }: { color: string }) => (
  <View style={[styles.statusAccent, { backgroundColor: color }]} />
);

// Shared: Service Icons Component
const ServiceIcons = ({
  request,
  theme,
  size = 16,
}: {
  request: VisitorRequest;
  theme: Theme;
  size?: number;
}) => {
  const { isRTL } = useLanguage();
  const hasServices =
    request.parkingSlot ||
    request.meetingRoom ||
    request.buffet ||
    request.valet;

  if (!hasServices) {
    return (
      <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
        -
      </ThemedText>
    );
  }

  return (
    <DirectionalRow style={styles.servicesRow}>
      {request.parkingSlot ? (
        <View
          style={[
            styles.servicePill,
            {
              backgroundColor: applyOpacity(theme.info, "20"),
              width: size * 2,
              height: size * 2,
              borderRadius: size,
            },
          ]}
        >
          <DDIcon name="map-pin" size={size} color={theme.info} />
        </View>
      ) : null}
      {request.meetingRoom ? (
        <View
          style={[
            styles.servicePill,
            {
              backgroundColor: applyOpacity(theme.secondary, "20"),
              width: size * 2,
              height: size * 2,
              borderRadius: size,
            },
          ]}
        >
          <DDIcon name="briefcase" size={size} color={theme.secondary} />
        </View>
      ) : null}
      {request.buffet ? (
        <View
          style={[
            styles.servicePill,
            {
              backgroundColor: applyOpacity(theme.warning, "20"),
              width: size * 2,
              height: size * 2,
              borderRadius: size,
            },
          ]}
        >
          <DDIcon name="cloche" size={size} variant="warning" />
        </View>
      ) : null}
      {request.valet ? (
        <View
          style={[
            styles.servicePill,
            {
              backgroundColor: applyOpacity(theme.primary, "20"),
              width: size * 2,
              height: size * 2,
              borderRadius: size,
            },
          ]}
        >
          <DDIcon name="truck" size={size} variant="primary" />
        </View>
      ) : null}
    </DirectionalRow>
  );
};

// Shared: Status Badge Component - matches shared VisitorRequestCard styling
const StatusBadge = ({
  statusConfig,
  compact = false,
}: {
  statusConfig: StatusConfig;
  compact?: boolean;
}) => (
  <View
    style={[
      styles.statusBadge,
      {
        backgroundColor: statusConfig.bg,
        borderColor: statusConfig.border,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
      },
    ]}
  >
    <ThemedText
      style={[
        styles.statusText,
        { color: statusConfig.text, fontSize: compact ? 10 : 10 },
      ]}
    >
      {statusConfig.label}
    </ThemedText>
  </View>
);

// Shared: Visitor Avatar Component
const VisitorAvatar = ({
  name,
  theme,
  size = 44,
}: {
  name: string;
  theme: Theme;
  size?: number;
}) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: applyOpacity(theme.primary, "15"),
          width: size,
          height: size,
          borderRadius: LAYOUT.cardRadius - 2,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.avatarText,
          { color: theme.primary, fontSize: size * 0.36 },
        ]}
      >
        {initials}
      </ThemedText>
    </View>
  );
};

// Shared: Date/Time Display Component
const DateTimeDisplay = ({
  date,
  time,
  duration,
  theme,
  compact = false,
}: {
  date: string;
  time: string;
  duration?: string;
  theme: Theme;
  compact?: boolean;
}) => {
  const { formatDateShort, toLocalNumerals, formatTimeFromString } =
    useFormatters();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const formatVisitDate = (dateString: string) => {
    const d = new Date(dateString);
    return formatDateShort(d);
  };

  const formatDuration = (durationStr: string): string => {
    const match = durationStr.match(
      /(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|minute|minutes|min|mins)/i,
    );
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      const localNum = toLocalNumerals(num.toString());
      if (unit.startsWith("hour") || unit.startsWith("hr")) {
        return `${localNum} ${num === 1 ? t("time.hour") : t("time.hours")}`;
      } else {
        return `${localNum} ${num === 1 ? t("time.minute") : t("time.minutes")}`;
      }
    }
    return toLocalNumerals(durationStr);
  };
  return (
    <View
      style={[
        styles.dateTimeRowSplit,
        { alignItems: isRTL ? "flex-end" : "flex-start" },
      ]}
    >
      <DirectionalRow style={styles.dateTimeLeft}>
        <DirectionalRow>
          <DDIcon name="calendar" size={compact ? 13 : 14} variant="muted" />
          <ThemedText
            style={[
              styles.dateTimeText,
              {
                color: theme.textSecondary,
                fontSize: compact ? 12 : 13,
                marginEnd: 4,
              },
            ]}
          >
            {formatVisitDate(date)}
          </ThemedText>
        </DirectionalRow>
      </DirectionalRow>
      <DirectionalRow style={styles.dateTimeRight}>
        <DDIcon name="clock" size={compact ? 13 : 14} variant="muted" />
        <ThemedText
          style={[
            styles.dateTimeText,
            { color: theme.textSecondary, fontSize: compact ? 12 : 13 },
          ]}
        >
          {formatTimeFromString(time)}
        </ThemedText>
        {duration ? (
          <>
            <ThemedText style={[styles.separator, { color: theme.border }]}>
              •
            </ThemedText>
            <ThemedText
              style={[
                styles.dateTimeText,
                { color: theme.textSecondary, fontSize: compact ? 12 : 13 },
              ]}
            >
              {formatDuration(duration)}
            </ThemedText>
          </>
        ) : null}
      </DirectionalRow>
    </View>
  );
};

// Table View: Horizontal Scrolling Row Component
const VisitorRequestTableRow = React.memo(
  ({
    request,
    onPress,
    theme,
    t,
    isRTL = false,
  }: {
    request: VisitorRequest;
    onPress: () => void;
    theme: Theme;
    t: (key: string) => string;
    isRTL?: boolean;
  }) => {
    const statusConfig = getStatusStyle(theme, request.status, t);
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: applyOpacity(theme.primary, "10") }}
      >
        <ThemedView
          style={[
            styles.tableRow,
            { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: getFlexDirection(isRTL) },
          ]}
        >
          <StatusAccent color={statusConfig.borderColor} />

          {/* Fixed Column - Always Visible: Name & Time Only */}
          <View
            style={[
              styles.fixedColumn,
              { width: LAYOUT.tableFixedColumnWidth },
            ]}
          >
            <View style={styles.fixedColumnContent}>
              <View style={{ flex: 1 }}>
                <DirectionalRow style={{ alignItems: "center", gap: 6 }}>
                  <ThemedText
                    style={[
                      Typography.body,
                      { fontWeight: "600", fontSize: 15, flexShrink: 1 },
                    ]}
                    numberOfLines={2}
                  >
                    {capitalizeFirst(request.visitor.fullName)}
                  </ThemedText>
                  {request.isWalkIn ? (
                    <DDIcon name="user-check" size={14} color={theme.warning} />
                  ) : null}
                </DirectionalRow>
                <Spacer height={6} />
                <DateTimeDisplay
                  date={request.visitDate}
                  time={request.visitTime}
                  theme={theme}
                  compact
                />
              </View>
            </View>
          </View>

          {/* Scrollable Columns - All Details */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.scrollableColumns}
            contentContainerStyle={styles.scrollableContent}
            persistentScrollbar={true}
            nestedScrollEnabled={true}
          >
            {/* Company Column */}
            <View
              style={[
                styles.tableColumn,
                { width: LAYOUT.tableScrollColumnWidth },
              ]}
            >
              <ThemedText
                style={[styles.columnHeader, { color: theme.textSecondary }]}
              >
                {t("form.company").toUpperCase()}
              </ThemedText>
              <Spacer height={10} />
              <ThemedText
                style={[styles.columnValue, { fontSize: 15 }]}
                numberOfLines={2}
              >
                {request.visitor.company || "-"}
              </ThemedText>
            </View>

            {/* Purpose Column */}
            <View
              style={[
                styles.tableColumn,
                { width: LAYOUT.tableScrollColumnWidth },
              ]}
            >
              <ThemedText
                style={[styles.columnHeader, { color: theme.textSecondary }]}
              >
                {t("form.purpose").toUpperCase()}
              </ThemedText>
              <Spacer height={10} />
              <ThemedText
                style={[styles.columnValue, { fontSize: 15 }]}
                numberOfLines={3}
              >
                {(() => { const pv = normalizePurposeValue(request.purpose || ''); return PURPOSE_VALUE_TO_KEY[pv] ? t(PURPOSE_VALUE_TO_KEY[pv] as any) : (request.purpose || '-'); })()}
              </ThemedText>
            </View>

            {/* Status Column */}
            <View
              style={[
                styles.tableColumn,
                { width: LAYOUT.tableScrollColumnWidth },
              ]}
            >
              <ThemedText
                style={[styles.columnHeader, { color: theme.textSecondary }]}
              >
                {t("status.pending")
                  .toUpperCase()
                  .replace("PENDING", t("common.filter").toUpperCase())}
              </ThemedText>
              <Spacer height={10} />
              <StatusBadge statusConfig={statusConfig} />
            </View>

            {/* Services Column */}
            <View
              style={[
                styles.tableColumn,
                { width: LAYOUT.tableScrollColumnWidth },
              ]}
            >
              <ThemedText
                style={[
                  styles.columnHeader,
                  {
                    writingDirection: isRTL ? "rtl" : "ltr",
                    color: theme.textSecondary,
                  },
                ]}
              >
                {t("services.additionalServices").toUpperCase()}
              </ThemedText>
              <Spacer height={10} />
              <ServiceIcons request={request} theme={theme} size={16} />
            </View>

            {/* Contact Column */}
            <View
              style={[
                styles.tableColumn,
                { width: LAYOUT.tableScrollColumnWidth },
              ]}
            >
              <ThemedText
                style={[
                  styles.columnHeader,
                  {
                    writingDirection: isRTL ? "rtl" : "ltr",
                    color: theme.textSecondary,
                  },
                ]}
              >
                {t("security.manualEntry").toUpperCase().split(" ")[0]}
              </ThemedText>
              <Spacer height={10} />
              <View style={styles.contactColumn}>
                {request.visitor.email ? (
                  <View style={styles.contactRow}>
                    <DDIcon name="mail" size={14} variant="muted" />
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          writingDirection: isRTL ? "rtl" : "ltr",
                          fontSize: 14,
                          marginStart: 8,
                          color: theme.textSecondary,
                          flex: 1,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {request.visitor.email}
                    </ThemedText>
                  </View>
                ) : null}
                {request.visitor.email && request.visitor.phone ? (
                  <Spacer height={6} />
                ) : null}
                {request.visitor.phone ? (
                  <View style={styles.contactRow}>
                    <DDIcon name="phone" size={14} variant="muted" />
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          fontSize: 14,
                          marginStart: 8,
                          color: theme.textSecondary,
                          flex: 1,
                          writingDirection: 'ltr',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {request.visitor.phone}
                    </ThemedText>
                  </View>
                ) : null}
                {!request.visitor.email && !request.visitor.phone ? (
                  <ThemedText
                    style={[Typography.caption, { color: theme.textSecondary }]}
                  >
                    -
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </ThemedView>
      </Pressable>
    );
  },
);

// Shared: Stats Cards Component
const StatsCards = ({
  totalVisitors,
  todaysVisitors,
  theme,
  t,
}: {
  totalVisitors: number;
  todaysVisitors: number;
  theme: Theme;
  t: (key: string) => string;
}) => (
  <KPICardRow>
    <KPICard 
      title={t("dashboard.totalVisitors")} 
      value={totalVisitors} 
      icon="users" 
      color={theme.info}
    />
    <KPICard 
      title={t("dashboard.todaysVisitors")} 
      value={todaysVisitors} 
      icon="calendar" 
      color={theme.success}
    />
  </KPICardRow>
);

// Shared: Header with Tabs and View Toggle
const SectionHeader = ({
  selectedTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  theme,
  t,
  userRole = "employee",
}: {
  selectedTab: TabType;
  onTabChange: (tab: TabType) => void;
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  theme: Theme;
  t: (key: string) => string;
  userRole?: "employee" | "manager";
}) => {
  const { isRTL } = useLanguage();
  const getEmployeeTabLabel = (tab: EmployeeTab) => {
    switch (tab) {
      case "upcoming":
        return t("visitor.upcomingVisitors");
      case "waiting":
        return t("status.waitingOnVisitor");
      case "past":
        return t("status.completed");
      case "all":
        return t("common.all");
      case "walkin":
        return t("navigation.walkInVisitors");
    }
  };

  const getManagerTabLabel = (tab: ManagerTab) => {
    switch (tab) {
      case "all":
        return t("common.all");
      case "pending":
        return t("navigation.pendingApprovals");
      case "awaiting":
        return t("navigation.awaitingVisitor");
      case "walkin":
        return t("navigation.walkInVisitors");
    }
  };

  const getTabLabel = (tab: TabType) => {
    if (userRole === "manager") {
      return getManagerTabLabel(tab as ManagerTab);
    }
    return getEmployeeTabLabel(tab as EmployeeTab);
  };

  const tabs: TabType[] =
    userRole === "manager"
      ? ["all", "pending", "awaiting", "walkin"]
      : ["all", "upcoming", "waiting", "past", "walkin"];
  const titleElement = (
    <ThemedText
      style={[Typography.subtitle, {}]}
    >
      {t("navigation.myRequests")}
    </ThemedText>
  );

  const viewToggleElement = (
    <DirectionalRow style={styles.viewToggle}>
      <Pressable
        style={[
          styles.viewToggleButton,
          styles.viewToggleButtonLeft,
          {
            backgroundColor:
              viewMode === "card" ? theme.primary : theme.surface,
            borderColor: theme.border,
          },
        ]}
        onPress={() => onViewModeChange("card")}
        android_ripple={{ color: applyOpacity(theme.primary, "10") }}
      >
        <DDIcon
          name="grid"
          size={16}
          color={viewMode === "card" ? theme.buttonText : theme.textSecondary}
        />
      </Pressable>
      <Pressable
        style={[
          styles.viewToggleButton,
          styles.viewToggleButtonRight,
          {
            backgroundColor:
              viewMode === "list" ? theme.primary : theme.surface,
            borderColor: theme.border,
          },
        ]}
        onPress={() => onViewModeChange("list")}
        android_ripple={{ color: applyOpacity(theme.primary, "10") }}
      >
        <DDIcon
          name="menu"
          size={16}
          color={viewMode === "list" ? theme.buttonText : theme.textSecondary}
        />
      </Pressable>
    </DirectionalRow>
  );

  // For RTL: reverse tabs order so they start from right
  const displayTabs = isRTL ? [...tabs].reverse() : tabs;

  return (
    <>
      <DirectionalRow style={[styles.sectionTitleRow, styles.paddedContent]}>
        {titleElement}
        {Platform.OS === 'web' ? viewToggleElement : null}
      </DirectionalRow>

      <Spacer height={LAYOUT.contentGap} />

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.tabsContainer,
          { flexDirection: getFlexDirection(isRTL) },
        ]}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {displayTabs.map((tab) => (
          <GHTouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && {
                borderBottomWidth: 2,
                borderBottomColor: theme.primary,
              },
            ]}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                Typography.body,
                {
                  color:
                    selectedTab === tab ? theme.primary : theme.textSecondary,
                  fontWeight: "600",
                },
              ]}
              numberOfLines={1}
            >
              {getTabLabel(tab)}
            </ThemedText>
          </GHTouchableOpacity>
        ))}
      </RTLHorizontalScrollView>
    </>
  );
};

// Shared: Empty State
const EmptyState = ({
  theme,
  t,
}: {
  theme: Theme;
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

// Route params type that works for both stacks
type VisitorRequestsRouteParams = {
  initialTab?: string;
};

// Main Screen Component
export default function VisitorRequestsScreen({
  navigation: navProp,
  userRole = "employee",
}: VisitorRequestsScreenProps = {}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const navigationHook =
    useNavigation<NativeStackNavigationProp<EmployeeStackParamList>>();
  const navigation = navProp || navigationHook;
  const route = useRoute();
  const routeParams = route.params as VisitorRequestsRouteParams | undefined;
  const { user } = useAuth();
  const isManager = userRole === "manager";

  const validManagerTabs: ManagerTab[] = [
    "all",
    "pending",
    "awaiting",
    "walkin",
  ];
  const validEmployeeTabs: EmployeeTab[] = [
    "all",
    "upcoming",
    "waiting",
    "past",
    "walkin",
  ];
  const isValidManagerTab = (tab: string): tab is ManagerTab =>
    validManagerTabs.includes(tab as ManagerTab);
  const isValidEmployeeTab = (tab: string): tab is EmployeeTab =>
    validEmployeeTabs.includes(tab as EmployeeTab);

  const defaultTab: TabType = isManager ? "all" : "all";
  const getInitialTab = (): TabType | undefined => {
    const paramTab = routeParams?.initialTab;
    if (!paramTab) return undefined;
    if (isManager && isValidManagerTab(paramTab)) return paramTab;
    if (!isManager && isValidEmployeeTab(paramTab)) return paramTab;
    return undefined;
  };
  const initialTabFromParams = getInitialTab();

  // Use ref to track initial tab application to prevent flickering from double-updates
  const appliedInitialTabRef = useRef<string | undefined>(initialTabFromParams);
  
  const [selectedTab, setSelectedTab] = useState<TabType>(
    initialTabFromParams || defaultTab,
  );
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Only update tab if navigation params change AFTER initial mount (e.g., navigating back with different tab)
  // Skip if the param matches what we already applied to prevent flickering
  useEffect(() => {
    const paramTab = routeParams?.initialTab;
    
    // Skip if no param, or if it matches what we've already applied
    if (!paramTab || paramTab === appliedInitialTabRef.current) return;

    // Validate and apply the new tab
    if (isManager && isValidManagerTab(paramTab)) {
      setSelectedTab(paramTab);
      appliedInitialTabRef.current = paramTab;
    } else if (!isManager && isValidEmployeeTab(paramTab)) {
      setSelectedTab(paramTab);
      appliedInitialTabRef.current = paramTab;
    }
  }, [isManager, routeParams?.initialTab]);

  const isWalkInTab = selectedTab === "walkin";

  const visitsParams = useMemo(() => {
    if (isManager) {
      switch (selectedTab) {
        case "pending":
          return { pendingApproval: true };
        case "awaiting":
          return { awaitingVisitor: true };
        case "walkin":
          return {}; // Use separate pending host walk-ins query
        default:
          return {};
      }
    }
    // Employee: use myRequestsOnly to fetch only their own requests
    return { myRequestsOnly: true };
  }, [isManager, selectedTab]);

  const {
    data: visitsData,
    isLoading: isVisitsLoading,
    isFetching: isVisitsFetching,
    error: visitsError,
    refetch: refetchVisits,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteVisitsQuery(visitsParams, !isWalkInTab);

  // Query for pending host walk-ins (used when walkin tab is selected)
  const {
    data: pendingHostWalkInsData,
    isLoading: isPendingHostWalkInsLoading,
    isFetching: isPendingHostWalkInsFetching,
    error: pendingHostWalkInsError,
    refetch: refetchPendingHostWalkIns,
  } = usePendingHostWalkInsQuery({ limit: 100 }, isWalkInTab);

  const isLoading = isWalkInTab ? isPendingHostWalkInsLoading : isVisitsLoading;
  const isFetching = isWalkInTab
    ? isPendingHostWalkInsFetching
    : isVisitsFetching;
  const error = isWalkInTab ? pendingHostWalkInsError : visitsError;
  const refetch = isWalkInTab ? refetchPendingHostWalkIns : refetchVisits;

  // Track if this is the initial mount to avoid double-fetching
  const isInitialMount = useRef(true);

  // Refetch data when screen gains focus to show latest status (skip initial mount)
  useFocusEffect(
    useCallback(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );

  const requests = useMemo(() => {
    if (isWalkInTab) {
      if (!pendingHostWalkInsData?.data) return [];
      return pendingHostWalkInsData.data.map(
        mapPendingHostWalkInToVisitorRequest,
      );
    }
    if (!visitsData?.pages) return [];
    return visitsData.pages.flatMap((page) =>
      page.data.map(mapVisitListItemToVisitorRequest),
    );
  }, [isWalkInTab, visitsData?.pages, pendingHostWalkInsData?.data]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Only show skeleton on initial load (no cached data), not during background refetches
  // This prevents flickering when the screen gains focus and refetches in the background
  if (isLoading && requests.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          paddingHorizontal: Spacing.xl,
          paddingTop: insets.top + Spacing.xl,
        }}
      >
        <SkeletonList count={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          paddingHorizontal: Spacing.xl,
          paddingTop: insets.top + Spacing.xl,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <DDIcon name="alert-circle" size={48} color={theme.error} />
        <Spacer height={Spacing.md} />
        <ThemedText
          style={[
            Typography.body,
            { color: theme.textSecondary, textAlign: "center" },
          ]}
        >
          {t("errors.loadFailed")}
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
    );
  }

  const totalVisitors = requests.length;
  const todaysVisitors = requests.filter((request) => {
    const visitDate = new Date(request.visitDate);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;

  const getFilteredRequests = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = requests;

    switch (selectedTab) {
      case "upcoming":
        filtered = requests.filter((request) => {
          const visitDate = new Date(request.visitDate);
          return (
            visitDate >= today &&
            (UPCOMING_STATUSES as readonly string[]).includes(request.status)
          );
        });
        break;
      case "waiting":
        filtered = requests.filter((request) => {
          return request.status === REQUEST_STATUS.VISITOR_PENDING;
        });
        break;
      case "past":
        filtered = requests.filter((request) => {
          const visitDate = new Date(request.visitDate);
          return (
            visitDate < today ||
            request.status === REQUEST_STATUS.COMPLETED ||
            (CANCELLED_STATUSES as readonly string[]).includes(request.status)
          );
        });
        break;
      case "walkin":
        // For walkin tab, the data already comes from the pending-host API
        // Just return all requests as they are already filtered
        filtered = requests;
        break;
      case "all":
      default:
        filtered = requests;
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  // List View Layout - CRITICAL: ScreenFlatList as ROOT element
  if (viewMode === "list") {
    return (
      <>
        <ScreenFlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.paddedContent}>
              <VisitorRequestTableRow
                request={item}
                onPress={() =>
                  navigation.navigate(
                    ROUTES.REQUEST_DETAILS as never,
                    { requestId: item.id } as never,
                  )
                }
                theme={theme}
                t={t}
                isRTL={isRTL}
              />
            </View>
          )}
          ListHeaderComponent={
            <>
              {/* Stats Cards - needs padding */}
              <View style={styles.paddedContent}>
                <StatsCards
                  totalVisitors={totalVisitors}
                  todaysVisitors={todaysVisitors}
                  theme={theme}
                  t={t}
                />
              </View>

              <Spacer height={LAYOUT.sectionSpacing} />

              {/* Header Controls - SectionHeader handles its own padding */}
              <SectionHeader
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                theme={theme}
                t={t}
                userRole={userRole}
              />

              <Spacer height={Spacing.lg} />
            </>
          }
          ListEmptyComponent={
            <View style={styles.paddedContent}>
              <EmptyState theme={theme} t={t} />
            </View>
          }
          ListFooterComponent={
            <ListLoadingFooter isLoading={isFetchingNextPage && !isWalkInTab} />
          }
          ItemSeparatorComponent={() => <Spacer height={Spacing.md} />}
          onEndReached={isWalkInTab ? undefined : handleLoadMore}
          onEndReachedThreshold={0.5}
        />

        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              bottom: insets.bottom + 80 + Spacing.lg,
            },
          ]}
          onPress={() =>
            navigation.navigate(ROUTES.VISIT_TYPE_SELECTION as never)
          }
        >
          <DDIcon name="user-plus" size={24} color={theme.buttonText} />
        </Pressable>
      </>
    );
  }

  // Card View Layout - CRITICAL: ScreenFlatList as ROOT element for infinite scroll
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth > 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  
  // Get item style based on numColumns - use flexBasis percentage for reliable multi-column layout
  const getItemStyle = () => {
    if (numColumns === 1) return styles.paddedContent;
    // Use percentage-based flexBasis that accounts for gaps
    // Each item takes equal space, flexShrink allows items to shrink to fit
    return { 
      flex: 1,
      minWidth: 0, // Allow items to shrink below content size
    };
  };
  
  return (
    <>
      <ScreenFlatList
        key={`flatlist-${numColumns}`}
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.webGridRow : undefined}
        renderItem={({ item }) => (
          <View style={getItemStyle()}>
            <VisitorRequestCard
              request={item}
              onPress={() =>
                navigation.navigate(
                  ROUTES.REQUEST_DETAILS as never,
                  { requestId: item.id } as never,
                )
              }
            />
          </View>
        )}
        ListHeaderComponent={
          <>
            <Spacer height={Spacing.md} />

            {/* Stats Cards - needs padding */}
            <View style={styles.paddedContent}>
              <StatsCards
                totalVisitors={totalVisitors}
                todaysVisitors={todaysVisitors}
                theme={theme}
                t={t}
              />
            </View>

            <Spacer height={LAYOUT.sectionSpacing} />

            {/* Section Header - handles its own padding for horizontal scrolls */}
            <SectionHeader
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              theme={theme}
              t={t}
              userRole={userRole}
            />

            <Spacer height={Spacing.lg} />
          </>
        }
        ListEmptyComponent={
          <View style={styles.paddedContent}>
            <EmptyState theme={theme} t={t} />
          </View>
        }
        ListFooterComponent={
          <ListLoadingFooter isLoading={isFetchingNextPage && !isWalkInTab} />
        }
        ItemSeparatorComponent={() => <Spacer height={LAYOUT.contentGap} />}
        onEndReached={isWalkInTab ? undefined : handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: insets.bottom + 80 + Spacing.lg,
          },
        ]}
        onPress={() =>
          navigation.navigate(ROUTES.VISIT_TYPE_SELECTION as never)
        }
      >
        <DDIcon name="user-plus" size={24} color={theme.buttonText} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  // Content wrapper - ScreenScrollView/ScreenFlatList already provides paddingHorizontal: Spacing.xl
  paddedContent: {
    // No additional horizontal padding needed
  },
  // Web 3-column grid layout
  webGridRow: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  webGridItem: {
    flex: 1,
  },
  // Shared: Layout
  statsGrid: {
    gap: LAYOUT.contentGap,
  },
  statCard: {
    flex: 1,
    padding: LAYOUT.cardPadding,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitleRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabsContainer: {
    gap: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  viewToggle: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  viewToggleButton: {
    padding: Spacing.sm,
    minWidth: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
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

  // Shared: Status Accent
  statusAccent: {
    position: "absolute",
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.statusBorderWidth,
    borderTopStartRadius: LAYOUT.cardRadius,
    borderBottomStartRadius: LAYOUT.cardRadius,
  },

  // Shared: Components
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontWeight: "700",
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  servicesRow: {
    gap: 8,
    flexWrap: "wrap-reverse",
  },
  servicePill: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: "600",
  },
  nameWithBadgeRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dateTimeRow: {
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  dateTimeRowSplit: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  dateTimeLeft: {
    alignItems: "center",
    gap: 6,
  },
  dateTimeRight: {
    alignItems: "center",
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
  },
  separator: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  emptyState: {
    padding: Spacing.xxl,
    borderRadius: LAYOUT.cardRadius,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  // Card View Styles
  requestCard: {
    borderRadius: LAYOUT.cardRadius,
    padding: LAYOUT.cardPadding,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMainSection: {
    // Container for main card content
  },
  cardHeaderRow: {
    alignItems: "center",
    gap: LAYOUT.contentGap,
  },
  cardNameSection: {
    flex: 1,
  },
  dividerLine: {
    height: 1,
    marginVertical: LAYOUT.contentGap,
  },
  expandedContentInside: {
    paddingBottom: Spacing.xs,
  },
  secondaryDetail: {
    alignItems: "center",
  },
  contactSection: {
    // Container for contact details
  },
  moreDetailsButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: LAYOUT.contentGap,
    gap: 4,
  },
  moreDetailsText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Table View Styles
  tableRow: {
    minHeight: LAYOUT.tableRowHeight,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  fixedColumn: {
    justifyContent: "center",
    borderEndWidth: 1,
    borderEndColor: "rgba(0,0,0,0.06)",
  },
  fixedColumnContent: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.md,
  },
  scrollableColumns: {
    flex: 1,
  },
  scrollableContent: {
    paddingEnd: Spacing.xl,
  },
  tableColumn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    justifyContent: "center",
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  columnValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactColumn: {
    // Container for contact info
  },
  contactRow: {
    alignItems: "center",
  },

  // FAB
  fab: {
    position: "absolute",
    end: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
