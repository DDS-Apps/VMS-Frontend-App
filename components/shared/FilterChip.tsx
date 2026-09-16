import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { DDIcon, IconName } from '../DDIcon';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFlexDirection } from '../DirectionalRow';
import { applyOpacity } from '@/utils/statusStyles';
import { Spacing, BorderRadius } from '@/constants/theme';

export interface FilterChipProps {
  label: string;
  isSelected: boolean;
  color?: string;
  icon?: IconName;
  count?: number;
  onPress: () => void;
  onClear?: () => void;
  clearAccessibilityLabel?: string;
}

export function FilterChip({
  label,
  isSelected,
  color,
  icon,
  count,
  onPress,
  onClear,
  clearAccessibilityLabel,
}: FilterChipProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const activeColor = color || theme.primary;
  const contentColor = isSelected ? activeColor : theme.textSecondary;
  const chipStyle = [
    styles.chip,
    { flexDirection: getFlexDirection(isRTL), gap: Spacing.xs },
    {
      backgroundColor: isSelected ? applyOpacity(activeColor, '15') : theme.surface,
      borderColor: isSelected ? activeColor : theme.border,
    },
  ];
  const chipContent = (
    <>
      {icon ? <DDIcon name={icon} size={14} color={contentColor} /> : null}
      <ThemedText style={[styles.chipText, { color: contentColor }]}>
        {label}
      </ThemedText>
      {typeof count === 'number' ? (
        <ThemedText style={[styles.countText, { color: isSelected ? applyOpacity(activeColor, '80') : theme.textSecondary }]}>
          {count}
        </ThemedText>
      ) : null}
    </>
  );

  if (isSelected && onClear) {
    return (
      <View style={[chipStyle, { paddingVertical: 0 }]}>
        <Pressable
          style={[styles.mainAction, { flexDirection: getFlexDirection(isRTL) }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: true }}
        >
          {chipContent}
        </Pressable>
        <Pressable
          style={styles.clearAction}
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel || `Clear ${label}`}
        >
          <DDIcon name="x" size={13} color={contentColor} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={chipStyle}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
    >
      {chipContent}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
  },
  clearAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    lineHeight: 22,
    fontWeight: '500',
  },
  countText: {
    fontSize: 11,
    lineHeight: 22,
    fontWeight: '600',
  },
});
