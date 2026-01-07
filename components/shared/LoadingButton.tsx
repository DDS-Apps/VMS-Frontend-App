import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, View, TextStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { DDIcon, IconName } from "@/components/DDIcon";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-outline" | "warning-outline" | "success";
type ButtonSize = "small" | "medium" | "large";

interface LoadingButtonProps {
  onPress?: () => void;
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  loadingText?: string;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number; iconSize: number }> = {
  small: { height: 36, paddingHorizontal: Spacing.md, fontSize: 14, iconSize: 16 },
  medium: { height: 44, paddingHorizontal: Spacing.lg, fontSize: 16, iconSize: 18 },
  large: { height: 52, paddingHorizontal: Spacing.xl, fontSize: 18, iconSize: 20 },
};

export const LoadingButton = ({
  onPress,
  children,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "medium",
  icon,
  iconPosition = "left",
  fullWidth = true,
  style,
  textStyle,
  loadingText,
}: LoadingButtonProps) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;
  const sizeStyle = sizeStyles[size];

  const getVariantStyles = (): { bg: string; text: string; border?: string } => {
    switch (variant) {
      case "primary":
        return {
          bg: theme.primary,
          text: theme.buttonText,
        };
      case "secondary":
        return {
          bg: theme.surfaceSecondary,
          text: theme.primary,
        };
      case "outline":
        return {
          bg: "transparent",
          text: theme.primary,
          border: theme.primary,
        };
      case "ghost":
        return {
          bg: "transparent",
          text: theme.primary,
        };
      case "danger":
        return {
          bg: theme.error,
          text: theme.buttonTextOnError,
        };
      case "danger-outline":
        return {
          bg: "transparent",
          text: theme.error,
          border: theme.error,
        };
      case "warning-outline":
        return {
          bg: "transparent",
          text: theme.warning,
          border: theme.warning,
        };
      case "success":
        return {
          bg: theme.success,
          text: '#FFFFFF',
        };
      default:
        return {
          bg: theme.primary,
          text: theme.buttonText,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isDisabled) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const renderContent = () => {
    const iconElement = icon && !loading ? (
      <View style={iconPosition === "left" ? { marginEnd: Spacing.sm } : { marginStart: Spacing.sm }}>
        <DDIcon
          name={icon}
          size={sizeStyle.iconSize}
          color={variantStyles.text}
        />
      </View>
    ) : null;

    const spinnerElement = loading ? (
      <View style={{ marginEnd: Spacing.sm }}>
        <LoadingSpinner 
          size="small" 
          color={variantStyles.text} 
          inline 
        />
      </View>
    ) : null;

    const displayText = loadingText && loading ? loadingText : children;

    return (
      <View style={styles.contentContainer}>
        {loading ? spinnerElement : (iconPosition === "left" ? iconElement : null)}
        <ThemedText
          style={[
            styles.buttonText,
            { color: variantStyles.text, fontSize: sizeStyle.fontSize },
            textStyle,
          ]}
        >
          {displayText}
        </ThemedText>
        {!loading && iconPosition === "right" ? iconElement : null}
      </View>
    );
  };

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          borderWidth: variantStyles.border ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
        animatedStyle,
      ]}
    >
      {renderContent()}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonText: {
    fontWeight: "600",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
