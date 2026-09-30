import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { ar } from '@/constants/i18n/ar';
import { en } from '@/constants/i18n/en';
import type {
  VisitMovementEvent,
  VisitMovementHistory,
} from '@/types/api.types';

type MovementHistoryRow =
  | { kind: 'checkin'; event: VisitMovementEvent; checkout?: VisitMovementEvent }
  | { kind: 'checkout'; event: VisitMovementEvent }
  | { kind: 'administrative_completion'; event: VisitMovementEvent };

export function groupMovementEvents(data: VisitMovementEvent[]): MovementHistoryRow[] {
  const checkoutsById = new Map(
    data.filter((event) => event.eventType === 'checked_out').map((event) => [event.id, event]),
  );
  const linkedCheckoutIds = new Set(
    data
      .filter((event) => event.eventType === 'checked_in' && event.departureEventId)
      .map((event) => event.departureEventId!)
      .filter((id) => checkoutsById.has(id)),
  );

  const rows: MovementHistoryRow[] = [];
  data.forEach((event) => {
    if (event.eventType === 'checked_in') {
      const checkout = event.departureEventId
        ? checkoutsById.get(event.departureEventId)
        : undefined;
      rows.push({ kind: 'checkin', event, checkout });
    } else if (event.eventType === 'checked_out') {
      if (!linkedCheckoutIds.has(event.id)) {
        rows.push({ kind: 'checkout', event });
      }
    } else {
      rows.push({ kind: 'administrative_completion', event });
    }
  });
  return rows;
}

export function formatMovementTimestamp(
  occurredAt: string,
  timezone: string,
  isRTL: boolean,
): string {
  return new Intl.DateTimeFormat(isRTL ? 'ar-SA' : 'en-US', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(occurredAt));
}

export interface MovementHistoryProps {
  movementHistory?: VisitMovementHistory;
}

export function MovementHistory({ movementHistory }: MovementHistoryProps) {
  const { isRTL } = useLanguage();
  const { theme } = useTheme();
  if (movementHistory === undefined) return null;

  const strings = isRTL ? ar.movementHistory : en.movementHistory;
  const rows = groupMovementEvents(movementHistory.data);
  const renderMetadata = (event: VisitMovementEvent) =>
    (event.actor?.name || event.gate?.name) ? (
      <ThemedText style={[styles.metadata, { color: theme.textSecondary }]}>
        {[
          event.actor?.name && `${strings.actor}: ${event.actor.name}`,
          event.gate?.name && `${strings.gate}: ${event.gate.name}`,
        ].filter(Boolean).join(' · ')}
      </ThemedText>
    ) : null;
  const renderTime = (event: VisitMovementEvent) => (
    <View>
      <ThemedText style={styles.timestamp}>
        {formatMovementTimestamp(event.occurredAt, movementHistory.timezone, isRTL)}
      </ThemedText>
      {renderMetadata(event)}
    </View>
  );

  return (
    <View style={[styles.container, { borderColor: theme.border }]} testID="movement-history">
      <ThemedText style={styles.title}>{strings.title}</ThemedText>
      {rows.length === 0 ? (
        <ThemedText style={[styles.empty, { color: theme.textSecondary }]}>
          {strings.noHistory}
        </ThemedText>
      ) : rows.map((row) => (
        <View key={row.event.id} style={[styles.row, { borderColor: theme.border }]}>
          {row.kind === 'checkin' ? (
            <>
              <View style={styles.movement}>
                <ThemedText style={styles.label}>{strings.checkIn}</ThemedText>
                {renderTime(row.event)}
              </View>
              {row.checkout ? (
                <View key={row.checkout.id} style={styles.movement}>
                  <ThemedText style={styles.label}>{strings.checkOut}</ThemedText>
                  {renderTime(row.checkout)}
                </View>
              ) : (
                <ThemedText style={[styles.metadata, { color: theme.textSecondary }]}>
                  {strings.noCheckout}
                </ThemedText>
              )}
            </>
          ) : row.kind === 'checkout' ? (
            <View style={styles.movement}>
              <ThemedText style={styles.label}>{strings.checkOut}</ThemedText>
              {renderTime(row.event)}
            </View>
          ) : (
            <View style={styles.movement}>
              <ThemedText style={styles.label}>{strings.administrativelyClosed}</ThemedText>
              {renderTime(row.event)}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    fontSize: 14,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 8,
  },
  movement: {
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 14,
  },
  metadata: {
    fontSize: 12,
  },
});