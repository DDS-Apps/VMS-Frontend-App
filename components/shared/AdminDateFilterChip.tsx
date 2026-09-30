import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { getFlexDirection } from '@/components/DirectionalRow';
import { BorderRadius, Spacing } from '@/constants/theme';
import { applyOpacity } from '@/utils/statusStyles';

interface AdminDateFilterChipProps {
  label: string;
  clearLabel: string;
  color: string;
  isRTL: boolean;
  onOpen: () => void;
  onClear: () => void;
}

export function AdminDateFilterChip({
  label,
  clearLabel,
  color,
  isRTL,
  onOpen,
  onClear,
}: AdminDateFilterChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: applyOpacity(color, '12'), flexDirection: getFlexDirection(isRTL) }]}>
      <Pressable
        style={[styles.main, { flexDirection: getFlexDirection(isRTL) }]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <DDIcon name="calendar" size={14} color={color} />
        <ThemedText style={[styles.text, { color }]}>{label}</ThemedText>
      </Pressable>
      <Pressable
        style={styles.clear}
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel={clearLabel}
      >
        <DDIcon name="x" size={14} color={color} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'center',
    flexShrink: 0,
    borderRadius: BorderRadius.full,
  },
  main: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  clear: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    paddingVertical: Spacing.sm,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});