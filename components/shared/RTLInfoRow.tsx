import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { Spacing } from '@/constants/theme';
import DirectionalRow from '@/components/DirectionalRow';

interface RTLInfoRowProps {
  icon: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  alignItems?: 'flex-start' | 'center' | 'flex-end';
}

/**
 * RTL-aware info row with icon and content.
 * Uses DirectionalRow for automatic RTL layout handling.
 */
export function RTLInfoRow({ 
  icon, 
  children, 
  style, 
  gap = Spacing.md,
  alignItems = 'flex-start'
}: RTLInfoRowProps) {
  return (
    <DirectionalRow
      gap={gap}
      alignItems={alignItems}
      style={style}
    >
      {icon}
      <View style={{ flex: 1 }}>{children}</View>
    </DirectionalRow>
  );
}

interface RTLSimpleRowProps {
  icon: ReactNode;
  text: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}

/**
 * Simple RTL-aware row with icon and text.
 * Uses DirectionalRow for automatic RTL layout handling.
 */
export function RTLSimpleRow({ 
  icon, 
  text, 
  style, 
  gap = Spacing.md 
}: RTLSimpleRowProps) {
  return (
    <DirectionalRow
      gap={gap}
      alignItems="center"
      style={style}
    >
      {icon}
      <View style={{ flex: 1 }}>{text}</View>
    </DirectionalRow>
  );
}
