import React from "react";
import { IconName } from "@/components/DDIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { applyOpacity } from "@/utils/statusStyles";
import { StatusLabelBadge } from "@/components/shared/StatusLabelBadge";

/** Classification label that shares the compact request-status badge styling. */
export function WalkInVisitorBadge({ icon }: { icon?: IconName }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <StatusLabelBadge
      label={t("reception.walkInVisitor")}
      color={theme.warning}
      backgroundColor={applyOpacity(theme.warning, "15")}
      borderColor={applyOpacity(theme.warning, "30")}
      icon={icon}
    />
  );
}