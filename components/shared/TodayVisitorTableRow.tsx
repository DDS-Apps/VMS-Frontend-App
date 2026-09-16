import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { VisitorActionButton } from "@/components/VisitorActionButton";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStatusConfig, applyOpacity, getStatusIcon } from "@/utils/statusStyles";
import { getInitials } from "@/utils/formatters";
import type { TodayVisitorDto } from "@/types";

interface TodayVisitorTableRowProps {
  visitor: TodayVisitorDto;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  showCheckIn?: boolean;
  showCheckOut?: boolean;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  checkInLoading?: boolean;
  checkOutLoading?: boolean;
  isMutating?: boolean;
  variant?: "compact" | "full";
}

export function TodayVisitorTableRow({
  visitor,
  onPress,
  onEdit,
  onDelete,
  showActions = true,
  showCheckIn = false,
  showCheckOut = false,
  onCheckIn,
  onCheckOut,
  checkInLoading = false,
  checkOutLoading = false,
  isMutating = false,
  variant = "full",
}: TodayVisitorTableRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString, formatDateShort } = useFormatters();
  const { isRTL } = useLanguage();

  const statusConfig = getStatusConfig(theme, visitor.status, t);
  const visitorName = visitor.visitor.fullName;
  const initials = getInitials(visitorName);

  // "In Time" shows scheduled time (visitTime). If status is checked_in or
  // checked_out, we could show an actual check-in time if backend provided it.
  // For now, always show scheduled time per requirements.
  const inTimeDisplay = formatTimeFromString(visitor.visitTime);

  // "Out Time" – only show if checked_out (actual) or if checked_in with end time.
  // TodayVisitorDto currently does not carry actual checkedOutAt or scheduled endTime.
  // We show "-" for anything not checked_out.
  const outTimeDisplay =
    visitor.status === "checked_out" ? formatTimeFromString(visitor.visitTime) : "-";

  const dateDisplay = formatDateShort(new Date());

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Left accent bar */}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: statusConfig.border },
        ]}
      />

      <View style={styles.content}>
        {/* Header row: avatar + name + status + company */}
        <DirectionalRow style={styles.headerRow} alignItems="center" gap={Spacing.sm}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, "15") }]}>
            <ThemedText
              style={[styles.avatarText, { color: theme.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {initials}
            </ThemedText>
          </View>

          <View style={styles.nameColumn}>
            <ThemedText style={[styles.visitorName, { color: theme.text }]} numberOfLines={1}>
              {visitorName}
            </ThemedText>
            <ThemedText style={[styles.companyText, { color: theme.textSecondary }]} numberOfLines={1}>
              {visitor.visitor.company ?? visitor.hostName ?? ""}
            </ThemedText>
          </View>

          <View style={styles.statusWrapper}>
            <DDIcon
              name={getStatusIcon(visitor.status)}
              size={16}
              color={statusConfig.text}
            />
          </View>
        </DirectionalRow>

        {/* Data row: Date | Name | In Time | Out Time | Actions */}
        <DirectionalRow
          style={styles.dataRow}
          alignItems="center"
          gap={Spacing.sm}
        >
          {/* Date column */}
          <View style={styles.colDate}>
            <ThemedText style={[styles.colLabel, { color: theme.textSecondary }]}>
              {t("visitor.date")}
            </ThemedText>
            <ThemedText style={[styles.colValue, { color: theme.text }]} numberOfLines={1}>
              {dateDisplay}
            </ThemedText>
          </View>

          {/* Name column */}
          <View style={styles.colName}>
            <ThemedText style={[styles.colLabel, { color: theme.textSecondary }]}>
              {t("visitor.name")}
            </ThemedText>
            <ThemedText style={[styles.colValue, { color: theme.text }]} numberOfLines={1}>
              {visitorName}
            </ThemedText>
          </View>

          {/* In Time column */}
          <View style={styles.colTime}>
            <ThemedText style={[styles.colLabel, { color: theme.textSecondary }]}>
              {t("visitor.inTime")}
            </ThemedText>
            <DirectionalRow alignItems="center" gap={4}>
              <DDIcon name="log-in" size={12} color={theme.success} />
              <ThemedText style={[styles.colValue, { color: theme.text }]} numberOfLines={1}>
                {inTimeDisplay}
              </ThemedText>
            </DirectionalRow>
          </View>

          {/* Out Time column */}
          <View style={styles.colTime}>
            <ThemedText style={[styles.colLabel, { color: theme.textSecondary }]}>
              {t("visitor.outTime")}
            </ThemedText>
            <DirectionalRow alignItems="center" gap={4}>
              <DDIcon name="log-out" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.colValue, { color: theme.text }]} numberOfLines={1}>
                {outTimeDisplay}
              </ThemedText>
            </DirectionalRow>
          </View>

          {/* Actions column */}
          {showActions && (
            <View style={styles.colActions}>
              {showCheckIn ? (
                <VisitorActionButton
                  type="check_in"
                  onPress={onCheckIn}
                  loading={checkInLoading}
                  disabled={isMutating && !checkInLoading}
                />
              ) : showCheckOut ? (
                <VisitorActionButton
                  type="check_out"
                  onPress={onCheckOut}
                  loading={checkOutLoading}
                  disabled={isMutating && !checkOutLoading}
                />
              ) : (
                <DirectionalRow alignItems="center" gap={Spacing.xs}>
                  {onEdit && (
                    <Pressable
                      onPress={onEdit}
                      style={[styles.iconBtn, { backgroundColor: applyOpacity(theme.primary, "12") }]}
                    >
                      <DDIcon name="edit-2" size={14} color={theme.primary} />
                    </Pressable>
                  )}
                  {onDelete && (
                    <Pressable
                      onPress={onDelete}
                      style={[styles.iconBtn, { backgroundColor: applyOpacity(theme.error, "12") }]}
                    >
                      <DDIcon name="trash-2" size={14} color={theme.error} />
                    </Pressable>
                  )}
                </DirectionalRow>
              )}
            </View>
          )}
        </DirectionalRow>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: Spacing.md,
    minHeight: 100,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingStart: Spacing.lg,
    justifyContent: "center",
    gap: Spacing.sm,
  },
  headerRow: {
    marginBottom: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  nameColumn: {
    flex: 1,
    justifyContent: "center",
  },
  visitorName: {
    fontSize: 14,
    fontWeight: "600",
  },
  companyText: {
    fontSize: 11,
    marginTop: 1,
  },
  statusWrapper: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  dataRow: {
    flexWrap: "wrap",
    marginTop: 2,
  },
  colDate: {
    minWidth: 70,
    flex: 1,
  },
  colName: {
    minWidth: 100,
    flex: 2,
  },
  colTime: {
    minWidth: 60,
    flex: 1,
  },
  colActions: {
    minWidth: 80,
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  colLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
