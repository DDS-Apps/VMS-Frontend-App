import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Image, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { useVerifyOtpMutation, useResetPasswordMutation, useResendOtpMutation } from "@/hooks/queries/useAuthQueries";
import { useToast } from "@/contexts/ToastContext";
import { ApiException } from "@/api/errors";

interface ResetPasswordScreenProps {
  email: string;
  onSubmit: () => void;
  onBack: () => void;
}

const INPUT_ICON_SIZE = 22;
const INPUT_FONT_SIZE = 17;
const INPUT_HEIGHT = 56;

type FieldName = 'code' | 'newPassword' | 'confirmPassword';

export default function ResetPasswordScreen({ email, onSubmit, onBack }: ResetPasswordScreenProps) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  
  const verifyOtpMutation = useVerifyOtpMutation();
  const resetPasswordMutation = useResetPasswordMutation();
  const resendOtpMutation = useResendOtpMutation();
  
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [errors, setErrors] = useState<{ code?: string; newPassword?: string; confirmPassword?: string; general?: string }>({});

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiException) {
      switch (err.code) {
        case 'NETWORK_ERROR':
          return t('toast.networkError');
        case 'UNAUTHORIZED':
        case 'FORBIDDEN':
          return t('auth.invalidOtp');
        case 'VALIDATION_ERROR':
          return err.message || t('auth.invalidOtp');
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

  const validateForm = (): boolean => {
    const newErrors: { code?: string; newPassword?: string; confirmPassword?: string } = {};
    
    if (!code.trim()) {
      newErrors.code = t('form.required');
    } else if (code.length < 4) {
      newErrors.code = t('auth.invalidOtp');
    }
    
    if (!newPassword.trim()) {
      newErrors.newPassword = t('form.required');
    } else if (newPassword.length < 6) {
      newErrors.newPassword = t('auth.passwordMinLength');
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('form.required');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResendOtp = async () => {
    try {
      await resendOtpMutation.mutateAsync({
        email,
        channel: 'email',
      });
      showSuccess(t('auth.otpResent'), t('common.success'));
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showError(errorMessage, t('common.error'));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const verifyResponse = await verifyOtpMutation.mutateAsync({
        email,
        code: code.trim(),
      });

      if (!verifyResponse.resetToken) {
        setErrors({ code: t('auth.invalidOtp') });
        return;
      }

      await resetPasswordMutation.mutateAsync({
        token: verifyResponse.resetToken,
        newPassword,
        confirmPassword,
      });

      showSuccess(t('auth.passwordResetSuccess'), t('common.success'));
      onSubmit();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      if (errorMessage.toLowerCase().includes('otp') || errorMessage.toLowerCase().includes('code')) {
        setErrors({ code: errorMessage });
      } else {
        setErrors({ general: errorMessage });
      }
      showError(errorMessage, t('common.error'));
    }
  };

  const isSubmitting = verifyOtpMutation.isPending || resetPasswordMutation.isPending;

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

  const isCodeValid = code.length >= 4;
  const isPasswordValid = newPassword.length >= 6;
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isCodeValid && isPasswordValid && doPasswordsMatch;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Image
            source={isRTL 
              ? require("../assets/images/logo-arabic.png")
              : require("../assets/images/logo-english.png")
            }
            style={styles.logo}
            resizeMode="contain"
          />
          
          <ThemedText style={[Typography.display, { textAlign: 'center', marginTop: Spacing.xxxl }]}>
            {t('auth.resetPasswordTitle')}
          </ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xxxl }]}>
            {t('auth.resetPasswordSubtitle', { email })}
          </ThemedText>

          <View style={styles.form}>
            <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.verificationCode').toUpperCase()}
            </ThemedText>
            <View style={[getInputContainerStyle('code'), { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="hash" size={INPUT_ICON_SIZE} variant="muted" />
              <TextInput
                style={[
                  styles.input, 
                  { color: theme.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                  Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}
                ]}
                placeholder={t('auth.enterCode')}
                placeholderTextColor={theme.textSecondary}
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  if (errors.code) setErrors({ ...errors, code: undefined });
                }}
                onFocus={() => setFocusedField('code')}
                onBlur={() => setFocusedField(null)}
                keyboardType="number-pad"
              />
            </View>
            {errors.code ? (
              <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
                {errors.code}
              </ThemedText>
            ) : null}

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.newPassword').toUpperCase()}
            </ThemedText>
            <View style={[getInputContainerStyle('newPassword'), { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="lock" size={INPUT_ICON_SIZE} variant="muted" />
              <TextInput
                style={[
                  styles.input, 
                  { color: theme.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                  Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}
                ]}
                placeholder={t('auth.enterNewPassword')}
                placeholderTextColor={theme.textSecondary}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
                }}
                onFocus={() => setFocusedField('newPassword')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showNewPassword}
              />
              <Pressable onPress={() => setShowNewPassword(!showNewPassword)} hitSlop={8}>
                <DDIcon name={showNewPassword ? "eye-off" : "eye"} size={INPUT_ICON_SIZE} variant="muted" />
              </Pressable>
            </View>
            {errors.newPassword ? (
              <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
                {errors.newPassword}
              </ThemedText>
            ) : null}

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.confirmPassword').toUpperCase()}
            </ThemedText>
            <View style={[getInputContainerStyle('confirmPassword'), { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="lock" size={INPUT_ICON_SIZE} variant="muted" />
              <TextInput
                style={[
                  styles.input, 
                  { color: theme.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                  Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}
                ]}
                placeholder={t('auth.confirmNewPassword')}
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showConfirmPassword}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
                <DDIcon name={showConfirmPassword ? "eye-off" : "eye"} size={INPUT_ICON_SIZE} variant="muted" />
              </Pressable>
            </View>
            {errors.confirmPassword ? (
              <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
                {errors.confirmPassword}
              </ThemedText>
            ) : null}

            <Spacer height={Spacing.xl} />

            <LoadingButton
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!isFormValid}
              variant="primary"
              size="large"
              style={styles.primaryButton}
            >
              {t('auth.resetPassword')}
            </LoadingButton>

            <Spacer height={Spacing.lg} />

            <LoadingButton
              onPress={handleResendOtp}
              loading={resendOtpMutation.isPending}
              variant="ghost"
              size="large"
              loadingText={t('common.loading')}
            >
              {t('auth.resendCode')}
            </LoadingButton>

            <Spacer height={Spacing.lg} />

            <LoadingButton
              onPress={onBack}
              variant="ghost"
              size="large"
              icon="arrow-left"
              iconPosition="left"
            >
              {t('auth.backToLogin')}
            </LoadingButton>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 250,
    height: 75,
    alignSelf: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
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
