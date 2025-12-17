import { I18nManager } from "react-native";
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
  }), [isRTL]);

  return direction;
}
