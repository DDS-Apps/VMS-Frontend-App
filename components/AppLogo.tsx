import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Image } from "expo-image";

import { useLocaleDirection } from "@/hooks/useLocaleDirection";

interface AppLogoProps {
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
  variant?: "horizontal" | "icon";
}

const LOGO_SIZES = {
  small: { width: 120, height: 40 },
  medium: { width: 180, height: 60 },
  large: { width: 280, height: 90 },
};

export function AppLogo({ size = "medium", style, variant = "horizontal" }: AppLogoProps) {
  const { isRTL } = useLocaleDirection();
  
  const dimensions = LOGO_SIZES[size];
  
  const logoSource = require("@/assets/images/logo.png");

  return (
    <View style={[styles.container, style]}>
      <Image
        source={logoSource}
        style={[styles.logo, { width: dimensions.width, height: dimensions.height }]}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    resizeMode: "contain",
  },
});
