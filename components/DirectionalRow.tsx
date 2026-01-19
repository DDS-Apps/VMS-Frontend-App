import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPlatformFlexDirection } from '@/utils/rtlInitializer';

interface DirectionalRowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}

/**
 * A row container that handles RTL layout correctly across web and mobile.
 * 
 * RTL Handling Strategy:
 * - WEB: Browser automatically reverses flexbox layouts when document.dir='rtl'.
 *   We keep flexDirection='row' and let the browser handle the visual reversal.
 * 
 * - MOBILE (iOS/Android): We use flexDirection='row-reverse' for RTL to achieve
 *   the correct visual order. React Native's I18nManager handles logical properties
 *   (start/end) but we explicitly set row-reverse for consistent row layouts.
 * 
 * This approach avoids potential double-reversal issues while ensuring correct
 * RTL behavior on all platforms.
 */
export function DirectionalRow({ children, style, gap }: DirectionalRowProps) {
  const { isRTL } = useLanguage();
  
  // On web, browser handles RTL via document.dir - use 'row' always
  // On mobile RTL, use 'row-reverse' to achieve correct visual order
  const flexDirection = getPlatformFlexDirection(isRTL);
  
  const flattenedStyle = StyleSheet.flatten([style]);
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection,
    alignItems: flattenedStyle?.alignItems ?? 'center',
    gap: gap ?? flattenedStyle?.gap,
  };
  
  return (
    <View style={finalStyle}>
      {children}
    </View>
  );
}
