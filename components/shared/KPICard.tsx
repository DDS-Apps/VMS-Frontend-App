import React from 'react';
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
  const { width: windowWidth } = useWindowDimensions();
  const { isRTL } = useLanguage();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const isMobile = windowWidth < 768;
  const columnsPerRow = isMobile ? 2 : 4;
  
  const childCount = React.Children.count(children);
  if (childCount === 0) {
    return null;
  }
  
  const effectiveColumns = Math.min(columnsPerRow, childCount);
  const gapValue = Spacing.md;
  const gapsPerRow = effectiveColumns - 1;
  
  const effectiveWidth = containerWidth > 0 ? containerWidth : windowWidth;
  const totalGapWidth = gapsPerRow * gapValue;
  const cardWidth = Math.floor((effectiveWidth - totalGapWidth) / effectiveColumns);
  
  const childrenWithWidth = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return (
        <View style={{ width: cardWidth > 0 ? cardWidth : '48%' }}>
          {child}
        </View>
      );
    }
    return child;
  });
  
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  };
  
  return (
    <View 
      style={[
        styles.row, 
        { 
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: gapValue,
        }
      ]} 
      onLayout={handleLayout}
    >
      {childrenWithWidth}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
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
