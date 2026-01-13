import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
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
  layoutKey: string;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const [isRTL, setIsRTL] = useState<boolean>(localeConfig[defaultLocale].isRTL);
  const [layoutNonce, setLayoutNonce] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const localeCode: LocaleCode = isRTL ? 'ar-SA' : 'en-US';
  const layoutKey = `${locale}-${isRTL ? 'rtl' : 'ltr'}-${layoutNonce}`;

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
        const needsRTL = isRTLLanguage(validLocale);
        
        setLocaleState(validLocale);
        setIsRTL(needsRTL);
        setLayoutNonce(prev => prev + 1);
        
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
      const newIsRTL = localeConfig[newLocale].isRTL;
      
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
      
      if (Platform.OS === 'web') {
        setWebDocumentDirection(newLocale);
        setLocaleState(newLocale);
        setIsRTL(newIsRTL);
        setLayoutNonce(prev => prev + 1);
        return;
      }
      
      const currentRTL = getCurrentRTLState();
      const needsReload = applyRTLChange(newLocale, currentRTL);
      
      if (needsReload) {
        await reloadAppAsync();
        return;
      }
      
      setLocaleState(newLocale);
      setIsRTL(newIsRTL);
      setLayoutNonce(prev => prev + 1);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, []);

  const value = useMemo<LanguageContextType>(() => ({
    locale,
    localeCode,
    isRTL,
    layoutKey,
    setLocale,
    isLoading,
  }), [locale, localeCode, isRTL, layoutKey, setLocale, isLoading]);

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
