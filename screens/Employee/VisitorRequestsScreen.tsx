import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, Alert, Platform, useWindowDimensions, ActivityIndicator } from "react-native";
import { capitalizeFirst, getInitials } from "@/utils/formatters";
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
import { SearchInput } from "@/components/SearchInput";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import {
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
} from "@/hooks/queries/useApprovalQueries";
import { ListLoadingFooter, VisitorRequestCard, RTLHorizontalScrollView, FilterChip, RequestStatusBadge, VisitorMatrixTable } from "@/components/shared";
import type { VisitorMatrixItem } from "@/components/shared";
import type { VisitListItemDto, VisitListParams } from "@/types/api.types";
import {
  getStatusConfig as getStatusStyle,
  applyOpacity,
} from "@/utils/statusStyles";
import type { Theme } from "@/types/theme.types";
import type { EmployeeStackParamList } from "@/types/employeeNavigation.types";
import type { ManagerStackParamList } from "@/types/managerNavigation.types";
import {
  mapVisitListItemToVisitorRequest,
} from "@/utils/requestMappers";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { formatAbsoluteTimestamp } from "@/utils/dateTimeUtils";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsVisitExpired,
  getPendingApprovalWalkInScheduledEndMs,
} from "@/utils/visitExpiredGuard";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import { useRetainedDatedData } from "@/hooks/useRetainedDatedData";
import { canAutomaticallyFetchNextPage } from "@/utils/queryPaginationState";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";

// Unified Layout Tokens
const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.xxl,
  contentGap: Spacing.md,
  statusBorderWidth: 3,
  // Table-specific
  tableRowHeight: 110,
  tableFixedColumnWidth: 160,
  tableScrollColumnWidth: 240,
};

type TabType = "all" | "to_be_checked" | "checked_in" | "checked_out";

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
    resolveParkingDisplayDecision({
      parkingDecision: request.parkingDecision,
      visitorNeedsParking: request.visitorNeedsParking,
      isVisitorNeedsParking: request.isVisitorNeedsParking,
      hasParkingAllocation: !!request.parkingSlot,
    }) === 'required' ||
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
      {resolveParkingDisplayDecision({
        parkingDecision: request.parkingDecision,
        visitorNeedsParking: request.visitorNeedsParking,
        isVisitorNeedsParking: request.isVisitorNeedsParking,
        hasParkingAllocation: !!request.parkingSlot,
      }) === 'required' ? (
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
  const initials = getInitials(name);
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
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
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
        <DirectionalRow style={{ gap: 4 }}>
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
      <DirectionalRow style={[styles.dateTimeRight, { gap: 4 }]}>
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

// Shared: Header with Tabs and View Toggle
const SectionHeader = ({
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
  selectedTab: TabType;
  onTabChange: (tab: TabType) => void;
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  isDateFilterActive: boolean;
  onDatePress: () => void;
  onClearDatePress: () => void;
  theme: Theme;
  t: (key: string) => string;
}) => {
  const { isRTL } = useLanguage();

  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case "to_be_checked": return t("status.toBeChecked");
      case "checked_in": return t("status.checkedIn");
      case "checked_out": return t("status.checkedOut");
      case "all":
      default: return t("common.all");
    }
  };

  const tabs: TabType[] = ["all", "to_be_checked", "checked_in", "checked_out"];
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
  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();
  const navigationHook =
    useNavigation<NativeStackNavigationProp<EmployeeStackParamList>>();
  const navigation = navProp || navigationHook;
  const route = useRoute();
  const routeParams = route.params as VisitorRequestsRouteParams | undefined;
  const { user } = useAuth();
  const isManager = userRole === "manager";
  const validTabs: TabType[] = ["all", "to_be_checked", "checked_in", "checked_out"];
  const isValidTab = (tab: string): tab is TabType =>
    validTabs.includes(tab as TabType);

  const defaultTab: TabType = "all";
  const getInitialTab = (): TabType | undefined => {
    const paramTab = routeParams?.initialTab;
    if (!paramTab) return undefined;
    if (isValidTab(paramTab)) return paramTab;
    return undefined;
  };
  const initialTabFromParams = getInitialTab();

  // Use ref to track initial tab application to prevent flickering from double-updates
  const appliedInitialTabRef = useRef<string | undefined>(initialTabFromParams);
  
  const [selectedTab, setSelectedTab] = useState<TabType>(
    initialTabFromParams || defaultTab,
  );
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSearchSubmit = useCallback(() => {
    setSubmittedSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const paramTab = routeParams?.initialTab;
    if (!paramTab || paramTab === appliedInitialTabRef.current) return;
    if (isValidTab(paramTab)) {
      setSelectedTab(paramTab);
      appliedInitialTabRef.current = paramTab;
    }
  }, [routeParams?.initialTab]);

  const toLocalDateString = (date: Date) => {
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const hasDateFilter = dateRange.startDate !== null;

  const visitsParams = useMemo(() => {
    const params: Omit<VisitListParams, "page"> = {
      myRequestsOnly: true,
    };
    if (submittedSearch.trim()) {
      params.search = submittedSearch.trim();
    }
    if (dateRange.startDate) {
      params.startDate = toLocalDateString(dateRange.startDate);
    }
    if (dateRange.endDate) {
      params.endDate = toLocalDateString(dateRange.endDate);
    }
    return params;
  }, [submittedSearch, dateRange]);

  const {
    data: visitsData,
    isLoading: isVisitsLoading,
    isFetching: isVisitsFetching,
    error: visitsError,
    refetch: refetchVisits,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteVisitsQuery(visitsParams, true);
  const visitsSourceKey = JSON.stringify(visitsParams);
  const {
    data: displayedVisitsData,
    isRetained: isShowingPreviousVisits,
    dateKey: displayedVisitsSourceKey,
  } = useRetainedDatedData(visitsSourceKey, visitsData);
  const displayedVisitsParams = useMemo(
    () => JSON.parse(displayedVisitsSourceKey) as {
      search?: string;
      startDate?: string;
      endDate?: string;
    },
    [displayedVisitsSourceKey],
  );
  const displayedVisitsSourceLabel = useMemo(() => {
    const sourceParts: string[] = [];
    if (displayedVisitsParams.startDate) {
      sourceParts.push(
        displayedVisitsParams.endDate &&
          displayedVisitsParams.endDate !== displayedVisitsParams.startDate
          ? `${displayedVisitsParams.startDate} – ${displayedVisitsParams.endDate}`
          : displayedVisitsParams.startDate,
      );
    }
    if (displayedVisitsParams.search) {
      sourceParts.push(
        `${t("common.search")}: “${displayedVisitsParams.search}”`,
      );
    }
    return sourceParts.join(" · ") || t("common.all");
  }, [displayedVisitsParams, t]);

  const isLoading = isVisitsLoading;
  const isFetching = isVisitsFetching;
  const error = visitsError;
  const refetch = refetchVisits;

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
    if (!displayedVisitsData?.pages) return [];
    return displayedVisitsData.pages.flatMap((page) =>
      page.data.map(mapVisitListItemToVisitorRequest),
    );
  }, [displayedVisitsData?.pages]);
  const expirationBoundaries = useMemo(
    () =>
      requests.map((request) =>
        getPendingApprovalWalkInScheduledEndMs({
          isWalkIn: request.isWalkIn,
          status: request.status,
          visitDate: request.visitDate,
          visitTime: request.visitTime,
          endTime: request.endTime,
          duration: request.duration,
        }),
      ),
    [requests],
  );
  const expirationTick = useTimeBoundaryTick(expirationBoundaries);


  const handleLoadMore = useCallback(() => {
    if (
      canAutomaticallyFetchNextPage({
        hasNextPage,
        isFetching,
        isFetchNextPageError,
      })
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  const isPendingApprovalWalkInExpired = useCallback(
    (request: VisitorRequest) => {
      return computeIsPendingApprovalWalkInExpired({
        isWalkIn: request.isWalkIn,
        status: request.status,
        visitDate: request.visitDate,
        visitTime: request.visitTime,
        endTime: request.endTime,
        duration: request.duration,
      });
    },
    [expirationTick],
  );

  const isWalkInExpired = useCallback(
    (request: VisitorRequest) => {
      if (!request.isWalkIn) return false;
      if (isPendingApprovalWalkInExpired(request)) return true;
      return computeIsVisitExpired(
        request.visitDate,
        request.visitTime,
        request.endTime,
        request.duration,
        { isWalkIn: true },
      );
    },
    [isPendingApprovalWalkInExpired, riyadhBusinessDateKey],
  );

  const toMatrixItem = useCallback(
    (request: VisitorRequest): VisitorMatrixItem => {
      const purposeValue = normalizePurposeValue(request.purpose || "");
      const purposeLabel = PURPOSE_VALUE_TO_KEY[purposeValue]
        ? t(PURPOSE_VALUE_TO_KEY[purposeValue] as any)
        : request.purpose;
      return {
        id: request.id,
        visitorName: capitalizeFirst(request.visitor.fullName),
        company: request.visitor.company || undefined,
        visitDate: request.visitDate,
        plannedInTime: request.visitTime,
        plannedOutTime: request.endTime,
        status: request.status,
        actualInTime: request.checkedInAt,
        actualOutTime: request.checkedOutAt,
        hasParking:
          resolveParkingDisplayDecision({
            parkingDecision: request.parkingDecision,
            visitorNeedsParking: request.visitorNeedsParking,
            isVisitorNeedsParking: request.isVisitorNeedsParking,
            hasParkingAllocation: !!request.parkingSlot,
          }) === "required",
        hasBuffet: !!(request.buffet || request.isBuffet),
        hasValet: !!request.valet,
        hasMeetingRoom: !!(request.meetingRoom || request.isMeetingRoom),
        purpose: purposeLabel || undefined,
        email: request.visitor.email || undefined,
        phone: request.visitor.phone || undefined,
        isExpired: isWalkInExpired(request),
      };
    },
    [isPendingApprovalWalkInExpired, isWalkInExpired, t],
  );

  // Only show skeleton on initial load (no cached data), not during background refetches
  // This prevents flickering when the screen gains focus and refetches in the background
  if (isLoading && !displayedVisitsData) {
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

  if (error && !displayedVisitsData) {
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
    );
  }

  const getFilteredRequests = () => {
    let filtered = requests;

    switch (selectedTab) {
      case "to_be_checked":
        filtered = requests.filter(
          (r) => r.status === 'approved' || r.status === 'visitor_accepted',
        );
        break;
      case "checked_in":
        filtered = requests.filter((r) => r.status === 'checked_in');
        break;
      case "checked_out":
        filtered = requests.filter((r) => r.status === 'completed');
        break;
      case "all":
      default:
        filtered = requests;
    }

    if (
      hasDateFilter &&
      dateRange.startDate &&
      displayedVisitsSourceKey === visitsSourceKey
    ) {
      const start = toLocalDateString(dateRange.startDate);
      const end = toLocalDateString(dateRange.endDate ?? dateRange.startDate);
      filtered = filtered.filter((request) => {
        return request.visitDate >= start && request.visitDate <= end;
      });
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();
  const queryFeedback = isShowingPreviousVisits ? (
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
          displayedVisitsSourceLabel,
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
        <View style={styles.paddedContent}>
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
        </View>
      ) : null}
    </>
  );

  // List View Layout - CRITICAL: ScreenFlatList as ROOT element
  if (viewMode === "list") {
    return (
      <>
        <ScreenFlatList
          data={[]}
          extraData={expirationTick}
          keyExtractor={() => "_"}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {/* Header Controls - SectionHeader handles its own padding */}
              <SectionHeader
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                isDateFilterActive={hasDateFilter}
                onDatePress={() => setShowDatePicker(true)}
                onClearDatePress={() => setDateRange({ startDate: null, endDate: null })}
                theme={theme}
                t={t}
              />

              <Spacer height={Spacing.md} />

              {/* Search */}
              <View style={styles.paddedContent}>
                <View style={styles.searchRow}>
                  <View style={styles.searchInputWrapper}>
                    <SearchInput
                      placeholder={t("common.search")}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onClear={() => setSubmittedSearch("")}
                      onSubmitSearch={handleSearchSubmit}
                      onSubmitEditing={handleSearchSubmit}
                      returnKeyType="search"
                    />
                  </View>
                </View>
              </View>

              <Spacer height={Spacing.md} />

              <View style={styles.paddedContent}>
                {queryFeedback}
                {queryFeedback ? <Spacer height={Spacing.md} /> : null}
                {filteredRequests.length > 0 ? (
                  <VisitorMatrixTable
                    variant="matrix"
                    visitors={filteredRequests.map(toMatrixItem)}
                    onPressRow={(id) =>
                      navigation.navigate(
                        ROUTES.REQUEST_DETAILS as any,
                        { requestId: id } as any,
                      )
                    }
                    emptyMessage={t("common.noResults")}
                    showExpiredState={true}
                  />
                ) : (
                  <EmptyState theme={theme} t={t} />
                )}
              </View>
            </>
          }
          ListFooterComponent={paginationFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />

        <CalendarDatePicker
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          mode="range"
          dateRange={dateRange}
          onDateSelect={(date) => {
            setDateRange({ startDate: date, endDate: date });
            setShowDatePicker(false);
          }}
          onRangeSelect={(range) => {
            setDateRange(range);
            setShowDatePicker(false);
          }}
          allowPastDates
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
            navigation.navigate(ROUTES.VISITOR_REQUEST_FORM as any)
          }
        >
          <DDIcon name="user-plus" size={24} color={theme.buttonText} />
        </Pressable>
      </>
    );
  }

  // Card View Layout - CRITICAL: ScreenFlatList as ROOT element for infinite scroll
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth >= 900 ? 3 : screenWidth >= 600 ? 2 : 1;
  
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
        extraData={expirationTick}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.webGridRow : undefined}
        renderItem={({ item }) => (
          <View style={getItemStyle()}>
            <VisitorRequestCard
              request={item}
              isExpired={isWalkInExpired(item)}
              showExpiredState={true}
              onPress={() =>
                navigation.navigate(
                  ROUTES.REQUEST_DETAILS as any,
                  { requestId: item.id } as any,
                )
              }
            />
          </View>
        )}
        ListHeaderComponent={
          <>
            <Spacer height={Spacing.md} />

            {/* Section Header - handles its own padding for horizontal scrolls */}
            <SectionHeader
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              isDateFilterActive={hasDateFilter}
              onDatePress={() => setShowDatePicker(true)}
              onClearDatePress={() => setDateRange({ startDate: null, endDate: null })}
              theme={theme}
              t={t}
            />

            <Spacer height={Spacing.md} />

            {/* Search */}
            <View style={styles.paddedContent}>
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrapper}>
                  <SearchInput
                    placeholder={t("common.search")}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onClear={() => setSubmittedSearch("")}
                    onSubmitSearch={handleSearchSubmit}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                  />
                </View>
              </View>
            </View>

            <Spacer height={Spacing.md} />
            {queryFeedback}
            {queryFeedback ? <Spacer height={Spacing.md} /> : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.paddedContent}>
            <EmptyState theme={theme} t={t} />
          </View>
        }
        ListFooterComponent={paginationFooter}
        ItemSeparatorComponent={() => <Spacer height={LAYOUT.contentGap} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        mode="range"
        dateRange={dateRange}
        onDateSelect={(date) => {
          setDateRange({ startDate: date, endDate: date });
          setShowDatePicker(false);
        }}
        onRangeSelect={(range) => {
          setDateRange(range);
          setShowDatePicker(false);
        }}
        allowPastDates
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
          navigation.navigate(ROUTES.VISITOR_REQUEST_FORM as any)
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
  inlineQueryFeedback: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
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

  // Search & Date Filter
  searchRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  searchInputWrapper: {
    flex: 1,
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
