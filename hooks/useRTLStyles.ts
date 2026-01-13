import { useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  getFlexDirection, 
  getTextAlign, 
  getAlignItems,
  getJustifyContent,
  FlexDirection,
  TextAlign,
  AlignItems,
  JustifyContent,
} from '@/utils/rtlInitializer';

interface RTLStyles {
  isRTL: boolean;
  row: ViewStyle;
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
  flexDirection: (base?: 'row' | 'column') => FlexDirection;
  textAlign: (align?: 'start' | 'end' | 'center') => TextAlign;
  alignItems: (align?: 'start' | 'end' | 'center') => AlignItems;
  justifyContent: (justify?: 'start' | 'end' | 'center' | 'between' | 'around') => JustifyContent;
}

export function useRTLStyles(): RTLStyles {
  const { isRTL } = useLanguage();

  return useMemo(() => ({
    isRTL,
    row: { flexDirection: getFlexDirection(isRTL, 'row') },
    rowReverse: { flexDirection: isRTL ? 'row' : 'row-reverse' },
    textStart: { textAlign: getTextAlign(isRTL, 'start') },
    textEnd: { textAlign: getTextAlign(isRTL, 'end') },
    textCenter: { textAlign: 'center' as TextAlign },
    alignStart: { alignItems: getAlignItems(isRTL, 'start') },
    alignEnd: { alignItems: getAlignItems(isRTL, 'end') },
    alignCenter: { alignItems: 'center' as AlignItems },
    justifyStart: { justifyContent: getJustifyContent(isRTL, 'start') },
    justifyEnd: { justifyContent: getJustifyContent(isRTL, 'end') },
    justifyBetween: { justifyContent: 'space-between' as JustifyContent },
    writingDirection: { writingDirection: isRTL ? 'rtl' : 'ltr' } as TextStyle,
    flexDirection: (base: 'row' | 'column' = 'row') => getFlexDirection(isRTL, base),
    textAlign: (align: 'start' | 'end' | 'center' = 'start') => getTextAlign(isRTL, align),
    alignItems: (align: 'start' | 'end' | 'center' = 'start') => getAlignItems(isRTL, align),
    justifyContent: (justify: 'start' | 'end' | 'center' | 'between' | 'around' = 'start') => 
      getJustifyContent(isRTL, justify),
  }), [isRTL]);
}

export default useRTLStyles;
