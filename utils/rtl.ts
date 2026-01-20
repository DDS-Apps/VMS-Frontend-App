/**
 * RTL (Right-to-Left) Layout Utilities
 * =====================================
 * 
 * THE SIMPLE SOLUTION:
 * ====================
 * Always use flexDirection: 'row'. I18nManager handles RTL on ALL platforms
 * when initialized correctly before first render.
 * 
 * MOBILE (iOS/Android):
 * - I18nManager.forceRTL(true) flips the ENTIRE layout system
 * - flexDirection: 'row' automatically appears as right-to-left
 * - marginStart/paddingEnd automatically swap sides
 * - REQUIRES app restart to apply changes
 * 
 * WEB (React Native Web):
 * - I18nManager.forceRTL(true) + document.dir='rtl'
 * - React Native Web respects I18nManager when initialized early
 * - flexDirection: 'row' works correctly
 * 
 * DON'Ts:
 * =======
 * ❌ Never use flexDirection: 'row-reverse' for RTL
 * ❌ Never call I18nManager.forceRTL() in components
 * ❌ Never swap children manually
 */

import { Platform, I18nManager, ViewStyle, TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLocale, defaultLocale, localeConfig } from '@/constants/i18n';

// ============================================================================
// CONSTANTS
// ============================================================================

export const LANGUAGE_STORAGE_KEY = '@vms_language';

// ============================================================================
// INITIALIZATION (Call once at app startup in index.js)
// ============================================================================

/**
 * Synchronous RTL initialization - MUST be called BEFORE registerRootComponent()
 * 
 * This is THE critical step. If called too late, RTL won't work properly.
 */
export function initializeRTL(): void {
    console.log('[RTL] Initializing, Platform:', Platform.OS);

    // Step 1: Enable RTL support
    I18nManager.allowRTL(true);

    // Step 2: Enable automatic left/right property swapping
    if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
        I18nManager.swapLeftAndRightInRTL(true);
    }

    // Step 3: Set RTL state based on stored preference
    if (Platform.OS === 'web') {
        // Web: Must read synchronously from localStorage
        try {
            const stored = typeof localStorage !== 'undefined'
                ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
                : null;
            const isArabic = stored === 'ar';

            I18nManager.forceRTL(isArabic);

            // Also set document direction for CSS
            if (typeof document !== 'undefined') {
                document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = isArabic ? 'ar' : 'en';
            }

            console.log('[RTL] Web initialized, isRTL:', isArabic);
        } catch (e) {
            console.warn('[RTL] Web init error:', e);
        }
    } else {
        // Mobile: I18nManager state persists across app launches
        // Just log the current state - it's already set from previous forceRTL call
        console.log('[RTL] Mobile initialized, I18nManager.isRTL:', I18nManager.isRTL);
    }
}

/**
 * Async initialization for LanguageContext - loads stored preference
 */
export async function loadStoredLocale(): Promise<{
    locale: SupportedLocale;
    isRTL: boolean;
    needsRestart: boolean;
}> {
    try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const locale = (stored === 'ar' || stored === 'en') ? stored : defaultLocale;
        const shouldBeRTL = locale === 'ar';
        const currentlyRTL = I18nManager.isRTL;

        // Check if restart is needed (stored preference differs from current state)
        const needsRestart = shouldBeRTL !== currentlyRTL && Platform.OS !== 'web';

        if (needsRestart) {
            // Apply the change - will take effect after restart
            I18nManager.forceRTL(shouldBeRTL);
        }

        return { locale, isRTL: shouldBeRTL, needsRestart };
    } catch (e) {
        console.error('[RTL] loadStoredLocale error:', e);
        return { locale: defaultLocale, isRTL: false, needsRestart: false };
    }
}

/**
 * Change language and apply RTL settings
 * Returns true if app restart is required
 */
export async function changeLanguage(newLocale: SupportedLocale): Promise<boolean> {
    const newIsRTL = newLocale === 'ar';
    const currentIsRTL = I18nManager.isRTL;

    // Save preference
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);

    if (Platform.OS === 'web') {
        // Web: Also save to localStorage for sync access
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
        }
        // Web can apply immediately with page reload
        I18nManager.forceRTL(newIsRTL);
        if (typeof document !== 'undefined') {
            document.documentElement.dir = newIsRTL ? 'rtl' : 'ltr';
            document.documentElement.lang = newIsRTL ? 'ar' : 'en';
        }
        return newIsRTL !== currentIsRTL; // Needs reload
    } else {
        // Mobile: Apply and signal restart
        if (newIsRTL !== currentIsRTL) {
            I18nManager.forceRTL(newIsRTL);
            return true; // Needs restart
        }
        return false;
    }
}

// ============================================================================
// STYLE HELPERS (Use these in components)
// ============================================================================

/**
 * Get the current RTL state.
 * Use this sparingly - prefer useLanguage().isRTL in components.
 */
export function isRTL(): boolean {
    return I18nManager.isRTL;
}

/**
 * Create a row style that works correctly in both LTR and RTL.
 * Always uses flexDirection: 'row' - I18nManager handles RTL.
 */
export function createRowStyle(additionalStyles?: ViewStyle): ViewStyle {
    return {
        flexDirection: 'row',
        alignItems: 'center',
        ...additionalStyles,
    };
}

/**
 * Create RTL-aware text style.
 */
export function createTextStyle(isRTL: boolean, additionalStyles?: TextStyle): TextStyle {
    return {
        textAlign: isRTL ? 'right' : 'left',
        writingDirection: isRTL ? 'rtl' : 'ltr',
        ...additionalStyles,
    };
}

/**
 * Get logical margin (use instead of marginLeft/marginRight)
 */
export function marginHorizontal(start: number, end?: number): ViewStyle {
    return {
        marginStart: start,
        marginEnd: end ?? start,
    };
}

/**
 * Get logical padding (use instead of paddingLeft/paddingRight)
 */
export function paddingHorizontal(start: number, end?: number): ViewStyle {
    return {
        paddingStart: start,
        paddingEnd: end ?? start,
    };
}

/**
 * Mirror an icon for RTL (for directional icons like arrows/chevrons)
 */
export function mirrorForRTL(isRTL: boolean): ViewStyle {
    return isRTL ? { transform: [{ scaleX: -1 }] } : {};
}

/**
 * Get the correct directional icon name
 */
export function getDirectionalIcon(
    isRTL: boolean,
    direction: 'forward' | 'back'
): 'chevron-right' | 'chevron-left' {
    const isForward = direction === 'forward';
    if (isRTL) {
        return isForward ? 'chevron-left' : 'chevron-right';
    }
    return isForward ? 'chevron-right' : 'chevron-left';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    initializeRTL,
    loadStoredLocale,
    changeLanguage,
    isRTL,
    createRowStyle,
    createTextStyle,
    marginHorizontal,
    paddingHorizontal,
    mirrorForRTL,
    getDirectionalIcon,
    LANGUAGE_STORAGE_KEY,
};
