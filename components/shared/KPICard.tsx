import React from 'react';
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

      <View style={styles.textContainer}>
        <ThemedText
          variant="h3"
          style={[styles.value, { color: theme.text }]}
        >
          {value}
        </ThemedText>
        <ThemedText style={[styles.label, { color }]}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </ThemedText>
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
    // Let each text block fill the content column so ThemedText's
    // language-aware alignment also applies to wrapped KPI labels.
    alignItems: 'stretch',
  },
  label: {
    ...Typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    ...Typography.title,
    fontSize: 20,
    // Clear the inherited title line height so each platform measures its font,
    // including Arabic numerals and accessibility-scaled text, without clipping.
    lineHeight: undefined,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 10,
    marginTop: 2,
  },
});
