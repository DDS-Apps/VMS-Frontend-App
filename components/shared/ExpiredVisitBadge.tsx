import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { applyOpacity } from "@/utils/statusStyles";
import { StatusLabelBadge } from "@/components/shared/StatusLabelBadge";

/** Read-only expiration label; does not replace or change the request status. */
export function ExpiredVisitBadge({ alignSelf }: { alignSelf?: "flex-start" | "center" }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <StatusLabelBadge
      label={t("status.visitExpired")}
      color={theme.error}
      backgroundColor={applyOpacity(theme.error, "10")}
      icon="alert-circle"
      alignSelf={alignSelf}
    />
  );
}