import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, RefreshControl, LayoutChangeEvent } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity, getStatusConfig } from "@/utils/statusStyles";
import { VALET_GRID_PADDING_SIDE } from "@/utils/gridLayout";
import { useValetParkingDashboard } from "@/hooks/queries/useValetAdminQueries";
import { useRetainedDatedData } from "@/hooks/useRetainedDatedData";
import type { ValetParkingVisitorDto } from "@/types/api.types";
import type { Theme } from "@/types/theme.types";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { RequestStatusBadge } from '@/components/shared/RequestStatusBadge';
import { DashboardKpiSection, VisitorMatrixTable, WalkInBadge } from '@/components/shared';
import { KPICard, KPICardRow } from '@/components/shared/KPICard';
import { useRefreshDashboardKpis } from '@/hooks/queries/useDashboardKpiQuery';
import { SkeletonCard } from '@/components/shared/Skeleton';
import { useUpcomingIndicator } from "@/hooks/useUpcomingVisitTimer";
import { getInitials } from "@/utils/formatters";
import { UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES, isUpcomingIndicatorEligibleStatus } from "@/constants/requestConstants";
import {
  filterAndSortValetVisitors,
  getValetVisitorParkingDecision,
  mapValetVisitorToMatrixItem,
  VALET_ADMIN_DEFAULT_VIEW_MODE,
  type ValetAdminVisitorsViewMode,
} from "@/utils/valetAdminVisitorsTable";

const LAYOUT = {
  cardPadding: Spacing.sm,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.md,
  contentGap: Spacing.xs,
  statCardRadius: BorderRadius.md,
  accentWidth: 4,
  avatarSize: 40,
};

const ValetUpcomingAlertIcon = React.memo(({ visitDate, visitTime, status, visitStartAt }: { visitDate: string; visitTime: string; status: string; visitStartAt?: string }) => {
  const { theme } = useTheme();
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
    <View accessibilityLabel="Visit starts soon" accessibilityRole="image" style={{ marginEnd: 4 }}>
      <DDIcon name="alert-circle" size={14} color={theme.error} />
    </View>
  );
});

const VisitorAvatar = ({ name, theme, size = 44 }: { name: string; theme: Theme; size?: number }) => {
  const initials = getInitials(name);
  return (
    <View style={[
      styles.avatar, 
      { 
        backgroundColor: applyOpacity(theme.primary, '15'),
        width: size,
        height: size,
        borderRadius: LAYOUT.cardRadius - 2,
      }
    ]}>
      <ThemedText
        style={[styles.avatarText, { color: theme.primary, fontSize: size * 0.36 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {initials}
      </ThemedText>
    </View>
  );
};

const StatsCards = ({
  totalVisitors,
  withParking,
  withoutParking,
  theme,
  t,
}: {
  totalVisitors: number;
  withParking: number;
  withoutParking: number;
  theme: Theme;
  t: (key: string) => string;
}) => (
  <KPICardRow>
    <KPICard
      title={t('dashboard.totalVisitors')}
      value={totalVisitors}
      icon="users"
      color={theme.primary}
    />
    <KPICard
      title={t('parking.needsParking')}
      value={withParking}
      icon="truck"
      color={theme.success}
    />
    <KPICard
      title={t('parking.noParking')}
      value={withoutParking}
      icon="x-circle"
      color={theme.textSecondary}
    />
  </KPICardRow>
);

const VisitorCard = React.memo(({ 
  visitor, 
  theme,
  t,
  isRTL,
}: { 
  visitor: ValetParkingVisitorDto; 
  theme: Theme;
  t: (key: string) => string;
  isRTL: boolean;
}) => {
  const parkingDecision = getValetVisitorParkingDecision(visitor);
  const statusConfig = getStatusConfig(theme, visitor.status || 'pending', t);

  return (
    <ThemedView style={[
      styles.visitorCard, 
      { 
        backgroundColor: theme.surface,
        flexDirection: getFlexDirection(isRTL),
      }
    ]}>
      <View style={[
        styles.cardAccent, 
        { 
          backgroundColor: statusConfig.borderColor ?? statusConfig.text ?? theme.primary,
          borderTopLeftRadius: isRTL ? 0 : LAYOUT.cardRadius,
          borderBottomLeftRadius: isRTL ? 0 : LAYOUT.cardRadius,
          borderTopRightRadius: isRTL ? LAYOUT.cardRadius : 0,
          borderBottomRightRadius: isRTL ? LAYOUT.cardRadius : 0,
        }
      ]} />

      <View style={styles.cardMainSection}>
        <DirectionalRow style={styles.cardHeaderRow} alignItems="center">
          <VisitorAvatar name={visitor.visitorName} theme={theme} size={LAYOUT.avatarSize} />
          
          <View style={styles.cardNameSection}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14 }]} numberOfLines={1}>
              {visitor.visitorName}
            </ThemedText>
            {visitor.visitorCompany ? (
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                {visitor.visitorCompany}
              </ThemedText>
            ) : null}
          </View>

          <DirectionalRow alignItems="center" gap={Spacing.xs}>
            <ValetUpcomingAlertIcon
              visitDate={visitor.visitDate}
              visitTime={visitor.visitTime}
              status={visitor.status || 'pending'}
              visitStartAt={visitor.visitStartAt}
            />
            <RequestStatusBadge status={visitor.status || 'pending'} />
          </DirectionalRow>
        </DirectionalRow>

        <View style={{ height: Spacing.xs }} />

        <DirectionalRow style={styles.compactDetailsRow} alignItems="center">
          <DDIcon name="user" size={12} variant="muted" />
          <ThemedText style={[styles.compactDetailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {[visitor.hostName, visitor.hostDepartment, visitor.visitTime].filter(Boolean).join(' · ')}
          </ThemedText>
          {visitor.isWalkIn ? <WalkInBadge size="sm" /> : null}
        </DirectionalRow>

        {parkingDecision === 'required' ? (
          <>
            <View style={{ height: Spacing.xs }} />
            <DirectionalRow
              style={[styles.compactCarInfo, { backgroundColor: applyOpacity(theme.primary, '10') }]}
              alignItems="center"
            >
              <DDIcon name="map-pin" size={12} color={theme.primary} />
            </DirectionalRow>
          </>
        ) : null}
      </View>
    </ThemedView>
  );
});

const EmptyState = ({ theme, t }: { theme: Theme; t: (key: string) => string }) => (
  <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
    <DDIcon name="inbox" size={48} variant="muted" />
    <Spacer height={Spacing.md} />
    <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
      {t('valet.noVisitorsToday')}
    </ThemedText>
  </ThemedView>
);

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <SkeletonCard showImage={false} lines={2} />
    <SkeletonCard showImage={false} lines={2} />
    <SkeletonCard showImage={false} lines={2} />
  </View>
);

const ErrorState = ({ theme, t, onRetry }: { theme: Theme; t: (key: string) => string; onRetry: () => void }) => (
  <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
    <DDIcon name="alert-circle" size={48} variant="danger" />
    <Spacer height={Spacing.md} />
    <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
      {t('common.errorLoadingData')}
    </ThemedText>
    <Spacer height={Spacing.md} />
    <Pressable
      style={[styles.retryButton, { backgroundColor: theme.primary }]}
      onPress={onRetry}
    >
      <ThemedText style={[Typography.bodySmall, { color: theme.buttonText }]}>
        {t('common.retry')}
      </ThemedText>
    </Pressable>
  </ThemedView>
);

export default function ValetAllRequestsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const isValetAdminHome = user?.role === 'valet_admin';
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState<ValetAdminVisitorsViewMode>(
    VALET_ADMIN_DEFAULT_VIEW_MODE,
  );

  // Measure the card grid's actual rendered width instead of guessing from screen width,
  // so the column count and card sizing always match the space really available. Widths
  // are percentages, not fixed pixel math, so they never fight with the row's padding/gap.
  const [gridWidth, setGridWidth] = useState(0);
  const handleGridLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setGridWidth((prev) => (Math.abs(prev - width) > 1 ? width : prev));
  };
  const numColumns = gridWidth >= 900 ? 3 : gridWidth >= 600 ? 2 : 1;
  const cardWidthPercent: `${number}%` | undefined =
    numColumns === 3 ? '33.33%' : numColumns === 2 ? '50%' : undefined;
  
  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dateStr = formatDateForApi(selectedDate);
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
    isRefetching,
  } = useValetParkingDashboard(dateStr);
  const {
    data: displayedData,
    dateKey: displayedDateStr,
  } = useRetainedDatedData(dateStr, data);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const getMonthKey = (monthIndex: number): string => {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    return months[monthIndex];
  };

  const getDisplayDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('time.today');
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return t('time.tomorrow');
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t('time.yesterday');
    }
    return `${date.getDate()} ${t(`months.${getMonthKey(date.getMonth())}`).slice(0, 3)} ${date.getFullYear()}`;
  };

  const getDateFromApiString = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const displayedDate = getDateFromApiString(displayedDateStr);

  const filteredVisitors = useMemo(() => {
    if (!displayedData?.data) return [];
    return filterAndSortValetVisitors(displayedData.data);
  }, [displayedData?.data]);
  const tableVisitors = useMemo(
    () => filteredVisitors.map(mapValetVisitorToMatrixItem),
    [filteredVisitors],
  );
  const refreshDashboardKpis = useRefreshDashboardKpis();
  const refreshDashboard = useCallback(async () => {
    await Promise.all([refetch(), refreshDashboardKpis()]);
  }, [refetch, refreshDashboardKpis]);

  if (isLoading && !displayedData) {
    return <LoadingState />;
  }

  if (isError && !displayedData) {
    return <ErrorState theme={theme} t={t} onRetry={refetch} />;
  }

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refreshDashboard}
          tintColor={theme.primary}
        />
      }
    >
      <View style={styles.paddedContent}>
        {isValetAdminHome ? (
          <DashboardKpiSection />
        ) : (
          <StatsCards
            totalVisitors={displayedData?.summary.totalVisitors ?? 0}
            withParking={displayedData?.summary.withParking ?? 0}
            withoutParking={displayedData?.summary.withoutParking ?? 0}
            theme={theme}
            t={t}
          />
        )}

        {isFetching || (isError && displayedData) ? (
          <>
            <Spacer height={Spacing.md} />
            <DirectionalRow
              style={[
                styles.inlineQueryState,
                {
                  backgroundColor: applyOpacity(
                    isError && !isFetching ? theme.error : theme.primary,
                    '10',
                  ),
                },
              ]}
            >
              {isError && !isFetching ? (
                <DDIcon name="alert-circle" size={16} color={theme.error} />
              ) : (
                <ActivityIndicator size="small" color={theme.primary} />
              )}
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color:
                      isError && !isFetching
                        ? theme.error
                        : theme.textSecondary,
                    flex: 1,
                  },
                ]}
              >
                {t(
                  isError && !isFetching
                    ? 'common.errorLoadingData'
                    : 'common.loading',
                )}
              </ThemedText>
              {isError && !isFetching ? (
                <Pressable onPress={() => refetch()} hitSlop={8}>
                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.primary, fontWeight: '600' },
                    ]}
                  >
                    {t('common.retry')}
                  </ThemedText>
                </Pressable>
              ) : null}
            </DirectionalRow>
          </>
        ) : null}

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.sectionTitleRow}>
          <ThemedText style={[Typography.subtitle, styles.sectionTitle]}>
            {getDisplayDate(displayedDate)} {t('valet.visitors')}
          </ThemedText>
          <DirectionalRow
            style={styles.sectionControls}
            alignItems="center"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('form.selectDate')}
              onPress={() => setShowDatePicker(true)}
              hitSlop={8}
              style={styles.calendarButton}
            >
              <DDIcon name="calendar" size={20} color={theme.primary} />
            </Pressable>
            <DirectionalRow
              style={[
                styles.viewToggle,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cardView')}
                accessibilityState={{ selected: viewMode === 'card' }}
                onPress={() => setViewMode('card')}
                hitSlop={6}
                style={[
                  styles.viewToggleButton,
                  {
                    backgroundColor:
                      viewMode === 'card' ? theme.primary : 'transparent',
                  },
                ]}
              >
                <DDIcon
                  name="grid"
                  size={18}
                  color={
                    viewMode === 'card'
                      ? theme.buttonText
                      : theme.textSecondary
                  }
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.tableView')}
                accessibilityState={{ selected: viewMode === 'table' }}
                onPress={() => setViewMode('table')}
                hitSlop={6}
                style={[
                  styles.viewToggleButton,
                  {
                    backgroundColor:
                      viewMode === 'table' ? theme.primary : 'transparent',
                  },
                ]}
              >
                <DDIcon
                  name="list"
                  size={18}
                  color={
                    viewMode === 'table'
                      ? theme.buttonText
                      : theme.textSecondary
                  }
                />
              </Pressable>
            </DirectionalRow>
          </DirectionalRow>
        </DirectionalRow>
      </View>

      <Spacer height={Spacing.sm} />

      <View style={styles.paddedContent}>
        {filteredVisitors.length === 0 ? (
          <EmptyState theme={theme} t={t} />
        ) : viewMode === 'table' ? (
          <VisitorMatrixTable
            visitors={tableVisitors}
            variant="matrix"
          />
        ) : (
          <View style={styles.cardGrid} onLayout={handleGridLayout}>
            {filteredVisitors.map((visitor) => (
              <View 
                key={visitor.requestId}
                style={
                  cardWidthPercent
                    ? { width: cardWidthPercent, paddingEnd: Spacing.sm, marginBottom: LAYOUT.contentGap }
                    : { width: '100%', marginBottom: LAYOUT.contentGap }
                }
              >
                <VisitorCard 
                  visitor={visitor} 
                  theme={theme} 
                  t={t}
                  isRTL={isRTL}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      <Spacer height={Spacing.md} />

      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        mode="single"
      />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: VALET_GRID_PADDING_SIDE,
  },
  inlineQueryState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    gap: Spacing.xs,
  },
  statCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: LAYOUT.statCardRadius,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    flexShrink: 1,
  },
  sectionControls: {
    flexShrink: 0,
    gap: Spacing.sm,
  },
  viewToggle: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: 2,
    overflow: 'hidden',
  },
  viewToggleButton: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xs,
  },
  calendarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  visitorCard: {
    borderRadius: LAYOUT.cardRadius,
    overflow: 'hidden',
  },
  cardAccent: {
    width: LAYOUT.accentWidth,
  },
  cardMainSection: {
    flex: 1,
    padding: LAYOUT.cardPadding,
  },
  cardHeaderRow: {
    gap: Spacing.xs,
  },
  cardNameSection: {
    flex: 1,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  detailsRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  carInfoSection: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  carInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carInfoLabel: {
    fontSize: 11,
  },
  carInfoValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  compactDetailsRow: {
    gap: 4,
  },
  compactDetailText: {
    fontSize: 12,
    flex: 1,
  },
  compactCarInfo: {
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  compactCarText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    padding: Spacing.lg,
    borderRadius: LAYOUT.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
});
