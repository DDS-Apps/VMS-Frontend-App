import React, { ReactNode, Children } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

interface DirectionalRowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  forceReverse?: boolean;
}

export function DirectionalRow({ children, style, gap, forceReverse = false }: DirectionalRowProps) {
  const { isRTL } = useLanguage();
  
  const childArray = Children.toArray(children);
  
  // RTL handling strategy:
  // - On WEB: Browser's document.dir='rtl' should reverse flex layouts automatically,
  //   BUT some containers (with borders/overflow) have React Native Web bugs.
  //   Use forceReverse=true for those problematic containers to manually reverse children.
  // - On MOBILE: I18nManager doesn't flip flexDirection, so we always reverse children.
  const isWeb = Platform.OS === 'web';
  const shouldReverseChildren = isRTL && (!isWeb || forceReverse);
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
