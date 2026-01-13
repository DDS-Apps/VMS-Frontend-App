import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localeConfig, defaultLocale, SupportedLocale } from '@/constants/i18n';

const LANGUAGE_STORAGE_KEY = '@vms_language';

export function isRTLLanguage(locale: SupportedLocale): boolean {
  return localeConfig[locale]?.isRTL ?? false;
}

export function getDirection(locale: SupportedLocale): 'rtl' | 'ltr' {
  return isRTLLanguage(locale) ? 'rtl' : 'ltr';
}

export function setWebDocumentDirection(locale: SupportedLocale): void {
  if (Platform.OS !== 'web') return;
  
  try {
    const direction = getDirection(locale);
    const lang = locale === 'ar' ? 'ar' : 'en';
    
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = lang;
      document.body.dir = direction;
    }
  } catch (error) {
    console.warn('[RTL] Failed to set web document direction:', error);
  }
}

export async function initializeRTLAsync(): Promise<SupportedLocale> {
  try {
    const storedLocale = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const locale = (storedLocale === 'en' || storedLocale === 'ar') 
      ? storedLocale as SupportedLocale 
      : defaultLocale;
    
    const needsRTL = isRTLLanguage(locale);
    
    if (Platform.OS === 'web') {
      setWebDocumentDirection(locale);
    } else {
      I18nManager.allowRTL(true);
      
      if (I18nManager.isRTL !== needsRTL) {
        I18nManager.forceRTL(needsRTL);
      }
    }
    
    return locale;
  } catch (error) {
    console.warn('[RTL] Failed to initialize RTL:', error);
    return defaultLocale;
  }
}

export function initializeRTLSync(): void {
  if (Platform.OS !== 'web') {
    I18nManager.allowRTL(true);
  }
}

export function applyRTLChange(newLocale: SupportedLocale, currentIsRTL: boolean): boolean {
  const needsRTL = isRTLLanguage(newLocale);
  
  if (Platform.OS === 'web') {
    setWebDocumentDirection(newLocale);
    return false;
  }
  
  if (currentIsRTL !== needsRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(needsRTL);
    return true;
  }
  
  return false;
}

export function getCurrentRTLState(): boolean {
  if (Platform.OS === 'web') {
    try {
      return typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    } catch {
      return false;
    }
  }
  return I18nManager.isRTL;
}
