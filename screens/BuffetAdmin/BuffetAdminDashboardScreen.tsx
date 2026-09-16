import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, ActivityIndicator, Alert, RefreshControl, useWindowDimensions } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { formatDateForApi } from "@/utils/dateTimeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon, IconName } from "@/components/DDIcon";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { applyOpacity, getStatusConfig } from "@/utils/statusStyles";
import type { StatusConfig } from "@/types/theme.types";
import { useUpcomingIndicator } from "@/hooks/useUpcomingVisitTimer";
import { UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES, isUpcomingIndicatorEligibleStatus } from "@/constants/requestConstants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { SkeletonCard } from "@/components/shared/Skeleton";
import {
  useBuffetAdminTasksQuery,
  useUpdateBuffetAdminTaskStatusMutation,
} from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminTaskDto } from "@/types/api.types";
import type { BuffetAdminDashboardScreenProps } from "@/types/buffetAdminNavigation.types";

type BuffetRequest = BuffetAdminTaskDto & {
  timeSlot: string;
  assignedStaff?: string;
  assignedStaffId?: string;
  meetingRoom?: string;
};

const mapTaskToRequest = (task: BuffetAdminTaskDto): BuffetRequest => ({
  ...task,
  timeSlot: task.visitTime,
  assignedStaff: task.assignedTo,
  assignedStaffId: task.assignedToId,
  meetingRoom: task.location,
});

import { KPICard, KPICardRow } from '@/components/shared/KPICard';

const UpcomingVisitAlertIcon = React.memo(({ visitDate, visitTime, status, visitStartAt }: { visitDate: string; visitTime: string; status: string; visitStartAt?: string }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const eligible = isUpcomingIndicatorEligibleStatus(status);
  const isUpcoming = useUpcomingIndicator({
    visitDate,
    visitTime,
    visitStartAt,
    eligible,
    thresholdMinutes: UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES,
  });
  if (!isUpcoming) return null;
  return (
    <View
      accessibilityLabel={isRTL ? 'الزيارة تبدأ قريباً' : 'Visit starts soon'}
      accessibilityRole="image"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: applyOpacity(theme.error, '15'),
        borderWidth: 1,
        borderColor: theme.error,
        borderRadius: 100,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginEnd: 6,
      }}
    >
      <DDIcon name="alert-circle" size={12} color={theme.error} />
      <ThemedText style={{ color: theme.error, fontSize: 11, fontWeight: '700', lineHeight: 16 }}>
        {isRTL ? 'قريباً' : 'Upcoming'}
      </ThemedText>
    </View>
  );
});

export default function BuffetAdminDashboardScreen({ navigation }: BuffetAdminDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth >= 900 ? 3 : screenWidth >= 600 ? 2 : 1;
  
  // Get card style based on numColumns - use percentage widths for reliable layout
  const getCardStyle = useMemo(() => {
    if (numColumns === 1) {
      return { width: '100%' as const };
    } else if (numColumns === 2) {
      // 2 columns: ~48% each with gap handling spacing
      return { width: '48%' as const };
    } else {
      // 3 columns: ~32% each with gap handling spacing
      return { width: '32%' as const };
    }
  }, [numColumns]);

  const todayParam = formatDateForApi(new Date());
  const {
    data: tasksResponse,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    isError: isTasksError,
    refetch: refetchTasks,
  } = useBuffetAdminTasksQuery({ date: todayParam });
  const updateStatusMutation = useUpdateBuffetAdminTaskStatusMutation();

  // Unlike the buffet admin's own request list (which only shows confirmed,
  // actionable visits), the oversight view for admins shows every status so
  // they have full visibility into buffet requests regardless of state.
  const requests = useMemo(() => {
    const responseData = tasksResponse?.data as { data?: BuffetAdminTaskDto[] } | BuffetAdminTaskDto[] | undefined;
    const tasks = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminTaskDto[] })?.data) ? (responseData as { data: BuffetAdminTaskDto[] }).data : []);
    return [...tasks].sort((a, b) => {
      const statusOrder: Record<string, number> = { 
        pending_approval: 0,
        pending_host_approval: 1,
        visitor_pending: 2,
        approved: 3,
        visitor_accepted: 4,
        checked_in: 5,
        checked_out: 6,
        completed: 7,
        rejected: 8,
        visitor_rejected: 9,
        cancelled: 10,
        auto_cancelled: 11,
      };
      const statusA = statusOrder[a.status] ?? 99;
      const statusB = statusOrder[b.status] ?? 99;
      if (statusA !== statusB) return statusA - statusB;
      const parseVisitTime = (visitDate: string, visitTime?: string): number => {
        if (!visitTime) return Number.MIN_SAFE_INTEGER;
        // Append Riyadh offset so sorting uses a consistent timezone, not device-local
        const cleaned = visitTime.replace(/\s*(AM|PM)/i, '').trim();
        const ts = new Date(`${visitDate}T${cleaned}+03:00`).getTime();
        return isNaN(ts) ? Number.MIN_SAFE_INTEGER : ts;
      };
      const dateA = parseVisitTime(a.visitDate, a.visitTime);
      const dateB = parseVisitTime(b.visitDate, b.visitTime);
      return dateB - dateA;
    });
  }, [tasksResponse]);

  // Derive stats from today's tasks — load-summary endpoint aggregates
  // differently and returns 0 even when tasks exist for the day.
  const stats = useMemo(() => ({
    total:      requests.length,
    completed:  requests.filter(r => r.status === 'completed').length,
  }), [requests]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const handleMarkComplete = (requestId: string, event: GestureResponderEvent) => {
    event.stopPropagation();
    updateStatusMutation.mutate(
      { id: requestId, data: { status: 'completed' } },
      {
        onSuccess: () => {
          refetchTasks();
        },
        onError: () => {
          Alert.alert(t('common.error'), t('common.errorOccurred'));
        },
      }
    );
  };

  const handleViewDetails = (request: BuffetAdminTaskDto, event: GestureResponderEvent) => {
    event.stopPropagation();
    const mappedRequest = mapTaskToRequest(request);
    navigation.navigate(ROUTES.BUFFET_REQUEST_DETAILS as any, { request: mappedRequest as any } as any);
  };

  const renderRequestCard = (item: BuffetAdminTaskDto) => {
    const statusConfig = getStatusConfig(theme, item.status, t);
    const showActions = item.status !== 'completed' && item.status !== 'cancelled';
    
    return (
      <Pressable 
        key={item.id}
        onPress={(e) => handleViewDetails(item, e)}
        android_ripple={{ color: applyOpacity(theme.primary, '10') }}
        style={({ pressed }) => [
          styles.requestCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: statusConfig.borderColor,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <DirectionalRow style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <DDIcon name="coffee" size={18} color={theme.primary} />
          </View>
          <View style={styles.headerInfo}>
            <DirectionalRow style={styles.nameWithBadgeRow}>
              <ThemedText style={[styles.visitorName, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                {item.hostName}
              </ThemedText>
              <DirectionalRow style={{ alignItems: 'center' }}>
                <UpcomingVisitAlertIcon visitDate={item.visitDate} visitTime={item.visitTime} status={item.status} visitStartAt={item.visitStartAt} />
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: StyleSheet.hairlineWidth }]}>
                  <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                    {statusConfig.label}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </DirectionalRow>
            {item.hostDepartment ? (
              <ThemedText style={[styles.hostName, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.hostDepartment}
              </ThemedText>
            ) : null}
            <DirectionalRow style={{ alignItems: 'center', gap: Spacing.xs, marginTop: 2 }}>
              <DDIcon name="clock" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.hostName, { color: theme.textSecondary }]} numberOfLines={1}>
                {formatTimeFromString(item.visitTime)}
              </ThemedText>
            </DirectionalRow>
          </View>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <View style={styles.metaRow}>
          <DDIcon name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.location}
          </ThemedText>
          <View style={styles.metaDot} />
          <DDIcon name="clock" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {formatTimeFromString(item.visitTime)}
          </ThemedText>
        </View>


        {item.status === 'completed' ? (
          <>
            <Spacer height={Spacing.md} />
            <View style={[styles.completedBadge, { backgroundColor: applyOpacity(theme.success, '15') }]}>
              <DDIcon name="check-circle" size={14} color={theme.success} />
              <ThemedText style={[styles.completedText, { color: theme.success }]}>
                {t('common.done')}
              </ThemedText>
            </View>
          </>
        ) : null}
      </Pressable>
    );
  };

  if ((isLoadingTasks || isFetchingTasks) && !tasksResponse) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background, padding: Spacing.lg }]}>
        <SkeletonCard showImage={false} lines={3} />
        <SkeletonCard showImage={false} lines={3} />
      </View>
    );
  }

  if (isTasksError && !tasksResponse) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <DDIcon name="alert-circle" size={40} color={theme.error} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.error }]}>
          {t('common.errorLoadingData')}
        </ThemedText>
        <Spacer height={Spacing.md} />
        <Pressable style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={() => refetchTasks()}>
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>{t('common.retry')}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScreenScrollView
      skipTopPadding
      contentContainerStyle={scrollContentStyle}
      refreshControl={
        <RefreshControl refreshing={isFetchingTasks} onRefresh={refetchTasks} tintColor={theme.primary} />
      }
    >
      {isFetchingTasks || (isTasksError && tasksResponse) ? (
        <>
          <DirectionalRow style={[styles.inlineQueryState, { backgroundColor: applyOpacity(isTasksError && !isFetchingTasks ? theme.error : theme.primary, '10') }]}>
            {isTasksError && !isFetchingTasks ? (
              <DDIcon name="alert-circle" size={16} color={theme.error} />
            ) : (
              <ActivityIndicator size="small" color={theme.primary} />
            )}
            <ThemedText style={[Typography.caption, { color: isTasksError && !isFetchingTasks ? theme.error : theme.textSecondary, flex: 1 }]}>
              {t(isTasksError && !isFetchingTasks ? 'common.errorLoadingData' : 'common.loading')}
            </ThemedText>
            {isTasksError && !isFetchingTasks ? (
              <Pressable onPress={() => refetchTasks()} hitSlop={8}>
                <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>{t('common.retry')}</ThemedText>
              </Pressable>
            ) : null}
          </DirectionalRow>
          <Spacer height={Spacing.md} />
        </>
      ) : null}
      <KPICardRow>
        <KPICard 
          title={t('time.today')} 
          value={String(stats.total)} 
          icon="disc" 
          color={theme.primary}
        />
        <KPICard 
          title={t('status.completed')} 
          value={String(stats.completed)} 
          icon="check-circle" 
          color={theme.success}
        />
      </KPICardRow>

      <Spacer height={Spacing.xl} />

      <DirectionalRow style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('buffet.buffetService')}
        </ThemedText>
        {requests.length > 3 ? (
          <Pressable 
            onPress={() => navigation.navigate(ROUTES.BUFFET_ALL_REQUESTS as any)}
            style={({ pressed }) => [
              styles.viewAllButton,
              { flexDirection: getFlexDirection(isRTL), opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <ThemedText style={[styles.viewAllText, { color: theme.primary }]}>
              {t('common.viewAll')}
            </ThemedText>
            <DDIcon name="chevron-right" size={16} variant="primary" directionAware />
          </Pressable>
        ) : null}
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      {requests.length > 0 ? (
        <View style={styles.requestsList}>
          {requests.map((request) => (
            <View 
              key={request.id}
              style={getCardStyle}
            >
              {renderRequestCard(request)}
            </View>
          ))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="cloche" size={32} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {t('common.noData')}
          </ThemedText>
        </ThemedView>
      )}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  inlineQueryState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  requestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.md,
  },
  requestCard: {
    borderRadius: 12,
    borderStartWidth: 4,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  headerInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  hostName: {
    fontSize: 13,
    marginTop: 2,
  },
  nameWithBadgeRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    marginStart: 4,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  assignButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalRequestInfo: {
    marginBottom: Spacing.md,
  },
  modalDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  staffList: {
    maxHeight: 300,
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  staffInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  staffStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noStaffState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCancelButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
