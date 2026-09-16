import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { isApiError } from '@/api/errors';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useDashboardKpisQuery } from '@/hooks/queries/useDashboardKpiQuery';
import type { DashboardKpi } from '@/types/api.types';
import type { IconName } from '@/components/DDIcon';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, Typography } from '@/constants/theme';
import { KPICard, KPICardRow } from './KPICard';
import { SkeletonCard } from './Skeleton';

const KPI_PRESENTATION: Record<string, { icon: IconName; color: 'primary' | 'warning' | 'success' | 'info' | 'secondary' }> = {
  totalVisitors: { icon: 'users', color: 'info' },
  pendingApprovals: { icon: 'clock', color: 'warning' },
  pendingRequests: { icon: 'clock', color: 'warning' },
  checkedIn: { icon: 'log-in', color: 'success' },
  checkedOut: { icon: 'log-out', color: 'secondary' },
  todaysVisitors: { icon: 'calendar', color: 'primary' },
  todaysRequests: { icon: 'clipboard', color: 'primary' },
};

const KPI_TRANSLATION_KEYS: Record<string, string> = {
  totalVisitors: 'dashboard.totalVisitors',
  pendingApprovals: 'dashboard.pendingApprovals',
  pendingRequests: 'dashboard.pendingRequests',
  checkedIn: 'dashboard.checkedIn',
  checkedOut: 'dashboard.checkedOut',
  todaysVisitors: 'dashboard.todaysVisitors',
  todaysRequests: 'dashboard.todaysRequests',
};

export function DashboardKpiSection() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { t, locale } = useTranslation();
  const identityKey =
    isAuthenticated && user ? `${user.id}:${user.role}` : undefined;
  const query = useDashboardKpisQuery(identityKey);
  const forbidden = isApiError(query.error) && query.error.code === 'FORBIDDEN';

  useFocusEffect(
    React.useCallback(() => {
      if (identityKey && !forbidden) {
        void query.refetch({ cancelRefetch: false });
      }
    }, [forbidden, identityKey, query.refetch]),
  );

  if (forbidden) {
    return (
      <View style={[styles.error, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <DDIcon name="lock" size={18} color={theme.error} />
        <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
          {t('dashboard.kpiAccessError')}
        </ThemedText>
      </View>
    );
  }

  if (query.isFetching) {
    const skeletonCount = Math.max(query.data?.kpis.length ?? 4, 1);
    return (
      <KPICardRow>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <SkeletonCard key={index} showImage={false} lines={1} style={styles.skeleton} />
        ))}
      </KPICardRow>
    );
  }

  if (query.error) {
    return (
      <View style={[styles.error, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <DDIcon name="alert-circle" size={18} color={theme.error} />
        <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
          {t('dashboard.kpiLoadError')}
        </ThemedText>
        <Pressable onPress={() => query.refetch({ cancelRefetch: false })} hitSlop={8}>
          <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const kpis = query.data?.kpis ?? [];
  if (kpis.length === 0) return null;

  const localeTag = locale === 'ar' ? 'ar-SA' : 'en-US';
  return (
    <KPICardRow>
      {kpis.map((kpi: DashboardKpi) => {
        const presentation = KPI_PRESENTATION[kpi.key] ?? { icon: 'bar-chart-2' as IconName, color: 'primary' as const };
        const translationKey = KPI_TRANSLATION_KEYS[kpi.key];
        return (
          <KPICard
            key={kpi.key}
            title={translationKey ? t(translationKey) : kpi.label}
            value={kpi.value.toLocaleString(localeTag)}
            icon={presentation.icon}
            color={theme[presentation.color]}
          />
        );
      })}
    </KPICardRow>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    marginBottom: 0,
  },
  error: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});