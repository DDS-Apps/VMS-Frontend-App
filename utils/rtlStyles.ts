import { ViewStyle, TextStyle } from 'react-native';

/**
 * RTL Style Helpers
 * 
 * These helpers provide a single source of truth for RTL-aware styling.
 * Use these instead of inline conditional styles to ensure consistency.
 * 
 * IMPORTANT RULES:
 * 1. Only apply row() to the OUTERMOST container that needs RTL mirroring
 * 2. Nested containers should NOT also use row() - this causes double reversal
 * 3. Use rtlText() on all visible text to ensure proper alignment on iOS
 */

/**
 * Returns RTL-aware row styles for horizontal layouts
 * Use this on the OUTERMOST container only - do NOT nest
 * 
 * @param isRTL - Whether RTL mode is active
 * @returns ViewStyle with flexDirection and alignItems
 */
export function row(isRTL: boolean): ViewStyle {
  return {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
  };
}

/**
 * Returns RTL-aware row styles with space-between justification
 * 
 * @param isRTL - Whether RTL mode is active
 * @returns ViewStyle with flexDirection, alignItems, and justifyContent
 */
export function rowBetween(isRTL: boolean): ViewStyle {
  return {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  };
}

/**
 * Returns RTL-aware text styles
 * Apply this to ALL visible text to fix iOS Arabic left-alignment issue
 * 
 * @param isRTL - Whether RTL mode is active
 * @returns TextStyle with textAlign and writingDirection
 */
export function rtlText(isRTL: boolean): TextStyle {
  return {
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  };
}

/**
 * Returns RTL-aware centered text styles
 * Use for text that should be centered regardless of direction
 * 
 * @param isRTL - Whether RTL mode is active
 * @returns TextStyle with center textAlign and writingDirection
 */
export function rtlTextCenter(isRTL: boolean): TextStyle {
  return {
    textAlign: 'center',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  };
}

/**
 * Returns RTL-aware margin for "start" side (left in LTR, right in RTL)
 * 
 * @param isRTL - Whether RTL mode is active
 * @param value - Margin value
 * @returns ViewStyle with marginStart
 */
export function marginStart(isRTL: boolean, value: number): ViewStyle {
  return { marginStart: value };
}

/**
 * Returns RTL-aware margin for "end" side (right in LTR, left in RTL)
 * 
 * @param isRTL - Whether RTL mode is active
 * @param value - Margin value
 * @returns ViewStyle with marginEnd
 */
export function marginEnd(isRTL: boolean, value: number): ViewStyle {
  return { marginEnd: value };
}

/**
 * Returns RTL-aware padding for "start" side
 * 
 * @param isRTL - Whether RTL mode is active
 * @param value - Padding value
 * @returns ViewStyle with paddingStart
 */
export function paddingStart(isRTL: boolean, value: number): ViewStyle {
  return { paddingStart: value };
}

/**
 * Returns RTL-aware padding for "end" side
 * 
 * @param isRTL - Whether RTL mode is active
 * @param value - Padding value
 * @returns ViewStyle with paddingEnd
 */
export function paddingEnd(isRTL: boolean, value: number): ViewStyle {
  return { paddingEnd: value };
}

/**
 * Returns transform to mirror directional icons (arrows, chevrons) in RTL
 * Apply this to icons that point left/right and need to be mirrored
 * 
 * @param isRTL - Whether RTL mode is active
 * @returns ViewStyle with scaleX transform
 */
export function mirrorIcon(isRTL: boolean): ViewStyle {
  return {
    transform: [{ scaleX: isRTL ? -1 : 1 }],
  };
}

/**
 * Utility to get the correct chevron icon name based on direction
 * 
 * @param isRTL - Whether RTL mode is active
 * @param direction - 'forward' (navigation forward) or 'back' (navigation back)
 * @returns Icon name string
 */
export function getDirectionalChevron(isRTL: boolean, direction: 'forward' | 'back'): string {
  if (direction === 'forward') {
    return isRTL ? 'chevron-left' : 'chevron-right';
  }
  return isRTL ? 'chevron-right' : 'chevron-left';
}

/**
 * Utility to get the correct arrow icon name based on direction
 * 
 * @param isRTL - Whether RTL mode is active
 * @param direction - 'forward' or 'back'
 * @returns Icon name string
 */
export function getDirectionalArrow(isRTL: boolean, direction: 'forward' | 'back'): string {
  if (direction === 'forward') {
    return isRTL ? 'arrow-left' : 'arrow-right';
  }
  return isRTL ? 'arrow-right' : 'arrow-left';
}
