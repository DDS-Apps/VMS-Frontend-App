import React from "react";
import { View, StyleSheet } from "react-native";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import type { Theme } from "@/types/theme.types";

interface StatusIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md';
}

export const StatusIcon = React.memo(({ icon, color, size = 'sm' }: StatusIconProps) => {
  const isSmall = size === 'sm';
  const containerSize = isSmall ? 20 : 24;
  const iconSize = isSmall ? 12 : 14;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: applyOpacity(color, '18'),
        },
      ]}
    >
      <DDIcon name={icon as any} size={iconSize} color={color} />
    </View>
  );
});

interface StatusDotProps {
  color: string;
  size?: number;
}

export const StatusDot = React.memo(({ color, size = 8 }: StatusDotProps) => (
  <View
    style={[
      styles.dot,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      },
    ]}
  />
));

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    // Color and size applied inline
  },
});
