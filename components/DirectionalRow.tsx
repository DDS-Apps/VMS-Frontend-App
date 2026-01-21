/**
 * DirectionalRow Component
 * ========================
 * 
 * A row container that handles RTL layout correctly across all platforms.
 * This is the SINGLE SOURCE OF TRUTH for RTL row layouts.
 * 
 * IMPORTANT: Uses I18nManager.isRTL directly (not React context) because:
 * - I18nManager.isRTL is set by the native layer after app restart
 * - React context may not be synced in all render cycles
 * - The React Native docs recommend using I18nManager.isRTL for layout decisions
 * 
 * FEATURES:
 * =========
 * 1. Double-flip prevention - Detects if browser already flips via dir="rtl"
 * 2. Nested DirectionalRows - Uses Context to prevent nested rows from double-flipping
 * 3. Third-party wrapper - RTLWrapper component for external libraries
 * 
 * USAGE:
 * ======
 * // Basic usage
 * <DirectionalRow gap={8}>
 *   <Icon name="user" />
 *   <Text>Username</Text>
 * </DirectionalRow>
 * 
 * // For Pressable or custom components
 * const directionalStyle = useDirectionalStyle();
 * <Pressable style={[styles.row, directionalStyle]}>...</Pressable>
 * 
 * // For third-party components
 * <RTLWrapper>
 *   <ThirdPartyCalendar />
 * </RTLWrapper>
 * 
 * In LTR: [Icon] [Username]
 * In RTL: [Username] [Icon]
 */

import React, { ReactNode, createContext, useContext } from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform, I18nManager } from 'react-native';

// =============================================================================
// RTL DETECTION
// =============================================================================

/**
 * Get the current RTL state directly from I18nManager
 * This is the authoritative source for RTL on mobile (set by native layer after restart)
 * On web, we check localStorage for stored language preference
 */
function getIsRTL(): boolean {
  if (Platform.OS === 'web') {
    // On web, check localStorage for stored language as I18nManager may not be reliable
    if (typeof localStorage !== 'undefined') {
      try {
        const storedLang = localStorage.getItem('@vms_language');
        console.log('[getIsRTL WEB DEBUG]', { storedLang, I18nManagerIsRTL: I18nManager.isRTL });
        if (storedLang === 'ar') return true;
        if (storedLang === 'en') return false;
      } catch {
        // Fall through to I18nManager
      }
    }
  }
  // Use I18nManager.isRTL - this is set correctly by native layer after app restart
  return I18nManager.isRTL;
}

/**
 * Export getIsRTL for use in other components
 * This is the authoritative RTL check that reads directly from I18nManager
 */
export { getIsRTL };

// =============================================================================
// CONTEXT FOR NESTED DIRECTIONAL ROWS
// =============================================================================

interface DirectionalContextType {
  isInsideDirectionalRow: boolean;
  depth: number;
}

const DirectionalContext = createContext<DirectionalContextType>({
  isInsideDirectionalRow: false,
  depth: 0,
});

/**
 * Hook to check if we're inside a DirectionalRow
 */
export function useDirectionalContext() {
  return useContext(DirectionalContext);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if browser will automatically flip layout via dir="rtl"
 * This prevents double-flipping on web
 * 
 * NOTE: We no longer set document.dir='rtl', so this should always return false.
 * Kept for safety in case any external code sets it.
 */
function browserWillAutoFlip(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof document === 'undefined') return false;
  return document.documentElement.dir === 'rtl';
}

/**
 * Calculate the correct flex direction based on RTL state, platform, and context
 * 
 * PLATFORM BEHAVIOR:
 * - On MOBILE with RTL: Use 'row' and let React Native's native layer auto-flip it
 *   (When forceRTL(true) is set, native interprets 'row' as reversed)
 * - On WEB with RTL: Use 'row-reverse' explicitly (no native auto-flip on web)
 * - On LTR or nested: Use 'row'
 * 
 * This fixes the "double-flip" issue where setting 'row-reverse' on mobile RTL
 * was being negated by the native layout engine.
 * 
 * @param isRTL - Whether current locale is RTL
 * @param isNested - Whether this is inside another DirectionalRow
 * @returns 'row' | 'row-reverse'
 */
export function calculateFlexDirection(
  isRTL: boolean, 
  isNested: boolean = false
): 'row' | 'row-reverse' {
  // Check if browser will auto-flip (web only, when <html dir="rtl"> is set)
  const autoFlip = browserWillAutoFlip();
  
  // If browser will auto-flip, use 'row' (browser handles it)
  if (autoFlip) {
    return 'row';
  }
  
  // PLATFORM-SPECIFIC RTL HANDLING:
  // - Mobile: Use 'row' for RTL - native layer auto-flips it when forceRTL(true)
  //   On mobile, nested rows should use 'row' because parent already flipped
  // - Web: Use 'row-reverse' for RTL - no native auto-flip, we control it explicitly
  //   On web, ALL rows (even nested) need explicit 'row-reverse' because there's no auto-flip
  if (isRTL) {
    const isWeb = Platform.OS === 'web';
    
    // On mobile, if nested, parent already handled the flip
    if (!isWeb && isNested) {
      return 'row';
    }
    
    // On web, always use row-reverse for RTL (even nested, since no auto-flip)
    // On mobile (non-nested), use 'row' which native will flip
    const direction = isWeb ? 'row-reverse' : 'row';
    
    // DEBUG: Log the platform-specific direction calculation
    console.log('[calculateFlexDirection DEBUG]', {
      platform: Platform.OS,
      isRTL,
      isNested,
      isWeb,
      'nativeAutoFlip (mobile only)': !isWeb,
      returnedDirection: direction,
    });
    
    return direction;
  }
  
  return 'row';
}

// =============================================================================
// DIRECTIONAL ROW COMPONENT
// =============================================================================

interface DirectionalRowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  /** Override alignment (default: 'center') */
  alignItems?: ViewStyle['alignItems'];
  /** Override justify (default: 'flex-start') */
  justifyContent?: ViewStyle['justifyContent'];
  /** Force a specific direction, ignoring RTL context */
  forceDirection?: 'row' | 'row-reverse';
  /** Test ID for testing purposes */
  testID?: string;
  /** Native ID for native accessibility */
  nativeID?: string;
}

export function DirectionalRow({ 
  children, 
  style, 
  gap,
  alignItems = 'center',
  justifyContent = 'flex-start',
  forceDirection,
  testID,
  nativeID,
}: DirectionalRowProps) {
  // Use I18nManager.isRTL directly - this is the authoritative source on mobile
  const isRTL = getIsRTL();
  const { isInsideDirectionalRow, depth } = useDirectionalContext();
  const flattenedStyle = StyleSheet.flatten([style]) || {};
  
  // Calculate flex direction
  const flexDirection = forceDirection ?? calculateFlexDirection(isRTL, isInsideDirectionalRow);
  
  // DEBUG: Log RTL values for tracing layout issues
  console.log('[DirectionalRow DEBUG]', {
    platform: Platform.OS,
    'I18nManager.isRTL': I18nManager.isRTL,
    'getIsRTL()': isRTL,
    'browserWillAutoFlip()': browserWillAutoFlip(),
    isNested: isInsideDirectionalRow,
    depth,
    forceDirection: forceDirection ?? 'none',
    resolvedFlexDirection: flexDirection,
  });
  
  const finalStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection,
    alignItems: flattenedStyle.alignItems ?? alignItems,
    justifyContent: flattenedStyle.justifyContent ?? justifyContent,
    gap: gap ?? flattenedStyle.gap,
  };
  
  // Wrap children in context to track nesting
  return (
    <DirectionalContext.Provider value={{ isInsideDirectionalRow: true, depth: depth + 1 }}>
      <View style={finalStyle} testID={testID} nativeID={nativeID}>
        {children}
      </View>
    </DirectionalContext.Provider>
  );
}

// =============================================================================
// HOOKS FOR CUSTOM COMPONENTS
// =============================================================================

/**
 * Hook to get the flex direction style for custom components (like Pressable)
 * 
 * Usage:
 * ```tsx
 * const directionalStyle = useDirectionalStyle();
 * <Pressable style={[styles.container, directionalStyle]}>
 *   <Icon />
 *   <Text />
 * </Pressable>
 * ```
 */
export function useDirectionalStyle(): { flexDirection: 'row' | 'row-reverse' } {
  // Use I18nManager.isRTL directly - this is the authoritative source on mobile
  const isRTL = getIsRTL();
  const { isInsideDirectionalRow } = useDirectionalContext();
  
  return {
    flexDirection: calculateFlexDirection(isRTL, isInsideDirectionalRow),
  };
}

/**
 * Get flex direction based on isRTL parameter (for non-hook contexts)
 * 
 * @param isRTL - Whether current locale is RTL
 * @returns 'row' | 'row-reverse'
 */
export function getFlexDirection(isRTL: boolean): 'row' | 'row-reverse' {
  return calculateFlexDirection(isRTL, false);
}

// =============================================================================
// RTL WRAPPER FOR THIRD-PARTY COMPONENTS
// =============================================================================

interface RTLWrapperProps {
  children: ReactNode;
  /** Force a specific direction for the wrapper */
  forceDirection?: 'row' | 'row-reverse' | 'ltr' | 'rtl';
  /** Additional styles for the wrapper */
  style?: StyleProp<ViewStyle>;
  /** Whether the third-party component handles RTL internally */
  componentHandlesRTL?: boolean;
}

/**
 * Wrapper component for third-party libraries that don't respect RTL
 * 
 * Usage:
 * ```tsx
 * <RTLWrapper>
 *   <ThirdPartyDatePicker />
 * </RTLWrapper>
 * 
 * // If the component handles RTL internally
 * <RTLWrapper componentHandlesRTL>
 *   <RTLAwareDatePicker />
 * </RTLWrapper>
 * ```
 */
export function RTLWrapper({ 
  children, 
  forceDirection,
  style,
  componentHandlesRTL = false,
}: RTLWrapperProps) {
  // Use I18nManager.isRTL directly - this is the authoritative source on mobile
  const isRTL = getIsRTL();
  
  // If component handles RTL internally, just pass through
  if (componentHandlesRTL) {
    return <>{children}</>;
  }
  
  // Calculate wrapper direction
  let wrapperDirection: 'row' | 'row-reverse' = 'row';
  
  if (forceDirection) {
    if (forceDirection === 'ltr') {
      wrapperDirection = 'row';
    } else if (forceDirection === 'rtl') {
      wrapperDirection = 'row-reverse';
    } else {
      wrapperDirection = forceDirection;
    }
  } else {
    wrapperDirection = calculateFlexDirection(isRTL, false);
  }
  
  const wrapperStyle: ViewStyle = {
    ...StyleSheet.flatten(style),
    flexDirection: wrapperDirection,
    alignItems: 'center',
  };
  
  return (
    <View style={wrapperStyle}>
      {children}
    </View>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DirectionalRow;
