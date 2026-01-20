/**
 * DirectionalRow Component
 * ========================
 * 
 * A row container that handles RTL layout correctly across all platforms.
 * This is the SINGLE SOURCE OF TRUTH for RTL row layouts.
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
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

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
 * Calculate the correct flex direction based on RTL state and context
 * 
 * @param isRTL - Whether current locale is RTL
 * @param isNested - Whether this is inside another DirectionalRow
 * @returns 'row' | 'row-reverse'
 */
export function calculateFlexDirection(
  isRTL: boolean, 
  isNested: boolean = false
): 'row' | 'row-reverse' {
  // If nested inside another DirectionalRow, parent already handles direction
  if (isNested) {
    return 'row';
  }
  
  // Check if browser will auto-flip (when <html dir="rtl"> is set)
  const autoFlip = browserWillAutoFlip();
  
  // If browser will auto-flip, use 'row' (browser handles it)
  // Otherwise, use 'row-reverse' for RTL
  if (autoFlip) {
    return 'row';
  }
  
  return isRTL ? 'row-reverse' : 'row';
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
}

export function DirectionalRow({ 
  children, 
  style, 
  gap,
  alignItems = 'center',
  justifyContent = 'flex-start',
  forceDirection,
}: DirectionalRowProps) {
  const { isRTL } = useLanguage();
  const { isInsideDirectionalRow, depth } = useDirectionalContext();
  const flattenedStyle = StyleSheet.flatten([style]) || {};
  
  // Calculate flex direction
  const flexDirection = forceDirection ?? calculateFlexDirection(isRTL, isInsideDirectionalRow);
  
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
      <View style={finalStyle}>
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
  const { isRTL } = useLanguage();
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
  const { isRTL } = useLanguage();
  
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
