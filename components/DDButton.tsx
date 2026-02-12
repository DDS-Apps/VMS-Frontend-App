import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  GestureResponderEvent,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Spacing,
  BorderRadius,
  FontFamily,
  getLocaleFontFamily,
} from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface DDButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function DDButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
  accessibilityLabel,
}: DDButtonProps) {
  const { theme, isDark } = useTheme();
  const { isRTL } = useLanguage();
  const scale = useSharedValue(1);

  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      opacity: isDisabled ? 0.5 : 1,
    };

    switch (variant) {
      case "primary":
        return {
          ...baseStyle,
          backgroundColor: theme.primary,
        };
      case "secondary":
        return {
          ...baseStyle,
          backgroundColor: theme.secondary,
        };
      case "outline":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: theme.primary,
        };
      case "ghost":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
        };
      case "danger":
        return {
          ...baseStyle,
          backgroundColor: theme.error,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case "primary":
      case "secondary":
        return {
          color: theme.buttonText,
        };
      case "danger":
        return {
          color: theme.buttonTextOnError,
        };
      case "outline":
        return {
          color: theme.primary,
        };
      case "ghost":
        return {
          color: theme.primary,
        };
      default:
        return {
          color: theme.buttonText,
        };
    }
  };

  const getSizeStyle = (): { button: ViewStyle; text: TextStyle } => {
    switch (size) {
      case "sm":
        return {
          button: {
            paddingVertical: Spacing.sm,
            paddingHorizontal: Spacing.lg,
            borderRadius: BorderRadius.sm,
          },
          text: {
            fontSize: 14,
            lineHeight: 25,
            fontFamily: getLocaleFontFamily(FontFamily.latinMedium, isRTL),
          },
        };
      case "lg":
        return {
          button: {
            paddingVertical: Spacing.lg,
            paddingHorizontal: Spacing.xxl,
            borderRadius: BorderRadius.lg,
          },
          text: {
            fontSize: 18,
            lineHeight: 32,
            fontFamily: getLocaleFontFamily(FontFamily.latinSemiBold, isRTL),
          },
        };
      case "md":
      default:
        return {
          button: {
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.xl,
            borderRadius: BorderRadius.pill,
          },
          text: {
            fontSize: 16,
            lineHeight: 30,
            fontFamily: getLocaleFontFamily(FontFamily.latinMedium, isRTL),
          },
        };
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isDisabled) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const sizeStyles = getSizeStyle();
  const buttonStyles = getButtonStyle();
  const textStyles = getTextStyle();

  const effectiveIconPosition = isRTL 
    ? (iconPosition === "left" ? "right" : "left")
    : iconPosition;

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textStyles.color}
          style={styles.loader}
        />
      ) : null}
      {!loading && icon && effectiveIconPosition === "left" ? (
        <Animated.View style={styles.iconStart}>{icon}</Animated.View>
      ) : null}
      <Text
        style={[
          styles.text,
          sizeStyles.text,
          textStyles,
          loading && styles.hiddenText,
          textStyle,
        ]}
      >
        {title}
      </Text>
      {!loading && icon && effectiveIconPosition === "right" ? (
        <Animated.View style={styles.iconEnd}>{icon}</Animated.View>
      ) : null}
    </>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.button,
        sizeStyles.button,
        buttonStyles,
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
      android_ripple={
        Platform.OS === "android" && !isDisabled
          ? {
              color: "rgba(255, 255, 255, 0.2)",
              borderless: false,
            }
          : undefined
      }
    >
      {renderContent()}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: Spacing.buttonHeight,
  },
  text: {
    textAlign: "center",
    fontWeight: "500",
  },
  hiddenText: {
    opacity: 0,
  },
  fullWidth: {
    width: "100%",
  },
  loader: {
    position: "absolute",
  },
  iconStart: {
    marginEnd: Spacing.sm,
  },
  iconEnd: {
    marginStart: Spacing.sm,
  },
});
