import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Spacing } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";

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

  const isAnyLoading = approveLoading || rejectLoading;
  const isDisabled = disabled || isAnyLoading;

  const defaultApproveLabel = approveLabel || t("actions.approve");
  const defaultRejectLabel = rejectLabel || t("actions.reject");
  const defaultApproveLoadingText = approveLoadingText || t("common.approving");
  const defaultRejectLoadingText = rejectLoadingText || t("common.rejecting");

  const containerStyle = layout === "row" ? styles.rowContainer : styles.columnContainer;
  const buttonStyle = layout === "row" ? styles.rowButton : styles.columnButton;

  return (
    <View style={[containerStyle, style]}>
      <LoadingButton
        onPress={onReject}
        loading={rejectLoading}
        disabled={isDisabled && !rejectLoading}
        variant="danger-outline"
        size={size}
        icon={showIcons ? "x" : undefined}
        loadingText={defaultRejectLoadingText}
        fullWidth={fullWidth}
        style={buttonStyle}
      >
        {defaultRejectLabel}
      </LoadingButton>

      {layout === "row" ? <View style={styles.spacerHorizontal} /> : <View style={styles.spacerVertical} />}

      <LoadingButton
        onPress={onApprove}
        loading={approveLoading}
        disabled={isDisabled && !approveLoading}
        variant="success"
        size={size}
        icon={showIcons ? "check" : undefined}
        loadingText={defaultApproveLoadingText}
        fullWidth={fullWidth}
        style={buttonStyle}
      >
        {defaultApproveLabel}
      </LoadingButton>
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
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
