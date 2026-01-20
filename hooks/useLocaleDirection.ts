/**
 * Hook to get current locale direction information.
 * 
 * Use this for RTL-aware layouts and content.
 * 
 * PLATFORM BEHAVIOR:
 * - Mobile: I18nManager handles layout flipping. flexDirection: 'row' works.
 * - Web: Browser doesn't auto-flip. Use row-reverse for RTL.
 */

import { ViewStyle, TextStyle } from "react-native";
import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export function useLocaleDirection() {
  const { isRTL } = useLanguage();

  const direction = useMemo(() => {
    // Always use 'row' - I18nManager handles RTL on all platforms
    return {
      isRTL,
      isLTR: !isRTL,
      textAlign: isRTL ? "right" as const : "left" as const,
      flexDirection: "row" as const,
      alignSelf: isRTL ? "flex-end" as const : "flex-start" as const,
      rowStyle: { flexDirection: "row" } as ViewStyle,
      textStyle: {
        textAlign: isRTL ? "right" : "left",
        writingDirection: isRTL ? "rtl" : "ltr",
      } as TextStyle,
      alignStart: isRTL ? "flex-end" as const : "flex-start" as const,
      alignEnd: isRTL ? "flex-start" as const : "flex-end" as const,
      // Logical properties (React Native handles these automatically)
      marginStart: (value: number) => ({ marginStart: value }) as ViewStyle,
      marginEnd: (value: number) => ({ marginEnd: value }) as ViewStyle,
      paddingStart: (value: number) => ({ paddingStart: value }) as ViewStyle,
      paddingEnd: (value: number) => ({ paddingEnd: value }) as ViewStyle,
    };
  }, [isRTL]);

  return direction;
}

export type LocaleDirection = ReturnType<typeof useLocaleDirection>;
