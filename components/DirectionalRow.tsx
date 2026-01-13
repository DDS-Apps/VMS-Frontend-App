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
  
  // On WEB: document.dir='rtl' already reverses flex flow, so we don't reverse children
  // On MOBILE: I18nManager doesn't flip flexDirection, so we need to reverse children
  const shouldReverseChildren = isRTL && Platform.OS !== 'web';
  const orderedChildren = shouldReverseChildren ? [...childArray].reverse() : childArray;
  
  // Flatten styles and ensure flexDirection is correct
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
