import { I18nManager, ViewStyle, TextStyle } from 'react-native';
import { useMemo } from 'react';

export const useLocaleDirection = () => {
  return useMemo(() => ({
    isRTL: I18nManager.isRTL,
    direction: I18nManager.isRTL ? 'rtl' : 'ltr',
  }), []);
};

export const getLogicalPadding = (
  horizontal?: number,
  vertical?: number,
  start?: number,
  end?: number,
  top?: number,
  bottom?: number
): ViewStyle | TextStyle => {
  const style: ViewStyle = {};

  if (horizontal !== undefined) {
    style.paddingHorizontal = horizontal;
  }
  
  if (vertical !== undefined) {
    style.paddingVertical = vertical;
  }

  if (start !== undefined) {
    style.paddingStart = start;
  }

  if (end !== undefined) {
    style.paddingEnd = end;
  }

  if (top !== undefined) {
    style.paddingTop = top;
  }

  if (bottom !== undefined) {
    style.paddingBottom = bottom;
  }

  return style;
};

export const getLogicalMargin = (
  horizontal?: number,
  vertical?: number,
  start?: number,
  end?: number,
  top?: number,
  bottom?: number
): ViewStyle => {
  const style: ViewStyle = {};

  if (horizontal !== undefined) {
    style.marginHorizontal = horizontal;
  }
  
  if (vertical !== undefined) {
    style.marginVertical = vertical;
  }

  if (start !== undefined) {
    style.marginStart = start;
  }

  if (end !== undefined) {
    style.marginEnd = end;
  }

  if (top !== undefined) {
    style.marginTop = top;
  }

  if (bottom !== undefined) {
    style.marginBottom = bottom;
  }

  return style;
};

export const getTextAlign = (): 'left' | 'right' | 'center' => {
  return I18nManager.isRTL ? 'right' : 'left';
};

export const getFlexDirection = (direction: 'row' | 'column'): 'row' | 'row-reverse' | 'column' | 'column-reverse' => {
  if (direction === 'column') return 'column';
  return I18nManager.isRTL ? 'row-reverse' : 'row';
};

export const logicalStyles = {
  paddingStart: (value: number): ViewStyle => ({ paddingStart: value }),
  paddingEnd: (value: number): ViewStyle => ({ paddingEnd: value }),
  marginStart: (value: number): ViewStyle => ({ marginStart: value }),
  marginEnd: (value: number): ViewStyle => ({ marginEnd: value }),
  textAlign: (): TextStyle => ({ textAlign: getTextAlign() }),
  flexDirection: (direction: 'row' | 'column'): ViewStyle => ({ 
    flexDirection: getFlexDirection(direction) 
  }),
};
