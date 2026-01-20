/**
 * RTL Initializer - BACKWARDS COMPATIBILITY LAYER
 * ================================================
 * 
 * This file re-exports from the new utils/rtl.ts module for backwards compatibility.
 * New code should import from '@/utils/rtl' directly.
 * 
 * @deprecated Use '@/utils/rtl' instead
 */

import { Platform, I18nManager } from 'react-native';
import { SupportedLocale, localeConfig } from '@/constants/i18n';

// Re-export everything from the new rtl module
export {
  LANGUAGE_STORAGE_KEY,
  initializeRTL as initializeRTLSync,
  loadStoredLocale as initializeRTLAsync,
  changeLanguage as setLocaleWithRTL,
  isRTL as getCurrentRTLState,
  createTextStyle,
  marginHorizontal,
  paddingHorizontal,
  mirrorForRTL,
  getDirectionalIcon,
} from './rtl';

// Additional exports for compatibility with existing code

/**
 * Determines if children should be swapped for RTL layout.
 * 
 * Returns TRUE when:
 * - The context says isRTL is true (app is in Arabic mode)
 * - We're on mobile (not web)
 * - I18nManager.isRTL is false (hasn't been applied yet - requires restart)
 * 
 * This provides a fallback for Expo Go and hot reload scenarios where
 * I18nManager.forceRTL() hasn't taken effect yet.
 * 
 * Web doesn't need this because document.dir='rtl' takes effect immediately.
 */
export function shouldSwapChildrenForRTL(isRTL: boolean): boolean {
  // Web: browser handles RTL via document.dir, no swapping needed
  if (Platform.OS === 'web') {
    return false;
  }
  
  // Mobile: If context says RTL but I18nManager hasn't applied it,
  // we need to manually swap children
  if (isRTL && !I18nManager.isRTL) {
    return true;
  }
  
  // I18nManager is handling RTL correctly, no swapping needed
  return false;
}

/**
 * Sets the document direction on web platform.
 */
export function setWebDocumentDirection(locale: SupportedLocale): void {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const isRTL = localeConfig[locale]?.isRTL ?? false;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = locale === 'ar' ? 'ar' : 'en';
  }
}

/**
 * Platform-aware text alignment helper.
 */
export function getPlatformTextAlign(
  isRTL: boolean,
  alignment: 'start' | 'end' | 'left' | 'right' | 'center' = 'start'
): 'left' | 'right' | 'center' {
  if (alignment === 'center') return 'center';
  if (alignment === 'left' || alignment === 'right') return alignment;

  // 'start' and 'end' are logical values
  if (Platform.OS === 'web') {
    // Web: browser handles RTL via document.dir
    return alignment === 'start' ? 'left' : 'right';
  }

  // Mobile: resolve based on RTL state
  if (alignment === 'start') {
    return isRTL ? 'right' : 'left';
  }
  return isRTL ? 'left' : 'right';
}

/**
 * Returns the flex direction for horizontal layouts.
 * 
 * PLATFORM BEHAVIOR:
 * - Mobile: Returns 'row'. I18nManager handles layout flipping.
 * - Web: Returns 'row-reverse' when RTL (browser doesn't auto-flip).
 */
export function getFlexDirection(isRTL: boolean = I18nManager.isRTL): 'row' | 'row-reverse' {
  return Platform.OS === 'web' && isRTL ? 'row-reverse' : 'row';
}

/**
 * Gets the current RTL state from I18nManager
 */
export function getCurrentRTLStateFromI18n(): boolean {
  return I18nManager.isRTL;
}

/**
 * Type for RTL async result
 */
export interface RTLAsyncResult {
  locale: SupportedLocale;
  isRTL: boolean;
  needsReload: boolean;
}
