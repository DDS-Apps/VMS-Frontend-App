import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRefetchOnRefocus } from '@/hooks/useRefetchOnRefocus';
import { ROUTES } from "@/constants";
import { DDIcon, IconName } from '@/components/DDIcon';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyOpacity } from '@/utils/statusStyles';
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { 
  getStaffOverview, 
  getRecentActivity,
  StaffOverview,
  RecentActivity,
} from '@/services/state/buildingAdminState';
import type { BuildingAdminDashboardScreenProps } from '@/types/buildingAdminNavigation.types';
import { useInfiniteVisitsQuery, usePendingApprovalsQuery } from '@/hooks/queries/useApprovalQueries';
import { useBuffetLoadSummaryQuery } from '@/hooks/queries/useBuffetQueries';
import { useTodaysValetAssignmentsQuery } from '@/hooks/queries/useValetQueries';
import { getServerDateParts } from '@/utils/dateTimeUtils';
import { KPICard, KPICardRow } from '@/components/shared/KPICard';
import { RTLHorizontalScrollView, SkeletonCard, SkeletonDashboard } from '@/components/shared';

interface QuickActionProps {
  icon: string;
  label: string;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
  badge?: number;
}

function QuickActionButton({ icon, label, iconBgColor, iconColor, onPress, badge }: QuickActionProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon as IconName} size={24} color={iconColor} />
        {badge && badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.badgeText}>{badge > 99 ? '99+' : badge}</ThemedText>
          </View>
        ) : null}
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[styles.quickActionLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface StaffCardProps {
  title: string;
  icon: string;
  total: number;
  details: { label: string; value: number; color: string }[];
  onPress?: () => void;
}

function StaffCard({ title, icon, total, details, onPress }: StaffCardProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[styles.staffCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <DirectionalRow style={styles.staffCardHeader}>
        <DDIcon name={icon as IconName} size={20} color={theme.primary} />
        <ThemedText style={[styles.staffCardTitle, { color: theme.text }]}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.staffCardTotal, { color: theme.primary }]}>
          {total}
        </ThemedText>
      </DirectionalRow>
      <Spacer height={Spacing.md} />
      <View style={styles.staffCardDetails}>
        {details.map((detail, index) => (
          <DirectionalRow key={index} style={styles.staffDetail}>
            <View style={[styles.staffDetailDot, { backgroundColor: detail.color }]} />
            <ThemedText style={[styles.staffDetailLabel, { color: theme.textSecondary }]}>
              {detail.label}
            </ThemedText>
            <ThemedText style={[styles.staffDetailValue, { color: theme.text }]}>
              {detail.value}
            </ThemedText>
          </DirectionalRow>
        ))}
      </View>
    </Pressable>
  );
}

export default function BuildingAdminDashboardScreen({ navigation }: BuildingAdminDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  // Compute Riyadh month boundaries for visit counts
  const { year: _ry, month: _rm } = getServerDateParts(new Date(), 'Asia/Riyadh');
  const startDate = `${_ry}-${String(_rm).padStart(2, '0')}-01`;
  const _lastDay = new Date(_ry, _rm, 0).getDate();
  const endDate = `${_ry}-${String(_rm).padStart(2, '0')}-${String(_lastDay).padStart(2, '0')}`;

  // Real API queries for KPI cards — infinite query so counts are never capped by a page limit
  const {
    data: visitsInfinite,
    isLoading: visitsLoading,
    isFetching: visitsFetching,
    isError: visitsError,
    refetch: refetchVisits,
    hasNextPage: visitsHasNextPage,
    fetchNextPage: visitsFetchNextPage,
    isFetchingNextPage: visitsIsFetchingNextPage,
  } = useInfiniteVisitsQuery({ myRequestsOnly: false, startDate, endDate, limit: 100 });

  const {
    data: pendingData,
    isLoading: pendingLoading,
    isFetching: pendingFetching,
    isError: pendingError,
    refetch: refetchPending,
  } = usePendingApprovalsQuery({ limit: 1 });

  const {
    data: buffetData,
    isLoading: buffetLoading,
    isFetching: buffetFetching,
    isError: buffetError,
    refetch: refetchBuffet,
  } = useBuffetLoadSummaryQuery(true);

  const {
    data: valetData,
    isLoading: valetLoading,
    isFetching: valetFetching,
    isError: valetError,
    refetch: refetchValet,
  } = useTodaysValetAssignmentsQuery();

  // Staff overview and recent activity still from local state (no dedicated API endpoints)
  const [staffOverview, setStaffOverview] = useState<StaffOverview | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useFocusEffect(
    useCallback(() => {
      setStaffOverview(getStaffOverview());
      setActivities(getRecentActivity());
    }, [])
  );

  // Refresh the API-backed sections when returning to the dashboard; the mount
  // fetch covers the first focus.
  useRefetchOnRefocus([refetchVisits, refetchPending, refetchBuffet, refetchValet]);

  // Auto-page through all monthly records so counts are always accurate
  useEffect(() => {
    if (visitsHasNextPage && !visitsIsFetchingNextPage) {
      visitsFetchNextPage();
    }
  }, [visitsHasNextPage, visitsIsFetchingNextPage, visitsFetchNextPage]);

  // Derive KPI values from real API data
  const CONFIRMED_STATUSES = ['approved', 'visitor_accepted', 'checked_in', 'checked_out', 'completed'];
  const visits = useMemo(
    () => visitsInfinite?.pages.flatMap((p) => p.data) ?? [],
    [visitsInfinite]
  );
  const totalVisitors = useMemo(
    () => visits.filter((v) => CONFIRMED_STATUSES.includes(v.status)).length,
    [visits]
  );
  const approvedRequests = useMemo(
    () => visits.filter((v) => ['approved', 'visitor_accepted'].includes(v.status)).length,
    [visits]
  );
  // Total pending approvals from the pagination count (most accurate)
  const pendingRequests = pendingData?.pagination?.total ?? 0;
  const activeRequests = approvedRequests + pendingRequests;
  const ongoingBuffets = useMemo(
    () => buffetData?.locations.reduce((sum, loc) => sum + loc.pendingTasks + loc.activeTasks, 0) ?? 0,
    [buffetData]
  );
  const activeValetOperations = useMemo(
    () => (valetData ?? []).filter((a) => ['pending', 'accepted', 'in_progress'].includes(a.status)).length,
    [valetData]
  );

  const hasVisitsData = visitsInfinite !== undefined;
  const hasPendingData = pendingData !== undefined;
  const hasBuffetData = buffetData !== undefined;
  const hasValetData = valetData !== undefined;
  const hasAnyUsableData =
    hasVisitsData ||
    hasPendingData ||
    hasBuffetData ||
    hasValetData ||
    staffOverview !== null;
  const isColdLoading =
    !hasAnyUsableData &&
    visitsLoading &&
    pendingLoading &&
    buffetLoading &&
    valetLoading;
  const isRefreshing =
    hasAnyUsableData &&
    (
      (visitsFetching && !visitsIsFetchingNextPage) ||
      pendingFetching ||
      buffetFetching ||
      valetFetching
    );
  const hasRefreshError =
    visitsError || pendingError || buffetError || valetError;

  const renderSectionState = (
    loading: boolean,
    failed: boolean,
    retry: () => unknown,
  ) => loading ? (
    <SkeletonCard lines={2} />
  ) : failed ? (
    <ThemedView style={[styles.sectionState, { backgroundColor: theme.surface }]}>
      <DDIcon name="alert-triangle" size={22} variant="muted" />
      <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('common.loadError')}
      </ThemedText>
      <Pressable onPress={() => void retry()}>
        <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
          {t('common.retry')}
        </ThemedText>
      </Pressable>
    </ThemedView>
  ) : null;

  if (isColdLoading) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.background }]}>
        <SkeletonDashboard cards={6} />
      </View>
    );
  }

  return (
      <ScreenScrollView skipTopPadding contentContainerStyle={styles.container}>
      {hasAnyUsableData && (isRefreshing || hasRefreshError) ? (
        <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(
          hasRefreshError ? theme.error : theme.primary,
          '10',
        ) }]}>
          {isRefreshing ? <ActivityIndicator size="small" color={theme.primary} /> : (
            <DDIcon name="alert-triangle" size={16} color={theme.error} />
          )}
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, flex: 1 }]}>
            {hasRefreshError ? t('common.loadError') : t('common.loading')}
          </ThemedText>
          {hasRefreshError && !isRefreshing ? (
            <Pressable onPress={() => {
              if (visitsError) void refetchVisits();
              else if (pendingError) void refetchPending();
              else if (buffetError) void refetchBuffet();
              else void refetchValet();
            }}>
              <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                {t('common.retry')}
              </ThemedText>
            </Pressable>
          ) : null}
        </DirectionalRow>
      ) : null}
      <ThemedText style={Typography.title}>{t('navigation.controlCenter')}</ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {t('dashboard.overview')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <KPICardRow>
        {hasVisitsData ? (
          <KPICard
            title={t('dashboard.totalVisitors')}
            value={String(totalVisitors)}
            icon="users"
            color={theme.primary}
          />
        ) : renderSectionState(visitsLoading, visitsError, refetchVisits)}
        {hasVisitsData && hasPendingData ? (
          <KPICard
            title={t('dashboard.pendingRequests')}
            value={String(activeRequests)}
            icon="file-text"
            color={theme.info}
          />
        ) : renderSectionState(
          visitsLoading || pendingLoading,
          visitsError || pendingError,
          visitsError ? refetchVisits : refetchPending,
        )}
      </KPICardRow>

      <Spacer height={Spacing.md} />

      <KPICardRow>
        {hasVisitsData ? (
          <KPICard
            title={t('status.approved')}
            value={String(approvedRequests)}
            icon="check-circle"
            color={theme.success}
          />
        ) : renderSectionState(visitsLoading, visitsError, refetchVisits)}
        {hasPendingData ? (
          <KPICard
            title={t('status.pending')}
            value={String(pendingRequests)}
            icon="clock"
            color={theme.warning}
          />
        ) : renderSectionState(pendingLoading, pendingError, refetchPending)}
      </KPICardRow>

      <Spacer height={Spacing.md} />

      <KPICardRow>
        {hasBuffetData ? (
          <KPICard
            title={t('buffet.buffetService')}
            value={String(ongoingBuffets)}
            icon="disc"
            color="#FF6B35"
          />
        ) : renderSectionState(buffetLoading, buffetError, refetchBuffet)}
        {hasValetData ? (
          <KPICard
            title={t('valet.valetService')}
            value={String(activeValetOperations)}
            icon="navigation"
            color="#6366F1"
          />
        ) : renderSectionState(valetLoading, valetError, refetchValet)}
      </KPICardRow>

      <Spacer height={Spacing.xxl} />

      <ThemedText style={[Typography.subtitle, { color: theme.text }]}>
        {t('dashboard.quickActions')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      <DirectionalRow style={styles.quickActionsRow}>
        <QuickActionButton
          icon="users"
          label={t('navigation.manageUsers')}
          iconBgColor={applyOpacity(theme.primary, '12')}
          iconColor={theme.primary}
          onPress={() => navigation.navigate(ROUTES.USERS_ROLES as never)}
        />
        <QuickActionButton
          icon="list"
          label={t('navigation.allRequests')}
          iconBgColor={applyOpacity(theme.warning, '12')}
          iconColor={theme.warning}
          onPress={() => navigation.navigate(ROUTES.ALL_REQUESTS as never)}
          badge={pendingRequests}
        />
        <QuickActionButton
          icon="map-pin"
          label={t('navigation.locations')}
          iconBgColor={applyOpacity(theme.success, '12')}
          iconColor={theme.success}
          onPress={() => navigation.navigate(ROUTES.ALL_LOCATIONS as never)}
        />
      </DirectionalRow>

      <Spacer height={Spacing.xxl} />

      <ThemedText style={[Typography.subtitle, { color: theme.text }]}>
        {t('dashboard.staffOverview')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      {staffOverview ? (
      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.staffScrollContent}
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        <StaffCard
          title={t('dashboard.buffetStaff')}
          icon="disc"
          total={staffOverview.buffetStaff.total}
          details={[
            { label: t('dashboard.onDuty'), value: staffOverview.buffetStaff.onDuty, color: theme.success },
            { label: t('status.inactive'), value: staffOverview.buffetStaff.offDuty, color: theme.textSecondary },
          ]}
          onPress={() => navigation.navigate(ROUTES.BUFFET_OVERSIGHT as never)}
        />
        <Spacer width={Spacing.md} />
        <StaffCard
          title={t('navigation.drivers')}
          icon="navigation"
          total={staffOverview.valetDrivers.total}
          details={[
            { label: t('status.available'), value: staffOverview.valetDrivers.available, color: theme.success },
            { label: t('status.occupied'), value: staffOverview.valetDrivers.busy, color: theme.warning },
            { label: t('status.inactive'), value: staffOverview.valetDrivers.offDuty, color: theme.textSecondary },
          ]}
          onPress={() => navigation.navigate(ROUTES.VALET_OVERSIGHT as never)}
        />
        <Spacer width={Spacing.md} />
        <StaffCard
          title={t('roles.security')}
          icon="shield"
          total={staffOverview.security.total}
          details={[
            { label: t('dashboard.active'), value: staffOverview.security.active, color: theme.success },
          ]}
        />
        <Spacer width={Spacing.md} />
        <StaffCard
          title={t('roles.receptionist')}
          icon="user-check"
          total={staffOverview.receptionists.total}
          details={[
            { label: t('dashboard.active'), value: staffOverview.receptionists.active, color: theme.success },
          ]}
        />
      </RTLHorizontalScrollView>
      ) : (
        <SkeletonCard lines={3} />
      )}

      <Spacer height={Spacing.xxl} />

      <DirectionalRow style={styles.sectionHeader}>
        <ThemedText style={[Typography.subtitle, { color: theme.text }]}>
          {t('dashboard.recentActivity')}
        </ThemedText>
        <Pressable 
          onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS as never)}
          style={({ pressed }) => [
            styles.viewAllButton,
            { opacity: pressed ? 0.7 : 1, flexDirection: getFlexDirection(isRTL) }
          ]}
        >
          <ThemedText style={[styles.viewAllText, { color: theme.primary }]}>
            {t('common.viewAll')}
          </ThemedText>
          <DDIcon name="chevron-right" size={16} variant="primary" directionAware />
        </Pressable>
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      {activities.length > 0 ? (
        <View style={styles.activitiesList}>
          {activities.slice(0, 5).map((activity) => (
            <View key={activity.id}>
              <DirectionalRow style={[styles.activityCard, { backgroundColor: theme.surface }]}>
                <View style={[
                  styles.activityIconContainer, 
                  { backgroundColor: applyOpacity(
                    activity.type === 'visitor' ? theme.primary : 
                    activity.type === 'buffet' ? '#FF6B35' : 
                    activity.type === 'valet' ? '#6366F1' : theme.info, 
                    '12'
                  )}
                ]}>
                  <DDIcon 
                    name={activity.icon as IconName} 
                    size={18} 
                    color={
                      activity.type === 'visitor' ? theme.primary : 
                      activity.type === 'buffet' ? '#FF6B35' : 
                      activity.type === 'valet' ? '#6366F1' : theme.info
                    } 
                  />
                </View>
                <View style={styles.activityContent}>
                  <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                    {activity.action}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {activity.description}
                  </ThemedText>
                </View>
                <View style={styles.activityMeta}>
                  <View style={[
                    styles.activityTypeBadge, 
                    { backgroundColor: applyOpacity(theme.textSecondary, '10') }
                  ]}>
                    <ThemedText style={[styles.activityTypeText, { color: theme.textSecondary }]}>
                      {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    </ThemedText>
                  </View>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {activity.time}
                  </ThemedText>
                </View>
              </DirectionalRow>
              <Spacer height={Spacing.sm} />
            </View>
          ))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="activity" size={32} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {t('common.noData')}
          </ThemedText>
        </ThemedView>
      )}

      <Spacer height={Spacing.xxl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  kpiRow: {
    gap: Spacing.md,
  },
  kpiCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  kpiSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickActionsRow: {
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickActionCard: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  staffScrollContent: {
    paddingEnd: Spacing.lg,
  },
  staffCard: {
    width: 180,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  staffCardHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  staffCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  staffCardTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  staffCardDetails: {
    gap: Spacing.xs,
  },
  staffDetail: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  staffDetailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  staffDetailLabel: {
    flex: 1,
    fontSize: 12,
  },
  staffDetailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activitiesList: {},
  activityCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityTypeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  activityTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionState: {
    minHeight: 100,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  inlineFeedback: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
});
