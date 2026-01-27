/**
 * RTL Initializer - BACKWARDS COMPATIBILITY LAYER
 * ================================================
 * 
 * This file provides backwards compatibility with old RTL code.
 * 
 * @deprecated Use '@/utils/localeManager' instead for all new code
 * 
 * KEY CHANGE:
 * ===========
 * The old shouldSwapChildrenForRTL() workaround is NO LONGER NEEDED.
 * When I18nManager is initialized correctly BEFORE first render (which
 * is now done in index.js via bootstrapLocale()), flexDirection: 'row'
 * works correctly on ALL platforms including mobile RTL.
 * 
 * This function now always returns FALSE to disable the old workaround.
 */

import { Platform, I18nManager } from 'react-native';
import { SupportedLocale, LOCALE_CONFIG, isRTLLocale, applyWebDocumentDirection } from './localeManager';

// Re-export from localeManager for backwards compatibility
export { LANGUAGE_STORAGE_KEY, DEFAULT_LOCALE } from './localeManager';
export { isRTLLocale as isRTL } from './localeManager';

/**
 * @deprecated Use bootstrapLocale() from localeManager instead
 */
export function initializeRTLSync(): void {
  console.warn('[rtlInitializer] initializeRTLSync is deprecated. Use bootstrapLocale() from localeManager.');
  I18nManager.allowRTL(true);
  if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(true);
  }
}

/**
 * @deprecated Use bootstrapLocale() from localeManager instead
 */
export async function initializeRTLAsync(): Promise<{ locale: SupportedLocale; isRTL: boolean; needsReload: boolean }> {
  console.warn('[rtlInitializer] initializeRTLAsync is deprecated. Use bootstrapLocale() from localeManager.');
  const { bootstrapLocale } = await import('./localeManager');
  const result = await bootstrapLocale();
  return { locale: result.locale, isRTL: result.isRTL, needsReload: result.needsRestart };
}

/**
 * @deprecated Use changeLanguage() from localeManager instead
 */
export async function setLocaleWithRTL(locale: SupportedLocale): Promise<boolean> {
  console.warn('[rtlInitializer] setLocaleWithRTL is deprecated. Use changeLanguage() from localeManager.');
  const { changeLanguage } = await import('./localeManager');
  const result = await changeLanguage(locale);
  return result.needsRestart;
}

/**
 * @deprecated NO LONGER NEEDED - I18nManager handles RTL when initialized correctly
 * 
 * This function used to return TRUE on mobile RTL to trigger manual child swapping.
 * Now that I18nManager is initialized correctly BEFORE first render, this workaround
 * is no longer needed. The function now always returns FALSE.
 */
export function shouldSwapChildrenForRTL(_isRTL: boolean): boolean {
  // NO LONGER NEEDED - I18nManager handles RTL when initialized correctly
  // Keeping this function for backwards compatibility but it always returns false
  return false;
}

/**
 * Sets the document direction on web platform.
 * @deprecated Use applyWebDocumentDirection() from localeManager instead
 */
export function setWebDocumentDirection(locale: SupportedLocale): void {
  applyWebDocumentDirection(locale);
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

  // 'start' and 'end' are logical values - resolve based on RTL state
  if (alignment === 'start') {
    return isRTL ? 'right' : 'left';
  }
  return isRTL ? 'left' : 'right';
}

/**
 * Returns the flex direction for horizontal layouts.
 * 
 * Returns 'row-reverse' for RTL, 'row' for LTR.
 * We use explicit direction instead of relying on I18nManager
 * because it may not work correctly on iOS after language change.
 * 
 * @param isRTL - Whether the current layout is RTL
 * @returns 'row' or 'row-reverse'
 */
export function getFlexDirection(isRTL: boolean = I18nManager.isRTL): 'row' | 'row-reverse' {
  return isRTL ? 'row-reverse' : 'row';
}

/**
 * Gets the current RTL state from I18nManager
 */
export function getCurrentRTLStateFromI18n(): boolean {
  return I18nManager.isRTL;
}

/**
 * Gets the current RTL state
 * @deprecated Use isRTLLocale() or useLanguage().isRTL instead
 */
export function getCurrentRTLState(): boolean {
  return I18nManager.isRTL;
}

/**
 * Create RTL-aware text style
 */
export function createTextStyle(isRTL: boolean, additionalStyles?: any) {
  return {
    
    writingDirection: isRTL ? 'rtl' : 'ltr',
    ...additionalStyles,
  };
}

/**
 * Type for RTL async result
 */
export interface RTLAsyncResult {
  locale: SupportedLocale;
  isRTL: boolean;
  needsReload: boolean;
}
