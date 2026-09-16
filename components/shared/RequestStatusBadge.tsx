import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { getStatusConfig } from "@/utils/statusStyles";
import { BorderRadius } from "@/constants/theme";

interface RequestStatusBadgeProps {
  /** Raw status string from the API (e.g. 'pending_approval', 'checked_in'). */
  status: string;
  /**
   * Optional translation function. When omitted the component calls
   * useTranslation() internally, so you never need to thread `t` down just
   * for the badge.
   */
  t?: (key: string) => string;
}

/**
 * Single-source status badge used on every request/visitor card and detail
 * screen. Style spec: BorderRadius.sm · borderWidth 1 · padding 10/4 ·
 * fontSize 10 · fontWeight 600 · colours from getStatusConfig.
 */
export const RequestStatusBadge = ({ status, t: tProp }: RequestStatusBadgeProps) => {
  const { theme } = useTheme();
  const { t: tHook } = useTranslation();
  const t = tProp ?? tHook;

  const config = getStatusConfig(theme, status || 'pending', t);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <ThemedText style={[styles.text, { color: config.text }]}>
        {config.label}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: 9,
    fontWeight: '600',
  },
});
