import React, { useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import {
  useNavigation,
  ParamListBase,
  useFocusEffect,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon, IconName } from "@/components/DDIcon";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole, VisitorRequest } from "@/types/vms.types";
import { SkeletonDashboard, VisitorRequestCard } from "@/components/shared";
import {
  useVisitsQuery,
  usePendingApprovalsQuery,
  useAwaitingVisitorQuery,
  usePendingHostWalkInsQuery,
} from "@/hooks/queries/useApprovalQueries";
import {
  mapVisitListItemToVisitorRequest,
  mapAwaitingVisitorToVisitorRequest,
  mapPendingApprovalToVisitorRequest,
  mapPendingHostWalkInToVisitorRequest,
} from "@/utils/requestMappers";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { KPICard, KPICardRow } from "@/components/shared/KPICard";

const { width: screenWidth } = Dimensions.get("window");

interface OverviewScreenProps {
  userRole: UserRole;
  userName?: string;
}

export default function OverviewScreen({
  userRole,
  userName,
}: OverviewScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { formatDate: fmtDate } = useFormatters();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  // ScreenScrollView already provides paddingHorizontal: Spacing.xl
  const scrollContentStyle = {};

  const {
    data: visitsData,
    isLoading: visitsLoading,
    isFetching: visitsFetching,
    refetch: refetchVisits,
  } = useVisitsQuery({ myRequestsOnly: true, limit: 50 });
  const {
    data: pendingData,
    isLoading: pendingLoading,
    isFetching: pendingFetching,
    refetch: refetchPending,
  } = usePendingApprovalsQuery({ limit: 10 }, userRole === "manager");
  const {
    data: awaitingData,
    isLoading: awaitingLoading,
    isFetching: awaitingFetching,
    refetch: refetchAwaiting,
  } = useAwaitingVisitorQuery(
    { limit: 10 },
    userRole === "manager" || userRole === "employee",
  );
  const {
    data: walkInData,
    isLoading: walkInLoading,
    isFetching: walkInFetching,
    refetch: refetchWalkIn,
  } = usePendingHostWalkInsQuery(
    { limit: 10 },
    userRole === "manager" || userRole === "employee",
  );

  // Refetch all data when screen gains focus to show latest status
  // Note: refetch() bypasses 'enabled' check, so we must guard conditionally
  useFocusEffect(
    useCallback(() => {
      refetchVisits();
      // Only refetch pending approvals for managers (API returns 403 for other roles)
      if (userRole === "manager") {
        refetchPending();
      }
      if (userRole === "manager" || userRole === "employee") {
        refetchAwaiting();
        refetchWalkIn();
      }
    }, [
      refetchVisits,
      refetchPending,
      refetchAwaiting,
      refetchWalkIn,
      userRole,
    ]),
  );

  const visitorRequests = useMemo(() => {
    return visitsData?.data?.map(mapVisitListItemToVisitorRequest) || [];
  }, [visitsData]);

  const pendingApprovals = useMemo(() => {
    return pendingData?.data?.map(mapPendingApprovalToVisitorRequest) || [];
  }, [pendingData]);

  const awaitingVisitorAcceptance = useMemo(() => {
    return awaitingData?.data?.map(mapAwaitingVisitorToVisitorRequest) || [];
  }, [awaitingData]);

  const walkInVisitors = useMemo(() => {
    return walkInData?.data?.map(mapPendingHostWalkInToVisitorRequest) || [];
  }, [walkInData]);

  const isLoading =
    visitsLoading ||
    ((userRole === "manager" || userRole === "employee") &&
      (awaitingLoading || walkInLoading)) ||
    (userRole === "manager" && pendingLoading);
  const isFetching =
    visitsFetching ||
    ((userRole === "manager" || userRole === "employee") &&
      (awaitingFetching || walkInFetching)) ||
    (userRole === "manager" && pendingFetching);

  const totalVisitors = visitorRequests.length;
  const todaysVisitors = visitorRequests.filter((request) => {
    const visitDate = new Date(request.visitDate);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;

  const upcomingThisWeek = visitorRequests.filter((request) => {
    if (request.status !== "approved" && request.status !== "visitor_accepted")
      return false;

    const visitDate = new Date(request.visitDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    return visitDate >= today && visitDate <= oneWeekFromNow;
  });

  const kpiData =
    userRole === "visitor"
      ? [
          {
            title: t("dashboard.myVisit"),
            value: "1",
            icon: "calendar",
            color: theme.primary,
          },
          {
            title: t("dashboard.visitStatus"),
            value: t("status.pending"),
            icon: "clock",
            color: theme.warning,
          },
        ]
      : userRole === "receptionist"
        ? [
            {
              title: t("dashboard.expectedToday"),
              value: "5",
              icon: "users",
              color: theme.info,
            },
            {
              title: t("dashboard.checkedIn"),
              value: "1",
              icon: "user-check",
              color: theme.success,
            },
            {
              title: t("dashboard.walkIns"),
              value: "0",
              icon: "user-plus",
              color: theme.warning,
            },
          ]
        : userRole === "employee"
          ? [
              {
                title: t("dashboard.totalVisitors"),
                value: totalVisitors.toString(),
                icon: "users",
                color: theme.info,
              },
              {
                title: t("dashboard.todaysVisitors"),
                value: todaysVisitors.toString(),
                icon: "calendar",
                color: theme.primary,
              },
              {
                title: t("dashboard.checkedIn"),
                value: "0",
                icon: "check-circle",
                color: theme.chartPurple,
              },
              {
                title: t("dashboard.thisWeek"),
                value: upcomingThisWeek.length.toString(),
                icon: "trending-up",
                color: theme.secondary,
              },
            ]
          : userRole === "manager"
            ? [
                {
                  title: t("dashboard.pendingRequests"),
                  value: pendingApprovals.length.toString(),
                  icon: "clock",
                  color: theme.primary,
                },
                {
                  title: t("dashboard.todaysVisitors"),
                  value: todaysVisitors.toString(),
                  icon: "calendar",
                  color: theme.info,
                },
                {
                  title: t("dashboard.checkedIn"),
                  value: "0",
                  icon: "check-circle",
                  color: theme.chartPurple,
                },
                {
                  title: t("dashboard.thisWeek"),
                  value: upcomingThisWeek.length.toString(),
                  icon: "trending-up",
                  color: theme.secondary,
                },
              ]
            : userRole === "security"
              ? [
                  {
                    title: t("dashboard.expectedToday"),
                    value: "45",
                    icon: "users",
                    color: theme.info,
                  },
                  {
                    title: t("dashboard.checkedIn"),
                    value: "18",
                    icon: "user-check",
                    color: theme.secondary,
                  },
                  {
                    title: t("dashboard.pendingAwaiting"),
                    value: "27",
                    icon: "clock",
                    color: theme.primary,
                  },
                  {
                    title: t("dashboard.walkIns"),
                    value: "3",
                    icon: "user-plus",
                    color: theme.chartPurple,
                  },
                ]
              : userRole === "building_admin"
                ? [
                    {
                      title: t("dashboard.totalSlots"),
                      value: "150",
                      icon: "map-pin",
                      color: theme.info,
                    },
                    {
                      title: t("dashboard.occupied"),
                      value: "87",
                      icon: "check-circle",
                      color: theme.secondary,
                    },
                    {
                      title: t("dashboard.reserved"),
                      value: "23",
                      icon: "clock",
                      color: theme.primary,
                    },
                    {
                      title: t("dashboard.available"),
                      value: "40",
                      icon: "circle",
                      color: theme.chartPurple,
                    },
                  ]
                : userRole === "buffet_admin"
                  ? [
                      {
                        title: t("dashboard.totalVisitors"),
                        value: "4",
                        icon: "disc",
                        color: theme.primary,
                      },
                      {
                        title: t("dashboard.buffetLocations"),
                        value: "6",
                        icon: "map",
                        color: theme.info,
                      },
                      {
                        title: t("dashboard.buffetStaff"),
                        value: "0",
                        icon: "users",
                        color: theme.secondary,
                      },
                      {
                        title: t("notifications.title"),
                        value: "0",
                        icon: "bell",
                        color: theme.chartPurple,
                      },
                    ]
                  : [
                      {
                        title: t("dashboard.activeDrivers"),
                        value: "12",
                        icon: "truck",
                        color: theme.primary,
                      },
                      {
                        title: t("dashboard.pendingTasks"),
                        value: "7",
                        icon: "list",
                        color: theme.primary,
                      },
                      {
                        title: t("dashboard.completedToday"),
                        value: "23",
                        icon: "check-square",
                        color: theme.secondary,
                      },
                      {
                        title: t("dashboard.avgWait"),
                        value: "8m",
                        icon: "clock",
                        color: theme.info,
                      },
                    ];

  const recentRequests =
    userRole === "employee"
      ? visitorRequests
          .filter((req) => !req.approval?.autoApproved)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 5)
      : [];

  const cardWidth = Math.min(screenWidth - 2 * Spacing.lg, 320);

  if (isLoading || isFetching) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <SkeletonDashboard cards={4} />
      </View>
    );
  }

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
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

        {/* 2. Stats Cards */}
        <KPICardRow>
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </KPICardRow>

        <Spacer height={Spacing.xxl} />

        {/* 3. Upcoming Visitors Section - Employee & Manager */}
        {(userRole === "employee" || userRole === "manager") && (
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
                    {t("dashboard.upcomingVisitors")}
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
                    {t("dashboard.thisWeek")}
                  </ThemedText>
                </View>
                {upcomingThisWeek.length > 0 && (
                  <Pressable
                    onPress={() =>
                      navigation.navigate(
                        ROUTES.VISITOR_REQUESTS as never,
                        {
                          initialTab:
                            userRole === "manager" ? "all" : "upcoming",
                        } as never,
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

              {upcomingThisWeek.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  snapToInterval={cardWidth + Spacing.md}
                  decelerationRate="fast"
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  directionalLockEnabled={true}
                  scrollEventThrottle={16}
                >
                  {upcomingThisWeek.map((request, index) => (
                    <VisitorRequestCard
                      key={request.id}
                      request={request}
                      onPress={() =>
                        navigation.navigate(
                          ROUTES.REQUEST_DETAILS as never,
                          { requestId: request.id } as never,
                        )
                      }
                      width={cardWidth}
                      style={
                        index > 0
                          ? isRTL
                            ? { marginEnd: Spacing.md }
                            : { marginStart: Spacing.md }
                          : undefined
                      }
                    />
                  ))}
                </ScrollView>
              ) : (
                <ThemedView
                  style={[
                    styles.emptyCarousel,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <DDIcon
                    name="calendar"
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
                    {t("dashboard.noUpcomingVisitors")}
                  </ThemedText>
                </ThemedView>
              )}
            </View>

            <Spacer height={Spacing.xxl} />
          </>
        )}

        {/* 4. Recent Requests Section - Employee Only */}
        {userRole === "employee" && (
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
                    {t("dashboard.recentRequests")}
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
                    {t("dashboard.yourLatestRequests")}
                  </ThemedText>
                </View>
                {recentRequests.length > 0 && (
                  <Pressable
                    onPress={() =>
                      navigation.navigate(
                        ROUTES.VISITOR_REQUESTS as never,
                        { initialTab: "all" } as never,
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

              {recentRequests.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  snapToInterval={cardWidth + Spacing.md}
                  decelerationRate="fast"
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  directionalLockEnabled={true}
                  scrollEventThrottle={16}
                >
                  {recentRequests.map((request, index) => (
                    <VisitorRequestCard
                      key={request.id}
                      request={request}
                      onPress={() =>
                        navigation.navigate(
                          ROUTES.REQUEST_DETAILS as never,
                          { requestId: request.id } as never,
                        )
                      }
                      width={cardWidth}
                      style={
                        index > 0
                          ? isRTL
                            ? { marginEnd: Spacing.md }
                            : { marginStart: Spacing.md }
                          : undefined
                      }
                    />
                  ))}
                </ScrollView>
              ) : (
                <ThemedView
                  style={[
                    styles.emptyCarousel,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <DDIcon
                    name="file-text"
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
                    {t("dashboard.noRecentRequests")}
                  </ThemedText>
                </ThemedView>
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
                {pendingApprovals.length > 0 && (
                  <Pressable
                    onPress={() =>
                      navigation.navigate(ROUTES.APPROVALS as never)
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

              {pendingApprovals.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  snapToInterval={cardWidth + Spacing.md}
                  decelerationRate="fast"
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  directionalLockEnabled={true}
                  scrollEventThrottle={16}
                >
                  {pendingApprovals.slice(0, 5).map((request, index) => (
                    <VisitorRequestCard
                      key={request.id}
                      request={request}
                      onPress={() =>
                        navigation.navigate(
                          ROUTES.MANAGER_APPROVAL_DETAIL as never,
                          { requestId: request.id } as never,
                        )
                      }
                      width={cardWidth}
                      accentColor={theme.primary}
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
                </ScrollView>
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

              {awaitingVisitorAcceptance.length > 0 ? (
                <ScrollView
                  horizontal
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
                        onPress={() =>
                          navigation.navigate(
                            ROUTES.REQUEST_DETAILS as never,
                            { requestId: request.id } as never,
                          )
                        }
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
                </ScrollView>
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
                          ROUTES.VISITOR_REQUESTS as never,
                          { initialTab: "walkin" } as never,
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

              {walkInVisitors.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  snapToInterval={cardWidth + Spacing.md}
                  decelerationRate="fast"
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  directionalLockEnabled={true}
                  scrollEventThrottle={16}
                >
                  {walkInVisitors.slice(0, 5).map((request, index) => (
                    <VisitorRequestCard
                      key={request.id}
                      request={request}
                      onPress={() =>
                        navigation.navigate(
                          ROUTES.REQUEST_DETAILS as never,
                          { requestId: request.id } as never,
                        )
                      }
                      width={cardWidth}
                      accentColor={theme.info}
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
                </ScrollView>
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
            navigation.navigate(ROUTES.VISIT_TYPE_SELECTION as never)
          }
        >
          <DDIcon name="user-plus" size={24} color={theme.buttonText} />
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: "row",
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  viewToggleButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
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
  statusBadgeSmall: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
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
});
