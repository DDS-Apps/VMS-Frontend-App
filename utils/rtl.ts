/**
 * RTL (Right-to-Left) Layout Utilities
 * =====================================
 * 
 * @deprecated This file is deprecated. Use '@/utils/localeManager' instead.
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

import { I18nManager, ViewStyle, TextStyle } from 'react-native';

// Re-export from localeManager for backwards compatibility
export {
    LANGUAGE_STORAGE_KEY,
    DEFAULT_LOCALE as defaultLocale,
    SupportedLocale,
    bootstrapLocaleSync as initializeRTL,
    bootstrapLocale as loadStoredLocale,
    changeLanguage,
    isRTLLocale,
    getStoredLocale,
} from './localeManager';

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

// Note: Default export removed since re-exported items can't be used in object shorthand.
// Import individual functions instead:
// import { isRTL, createRowStyle, createTextStyle, ... } from '@/utils/rtl';
