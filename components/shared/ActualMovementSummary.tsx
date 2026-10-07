import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatActualMovement, readMovementSummary, type MovementSummarySource } from '@/utils/movementSummary';
import { MOVEMENT_SUMMARY_ENABLED } from '@/constants/movementSummary';

/** Read-only historical values. Never feeds action guards or lifecycle timelines. */
export function ActualMovementValue({ source, kind, legacy }: {
  source: MovementSummarySource;
  kind: 'in' | 'out';
  legacy?: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  if (!MOVEMENT_SUMMARY_ENABLED) return <>{legacy ?? null}</>;
  const result = readMovementSummary(source.movementSummary);
  const timestamp = result.state === 'supported'
    ? result.summary[kind === 'in' ? 'latestCheckInAt' : 'latestCheckOutAt'] : null;
  const unavailable = isRTL ? 'غير متاح' : 'Unavailable';
  const label = result.state !== 'supported' ? unavailable
    : formatActualMovement(timestamp, source.timezone, isRTL, true);
  return <ThemedText accessibilityLabel={label} style={{ fontSize: 12 }} testID={`actual-${kind}-summary`}>
    {label}
  </ThemedText>;
}

export function ActualMovementSummary({ source }: { source?: MovementSummarySource }) {
  const { t } = useTranslation();
  if (!MOVEMENT_SUMMARY_ENABLED || !source) return null;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingVertical: 12 }}>
    {(['in', 'out'] as const).map(kind => <View key={kind} style={{ flexShrink: 1 }}>
      <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>{t(kind === 'in' ? 'visitor.actualIn' : 'visitor.actualOut')}</ThemedText>
      <ActualMovementValue source={source} kind={kind} />
    </View>)}
  </View>;
}
