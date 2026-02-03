import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { DirectionalRow } from "@/components/DirectionalRow";
import { Spacing } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";

type ButtonSize = "small" | "medium" | "large";

interface ApprovalActionGroupProps {
  onApprove: () => void;
  onReject: () => void;
  approveLoading?: boolean;
  rejectLoading?: boolean;
  disabled?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
  approveLoadingText?: string;
  rejectLoadingText?: string;
  layout?: "row" | "column";
  size?: ButtonSize;
  showIcons?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export const ApprovalActionGroup = ({
  onApprove,
  onReject,
  approveLoading = false,
  rejectLoading = false,
  disabled = false,
  approveLabel,
  rejectLabel,
  approveLoadingText,
  rejectLoadingText,
  layout = "row",
  size = "medium",
  showIcons = true,
  style,
  fullWidth = true,
}: ApprovalActionGroupProps) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const isAnyLoading = approveLoading || rejectLoading;
  const isDisabled = disabled || isAnyLoading;

  const defaultApproveLabel = approveLabel || t("actions.approve");
  const defaultRejectLabel = rejectLabel || t("actions.reject");
  const defaultApproveLoadingText = approveLoadingText || t("common.approving");
  const defaultRejectLoadingText = rejectLoadingText || t("common.rejecting");

  const containerStyle = layout === "row" ? styles.rowContainer : styles.columnContainer;
  const buttonStyle = layout === "row" ? styles.rowButton : styles.columnButton;

  const rejectButton = (
    <LoadingButton
      onPress={() => { console.log('[ApprovalActionGroup] Reject button pressed'); onReject(); }}
      loading={rejectLoading}
      disabled={isDisabled && !rejectLoading}
      variant="danger-outline"
      size={size}
      icon={showIcons ? "x-circle" : undefined}
      loadingText={defaultRejectLoadingText}
      fullWidth={fullWidth}
      style={buttonStyle}
    >
      {defaultRejectLabel}
    </LoadingButton>
  );

  const approveButton = (
    <LoadingButton
      onPress={() => { console.log('[ApprovalActionGroup] Approve button pressed'); onApprove(); }}
      loading={approveLoading}
      disabled={isDisabled && !approveLoading}
      variant="success"
      size={size}
      icon={showIcons ? "check-circle" : undefined}
      loadingText={defaultApproveLoadingText}
      fullWidth={fullWidth}
      style={buttonStyle}
    >
      {defaultApproveLabel}
    </LoadingButton>
  );

  const spacer = layout === "row" ? <View style={styles.spacerHorizontal} /> : <View style={styles.spacerVertical} />;

  return layout === "row" ? (
    <DirectionalRow style={[styles.rowContainerBase, style]}>
      {rejectButton}
      {spacer}
      {approveButton}
    </DirectionalRow>
  ) : (
    <View style={[containerStyle, style]}>
      {rejectButton}
      {spacer}
      {approveButton}
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  rowContainerBase: {
    // flexDirection handled by DirectionalRow
    alignItems: "center",
    width: "100%",
  },
  columnContainer: {
    flexDirection: "column",
  },
  rowButton: {
    flex: 1,
  },
  columnButton: {
    width: "100%",
  },
  spacerHorizontal: {
    width: Spacing.md,
  },
  spacerVertical: {
    height: Spacing.md,
  },
});
