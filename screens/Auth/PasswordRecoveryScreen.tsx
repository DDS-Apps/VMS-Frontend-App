import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AppState,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollView } from "@/components/NativeKeyboardAwareScrollView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { DirectionalRow } from "@/components/DirectionalRow";
import { DDIcon } from "@/components/DDIcon";
import { BorderRadius, Spacing, Typography, getInputFontFamily } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { authService } from "@/services/api/authService";
import { PasswordResetError, type PasswordResetErrorKind } from "@/services/api/passwordResetService";
import { newPasswordPolicyError } from "@/utils/newPasswordPolicy";

export interface PasswordRecoveryScreenProps {
  mode: "request" | "reset" | "success";
  token: string | null;
  initialEmail?: string;
  onRequestNewLink: () => void;
  onBackToLogin: () => void;
  onResetSuccess: () => void;
}

type LinkState = "pending" | "valid" | "invalid" | "error";
type Field = "email" | "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;
type Translate = ReturnType<typeof useTranslation>["t"];

function safeKind(error: unknown): PasswordResetErrorKind {
  return error instanceof PasswordResetError ? error.kind : "unavailable";
}

function errorText(kind: PasswordResetErrorKind, mode: PasswordRecoveryScreenProps["mode"], t: Translate) {
  switch (kind) {
    case "network": return t("passwordRecovery.networkError");
    case "rateLimit": return t("passwordRecovery.rateLimitError");
    case "validation": return t(mode === "request" ? "passwordRecovery.requestValidationError" : "passwordRecovery.policyError");
    case "invalidLink": return t("passwordRecovery.invalidBody");
    default: return t("passwordRecovery.unavailableError");
  }
}

// Add explicit native accessibility semantics without changing the shared button.
function RecoveryButton({
  label, onPress, loading = false, disabled = false, loadingText, variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  loadingText?: string;
  variant?: "primary" | "outline" | "ghost";
}) {
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={loading && loadingText ? loadingText : label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onAccessibilityTap={() => { if (!disabled && !loading) onPress(); }}
    >
      <LoadingButton
        onPress={onPress}
        loading={loading}
        disabled={disabled}
        loadingText={loadingText}
        variant={variant}
        size="large"
        fullWidth
        style={styles.button}
        textStyle={styles.buttonText}
      >
        {label}
      </LoadingButton>
    </View>
  );
}

export default function PasswordRecoveryScreen(props: PasswordRecoveryScreenProps) {
  // Survives page-mode changes and editing email; never reset by a form edit.
  const requestCooldownDeadline = useRef(0);
  const resetCooldownDeadline = useRef(0);
  const pageIdentity = useRef({ mode: props.mode, token: props.token, generation: 0 });
  if (pageIdentity.current.mode !== props.mode || pageIdentity.current.token !== props.token) {
    if (pageIdentity.current.token !== props.token) resetCooldownDeadline.current = 0;
    pageIdentity.current = { mode: props.mode, token: props.token, generation: pageIdentity.current.generation + 1 };
  }
  return (
    <RecoveryPage
      key={pageIdentity.current.generation}
      {...props}
      cooldownDeadline={props.mode === "request" ? requestCooldownDeadline : resetCooldownDeadline}
    />
  );
}

function RecoveryPage({
  mode, token, initialEmail = "", onRequestNewLink, onBackToLogin, onResetSuccess,
  cooldownDeadline,
}: PasswordRecoveryScreenProps & { cooldownDeadline: React.MutableRefObject<number> }) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { locale, isRTL, setLocale, isChangingLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const mounted = useRef(false);
  const submitGuard = useRef(false);
  const validationGuard = useRef(false);
  const validationSequence = useRef(0);
  const expiresAt = useRef(0);
  const confirmInput = useRef<TextInput>(null);
  const [now, setNow] = useState(Date.now());
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorKind, setErrorKind] = useState<PasswordResetErrorKind | null>(null);
  const [languageError, setLanguageError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [editingEmail, setEditingEmail] = useState(true);
  const [linkState, setLinkState] = useState<LinkState>(token ? "pending" : "invalid");

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      validationSequence.current += 1;
      validationGuard.current = false;
    };
  }, []);

  // Absolute wall-clock checks also catch time spent backgrounded on mobile.
  useEffect(() => {
    const tick = () => {
      if (!mounted.current) return;
      const time = Date.now();
      setNow(time);
      if (mode === "reset" && expiresAt.current > 0 && time >= expiresAt.current) {
        setLinkState("invalid");
        setNewPassword("");
        setConfirmPassword("");
      }
    };
    const interval = setInterval(tick, 1000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") tick();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [mode]);

  function applyRateLimit(error: unknown) {
    if (!(error instanceof PasswordResetError) || error.kind !== "rateLimit") return;
    const seconds = Number.isFinite(error.retryAfterSeconds) && error.retryAfterSeconds > 0
      ? error.retryAfterSeconds : 60;
    cooldownDeadline.current = Math.max(cooldownDeadline.current, Date.now() + Math.ceil(seconds) * 1000);
    setNow(Date.now());
  }

  async function validateLink() {
    if (!mounted.current || validationGuard.current || mode !== "reset") return;
    if (!token) { setLinkState("invalid"); return; }
    if (Date.now() < cooldownDeadline.current) return;
    validationGuard.current = true;
    const sequence = ++validationSequence.current;
    setLinkState("pending");
    setErrorKind(null);
    try {
      const result = await authService.validateResetPassword(token);
      if (!mounted.current || sequence !== validationSequence.current) return;
      const expiry = Date.parse(result.expiresAt);
      if (!Number.isFinite(expiry)) {
        setErrorKind("unavailable");
        setLinkState("error");
      } else if (expiry <= Date.now()) {
        setLinkState("invalid");
      } else {
        expiresAt.current = expiry;
        setLinkState("valid");
      }
    } catch (error) {
      if (!mounted.current || sequence !== validationSequence.current) return;
      applyRateLimit(error);
      const kind = safeKind(error);
      setErrorKind(kind);
      setLinkState(kind === "invalidLink" ? "invalid" : "error");
    } finally {
      if (mounted.current && sequence === validationSequence.current) validationGuard.current = false;
    }
  }

  useEffect(() => {
    if (mode === "reset") void validateLink();
    // This keyed page has a fixed mode and token. Language changes must not
    // restart validation or discard in-progress password edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestLink() {
    if (!mounted.current || submitGuard.current || mode !== "request" || Date.now() < cooldownDeadline.current) return;
    const address = email.trim();
    if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setFieldErrors({ email: address ? "form.invalidEmail" : "form.required" });
      return;
    }
    submitGuard.current = true;
    setSubmitting(true);
    setErrorKind(null);
    setFieldErrors({});
    // A resend failure must not keep showing the previous confirmation.
    setRequestSent(false);
    try {
      await authService.forgotPassword({ email: address, locale });
      if (!mounted.current) return;
      cooldownDeadline.current = Math.max(cooldownDeadline.current, Date.now() + 60000);
      setNow(Date.now());
      setRequestSent(true);
      setEditingEmail(false);
    } catch (error) {
      if (!mounted.current) return;
      applyRateLimit(error);
      setErrorKind(safeKind(error));
      setEditingEmail(true);
    } finally {
      if (mounted.current) { submitGuard.current = false; setSubmitting(false); }
    }
  }

  async function resetPassword() {
    if (!mounted.current || submitGuard.current || mode !== "reset" || linkState !== "valid") return;
    if (!token || expiresAt.current <= Date.now()) {
      setLinkState("invalid");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }
    if (Date.now() < cooldownDeadline.current) return;
    const errors: FieldErrors = {};
    const passwordError = newPasswordPolicyError(newPassword);
    if (passwordError) errors.newPassword = passwordError;
    if (!confirmPassword.trim()) errors.confirmPassword = "form.required";
    else if (newPassword !== confirmPassword) errors.confirmPassword = "auth.passwordsDoNotMatch";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    submitGuard.current = true;
    setSubmitting(true);
    setErrorKind(null);
    try {
      // Passwords are compared and sent exactly as entered, never trimmed.
      await authService.resetPassword({ token, newPassword, confirmPassword });
      if (!mounted.current) return;
      setNewPassword("");
      setConfirmPassword("");
      setShowNew(false);
      setShowConfirm(false);
      onResetSuccess();
    } catch (error) {
      if (!mounted.current) return;
      applyRateLimit(error);
      const kind = safeKind(error);
      setErrorKind(kind);
      if (kind === "invalidLink") {
        setLinkState("invalid");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      if (mounted.current) { submitGuard.current = false; setSubmitting(false); }
    }
  }

  const remaining = Math.max(0, Math.ceil((cooldownDeadline.current - now) / 1000));
  const aligned = { textAlign: isRTL ? "right" as const : "left" as const, writingDirection: isRTL ? "rtl" as const : "ltr" as const };
  const invalid = mode === "reset" && (linkState === "invalid" || (expiresAt.current > 0 && now >= expiresAt.current));
  const title = mode === "success" ? "successTitle" : mode === "request" ? "requestTitle" : invalid ? "invalidTitle" : "resetTitle";
  const subtitle = mode === "success" ? "successBody" : mode === "request" ? "requestSubtitle" : invalid ? "invalidBody" : "resetSubtitle";

  function renderField(field: Field) {
    const isEmail = field === "email";
    const isNew = field === "newPassword";
    const value = isEmail ? email : isNew ? newPassword : confirmPassword;
    const shown = isNew ? showNew : showConfirm;
    const label = t(isEmail ? "form.emailAddress" : isNew ? "auth.newPassword" : "auth.confirmNewPassword");
    return (
      <View style={styles.field}>
        <ThemedText style={[Typography.label, aligned, styles.label, { color: theme.textSecondary }]}>{label.toUpperCase()}</ThemedText>
        <DirectionalRow style={[
          styles.inputContainer,
          { backgroundColor: theme.surface, borderColor: fieldErrors[field] ? theme.error : focused === field ? theme.primary : theme.border, borderWidth: focused === field ? 2 : 1 },
        ]}>
          <DDIcon name={isEmail ? "mail" : "lock"} size={22} variant="muted" />
          <TextInput
            ref={field === "confirmPassword" ? confirmInput : undefined}
            accessibilityLabel={label}
            accessibilityHint={fieldErrors[field] ? t(fieldErrors[field]!) : undefined}
            style={[
              styles.input,
              aligned,
              { color: theme.text, fontFamily: getInputFontFamily(value, isRTL) },
              // The container retains the visible focus border for keyboard users.
              Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {},
            ]}
            placeholder={t(isEmail ? "auth.emailPlaceholder" : isNew ? "auth.enterNewPassword" : "auth.confirmNewPasswordPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            value={value}
            onChangeText={text => {
              if (isEmail) { setEmail(text); setRequestSent(false); }
              else if (isNew) setNewPassword(text);
              else setConfirmPassword(text);
              setFieldErrors(previous => ({ ...previous, [field]: undefined }));
              setErrorKind(null);
            }}
            editable={!submitting}
            keyboardType={isEmail ? "email-address" : "default"}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete={isEmail ? "email" : "new-password"}
            textContentType={isEmail ? "emailAddress" : "newPassword"}
            secureTextEntry={!isEmail && !shown}
            onFocus={() => setFocused(field)}
            onBlur={() => setFocused(null)}
            returnKeyType={isNew ? "next" : "go"}
            onSubmitEditing={() => { if (isEmail) void requestLink(); else if (isNew) confirmInput.current?.focus(); else void resetPassword(); }}
          />
          {!isEmail ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(shown ? "passwordRecovery.hidePassword" : "passwordRecovery.showPassword", { field: label })}
              accessibilityState={{ disabled: submitting }}
              disabled={submitting}
              onPress={() => { if (isNew) setShowNew(!showNew); else setShowConfirm(!showConfirm); }}
              style={styles.eyeButton}
              hitSlop={4}
            >
              <DDIcon name={shown ? "eye-off" : "eye"} size={22} variant="muted" />
            </Pressable>
          ) : null}
        </DirectionalRow>
        {isNew ? <ThemedText style={[Typography.caption, aligned, { color: theme.textSecondary, marginTop: Spacing.xs }]}>{t("auth.newPasswordGuidance")}</ThemedText> : null}
        {fieldErrors[field] ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" style={[Typography.caption, aligned, { color: theme.error, marginTop: Spacing.xs }]}>{t(fieldErrors[field]!)}</ThemedText> : null}
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? theme.background : "#FFFFFF" }]}>
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: isDark ? theme.background : "#FFFFFF" }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={[styles.languageRow, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("passwordRecovery.languageSwitch")}
              accessibilityState={{ disabled: isChangingLanguage, busy: isChangingLanguage }}
              disabled={isChangingLanguage}
              style={[styles.languageButton, { borderColor: theme.border }]}
              onPress={async () => {
                setLanguageError(false);
                try { await setLocale(locale === "en" ? "ar" : "en"); }
                catch { if (mounted.current) setLanguageError(true); }
              }}
            >
              <ThemedText style={[Typography.bodySmall, { color: theme.primary }]}>{locale === "en" ? "العربية" : "English"}</ThemedText>
            </Pressable>
          </View>
          <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" accessibilityLabel={t("common.brandName")} />
          <ThemedText accessibilityRole="header" style={[Typography.display, styles.title]}>{t(`passwordRecovery.${title}`)}</ThemedText>
          <ThemedText style={[Typography.body, styles.subtitle, { color: theme.textSecondary }]}>{t(`passwordRecovery.${subtitle}`)}</ThemedText>

          {languageError ? <ThemedText accessibilityRole="alert" style={[Typography.bodySmall, aligned, { color: theme.error }]}>{t("passwordRecovery.languageError")}</ThemedText> : null}
          {mode === "request" ? (
            <>
              {requestSent ? (
                <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <ThemedText accessibilityRole="header" style={[Typography.subtitle, aligned]}>{t("passwordRecovery.emailSentTitle")}</ThemedText>
                  <ThemedText style={[Typography.body, aligned, { marginTop: Spacing.sm }]}>{t("passwordRecovery.emailSentBody")}</ThemedText>
                </View>
              ) : null}
              {editingEmail ? renderField("email") : null}
              {!editingEmail ? <RecoveryButton label={t("passwordRecovery.editEmail")} variant="ghost" onPress={() => { setEditingEmail(true); setRequestSent(false); setErrorKind(null); }} /> : null}
            </>
          ) : null}

          {mode === "reset" && !invalid && linkState === "pending" ? (
            <View accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} style={styles.pending}>
              <ThemedText style={[Typography.body, aligned]}>{t("passwordRecovery.checkingLink")}</ThemedText>
              <View accessible={false} style={[styles.skeleton, { backgroundColor: theme.surfaceSecondary }]} />
              <View accessible={false} style={[styles.skeleton, { backgroundColor: theme.surfaceSecondary }]} />
            </View>
          ) : null}
          {mode === "reset" && !invalid && linkState === "valid" ? (
            <>
              {renderField("newPassword")}
              <ThemedText style={[Typography.caption, aligned, styles.hint, { color: theme.textSecondary }]}>{t("passwordRecovery.passwordHint")}</ThemedText>
              {renderField("confirmPassword")}
            </>
          ) : null}

          {errorKind && !invalid ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice, { borderColor: theme.error, backgroundColor: theme.surface }]}>
              <ThemedText style={[Typography.bodySmall, aligned, { color: theme.error }]}>{errorText(errorKind, mode, t)}</ThemedText>
            </View>
          ) : null}
          {remaining > 0 && mode !== "success" && !invalid ? (
            <ThemedText style={[Typography.bodySmall, aligned, styles.hint, { color: theme.textSecondary }]}>{t("passwordRecovery.cooldown", { seconds: remaining })}</ThemedText>
          ) : null}

          <View style={styles.actions}>
            {mode === "request" ? (
              <RecoveryButton
                label={t(requestSent ? "passwordRecovery.resendLink" : "passwordRecovery.sendLink")}
                onPress={() => void requestLink()}
                loading={submitting}
                loadingText={t("passwordRecovery.sendingLink")}
                disabled={remaining > 0 || !email.trim()}
              />
            ) : null}
            {mode === "reset" && invalid ? <RecoveryButton label={t("passwordRecovery.requestNewLink")} onPress={onRequestNewLink} /> : null}
            {mode === "reset" && !invalid && linkState === "error" ? <RecoveryButton label={t("passwordRecovery.retry")} onPress={() => void validateLink()} disabled={remaining > 0} /> : null}
            {mode === "reset" && !invalid && linkState === "valid" ? (
              <RecoveryButton
                label={t("passwordRecovery.resetPassword")}
                onPress={() => void resetPassword()}
                loading={submitting}
                loadingText={t("passwordRecovery.resettingPassword")}
                disabled={remaining > 0 || !newPassword || !confirmPassword}
              />
            ) : null}
            <RecoveryButton label={t("passwordRecovery.backToLogin")} onPress={onBackToLogin} variant={mode === "success" ? "primary" : "ghost"} />
          </View>
          {mode === "request" ? (
            <View style={[styles.guidance, { borderColor: theme.border }]}>
              <ThemedText style={[Typography.bodySmall, aligned, { color: theme.textSecondary }]}>{t("passwordRecovery.microsoftGuidance")}</ThemedText>
            </View>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.xl },
  content: { width: "100%", maxWidth: 400, alignSelf: "center" },
  languageRow: { marginBottom: Spacing.lg },
  languageButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.sm },
  logo: { width: 340, height: 100, alignSelf: "center" },
  title: { textAlign: "center", marginTop: Spacing.xxxl, lineHeight: 48 },
  subtitle: { textAlign: "center", marginTop: Spacing.sm, marginBottom: Spacing.xxxl },
  field: { marginBottom: Spacing.lg },
  label: { marginBottom: Spacing.xs },
  inputContainer: { height: 56, alignItems: "center", paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, gap: Spacing.md },
  input: { flex: 1, minWidth: 0, height: "100%", fontSize: 17 },
  eyeButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  hint: { marginBottom: Spacing.lg },
  notice: { padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: Spacing.lg },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
  button: { height: 56 },
  buttonText: { flexShrink: 1, textAlign: "center" },
  guidance: { borderTopWidth: 1, paddingTop: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.md },
  pending: { gap: Spacing.md, marginBottom: Spacing.lg },
  skeleton: { height: 56, borderRadius: BorderRadius.sm },
});
