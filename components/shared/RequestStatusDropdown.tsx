import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { DDIcon } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { FilterChip } from "@/components/shared/FilterChip";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { applyOpacity } from "@/utils/statusStyles";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { REQUEST_STATUS_VALUES } from "@/constants/requestConstants";
import type { RequestStatus } from "@/types/vms.types";
import { Portal } from "@/contexts/PortalContext";


export type RequestStatusDropdownValue = RequestStatus | undefined;

interface RequestStatusDropdownProps {
  value: RequestStatusDropdownValue;
  onChange: (value: RequestStatusDropdownValue) => void;
  accessibilityLabel?: string;
}

interface StatusDropdownProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  statuses?: readonly string[];
  language?: string;
  accessibilityLabel?: string;
  compact?: boolean;
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: "status.draft",
  pending: "status.pending",
  pending_approval: "status.pendingApproval",
  pending_host_approval: "status.pendingHostApproval",
  approved: "status.approved",
  rejected: "status.rejected",
  visitor_pending: "status.visitorPending",
  visitor_accepted: "status.visitorAccepted",
  visitor_rejected: "status.visitorRejected",
  accepted: "status.accepted",
  expected: "status.expected",
  checked_in: "status.checkedIn",
  checked_out: "status.checkedOut",
  completed: "status.completed",
  cancelled: "status.cancelled",
  auto_cancelled: "status.autoCancelled",
  expired: "status.expired",
  no_show: "status.noShow",
  awaiting_visitor: "status.waitingAcceptance",
  in_progress: "status.inProgress",
  waiting_acceptance: "status.waitingAcceptance",
};

/** A shared, localized status picker for request lists. */
export function StatusDropdown({
  value,
  onChange,
  statuses = REQUEST_STATUS_VALUES,
  accessibilityLabel,
  compact = false,
}: StatusDropdownProps) {
  // iOS native modal hosts must stay outside scroll clipping / RTL transforms.
  // Keep Android and Web presentation unchanged.
  const StatusModalHost = Platform.OS === "ios" ? Portal : React.Fragment;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = value
    ? getStatusLabel(value, t)
    : t("common.allStatuses");
  // Drafts are unfinished requests, not a useful filter for submitted visits.
  // Expiration remains a display/business rule, not a selectable status filter.
  const visibleStatuses = statuses.filter(
    (status) => status !== "draft" && status !== "expired",
  );

  const selectValue = (nextValue: string | null) => {
    setIsOpen(false);
    onChange(nextValue);
  };

  return (
    <>
      <FilterChip
        compact={compact}
        label={`${t("common.status")}: ${selectedLabel}`}
        isSelected={!!value}
        trailingIcon="chevron-down"
        accessibilityLabel={accessibilityLabel || `${t("common.status")}: ${selectedLabel}`}
        accessibilityHint={t("status.selectStatus")}
        expanded={isOpen}
        onPress={() => setIsOpen(true)}
      />

      <StatusModalHost>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            style={styles.backdrop}
            onPress={() => setIsOpen(false)}
          />
          <View
            style={[
              styles.menu,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <ThemedText style={[Typography.body, { color: theme.text, fontWeight: "600" }]}>
              {t("common.status")}
            </ThemedText>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.options}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !value }}
                onPress={() => selectValue(null)}
                style={[
                  styles.option,
                  !value && {
                    backgroundColor: applyOpacity(theme.primary, "18"),
                  },
                ]}
              >
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      color: !value ? theme.primary : theme.text,
                      fontWeight: !value ? "600" : "400",
                    },
                  ]}
                >
                  {t("common.allStatuses")}
                </ThemedText>
                {!value ? (
                  <DDIcon name="check" size={17} color={theme.primary} />
                ) : null}
              </Pressable>
              {visibleStatuses.map((status) => (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === status }}
                  onPress={() => selectValue(status)}
                  style={[
                    styles.option,
                    value === status && {
                      backgroundColor: applyOpacity(theme.primary, "18"),
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color:
                          value === status ? theme.primary : theme.text,
                        fontWeight: value === status ? "600" : "400",
                      },
                    ]}
                  >
                    {getStatusLabel(status, t)}
                  </ThemedText>
                  {value === status ? (
                    <DDIcon name="check" size={17} color={theme.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </StatusModalHost>
    </>
  );

}

function getStatusLabel(status: string, t: (key: string) => string): string {
  const labelKey = STATUS_LABEL_KEYS[status];
  if (labelKey) {
    return t(labelKey);
  }
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Typed convenience wrapper for screens filtering canonical visitor statuses. */
export function RequestStatusDropdown({
  value,
  onChange,
  accessibilityLabel,
}: RequestStatusDropdownProps) {
  return (
    <StatusDropdown
      value={value ?? null}
      onChange={(nextValue) =>
        onChange((nextValue ?? undefined) as RequestStatusDropdownValue)
      }
      accessibilityLabel={accessibilityLabel}
      statuses={REQUEST_STATUS_VALUES}
    />
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  menu: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "75%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  options: {
    marginTop: Spacing.sm,
  },
  option: {
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});