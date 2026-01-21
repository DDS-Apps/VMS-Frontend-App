/**
 * App Entry Point
 * ================
 * 
 * CRITICAL: registerRootComponent MUST be called synchronously at module level!
 * Calling it inside async functions causes crashes on iOS and stuck splash on Android.
 * 
 * RTL Bootstrap Strategy:
 * 1. Synchronous bootstrap runs immediately (sets I18nManager.forceRTL)
 * 2. App registers synchronously with registerRootComponent
 * 3. Async bootstrap runs after to check if restart is needed
 * 
 * SINGLE SOURCE OF TRUTH:
 * - Language (en/ar) is stored in AsyncStorage
 * - Direction (RTL/LTR) is DERIVED from language
 * - localeManager handles all RTL logic for Web + Mobile
 */

import { registerRootComponent } from "expo";
import { I18nManager } from "react-native";
import { bootstrapLocaleSync, bootstrapLocale } from "@/utils/localeManager";
import { restartApp } from "@/utils/restartApp";

// Step 1: Synchronous bootstrap (enables RTL, applies web direction)
// This runs immediately before React renders
const syncResult = bootstrapLocaleSync();
console.log('[RTL DEBUG] index.js: Sync bootstrap result', {
  locale: syncResult.locale,
  isRTL: syncResult.isRTL,
  i18nManagerIsRTL: I18nManager.isRTL,
});

// Step 2: Import and register App SYNCHRONOUSLY
// This is critical - Expo requires synchronous registration
import App from "@/App";
registerRootComponent(App);

// Step 3: Run async bootstrap AFTER registration to check for direction mismatch
// The bootstrap populates the cache and signals App.tsx when ready
// If restart is needed, it will trigger - the app has already started rendering
// but the restart will happen before user sees anything meaningful
import { resolveBootstrapPromise } from "@/utils/localeManager";

(async function checkRTLRestart() {
  try {
    const result = await bootstrapLocale();
    console.log('[RTL DEBUG] index.js: Async bootstrap result', {
      locale: result.locale,
      isRTL: result.isRTL,
      needsRestart: result.needsRestart,
      i18nManagerIsRTL: I18nManager.isRTL,
    });
    
    // Signal App.tsx that bootstrap is complete and cache is populated
    resolveBootstrapPromise({ locale: result.locale, isRTL: result.isRTL });
    
    if (result.needsRestart) {
      await restartApp(result.locale);
    }
  } catch (error) {
    // Resolve with fallback so App.tsx doesn't hang
    resolveBootstrapPromise({ locale: 'en', isRTL: false });
  }
})();
