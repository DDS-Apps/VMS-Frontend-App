/**
 * App Entry Point
 * ================
 * 
 * CRITICAL: RTL/Locale bootstrap MUST happen before React renders!
 * 
 * This entry point uses a bootstrap pattern to ensure:
 * 1. Language preference is loaded
 * 2. I18nManager direction is applied (forceRTL)
 * 3. App restarts if direction changed (mobile only)
 * 4. App only renders after bootstrap completes
 * 
 * SINGLE SOURCE OF TRUTH:
 * - Language (en/ar) is stored in AsyncStorage
 * - Direction (RTL/LTR) is DERIVED from language
 * - localeManager handles all RTL logic for Web + Mobile
 */

import { registerRootComponent } from "expo";
import { Platform, AppRegistry } from "react-native";
import { bootstrapLocaleSync, bootstrapLocale } from "@/utils/localeManager";
import { restartApp } from "@/utils/restartApp";

// Step 1: Synchronous bootstrap (enables RTL, applies web direction)
// This runs immediately before any async code
const syncResult = bootstrapLocaleSync();
console.log('[index.js] Sync bootstrap result:', syncResult);

// Step 2: Async bootstrap to check if restart is needed (mobile)
async function startApp() {
  try {
    // Full async bootstrap - loads stored locale and checks for direction mismatch
    const result = await bootstrapLocale();
    console.log('[index.js] Async bootstrap result:', result);
    
    if (result.needsRestart) {
      console.log('[index.js] Direction mismatch detected, restarting app...');
      // Restart immediately - don't render the app in wrong direction
      await restartApp(result.locale);
      return; // App will restart, don't continue
    }
    
    // Step 3: Direction is correct, now render the app
    console.log('[index.js] Bootstrap complete, rendering app...');
    const App = require("@/App").default;
    registerRootComponent(App);
    
  } catch (error) {
    console.error('[index.js] Bootstrap error:', error);
    // Fallback: render app anyway to avoid blank screen
    const App = require("@/App").default;
    registerRootComponent(App);
  }
}

// Start the bootstrap process
startApp();
