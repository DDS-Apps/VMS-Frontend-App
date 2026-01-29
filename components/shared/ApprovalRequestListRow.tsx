import React from "react";
import { View, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitorRequest } from "@/types/vms.types";
import { getStatusConfig, applyOpacity } from "@/utils/statusStyles";

interface ApprovalRequestListRowProps {
  request: VisitorRequest;
  onPress: () => void;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  approveLoading?: boolean;
  rejectLoading?: boolean;
  isExpired?: boolean;
}

export const COLUMN_WIDTHS = {
  visitor: 200,
  company: 150,
  requestedBy: 200,
  purpose: 120,
  services: 180,
  actions: 120,
};

export function ApprovalRequestListRow({
  request,
  onPress,
  showActions = false,
  onApprove,
  onReject,
  approveLoading = false,
  rejectLoading = false,
  isExpired = false,
}: ApprovalRequestListRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDateShort, formatTimeFromString, toLocalNumerals } = useFormatters();
  const { isRTL } = useLanguage();
  const statusConfig = getStatusConfig(theme, request.status, t);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return formatDateShort(date);
  };

  const formatTime = (timeString: string): string => {
    return formatTimeFromString(timeString);
  };

  const formatDuration = (durationStr: string): string => {
    const isoMatch = durationStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
    if (isoMatch) {
      const hours = isoMatch[1] ? parseInt(isoMatch[1], 10) : 0;
      const minutes = isoMatch[2] ? parseInt(isoMatch[2], 10) : 0;
      const parts: string[] = [];
      if (hours > 0) {
        const localHours = toLocalNumerals(hours.toString());
        parts.push(`${localHours} ${hours === 1 ? t('time.hour') : t('time.hours')}`);
      }
      if (minutes > 0) {
        const localMinutes = toLocalNumerals(minutes.toString());
        parts.push(`${localMinutes} ${minutes === 1 ? t('time.minute') : t('time.minutes')}`);
      }
      return parts.join(' ');
    }
    
    const hourMatch = durationStr.match(/(\d+)\s*hour/i);
    const minuteMatch = durationStr.match(/(\d+)\s*min/i);
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
    const parts: string[] = [];
    if (hours > 0) {
      const localHours = toLocalNumerals(hours.toString());
      parts.push(`${localHours} ${hours === 1 ? t('time.hour') : t('time.hours')}`);
    }
    if (minutes > 0) {
      const localMinutes = toLocalNumerals(minutes.toString());
      parts.push(`${localMinutes} ${minutes === 1 ? t('time.minute') : t('time.minutes')}`);
    }
    return parts.length > 0 ? parts.join(' ') : durationStr;
  };

  const getInitials = (name: string): string => {
    if (!name) return "?";
    const words = name.trim().split(" ").filter(Boolean);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const showParking = request.isVisitorNeedsParking === true || request.visitorNeedsParking === true || !!request.parkingSlot;
  const showMeetingRoom = request.isMeetingRoom === true || !!request.meetingRoom;
  const showBuffet = request.isBuffet === true || !!request.buffet;
  const showValet = !!request.valet;
  const hasServices = showParking || showMeetingRoom || showBuffet || showValet;

  const isPending = request.status === "pending_approval";
  const canApproveReject = isPending && !isExpired && onApprove && onReject;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: statusConfig.borderColor,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <DirectionalRow style={styles.row} alignItems="center">
        {/* Visitor Info Column */}
        <DirectionalRow style={[styles.column, { minWidth: COLUMN_WIDTHS.visitor }]} alignItems="center">
          <View
            style={[
              styles.avatar,
              { backgroundColor: applyOpacity(theme.primary, '15') },
            ]}
          >
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {getInitials(request.visitor?.fullName || "")}
            </ThemedText>
          </View>
          <View style={styles.visitorInfo}>
            <ThemedText
              style={[Typography.body, { color: theme.text, fontWeight: "600" }]}
              numberOfLines={1}
            >
              {request.visitor?.fullName}
            </ThemedText>
            <DirectionalRow style={styles.dateRow} alignItems="center">
              <DDIcon name="calendar" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, marginStart: Spacing.xs }]}>
                {formatDate(request.visitDate)}
              </ThemedText>
            </DirectionalRow>
            <DirectionalRow style={styles.timeRow} alignItems="center">
              <DDIcon name="clock" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, marginStart: Spacing.xs }]}>
                {formatTime(request.visitTime)}
              </ThemedText>
            </DirectionalRow>
          </View>
        </DirectionalRow>

        {/* Company Column */}
        <View style={[styles.column, { minWidth: COLUMN_WIDTHS.company }]}>
          <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
            {t("form.company")}
          </ThemedText>
          <ThemedText
            style={[Typography.bodySmall, { color: theme.text }]}
            numberOfLines={1}
          >
            {request.visitor?.company || "—"}
          </ThemedText>
        </View>

        {/* Requested By Column */}
        <View style={[styles.column, { minWidth: COLUMN_WIDTHS.requestedBy }]}>
          <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
            {t("dashboard.requestedBy")}
          </ThemedText>
          <ThemedText
            style={[Typography.bodySmall, { color: theme.text }]}
            numberOfLines={1}
          >
            {request.employeeName}
            {request.employeeDepartment && (
              <ThemedText style={{ color: theme.textSecondary }}>
                {" "}({request.employeeDepartment})
              </ThemedText>
            )}
          </ThemedText>
        </View>

        {/* Purpose Column */}
        <View style={[styles.column, { minWidth: COLUMN_WIDTHS.purpose }]}>
          <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
            {t("form.purpose")}
          </ThemedText>
          <ThemedText
            style={[Typography.bodySmall, { color: theme.text }]}
            numberOfLines={1}
          >
            {request.purpose || "—"}
          </ThemedText>
        </View>

        {/* Additional Services Column */}
        <View style={[styles.column, { minWidth: COLUMN_WIDTHS.services }]}>
          <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
            {t("services.additionalServices")}
          </ThemedText>
          {hasServices ? (
            <DirectionalRow style={styles.servicesRow}>
              {showParking && (
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                  <DDIcon name="map-pin" size={12} color={theme.info} />
                </View>
              )}
              {showMeetingRoom && (
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
                  <DDIcon name="briefcase" size={12} color={theme.secondary} />
                </View>
              )}
              {showBuffet && (
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
                  <DDIcon name="cloche" size={12} color={theme.warning} />
                </View>
              )}
              {showValet && (
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
                  <DDIcon name="truck" size={12} color={theme.primary} />
                </View>
              )}
            </DirectionalRow>
          ) : (
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              —
            </ThemedText>
          )}
        </View>

        {/* Actions/Status Column */}
        <View style={[styles.column, styles.actionsColumn, { minWidth: COLUMN_WIDTHS.actions }]}>
          {showActions && isExpired ? (
            <View style={[styles.expiredBanner, { backgroundColor: applyOpacity(theme.error, '10') }]}>
              <DDIcon name="alert-circle" size={14} color={theme.error} />
              <ThemedText style={[styles.expiredText, { color: theme.error }]}>
                {t("approval.visitExpired")}
              </ThemedText>
            </View>
          ) : showActions && canApproveReject ? (
            <ApprovalActionGroup
              onApprove={onApprove}
              onReject={onReject}
              approveLoading={approveLoading}
              rejectLoading={rejectLoading}
              size="small"
            />
          ) : (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 },
              ]}
            >
              <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                {statusConfig.label}
              </ThemedText>
            </View>
          )}
        </View>
      </DirectionalRow>
      </ScrollView>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: statusConfig.borderColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStartWidth: 4,
    overflow: "hidden",
    ...Platform.select({
      web: {
        cursor: "pointer" as any,
      },
    }),
  },
  scrollContent: {
    flexGrow: 1,
  },
  row: {
    padding: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
    flexWrap: "nowrap",
  },
  column: {
    flexShrink: 0,
  },
  columnHeader: {
    ...Typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: Spacing.sm,
  },
  avatarText: {
    ...Typography.body,
    fontWeight: "600",
  },
  visitorInfo: {
    flex: 1,
  },
  dateRow: {
    marginTop: Spacing.xs,
  },
  timeRow: {
    marginTop: 2,
  },
  dateTimeText: {
    ...Typography.caption,
  },
  servicesRow: {
    gap: Spacing.xs,
  },
  servicePill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  expiredText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  progressBar: {
    height: 3,
    width: "100%",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: "500",
  },
});

export default ApprovalRequestListRow;
