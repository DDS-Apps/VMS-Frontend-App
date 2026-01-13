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
  I18nManager.allowRTL(true);
  
  if (Platform.OS === 'web') {
    // On web, synchronously read from localStorage to set RTL before first render
    try {
      if (typeof localStorage !== 'undefined') {
        const storedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        const locale = (storedLocale === 'en' || storedLocale === 'ar') 
          ? storedLocale as SupportedLocale 
          : defaultLocale;
        const needsRTL = isRTLLanguage(locale);
        
        console.log('[RTL] initializeRTLSync on web:', { locale, needsRTL });
        
        // Set I18nManager for React Native Web to mirror flexDirection
        I18nManager.forceRTL(needsRTL);
        
        // Also set document direction
        setWebDocumentDirection(locale);
      }
    } catch (error) {
      console.warn('[RTL] Failed to initialize RTL sync on web:', error);
    }
  } else {
    // On mobile (iOS/Android), I18nManager state persists across reloads
    // The actual locale will be determined by initializeRTLAsync after AsyncStorage read
    // But we ensure RTL is allowed from the start
    console.log('[RTL] initializeRTLSync on mobile - RTL allowed, waiting for async init');
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

/**
 * RTL-aware style utilities
 * These helpers return the correct styles based on RTL state
 */

export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type TextAlign = 'left' | 'right' | 'center' | 'auto';
export type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';

/**
 * Returns row or row-reverse based on RTL state
 */
export function getFlexDirection(isRTL: boolean, base: 'row' | 'column' = 'row'): FlexDirection {
  if (base === 'column') return base;
  return isRTL ? 'row-reverse' : 'row';
}

/**
 * Returns appropriate text alignment based on RTL state
 * 'start' -> left in LTR, right in RTL
 * 'end' -> right in LTR, left in RTL
 */
export function getTextAlign(isRTL: boolean, align: 'start' | 'end' | 'center' = 'start'): TextAlign {
  if (align === 'center') return 'center';
  if (align === 'start') return isRTL ? 'right' : 'left';
  return isRTL ? 'left' : 'right'; // 'end'
}

/**
 * Returns appropriate alignment for flex items
 * 'start' -> flex-start in LTR, flex-end in RTL (for row direction)
 */
export function getAlignItems(isRTL: boolean, align: 'start' | 'end' | 'center' = 'start'): AlignItems {
  if (align === 'center') return 'center';
  if (align === 'start') return isRTL ? 'flex-end' : 'flex-start';
  return isRTL ? 'flex-start' : 'flex-end'; // 'end'
}

/**
 * Returns appropriate justification for RTL
 */
export function getJustifyContent(isRTL: boolean, justify: 'start' | 'end' | 'center' | 'between' | 'around' = 'start'): JustifyContent {
  if (justify === 'center') return 'center';
  if (justify === 'between') return 'space-between';
  if (justify === 'around') return 'space-around';
  if (justify === 'start') return isRTL ? 'flex-end' : 'flex-start';
  return isRTL ? 'flex-start' : 'flex-end'; // 'end'
}

/**
 * Common RTL-aware styles object
 */
export function getRTLStyles(isRTL: boolean) {
  return {
    row: { flexDirection: getFlexDirection(isRTL, 'row') as FlexDirection },
    textStart: { textAlign: getTextAlign(isRTL, 'start') as TextAlign },
    textEnd: { textAlign: getTextAlign(isRTL, 'end') as TextAlign },
    textCenter: { textAlign: 'center' as TextAlign },
    alignStart: { alignItems: getAlignItems(isRTL, 'start') as AlignItems },
    alignEnd: { alignItems: getAlignItems(isRTL, 'end') as AlignItems },
    justifyStart: { justifyContent: getJustifyContent(isRTL, 'start') as JustifyContent },
    justifyEnd: { justifyContent: getJustifyContent(isRTL, 'end') as JustifyContent },
    writingDirection: { writingDirection: isRTL ? 'rtl' : 'ltr' as 'rtl' | 'ltr' },
  };
}
