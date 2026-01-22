/**
 * Hook for RTL-aware styles.
 * 
 * PLATFORM BEHAVIOR:
 * - Mobile: I18nManager handles layout flipping automatically
 * - Web: Browser doesn't auto-flip flexbox, so we use row-reverse for RTL
 * 
 * Usage:
 *   const { row, isRTL, textStart } = useRTLStyles();
 *   <View style={row}>...</View>
 */

import { useMemo } from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  arabicFontSize,
  arabicLineHeight,
  arabicTextStyle,
  TextCategory,
  ArabicFontScaling,
} from '@/utils/rtlStyles';

type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
type TextAlign = 'left' | 'right' | 'center' | 'auto' | 'justify';
type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';

interface RTLStyles {
  isRTL: boolean;
  /** Platform-aware row style (row on mobile, row-reverse on web RTL) */
  row: ViewStyle;
  /** Always row-reverse */
  rowReverse: ViewStyle;
  textStart: TextStyle;
  textEnd: TextStyle;
  textCenter: TextStyle;
  alignStart: ViewStyle;
  alignEnd: ViewStyle;
  alignCenter: ViewStyle;
  justifyStart: ViewStyle;
  justifyEnd: ViewStyle;
  justifyBetween: ViewStyle;
  writingDirection: TextStyle;
  /** Get text alignment */
  textAlign: (align?: 'start' | 'end' | 'center') => TextAlign;
  /** Scale font size for Arabic */
  fontSize: (baseSize: number, category?: TextCategory) => number;
  /** Scale line height for Arabic */
  lineHeight: (baseHeight: number, category?: TextCategory) => number;
  /** Get complete Arabic-aware text style */
  arabicText: (baseFontSize: number, baseLineHeight: number, category?: TextCategory) => TextStyle;
  /** Current scaling factors */
  scalingFactors: typeof ArabicFontScaling;
}

export function useRTLStyles(): RTLStyles {
  const { isRTL } = useLanguage();

  return useMemo(() => {
    // Always 'row' - I18nManager handles RTL on all platforms
    const rowDirection: FlexDirection = 'row';

    // Text alignment helper
    const getTextAlign = (align: 'start' | 'end' | 'center' = 'start'): TextAlign => {
      if (align === 'center') return 'center';
      if (align === 'start') return isRTL ? 'right' : 'left';
      return isRTL ? 'left' : 'right'; // 'end'
    };

    return {
      isRTL,
      row: { flexDirection: rowDirection },
      rowReverse: { flexDirection: 'row-reverse' as FlexDirection },
      textStart: { textAlign: (isRTL ? 'right' : 'left') as TextAlign },
      textEnd: { textAlign: (isRTL ? 'left' : 'right') as TextAlign },
      textCenter: { textAlign: 'center' as TextAlign },
      alignStart: { alignItems: (isRTL ? 'flex-end' : 'flex-start') as AlignItems },
      alignEnd: { alignItems: (isRTL ? 'flex-start' : 'flex-end') as AlignItems },
      alignCenter: { alignItems: 'center' as AlignItems },
      justifyStart: { justifyContent: (isRTL ? 'flex-end' : 'flex-start') as JustifyContent },
      justifyEnd: { justifyContent: (isRTL ? 'flex-start' : 'flex-end') as JustifyContent },
      justifyBetween: { justifyContent: 'space-between' as JustifyContent },
      writingDirection: { writingDirection: isRTL ? 'rtl' : 'ltr' } as TextStyle,
      textAlign: getTextAlign,
      fontSize: (baseSize: number, category: TextCategory = 'default') =>
        arabicFontSize(baseSize, isRTL, category),
      lineHeight: (baseHeight: number, category: TextCategory = 'default') =>
        arabicLineHeight(baseHeight, isRTL, category),
      arabicText: (baseFontSize: number, baseLineHeight: number, category: TextCategory = 'default') =>
        arabicTextStyle(baseFontSize, baseLineHeight, isRTL, category),
      scalingFactors: ArabicFontScaling,
    };
  }, [isRTL]);
}

export default useRTLStyles;
