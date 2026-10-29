import React from "react";
import { StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon, IconName } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { BorderRadius, containsArabic } from "@/constants/theme";
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
  const arabicLabel = containsArabic(label);
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
      {icon ? (
        arabicLabel ? (
          <View style={styles.icon}>
            <DDIcon name={icon} size={12} color={color} />
          </View>
        ) : <DDIcon name={icon} size={12} color={color} />
      ) : null}
      <ThemedText
        variant={arabicLabel ? "caption" : undefined}
        style={[styles.label, { color }, ...(arabicLabel ? [styles.arabicLabel] : [])]}
      >{label}</ThemedText>
    </DirectionalRow>
  );
}

const styles = StyleSheet.create({
  badge: STATUS_BADGE_CONTAINER,
  label: {
    ...STATUS_BADGE_TEXT,
    flexShrink: 1,
  },
  arabicLabel: {
    textAlignVertical: "center",
    // Center the font's visible Arabic glyphs, not only its line box.
    transform: [{ translateY: 1 }],
  },
  icon: {
    width: 12,
    height: 12,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});