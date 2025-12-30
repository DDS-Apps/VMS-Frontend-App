import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SearchInput } from "@/components/SearchInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { applyOpacity } from "@/utils/statusStyles";
import { formatTimestamp as formatTimestampUtil } from "@/services/utils/dateTimeUtils";
import { useSecurityGateLogsQuery } from "@/hooks/queries/useSecurityQueries";
import type { GateLogEntry, GateAction, GateResult } from "@/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SecurityStackParamList } from "@/types/securityNavigation.types";

type GateEventsLogScreenProps = NativeStackScreenProps<SecurityStackParamList, "GateEventsLog">;

type ResultFilter = 'all' | 'allowed' | 'denied';

export default function GateEventsLogScreen({ navigation }: GateEventsLogScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

  const { data: allLogsResponse } = useSecurityGateLogsQuery({
    limit: 100,
  });

  const { data: gateLogsResponse, isLoading, isError, refetch } = useSecurityGateLogsQuery({
    result: resultFilter === 'all' ? undefined : resultFilter,
    limit: 100,
  });

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const allEvents = useMemo(() => {
    if (!allLogsResponse?.data) return [];
    return allLogsResponse.data;
  }, [allLogsResponse]);

  const events = useMemo(() => {
    if (!gateLogsResponse?.data) return [];
    return gateLogsResponse.data;
  }, [gateLogsResponse]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event =>
      (event.visitorName?.toLowerCase().includes(query) || false) ||
      event.gateName.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  const eventCounts = useMemo(() => {
    const allowed = allEvents.filter(e => e.result === 'allowed').length;
    const denied = allEvents.filter(e => e.result === 'denied').length;
    return {
      total: allEvents.length,
      allowed,
      denied,
    };
  }, [allEvents]);

  const FILTER_OPTIONS: { key: ResultFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'allowed', label: t('security.allowed') },
    { key: 'denied', label: t('security.denied') },
  ];

  const getFilterColors = (filterKey: ResultFilter, isActive: boolean) => {
    if (!isActive) {
      return {
        bg: theme.surfaceSecondary,
        text: theme.textSecondary,
        countBg: applyOpacity(theme.textSecondary, '15'),
        countText: theme.textSecondary,
      };
    }
    
    switch (filterKey) {
      case 'allowed':
        return {
          bg: applyOpacity(theme.success, '15'),
          text: theme.success,
          countBg: applyOpacity(theme.success, '25'),
          countText: theme.success,
        };
      case 'denied':
        return {
          bg: applyOpacity(theme.error, '15'),
          text: theme.error,
          countBg: applyOpacity(theme.error, '25'),
          countText: theme.error,
        };
      default:
        return {
          bg: applyOpacity(theme.primary, '15'),
          text: theme.primary,
          countBg: applyOpacity(theme.primary, '25'),
          countText: theme.primary,
        };
    }
  };

  const getResultConfig = (result: GateResult): { color: string; bgColor: string; label: string; icon: IconName } => {
    switch (result) {
      case 'allowed':
        return {
          color: theme.success,
          bgColor: applyOpacity(theme.success, '12'),
          label: t('security.allowed'),
          icon: 'check-circle',
        };
      case 'denied':
        return {
          color: theme.error,
          bgColor: applyOpacity(theme.error, '12'),
          label: t('security.denied'),
          icon: 'x-circle',
        };
      default:
        return {
          color: theme.textSecondary,
          bgColor: applyOpacity(theme.textSecondary, '12'),
          label: result,
          icon: 'circle',
        };
    }
  };

  const getMethodConfig = (action: GateAction): { label: string; icon: IconName } => {
    switch (action) {
      case 'check_in':
        return { label: t('actions.checkIn'), icon: 'log-in' };
      case 'check_out':
        return { label: t('actions.checkOut'), icon: 'log-out' };
      case 'access_denied':
        return { label: t('security.denied'), icon: 'x-circle' };
      default:
        return { label: action, icon: 'activity' };
    }
  };

  const formatTimestamp = (isoString: string): { date: string; time: string } => {
    const result = formatTimestampUtil(isoString, isRTL);

    let dateStr: string;
    if (result.isToday) {
      dateStr = t('time.today');
    } else if (result.isYesterday) {
      dateStr = t('time.yesterday');
    } else {
      dateStr = result.date;
    }

    return { date: dateStr, time: result.time };
  };

  const getFilterCount = (filterKey: ResultFilter): number => {
    switch (filterKey) {
      case 'all':
        return eventCounts.total;
      case 'allowed':
        return eventCounts.allowed;
      case 'denied':
        return eventCounts.denied;
    }
  };

  const renderEventCard = (event: GateLogEntry) => {
    const resultConfig = getResultConfig(event.result);
    const methodConfig = getMethodConfig(event.action);
    const timestamp = formatTimestamp(event.timestamp);

    return (
      <ThemedView
        key={event.id}
        style={[styles.eventCard, { backgroundColor: theme.surface }]}
      >
        <View style={[styles.resultBorderLine, { backgroundColor: resultConfig.color }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.visitorInfo}>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {event.visitorName || t('common.unknown')}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {event.gateName}
              </ThemedText>
            </View>
            <View style={[styles.resultBadge, { backgroundColor: resultConfig.bgColor }]}>
              <DDIcon name={resultConfig.icon} size={12} color={resultConfig.color} />
              <ThemedText style={[styles.resultText, { color: resultConfig.color }]}>
                {resultConfig.label}
              </ThemedText>
            </View>
          </View>

          {event.reason ? (
            <View style={[styles.reasonBox, { backgroundColor: applyOpacity(theme.error, '08') }]}>
              <DDIcon name="alert-circle" size={14} color={theme.error} />
              <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
                {event.reason}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: applyOpacity(theme.primary, '10') }]}>
              <DDIcon name={methodConfig.icon} size={12} color={theme.primary} />
              <ThemedText style={[styles.metaText, { color: theme.primary }]}>
                {methodConfig.label}
              </ThemedText>
            </View>
            <View style={[styles.metaChip, { backgroundColor: applyOpacity(theme.textSecondary, '10') }]}>
              <DDIcon name="clock" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {timestamp.date}, {timestamp.time}
              </ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>
    );
  };

  if (isLoading) {
    return (
      <ScreenScrollView contentContainerStyle={[scrollContentStyle, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
          {t('common.loading')}
        </ThemedText>
      </ScreenScrollView>
    );
  }

  if (isError) {
    return (
      <ScreenScrollView contentContainerStyle={[scrollContentStyle, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-circle" size={48} color={theme.error} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.error, textAlign: 'center' }]}>
          {t('errors.failedToLoadData')}
        </ThemedText>
        <Spacer height={Spacing.lg} />
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <ThemedText style={[Typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '600' }]}>
        {t('security.gateEventsLog')}
      </ThemedText>
      
      <Spacer height={Spacing.sm} />
      
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: applyOpacity(theme.success, '12') }]}>
          <DDIcon name="check-circle" size={20} color={theme.success} />
          <View>
            <ThemedText style={[Typography.title, { fontSize: 20, fontWeight: '700', color: theme.success }]}>
              {eventCounts.allowed}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.success }]}>
              {t('security.allowed')}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: applyOpacity(theme.error, '12') }]}>
          <DDIcon name="x-circle" size={20} color={theme.error} />
          <View>
            <ThemedText style={[Typography.title, { fontSize: 20, fontWeight: '700', color: theme.error }]}>
              {eventCounts.denied}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.error }]}>
              {t('security.denied')}
            </ThemedText>
          </View>
        </View>
      </View>

      <Spacer height={Spacing.lg} />

      <SearchInput
        placeholder={t('common.search')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        showClearButton={false}
      />

      <Spacer height={Spacing.lg} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        nestedScrollEnabled={true}
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = resultFilter === option.key;
          const count = getFilterCount(option.key);
          const colors = getFilterColors(option.key, isActive);

          return (
            <Pressable
              key={option.key}
              style={[styles.filterPill, { backgroundColor: colors.bg }]}
              onPress={() => setResultFilter(option.key)}
            >
              <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                {option.label}
              </ThemedText>
              <View style={[styles.filterCount, { backgroundColor: colors.countBg }]}>
                <ThemedText style={[styles.filterCountText, { color: colors.countText }]}>
                  {count}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Spacer height={Spacing.xl} />

      {filteredEvents.length > 0 ? (
        <View style={styles.cardList}>
          {filteredEvents.map(renderEventCard)}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <DDIcon name="activity" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {t('common.noResults')}
          </ThemedText>
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardList: {
    gap: Spacing.md,
  },
  eventCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  resultBorderLine: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  visitorInfo: {
    flex: 1,
    gap: 2,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
});
