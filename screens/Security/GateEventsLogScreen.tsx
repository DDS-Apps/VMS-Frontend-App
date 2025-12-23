import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
import { useServerTimezone } from "@/hooks/useServerTimezone";
import { applyOpacity } from "@/utils/statusStyles";
import { formatTimestamp as formatTimestampUtil } from "@/services/utils/dateTimeUtils";
import {
  getGateEvents,
  getGateEventCounts,
  GateEvent,
  GateEventResult,
  GateEventMethod,
} from "@/services/mock/securityVisitorState";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SecurityStackParamList } from "@/types/securityNavigation.types";

type GateEventsLogScreenProps = NativeStackScreenProps<SecurityStackParamList, "GateEventsLog">;

type ResultFilter = 'all' | GateEventResult;

export default function GateEventsLogScreen({ navigation }: GateEventsLogScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const { serverTimezone } = useServerTimezone();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<GateEvent[]>([]);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
  };

  useFocusEffect(
    React.useCallback(() => {
      setEvents(getGateEvents());
    }, [])
  );

  const filteredEvents = events
    .filter(event =>
      event.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.gate.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(event => {
      if (resultFilter === 'all') return true;
      return event.result === resultFilter;
    });

  const eventCounts = getGateEventCounts();

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

  const getResultConfig = (result: GateEventResult): { color: string; bgColor: string; label: string; icon: IconName } => {
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
    }
  };

  const getMethodConfig = (method: GateEventMethod): { label: string; icon: IconName } => {
    switch (method) {
      case 'qr':
        return { label: t('security.qrScan'), icon: 'maximize' };
      case 'manual':
        return { label: t('security.manualEntry'), icon: 'edit-3' };
      case 'badge':
        return { label: t('security.badgeScan'), icon: 'credit-card' };
    }
  };

  const formatTimestamp = (isoString: string): { date: string; time: string } => {
    const result = formatTimestampUtil(isoString, isRTL, serverTimezone);

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

  const renderEventCard = (event: GateEvent) => {
    const resultConfig = getResultConfig(event.result);
    const methodConfig = getMethodConfig(event.method);
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
                {event.visitorName}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {event.gate}
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
          <ThemedText style={[Typography.subtitle, { color: theme.textSecondary, textAlign: 'center', fontWeight: '500' }]}>
            {t('security.noGateEvents')}
          </ThemedText>
          <Spacer height={4} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', opacity: 0.7 }]}>
            {searchQuery ? t('common.noResults') : t('common.noData')}
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
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingEnd: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  filterCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 22,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  cardList: {
    gap: Spacing.md,
  },
  eventCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  resultBorderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    padding: Spacing.lg,
    paddingStart: Spacing.lg + 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  visitorInfo: {
    flex: 1,
    marginEnd: Spacing.md,
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
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
});
