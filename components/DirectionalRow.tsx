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
 * 
 * IMPORTANT: I18nManager MUST be initialized correctly BEFORE React renders.
 * This is done in index.js via bootstrapLocale(). When initialized correctly:
 * - flexDirection: 'row' automatically appears as right-to-left on mobile RTL
 * - No manual child swapping is needed
 * - Web uses the same 'row' direction (document.dir='rtl' handles the flip)
 * 
 * USAGE:
 * ======
 * <DirectionalRow gap={8}>
 *   <Icon name="user" />
 *   <Text>Username</Text>
 * </DirectionalRow>
 * 
 * In LTR: [Icon] [Username]
 * In RTL: [Username] [Icon]  ← I18nManager handles this automatically!
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
  const flattenedStyle = StyleSheet.flatten([style]) || {};
  
  // ALWAYS use 'row' - I18nManager handles RTL on ALL platforms
  // when initialized correctly before first render
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection: 'row',
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
