import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Typography, FontFamily } from "@/constants/theme";

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

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: TextVariant;
  variant?: TextVariant;
  color?: string;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type,
  variant,
  color,
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();
  const { isRTL } = useLanguage();

  const textVariant = variant || type || "body";
  
  const writingDirection = isRTL ? 'rtl' : 'ltr';

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

  const getTypeStyle = () => {
    switch (textVariant) {
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "bodyL":
        return Typography.bodyL;
      case "body":
        return Typography.body;
      case "bodySmall":
        return Typography.bodySmall;
      case "caption":
        return Typography.caption;
      case "label":
        return Typography.label;
      case "link":
        return {
          ...Typography.body,
          fontFamily: FontFamily.latinMedium,
        };
      default:
        return Typography.body;
    }
  };

  return (
    <Text 
      style={[
        { color: getColor(), writingDirection }, 
        getTypeStyle(), 
        style
      ]} 
      {...rest} 
    />
  );
}
