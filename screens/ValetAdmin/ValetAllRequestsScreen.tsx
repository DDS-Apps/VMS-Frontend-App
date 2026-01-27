import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useValetParkingDashboard } from "@/hooks/queries/useValetAdminQueries";
import type { ValetParkingVisitorDto } from "@/types/api.types";
import type { Theme } from "@/types/theme.types";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { KPICard, KPICardRow } from '@/components/shared/KPICard';

const LAYOUT = {
  cardPadding: Spacing.md,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.lg,
  contentGap: Spacing.sm,
  statCardRadius: BorderRadius.md,
  accentWidth: 4,
  avatarSize: 44,
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

const StatusBadge = ({ needsParking, hasCarInfo, theme, t }: { 
  needsParking: boolean; 
  hasCarInfo: boolean;
  theme: Theme; 
  t: (key: string) => string;
}) => {
  let color: string;
  let label: string;
  let icon: string;

  if (!needsParking) {
    color = theme.textSecondary;
    label = t('parking.noParking');
    icon = 'x-circle';
  } else if (hasCarInfo) {
    color = theme.success;
    label = t('parking.carInfoProvided');
    icon = 'check-circle';
  } else {
    color = theme.warning;
    label = t('parking.carInfoPending');
    icon = 'alert-circle';
  }

  return (
    <View style={[
      styles.statusBadge, 
      { 
        backgroundColor: applyOpacity(color, '15'), 
        borderColor: applyOpacity(color, '30'),
      }
    ]}>
      <DDIcon name={icon} size={12} color={color} />
      <ThemedText style={[styles.statusText, { color, marginStart: 4 }]}>
        {label}
      </ThemedText>
    </View>
  );
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
  const hasCarInfo = !!(visitor.licensePlate && visitor.carModel);
  const needsParking = visitor.isVisitorNeedsParking === true || visitor.visitorNeedsParking === true;
  const accentColor = needsParking ? theme.success : theme.textSecondary;

  const detailParts = [
    visitor.hostName,
    visitor.hostDepartment,
    visitor.visitTime,
  ].filter(Boolean);

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
          backgroundColor: accentColor,
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
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]} numberOfLines={1}>
              {visitor.visitorName}
            </ThemedText>
            {visitor.visitorCompany ? (
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                {visitor.visitorCompany}
              </ThemedText>
            ) : null}
          </View>

          <StatusBadge 
            needsParking={needsParking} 
            hasCarInfo={hasCarInfo}
            theme={theme} 
            t={t}
          />
        </DirectionalRow>

        <Spacer height={Spacing.xs} />

        <DirectionalRow style={styles.compactDetailsRow} alignItems="center">
          <DDIcon name="user" size={13} variant="muted" />
          <ThemedText style={[styles.compactDetailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {detailParts.join(' · ')}
          </ThemedText>
          {visitor.isWalkIn ? (
            <View style={[styles.walkInBadge, { backgroundColor: applyOpacity(theme.info, '15') }]}>
              <ThemedText style={[styles.walkInText, { color: theme.info }]}>
                {t('reception.walkIn')}
              </ThemedText>
            </View>
          ) : null}
        </DirectionalRow>

        {needsParking && hasCarInfo ? (
          <>
            <Spacer height={Spacing.xs} />
            <DirectionalRow style={[styles.compactCarInfo, { backgroundColor: applyOpacity(theme.success, '10') }]} alignItems="center">
              <DDIcon name="truck" size={13} variant="success" />
              <ThemedText style={[styles.compactCarText, { color: theme.success }]} numberOfLines={1}>
                {carInfoParts.join(' · ')}
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
  const { isRTL } = useLanguage();  const [filterType, setFilterType] = useState<'all' | 'with_parking' | 'without_parking'>('all');
  
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
      <Spacer height={Spacing.md} />

      <View style={styles.paddedContent}>
        <StatsCards 
          totalVisitors={data?.summary.totalVisitors ?? 0}
          withParking={data?.summary.withParking ?? 0}
          withoutParking={data?.summary.withoutParking ?? 0}
          theme={theme} 
          t={t} 
        />
      </View>

      <Spacer height={LAYOUT.sectionSpacing} />

      <DirectionalRow style={[styles.sectionTitleRow, styles.paddedContent]}>
        <ThemedText style={[Typography.subtitle]}>
          {t('valet.todaysVisitors')}
        </ThemedText>
      </DirectionalRow>

      <Spacer height={Spacing.sm} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        nestedScrollEnabled={true}
      >
        {filterOptions.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterChip,
              { 
                backgroundColor: filterType === filter.key 
                  ? applyOpacity(theme.primary, '15') 
                  : theme.surface,
                borderColor: filterType === filter.key ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setFilterType(filter.key)}
          >
            <ThemedText
              style={[
                styles.filterChipText,
                { 
                  color: filterType === filter.key ? theme.primary : theme.textSecondary,
                  fontWeight: filterType === filter.key ? '600' : '400',
                }
              ]}
            >
              {filter.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <Spacer height={Spacing.md} />

      <View style={styles.paddedContent}>
        {filteredVisitors.length === 0 ? (
          <EmptyState theme={theme} t={t} />
        ) : (
          filteredVisitors.map((visitor) => (
            <React.Fragment key={visitor.requestId}>
              <VisitorCard 
                visitor={visitor} 
                theme={theme} 
                t={t}
                isRTL={isRTL}
              />
              <Spacer height={Spacing.sm} />
            </React.Fragment>
          ))
        )}
      </View>

      <Spacer height={Spacing.lg} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: LAYOUT.statCardRadius,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabsContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
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
    gap: Spacing.sm,
  },
  cardNameSection: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
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
    padding: Spacing.xl,
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
