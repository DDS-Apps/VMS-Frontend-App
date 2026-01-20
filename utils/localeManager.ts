/**
 * Locale Manager - Single Source of Truth for RTL/LTR
 * =====================================================
 * 
 * This module provides unified language/direction handling across Web, iOS, and Android.
 * 
 * KEY PRINCIPLES:
 * ===============
 * 1. Language is the SINGLE SOURCE OF TRUTH (ar = RTL, en = LTR)
 * 2. Direction is DERIVED from language, never stored separately
 * 3. RTL must be applied BEFORE first render on all platforms
 * 4. Direction changes require app restart on mobile
 * 
 * PLATFORM BEHAVIOR:
 * ==================
 * - Web: Set document.documentElement.dir/lang + I18nManager.forceRTL()
 * - Mobile: I18nManager.forceRTL() + app restart when direction changes
 * 
 * USAGE:
 * ======
 * // In index.js (before registerRootComponent):
 * import { bootstrapLocale } from '@/utils/localeManager';
 * const { needsRestart } = await bootstrapLocale();
 * if (needsRestart) { restartApp(); return; }
 * 
 * // In components:
 * import { useLanguage } from '@/contexts/LanguageContext';
 * const { locale, isRTL, setLocale } = useLanguage();
 */

import { Platform, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type SupportedLocale = 'en' | 'ar';

export const LANGUAGE_STORAGE_KEY = '@vms_language';
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_CONFIG: Record<SupportedLocale, { isRTL: boolean; name: string; nativeName: string }> = {
  en: { isRTL: false, name: 'English', nativeName: 'English' },
  ar: { isRTL: true, name: 'Arabic', nativeName: 'العربية' },
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Derives RTL state from locale
 */
export function isRTLLocale(locale: SupportedLocale): boolean {
  return LOCALE_CONFIG[locale]?.isRTL ?? false;
}

/**
 * Gets current I18nManager RTL state
 */
export function getCurrentI18nRTL(): boolean {
  return I18nManager.isRTL;
}

/**
 * Reads stored locale from AsyncStorage (async)
 */
export async function getStoredLocale(): Promise<SupportedLocale> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') {
      return stored;
    }
  } catch (error) {
    console.error('[LocaleManager] Error reading stored locale:', error);
  }
  return DEFAULT_LOCALE;
}

/**
 * Reads stored locale from localStorage (sync, web only)
 */
export function getStoredLocaleSync(): SupportedLocale {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
    return DEFAULT_LOCALE;
  }
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') {
      return stored;
    }
  } catch (error) {
    console.warn('[LocaleManager] Error reading localStorage:', error);
  }
  return DEFAULT_LOCALE;
}

/**
 * Saves locale to storage
 */
export async function saveLocale(locale: SupportedLocale): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    
    // Also save to localStorage on web for sync access
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    }
    
    console.log('[LocaleManager] Saved locale:', locale);
  } catch (error) {
    console.error('[LocaleManager] Error saving locale:', error);
    throw error;
  }
}

/**
 * Applies I18nManager settings for RTL
 * IMPORTANT: This MUST be called before React renders on mobile
 */
export function applyI18nManagerSettings(isRTL: boolean): void {
  console.log('[LocaleManager] Applying I18nManager settings, isRTL:', isRTL);
  
  // Enable RTL support
  I18nManager.allowRTL(true);
  
  // Enable automatic left/right property swapping
  if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(true);
  }
  
  // Apply the RTL direction
  I18nManager.forceRTL(isRTL);
}

/**
 * Applies direction to web document
 */
export function applyWebDocumentDirection(locale: SupportedLocale): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  
  const isRTL = isRTLLocale(locale);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = locale === 'ar' ? 'ar' : 'en';
  
  console.log('[LocaleManager] Applied web document direction:', { 
    dir: document.documentElement.dir, 
    lang: document.documentElement.lang 
  });
}

// ============================================================================
// BOOTSTRAP (Call ONCE at app startup before React renders)
// ============================================================================

export interface BootstrapResult {
  locale: SupportedLocale;
  isRTL: boolean;
  needsRestart: boolean;
}

/**
 * Bootstrap locale and RTL settings
 * 
 * MUST be called before registerRootComponent() in index.js
 * 
 * Returns { locale, isRTL, needsRestart }
 * - If needsRestart is true, app must restart before rendering
 */
export async function bootstrapLocale(): Promise<BootstrapResult> {
  console.log('[LocaleManager] Bootstrap starting...');
  console.log('[LocaleManager] Platform:', Platform.OS);
  console.log('[LocaleManager] Current I18nManager.isRTL:', I18nManager.isRTL);
  
  // Step 1: Enable RTL support immediately
  I18nManager.allowRTL(true);
  if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(true);
  }
  
  // Step 2: Load stored locale
  const locale = await getStoredLocale();
  const shouldBeRTL = isRTLLocale(locale);
  const currentlyRTL = I18nManager.isRTL;
  
  console.log('[LocaleManager] Stored locale:', locale);
  console.log('[LocaleManager] Should be RTL:', shouldBeRTL);
  console.log('[LocaleManager] Currently RTL:', currentlyRTL);
  
  // Step 3: Check if direction change is needed
  const directionMismatch = shouldBeRTL !== currentlyRTL;
  
  if (Platform.OS === 'web') {
    // Web: Apply direction immediately (no restart needed, just reload)
    I18nManager.forceRTL(shouldBeRTL);
    applyWebDocumentDirection(locale);
    
    console.log('[LocaleManager] Web bootstrap complete');
    return { locale, isRTL: shouldBeRTL, needsRestart: false };
  }
  
  // Mobile: If direction mismatch, apply and signal restart
  if (directionMismatch) {
    console.log('[LocaleManager] Direction mismatch detected, applying forceRTL and signaling restart');
    I18nManager.forceRTL(shouldBeRTL);
    
    return { locale, isRTL: shouldBeRTL, needsRestart: true };
  }
  
  console.log('[LocaleManager] Mobile bootstrap complete, no restart needed');
  return { locale, isRTL: currentlyRTL, needsRestart: false };
}

/**
 * Synchronous bootstrap for web (can be called in index.js before async code)
 * 
 * On web, reads from localStorage synchronously
 * On mobile, just enables RTL support (full bootstrap must be async)
 */
export function bootstrapLocaleSync(): { locale: SupportedLocale; isRTL: boolean } {
  console.log('[LocaleManager] Sync bootstrap starting...');
  
  // Enable RTL support immediately
  I18nManager.allowRTL(true);
  if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(true);
  }
  
  if (Platform.OS === 'web') {
    // Web: Read from localStorage and apply immediately
    const locale = getStoredLocaleSync();
    const isRTL = isRTLLocale(locale);
    
    I18nManager.forceRTL(isRTL);
    applyWebDocumentDirection(locale);
    
    console.log('[LocaleManager] Web sync bootstrap complete:', { locale, isRTL });
    return { locale, isRTL };
  }
  
  // Mobile: Just return current state, full bootstrap will be async
  const isRTL = I18nManager.isRTL;
  const locale = isRTL ? 'ar' : 'en'; // Derive from current I18nManager state
  
  console.log('[LocaleManager] Mobile sync bootstrap complete:', { locale, isRTL });
  return { locale, isRTL };
}

// ============================================================================
// LANGUAGE CHANGE (Call when user changes language)
// ============================================================================

export interface ChangeLanguageResult {
  locale: SupportedLocale;
  isRTL: boolean;
  needsRestart: boolean;
}

/**
 * Changes the app language
 * 
 * Returns { locale, isRTL, needsRestart }
 * - If needsRestart is true on mobile, app must restart
 * - If needsRestart is true on web, page must reload
 */
export async function changeLanguage(newLocale: SupportedLocale): Promise<ChangeLanguageResult> {
  const newIsRTL = isRTLLocale(newLocale);
  const currentIsRTL = I18nManager.isRTL;
  const directionChanged = newIsRTL !== currentIsRTL;
  
  console.log('[LocaleManager] Changing language:', { 
    from: currentIsRTL ? 'ar' : 'en', 
    to: newLocale,
    directionChanged 
  });
  
  // Save the new locale
  await saveLocale(newLocale);
  
  if (Platform.OS === 'web') {
    // Web: Apply immediately
    I18nManager.forceRTL(newIsRTL);
    applyWebDocumentDirection(newLocale);
    
    // Return needsRestart=true if direction changed (caller should reload page)
    return { locale: newLocale, isRTL: newIsRTL, needsRestart: directionChanged };
  }
  
  // Mobile: Apply forceRTL if direction changed
  if (directionChanged) {
    I18nManager.forceRTL(newIsRTL);
    return { locale: newLocale, isRTL: newIsRTL, needsRestart: true };
  }
  
  return { locale: newLocale, isRTL: newIsRTL, needsRestart: false };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  LANGUAGE_STORAGE_KEY,
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  isRTLLocale,
  getCurrentI18nRTL,
  getStoredLocale,
  getStoredLocaleSync,
  saveLocale,
  applyI18nManagerSettings,
  applyWebDocumentDirection,
  bootstrapLocale,
  bootstrapLocaleSync,
  changeLanguage,
};
