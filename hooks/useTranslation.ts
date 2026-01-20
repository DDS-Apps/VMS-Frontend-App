import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation, interpolate, SupportedLocale, localeConfig } from '@/constants/i18n';

interface UseTranslationReturn {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: SupportedLocale;
  isRTL: boolean;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isChangingLanguage: boolean;
  locales: Array<{ code: SupportedLocale; name: string; nativeName: string; isRTL: boolean }>;
}

export function useTranslation(): UseTranslationReturn {
  const { locale, isRTL, setLocale, isChangingLanguage } = useLanguage();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const translation = getTranslation(locale, key);
      if (params) {
        return interpolate(translation, params);
      }
      return translation;
    },
    [locale]
  );

  const locales = Object.entries(localeConfig).map(([code, config]) => ({
    code: code as SupportedLocale,
    ...config,
  }));

  return {
    t,
    locale,
    isRTL,
    setLocale,
    isChangingLanguage,
    locales,
  };
}

export type { UseTranslationReturn };
