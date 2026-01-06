import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
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
import { UserRole } from "@/types/vms.types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ApiException } from "@/api/errors";
import { useAzureAuth, AzureErrorType } from "@/hooks/useAzureAuth";

interface LoginScreenProps {
  onLoginSuccess?: (role: UserRole) => void;
}

const INPUT_ICON_SIZE = 22;
const INPUT_FONT_SIZE = 17;
const INPUT_HEIGHT = 56;

export default function LoginScreen({
  onLoginSuccess,
}: LoginScreenProps) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const {
    login,
    ssoLogin,
    isLoading: authLoading,
    error: authError,
  } = useAuth();
  const { showError } = useToast();
  const {
    promptAsync: promptAzureAsync,
    isLoading: isAzureLoading,
    errorType: azureErrorType,
    isConfigured: isAzureConfigured,
  } = useAzureAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null,
  );
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMicrosoftSubmitting, setIsMicrosoftSubmitting] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = t("form.required");
    } else if (!validateEmail(email)) {
      newErrors.email = t("form.invalidEmail");
    }

    if (!password.trim()) {
      newErrors.password = t("form.required");
    } else if (password.length < 6) {
      newErrors.password = t("auth.passwordMinLength");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getErrorMessage = (
    error: unknown,
    isAzureFlow: boolean = false,
  ): string => {
    if (error instanceof ApiException) {
      switch (error.code) {
        case "NETWORK_ERROR":
          if (
            error.message.includes("CORS") ||
            error.message.includes("cors")
          ) {
            return t("toast.corsError");
          }
          return t("toast.networkError");
        case "UNAUTHORIZED":
          if (
            error.message.toLowerCase().includes("session") ||
            error.message.toLowerCase().includes("expired")
          ) {
            return t("toast.sessionExpired");
          }
          return isAzureFlow
            ? t("auth.azureLoginFailed")
            : t("toast.invalidCredentials");
        case "FORBIDDEN":
          return isAzureFlow
            ? t("auth.azureLoginFailed")
            : t("toast.invalidCredentials");
        case "TIMEOUT":
          return t("toast.timeoutError");
        case "SERVER_ERROR":
          return t("toast.serverError");
        case "VALIDATION_ERROR":
          return isAzureFlow
            ? t("auth.azureLoginFailed")
            : error.message || t("toast.invalidCredentials");
        case "NOT_FOUND":
          return t("toast.serverError");
        case "CONFLICT":
          return error.message || t("toast.unknownError");
        case "CANCELLED":
          return t("toast.unknownError");
        case "UNKNOWN":
        default:
          return isAzureFlow
            ? t("auth.azureLoginFailed")
            : error.message || t("toast.unknownError");
      }
    }
    if (error instanceof Error) {
      if (error.message.includes("Network") || error.message.includes("CORS")) {
        return t("toast.networkError");
      }
      if (
        error.message.toLowerCase().includes("session") ||
        error.message.toLowerCase().includes("expired")
      ) {
        return t("toast.sessionExpired");
      }
      if (error.message.toLowerCase().includes("azure") || isAzureFlow) {
        return t("auth.azureLoginFailed");
      }
      return error.message || t("toast.unknownError");
    }
    return isAzureFlow ? t("auth.azureLoginFailed") : t("auth.loginFailed");
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await login(email.trim(), password);
      const userRole = (response.user?.role as UserRole) || "employee";
      onLoginSuccess?.(userRole);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setErrors({ general: errorMessage });
      showError(errorMessage, t("toast.loginErrorTitle"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAzureErrorMessage = (errorType: AzureErrorType): string => {
    switch (errorType) {
      case "not_configured":
        return t("auth.azureNotConfigured");
      case "no_token":
      case "auth_failed":
        return t("auth.azureLoginFailed");
      case "cancelled":
        return "";
      default:
        return t("auth.azureLoginFailed");
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsMicrosoftSubmitting(true);
    setErrors({});

    try {
      console.log('[LoginScreen] Starting Microsoft login...');
      const result = await promptAzureAsync();

      console.log('[LoginScreen] Azure auth result:', {
        hasResult: !!result,
        errorType: result?.errorType,
        hasAccessToken: !!result?.accessToken,
        accessTokenLength: result?.accessToken?.length || 0,
      });

      if (!result) {
        console.log('[LoginScreen] No result from Azure auth (web redirect?)');
        setIsMicrosoftSubmitting(false);
        return;
      }

      if (result.errorType) {
        console.log('[LoginScreen] Azure auth error type:', result.errorType);
        if (result.errorType === "cancelled") {
          setIsMicrosoftSubmitting(false);
          return;
        }
        const errorMessage = getAzureErrorMessage(result.errorType);
        setErrors({ general: errorMessage });
        showError(errorMessage, t("toast.loginErrorTitle"));
        setIsMicrosoftSubmitting(false);
        return;
      }

      if (!result.accessToken) {
        console.log('[LoginScreen] No access token in result');
        const errorMessage = t("auth.azureLoginFailed");
        setErrors({ general: errorMessage });
        showError(errorMessage, t("toast.loginErrorTitle"));
        setIsMicrosoftSubmitting(false);
        return;
      }

      console.log('[LoginScreen] Calling ssoLogin with token length:', result.accessToken.length);
      const user = await ssoLogin({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
      console.log('[LoginScreen] ssoLogin successful, user role:', user.role);
      const userRole = (user.role as UserRole) || "employee";
      onLoginSuccess?.(userRole);
    } catch (error) {
      console.error('[LoginScreen] Microsoft login error:', error);
      console.error('[LoginScreen] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        status: (error as any)?.status,
        response: (error as any)?.response,
        stack: error instanceof Error ? error.stack : undefined,
      });
      const errorMessage = getErrorMessage(error, true);
      setErrors({ general: errorMessage });
      showError(errorMessage, t("toast.loginErrorTitle"));
    } finally {
      setIsMicrosoftSubmitting(false);
    }
  };

  const getInputContainerStyle = (field: "email" | "password") => {
    const isFocused = focusedField === field;
    const hasError = errors[field];

    return [
      styles.inputContainer,
      {
        backgroundColor: theme.surface,
        borderColor: hasError
          ? theme.error
          : isFocused
            ? theme.primary
            : theme.border,
        borderWidth: isFocused ? 2 : 1,
      },
    ];
  };

  const isFormFilled = email.trim().length > 0 && password.trim().length > 0;
  const hasErrors = errors.email !== undefined || errors.password !== undefined;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <ThemedText
            style={[
              Typography.display,
              { textAlign: "center", marginTop: Spacing.xxxl },
            ]}
          >
            {t("common.welcomeTitle")}
          </ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText
            style={[
              Typography.body,
              {
                color: theme.textSecondary,
                textAlign: "center",
                marginBottom: Spacing.xxxl,
              },
            ]}
          >
            {t("auth.loginSubtitle")}
          </ThemedText>

          <View style={styles.form}>
            <ThemedText
              style={[
                Typography.label,
                {
                  color: theme.textSecondary,
                  marginBottom: Spacing.xs,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {t("form.emailAddress").toUpperCase()}
            </ThemedText>
            <View
              style={[
                getInputContainerStyle("email"),
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <DDIcon name="mail" size={INPUT_ICON_SIZE} variant="muted" />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    textAlign: isRTL ? "right" : "left",
                    writingDirection: isRTL ? "rtl" : "ltr",
                  },
                  Platform.OS === "web"
                    ? ({ outlineStyle: "none" } as any)
                    : {},
                ]}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
            {errors.email ? (
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.error,
                    marginTop: Spacing.xs,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {errors.email}
              </ThemedText>
            ) : null}

            <Spacer height={Spacing.lg} />

            <ThemedText
              style={[
                Typography.label,
                {
                  color: theme.textSecondary,
                  marginBottom: Spacing.xs,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {t("auth.password").toUpperCase()}
            </ThemedText>
            <View
              style={[
                getInputContainerStyle("password"),
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <DDIcon name="lock" size={INPUT_ICON_SIZE} variant="muted" />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    textAlign: isRTL ? "right" : "left",
                    writingDirection: isRTL ? "rtl" : "ltr",
                  },
                  Platform.OS === "web"
                    ? ({ outlineStyle: "none" } as any)
                    : {},
                ]}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password)
                    setErrors({ ...errors, password: undefined });
                }}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                <DDIcon
                  name={showPassword ? "eye-off" : "eye"}
                  size={INPUT_ICON_SIZE}
                  variant="muted"
                />
              </Pressable>
            </View>
            {errors.password ? (
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.error,
                    marginTop: Spacing.xs,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {errors.password}
              </ThemedText>
            ) : null}

            <Spacer height={Spacing.lg} />

            <View style={styles.rememberForgotRow}>
              <Pressable
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: rememberMe ? theme.primary : theme.border,
                      backgroundColor: rememberMe
                        ? theme.primary
                        : "transparent",
                    },
                  ]}
                >
                  {rememberMe ? (
                    <DDIcon name="check" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <ThemedText
                  style={[Typography.bodySmall, { marginStart: Spacing.sm }]}
                >
                  {t("auth.rememberMe")}
                </ThemedText>
              </Pressable>
{/* Forgot password hidden per user request
              <Pressable onPress={onForgotPassword}>
                <ThemedText
                  style={[Typography.bodySmall, { color: theme.primary }]}
                >
                  {t("auth.forgotPassword")}
                </ThemedText>
              </Pressable>
*/}
            </View>

            <Spacer height={Spacing.xl} />

            {errors.general ? (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: `${theme.error}15`,
                    borderColor: theme.error,
                  },
                ]}
              >
                <DDIcon name="alert-circle" size={18} color={theme.error} />
                <ThemedText
                  style={[
                    Typography.bodySmall,
                    { color: theme.error, marginStart: Spacing.sm, flex: 1 },
                  ]}
                >
                  {errors.general}
                </ThemedText>
              </View>
            ) : null}

            <LoadingButton
              onPress={handleLogin}
              loading={isSubmitting || authLoading}
              disabled={!isFormFilled || hasErrors}
              variant="primary"
              size="large"
              loadingText={t("auth.signingIn")}
              style={styles.loginButton}
            >
              {t("auth.signIn")}
            </LoadingButton>

            <View style={styles.dividerContainer}>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.border }]}
              />
              <ThemedText
                style={[
                  Typography.bodySmall,
                  { color: theme.textSecondary, paddingHorizontal: Spacing.md },
                ]}
              >
                {t("common.or")}
              </ThemedText>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.border }]}
              />
            </View>

            <Pressable
              style={[
                styles.microsoftButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: isMicrosoftSubmitting || isAzureLoading ? 0.7 : 1,
                },
              ]}
              onPress={handleMicrosoftLogin}
              disabled={isMicrosoftSubmitting || isAzureLoading || isSubmitting}
            >
              {isMicrosoftSubmitting || isAzureLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <DDIcon name="globe" size={INPUT_ICON_SIZE} variant="primary" />
              )}
              <ThemedText
                style={[
                  Typography.body,
                  {
                    color: theme.text,
                    fontWeight: "600",
                    marginStart: Spacing.sm,
                  },
                ]}
              >
                {isMicrosoftSubmitting || isAzureLoading
                  ? t("auth.signingIn")
                  : t("auth.signInWithMicrosoft")}
              </ThemedText>
            </Pressable>
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
    width: "100%",
    alignSelf: "center",
  },
  logo: {
    width: 320,
    height: 100,
    alignSelf: "center",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    height: INPUT_HEIGHT,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: INPUT_FONT_SIZE,
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  rememberForgotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButton: {
    height: INPUT_HEIGHT,
  },
  microsoftButton: {
    height: INPUT_HEIGHT,
    borderRadius: BorderRadius.pill,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
});
