import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { getStatusConfig } from "@/utils/statusStyles";
import { StatusLabelBadge } from "@/components/shared/StatusLabelBadge";

interface RequestStatusBadgeProps {
  /** Raw status string from the API (e.g. 'pending_approval', 'checked_in'). */
  status: string;
  alignSelf?: "flex-start" | "center";
  /**
   * Optional translation function. When omitted the component calls
   * useTranslation() internally, so you never need to thread `t` down just
   * for the badge.
   */
  t?: (key: string) => string;
}

/**
 * Single-source status badge used on request/visitor cards and detail screens.
 * Geometry and typography come from StatusLabelBadge.
 */
export const RequestStatusBadge = ({ status, t: tProp, alignSelf }: RequestStatusBadgeProps) => {
  const { theme } = useTheme();
  const { t: tHook } = useTranslation();
  const t = tProp ?? tHook;

  const config = getStatusConfig(theme, status || 'pending', t);

  return (
    <StatusLabelBadge
      label={config.label}
      color={config.text}
      backgroundColor={config.bg}
      borderColor={config.border}
      alignSelf={alignSelf}
    />
  );
};
