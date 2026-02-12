import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { DDIcon, IconName } from '../DDIcon';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import Spacer from '../Spacer';

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
        variant="h3"
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
  const { width: windowWidth } = useWindowDimensions();
  const { isRTL } = useLanguage();
  const isMobile = windowWidth < 768;
  const columnsPerRow = isMobile ? 2 : 4;
  
  const childCount = React.Children.count(children);
  if (childCount === 0) {
    return null;
  }
  
  const effectiveColumns = Math.min(columnsPerRow, childCount);
  const flexBasisPercent = effectiveColumns === 2 ? '46%' : effectiveColumns === 3 ? '30%' : '22%';
  
  const childrenWithWidth = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return (
        <View style={{ 
          flexBasis: flexBasisPercent,
          flexGrow: 1,
          flexShrink: 0,
          maxWidth: effectiveColumns === 2 ? '49%' : effectiveColumns === 3 ? '32%' : '24%',
          marginBottom: Spacing.md,
        }}>
          {child}
        </View>
      );
    }
    return child;
  });
  
  return (
    <View 
      style={[
        styles.row, 
        { 
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: Spacing.sm,
        }
      ]} 
    >
      {childrenWithWidth}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexWrap: 'wrap',
  },
  card: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    overflow: 'visible' as const,
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
