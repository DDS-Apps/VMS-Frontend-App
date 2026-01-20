/**
 * DirectionalRow Component
 * ========================
 * 
 * A row container that handles RTL layout correctly across all platforms.
 * 
 * HOW IT WORKS:
 * =============
 * 
 * Uses flexDirection: 'row' and relies on I18nManager for RTL flip.
 * When I18nManager hasn't applied RTL yet (Expo Go hot reload), it falls back
 * to manual child swapping via shouldSwapChildrenForRTL.
 * 
 * USAGE:
 * ======
 * <DirectionalRow gap={8}>
 *   <Icon name="user" />
 *   <Text>Username</Text>
 * </DirectionalRow>
 * 
 * In LTR: [Icon] [Username]
 * In RTL: [Username] [Icon]
 */

import React, { ReactNode, Children } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { shouldSwapChildrenForRTL, getFlexDirection as getRTLFlexDirection } from '@/utils/rtlInitializer';

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
  const { isRTL } = useLanguage();
  const shouldSwap = shouldSwapChildrenForRTL(isRTL);
  const flattenedStyle = StyleSheet.flatten([style]) || {};
  
  // On web RTL, use row-reverse. On mobile, use row (I18nManager or child swap handles RTL).
  const flexDirection = Platform.OS === 'web' ? getRTLFlexDirection(isRTL) : 'row';
  
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection,
    alignItems: flattenedStyle.alignItems ?? alignItems,
    justifyContent: flattenedStyle.justifyContent ?? justifyContent,
    gap: gap ?? flattenedStyle.gap,
  };
  
  // Convert children to array and reverse if swapping needed (mobile only)
  const childArray = Children.toArray(children);
  const renderedChildren = shouldSwap ? [...childArray].reverse() : childArray;
  
  return (
    <View style={finalStyle}>
      {renderedChildren}
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
