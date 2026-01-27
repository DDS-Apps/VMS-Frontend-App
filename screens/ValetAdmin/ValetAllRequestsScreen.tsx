import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl, useWindowDimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity, getStatusConfig } from "@/utils/statusStyles";
import { useValetParkingDashboard } from "@/hooks/queries/useValetAdminQueries";
import type { ValetParkingVisitorDto } from "@/types/api.types";
import type { Theme } from "@/types/theme.types";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { KPICard, KPICardRow } from '@/components/shared/KPICard';
import { StatusBadge } from '@/components/shared/StatusBadge';

const LAYOUT = {
  cardPadding: Spacing.sm,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.md,
  contentGap: Spacing.xs,
  statCardRadius: BorderRadius.md,
  accentWidth: 4,
  avatarSize: 40,
};

const VisitorAvatar = ({ name, theme, size = 44 }: { name: string; theme: Theme; size?: number }) => {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
      <ThemedText style={[styles.avatarText, { color: theme.primary, fontSize: size * 0.36 }]}>
        {initials}
      </ThemedText>
    </View>
  );
};

const getVariantFromStatus = (status: string): 'success' | 'warning' | 'error' | 'info' | 'muted' | 'primary' => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'visitor_accepted':
    case 'checked_in':
    case 'completed':
    case 'in_progress':
      return 'success';
    case 'pending':
    case 'pending_approval':
    case 'pending_host_approval':
    case 'waiting_on_visitor':
      return 'warning';
    case 'rejected':
    case 'cancelled':
    case 'no_show':
    case 'auto_cancelled':
    case 'visitor_rejected':
      return 'error';
    case 'checked_out':
    case 'scheduled':
      return 'info';
    default:
      return 'muted';
  }
};

const StatsCards = ({ 
  totalVisitors, 
  withParking, 
  withoutParking, 
  theme, 
  t 
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
      title={t('parking.withParking')} 
      value={withParking} 
      icon="truck" 
      color={theme.success}
    />
    <KPICard 
      title={t('parking.withoutParking')} 
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
  const hasCarInfo = !!(visitor.licensePlate || visitor.carModel);
  const needsParking = visitor.isVisitorNeedsParking === true || visitor.visitorNeedsParking === true;
  const statusConfig = getStatusConfig(theme, visitor.status || 'pending', t);

  const carInfoParts = [
    visitor.licensePlate,
    visitor.carModel,
    visitor.carColor,
  ].filter(Boolean);

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

          <StatusBadge 
            label={getStatusConfig(theme, visitor.status || 'pending', t).label}
            variant={getVariantFromStatus(visitor.status || 'pending')}
            size="sm"
          />
        </DirectionalRow>

        <View style={{ height: Spacing.xs }} />

        <DirectionalRow style={styles.compactDetailsRow} alignItems="center">
          <DDIcon name="user" size={12} variant="muted" />
          <ThemedText style={[styles.compactDetailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {[visitor.hostName, visitor.hostDepartment, visitor.visitTime].filter(Boolean).join(' · ')}
          </ThemedText>
          {visitor.isWalkIn ? (
            <View style={[styles.walkInBadge, { backgroundColor: applyOpacity(theme.info, '15') }]}>
              <ThemedText style={[styles.walkInText, { color: theme.info }]}>
                {t('reception.walkIn')}
              </ThemedText>
            </View>
          ) : null}
        </DirectionalRow>

        {needsParking ? (
          <>
            <View style={{ height: Spacing.xs }} />
            <DirectionalRow 
              style={[
                styles.compactCarInfo, 
                { backgroundColor: hasCarInfo ? applyOpacity(theme.success, '10') : applyOpacity(theme.warning, '10') }
              ]} 
              alignItems="center"
            >
              <DDIcon name="truck" size={12} color={hasCarInfo ? theme.success : theme.warning} />
              <ThemedText 
                style={[
                  styles.compactCarText, 
                  { color: hasCarInfo ? theme.success : theme.warning }
                ]} 
                numberOfLines={1}
              >
                {hasCarInfo ? carInfoParts.join(' · ') : t('parking.carInfoPending')}
              </ThemedText>
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

const LoadingState = ({ theme }: { theme: Theme }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={theme.primary} />
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
  const { width: screenWidth } = useWindowDimensions();
  const [filterType, setFilterType] = useState<'all' | 'with_parking' | 'without_parking'>('all');
  
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth > 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  
  const today = new Date().toISOString().split('T')[0];
  const { data, isLoading, isError, refetch, isRefetching } = useValetParkingDashboard(today);

  const filteredVisitors = useMemo(() => {
    if (!data?.data) return [];
    
    switch (filterType) {
      case 'with_parking':
        return data.data.filter(v => v.isVisitorNeedsParking === true || v.visitorNeedsParking === true);
      case 'without_parking':
        return data.data.filter(v => v.isVisitorNeedsParking !== true && v.visitorNeedsParking !== true);
      default:
        return data.data;
    }
  }, [data?.data, filterType]);

  const filterOptions = [
    { key: 'all' as const, label: t('common.all') },
    { key: 'with_parking' as const, label: t('parking.withParking') },
    { key: 'without_parking' as const, label: t('parking.withoutParking') },
  ];

  if (isLoading) {
    return <LoadingState theme={theme} />;
  }

  if (isError) {
    return <ErrorState theme={theme} t={t} onRetry={refetch} />;
  }

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.primary}
        />
      }
    >
      <View style={styles.paddedContent}>
        <StatsCards 
          totalVisitors={data?.summary.totalVisitors ?? 0}
          withParking={data?.summary.withParking ?? 0}
          withoutParking={data?.summary.withoutParking ?? 0}
          theme={theme} 
          t={t} 
        />

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.sectionTitleRow}>
          <ThemedText style={[Typography.subtitle]}>
            {t('valet.todaysVisitors')}
          </ThemedText>
        </DirectionalRow>
      </View>

      <Spacer height={Spacing.xs} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        nestedScrollEnabled={true}
      >
        <View style={[styles.segmentedControl, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {filterOptions.map((option, index) => {
            const isActive = filterType === option.key;
            const isFirst = index === 0;
            const isLast = index === filterOptions.length - 1;

            return (
              <Pressable
                key={option.key}
                style={[
                  styles.segmentButton,
                  isActive && { backgroundColor: theme.primary },
                  isFirst && styles.segmentFirst,
                  isLast && styles.segmentLast,
                ]}
                onPress={() => setFilterType(option.key)}
              >
                <ThemedText
                  style={[
                    styles.segmentText,
                    { color: isActive ? '#FFFFFF' : theme.text }
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Spacer height={Spacing.sm} />

      <View style={styles.paddedContent}>
        {filteredVisitors.length === 0 ? (
          <EmptyState theme={theme} t={t} />
        ) : (
          <View style={styles.cardGrid}>
            {filteredVisitors.map((visitor) => (
              <View 
                key={visitor.requestId}
                style={numColumns > 1 ? { width: numColumns === 2 ? '49%' : '32%', flexGrow: 0 } : { width: '100%', marginBottom: LAYOUT.contentGap }}
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
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: Spacing.sm,
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
  },
  tabsContainer: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    height: 36,
  },
  segmentButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  segmentFirst: {
    borderTopStartRadius: BorderRadius.lg - 1,
    borderBottomStartRadius: BorderRadius.lg - 1,
  },
  segmentLast: {
    borderTopEndRadius: BorderRadius.lg - 1,
    borderBottomEndRadius: BorderRadius.lg - 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
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
  walkInBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginStart: Spacing.xs,
  },
  walkInText: {
    fontSize: 10,
    fontWeight: '500',
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
