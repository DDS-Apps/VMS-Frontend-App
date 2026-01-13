import React, { ReactNode, Children } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

interface DirectionalRowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}

export function DirectionalRow({ children, style, gap }: DirectionalRowProps) {
  const { isRTL } = useLanguage();
  
  const childArray = Children.toArray(children);
  
  // Platform-aware RTL handling:
  // - On WEB: Browser's document.dir='rtl' automatically reverses flex layouts,
  //   so we keep DOM order and let the browser handle visual reversal
  // - On MOBILE: I18nManager doesn't flip flexDirection, so we reverse children manually
  const shouldReverseChildren = isRTL && Platform.OS !== 'web';
  const orderedChildren = shouldReverseChildren ? [...childArray].reverse() : childArray;
  
  // Flatten styles and set flexDirection
  const flattenedStyle = StyleSheet.flatten([style]);
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection: 'row',
    alignItems: flattenedStyle?.alignItems ?? 'center',
    gap: gap ?? flattenedStyle?.gap,
  };
  
  return (
    <View style={finalStyle}>
      {orderedChildren}
    </View>
  );
}
