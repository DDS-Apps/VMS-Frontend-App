import React from "react";
import { ThemedText } from "@/components/ThemedText";
import { Typography, Spacing } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { formatActiveDateRange } from "@/utils/activeDateRangeLabel";

type DateValue = Date | string | null | undefined;

/** Shows the applied calendar range next to a date control, never an unselected range. */
export function ActiveDateRangeLabel({
  startDate,
  endDate,
}: {
  startDate: DateValue;
  endDate?: DateValue;
}) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { theme } = useTheme();
  if (!startDate) return null;
  const label = formatActiveDateRange(startDate, endDate ?? startDate, isRTL, t("common.from"), t("common.to"));
  if (!label) return null;

  return (
    <ThemedText
      style={[Typography.caption, { color: theme.textSecondary, marginStart: Spacing.sm, flexShrink: 1, alignSelf: "center" }]}
      accessibilityLabel={label}
    >
      {label}
    </ThemedText>
  );
}