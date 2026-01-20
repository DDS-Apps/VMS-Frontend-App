import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { Spacing } from '@/constants/theme';

interface RTLInfoRowProps {
  icon: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  alignItems?: 'flex-start' | 'center' | 'flex-end';
}

/**
 * RTL-aware info row with icon and content.
 * I18nManager handles flexDirection reversal automatically in RTL mode.
 */
export function RTLInfoRow({ 
  icon, 
  children, 
  style, 
  gap = Spacing.md,
  alignItems = 'flex-start'
}: RTLInfoRowProps) {
  return (
    <View style={[
      { 
        flexDirection: 'row',
        alignItems,
        gap,
      }, 
      style
    ]}>
      {icon}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
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
 * I18nManager handles flexDirection reversal automatically in RTL mode.
 */
export function RTLSimpleRow({ 
  icon, 
  text, 
  style, 
  gap = Spacing.md 
}: RTLSimpleRowProps) {
  return (
    <View style={[
      { 
        flexDirection: 'row',
        alignItems: 'center',
        gap,
      }, 
      style
    ]}>
      {icon}
      <View style={{ flex: 1 }}>{text}</View>
    </View>
  );
}
