import React from "react";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon, IconName } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { BorderRadius } from "@/constants/theme";
import { applyOpacity } from "@/utils/statusStyles";

/** Shared typography for status labels, including titles in expired-visit notices. */
export const STATUS_BADGE_TEXT: TextStyle = {
  fontSize: 9,
  lineHeight: 12,
  fontWeight: "600",
};

export const STATUS_BADGE_CONTAINER: ViewStyle = {
  alignSelf: "flex-start",
  alignItems: "center",
  maxWidth: "100%",
  flexShrink: 1,
  minHeight: 18,
  paddingHorizontal: 7,
  paddingVertical: 2,
  borderRadius: BorderRadius.sm,
  borderWidth: 1,
};

type StatusLabelBadgeProps = {
  label: string;
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: IconName;
  alignSelf?: "flex-start" | "center";
};

/** One visual treatment for read-only status pills, independent of status domain. */
export function StatusLabelBadge({
  label,
  color,
  backgroundColor,
  borderColor,
  icon,
  alignSelf = "flex-start",
}: StatusLabelBadgeProps) {
  return (
    <DirectionalRow
      style={[
        styles.badge,
        { alignSelf },
        {
          backgroundColor: backgroundColor ?? applyOpacity(color, "15"),
          borderColor: borderColor ?? applyOpacity(color, "30"),
        },
      ]}
      gap={icon ? 4 : 0}
    >
      {icon ? <DDIcon name={icon} size={12} color={color} /> : null}
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </DirectionalRow>
  );
}

const styles = StyleSheet.create({
  badge: STATUS_BADGE_CONTAINER,
  label: {
    ...STATUS_BADGE_TEXT,
    flexShrink: 1,
  },
});