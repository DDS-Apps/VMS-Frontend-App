import React, { useState, useCallback } from "react";
import { Modal, View, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon, IconName } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";

type ModalTone = "danger" | "warning" | "info";
type ModalStatus = "idle" | "loading" | "success" | "error";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ModalTone;
  icon?: IconName;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
  successMessage?: string;
  autoCloseDelay?: number;
}

const toneConfig: Record<ModalTone, { icon: IconName; iconVariant: "danger" | "warning" | "primary" }> = {
  danger: { icon: "trash-2", iconVariant: "danger" },
  warning: { icon: "alert-triangle", iconVariant: "warning" },
  info: { icon: "info", iconVariant: "primary" },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  icon,
  onConfirm,
  onCancel,
  onSuccess,
  successMessage,
  autoCloseDelay = 1500,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<ModalStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const config = toneConfig[tone];
  const displayIcon = icon || config.icon;

  const handleConfirm = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      await onConfirm();
      setStatus("success");
      
      if (autoCloseDelay > 0) {
        setTimeout(() => {
          setStatus("idle");
          onSuccess?.();
        }, autoCloseDelay);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setStatus("error");
      const message = err instanceof Error ? err.message : t("toast.unknownError");
      setErrorMessage(message);
    }
  }, [onConfirm, onSuccess, autoCloseDelay, t]);

  const handleCancel = useCallback(() => {
    if (status === "loading") return;
    setStatus("idle");
    setErrorMessage("");
    onCancel();
  }, [status, onCancel]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const getConfirmButtonVariant = () => {
    if (tone === "danger") return "danger";
    if (tone === "warning") return "primary";
    return "primary";
  };

  const renderContent = () => {
    if (status === "loading") {
      return (
        <View style={styles.statusContainer}>
          <LoadingSpinner size="large" color={theme.primary} />
          <ThemedText style={[Typography.body, styles.statusText, { color: theme.textSecondary }]}>
            {t("common.loading")}
          </ThemedText>
        </View>
      );
    }

    if (status === "success") {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.statusIconContainer, { backgroundColor: theme.success + "20" }]}>
            <DDIcon name="check-circle" size={48} variant="success" />
          </View>
          <ThemedText style={[Typography.subtitle, styles.statusText, { color: theme.success }]}>
            {successMessage || t("toast.successTitle")}
          </ThemedText>
        </View>
      );
    }

    if (status === "error") {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.statusIconContainer, { backgroundColor: theme.error + "20" }]}>
            <DDIcon name="alert-circle" size={48} variant="danger" />
          </View>
          <ThemedText style={[Typography.subtitle, styles.statusText, { color: theme.error }]}>
            {t("toast.errorTitle")}
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, styles.errorMessage, { color: theme.textSecondary }]}>
            {errorMessage}
          </ThemedText>
          <DirectionalRow style={styles.errorActions} gap={Spacing.sm}>
            <LoadingButton
              onPress={handleRetry}
              variant="outline"
              size="medium"
              fullWidth={false}
              style={{ flex: 1 }}
            >
              {t("common.tryAgain")}
            </LoadingButton>
            <LoadingButton
              onPress={handleCancel}
              variant="ghost"
              size="medium"
              fullWidth={false}
              style={{ flex: 1 }}
            >
              {cancelLabel || t("common.cancel")}
            </LoadingButton>
          </DirectionalRow>
        </View>
      );
    }

    return (
      <>
        <View style={[styles.iconContainer, { backgroundColor: theme[config.iconVariant === "danger" ? "error" : config.iconVariant === "warning" ? "warning" : "primary"] + "15" }]}>
          <DDIcon
            name={displayIcon}
            size={32}
            variant={config.iconVariant === "danger" ? "danger" : config.iconVariant === "warning" ? "warning" : "primary"}
          />
        </View>
        
        <ThemedText style={[Typography.h3, styles.title]}>
          {title}
        </ThemedText>
        
        {description ? (
          <ThemedText style={[Typography.body, styles.description, { color: theme.textSecondary }]}>
            {description}
          </ThemedText>
        ) : null}

        <DirectionalRow style={styles.buttonContainer} gap={Spacing.sm}>
          <LoadingButton
            onPress={handleCancel}
            variant="outline"
            size="medium"
            fullWidth={false}
            style={{ flex: 1 }}
          >
            {cancelLabel || t("common.cancel")}
          </LoadingButton>
          <LoadingButton
            onPress={handleConfirm}
            variant={getConfirmButtonVariant()}
            size="medium"
            fullWidth={false}
            style={{ flex: 1 }}
          >
            {confirmLabel || t("common.confirm")}
          </LoadingButton>
        </DirectionalRow>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Pressable 
        style={styles.overlay} 
        onPress={status !== "loading" ? handleCancel : undefined}
      >
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <Pressable 
          style={[
            styles.modalContainer,
            { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              marginHorizontal: Spacing.lg,
              marginBottom: insets.bottom,
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedView style={styles.modalContent}>
            {renderContent()}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    maxWidth: 400,
    width: "100%",
    overflow: "hidden",
  },
  modalContent: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    width: "100%",
    marginTop: Spacing.md,
  },
  statusContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    minHeight: 160,
    justifyContent: "center",
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  statusText: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  errorMessage: {
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  errorActions: {
    width: "100%",
    marginTop: Spacing.sm,
  },
});
