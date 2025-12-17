import { en } from './en';
import { ar } from './ar';
import { TranslationKeys, SupportedLocale } from './types';

export type { TranslationKeys, SupportedLocale };

export const translations: Record<SupportedLocale, TranslationKeys> = {
  en,
  ar,
};

export const defaultLocale: SupportedLocale = 'en';

export const localeConfig: Record<SupportedLocale, { name: string; nativeName: string; isRTL: boolean }> = {
  en: {
    name: 'English',
    nativeName: 'English',
    isRTL: false,
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    isRTL: true,
  },
};

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;

export function getTranslation(locale: SupportedLocale, key: string): string {
  const keys = key.split('.');
  let result: unknown = translations[locale];
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      const fallback = translations[defaultLocale];
      let fallbackResult: unknown = fallback;
      for (const fk of keys) {
        if (fallbackResult && typeof fallbackResult === 'object' && fk in fallbackResult) {
          fallbackResult = (fallbackResult as Record<string, unknown>)[fk];
        } else {
          return key;
        }
      }
      return typeof fallbackResult === 'string' ? fallbackResult : key;
    }
  }
  
  return typeof result === 'string' ? result : key;
}

export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key]?.toString() ?? `{{${key}}}`;
  });
}

export { en, ar };
