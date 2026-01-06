import React from "react";
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { Theme } from "@/types/theme.types";

interface CardProps {
  elevation?: number;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated" | "outlined" | "soft";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const getBackgroundColorForElevation = (
  elevation: number,
  theme: Theme,
): string => {
  switch (elevation) {
    case 1:
      return theme.backgroundDefault;
    case 2:
      return theme.backgroundSecondary;
    case 3:
      return theme.backgroundTertiary;
    default:
      return theme.backgroundRoot;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ 
  elevation = 1, 
  onPress, 
  children, 
  style,
  variant = "default" 
}: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: theme.surface,
          borderWidth: 0,
        };
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: theme.border,
        };
      case "soft":
        return {
          backgroundColor: theme.softOrange,
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: getBackgroundColorForElevation(elevation, theme),
          borderWidth: 1,
          borderColor: theme.border,
        };
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const cardStyle = getCardStyle();

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          cardStyle,
          animatedStyle,
          style,
        ]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
});
