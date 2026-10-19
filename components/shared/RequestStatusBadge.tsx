import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { getStatusConfig } from "@/utils/statusStyles";
import { StatusLabelBadge } from "@/components/shared/StatusLabelBadge";
import { getVisitTimelinePresentation, timelinePresentationLabel, type TimelinePresentationSource } from "@/utils/visitTimelinePresentation";

interface RequestStatusBadgeProps {
  /** Raw status string from the API (e.g. 'pending_approval', 'checked_in'). */
  status: string;
  /** Detail-only presentation. List badges must not fetch history per row. */
  presentationSource?: TimelinePresentationSource;
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
export const RequestStatusBadge = ({ status, presentationSource, t: tProp, alignSelf }: RequestStatusBadgeProps) => {
  const { theme } = useTheme();
  const { t: tHook } = useTranslation();
  const t = tProp ?? tHook;

  const config = getStatusConfig(theme, status || 'pending', t);
  const override = presentationSource
    ? getVisitTimelinePresentation(status, presentationSource)?.statusLabelOverride : undefined;

  return (
    <StatusLabelBadge
      label={override != null ? timelinePresentationLabel(override, t) : config.label}
      color={config.text}
      backgroundColor={config.bg}
      borderColor={config.border}
      alignSelf={alignSelf}
    />
  );
};
