import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { DDIcon, IconName } from '../DDIcon';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, BorderRadius, Typography } from '../../constants/theme';
import { Spacer } from '../Spacer';

export interface KPICardProps {
  title: string;
  value: string | number;
  icon: IconName;
  color: string;
}

export function KPICard({ title, value, icon, color }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: color },
        ]}
      >
        <DDIcon name={icon} size={24} color="#FFFFFF" />
      </View>

      <Spacer height={Spacing.md} />

      <ThemedText
        style={[
          styles.label,
          { color: color },
        ]}
      >
        {title}
      </ThemedText>

      <Spacer height={Spacing.xs} />

      <ThemedText
        style={[
          styles.value,
          { color: theme.text },
        ]}
      >
        {value}
      </ThemedText>
    </ThemedView>
  );
}

export interface KPICardRowProps {
  children: React.ReactNode;
}

export function KPICardRow({ children }: KPICardRowProps) {
  return (
    <View style={styles.row}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  card: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
  value: {
    ...Typography.title,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
});
