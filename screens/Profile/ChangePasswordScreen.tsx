import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import Spacer from "@/components/Spacer";
import { DirectionalRow } from "@/components/DirectionalRow";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { DDIcon } from "@/components/DDIcon";
import { useChangePasswordMutation } from "@/hooks/queries/useAuthQueries";
import { useToast } from "@/contexts/ToastContext";
import { ApiException } from "@/api/errors";

interface ChangePasswordScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const INPUT_ICON_SIZE = 22;
const INPUT_FONT_SIZE = 17;
const INPUT_HEIGHT = 56;

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

export default function ChangePasswordScreen({ onSuccess, onCancel }: ChangePasswordScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const changePasswordMutation = useChangePasswordMutation();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [errors, setErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string; general?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { currentPassword?: string; newPassword?: string; confirmPassword?: string } = {};
    
    if (!currentPassword.trim()) {
      newErrors.currentPassword = t('form.required');
    }
    
    if (!newPassword.trim()) {
      newErrors.newPassword = t('form.required');
    } else if (newPassword.length < 6) {
      newErrors.newPassword = t('auth.passwordMinLength');
    } else if (newPassword === currentPassword) {
      newErrors.newPassword = t('auth.newPasswordMustBeDifferent');
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('form.required');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiException) {
      switch (err.code) {
        case 'NETWORK_ERROR':
          return t('toast.networkError');
        case 'UNAUTHORIZED':
        case 'FORBIDDEN':
          return t('auth.incorrectCurrentPassword');
        case 'VALIDATION_ERROR':
          return err.message || t('toast.unknownError');
        case 'SERVER_ERROR':
          return t('toast.serverError');
        default:
          return err.message || t('toast.unknownError');
      }
    }
    if (err instanceof Error) {
      return err.message || t('toast.unknownError');
    }
    return t('toast.unknownError');
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      showSuccess(t('auth.passwordChangedSuccess'), t('common.success'));
      onSuccess();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      if (errorMessage.toLowerCase().includes('current') || errorMessage.toLowerCase().includes('incorrect')) {
        setErrors({ currentPassword: errorMessage });
      } else {
        setErrors({ general: errorMessage });
      }
      showError(errorMessage, t('common.error'));
    }
  };

  const isSubmitting = changePasswordMutation.isPending;

  const getInputContainerStyle = (field: FieldName) => {
    const isFocused = focusedField === field;
    const hasError = errors[field];
    
    return [
      styles.inputContainer,
      {
        backgroundColor: theme.surface,
        borderColor: hasError ? theme.error : (isFocused ? theme.primary : theme.border),
        borderWidth: isFocused ? 2 : 1,
      },
    ];
  };

  const isFormValid = currentPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword;

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  return (
    <ScreenKeyboardAwareScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title]}>
        {t('settings.changePassword')}
      </ThemedText>
      <ThemedText style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
        {t('auth.updatePasswordSubtitle')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <ThemedView style={[styles.formSection, { backgroundColor: theme.surface }]}>
        <View>
          <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('auth.currentPassword')}
          </ThemedText>
          <DirectionalRow style={getInputContainerStyle('currentPassword')}>
            <DDIcon name="lock" size={INPUT_ICON_SIZE} variant="muted" />
            <TextInput
              style={[
                styles.input,
                { color: theme.text },
              ]}
              placeholder={t('auth.currentPasswordPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (errors.currentPassword) setErrors({ ...errors, currentPassword: undefined });
              }}
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              onFocus={() => setFocusedField('currentPassword')}
              onBlur={() => setFocusedField(null)}
            />
            <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
              <DDIcon name={showCurrentPassword ? "eye" : "eye-off"} size={INPUT_ICON_SIZE} variant="muted" />
            </Pressable>
          </DirectionalRow>
          {errors.currentPassword ? (
            <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs }]}>
              {errors.currentPassword}
            </ThemedText>
          ) : null}
        </View>

        <Spacer height={Spacing.lg} />

        <View>
          <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('auth.newPassword')}
          </ThemedText>
          <DirectionalRow style={getInputContainerStyle('newPassword')}>
            <DDIcon name="lock" size={INPUT_ICON_SIZE} variant="muted" />
            <TextInput
              style={[
                styles.input,
                { color: theme.text },
              ]}
              placeholder={t('auth.enterNewPassword')}
              placeholderTextColor={theme.textSecondary}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
              }}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              onFocus={() => setFocusedField('newPassword')}
              onBlur={() => setFocusedField(null)}
            />
            <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
              <DDIcon name={showNewPassword ? "eye" : "eye-off"} size={INPUT_ICON_SIZE} variant="muted" />
            </Pressable>
          </DirectionalRow>
          {errors.newPassword ? (
            <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs }]}>
              {errors.newPassword}
            </ThemedText>
          ) : null}
        </View>

        <Spacer height={Spacing.lg} />

        <View>
          <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('auth.confirmNewPassword')}
          </ThemedText>
          <DirectionalRow style={getInputContainerStyle('confirmPassword')}>
            <DDIcon name="lock" size={INPUT_ICON_SIZE} variant="muted" />
            <TextInput
              style={[
                styles.input,
                { color: theme.text },
              ]}
              placeholder={t('auth.confirmNewPasswordPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <DDIcon name={showConfirmPassword ? "eye" : "eye-off"} size={INPUT_ICON_SIZE} variant="muted" />
            </Pressable>
          </DirectionalRow>
          {errors.confirmPassword ? (
            <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs }]}>
              {errors.confirmPassword}
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>

      <Spacer height={Spacing.xl} />

      <LoadingButton
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!isFormValid || isSubmitting}
        variant="primary"
        size="large"
        fullWidth
        style={styles.primaryButton}
      >
        {t('auth.updatePassword')}
      </LoadingButton>

      <Spacer height={Spacing.lg} />

      <LoadingButton
        onPress={onCancel}
        variant="ghost"
        size="large"
        fullWidth
      >
        {t('common.cancel')}
      </LoadingButton>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  formSection: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  inputContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    height: INPUT_HEIGHT,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: INPUT_FONT_SIZE,
    fontFamily: 'Inter_400Regular',
    height: '100%',
  },
  primaryButton: {
    height: INPUT_HEIGHT,
  },
});
