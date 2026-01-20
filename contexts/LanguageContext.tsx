/**
 * Language Context
 * ================
 * 
 * Provides app-wide language/locale state and RTL support.
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
import { Platform, Alert, I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import { SupportedLocale, localeConfig, defaultLocale } from '@/constants/i18n';
import {
  loadStoredLocale,
  changeLanguage,
  LANGUAGE_STORAGE_KEY
} from '@/utils/rtl';

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
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutKey, setLayoutKey] = useState<string>('initial-0');

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        console.log('[LanguageContext] Loading stored locale...');
        const result = await loadStoredLocale();

        if (!mounted) return;

        console.log('[LanguageContext] Loaded:', result);

        setLocaleState(result.locale);
        setLayoutKey(`${result.locale}-${result.isRTL ? 'rtl' : 'ltr'}-${++layoutKeyCounter}`);
        setIsLoading(false);

        // If RTL mismatch detected on mobile, restart is needed
        if (result.needsRestart) {
          console.log('[LanguageContext] RTL mismatch, restarting app...');
          setTimeout(async () => {
            try {
              await Updates.reloadAsync();
            } catch (error) {
              console.warn('[LanguageContext] Could not reload:', error);
              Alert.alert(
                'Restart Required',
                'Please restart the app to apply language changes.',
                [{ text: 'OK' }]
              );
            }
          }, 100);
        }
      } catch (error) {
        console.error('[LanguageContext] Init error:', error);
        if (mounted) setIsLoading(false);
      }
    }

    initialize();
    return () => { mounted = false; };
  }, []);

  // Derived values
  const isRTL = localeConfig[locale]?.isRTL ?? false;
  const localeCode: LocaleCode = isRTL ? 'ar-SA' : 'en-US';

  const handleSetLocale = useCallback(async (newLocale: SupportedLocale) => {
    if (newLocale === locale) return;

    console.log('[LanguageContext] Changing locale:', { from: locale, to: newLocale });

    try {
      const needsReload = await changeLanguage(newLocale);

      // Update local state
      const newIsRTL = localeConfig[newLocale]?.isRTL ?? false;
      setLocaleState(newLocale);
      setLayoutKey(`${newLocale}-${newIsRTL ? 'rtl' : 'ltr'}-${++layoutKeyCounter}`);

      if (needsReload) {
        console.log('[LanguageContext] Triggering reload/restart...');

        if (Platform.OS === 'web') {
          window.location.reload();
        } else {
          try {
            await Updates.reloadAsync();
          } catch (error) {
            console.warn('[LanguageContext] Could not reload:', error);
            Alert.alert(
              newLocale === 'ar' ? 'إعادة التشغيل مطلوبة' : 'Restart Required',
              newLocale === 'ar'
                ? 'يرجى إعادة تشغيل التطبيق لتطبيق تغييرات اللغة.'
                : 'Please restart the app to apply language changes.',
              [{ text: newLocale === 'ar' ? 'حسناً' : 'OK' }]
            );
          }
        }
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
