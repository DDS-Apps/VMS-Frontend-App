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

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.xxl,
  contentGap: Spacing.md,
  statCardRadius: BorderRadius.md,
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
  <View style={styles.statsGrid}>
    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
        <DDIcon name="users" size={24} variant="primary" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {totalVisitors}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('dashboard.totalVisitors')}
      </ThemedText>
    </ThemedView>

    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.success, '20') }]}>
        <DDIcon name="truck" size={24} variant="success" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {withParking}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('parking.withParking')}
      </ThemedText>
    </ThemedView>

    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.textSecondary, '20') }]}>
        <DDIcon name="x-circle" size={24} variant="muted" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {withoutParking}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('parking.withoutParking')}
      </ThemedText>
    </ThemedView>
  </View>
);

const VisitorCard = React.memo(({ 
  visitor, 
  theme,
  t,
}: { 
  visitor: ValetParkingVisitorDto; 
  theme: Theme;
  t: (key: string) => string;
}) => {
  const hasCarInfo = !!(visitor.licensePlate && visitor.carModel);

  const detailParts = [
    visitor.hostName,
    visitor.hostDepartment,
    visitor.visitTime,
    visitor.visitorPhone,
  ].filter(Boolean);

  const carInfoParts = [
    visitor.licensePlate,
    visitor.carModel,
    visitor.carColor,
  ].filter(Boolean);

  return (
    <ThemedView style={[styles.visitorCard, { backgroundColor: theme.surface }]}>
      <View style={[
        styles.cardAccent, 
        { backgroundColor: (visitor.isVisitorNeedsParking === true || visitor.visitorNeedsParking === true) ? theme.success : theme.textSecondary }
      ]} />

      <View style={styles.cardMainSection}>
        <View style={styles.cardHeaderRow}>
          <VisitorAvatar name={visitor.visitorName} theme={theme} />
          
          <View style={styles.cardNameSection}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 16 }]}>
              {visitor.visitorName}
            </ThemedText>
            {visitor.visitorCompany ? (
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
                {visitor.visitorCompany}
              </ThemedText>
            ) : null}
          </View>

          <StatusBadge 
            needsParking={visitor.isVisitorNeedsParking === true || visitor.visitorNeedsParking === true} 
            hasCarInfo={hasCarInfo}
            theme={theme} 
            t={t}
          />
        </View>

        <Spacer height={Spacing.sm} />

        <View style={styles.compactDetailsRow}>
          <DDIcon name="user" size={14} variant="muted" />
          <ThemedText style={[styles.compactDetailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {detailParts.join('  |  ')}
          </ThemedText>
          {visitor.isWalkIn ? (
            <View style={[styles.walkInBadge, { backgroundColor: applyOpacity(theme.info, '15') }]}>
              <ThemedText style={[styles.walkInText, { color: theme.info }]}>
                {t('reception.walkIn')}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {(visitor.isVisitorNeedsParking === true || visitor.visitorNeedsParking === true) && hasCarInfo ? (
          <>
            <Spacer height={Spacing.sm} />
            <View style={[styles.compactCarInfo, { backgroundColor: applyOpacity(theme.success, '08') }]}>
              <DDIcon name="truck" size={14} variant="success" />
              <ThemedText style={[styles.compactCarText, { color: theme.success }]}>
                {carInfoParts.join('  |  ')}
              </ThemedText>
            </View>
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
      <Spacer height={Spacing.xl} />

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

      <View style={[styles.sectionTitleRow, styles.paddedContent, { flexDirection: 'row' }]}>
        <ThemedText style={[Typography.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('valet.todaysVisitors')}
        </ThemedText>
      </View>

      <Spacer height={Spacing.md} />

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

      <Spacer height={Spacing.lg} />

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
              />
              <Spacer height={Spacing.md} />
            </React.Fragment>
          ))
        )}
      </View>

      <Spacer height={Spacing.xxl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: LAYOUT.statCardRadius,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabsContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
  },
  visitorCard: {
    borderRadius: LAYOUT.cardRadius,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
  },
  cardMainSection: {
    flex: 1,
    padding: LAYOUT.cardPadding,
  },
  cardHeaderRow: {
    alignItems: 'center',
    gap: Spacing.md,
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
  statusBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailsRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  detailItem: {
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  walkInBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  walkInText: {
    fontSize: 11,
    fontWeight: '500',
  },
  carInfoSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  carInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carInfoLabel: {
    fontSize: 12,
  },
  carInfoValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactDetailText: {
    fontSize: 13,
    flex: 1,
  },
  compactCarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  compactCarText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  emptyState: {
    padding: Spacing.xxl,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
});
