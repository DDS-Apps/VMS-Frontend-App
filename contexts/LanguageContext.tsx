/**
 * Language Context
 * ================
 * 
 * Provides app-wide language/locale state and RTL support.
 * 
 * SINGLE SOURCE OF TRUTH:
 * - Language (en/ar) is the single source of truth
 * - isRTL is DERIVED from language (ar = RTL, en = LTR)
 * - Uses localeManager for all RTL logic
 * 
 * Usage:
 *   const { locale, isRTL, setLocale } = useLanguage();
 * 
 * RTL HANDLING:
 * - isRTL reflects the current RTL state based on locale
 * - When locale changes between LTR/RTL, app restart is required (mobile)
 * - On web, page reload is required
 * - layoutKey changes when locale changes - use as key prop to force re-render
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform, I18nManager } from 'react-native';
import {
  SupportedLocale,
  DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  isRTLLocale,
  getStoredLocale,
  getStoredLocaleSync,
  changeLanguage as localeManagerChangeLanguage,
} from '@/utils/localeManager';
import { restartApp } from '@/utils/restartApp';

export type LocaleCode = 'ar-SA' | 'en-US';

interface LanguageContextType {
  locale: SupportedLocale;
  localeCode: LocaleCode;
  isRTL: boolean;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isLoading: boolean;
  layoutKey: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

let layoutKeyCounter = 0;

export function LanguageProvider({ children }: LanguageProviderProps) {
  // On web, use sync localStorage read for accurate initial state
  // On mobile, use I18nManager.isRTL which is set by bootstrap
  const getInitialLocale = (): SupportedLocale => {
    if (Platform.OS === 'web') {
      return getStoredLocaleSync();
    }
    return I18nManager.isRTL ? 'ar' : 'en';
  };
  
  const initialLocale = getInitialLocale();
  const initialIsRTL = isRTLLocale(initialLocale);
  
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutKey, setLayoutKey] = useState<string>(`${initialLocale}-${initialIsRTL ? 'rtl' : 'ltr'}-0`);

  // Verify locale matches stored preference on mount
  useEffect(() => {
    let mounted = true;

    async function verifyLocale() {
      try {
        console.log('[LanguageContext] Verifying locale...');
        console.log('[LanguageContext] Initial state:', { locale, isRTL: initialIsRTL });
        
        const storedLocale = await getStoredLocale();
        console.log('[LanguageContext] Stored locale:', storedLocale);

        if (!mounted) return;

        // Update state if stored locale differs from initial
        // (This shouldn't happen if bootstrap worked correctly)
        if (storedLocale !== locale) {
          console.log('[LanguageContext] Locale mismatch, updating state:', { 
            from: locale, 
            to: storedLocale 
          });
          setLocaleState(storedLocale);
          const storedIsRTL = isRTLLocale(storedLocale);
          setLayoutKey(`${storedLocale}-${storedIsRTL ? 'rtl' : 'ltr'}-${++layoutKeyCounter}`);
          
          // If direction also mismatches, something went wrong with bootstrap
          // This is a failsafe - restart the app
          if (storedIsRTL !== I18nManager.isRTL && Platform.OS !== 'web') {
            console.warn('[LanguageContext] Direction mismatch after bootstrap, restarting...');
            await restartApp(storedLocale);
            return;
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('[LanguageContext] Verify error:', error);
        if (mounted) setIsLoading(false);
      }
    }

    verifyLocale();
    return () => { mounted = false; };
  }, []);

  // Derived values - isRTL is DERIVED from locale
  const isRTL = isRTLLocale(locale);
  const localeCode: LocaleCode = isRTL ? 'ar-SA' : 'en-US';

  const handleSetLocale = useCallback(async (newLocale: SupportedLocale) => {
    if (newLocale === locale) return;

    console.log('[LanguageContext] Changing locale:', { from: locale, to: newLocale });

    try {
      // Use localeManager to change language
      const result = await localeManagerChangeLanguage(newLocale);
      console.log('[LanguageContext] Change result:', result);

      // Update local state
      setLocaleState(newLocale);
      setLayoutKey(`${newLocale}-${result.isRTL ? 'rtl' : 'ltr'}-${++layoutKeyCounter}`);

      // If restart/reload is needed, trigger it
      if (result.needsRestart) {
        console.log('[LanguageContext] Triggering restart/reload...');
        await restartApp(newLocale);
      }
    } catch (error) {
      console.error('[LanguageContext] Error changing locale:', error);
    }
  }, [locale]);

  const value: LanguageContextType = {
    locale,
    localeCode,
    isRTL,
    setLocale: handleSetLocale,
    isLoading,
    layoutKey,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { LanguageContext, LANGUAGE_STORAGE_KEY };
