import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { StatusAccent } from "@/components/shared/StatusBadge";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitorRequest } from "@/types/vms.types";
import { getStatusConfig, applyOpacity } from "@/utils/statusStyles";
import { useUpcomingIndicator } from "@/hooks/useUpcomingVisitTimer";
import {
  isUpcomingIndicatorEligibleStatus,
  UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES,
} from "@/constants/requestConstants";

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

const LAYOUT = {
  tableRowHeight: 110,
  tableFixedColumnWidth: 160,
  tableScrollColumnWidth: 200,
  cardRadius: BorderRadius.md,
};

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
  const { formatDateShort, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const statusConfig = getStatusConfig(theme, request.status, t);

  const eligible = isUpcomingIndicatorEligibleStatus(request.status);
  const isUpcoming = useUpcomingIndicator({
    visitDate: request.visitDate,
    visitTime: request.visitTime,
    eligible,
    thresholdMinutes: UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES,
  });

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return formatDateShort(date);
  };

  const formatTime = (timeString: string): string => {
    return formatTimeFromString(timeString);
  };

  const isPending = request.status === "pending_approval";
  const canApproveReject = isPending && !isExpired && onApprove && onReject;

  return (
    <ThemedView
      style={[
        styles.tableRow,
        { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: getFlexDirection(isRTL) },
      ]}
    >
      <StatusAccent color={statusConfig.borderColor} />

      {/* Fixed Column - Always Visible: Name & Time */}
      <Pressable
        onPress={onPress}
        android_ripple={{ color: applyOpacity(theme.primary, "10") }}
        style={[
          styles.fixedColumn,
          { width: LAYOUT.tableFixedColumnWidth },
        ]}
      >
        <View style={styles.fixedColumnContent}>
          <View style={{ flex: 1 }}>
            <DirectionalRow style={{ alignItems: "center", gap: 6 }}>
              <ThemedText
                style={[
                  Typography.body,
                  { fontWeight: "600", fontSize: 15, flexShrink: 1 },
                ]}
                numberOfLines={2}
              >
                {request.visitor?.fullName}
              </ThemedText>
              {isUpcoming ? (
                <View accessibilityLabel="Visit starts soon" accessibilityRole="image">
                  <DDIcon name="alert-circle" size={14} color={theme.error} />
                </View>
              ) : null}
              {request.isWalkIn ? (
                <DDIcon name="user-check" size={14} color={theme.warning} />
              ) : null}
            </DirectionalRow>
            <Spacer height={6} />
            <DirectionalRow style={{ alignItems: "center", gap: 4 }}>
              <DDIcon name="calendar" size={12} color={theme.textSecondary} />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
                {formatDate(request.visitDate)}
              </ThemedText>
            </DirectionalRow>
            <Spacer height={2} />
            <DirectionalRow style={{ alignItems: "center", gap: 4 }}>
              <DDIcon name="clock" size={12} color={theme.textSecondary} />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
                {formatTime(request.visitTime)}
              </ThemedText>
            </DirectionalRow>
          </View>
        </View>
      </Pressable>

      {/* Scrollable Columns - All Details */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.scrollableColumns}
        contentContainerStyle={styles.scrollableContent}
        persistentScrollbar={true}
        nestedScrollEnabled={true}
      >
          {/* Company Column */}
          <View
            style={[
              styles.tableColumn,
              { width: LAYOUT.tableScrollColumnWidth },
            ]}
          >
            <ThemedText
              style={[styles.columnHeader, { color: theme.textSecondary }]}
            >
              {t("form.company").toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ThemedText
              style={[styles.columnValue]}
              numberOfLines={2}
            >
              {request.visitor?.company || "—"}
            </ThemedText>
          </View>

          {/* Requested By Column */}
          <View
            style={[
              styles.tableColumn,
              { width: LAYOUT.tableScrollColumnWidth },
            ]}
          >
            <ThemedText
              style={[styles.columnHeader, { color: theme.textSecondary }]}
            >
              {t("dashboard.requestedBy").toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ThemedText
              style={[styles.columnValue]}
              numberOfLines={2}
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
          <View
            style={[
              styles.tableColumn,
              { width: LAYOUT.tableScrollColumnWidth },
            ]}
          >
            <ThemedText
              style={[styles.columnHeader, { color: theme.textSecondary }]}
            >
              {t("form.purpose").toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ThemedText
              style={[styles.columnValue]}
              numberOfLines={3}
            >
              {request.purpose || "—"}
            </ThemedText>
          </View>

          {/* Services Column */}
          <View
            style={[
              styles.tableColumn,
              { width: LAYOUT.tableScrollColumnWidth },
            ]}
          >
            <ThemedText
              style={[
                styles.columnHeader,
                {
                  writingDirection: isRTL ? "rtl" : "ltr",
                  color: theme.textSecondary,
                },
              ]}
            >
              {t("services.additionalServices").toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            {(request.parkingSlot || request.meetingRoom || request.buffet || request.valet || 
              request.isVisitorNeedsParking || request.isMeetingRoom || request.isBuffet) ? (
              <DirectionalRow style={{ gap: Spacing.xs }}>
                {(request.parkingSlot || request.isVisitorNeedsParking) && (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                    <DDIcon name="map-pin" size={14} color={theme.info} />
                  </View>
                )}
                {(request.meetingRoom || request.isMeetingRoom) && (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
                    <DDIcon name="briefcase" size={14} color={theme.secondary} />
                  </View>
                )}
                {(request.buffet || request.isBuffet) && (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
                    <DDIcon name="cloche" size={14} color={theme.warning} />
                  </View>
                )}
                {request.valet && (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
                    <DDIcon name="truck" size={14} color={theme.primary} />
                  </View>
                )}
              </DirectionalRow>
            ) : (
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>—</ThemedText>
            )}
          </View>

          {/* Actions/Status Column */}
          <View
            style={[
              styles.tableColumn,
              { width: LAYOUT.tableScrollColumnWidth },
            ]}
          >
            <ThemedText
              style={[styles.columnHeader, { color: theme.textSecondary }]}
            >
              {t("common.actions").toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
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
                  {
                    backgroundColor: statusConfig.bg,
                    borderColor: statusConfig.border,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.statusText, { color: statusConfig.text }]}
                >
                  {statusConfig.label}
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </ThemedView>
  );
}

const styles = StyleSheet.create({
  tableRow: {
    minHeight: LAYOUT.tableRowHeight,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  fixedColumn: {
    justifyContent: "center",
    borderEndWidth: 1,
    borderEndColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  fixedColumnContent: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.md,
  },
  scrollableColumns: {
    flex: 1,
  },
  scrollableContent: {
    paddingEnd: Spacing.xl,
  },
  tableColumn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  columnValue: {
    fontSize: 15,
    lineHeight: 22,
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
  servicePill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
  },
});

export default ApprovalRequestListRow;
