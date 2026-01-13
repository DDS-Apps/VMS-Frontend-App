import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { SupportedLocale, localeConfig, defaultLocale } from '@/constants/i18n';
import { 
  isRTLLanguage, 
  setWebDocumentDirection, 
  applyRTLChange,
  getCurrentRTLState,
  initializeRTLAsync as rtlInitAsync,
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
      // Use the unified RTL async initializer
      const { locale: validLocale, needsReload } = await rtlInitAsync();
      const needsRTL = isRTLLanguage(validLocale);
      
      console.log('[LanguageContext] loadStoredLanguage:', { validLocale, needsRTL, needsReload });
      
      // Sync to raw localStorage on web for sync RTL initialization on next page load
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, validLocale);
      }
      
      // If mobile detected a mismatch between stored locale and I18nManager state,
      // we need to reload the app to apply the RTL change
      if (needsReload && Platform.OS !== 'web') {
        console.log('[LanguageContext] RTL mismatch detected, reloading app...');
        await reloadAppAsync();
        return;
      }
      
      setLocaleState(validLocale);
      setIsRTL(needsRTL);
      setLayoutNonce(prev => prev + 1);
      
      if (Platform.OS === 'web') {
        setWebDocumentDirection(validLocale);
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
      
      console.log('[LanguageContext] setLocale called:', { newLocale, newIsRTL, localeConfigValue: localeConfig[newLocale] });
      
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
      
      // Also write to raw localStorage on web for sync RTL initialization
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
      }
      
      if (Platform.OS === 'web') {
        setWebDocumentDirection(newLocale);
        console.log('[LanguageContext] Web: Setting locale to', newLocale, 'isRTL:', newIsRTL);
        
        // Force full page reload on web to ensure RTL layout is applied correctly
        // This matches the native behavior which requires app reload for RTL changes
        if (typeof window !== 'undefined') {
          console.log('[LanguageContext] Forcing page reload for RTL change on web');
          window.location.reload();
          return;
        }
        
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

  console.log('[LanguageContext] Current state:', { locale, isRTL, layoutKey });
  
  const value: LanguageContextType = {
    locale,
    localeCode,
    isRTL,
    layoutKey,
    setLocale,
    isLoading,
  };
  
  console.log('[LanguageContext] Provider value:', { locale: value.locale, isRTL: value.isRTL, layoutKey: value.layoutKey });

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
