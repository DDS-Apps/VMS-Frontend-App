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

// ============================================================================
// IN-MEMORY LOCALE CACHE (for synchronous access on mobile)
// ============================================================================

/**
 * Global in-memory cache for locale.
 * This is set during async bootstrap and then available for synchronous reads.
 * This solves the problem where I18nManager.isRTL is stale until restart.
 */
let cachedLocale: SupportedLocale | null = null;

/**
 * Sets the cached locale (call after loading from AsyncStorage)
 */
export function setCachedLocale(locale: SupportedLocale): void {
  cachedLocale = locale;
  console.log('🔄 [RTL_DEBUG] setCachedLocale:', locale);
}

/**
 * Gets the cached locale (returns null if not yet set)
 */
export function getCachedLocale(): SupportedLocale | null {
  return cachedLocale;
}

/**
 * Gets the cached locale or falls back to default
 */
export function getCachedLocaleOrDefault(): SupportedLocale {
  return cachedLocale ?? DEFAULT_LOCALE;
}

/**
 * Promise that resolves when async bootstrap is complete
 * This allows App.tsx to wait for the cache to be populated
 * 
 * CRITICAL: Promise is created EAGERLY at module load to avoid race conditions.
 * The resolver is captured immediately, so resolveBootstrapPromise can call it
 * regardless of when it's invoked relative to App.tsx waiting on the promise.
 */
let bootstrapResolve: ((value: { locale: SupportedLocale; isRTL: boolean }) => void) | null = null;

// Create promise eagerly at module load and capture the resolver
const bootstrapPromise: Promise<{ locale: SupportedLocale; isRTL: boolean }> = new Promise((resolve) => {
  bootstrapResolve = resolve;
});

export function getBootstrapPromise(): Promise<{ locale: SupportedLocale; isRTL: boolean }> {
  return bootstrapPromise;
}

export function resolveBootstrapPromise(result: { locale: SupportedLocale; isRTL: boolean }): void {
  if (bootstrapResolve) {
    bootstrapResolve(result);
    bootstrapResolve = null;
  }
  // Note: If resolveBootstrapPromise is called multiple times, only the first call takes effect
  // This is expected - bootstrap should only complete once
}

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
  } catch (error) {
    console.error('[RTL_DEBUG] Error saving locale:', error);
    throw error;
  }
}

/**
 * Applies I18nManager settings for RTL
 * IMPORTANT: This MUST be called before React renders on mobile
 * 
 * NOTE: swapLeftAndRightInRTL is set to FALSE to prevent RN from auto-swapping
 * row <-> row-reverse. DirectionalRow handles this explicitly instead.
 * This prevents double-flip issues and ensures single source of truth.
 */
export function applyI18nManagerSettings(isRTL: boolean): void {
  // Enable RTL support
  I18nManager.allowRTL(true);
  
  // DISABLE automatic row/row-reverse swapping - DirectionalRow handles this
  if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(false);
  }
  
  // Apply the RTL direction (for text, start/end properties, etc.)
  I18nManager.forceRTL(isRTL);
}

/**
 * Applies direction to web document
 * 
 * NOTE: We no longer set document.dir='rtl' because DirectionalRow
 * handles RTL purely via JavaScript (row-reverse). This ensures
 * single source of truth across web and mobile.
 * 
 * We only set document.lang for accessibility.
 */
export function applyWebDocumentDirection(locale: SupportedLocale): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  
  // Only set lang for accessibility, NOT dir
  // DirectionalRow handles RTL via flexDirection: 'row-reverse'
  document.documentElement.lang = locale === 'ar' ? 'ar' : 'en';
  
  console.log('[localeManager] Web document lang set:', document.documentElement.lang);
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
  // Step 1: Enable RTL support immediately
  I18nManager.allowRTL(true);
  // DISABLE auto-swap - DirectionalRow handles row/row-reverse explicitly
  if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(false);
  }
  
  // Step 2: Load stored locale
  const locale = await getStoredLocale();
  
  // Step 2.5: Cache the locale for synchronous access by LanguageContext
  setCachedLocale(locale);
  
  const shouldBeRTL = isRTLLocale(locale);
  const currentlyRTL = I18nManager.isRTL;
  
  // RTL DIAGNOSTIC LOG - Single consolidated log
  console.log('🔄 [RTL_DEBUG] bootstrapLocale:', {
    platform: Platform.OS,
    storedLocale: locale,
    shouldBeRTL,
    currentlyRTL,
    mismatch: shouldBeRTL !== currentlyRTL,
  });
  
  // Step 3: Check if direction change is needed
  const directionMismatch = shouldBeRTL !== currentlyRTL;
  
  if (Platform.OS === 'web') {
    // Web: Apply direction immediately (no restart needed, just reload)
    I18nManager.forceRTL(shouldBeRTL);
    applyWebDocumentDirection(locale);
    return { locale, isRTL: shouldBeRTL, needsRestart: false };
  }
  
  // Mobile: If direction mismatch, apply and signal restart
  if (directionMismatch) {
    I18nManager.forceRTL(shouldBeRTL);
    return { locale, isRTL: shouldBeRTL, needsRestart: true };
  }
  
  return { locale, isRTL: currentlyRTL, needsRestart: false };
}

/**
 * Synchronous bootstrap for web (can be called in index.js before async code)
 * 
 * On web, reads from localStorage synchronously
 * On mobile, uses cached locale if available, otherwise falls back to I18nManager.isRTL
 */
export function bootstrapLocaleSync(): { locale: SupportedLocale; isRTL: boolean } {
  // Enable RTL support immediately
  I18nManager.allowRTL(true);
  // DISABLE auto-swap - DirectionalRow handles row/row-reverse explicitly
  if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(false);
  }
  
  if (Platform.OS === 'web') {
    // Web: Read from localStorage and apply immediately
    const locale = getStoredLocaleSync();
    const isRTL = isRTLLocale(locale);
    
    I18nManager.forceRTL(isRTL);
    applyWebDocumentDirection(locale);
    return { locale, isRTL };
  }
  
  // Mobile: Use cached locale if available (set by async bootstrap)
  // This allows LanguageContext to get the correct locale even before restart
  const cached = getCachedLocale();
  if (cached !== null) {
    const isRTL = isRTLLocale(cached);
    console.log('🔄 [RTL_DEBUG] bootstrapLocaleSync (mobile, cached):', { locale: cached, isRTL });
    return { locale: cached, isRTL };
  }
  
  // Fallback: Derive from current I18nManager state (stale until restart)
  const isRTL = I18nManager.isRTL;
  const locale = isRTL ? 'ar' : 'en';
  
  console.log('🔄 [RTL_DEBUG] bootstrapLocaleSync (mobile, fallback):', { locale, isRTL });
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
  
  console.log('🔄 [RTL_DEBUG] changeLanguage:', { 
    from: currentIsRTL ? 'ar' : 'en', 
    to: newLocale,
    directionChanged 
  });
  
  // Save the new locale and update the in-memory cache
  await saveLocale(newLocale);
  setCachedLocale(newLocale);
  
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
