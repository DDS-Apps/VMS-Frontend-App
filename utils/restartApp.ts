/**
 * App Restart Utility
 * ===================
 * 
 * Provides controlled app restart functionality for RTL direction changes.
 * 
 * PLATFORM BEHAVIOR:
 * - Expo Go (development): Uses DevSettings.reload() or shows alert
 * - Expo (production builds): Uses expo-updates Updates.reloadAsync()
 * - Web: Uses window.location.reload()
 * 
 * IMPORTANT:
 * RTL direction changes on mobile REQUIRE an app restart because I18nManager
 * only applies forceRTL() settings when the JavaScript bundle first loads.
 */

import { Platform, Alert, NativeModules } from 'react-native';
import Constants from 'expo-constants';

/**
 * Check if running in Expo Go (development client)
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Check if running in development mode
 */
function isDevelopment(): boolean {
  return __DEV__ === true;
}

/**
 * Restarts the app
 * 
 * On mobile: Uses appropriate reload method based on environment
 * On web: Reloads the page
 * 
 * @param locale - Current locale for localized alert messages
 */
export async function restartApp(locale: 'en' | 'ar' = 'en'): Promise<void> {
    platform: Platform.OS,
    isExpoGo: isExpoGo(),
    isDev: isDevelopment(),
    locale,
  });
  
  if (Platform.OS === 'web') {
    // Web: Simple page reload
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    return;
  }
  
  const isArabic = locale === 'ar';
  
  // In Expo Go or development mode, expo-updates doesn't work
  // Use DevSettings.reload() instead, or show an alert
  if (isExpoGo() || isDevelopment()) {
    try {
      const DevSettings = NativeModules.DevSettings;
      if (DevSettings?.reload) {
        DevSettings.reload();
        return;
      }
    } catch (error) {
    }
    
    // Fallback: Show alert asking user to manually restart
    Alert.alert(
      isArabic ? 'إعادة التشغيل مطلوبة' : 'Restart Required',
      isArabic
        ? 'يرجى إغلاق التطبيق وإعادة فتحه لتطبيق تغييرات اللغة.'
        : 'Please close and reopen the app to apply language changes.',
      [{ text: isArabic ? 'حسناً' : 'OK' }]
    );
    return;
  }
  
  // Production build: Use expo-updates
  try {
    const Updates = require('expo-updates');
    if (Updates?.reloadAsync) {
      await Updates.reloadAsync();
      return;
    }
    throw new Error('Updates.reloadAsync not available');
  } catch (error) {
    
    // Show alert if reload fails
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
