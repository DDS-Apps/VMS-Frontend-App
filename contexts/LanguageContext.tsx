import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { SupportedLocale, localeConfig, defaultLocale } from '@/constants/i18n';
import { 
  isRTLLanguage, 
  setWebDocumentDirection, 
  applyRTLChange,
  getCurrentRTLState 
} from '@/utils/rtlInitializer';

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
  
  console.log('[LanguageProvider] render - locale:', locale, 'isRTL:', isRTL, 'localeConfig[locale]:', localeConfig[locale]);

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setWebDocumentDirection(locale);
    }
  }, [locale]);

  const loadStoredLanguage = async () => {
    try {
      const storedLocale = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLocale && (storedLocale === 'en' || storedLocale === 'ar')) {
        const validLocale = storedLocale as SupportedLocale;
        setLocaleState(validLocale);
        
        const needsRTL = isRTLLanguage(validLocale);
        const currentRTL = getCurrentRTLState();
        
        if (Platform.OS === 'web') {
          setWebDocumentDirection(validLocale);
        } else if (currentRTL !== needsRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(needsRTL);
        }
      } else {
        if (Platform.OS === 'web') {
          setWebDocumentDirection(defaultLocale);
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
      console.log('[LanguageContext] setLocale called with:', newLocale);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
      
      // For web, always update state and document direction
      if (Platform.OS === 'web') {
        console.log('[LanguageContext] Web platform - updating state and document direction');
        setWebDocumentDirection(newLocale);
        setLocaleState(newLocale);
        console.log('[LanguageContext] Web: setLocaleState completed with:', newLocale);
        return;
      }
      
      // For native, check if RTL direction change requires reload
      const currentRTL = getCurrentRTLState();
      console.log('[LanguageContext] Native: currentRTL:', currentRTL);
      const needsReload = applyRTLChange(newLocale, currentRTL);
      console.log('[LanguageContext] Native: needsReload:', needsReload);
      
      if (needsReload) {
        console.log('[LanguageContext] RTL direction changed, reloading app...');
        await reloadAppAsync();
        return;
      }
      
      console.log('[LanguageContext] Native: Calling setLocaleState with:', newLocale);
      setLocaleState(newLocale);
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
