import { useMemo } from 'react';
import { I18nManager, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Spacing, BorderRadius } from '@/constants/theme';

interface RTLStyles {
  isRTL: boolean;
  flexRowDirection: 'row' | 'row-reverse';
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
  alignSelf: 'flex-start' | 'flex-end';
  chevronName: 'chevron-left' | 'chevron-right';
  arrowName: 'arrow-left' | 'arrow-right';
  row: ViewStyle;
  rowReverse: ViewStyle;
  textRTL: TextStyle;
  inputRTL: TextStyle;
  rowWithIcon: ViewStyle;
  iconContainerStart: ViewStyle;
  iconContainerEnd: ViewStyle;
  listItemRow: ViewStyle;
  cardRow: ViewStyle;
  headerRow: ViewStyle;
  timelineAccent: ViewStyle;
  labelStyle: TextStyle;
}

export function useRTLStyles(): RTLStyles {
  const { isRTL: contextRTL } = useLanguage();
  const isRTL = contextRTL || I18nManager.isRTL;

  return useMemo(() => ({
    isRTL,
    flexRowDirection: isRTL ? 'row-reverse' : 'row',
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
    alignSelf: isRTL ? 'flex-end' : 'flex-start',
    chevronName: isRTL ? 'chevron-left' : 'chevron-right',
    arrowName: isRTL ? 'arrow-left' : 'arrow-right',
    row: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
    },
    rowReverse: {
      flexDirection: isRTL ? 'row' : 'row-reverse',
    },
    textRTL: {
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    inputRTL: {
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    rowWithIcon: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
    },
    iconContainerStart: {
      marginEnd: Spacing.sm,
      marginStart: 0,
    },
    iconContainerEnd: {
      marginStart: Spacing.sm,
      marginEnd: 0,
    },
    listItemRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    cardRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
    },
    headerRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timelineAccent: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 4,
      borderTopStartRadius: BorderRadius.md,
      borderBottomStartRadius: BorderRadius.md,
      ...(isRTL ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' }),
    },
    labelStyle: {
      textAlign: isRTL ? 'right' : 'left',
    },
  }), [isRTL]);
}

export function getFlexDirection(isRTL: boolean): 'row' | 'row-reverse' {
  return isRTL ? 'row-reverse' : 'row';
}

export function getTextAlign(isRTL: boolean): 'left' | 'right' {
  return isRTL ? 'right' : 'left';
}

export function getWritingDirection(isRTL: boolean): 'ltr' | 'rtl' {
  return isRTL ? 'rtl' : 'ltr';
}

export const rtlStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textStart: {
    textAlign: 'left',
  },
  accentStart: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    borderTopStartRadius: BorderRadius.md,
    borderBottomStartRadius: BorderRadius.md,
  },
});
