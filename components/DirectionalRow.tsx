import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

interface DirectionalRowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  /** @deprecated No longer needed - flexDirection handles RTL automatically */
  forceReverse?: boolean;
}

export function DirectionalRow({ children, style, gap }: DirectionalRowProps) {
  const { isRTL } = useLanguage();
  
  // RTL handling: Use flexDirection to mirror layout
  // React Native Web sets direction:ltr on Views, so browser RTL doesn't work.
  // We must explicitly use row-reverse for RTL layouts on all platforms.
  const flattenedStyle = StyleSheet.flatten([style]);
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: flattenedStyle?.alignItems ?? 'center',
    gap: gap ?? flattenedStyle?.gap,
  };
  
  return (
    <View style={finalStyle}>
      {children}
    </View>
  );
}
