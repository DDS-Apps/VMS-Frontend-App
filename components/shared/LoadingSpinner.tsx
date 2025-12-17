import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

type SpinnerSize = "small" | "medium" | "large";

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
  inline?: boolean;
}

const sizeMap: Record<SpinnerSize, { spinner: number; border: number }> = {
  small: { spinner: 20, border: 2 },
  medium: { spinner: 32, border: 3 },
  large: { spinner: 48, border: 4 },
};

export const LoadingSpinner = ({
  size = "medium",
  color,
  message,
  style,
  inline = false,
}: LoadingSpinnerProps) => {
  const { theme } = useTheme();
  const rotation = useSharedValue(0);
  const spinnerColor = color || theme.primary;
  const dimensions = sizeMap[size];

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const spinner = (
    <Animated.View
      style={[
        styles.spinner,
        {
          width: dimensions.spinner,
          height: dimensions.spinner,
          borderWidth: dimensions.border,
          borderColor: `${spinnerColor}30`,
          borderTopColor: spinnerColor,
        },
        animatedStyle,
      ]}
    />
  );

  if (inline) {
    return spinner;
  }

  return (
    <View style={[styles.container, style]}>
      {spinner}
      {message ? (
        <ThemedText
          style={[styles.message, { color: theme.textSecondary }]}
        >
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  spinner: {
    borderRadius: 9999,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: 14,
    textAlign: "center",
  },
});
