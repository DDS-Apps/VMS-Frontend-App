import { Text, type TextProps, TextStyle, StyleSheet } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Typography, FontFamily } from "@/constants/theme";
import { getPlatformTextAlign } from "@/utils/rtlInitializer";
import { arabicFontSize, arabicLineHeight, TextCategory, ArabicFontScaling } from "@/utils/rtlStyles";

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

export type TextAlignRTL = 'start' | 'end' | 'center' | 'auto';

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
  align = 'auto',
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();
  const { isRTL } = useLanguage();

  const textVariant = variant || type || "body";
  
  const writingDirection = isRTL ? 'rtl' : 'ltr';
  // Always apply textAlign for RTL to fix iOS Arabic left-alignment issue
  // 'auto' means use the default alignment based on RTL state
  const textAlign = align === 'auto' 
    ? (isRTL ? 'right' : 'left')
    : getPlatformTextAlign(isRTL, align);

  // RTL DEBUG - Log once per component type to verify text alignment
  if (__DEV__ && isRTL && textVariant === 'body') {
    console.log('🔄 [RTL_DEBUG] ThemedText:', { isRTL, textAlign, writingDirection });
  }

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
        return 'heading';
      case "caption":
      case "label":
        return 'caption';
      case "bodyL":
      case "body":
      case "bodySmall":
      case "link":
      default:
        return 'body';
    }
  };

  const getTypeStyle = () => {
    const category = getCategory(textVariant);
    
    // Helper to apply Arabic scaling to typography styles
    type TypographyStyle = { fontSize: number; lineHeight: number; fontWeight: string; fontFamily: string; letterSpacing: number };
    const scaleForArabic = <T extends TypographyStyle>(baseStyle: T): T => {
      if (!isRTL) return baseStyle;
      return {
        ...baseStyle,
        fontSize: arabicFontSize(baseStyle.fontSize, isRTL, category),
        lineHeight: arabicLineHeight(baseStyle.lineHeight, isRTL, category),
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
    if (!style || !isRTL) return null;
    
    // Flatten style array if needed
    const flatStyle = StyleSheet.flatten(style);
    if (!flatStyle) return null;
    
    const scaledStyle: TextStyle = {};
    const category = getCategory(textVariant);
    
    // Scale custom fontSize if present
    if (typeof flatStyle.fontSize === 'number') {
      scaledStyle.fontSize = Math.round(flatStyle.fontSize * ArabicFontScaling[category] * 10) / 10;
    }
    
    // Scale custom lineHeight if present
    if (typeof flatStyle.lineHeight === 'number') {
      scaledStyle.lineHeight = Math.round(flatStyle.lineHeight * ArabicFontScaling[category]);
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
