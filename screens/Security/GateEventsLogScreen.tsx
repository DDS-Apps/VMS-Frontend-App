import React, { useState, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
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
import { RTLHorizontalScrollView, FilterChip } from "@/components/shared";
import { applyOpacity } from "@/utils/statusStyles";
import { formatTimestamp as formatTimestampUtil } from "@/utils/dateTimeUtils";
import { useSecurityGateLogsQuery } from "@/hooks/queries/useSecurityQueries";
import type { GateLogEntry, GateAction, GateResult } from "@/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SecurityStackParamList } from "@/types/securityNavigation.types";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';

type GateEventsLogScreenProps = NativeStackScreenProps<SecurityStackParamList, "GateEventsLog">;

type ResultFilter = 'all' | 'allowed' | 'denied';

export default function GateEventsLogScreen({ navigation }: GateEventsLogScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const isFilteredView = resultFilter !== 'all';

  const {
    data: allLogsResponse,
    isFetching: isSummaryFetching,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useSecurityGateLogsQuery({ limit: 100 });

  const {
    data: filteredLogsResponse,
    isFetching: isFilteredFetching,
    isError: isFilteredError,
    isPlaceholderData: isFilteredPlaceholderData,
    refetch: refetchFiltered,
  } = useSecurityGateLogsQuery(
    {
      result: isFilteredView ? resultFilter : undefined,
      limit: 100,
    },
    {
      enabled: isFilteredView,
      placeholderData: (previousData) => previousData,
    },
  );

  const lastSuccessfulFilteredResponseRef = useRef(filteredLogsResponse);
  if (filteredLogsResponse && !isFilteredPlaceholderData) {
    lastSuccessfulFilteredResponseRef.current = filteredLogsResponse;
  }
  const displayedFilteredResponse =
    filteredLogsResponse ?? lastSuccessfulFilteredResponseRef.current;
  const displayedLogsResponse = isFilteredView
    ? displayedFilteredResponse
    : allLogsResponse;
  const isLogsFetching = isFilteredView
    ? isFilteredFetching
    : isSummaryFetching;
  const isLogsError = isFilteredView ? isFilteredError : isSummaryError;
  const refetchLogs = isFilteredView ? refetchFiltered : refetchSummary;

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
    if (!displayedLogsResponse?.data) return [];
    return displayedLogsResponse.data;
  }, [displayedLogsResponse]);

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
        style={[styles.eventCard, { backgroundColor: theme.surface }, { flexDirection: getFlexDirection(isRTL) }]}
      >
        <View style={[styles.resultBorderLine, { backgroundColor: resultConfig.color }]} />
        
        <View style={styles.cardContent}>
          <DirectionalRow style={styles.cardHeader}>
            <View style={styles.visitorInfo}>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {event.visitorName || t('common.unknown')}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {event.gateName}
              </ThemedText>
            </View>
            <DirectionalRow style={[styles.resultBadge, { backgroundColor: resultConfig.bgColor }]}>
              <DDIcon name={resultConfig.icon} size={12} color={resultConfig.color} />
              <ThemedText style={[styles.resultText, { color: resultConfig.color }]}>
                {resultConfig.label}
              </ThemedText>
            </DirectionalRow>
          </DirectionalRow>

          {event.reason ? (
            <DirectionalRow style={[styles.reasonBox, { backgroundColor: applyOpacity(theme.error, '08') }]}>
              <DDIcon name="alert-circle" size={14} color={theme.error} />
              <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
                {event.reason}
              </ThemedText>
            </DirectionalRow>
          ) : null}

          <DirectionalRow style={styles.metaRow}>
            <DirectionalRow style={[styles.metaChip, { backgroundColor: applyOpacity(theme.primary, '10') }]}>
              <DDIcon name={methodConfig.icon} size={12} color={theme.primary} />
              <ThemedText style={[styles.metaText, { color: theme.primary }]}>
                {methodConfig.label}
              </ThemedText>
            </DirectionalRow>
            <DirectionalRow style={[styles.metaChip, { backgroundColor: applyOpacity(theme.textSecondary, '10') }]}>
              <DDIcon name="clock" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {timestamp.date}, {timestamp.time}
              </ThemedText>
            </DirectionalRow>
          </DirectionalRow>
        </View>
      </ThemedView>
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '600' }]}>
        {t('security.gateEventsLog')}
      </ThemedText>
      
      <Spacer height={Spacing.sm} />
      
      {isSummaryFetching && !allLogsResponse ? (
        <View style={styles.sectionLoadingState}>
          <ActivityIndicator size="small" color={theme.primary} />
          <ThemedText
            style={[Typography.caption, { color: theme.textSecondary }]}
          >
            {t('common.loading')}
          </ThemedText>
        </View>
      ) : isSummaryError && !allLogsResponse ? (
        <DirectionalRow
          style={[
            styles.inlineQueryState,
            { backgroundColor: applyOpacity(theme.error, '10') },
          ]}
        >
          <DDIcon name="alert-circle" size={16} color={theme.error} />
          <ThemedText
            style={[Typography.caption, { color: theme.error, flex: 1 }]}
          >
            {t('errors.failedToLoadData')}
          </ThemedText>
          <Pressable onPress={() => refetchSummary()} hitSlop={8}>
            <ThemedText
              style={[
                Typography.caption,
                { color: theme.primary, fontWeight: '600' },
              ]}
            >
              {t('common.retry')}
            </ThemedText>
          </Pressable>
        </DirectionalRow>
      ) : (
        <>
          {resultFilter !== 'all' &&
          (isSummaryFetching || isSummaryError) ? (
            <DirectionalRow
              style={[
                styles.inlineQueryState,
                {
                  backgroundColor: applyOpacity(
                    isSummaryError && !isSummaryFetching
                      ? theme.error
                      : theme.primary,
                    '10',
                  ),
                },
              ]}
            >
              {isSummaryError && !isSummaryFetching ? (
                <DDIcon name="alert-circle" size={16} color={theme.error} />
              ) : (
                <ActivityIndicator size="small" color={theme.primary} />
              )}
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color:
                      isSummaryError && !isSummaryFetching
                        ? theme.error
                        : theme.textSecondary,
                    flex: 1,
                  },
                ]}
              >
                {t(
                  isSummaryError && !isSummaryFetching
                    ? 'errors.failedToLoadData'
                    : 'common.loading',
                )}
              </ThemedText>
              {isSummaryError && !isSummaryFetching ? (
                <Pressable onPress={() => refetchSummary()} hitSlop={8}>
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
          ) : null}

          {resultFilter !== 'all' &&
          (isSummaryFetching || isSummaryError) ? (
            <Spacer height={Spacing.sm} />
          ) : null}

          <DirectionalRow style={styles.summaryRow}>
            <DirectionalRow style={[styles.summaryCard, { backgroundColor: applyOpacity(theme.success, '12') }]}>
              <DDIcon name="check-circle" size={20} color={theme.success} />
              <View>
                <ThemedText style={[Typography.title, { fontSize: 20, fontWeight: '700', color: theme.success }]}>
                  {eventCounts.allowed}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.success }]}>
                  {t('security.allowed')}
                </ThemedText>
              </View>
            </DirectionalRow>
            <DirectionalRow style={[styles.summaryCard, { backgroundColor: applyOpacity(theme.error, '12') }]}>
              <DDIcon name="x-circle" size={20} color={theme.error} />
              <View>
                <ThemedText style={[Typography.title, { fontSize: 20, fontWeight: '700', color: theme.error }]}>
                  {eventCounts.denied}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.error }]}>
                  {t('security.denied')}
                </ThemedText>
              </View>
            </DirectionalRow>
          </DirectionalRow>
        </>
      )}

      <Spacer height={Spacing.lg} />

      <SearchInput
        placeholder={t('common.search')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        showClearButton={false}
      />

      <Spacer height={Spacing.lg} />

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        nestedScrollEnabled={true}
      >
        {FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            isSelected={resultFilter === option.key}
            count={getFilterCount(option.key)}
            onPress={() => setResultFilter(option.key)}
          />
        ))}
      </RTLHorizontalScrollView>

      <Spacer height={Spacing.xl} />

      {isLogsFetching || (isLogsError && displayedLogsResponse) ? (
        <DirectionalRow
          style={[
            styles.inlineQueryState,
            {
              backgroundColor: applyOpacity(
                isLogsError && !isLogsFetching
                  ? theme.error
                  : theme.primary,
                '10',
              ),
            },
          ]}
        >
          {isLogsError && !isLogsFetching ? (
            <DDIcon name="alert-circle" size={16} color={theme.error} />
          ) : (
            <ActivityIndicator size="small" color={theme.primary} />
          )}
          <ThemedText
            style={[
              Typography.caption,
              {
                color:
                  isLogsError && !isLogsFetching
                    ? theme.error
                    : theme.textSecondary,
                flex: 1,
              },
            ]}
          >
            {t(
              isLogsError && !isLogsFetching
                ? 'errors.failedToLoadData'
                : 'common.loading',
            )}
          </ThemedText>
          {isLogsError && !isLogsFetching ? (
            <Pressable onPress={() => refetchLogs()} hitSlop={8}>
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
      ) : null}

      {isLogsFetching || (isLogsError && displayedLogsResponse) ? (
        <Spacer height={Spacing.md} />
      ) : null}

      {isLogsFetching && !displayedLogsResponse ? (
        <View style={styles.sectionLoadingState}>
          <ActivityIndicator size="small" color={theme.primary} />
          <ThemedText
            style={[Typography.caption, { color: theme.textSecondary }]}
          >
            {t('common.loading')}
          </ThemedText>
        </View>
      ) : isLogsError && !displayedLogsResponse ? (
        <View style={styles.errorState}>
          <DDIcon name="alert-circle" size={48} color={theme.error} />
          <Spacer height={Spacing.md} />
          <ThemedText
            style={[
              Typography.body,
              { color: theme.error, textAlign: 'center' },
            ]}
          >
            {t('errors.failedToLoadData')}
          </ThemedText>
          <Spacer height={Spacing.lg} />
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => refetchLogs()}
          >
            <ThemedText
              style={[
                Typography.body,
                { color: '#FFFFFF', fontWeight: '600' },
              ]}
            >
              {t('common.retry')}
            </ThemedText>
          </Pressable>
        </View>
      ) : filteredEvents.length > 0 ? (
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
  inlineQueryState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  sectionLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 76,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  summaryRow: {
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  filtersContainer: {
    gap: Spacing.sm,
  },
  filterPill: {
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  visitorInfo: {
    flex: 1,
    gap: 2,
  },
  resultBadge: {
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
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  metaRow: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaChip: {
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
