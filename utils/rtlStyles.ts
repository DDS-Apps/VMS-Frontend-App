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

// ============================================
// Arabic Font Scaling Configuration
// ============================================

/**
 * Font size scaling factors for Arabic text.
 * Arabic script often requires slightly larger sizes for optimal readability.
 * Adjust these values to fine-tune Arabic typography across the app.
 */
export const ArabicFontScaling = {
  /** Scaling factor for body text (20% larger = 1.20) */
  body: 1.20,
  /** Scaling factor for headings (can be adjusted separately if needed) */
  heading: 1.05,
  /** Scaling factor for captions/small text (16% larger = 1.16) */
  caption: 1.16,
  /** Default scaling factor for any text type not specified */
  default: 1.20,
};

/**
 * Text category types for font scaling
 */
export type TextCategory = 'body' | 'heading' | 'caption' | 'default';

/**
 * Returns a scaled font size for Arabic text.
 * Use this function to ensure Arabic text is properly sized for readability.
 * 
 * @param baseFontSize - The base font size (for English/Latin text)
 * @param isRTL - Whether the current language is RTL (Arabic)
 * @param category - The text category to determine scaling factor
 * @returns Scaled font size (rounded to 1 decimal place)
 * 
 * @example
 * // In a component:
 * const fontSize = arabicFontSize(16, isRTL, 'body'); // Returns 17.6 for Arabic, 16 for English
 */
export function arabicFontSize(
  baseFontSize: number,
  isRTL: boolean,
  category: TextCategory = 'default'
): number {
  if (!isRTL) {
    return baseFontSize;
  }
  const scaleFactor = ArabicFontScaling[category];
  return Math.round(baseFontSize * scaleFactor * 10) / 10;
}

/**
 * Returns a scaled line height for Arabic text.
 * Line height should scale proportionally with font size.
 * 
 * @param baseLineHeight - The base line height
 * @param isRTL - Whether the current language is RTL (Arabic)
 * @param category - The text category to determine scaling factor
 * @returns Scaled line height (rounded to nearest integer)
 */
export function arabicLineHeight(
  baseLineHeight: number,
  isRTL: boolean,
  category: TextCategory = 'default'
): number {
  if (!isRTL) {
    return baseLineHeight;
  }
  const scaleFactor = ArabicFontScaling[category];
  return Math.round(baseLineHeight * scaleFactor);
}

/**
 * Returns complete text style with Arabic-aware font sizing.
 * Combines RTL text alignment with scaled font size and line height.
 * 
 * @param baseFontSize - Base font size
 * @param baseLineHeight - Base line height
 * @param isRTL - Whether RTL mode is active
 * @param category - Text category for scaling
 * @returns TextStyle with fontSize, lineHeight, textAlign, and writingDirection
 * 
 * @example
 * <ThemedText style={[styles.body, arabicTextStyle(16, 24, isRTL, 'body')]}>
 *   {t('some.text')}
 * </ThemedText>
 */
export function arabicTextStyle(
  baseFontSize: number,
  baseLineHeight: number,
  isRTL: boolean,
  category: TextCategory = 'default'
): TextStyle {
  return {
    fontSize: arabicFontSize(baseFontSize, isRTL, category),
    lineHeight: arabicLineHeight(baseLineHeight, isRTL, category),
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  };
}

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
