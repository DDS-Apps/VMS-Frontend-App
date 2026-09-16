/**
 * VisitorMatrixTable
 *
 * Renders a list of visitor rows with a fixed left "name / date / time" column
 * plus horizontally-scrollable labelled columns:
 *   Planned Out · Company · Requested By · Purpose · Services · Status
 *
 * Status labels: Checked In · Checked Out · To Be Checked (pending/expected/approved)
 */
import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { StatusAccent, RequestStatusBadge } from "@/components/shared";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStatusConfig, applyOpacity } from "@/utils/statusStyles";
import { formatVisitDateLabel } from "@/utils/groupVisitsByDate";
import { getPurposeLabel } from "@/constants/requestConstants";

export interface VisitorMatrixItem {
  id: string;
  visitorName: string;
  company?: string;
  visitDate?: string;
  plannedInTime: string;
  plannedOutTime?: string;
  status: string;
  actualInTime?: string;
  actualOutTime?: string;
  hasParking?: boolean;
  hasBuffet?: boolean;
  hasValet?: boolean;
  hasMeetingRoom?: boolean;
  /** Host / requested-by name */
  hostName?: string;
  /** Host department */
  hostDepartment?: string;
  /** Visit purpose */
  purpose?: string;
  /** Contact email, shown in an optional Contact column */
  email?: string;
  /** Contact phone, shown in an optional Contact column */
  phone?: string;
  /** Whether this pending request's approval window has expired */
  isExpired?: boolean;
  /** Explicit permission to show approval actions, overriding status-name inference */
  canApproveReject?: boolean;
  /** Location label, used by non-visitor listings (e.g. buffet requests) when columns="simple" */
  location?: string;
  /** Optional caption shown under the name in the frozen column (e.g. requester's department) */
  visitorSubtitle?: string;
}

interface VisitorMatrixTableProps {
  visitors: VisitorMatrixItem[];
  onPressRow?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCheckIn?: (id: string) => void;
  onCheckOut?: (id: string) => void;
  checkInLoadingId?: string;
  checkOutLoadingId?: string;
  isMutating?: boolean;
  emptyMessage?: string;
  showEditDelete?: boolean;
  showCheckActions?: boolean;
  /** Show Approve / Reject actions for pending items (falls back to an expired banner or status badge) */
  showApproveReject?: boolean;
  /** Show the expired banner for read-only rows without enabling approval actions */
  showExpiredState?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  approveLoadingId?: string;
  rejectLoadingId?: string;
  /** When true, tapping a row toggles selection instead of navigating */
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onLongPressRow?: (id: string) => void;
  /** Unused — kept for API compatibility */
  showDate?: boolean;
  /**
   * "card" (default) — the original stacked-card rows, each repeating its own column labels.
   * "matrix" — a single header row shared by every data row below it, like a spreadsheet.
   * Rolling out screen-by-screen; new screens should opt into "matrix".
   */
  variant?: "card" | "matrix";
  /**
   * "visitor" (default) — the full visitor-domain column set (schedule, actual in/out, company, etc).
   * "simple" — Date + Location + Status/Actions, for compact listings (e.g. buffet requests) that
   * don't have visitor-specific fields. Only supported with variant="matrix".
   */
  columns?: "visitor" | "simple";
  /** Overrides the frozen column header label (defaults to "Visitor Name"). */
  nameColumnLabel?: string;
}

const LAYOUT = {
  rowMinHeight: 110,
  fixedColWidth: 160,
  scrollColWidth: 170,
  matrixColWidth: 170,
  matrixRowMinHeight: 68,
};

function MatrixRow({
  item,
  onPressRow,
  onEdit,
  onDelete,
  onCheckIn,
  onCheckOut,
  checkInLoadingId,
  checkOutLoadingId,
  isMutating,
  showEditDelete,
  showCheckActions,
}: {
  item: VisitorMatrixItem;
  onPressRow?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCheckIn?: (id: string) => void;
  onCheckOut?: (id: string) => void;
  checkInLoadingId?: string;
  checkOutLoadingId?: string;
  isMutating?: boolean;
  showEditDelete?: boolean;
  showCheckActions?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString, formatDateShort } = useFormatters();
  const { isRTL } = useLanguage();

  const statusConfig = getStatusConfig(theme, item.status, t);

  const canCheckIn =
    showCheckActions &&
    (item.status === "visitor_accepted" ||
      item.status === "approved" ||
      item.status === "expected");
  const canCheckOut = showCheckActions && item.status === "checked_in";

  const isCheckInLoading = checkInLoadingId === item.id;
  const isCheckOutLoading = checkOutLoadingId === item.id;
  const isThisLoading = isCheckInLoading || isCheckOutLoading;
  const otherMutating = isMutating && !isThisLoading;

  const formatTime = (val?: string) => {
    if (!val) return "—";
    if (val.includes("T") || val.includes("Z")) {
      const d = new Date(val);
      return isNaN(d.getTime())
        ? "—"
        : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    return formatTimeFromString(val) || "—";
  };

  const dateLabel = item.visitDate
    ? formatDateShort(new Date(item.visitDate))
    : "—";

  const hasServices =
    item.hasParking || item.hasBuffet || item.hasValet || item.hasMeetingRoom;

  return (
    <ThemedView
      style={[
        styles.row,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          flexDirection: getFlexDirection(isRTL),
        },
      ]}
    >
      <StatusAccent color={statusConfig.borderColor} />

      {/* Fixed column — name / date / time */}
      <Pressable
        onPress={() => onPressRow?.(item.id)}
        android_ripple={{ color: applyOpacity(theme.primary, "10") }}
        style={[styles.fixedCol, { width: LAYOUT.fixedColWidth }]}
      >
        <View style={styles.fixedColContent}>
          <ThemedText
            style={[Typography.body, { fontWeight: "600", fontSize: 15 }]}
            numberOfLines={2}
          >
            {item.visitorName}
          </ThemedText>
          {item.visitorSubtitle ? (
            <ThemedText
              style={[Typography.caption, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {item.visitorSubtitle}
            </ThemedText>
          ) : null}
          <Spacer height={6} />
          <DirectionalRow style={{ alignItems: "center", gap: 4 }}>
            <DDIcon name="calendar" size={12} color={theme.textSecondary} />
            <ThemedText
              style={[Typography.caption, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {dateLabel}
            </ThemedText>
          </DirectionalRow>
          <Spacer height={2} />
          <DirectionalRow style={{ alignItems: "center", gap: 4 }}>
            <DDIcon name="clock" size={12} color={theme.textSecondary} />
            <ThemedText
              style={[Typography.caption, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {formatTime(item.plannedInTime)}
            </ThemedText>
          </DirectionalRow>
        </View>
      </Pressable>

      {/* Scrollable columns */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        persistentScrollbar={true}
        nestedScrollEnabled={true}
      >
        {/* Planned Out */}
        <View style={[styles.col, { width: LAYOUT.scrollColWidth }]}>
          <ThemedText style={[styles.colHeader, { color: theme.textSecondary }]}>
            {t("visitor.plannedOut").toUpperCase()}
          </ThemedText>
          <Spacer height={10} />
          <ThemedText style={styles.colValue} numberOfLines={1}>
            {formatTime(item.plannedOutTime)}
          </ThemedText>
        </View>

        {/* Company */}
        <View style={[styles.col, { width: LAYOUT.scrollColWidth }]}>
          <ThemedText style={[styles.colHeader, { color: theme.textSecondary }]}>
            {t("form.company").toUpperCase()}
          </ThemedText>
          <Spacer height={10} />
          <ThemedText style={styles.colValue} numberOfLines={2}>
            {item.company || "—"}
          </ThemedText>
        </View>

        {/* Requested By */}
        {item.hostName ? (
          <View style={[styles.col, { width: LAYOUT.scrollColWidth }]}>
            <ThemedText style={[styles.colHeader, { color: theme.textSecondary }]}>
              {t("dashboard.requestedBy").toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ThemedText style={styles.colValue} numberOfLines={2}>
              {item.hostName}
              {item.hostDepartment ? (
                <ThemedText style={{ color: theme.textSecondary }}>
                  {" "}({item.hostDepartment})
                </ThemedText>
              ) : null}
            </ThemedText>
          </View>
        ) : null}

        {/* Purpose */}
        {item.purpose ? (
          <View style={[styles.col, { width: LAYOUT.scrollColWidth }]}>
            <ThemedText style={[styles.colHeader, { color: theme.textSecondary }]}>
              {t("form.purpose").toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ThemedText style={styles.colValue} numberOfLines={2}>
              {getPurposeLabel(item.purpose, t)}
            </ThemedText>
          </View>
        ) : null}

        {/* Additional Services */}
        <View style={[styles.col, { width: LAYOUT.scrollColWidth }]}>
          <ThemedText style={[styles.colHeader, { color: theme.textSecondary }]}>
            {t("services.additionalServices").toUpperCase()}
          </ThemedText>
          <Spacer height={10} />
          {hasServices ? (
            <DirectionalRow style={{ gap: Spacing.xs }}>
              {item.hasParking ? (
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, "20") }]}>
                  <DDIcon name="map-pin" size={14} color={theme.info} />
                </View>
              ) : null}
              {item.hasMeetingRoom ? (
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, "20") }]}>
                  <DDIcon name="briefcase" size={14} color={theme.secondary} />
                </View>
              ) : null}
              {item.hasBuffet ? (
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, "20") }]}>
                  <DDIcon name="cloche" size={14} color={theme.warning} />
                </View>
              ) : null}
              {item.hasValet ? (
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, "20") }]}>
                  <DDIcon name="truck" size={14} color={theme.primary} />
                </View>
              ) : null}
            </DirectionalRow>
          ) : (
            <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>—</ThemedText>
          )}
        </View>

        {/* Status / Actions */}
        <View style={[styles.col, { width: LAYOUT.scrollColWidth }]}>
          <ThemedText style={[styles.colHeader, { color: theme.textSecondary }]}>
            {showCheckActions || showEditDelete
              ? t("common.actions").toUpperCase()
              : t("common.status").toUpperCase()}
          </ThemedText>
          <Spacer height={10} />

          {canCheckIn ? (
            <Pressable
              onPress={() => onCheckIn?.(item.id)}
              disabled={otherMutating}
              style={[
                styles.actionBtn,
                { backgroundColor: applyOpacity(theme.success, "18"), opacity: otherMutating ? 0.4 : 1 },
              ]}
            >
              {isCheckInLoading ? (
                <ActivityIndicator size={12} color={theme.success} />
              ) : (
                <>
                  <DDIcon name="log-in" size={13} color={theme.success} />
                  <ThemedText style={[styles.actionBtnText, { color: theme.success }]}>
                    {t("visitor.checkIn")}
                  </ThemedText>
                </>
              )}
            </Pressable>
          ) : canCheckOut ? (
            <Pressable
              onPress={() => onCheckOut?.(item.id)}
              disabled={otherMutating}
              style={[
                styles.actionBtn,
                { backgroundColor: applyOpacity(theme.textSecondary, "15"), opacity: otherMutating ? 0.4 : 1 },
              ]}
            >
              {isCheckOutLoading ? (
                <ActivityIndicator size={12} color={theme.textSecondary} />
              ) : (
                <>
                  <DDIcon name="log-out" size={13} color={theme.textSecondary} />
                  <ThemedText style={[styles.actionBtnText, { color: theme.textSecondary }]}>
                    {t("visitor.checkOut")}
                  </ThemedText>
                </>
              )}
            </Pressable>
          ) : showEditDelete ? (
            <DirectionalRow style={{ gap: Spacing.xs }}>
              {onEdit ? (
                <Pressable
                  onPress={() => onEdit(item.id)}
                  style={[styles.iconBtn, { backgroundColor: applyOpacity(theme.primary, "12") }]}
                >
                  <DDIcon name="edit-2" size={13} color={theme.primary} />
                </Pressable>
              ) : null}
              {onDelete ? (
                <Pressable
                  onPress={() => onDelete(item.id)}
                  style={[styles.iconBtn, { backgroundColor: applyOpacity(theme.error, "12") }]}
                >
                  <DDIcon name="trash-2" size={13} color={theme.error} />
                </Pressable>
              ) : null}
            </DirectionalRow>
          ) : (
            <RequestStatusBadge status={item.status} />
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

/** Formats a planned/actual time value the same way MatrixRow does, without needing hooks. */
function formatMatrixCellTime(val: string | undefined, formatTimeFromString: (v: string) => string): string {
  if (!val) return "—";
  if (val.includes("T") || val.includes("Z")) {
    const d = new Date(val);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  return formatTimeFromString(val) || "—";
}

function formatScheduleRange(
  item: VisitorMatrixItem,
  formatTimeFromString: (v: string) => string,
  timeRangeTo: string,
): string {
  const start = formatMatrixCellTime(item.plannedInTime, formatTimeFromString);
  if (start === "—") return "—";
  if (!item.plannedOutTime) return start;
  const end = formatMatrixCellTime(item.plannedOutTime, formatTimeFromString);
  if (end === "—") return start;
  return `${start} ${timeRangeTo} ${end}`;
}

function MatrixServiceIcons({ item }: { item: VisitorMatrixItem }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const hasServices = item.hasParking || item.hasBuffet || item.hasValet || item.hasMeetingRoom;

  if (!hasServices) {
    return <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>—</ThemedText>;
  }

  return (
    <DirectionalRow style={{ gap: Spacing.xs }}>
      {item.hasParking ? (
        <View
          accessible
          accessibilityLabel={t("services.parking")}
          style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, "20") }]}
        >
          <DDIcon name="map-pin" size={14} color={theme.info} />
        </View>
      ) : null}
      {item.hasMeetingRoom ? (
        <View
          accessible
          accessibilityLabel={t("services.meetingRoom")}
          style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, "20") }]}
        >
          <DDIcon name="briefcase" size={14} color={theme.secondary} />
        </View>
      ) : null}
      {item.hasBuffet ? (
        <View
          accessible
          accessibilityLabel={t("services.buffet")}
          style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, "20") }]}
        >
          <DDIcon name="cloche" size={14} color={theme.warning} />
        </View>
      ) : null}
      {item.hasValet ? (
        <View
          accessible
          accessibilityLabel={t("services.valet")}
          style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, "20") }]}
        >
          <DDIcon name="truck" size={14} color={theme.primary} />
        </View>
      ) : null}
    </DirectionalRow>
  );
}

function MatrixContactCell({ item }: { item: VisitorMatrixItem }) {
  const { theme } = useTheme();
  if (!item.email && !item.phone) {
    return <ThemedText style={[styles.matrixCellValue, { color: theme.textSecondary }]}>—</ThemedText>;
  }
  return (
    <View style={{ gap: 4 }}>
      {item.email ? (
        <DirectionalRow style={{ alignItems: "center", gap: 6 }}>
          <DDIcon name="mail" size={13} color={theme.textSecondary} />
          <ThemedText style={[styles.matrixCellValue, { fontSize: 12, color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
            {item.email}
          </ThemedText>
        </DirectionalRow>
      ) : null}
      {item.phone ? (
        <DirectionalRow style={{ alignItems: "center", gap: 6 }}>
          <DDIcon name="phone" size={13} color={theme.textSecondary} />
          <ThemedText style={[styles.matrixCellValue, { fontSize: 12, color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
            {item.phone}
          </ThemedText>
        </DirectionalRow>
      ) : null}
    </View>
  );
}

/** A header cell shared by both the fixed name column and the scrollable data columns. */
function MatrixHeaderCell({ label, width }: { label: string; width?: number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.matrixHeaderCell, width ? { width } : { flex: 1 }]}>
      <ThemedText style={[styles.matrixHeaderLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Single-header spreadsheet-style table: one header row shared by every data row below it. */
function MatrixTable({
  visitors,
  onPressRow,
  onEdit,
  onDelete,
  onCheckIn,
  onCheckOut,
  checkInLoadingId,
  checkOutLoadingId,
  isMutating,
  showEditDelete,
  showCheckActions,
  showApproveReject,
  showExpiredState,
  onApprove,
  onReject,
  approveLoadingId,
  rejectLoadingId,
  isSelectionMode,
  selectedIds,
  onToggleSelection,
  onLongPressRow,
  columns = "visitor",
  nameColumnLabel,
}: Omit<VisitorMatrixTableProps, "emptyMessage" | "variant"> & { visitors: VisitorMatrixItem[] }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const isSimple = columns === "simple";
  const showPurposeColumn = !isSimple && visitors.some((v) => v.purpose);
  const showContactColumn = !isSimple && visitors.some((v) => v.email || v.phone);
  const statusHeaderLabel = showApproveReject || showCheckActions || showEditDelete
    ? t("common.actions").toUpperCase()
    : t("common.status").toUpperCase();

  const handleRowPress = (id: string) => {
    if (isSelectionMode) {
      onToggleSelection?.(id);
    } else {
      onPressRow?.(id);
    }
  };

  return (
    <View style={[styles.matrixWrapper, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={{ flexDirection: getFlexDirection(isRTL) }}>
        {/* Frozen visitor-name column — header cell + one cell per row, stays put while the rest scrolls */}
        <View style={[styles.matrixFrozenColStack, { borderEndColor: theme.border, backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.matrixHeaderCell,
              styles.matrixHeaderRow,
              { width: LAYOUT.matrixColWidth, backgroundColor: theme.surfaceSecondary, borderBottomColor: theme.border },
            ]}
          >
            <ThemedText style={[styles.matrixHeaderLabel, { color: theme.textSecondary }]}>
              {(nameColumnLabel ?? t("visitor.visitorName")).toUpperCase()}
            </ThemedText>
          </View>
          {visitors.map((item, idx) => (
            <Pressable
              key={item.id}
              accessibilityRole={onPressRow || isSelectionMode ? "button" : undefined}
              accessibilityLabel={
                onPressRow || isSelectionMode
                  ? [
                      item.visitorName,
                      item.visitDate,
                      showExpiredState && item.isExpired
                        ? t("visitor.visitExpired")
                        : undefined,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : undefined
              }
              accessibilityHint={
                onPressRow && !isSelectionMode ? t("common.viewDetails") : undefined
              }
              onPress={() => handleRowPress(item.id)}
              onLongPress={onLongPressRow ? () => onLongPressRow(item.id) : undefined}
              android_ripple={{ color: applyOpacity(theme.primary, "10") }}
              style={[
                styles.matrixDataCell,
                { width: LAYOUT.matrixColWidth },
                idx === visitors.length - 1 ? {} : { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
            >
              <DirectionalRow style={{ alignItems: "center", gap: Spacing.xs }}>
                {isSelectionMode ? (
                  <SelectionCheckbox
                    isSelected={!!selectedIds?.has(item.id)}
                    onToggle={() => onToggleSelection?.(item.id)}
                  />
                ) : null}
                <View style={{ flexShrink: 1 }}>
                  <ThemedText style={[styles.matrixCellValue, styles.matrixCellValueBold]} numberOfLines={2}>
                    {item.visitorName}
                  </ThemedText>
                  {item.visitorSubtitle ? (
                    <ThemedText style={[styles.matrixCellValue, { color: theme.textSecondary, fontSize: 11 }]} numberOfLines={1}>
                      {item.visitorSubtitle}
                    </ThemedText>
                  ) : null}
                </View>
              </DirectionalRow>
            </Pressable>
          ))}
        </View>

        {/* Scrollable columns — header + every row share one ScrollView so they stay in sync */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          persistentScrollbar
          nestedScrollEnabled
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
        >
          <View>
            <DirectionalRow style={[styles.matrixHeaderRow, { backgroundColor: theme.surfaceSecondary, borderBottomColor: theme.border }]}>
              {isSimple ? (
                <>
                  <MatrixHeaderCell label={t("visitor.date").toUpperCase()} width={LAYOUT.matrixColWidth} />
                  <MatrixHeaderCell label={t("invitation.location").toUpperCase()} width={LAYOUT.matrixColWidth} />
                </>
              ) : (
                <>
                  <MatrixHeaderCell label={t("visitor.date").toUpperCase()} width={LAYOUT.matrixColWidth} />
                  <MatrixHeaderCell label={t("visitor.scheduledTime").toUpperCase()} width={LAYOUT.matrixColWidth} />
                  <MatrixHeaderCell label={t("visitor.actualIn").toUpperCase()} width={LAYOUT.matrixColWidth} />
                  <MatrixHeaderCell label={t("visitor.actualOut").toUpperCase()} width={LAYOUT.matrixColWidth} />
                  <MatrixHeaderCell label={t("form.company").toUpperCase()} width={LAYOUT.matrixColWidth} />
                  <MatrixHeaderCell label={t("dashboard.requestedBy").toUpperCase()} width={LAYOUT.matrixColWidth} />
                  {showPurposeColumn ? (
                    <MatrixHeaderCell label={t("form.purpose").toUpperCase()} width={LAYOUT.matrixColWidth} />
                  ) : null}
                  <MatrixHeaderCell label={t("services.additionalServices").toUpperCase()} width={LAYOUT.matrixColWidth} />
                </>
              )}
              {showContactColumn ? (
                <MatrixHeaderCell label={t("security.manualEntry").toUpperCase().split(" ")[0]} width={LAYOUT.matrixColWidth} />
              ) : null}
              <MatrixHeaderCell label={statusHeaderLabel} width={LAYOUT.matrixColWidth} />
            </DirectionalRow>

            {visitors.map((item, idx) => (
              <MatrixDataRowCells
                key={item.id}
                item={item}
                isLast={idx === visitors.length - 1}
                onPressRow={handleRowPress}
                onLongPressRow={onLongPressRow}
                onCheckIn={onCheckIn}
                onCheckOut={onCheckOut}
                checkInLoadingId={checkInLoadingId}
                checkOutLoadingId={checkOutLoadingId}
                isMutating={isMutating}
                showEditDelete={showEditDelete}
                showCheckActions={showCheckActions}
                showPurposeColumn={showPurposeColumn}
                showContactColumn={showContactColumn}
                onEdit={onEdit}
                onDelete={onDelete}
                showApproveReject={showApproveReject}
                showExpiredState={showExpiredState}
                onApprove={onApprove}
                onReject={onReject}
                approveLoadingId={approveLoadingId}
                rejectLoadingId={rejectLoadingId}
                isSimple={isSimple}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function MatrixDataRowCells({
  item,
  isLast,
  onPressRow,
  onLongPressRow,
  onCheckIn,
  onCheckOut,
  checkInLoadingId,
  checkOutLoadingId,
  isMutating,
  showEditDelete,
  showCheckActions,
  showPurposeColumn,
  showContactColumn,
  onEdit,
  onDelete,
  showApproveReject,
  showExpiredState,
  onApprove,
  onReject,
  approveLoadingId,
  rejectLoadingId,
  isSimple,
}: {
  item: VisitorMatrixItem;
  isLast: boolean;
  onPressRow?: (id: string) => void;
  onLongPressRow?: (id: string) => void;
  onCheckIn?: (id: string) => void;
  onCheckOut?: (id: string) => void;
  checkInLoadingId?: string;
  checkOutLoadingId?: string;
  isMutating?: boolean;
  showEditDelete?: boolean;
  showCheckActions?: boolean;
  showPurposeColumn: boolean;
  showContactColumn: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showApproveReject?: boolean;
  showExpiredState?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  approveLoadingId?: string;
  rejectLoadingId?: string;
  isSimple?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString } = useFormatters();
  const { isRTL, localeCode } = useLanguage();

  const canCheckIn =
    showCheckActions &&
    (item.status === "visitor_accepted" || item.status === "approved" || item.status === "expected");
  const canCheckOut = showCheckActions && item.status === "checked_in";
  const isCheckInLoading = checkInLoadingId === item.id;
  const isCheckOutLoading = checkOutLoadingId === item.id;
  const isPending = item.status === "pending_approval" || item.status === "pending";
  const canApproveReject =
    showApproveReject &&
    (item.canApproveReject ?? isPending) &&
    !item.isExpired &&
    !!onApprove &&
    !!onReject;
  const showApprovalExpiredBanner =
    !!item.isExpired && !!showApproveReject && isPending;
  const showReadOnlyExpiredBanner =
    !!item.isExpired && !!showExpiredState;
  const isApproveLoading = approveLoadingId === item.id;
  const isRejectLoading = rejectLoadingId === item.id;
  const isThisLoading = isCheckInLoading || isCheckOutLoading;
  const otherMutating = isMutating && !isThisLoading;
  const rowBorderStyle = isLast ? {} : { borderBottomWidth: 1, borderBottomColor: theme.border };

  return (
    <Pressable
      accessibilityRole={onPressRow ? "button" : undefined}
      accessibilityLabel={
        onPressRow
          ? [
              item.visitorName,
              item.visitDate,
              showApprovalExpiredBanner || showReadOnlyExpiredBanner
                ? t("visitor.visitExpired")
                : undefined,
            ]
              .filter(Boolean)
              .join(", ")
          : undefined
      }
      accessibilityHint={onPressRow ? t("common.viewDetails") : undefined}
      onPress={() => onPressRow?.(item.id)}
      onLongPress={onLongPressRow ? () => onLongPressRow(item.id) : undefined}
      android_ripple={{ color: applyOpacity(theme.primary, "10") }}
      style={{ flexDirection: getFlexDirection(isRTL), minHeight: LAYOUT.matrixRowMinHeight }}
    >
      {isSimple ? (
        <>
          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <ThemedText style={styles.matrixCellValue} numberOfLines={1}>
              {item.visitDate ? formatVisitDateLabel(item.visitDate, localeCode) : "—"}
            </ThemedText>
          </View>
          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <ThemedText style={styles.matrixCellValue} numberOfLines={2}>
              {item.location || "—"}
            </ThemedText>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <ThemedText style={styles.matrixCellValue} numberOfLines={1}>
              {item.visitDate ? formatVisitDateLabel(item.visitDate, localeCode) : "—"}
            </ThemedText>
          </View>

          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <ThemedText style={styles.matrixCellValue} numberOfLines={1}>
              {formatScheduleRange(item, formatTimeFromString, t("visitor.timeRangeTo"))}
            </ThemedText>
          </View>

          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <ThemedText style={styles.matrixCellValue} numberOfLines={1}>
              {formatMatrixCellTime(item.actualInTime, formatTimeFromString)}
            </ThemedText>
          </View>

          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <ThemedText style={styles.matrixCellValue} numberOfLines={1}>
              {formatMatrixCellTime(item.actualOutTime, formatTimeFromString)}
            </ThemedText>
          </View>

          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <ThemedText style={styles.matrixCellValue} numberOfLines={2}>
              {item.company || "—"}
            </ThemedText>
          </View>

          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <ThemedText style={styles.matrixCellValue} numberOfLines={2}>
              {item.hostName || "—"}
              {item.hostName && item.hostDepartment ? (
                <ThemedText style={{ color: theme.textSecondary }}> ({item.hostDepartment})</ThemedText>
              ) : null}
            </ThemedText>
          </View>

          {showPurposeColumn ? (
            <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
              <ThemedText style={styles.matrixCellValue} numberOfLines={2}>
                {getPurposeLabel(item.purpose, t) || "—"}
              </ThemedText>
            </View>
          ) : null}

          <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
            <MatrixServiceIcons item={item} />
          </View>

          {showContactColumn ? (
            <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
              <MatrixContactCell item={item} />
            </View>
          ) : null}
        </>
      )}

      <View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
        {canCheckIn ? (
          <Pressable
            onPress={() => onCheckIn?.(item.id)}
            disabled={otherMutating}
            style={[styles.actionBtn, { backgroundColor: applyOpacity(theme.success, "18"), opacity: otherMutating ? 0.4 : 1 }]}
          >
            {isCheckInLoading ? (
              <ActivityIndicator size={12} color={theme.success} />
            ) : (
              <>
                <DDIcon name="log-in" size={13} color={theme.success} />
                <ThemedText style={[styles.actionBtnText, { color: theme.success }]}>
                  {t("visitor.checkIn")}
                </ThemedText>
              </>
            )}
          </Pressable>
        ) : canCheckOut ? (
          <Pressable
            onPress={() => onCheckOut?.(item.id)}
            disabled={otherMutating}
            style={[styles.actionBtn, { backgroundColor: applyOpacity(theme.textSecondary, "15"), opacity: otherMutating ? 0.4 : 1 }]}
          >
            {isCheckOutLoading ? (
              <ActivityIndicator size={12} color={theme.textSecondary} />
            ) : (
              <>
                <DDIcon name="log-out" size={13} color={theme.textSecondary} />
                <ThemedText style={[styles.actionBtnText, { color: theme.textSecondary }]}>
                  {t("visitor.checkOut")}
                </ThemedText>
              </>
            )}
          </Pressable>
        ) : showEditDelete ? (
          <DirectionalRow style={{ gap: Spacing.xs }}>
            {onEdit ? (
              <Pressable
                onPress={() => onEdit(item.id)}
                style={[styles.iconBtn, { backgroundColor: applyOpacity(theme.primary, "12") }]}
              >
                <DDIcon name="edit-2" size={13} color={theme.primary} />
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable
                onPress={() => onDelete(item.id)}
                style={[styles.iconBtn, { backgroundColor: applyOpacity(theme.error, "12") }]}
              >
                <DDIcon name="trash-2" size={13} color={theme.error} />
              </Pressable>
            ) : null}
          </DirectionalRow>
        ) : showApprovalExpiredBanner ? (
          <View style={{ gap: Spacing.xs }}>
            <RequestStatusBadge status={item.status} />
            <View style={[styles.matrixExpiredBanner, { backgroundColor: applyOpacity(theme.error, "10") }]}>
              <DDIcon name="alert-circle" size={14} color={theme.error} />
              <ThemedText style={[styles.matrixExpiredText, { color: theme.error }]}>
                {t("visitor.visitExpired")}
              </ThemedText>
            </View>
          </View>
        ) : canApproveReject ? (
          <ApprovalActionGroup
            onApprove={() => onApprove!(item.id)}
            onReject={() => onReject!(item.id)}
            approveLoading={isApproveLoading}
            rejectLoading={isRejectLoading}
            size="small"
            showIcons={false}
            fullWidth={false}
          />
        ) : showReadOnlyExpiredBanner ? (
          <View style={{ gap: Spacing.xs }}>
            <RequestStatusBadge status={item.status} />
            <View style={[styles.matrixExpiredBanner, { backgroundColor: applyOpacity(theme.error, "10") }]}>
              <DDIcon name="alert-circle" size={14} color={theme.error} />
              <ThemedText style={[styles.matrixExpiredText, { color: theme.error }]}>
                {t("visitor.visitExpired")}
              </ThemedText>
            </View>
          </View>
        ) : (
          <RequestStatusBadge status={item.status} />
        )}
      </View>
    </Pressable>
  );
}

export function VisitorMatrixTable({
  visitors,
  onPressRow,
  onEdit,
  onDelete,
  onCheckIn,
  onCheckOut,
  checkInLoadingId,
  checkOutLoadingId,
  isMutating,
  emptyMessage,
  showEditDelete = false,
  showCheckActions = false,
  showApproveReject = false,
  showExpiredState = false,
  onApprove,
  onReject,
  approveLoadingId,
  rejectLoadingId,
  isSelectionMode = false,
  selectedIds,
  onToggleSelection,
  onLongPressRow,
  variant = "card",
  columns = "visitor",
  nameColumnLabel,
}: VisitorMatrixTableProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (visitors.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
        <DDIcon name="users" size={32} color={theme.textSecondary} />
        <ThemedText
          style={[
            Typography.bodySmall,
            { color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" },
          ]}
        >
          {emptyMessage ?? t("common.noResults")}
        </ThemedText>
      </View>
    );
  }

  if (variant === "matrix") {
    return (
      <MatrixTable
        visitors={visitors}
        onPressRow={onPressRow}
        onEdit={onEdit}
        onDelete={onDelete}
        onCheckIn={onCheckIn}
        onCheckOut={onCheckOut}
        checkInLoadingId={checkInLoadingId}
        checkOutLoadingId={checkOutLoadingId}
        isMutating={isMutating}
        showEditDelete={showEditDelete}
        showCheckActions={showCheckActions}
        showApproveReject={showApproveReject}
        showExpiredState={showExpiredState}
        onApprove={onApprove}
        onReject={onReject}
        approveLoadingId={approveLoadingId}
        rejectLoadingId={rejectLoadingId}
        isSelectionMode={isSelectionMode}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        onLongPressRow={onLongPressRow}
        columns={columns}
        nameColumnLabel={nameColumnLabel}
      />
    );
  }

  return (
    <View style={styles.list}>
      {visitors.map((item) => (
        <MatrixRow
          key={item.id}
          item={item}
          onPressRow={onPressRow}
          onEdit={onEdit}
          onDelete={onDelete}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
          checkInLoadingId={checkInLoadingId}
          checkOutLoadingId={checkOutLoadingId}
          isMutating={isMutating}
          showEditDelete={showEditDelete}
          showCheckActions={showCheckActions}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
  },
  row: {
    minHeight: LAYOUT.rowMinHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  fixedCol: {
    justifyContent: "center",
    borderEndWidth: 1,
    borderEndColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  fixedColContent: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.md,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingEnd: Spacing.xl,
  },
  col: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  colHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  colValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  servicePill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  matrixWrapper: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  matrixFrozenColStack: {
    borderEndWidth: 1,
  },
  matrixHeaderRow: {
    borderBottomWidth: 1,
  },
  matrixHeaderCell: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
  matrixHeaderLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  matrixDataCell: {
    minHeight: LAYOUT.matrixRowMinHeight,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
  matrixCellValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  matrixCellValueBold: {
    fontWeight: "600",
  },
  matrixExpiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  matrixExpiredText: {
    ...Typography.caption,
    fontWeight: "600",
  },
});

function useStatusConfig(status: string) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  switch (status) {
    case "checked_in":
      return { label: t("status.checkedIn"), bg: applyOpacity(theme.success, "18"), text: theme.success };
    case "completed":
    case "checked_out":
      return { label: t("status.checkedOut"), bg: applyOpacity(theme.textSecondary, "15"), text: theme.textSecondary };
    case "visitor_accepted":
    case "approved":
    case "accepted":
    case "expected":
      return { label: t("status.approved"), bg: applyOpacity(theme.info, "18"), text: theme.info };
    case "waiting_acceptance":
      return { label: t("status.waitingAcceptance"), bg: applyOpacity(theme.info, "15"), text: theme.info };
    case "pending_approval":
    case "pending_host_approval":
      return { label: t("status.pendingApproval"), bg: applyOpacity(theme.warning, "18"), text: theme.warning };
    case "rejected":
    case "visitor_rejected":
      return { label: t("status.rejected"), bg: applyOpacity(theme.error, "15"), text: theme.error };
    case "cancelled":
    case "auto_cancelled":
      return { label: t("status.cancelled"), bg: applyOpacity(theme.error, "15"), text: theme.error };
    case "no_show":
      return { label: t("status.noShow"), bg: applyOpacity(theme.error, "15"), text: theme.error };
    case "expired":
      return { label: t("status.expired"), bg: applyOpacity(theme.textSecondary, "15"), text: theme.textSecondary };
    default:
      return { label: t("status.pending"), bg: applyOpacity(theme.warning, "12"), text: theme.warning };
  }
}
