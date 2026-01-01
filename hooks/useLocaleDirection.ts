import { I18nManager, ViewStyle, TextStyle } from "react-native";
import { useMemo } from "react";

/**
 * Hook to get current locale direction information
 * Useful for RTL-aware layouts and content
 */
export function useLocaleDirection() {
  const isRTL = I18nManager.isRTL;
  
  const direction = useMemo(() => ({
    isRTL,
    isLTR: !isRTL,
    textAlign: isRTL ? "right" as const : "left" as const,
    flexDirection: isRTL ? "row-reverse" as const : "row" as const,
    alignSelf: isRTL ? "flex-end" as const : "flex-start" as const,
    rowStyle: { flexDirection: isRTL ? "row-reverse" : "row" } as ViewStyle,
    textStyle: { textAlign: isRTL ? "right" : "left" } as TextStyle,
    alignStart: isRTL ? "flex-end" as const : "flex-start" as const,
    alignEnd: isRTL ? "flex-start" as const : "flex-end" as const,
    marginStart: (value: number) => (isRTL ? { marginRight: value } : { marginLeft: value }) as ViewStyle,
    marginEnd: (value: number) => (isRTL ? { marginLeft: value } : { marginRight: value }) as ViewStyle,
    paddingStart: (value: number) => (isRTL ? { paddingRight: value } : { paddingLeft: value }) as ViewStyle,
    paddingEnd: (value: number) => (isRTL ? { paddingLeft: value } : { paddingRight: value }) as ViewStyle,
  }), [isRTL]);

  return direction;
}

export type LocaleDirection = ReturnType<typeof useLocaleDirection>;
