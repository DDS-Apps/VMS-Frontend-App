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
  backgroundColor?: string;
  borderColor?: string;
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
  backgroundColor,
  borderColor,
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

  const cardBackgroundColor = backgroundColor ?? theme.surface;
  const cardBorderColor = borderColor ?? (selected ? theme.primary : theme.border);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          aspectRatio,
          backgroundColor: cardBackgroundColor,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.primary : cardBorderColor,
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

const isWeb = Platform.OS === 'web';

const mobileStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.sm,
  },
  cardWrapper3Col: {
    width: '50%',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardWrapper2Col: {
    width: '50%',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
});

const webStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  cardWrapper3Col: {
    width: 150,
    height: 150,
  },
  cardWrapper2Col: {
    width: 150,
    height: 150,
  },
});

export const CardGridStyles = StyleSheet.create({
  grid: mobileStyles.grid,
  gridWeb: webStyles.grid,
  cardWrapper3Col: mobileStyles.cardWrapper3Col,
  cardWrapper3ColWeb: webStyles.cardWrapper3Col,
  cardWrapper2Col: mobileStyles.cardWrapper2Col,
  cardWrapper2ColWeb: webStyles.cardWrapper2Col,
});

export const getGridStyle = (_isRTL: boolean = false) => ({
  ...(isWeb ? webStyles.grid : mobileStyles.grid),
  flexDirection: 'row' as const,
});
export const getCardWrapper3ColStyle = () => isWeb ? webStyles.cardWrapper3Col : mobileStyles.cardWrapper3Col;
export const getCardWrapper2ColStyle = () => isWeb ? webStyles.cardWrapper2Col : mobileStyles.cardWrapper2Col;

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
