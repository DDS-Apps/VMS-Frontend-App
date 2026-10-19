import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { DDIcon, IconName } from '../DDIcon';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';

export interface KPICardProps {
  title: string;
  value: string | number;
  icon: IconName;
  color: string;
  subtitle?: string;
}

export function KPICard({ title, value, icon, color, subtitle }: KPICardProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const { width, fontScale } = useWindowDimensions();
  const isMobile = width < 768;
  const [contentWidth, setContentWidth] = useState(0);
  const [valueMeasurement, setValueMeasurement] = useState({ key: '', width: 0 });
  const [wordMeasurement, setWordMeasurement] = useState({ key: '', width: 0 });
  const words = title.trim().split(/\s+/);
  const firstWord = words[0] ?? '';
  const remainingTitle = words.slice(1).join(' ');
  const valueKey = `${fontScale}:${value}`;
  const wordKey = `${fontScale}:${firstWord}`;
  const inlineFirstWord = isMobile
    && firstWord.length > 0
    && valueMeasurement.key === valueKey
    && wordMeasurement.key === wordKey
    && valueMeasurement.width + Spacing.xs + wordMeasurement.width < contentWidth;
  const label = inlineFirstWord ? remainingTitle : title;

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
        <DDIcon name={icon} size={18} color="#FFFFFF" />
      </View>

      <View
        testID="kpi-content"
        style={styles.textContainer}
        onLayout={isMobile ? event => setContentWidth(event.nativeEvent.layout.width) : undefined}
      >
        <View
          testID="kpi-value-header"
          style={[styles.valueHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <ThemedText
            testID="kpi-value"
            variant="h3"
            onLayout={isMobile ? event => setValueMeasurement({
              key: valueKey,
              width: event.nativeEvent.layout.width,
            }) : undefined}
            style={[
              styles.value,
              { color: theme.text },
            ]}
          >
            {value}
          </ThemedText>
          {inlineFirstWord ? (
            <ThemedText testID="kpi-inline-word" style={[styles.label, { color, flexShrink: 0 }]}>
              {firstWord}
            </ThemedText>
          ) : null}
        </View>

        {label ? (
          <ThemedText testID="kpi-label" style={[styles.label, { color }]}>
            {label}
          </ThemedText>
        ) : null}
        {subtitle ? (
          <ThemedText
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </ThemedText>
        ) : null}
        {isMobile && firstWord ? (
          <View
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.wordMeasurement}
          >
            <ThemedText
              testID="kpi-first-word-measure"
              accessible={false}
              numberOfLines={1}
              style={styles.label}
              onLayout={event => setWordMeasurement({
                key: wordKey,
                width: event.nativeEvent.layout.width,
              })}
            >
              {firstWord}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}

export interface KPICardRowProps {
  children: React.ReactNode;
  /** Optional width for a lone KPI on wide screens; phone grids are unchanged. */
  singleCardWidth?: number;
}

export function KPICardRow({ children, singleCardWidth }: KPICardRowProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { isRTL } = useLanguage();
  const isMobile = windowWidth < 768;
  // Keep phone grids two-column at every text scale; text wraps and cards grow vertically.
  const columnsPerRow = isMobile ? 2 : 4;
  
  const visibleChildren = React.Children.toArray(children);
  const childCount = visibleChildren.length;
  if (childCount === 0) {
    return null;
  }

  // Explicit phone rows avoid percentage widths + gaps wrapping a second card
  // onto its own line in narrow native containers.
  if (isMobile) {
    return (
      <View style={{ gap: Spacing.sm }}>
        {Array.from({ length: Math.ceil(childCount / 2) }, (_, rowIndex) => {
          const rowChildren = visibleChildren.slice(rowIndex * 2, rowIndex * 2 + 2);
          return (
            <View
              key={rowIndex}
              testID="kpi-mobile-row"
              style={[styles.row, {
                flexWrap: 'nowrap',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                gap: Spacing.sm,
              }]}
            >
              {rowChildren.map((child, index) => (
                <View
                  key={React.isValidElement(child) ? child.key ?? index : index}
                  testID="kpi-mobile-cell"
                  style={styles.mobileCell}
                >
                  {child}
                </View>
              ))}
              {rowChildren.length === 1 && childCount > 1 ? (
                <View
                  testID="kpi-empty-cell"
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={styles.mobileCell}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  const effectiveColumns = Math.min(columnsPerRow, childCount);
  const customSingleWidth = effectiveColumns === 1 && singleCardWidth !== undefined;
  const flexBasisPercent = effectiveColumns === 2 ? '46%' : effectiveColumns === 3 ? '30%' : '22%';
  
  const childrenWithWidth = React.Children.map(visibleChildren, (child) => {
    if (React.isValidElement(child)) {
      return (
        <View style={{ 
          flexBasis: customSingleWidth ? singleCardWidth : flexBasisPercent,
          flexGrow: customSingleWidth ? 0 : 1,
          flexShrink: customSingleWidth ? 1 : 0,
          maxWidth: customSingleWidth ? '100%' : effectiveColumns === 2 ? '49%' : effectiveColumns === 3 ? '32%' : '24%',
          alignSelf: 'stretch',
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
      testID="kpi-desktop-row"
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
    alignItems: 'stretch',
  },
  mobileCell: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.sm,
    paddingLeft: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    flexGrow: 1,
    overflow: 'visible' as const,
    gap: Spacing.sm,
  },
  iconContainer: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  valueHeader: {
    alignSelf: 'stretch',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: Spacing.xs,
  },
  wordMeasurement: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    alignItems: 'flex-start',
  },
  label: {
    ...Typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'left',
  },
  value: {
    ...Typography.title,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'left',
    flexShrink: 1,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 10,
    textAlign: 'left',
    marginTop: 2,
  },
});
