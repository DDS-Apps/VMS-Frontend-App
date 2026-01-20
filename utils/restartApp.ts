/**
 * App Restart Utility
 * ===================
 * 
 * Provides controlled app restart functionality for RTL direction changes.
 * 
 * PLATFORM BEHAVIOR:
 * - Expo (managed workflow): Uses expo-updates Updates.reloadAsync()
 * - Web: Uses window.location.reload()
 * - Bare RN (if needed): Would use react-native-restart
 * 
 * IMPORTANT:
 * RTL direction changes on mobile REQUIRE an app restart because I18nManager
 * only applies forceRTL() settings when the JavaScript bundle first loads.
 */

import { Platform, Alert } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Restarts the app
 * 
 * On mobile: Uses Expo Updates to reload the app
 * On web: Reloads the page
 * 
 * @param locale - Current locale for localized alert messages
 */
export async function restartApp(locale: 'en' | 'ar' = 'en'): Promise<void> {
  console.log('[RestartApp] Initiating restart...');
  
  if (Platform.OS === 'web') {
    // Web: Simple page reload
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    return;
  }
  
  // Mobile: Use Expo Updates
  try {
    await Updates.reloadAsync();
  } catch (error) {
    console.error('[RestartApp] Failed to reload:', error);
    
    // Show alert if reload fails
    const isArabic = locale === 'ar';
    Alert.alert(
      isArabic ? 'إعادة التشغيل مطلوبة' : 'Restart Required',
      isArabic
        ? 'يرجى إغلاق التطبيق وإعادة فتحه لتطبيق تغييرات اللغة.'
        : 'Please close and reopen the app to apply language changes.',
      [{ text: isArabic ? 'حسناً' : 'OK' }]
    );
  }
}

/**
 * Restarts the app after a short delay
 * 
 * Useful when you want to show a brief message before restart
 * 
 * @param delayMs - Delay in milliseconds before restart (default: 100ms)
 * @param locale - Current locale for localized alert messages
 */
export async function restartAppWithDelay(delayMs: number = 100, locale: 'en' | 'ar' = 'en'): Promise<void> {
  console.log('[RestartApp] Scheduling restart in', delayMs, 'ms');
  
  return new Promise((resolve) => {
    setTimeout(async () => {
      await restartApp(locale);
      resolve();
    }, delayMs);
  });
}

/**
 * Shows a confirmation dialog before restarting
 * 
 * @param locale - Current locale for localized messages
 * @param onCancel - Optional callback if user cancels
 */
export function confirmAndRestart(
  locale: 'en' | 'ar' = 'en',
  onCancel?: () => void
): void {
  const isArabic = locale === 'ar';
  
  if (Platform.OS === 'web') {
    // Web: Just reload (no need for confirmation)
    restartApp(locale);
    return;
  }
  
  Alert.alert(
    isArabic ? 'تغيير اللغة' : 'Language Change',
    isArabic
      ? 'سيتم إعادة تشغيل التطبيق لتطبيق اللغة الجديدة.'
      : 'The app will restart to apply the new language.',
    [
      {
        text: isArabic ? 'إلغاء' : 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: isArabic ? 'إعادة التشغيل' : 'Restart',
        onPress: () => restartApp(locale),
      },
    ]
  );
}

export default {
  restartApp,
  restartAppWithDelay,
  confirmAndRestart,
};
