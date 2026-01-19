import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp, Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Spacing } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

interface RTLInfoRowProps {
  icon: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  alignItems?: 'flex-start' | 'center' | 'flex-end';
}

/**
 * RTL-aware info row with icon and content.
 * Uses child swapping on mobile to achieve correct RTL layout.
 * Web relies on browser's dir="rtl" for automatic reversal.
 */
export function RTLInfoRow({ 
  icon, 
  children, 
  style, 
  gap = Spacing.md,
  alignItems = 'flex-start'
}: RTLInfoRowProps) {
  const { isRTL } = useLanguage();
  
  // On mobile RTL, swap children order to achieve icon-on-right layout
  // On web, browser handles this via dir="rtl"
  const shouldSwapChildren = isRTL && !isWeb;
  
  return (
    <View style={[
      { 
        flexDirection: 'row',
        alignItems,
        gap,
      }, 
      style
    ]}>
      {shouldSwapChildren ? (
        <>
          <View style={{ flex: 1 }}>{children}</View>
          {icon}
        </>
      ) : (
        <>
          {icon}
          <View style={{ flex: 1 }}>{children}</View>
        </>
      )}
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
 * Uses child swapping on mobile to achieve correct RTL layout.
 */
export function RTLSimpleRow({ 
  icon, 
  text, 
  style, 
  gap = Spacing.md 
}: RTLSimpleRowProps) {
  const { isRTL } = useLanguage();
  
  // On mobile RTL, swap children order
  const shouldSwapChildren = isRTL && !isWeb;
  
  return (
    <View style={[
      { 
        flexDirection: 'row',
        alignItems: 'center',
        gap,
      }, 
      style
    ]}>
      {shouldSwapChildren ? (
        <>
          <View style={{ flex: 1 }}>{text}</View>
          {icon}
        </>
      ) : (
        <>
          {icon}
          <View style={{ flex: 1 }}>{text}</View>
        </>
      )}
    </View>
  );
}
