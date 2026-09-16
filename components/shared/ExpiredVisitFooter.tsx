import React from "react";
import { View, StyleSheet } from "react-native";
import { DDIcon } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { DirectionalRow } from "@/components/DirectionalRow";
import { Spacing, Typography } from "@/constants/theme";
import type { Theme } from "@/types/theme.types";

interface ExpiredVisitFooterProps {
  theme: Theme;
  t: (key: string) => string;
}

/**
 * Shared contents for the sticky expired-visit footer used by the receptionist
 * and manager detail screens. The screen owns the sticky/safe-area wrapper so
 * it can measure the complete footer and reserve that exact height in its
 * scroll view.
 */
export function ExpiredVisitFooter({ theme, t }: ExpiredVisitFooterProps) {
  return (
    <View style={styles.notice}>
      <DirectionalRow style={styles.titleRow}>
        <DDIcon name="alert-circle" size={16} color={theme.warning} />
        <ThemedText
          style={[
            Typography.caption,
            {
              color: theme.warning,
              fontWeight: "600",
              textAlign: "center",
            },
          ]}
        >
          {t("status.visitExpired")}
        </ThemedText>
      </DirectionalRow>
      <ThemedText
        style={[
          Typography.caption,
          {
            color: theme.textSecondary,
            textAlign: "center",
            marginTop: 2,
            fontSize: 12,
          },
        ]}
      >
        {t("errors.visitDatePassed")}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  titleRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
});