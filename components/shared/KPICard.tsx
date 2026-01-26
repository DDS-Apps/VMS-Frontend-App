import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, LayoutChangeEvent } from 'react-native';
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
  cardWidth?: number;
}

export function KPICard({ title, value, icon, color, cardWidth }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          width: cardWidth ?? '100%',
          flexGrow: 0,
          flexShrink: 0,
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
  const { width: windowWidth } = useWindowDimensions();
  const { isRTL } = useLanguage();
  const [containerWidth, setContainerWidth] = useState(0);
  const isMobile = windowWidth < 768;
  const columnsPerRow = isMobile ? 2 : 4;
  const gapSize = Spacing.md;
  
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };
  
  const childCount = React.Children.count(children);
  const effectiveColumns = Math.min(columnsPerRow, childCount);
  const totalGaps = effectiveColumns - 1;
  const cardWidth = containerWidth > 0 
    ? Math.floor((containerWidth - (totalGaps * gapSize)) / effectiveColumns)
    : undefined;
  
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && cardWidth) {
      return React.cloneElement(child as React.ReactElement<KPICardProps>, { cardWidth });
    }
    return child;
  });
  
  return (
    <View 
      style={[
        styles.row, 
        { flexDirection: isRTL ? 'row-reverse' : 'row' }
      ]} 
      onLayout={handleLayout}
    >
      {childrenWithProps}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
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
