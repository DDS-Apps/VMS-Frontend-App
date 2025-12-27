import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Dimensions, Pressable, ScrollView } from "react-native";
import { useNavigation, ParamListBase, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon, IconName } from "@/components/DDIcon";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { UserRole, VisitorRequest } from "@/types/vms.types";
import { SkeletonDashboard, VisitorRequestCard } from "@/components/shared";
import { useVisitsQuery, usePendingApprovalsQuery, useAwaitingVisitorQuery, usePendingHostWalkInsQuery } from "@/hooks/queries/useApprovalQueries";
import {
  mapVisitListItemToVisitorRequest,
  mapAwaitingVisitorToVisitorRequest,
  mapPendingApprovalToVisitorRequest,
  mapPendingHostWalkInToVisitorRequest,
} from "@/services/utils/requestMappers";

const { width: screenWidth } = Dimensions.get('window');

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  trend?: string;
  trendUp?: boolean;
}

function KPICard({ title, value, subtitle, icon, iconColor, backgroundColor, trend, trendUp }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
        <DDIcon name={icon as IconName} size={24} color={theme.buttonText} />
      </View>

      <Spacer height={Spacing.md} />

      <ThemedText style={[styles.kpiTitle, { color: iconColor, textAlign: 'center' }]}>
        {title}
      </ThemedText>
      
      <Spacer height={Spacing.xs} />

      <ThemedText style={[styles.kpiValue, { color: theme.text, textAlign: 'center' }]}>
        {value}
      </ThemedText>
    </View>
  );
}

interface OverviewScreenProps {
  userRole: UserRole;
  userName?: string;
}

export default function OverviewScreen({ userRole, userName }: OverviewScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate: fmtDate } = useFormatters();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  // ScreenScrollView already provides paddingHorizontal: Spacing.xl
  const scrollContentStyle = {};

  const { data: visitsData, isLoading: visitsLoading, isFetching: visitsFetching, refetch: refetchVisits } = useVisitsQuery({ myRequestsOnly: true, limit: 50 });
  const { data: pendingData, isLoading: pendingLoading, isFetching: pendingFetching, refetch: refetchPending } = usePendingApprovalsQuery(
    { limit: 10 },
    userRole === 'manager'
  );
  const { data: awaitingData, isLoading: awaitingLoading, isFetching: awaitingFetching, refetch: refetchAwaiting } = useAwaitingVisitorQuery(
    { limit: 10 },
    userRole === 'manager' || userRole === 'employee'
  );
  const { data: walkInData, isLoading: walkInLoading, isFetching: walkInFetching, refetch: refetchWalkIn } = usePendingHostWalkInsQuery(
    { limit: 10 },
    userRole === 'manager' || userRole === 'employee'
  );

  // Refetch all data when screen gains focus to show latest status
  // Note: refetch() bypasses 'enabled' check, so we must guard conditionally
  useFocusEffect(
    useCallback(() => {
      refetchVisits();
      // Only refetch pending approvals for managers (API returns 403 for other roles)
      if (userRole === 'manager') {
        refetchPending();
      }
      if (userRole === 'manager' || userRole === 'employee') {
        refetchAwaiting();
        refetchWalkIn();
      }
    }, [refetchVisits, refetchPending, refetchAwaiting, refetchWalkIn, userRole])
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

  const isLoading = visitsLoading || ((userRole === 'manager' || userRole === 'employee') && (awaitingLoading || walkInLoading)) || (userRole === 'manager' && pendingLoading);
  const isFetching = visitsFetching || ((userRole === 'manager' || userRole === 'employee') && (awaitingFetching || walkInFetching)) || (userRole === 'manager' && pendingFetching);

  const totalVisitors = visitorRequests.length;
  const todaysVisitors = visitorRequests.filter((request) => {
    const visitDate = new Date(request.visitDate);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;

  const upcomingThisWeek = visitorRequests.filter((request) => {
    if (request.status !== 'approved' && request.status !== 'visitor_accepted') return false;
    
    const visitDate = new Date(request.visitDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    return visitDate >= today && visitDate <= oneWeekFromNow;
  });

  const kpiData = userRole === 'visitor'
    ? [
        { title: t('dashboard.myVisit'), value: '1', subtitle: t('dashboard.scheduledVisit'), icon: 'calendar', iconColor: theme.primary, backgroundColor: theme.primary },
        { title: t('dashboard.visitStatus'), value: t('status.pending'), subtitle: t('dashboard.awaitingResponse'), icon: 'clock', iconColor: theme.warning, backgroundColor: theme.warning },
      ]
    : userRole === 'receptionist'
    ? [
        { title: t('dashboard.expectedToday'), value: '5', subtitle: t('dashboard.scheduledVisit'), icon: 'users', iconColor: theme.info, backgroundColor: theme.info },
        { title: t('dashboard.checkedIn'), value: '1', subtitle: t('dashboard.currentlyOnPremises'), icon: 'user-check', iconColor: theme.success, backgroundColor: theme.success },
        { title: t('dashboard.walkIns'), value: '0', subtitle: t('dashboard.registeredToday'), icon: 'user-plus', iconColor: theme.warning, backgroundColor: theme.warning },
      ]
    : userRole === 'employee'
    ? [
        { title: t('dashboard.totalVisitors'), value: totalVisitors.toString(), subtitle: t('dashboard.allTimeVisitors'), icon: 'users', iconColor: theme.info, backgroundColor: theme.info, trend: '0%', trendUp: false },
        { title: t('dashboard.todaysVisitors'), value: todaysVisitors.toString(), subtitle: t('dashboard.expectedToday'), icon: 'calendar', iconColor: theme.primary, backgroundColor: theme.primary, trend: '0%', trendUp: false },
        { title: t('dashboard.checkedIn'), value: '0', subtitle: t('dashboard.currentlyOnPremises'), icon: 'check-circle', iconColor: theme.chartPurple, backgroundColor: theme.chartPurple },
        { title: t('dashboard.thisWeek'), value: upcomingThisWeek.length.toString(), subtitle: t('dashboard.last7Days'), icon: 'trending-up', iconColor: theme.secondary, backgroundColor: theme.secondary, trend: '+12%', trendUp: true },
      ]
    : userRole === 'manager'
    ? [
        { title: t('dashboard.pendingRequests'), value: pendingApprovals.length.toString(), subtitle: t('dashboard.requestsAwaitingApproval'), icon: 'clock', iconColor: theme.primary, backgroundColor: theme.primary },
        { title: t('dashboard.todaysVisitors'), value: todaysVisitors.toString(), subtitle: t('dashboard.expectedToday'), icon: 'calendar', iconColor: theme.info, backgroundColor: theme.info, trend: '0%', trendUp: false },
        { title: t('dashboard.checkedIn'), value: '0', subtitle: t('dashboard.currentlyOnPremises'), icon: 'check-circle', iconColor: theme.chartPurple, backgroundColor: theme.chartPurple },
        { title: t('dashboard.thisWeek'), value: upcomingThisWeek.length.toString(), subtitle: t('dashboard.last7Days'), icon: 'trending-up', iconColor: theme.secondary, backgroundColor: theme.secondary, trend: '+12%', trendUp: true },
      ]
    : userRole === 'security'
    ? [
        { title: t('dashboard.expectedToday'), value: '45', subtitle: t('dashboard.scheduledVisit'), icon: 'users', iconColor: theme.info, backgroundColor: theme.info },
        { title: t('dashboard.checkedIn'), value: '18', subtitle: t('dashboard.currentlyOnPremises'), icon: 'user-check', iconColor: theme.secondary, backgroundColor: theme.secondary },
        { title: t('dashboard.pendingAwaiting'), value: '27', subtitle: t('dashboard.awaitingArrival'), icon: 'clock', iconColor: theme.primary, backgroundColor: theme.primary },
        { title: t('dashboard.walkIns'), value: '3', subtitle: t('dashboard.registeredToday'), icon: 'user-plus', iconColor: theme.chartPurple, backgroundColor: theme.chartPurple },
      ]
    : userRole === 'building_admin'
    ? [
        { title: t('dashboard.totalSlots'), value: '150', subtitle: t('dashboard.parkingCapacity'), icon: 'map-pin', iconColor: theme.info, backgroundColor: theme.info },
        { title: t('dashboard.occupied'), value: '87', subtitle: `58% ${t('dashboard.utilization')}`, icon: 'check-circle', iconColor: theme.secondary, backgroundColor: theme.secondary },
        { title: t('dashboard.reserved'), value: '23', subtitle: `15% ${t('dashboard.reserved').toLowerCase()}`, icon: 'clock', iconColor: theme.primary, backgroundColor: theme.primary },
        { title: t('dashboard.available'), value: '40', subtitle: `27% ${t('dashboard.available').toLowerCase()}`, icon: 'circle', iconColor: theme.chartPurple, backgroundColor: theme.chartPurple },
      ]
    : userRole === 'buffet_admin'
    ? [
        { title: t('dashboard.totalVisitors'), value: '4', subtitle: `0 ${t('dashboard.upcomingVisitors').toLowerCase()}`, icon: 'disc', iconColor: theme.primary, backgroundColor: theme.primary },
        { title: t('dashboard.buffetLocations'), value: '6', subtitle: `6 ${t('dashboard.activeLocations')}`, icon: 'map', iconColor: theme.info, backgroundColor: theme.info },
        { title: t('dashboard.buffetStaff'), value: '0', subtitle: `0 ${t('dashboard.onDuty')}`, icon: 'users', iconColor: theme.secondary, backgroundColor: theme.secondary },
        { title: t('notifications.title'), value: '0', subtitle: t('dashboard.unreadAlerts'), icon: 'bell', iconColor: theme.chartPurple, backgroundColor: theme.chartPurple },
      ]
    : [
        { title: t('dashboard.activeDrivers'), value: '12', subtitle: `75% ${t('dashboard.ofFleet')}`, icon: 'truck', iconColor: theme.primary, backgroundColor: theme.primary },
        { title: t('dashboard.pendingTasks'), value: '7', subtitle: t('dashboard.inProgressTasks'), icon: 'list', iconColor: theme.primary, backgroundColor: theme.primary },
        { title: t('dashboard.completedToday'), value: '23', subtitle: t('time.today'), icon: 'check-square', iconColor: theme.secondary, backgroundColor: theme.secondary, trend: '+12%', trendUp: true },
        { title: t('dashboard.avgWait'), value: '8m', subtitle: `-2m ${t('dashboard.improvement')}`, icon: 'clock', iconColor: theme.info, backgroundColor: theme.info },
      ];

  const recentRequests = userRole === 'employee' 
    ? visitorRequests
        .filter(req => !req.approval?.autoApproved)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    : [];

  const cardWidth = Math.min(screenWidth - 2 * Spacing.lg, 320);

  if (isLoading || isFetching) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <SkeletonDashboard cards={4} />
      </View>
    );
  }

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      {/* 1. Welcome Heading - Employee & Manager */}
      {(userRole === 'employee' || userRole === 'manager') && (
        <>
          <View style={styles.welcomeSection}>
            <ThemedText style={[Typography.title, { fontSize: 20, textAlign: 'center', fontWeight: '600' }]}>
              {t('dashboard.hello')}, {userName || 'User'}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center', marginTop: 4, fontSize: 13 }]}>
              {t('time.today')} {fmtDate(new Date(), 'short')}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />
        </>
      )}

      {/* 2. Stats Cards */}
      <View style={styles.kpiGrid}>
        {kpiData.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </View>

      <Spacer height={Spacing.xxl} />

      {/* 3. Upcoming Visitors Section - Employee & Manager */}
      {(userRole === 'employee' || userRole === 'manager') && (
        <>
          <View>
            <View style={styles.header}>
              <View>
                <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                  {t('dashboard.upcomingVisitors')}
                </ThemedText>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4, fontSize: 12 }]}>
                  {t('dashboard.thisWeek')}
                </ThemedText>
              </View>
              {upcomingThisWeek.length > 0 && (
                <Pressable 
                  onPress={() => navigation.navigate(
                    'VisitorRequests', 
                    { initialTab: userRole === 'manager' ? 'all' : 'upcoming' }
                  )}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <ThemedText style={[Typography.bodySmall, { color: theme.primary, fontWeight: '500', fontSize: 13 }]}>
                    {t('common.viewAll')}
                  </ThemedText>
                  <DDIcon name="chevron-right" size={16} color={theme.primary} />
                </Pressable>
              )}
            </View>

            <Spacer height={Spacing.lg} />

            {upcomingThisWeek.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
                snapToInterval={cardWidth + Spacing.md}
                decelerationRate="fast"
                nestedScrollEnabled={true}
              >
                {upcomingThisWeek.map((request, index) => (
                  <VisitorRequestCard
                    key={request.id}
                    request={request}
                    onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
                    width={cardWidth}
                    style={index > 0 ? { marginStart: Spacing.md } : undefined}
                  />
                ))}
              </ScrollView>
            ) : (
              <ThemedView style={[styles.emptyCarousel, { backgroundColor: theme.surface }]}>
                <DDIcon name="calendar" size={32} color={theme.textSecondary} />
                <Spacer height={Spacing.sm} />
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                  {t('dashboard.noUpcomingVisitors')}
                </ThemedText>
              </ThemedView>
            )}
          </View>

          <Spacer height={Spacing.xxl} />
        </>
      )}

      {/* 4. Recent Requests Section - Employee Only */}
      {userRole === 'employee' && (
        <>
          <View>
            <View style={styles.header}>
              <View>
                <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                  {t('dashboard.recentRequests')}
                </ThemedText>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4, fontSize: 12 }]}>
                  {t('dashboard.yourLatestRequests')}
                </ThemedText>
              </View>
              {recentRequests.length > 0 && (
                <Pressable 
                  onPress={() => navigation.navigate('VisitorRequests', { initialTab: 'all' })}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <ThemedText style={[Typography.bodySmall, { color: theme.primary, fontWeight: '500', fontSize: 13 }]}>
                    {t('common.viewAll')}
                  </ThemedText>
                  <DDIcon name="chevron-right" size={16} color={theme.primary} />
                </Pressable>
              )}
            </View>

            <Spacer height={Spacing.lg} />

            {recentRequests.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
                snapToInterval={cardWidth + Spacing.md}
                decelerationRate="fast"
                nestedScrollEnabled={true}
              >
                {recentRequests.map((request, index) => (
                  <VisitorRequestCard
                    key={request.id}
                    request={request}
                    onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
                    width={cardWidth}
                    style={index > 0 ? { marginStart: Spacing.md } : undefined}
                  />
                ))}
              </ScrollView>
            ) : (
              <ThemedView style={[styles.emptyCarousel, { backgroundColor: theme.surface }]}>
                <DDIcon name="file-text" size={32} color={theme.textSecondary} />
                <Spacer height={Spacing.sm} />
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                  {t('dashboard.noRecentRequests')}
                </ThemedText>
              </ThemedView>
            )}
          </View>

          <Spacer height={Spacing.xxl} />
        </>
      )}

      {/* 5. Pending Approvals Section - Manager Only */}
      {userRole === 'manager' && (
        <>
          <View>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              {t('dashboard.pendingApprovals')}
            </ThemedText>
            <View style={[styles.header, { alignItems: 'center', marginTop: 4 }]}>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, fontSize: 12 }]}>
                {t('dashboard.requestsAwaitingApproval')}
              </ThemedText>
              {pendingApprovals.length > 0 && (
                <Pressable 
                  onPress={() => navigation.navigate('Approvals')}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <ThemedText style={[Typography.bodySmall, { color: theme.primary, fontWeight: '500', fontSize: 13 }]}>
                    {t('common.viewAll')}
                  </ThemedText>
                  <DDIcon name="chevron-right" size={16} color={theme.primary} />
                </Pressable>
              )}
            </View>

            <Spacer height={Spacing.lg} />

            {pendingApprovals.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
                snapToInterval={cardWidth + Spacing.md}
                decelerationRate="fast"
                nestedScrollEnabled={true}
              >
                {pendingApprovals.slice(0, 5).map((request, index) => (
                  <VisitorRequestCard
                    key={request.id}
                    request={request}
                    onPress={() => navigation.navigate('ManagerApprovalDetail', { requestId: request.id })}
                    width={cardWidth}
                    accentColor={theme.primary}
                    showRequestedBy={true}
                    style={index > 0 ? { marginStart: Spacing.md } : undefined}
                  />
                ))}
              </ScrollView>
            ) : (
              <ThemedView style={[styles.emptyCarousel, { backgroundColor: theme.surface }]}>
                <DDIcon name="check-circle" size={32} color={theme.success} />
                <Spacer height={Spacing.sm} />
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                  {t('dashboard.noPendingApprovals')}
                </ThemedText>
              </ThemedView>
            )}
          </View>

          <Spacer height={Spacing.xxl} />
        </>
      )}

      {/* 6. Awaiting Visitor Acceptance Section - Manager & Employee */}
      {(userRole === 'manager' || userRole === 'employee') && (
        <>
          <View>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              {t('navigation.awaitingVisitor')}
            </ThemedText>
            <View style={[styles.header, { alignItems: 'center', marginTop: 4 }]}>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, fontSize: 12 }]}>
                {t('dashboard.awaitingResponse')}
              </ThemedText>
              {awaitingVisitorAcceptance.length > 0 && (
                <Pressable 
                  onPress={() => navigation.navigate(
                    'VisitorRequests', 
                    { initialTab: userRole === 'manager' ? 'awaiting' : 'waiting' }
                  )}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <ThemedText style={[Typography.bodySmall, { color: theme.primary, fontWeight: '500', fontSize: 13 }]}>
                    {t('common.viewAll')}
                  </ThemedText>
                  <DDIcon name="chevron-right" size={16} color={theme.primary} />
                </Pressable>
              )}
            </View>

            <Spacer height={Spacing.lg} />

            {awaitingVisitorAcceptance.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
                snapToInterval={cardWidth + Spacing.md}
                decelerationRate="fast"
                nestedScrollEnabled={true}
              >
                {awaitingVisitorAcceptance.slice(0, 5).map((request, index) => (
                  <VisitorRequestCard
                    key={request.id}
                    request={request}
                    onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
                    width={cardWidth}
                    accentColor={theme.warning}
                    showRequestedBy={true}
                    style={index > 0 ? { marginStart: Spacing.md } : undefined}
                  />
                ))}
              </ScrollView>
            ) : (
              <ThemedView style={[styles.emptyCarousel, { backgroundColor: theme.surface }]}>
                <DDIcon name="clock" size={32} color={theme.textSecondary} />
                <Spacer height={Spacing.sm} />
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                  {t('dashboard.noAwaitingVisitors')}
                </ThemedText>
              </ThemedView>
            )}
          </View>

          <Spacer height={Spacing.xxl} />
        </>
      )}

      {/* 7. Walk-In Visitors Section - Manager & Employee */}
      {(userRole === 'manager' || userRole === 'employee') && (
        <>
          <View>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              {t('navigation.walkInVisitors')}
            </ThemedText>
            <View style={[styles.header, { alignItems: 'center', marginTop: 4 }]}>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, fontSize: 12 }]}>
                {t('dashboard.walkIns')}
              </ThemedText>
              {walkInVisitors.length > 0 && (userRole === 'manager' || userRole === 'employee') && (
                <Pressable 
                  onPress={() => navigation.navigate('VisitorRequests', { initialTab: 'walkin' })}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <ThemedText style={[Typography.bodySmall, { color: theme.primary, fontWeight: '500', fontSize: 13 }]}>
                    {t('common.viewAll')}
                  </ThemedText>
                  <DDIcon name="chevron-right" size={16} color={theme.primary} />
                </Pressable>
              )}
            </View>

            <Spacer height={Spacing.lg} />

            {walkInVisitors.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
                snapToInterval={cardWidth + Spacing.md}
                decelerationRate="fast"
                nestedScrollEnabled={true}
              >
                {walkInVisitors.slice(0, 5).map((request, index) => (
                  <VisitorRequestCard
                    key={request.id}
                    request={request}
                    onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
                    width={cardWidth}
                    accentColor={theme.info}
                    showRequestedBy={true}
                    style={index > 0 ? { marginStart: Spacing.md } : undefined}
                  />
                ))}
              </ScrollView>
            ) : (
              <ThemedView style={[styles.emptyCarousel, { backgroundColor: theme.surface }]}>
                <DDIcon name="user-plus" size={32} color={theme.textSecondary} />
                <Spacer height={Spacing.sm} />
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                  {t('dashboard.noWalkInVisitors')}
                </ThemedText>
              </ThemedView>
            )}
          </View>

          <Spacer height={Spacing.xxl} />
        </>
      )}

      {userRole === 'buffet_admin' && (
        <>
          <View style={styles.chartsRow}>
            <ThemedView style={[styles.chartCard, { backgroundColor: theme.surface, flex: 1 }]}>
              <View style={styles.chartHeader}>
                <View>
                  <ThemedText style={[Typography.subtitle]}>
                    {t('dashboard.visitorForecast')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('dashboard.expectedVisitors')}
                  </ThemedText>
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <View style={{ padding: Spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <DDIcon name="calendar" size={24} color={theme.primary} />
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[Typography.display, { fontSize: 28, fontWeight: '600' }]}>2</ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{t('time.today')}</ThemedText>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <DDIcon name="clock" size={24} color={theme.info} />
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[Typography.display, { fontSize: 28, fontWeight: '600' }]}>1</ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{t('time.tomorrow')}</ThemedText>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <DDIcon name="trending-up" size={24} color={theme.success} />
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[Typography.display, { fontSize: 28, fontWeight: '600' }]}>1</ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{t('dashboard.next7Days')}</ThemedText>
                  </View>
                </View>
              </View>
            </ThemedView>

            <Spacer width={Spacing.lg} />

            <ThemedView style={[styles.chartCard, { backgroundColor: theme.surface, flex: 1 }]}>
              <View style={styles.chartHeader}>
                <View>
                  <ThemedText style={[Typography.subtitle]}>
                    {t('dashboard.staffOverview')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('dashboard.currentStaffStatus')}
                  </ThemedText>
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <View style={{ padding: Spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <DDIcon name="users" size={24} color={theme.primary} />
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[Typography.display, { fontSize: 28, fontWeight: '600' }]}>12</ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{t('dashboard.totalStaff')}</ThemedText>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <DDIcon name="user-check" size={24} color={theme.success} />
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[Typography.display, { fontSize: 28, fontWeight: '600' }]}>8</ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{t('dashboard.active')}</ThemedText>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <DDIcon name="briefcase" size={24} color={theme.info} />
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[Typography.display, { fontSize: 28, fontWeight: '600' }]}>6</ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{t('dashboard.onDuty')}</ThemedText>
                  </View>
                </View>
              </View>
            </ThemedView>
          </View>
        </>
      )}
      </ScreenScrollView>

      {(userRole === 'employee' || userRole === 'manager') && (
        <Pressable
          style={[
            styles.fab,
            { 
              backgroundColor: theme.primary,
              bottom: insets.bottom + 80 + Spacing.lg,
            },
          ]}
          onPress={() => navigation.navigate('VisitTypeSelection')}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  sectionDivider: {
    height: 1,
    width: '100%',
    marginTop: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  carouselContainer: {
    paddingEnd: Spacing.lg,
  },
  upcomingVisitorCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  upcomingVisitorCardContent: {
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyCarousel: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeStatsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -Spacing.xs,
  },
  kpiCard: {
    width: screenWidth > 768 ? '23%' : '48%',
    margin: '1%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartsRow: {
    flexDirection: screenWidth > 768 ? 'row' : 'column',
  },
  chartCard: {
    flex: 1,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  visitorListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  viewToggleButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusBorder: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  visitorCardContent: {
    flex: 1,
  },
  visitorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  servicePill: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  listItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listItemLeft: {
    flex: 1,
  },
  listItemRight: {
    marginStart: Spacing.sm,
  },
  listItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemIcons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  listIconBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  fab: {
    position: 'absolute',
    end: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  tableHeaderCell: {
    fontWeight: '600',
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
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
