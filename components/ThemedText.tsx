import {
  Text,
  type TextProps,
  TextStyle,
  StyleSheet,
  Platform,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Typography, FontFamily, getLocaleFontFamily, containsArabic } from "@/constants/theme";
import { getPlatformTextAlign } from "@/utils/rtlInitializer";
import {
  arabicFontSize,
  arabicLineHeight,
  TextCategory,
  ArabicFontScaling,
  ArabicLineHeightScaling,
} from "@/utils/rtlStyles";

export type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "bodyL"
  | "body"
  | "bodySmall"
  | "caption"
  | "label"
  | "link";

export type TextAlignRTL = "start" | "end" | "center" | "auto";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: TextVariant;
  variant?: TextVariant;
  color?: string;
  align?: TextAlignRTL;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type,
  variant,
  color,
  align = "auto",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();
  const { isRTL } = useLanguage();

  const textVariant = variant || type || "body";

  const childrenText = typeof rest.children === 'string' ? rest.children : 
    (Array.isArray(rest.children) ? rest.children.filter(c => typeof c === 'string').join('') : '');
  const contentHasArabic = !isRTL && containsArabic(childrenText);
  const useArabicFont = isRTL || contentHasArabic;

  const writingDirection = isRTL ? "rtl" : "ltr";
  // Platform-aware text alignment:
  // - On mobile with I18nManager.isRTL=true, React Native auto-flips textAlign
  //   so 'left' becomes right, 'right' becomes left
  // - On web, no auto-flip occurs, so we need explicit 'right' for RTL
  // - For 'auto' alignment, use 'left' (which on mobile RTL displays on right)
  const getTextAlign = (): "left" | "right" | "center" => {
    if (align === "center") return "center";

    // On mobile, I18nManager flips text alignment automatically
    // So we use 'left' which will appear on the right in RTL mode
    if (Platform.OS !== "web") {
      if (align === "auto" || align === "start") {
        return "left"; // Will be flipped to right by I18nManager in RTL
      }
      if (align === "end") {
        return "right"; // Will be flipped to left by I18nManager in RTL
      }
      return align === "start" ? "left" : "right";
    }

    // On web, no auto-flip, so we need explicit alignment
    if (align === "auto" || align === "start") {
      return isRTL ? "right" : "left";
    }
    if (align === "end") {
      return isRTL ? "left" : "right";
    }
    return getPlatformTextAlign(isRTL, align);
  };

  const textAlign = getTextAlign();

  const getColor = () => {
    if (color) {
      return color;
    }

    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (textVariant === "link") {
      return theme.link;
    }

    return theme.text;
  };

  // Map text variants to categories for Arabic scaling
  const getCategory = (variant: TextVariant): TextCategory => {
    switch (variant) {
      case "h1":
      case "h2":
      case "h3":
        return "heading";
      case "caption":
      case "label":
        return "caption";
      case "bodyL":
      case "body":
      case "bodySmall":
      case "link":
      default:
        return "body";
    }
  };

  const flattenedStyle = style ? StyleSheet.flatten(style) : null;
  const isAvatarMode = flattenedStyle?.includeFontPadding === false;

  const getTypeStyle = () => {
    const category = getCategory(textVariant);

    // Helper to apply Arabic scaling to typography styles
    type TypographyStyle = {
      fontSize: number;
      lineHeight: number;
      fontWeight: string;
      fontFamily: string;
      letterSpacing: number;
    };
    const scaleForArabic = <T extends TypographyStyle>(baseStyle: T): T => {
      if (isAvatarMode) {
        const { fontSize: _fs, lineHeight: _lh, ...avatarBase } = baseStyle;
        return {
          ...avatarBase,
          fontFamily: useArabicFont
            ? getLocaleFontFamily(baseStyle.fontFamily, true)
            : baseStyle.fontFamily,
        } as T;
      }
      if (!useArabicFont) return baseStyle;
      return {
        ...baseStyle,
        fontFamily: getLocaleFontFamily(baseStyle.fontFamily, true),
        fontSize: arabicFontSize(baseStyle.fontSize, true, category),
        lineHeight: arabicLineHeight(baseStyle.lineHeight, true, category),
      };
    };

    switch (textVariant) {
      case "h1":
        return scaleForArabic(Typography.h1);
      case "h2":
        return scaleForArabic(Typography.h2);
      case "h3":
        return scaleForArabic(Typography.h3);
      case "bodyL":
        return scaleForArabic(Typography.bodyL);
      case "body":
        return scaleForArabic(Typography.body);
      case "bodySmall":
        return scaleForArabic(Typography.bodySmall);
      case "caption":
        return scaleForArabic(Typography.caption);
      case "label":
        return scaleForArabic(Typography.label);
      case "link":
        return scaleForArabic({
          ...Typography.body,
          fontFamily: FontFamily.latinMedium,
        });
      default:
        return scaleForArabic(Typography.body);
    }
  };

  const baseStyle: TextStyle = {
    color: getColor(),
    writingDirection,
    textAlign,
  };

  // Extract and scale custom fontSize from style prop for Arabic
  const getScaledCustomStyle = (): TextStyle | null => {
    if (!style || !useArabicFont) return null;

    const flatStyle = flattenedStyle;
    if (!flatStyle) return null;

    const skipScaling = isAvatarMode;

    const scaledStyle: TextStyle = {};
    const category = getCategory(textVariant);

    // Scale custom fontSize if present
    if (typeof flatStyle.fontSize === "number" && !skipScaling) {
      scaledStyle.fontSize =
        Math.round(flatStyle.fontSize * ArabicFontScaling[category] * 10) / 10;
    }

    // Scale custom lineHeight if present
    if (typeof flatStyle.lineHeight === "number" && !skipScaling) {
      scaledStyle.lineHeight = Math.round(
        flatStyle.lineHeight * ArabicLineHeightScaling[category],
      );
    }

    if (isAvatarMode && typeof flatStyle.fontSize === "number" && typeof flatStyle.lineHeight !== "number") {
      scaledStyle.lineHeight = Math.round(flatStyle.fontSize * 1.35);
    }

    // Map fontFamily override to Arabic equivalent
    if (typeof flatStyle.fontFamily === "string") {
      scaledStyle.fontFamily = getLocaleFontFamily(flatStyle.fontFamily, true);
    } else if (isAvatarMode && flatStyle.fontWeight) {
      const weightToArabicFont: Record<string, string> = {
        '300': FontFamily.arabicLight,
        '400': FontFamily.arabicRegular,
        '500': FontFamily.arabicMedium,
        '600': FontFamily.arabicSemiBold,
        '700': FontFamily.arabicBold,
        '800': FontFamily.arabicExtraBold,
        'bold': FontFamily.arabicBold,
      };
      const mappedFont = weightToArabicFont[String(flatStyle.fontWeight)];
      if (mappedFont) {
        scaledStyle.fontFamily = mappedFont;
      }
    }

    return Object.keys(scaledStyle).length > 0 ? scaledStyle : null;
  };

  const scaledCustomStyle = getScaledCustomStyle();

  return (
    <Text
      style={[
        baseStyle,
        getTypeStyle(),
        style,
        scaledCustomStyle, // Apply scaled custom fontSize last to override
      ]}
      {...rest}
    />
  );
}
