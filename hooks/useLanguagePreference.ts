import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SupportedLocale } from '@/utils/localeManager';

/**
 * Web updates its UI immediately instead of reloading into a stale cached
 * profile. Native persists the profile first because changing direction
 * restarts the application.
 */
export function useLanguagePreference() {
  const { locale, setLocale } = useLanguage();
  const { updateLanguagePreference } = useAuth();
  const pending = useRef(false);

  return useCallback(async (next: SupportedLocale) => {
    if (pending.current || next === locale) return;
    pending.current = true;
    try {
      if (Platform.OS === 'web') {
        await setLocale(next);
        try {
          await updateLanguagePreference(next);
        } catch (error) {
          await setLocale(locale);
          throw error;
        }
      } else {
        await updateLanguagePreference(next);
        await setLocale(next);
      }
    } finally {
      pending.current = false;
    }
  }, [locale, setLocale, updateLanguagePreference]);
}