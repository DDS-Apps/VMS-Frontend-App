import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLocale, localeConfig, defaultLocale } from '@/constants/i18n';

const LANGUAGE_STORAGE_KEY = '@vms_language';

export type LocaleCode = 'ar-SA' | 'en-US';

interface LanguageContextType {
  locale: SupportedLocale;
  localeCode: LocaleCode;
  isRTL: boolean;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const [isLoading, setIsLoading] = useState(true);

  const isRTL = localeConfig[locale].isRTL;
  const localeCode: LocaleCode = isRTL ? 'ar-SA' : 'en-US';

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  const loadStoredLanguage = async () => {
    try {
      const storedLocale = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLocale && (storedLocale === 'en' || storedLocale === 'ar')) {
        setLocaleState(storedLocale as SupportedLocale);
        const needsRTL = localeConfig[storedLocale as SupportedLocale].isRTL;
        if (I18nManager.isRTL !== needsRTL) {
          I18nManager.allowRTL(needsRTL);
          I18nManager.forceRTL(needsRTL);
        }
      }
    } catch (error) {
      console.warn('Failed to load stored language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
      setLocaleState(newLocale);
      
      const needsRTL = localeConfig[newLocale].isRTL;
      I18nManager.allowRTL(needsRTL);
      I18nManager.forceRTL(needsRTL);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, []);

  const value: LanguageContextType = {
    locale,
    localeCode,
    isRTL,
    setLocale,
    isLoading,
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

export { LanguageContext };
