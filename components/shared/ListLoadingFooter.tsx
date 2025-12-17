import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface ListLoadingFooterProps {
  isLoading: boolean;
}

export function ListLoadingFooter({ isLoading }: ListLoadingFooterProps) {
  const { theme } = useTheme();

  if (!isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
