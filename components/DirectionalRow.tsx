import React, { ReactNode, Children } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

interface DirectionalRowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}

/**
 * A row container that handles RTL layout correctly across web and mobile.
 * 
 * RTL Handling Strategy (Child Swapping Pattern):
 * - Always uses flexDirection='row' (never 'row-reverse')
 * - WEB: Browser automatically reverses flexbox layouts when document.dir='rtl'
 * - MOBILE (iOS/Android): Children are reversed programmatically to achieve
 *   the correct visual order without conflicting with I18nManager
 * 
 * This approach prevents double-inversion bugs on Android where I18nManager
 * and row-reverse would both try to reverse the layout.
 */
export function DirectionalRow({ children, style, gap }: DirectionalRowProps) {
  const { isRTL } = useLanguage();
  
  // Determine if we should swap children (mobile RTL only)
  const shouldSwapChildren = isRTL && Platform.OS !== 'web';
  
  // Convert children to array and reverse if needed for mobile RTL
  const childArray = Children.toArray(children);
  const orderedChildren = shouldSwapChildren ? [...childArray].reverse() : childArray;
  
  const flattenedStyle = StyleSheet.flatten([style]);
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection: 'row', // Always 'row', never 'row-reverse'
    alignItems: flattenedStyle?.alignItems ?? 'center',
    gap: gap ?? flattenedStyle?.gap,
  };
  
  return (
    <View style={finalStyle}>
      {orderedChildren}
    </View>
  );
}
