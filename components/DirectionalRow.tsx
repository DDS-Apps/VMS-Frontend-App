/**
 * DirectionalRow Component
 * ========================
 * 
 * A row container that handles RTL layout correctly across all platforms.
 * 
 * HOW IT WORKS:
 * =============
 * 
 * Uses explicit flexDirection: 'row-reverse' for RTL layouts.
 * 
 * NOTE: We use explicit row-reverse instead of relying on I18nManager.forceRTL()
 * because on iOS, forceRTL() only affects the initial bundle layout. If the user
 * changes language after app start, I18nManager may not flip 'row' automatically.
 * Using explicit row-reverse ensures consistent RTL behavior.
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

import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const flattenedStyle = StyleSheet.flatten([style]) || {};
  
  // Debug log
  console.log('[DirectionalRow] isRTL:', isRTL, 'applying flexDirection:', isRTL ? 'row-reverse' : 'row');
  
  // Use row-reverse for RTL to ensure proper layout
  // This is needed because I18nManager.forceRTL() may not work
  // correctly on iOS if called after initial bundle load
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: flattenedStyle.alignItems ?? alignItems,
    justifyContent: flattenedStyle.justifyContent ?? justifyContent,
    gap: gap ?? flattenedStyle.gap,
  };
  
  // NO child swapping needed - I18nManager handles RTL flip
  return (
    <View style={finalStyle}>
      {children}
    </View>
  );
}

/**
 * Helper hook to get the flex direction based on RTL state.
 * Returns 'row-reverse' for RTL, 'row' for LTR.
 */
export function useDirectionalStyle() {
  const { isRTL } = useLanguage();
  return {
    flexDirection: isRTL ? 'row-reverse' as const : 'row' as const,
  };
}

/**
 * Get flex direction based on isRTL parameter.
 * Returns 'row-reverse' for RTL, 'row' for LTR.
 */
export function getFlexDirection(isRTL: boolean): 'row' | 'row-reverse' {
  return isRTL ? 'row-reverse' : 'row';
}

export default DirectionalRow;
