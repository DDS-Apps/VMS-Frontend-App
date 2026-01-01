import React from "react";
import { StyleSheet, Pressable, View, ViewStyle, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SelectableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
  aspectRatio?: number;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SelectableCard({
  children,
  onPress,
  selected = false,
  style,
  aspectRatio = 1,
}: SelectableCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          aspectRatio,
          backgroundColor: theme.surface,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.primary : theme.border,
          shadowColor: isDark ? 'transparent' : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0 : 0.08,
          shadowRadius: 4,
          elevation: isDark ? 0 : 2,
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

export const CardGridStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'space-between',
    gap: Platform.OS === 'web' ? Spacing.md : undefined,
  },
  cardWrapper3Col: {
    width: Platform.OS === 'web' ? undefined : '31%',
    maxWidth: Platform.OS === 'web' ? 250 : undefined,
    maxHeight: Platform.OS === 'web' ? 250 : undefined,
    minWidth: Platform.OS === 'web' ? 150 : undefined,
    flexGrow: Platform.OS === 'web' ? 0 : undefined,
    flexBasis: Platform.OS === 'web' ? 'auto' : undefined,
    marginBottom: Spacing.md,
  },
  cardWrapper2Col: {
    width: Platform.OS === 'web' ? undefined : '48%',
    maxWidth: Platform.OS === 'web' ? 250 : undefined,
    maxHeight: Platform.OS === 'web' ? 250 : undefined,
    minWidth: Platform.OS === 'web' ? 150 : undefined,
    flexGrow: Platform.OS === 'web' ? 0 : undefined,
    flexBasis: Platform.OS === 'web' ? 'auto' : undefined,
    marginBottom: Spacing.md,
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { width: 250, height: 250 } : {}),
  },
});
