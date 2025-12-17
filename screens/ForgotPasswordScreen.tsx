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
import { useSendOtpMutation } from "@/hooks/queries/useAuthQueries";
import { useToast } from "@/contexts/ToastContext";
import { ApiException } from "@/api/errors";

interface ForgotPasswordScreenProps {
  onSubmit: (email: string) => void;
  onBack: () => void;
}

const INPUT_ICON_SIZE = 22;
const INPUT_FONT_SIZE = 17;
const INPUT_HEIGHT = 56;

export default function ForgotPasswordScreen({ onSubmit, onBack }: ForgotPasswordScreenProps) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const sendOtpMutation = useSendOtpMutation();
  
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiException) {
      switch (err.code) {
        case 'NETWORK_ERROR':
          return t('toast.networkError');
        case 'NOT_FOUND':
          return t('auth.emailNotFound');
        case 'VALIDATION_ERROR':
          return err.message || t('form.invalidEmail');
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
    if (!email.trim()) {
      setError(t('form.required'));
      return;
    }
    if (!validateEmail(email)) {
      setError(t('form.invalidEmail'));
      return;
    }
    
    try {
      await sendOtpMutation.mutateAsync({
        email: email.trim(),
        channel: 'email',
      });
      showSuccess(t('auth.otpSent'), t('common.success'));
      onSubmit(email.trim());
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showError(errorMessage, t('common.error'));
    }
  };

  const isValidEmail = validateEmail(email);
  const isSubmitting = sendOtpMutation.isPending;

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
            {t('auth.forgotPasswordTitle')}
          </ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xxxl }]}>
            {t('auth.forgotPasswordSubtitle')}
          </ThemedText>

          <View style={styles.form}>
            <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('form.emailAddress').toUpperCase()}
            </ThemedText>
            <View style={[
              styles.inputContainer, 
              { 
                backgroundColor: theme.surface, 
                borderColor: error ? theme.error : (isFocused ? theme.primary : theme.border),
                borderWidth: isFocused ? 2 : 1,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }
            ]}>
              <DDIcon name="mail" size={INPUT_ICON_SIZE} variant="muted" />
              <TextInput
                style={[
                  styles.input, 
                  { color: theme.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                  Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}
                ]}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {error ? (
              <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
                {error}
              </ThemedText>
            ) : null}

            <Spacer height={Spacing.xl} />

            <LoadingButton
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!isValidEmail}
              variant="primary"
              size="large"
              style={styles.primaryButton}
            >
              {t('auth.sendResetCode')}
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
