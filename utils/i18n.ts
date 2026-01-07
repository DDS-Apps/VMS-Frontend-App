import { ViewStyle, TextStyle } from 'react-native';

/**
 * @deprecated Use useLanguage from '@/contexts/LanguageContext' instead
 * This hook is kept for backward compatibility but will be removed in a future version.
 */
export { useLocaleDirection } from '@/hooks/useLocaleDirection';

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

/**
 * @deprecated These functions use I18nManager.isRTL directly which doesn't work reliably on native.
 * Use useLanguage().isRTL from '@/contexts/LanguageContext' instead.
 */
export const getTextAlign = (isRTL: boolean): 'left' | 'right' | 'center' => {
  return isRTL ? 'right' : 'left';
};

export const getFlexDirection = (direction: 'row' | 'column', isRTL: boolean): 'row' | 'row-reverse' | 'column' | 'column-reverse' => {
  if (direction === 'column') return 'column';
  return isRTL ? 'row-reverse' : 'row';
};

export const logicalStyles = {
  paddingStart: (value: number): ViewStyle => ({ paddingStart: value }),
  paddingEnd: (value: number): ViewStyle => ({ paddingEnd: value }),
  marginStart: (value: number): ViewStyle => ({ marginStart: value }),
  marginEnd: (value: number): ViewStyle => ({ marginEnd: value }),
};
