/**
 * DirectionalRow Component
 * ========================
 * 
 * A row container that handles RTL layout correctly across all platforms.
 * 
 * HOW IT WORKS:
 * =============
 * 
 * Always uses flexDirection: 'row'. I18nManager handles the visual RTL flip
 * on ALL platforms when initialized correctly before first render:
 * 
 * - MOBILE: I18nManager.forceRTL(true) flips layouts automatically
 * - WEB: I18nManager + document.dir='rtl' enables React Native Web's RTL handling
 * 
 * NO child swapping or row-reverse needed!
 * 
 * USAGE:
 * ======
 * <DirectionalRow gap={8}>
 *   <Icon name="user" />
 *   <Text>Username</Text>
 * </DirectionalRow>
 * 
 * In LTR: [Icon] [Username]
 * In RTL: [Username] [Icon]  (I18nManager handles the flip)
 */

import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';

interface DirectionalRowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  /** Override alignment (default: 'center') */
  alignItems?: ViewStyle['alignItems'];
  /** Override justify (default: 'flex-start') */
  justifyContent?: ViewStyle['justifyContent'];
}

export function DirectionalRow({ 
  children, 
  style, 
  gap,
  alignItems = 'center',
  justifyContent = 'flex-start',
}: DirectionalRowProps) {
  const flattenedStyle = StyleSheet.flatten([style]) || {};
  
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection: 'row', // I18nManager handles RTL flip on all platforms
    alignItems: flattenedStyle.alignItems ?? alignItems,
    justifyContent: flattenedStyle.justifyContent ?? justifyContent,
    gap: gap ?? flattenedStyle.gap,
  };
  
  return (
    <View style={finalStyle}>
      {children}
    </View>
  );
}

/**
 * Helper hook to get the flex direction.
 * Always returns 'row' - I18nManager handles RTL.
 */
export function useDirectionalStyle() {
  return {
    flexDirection: 'row' as const,
  };
}

/**
 * Get flex direction. Always returns 'row' - I18nManager handles RTL.
 */
export function getFlexDirection(): 'row' {
  return 'row';
}

export default DirectionalRow;
