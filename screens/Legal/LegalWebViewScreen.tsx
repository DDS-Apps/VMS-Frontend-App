import React, { useState, useRef } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing } from "@/constants/theme";
import Constants from "expo-constants";

const LEGAL_PAGES_BASE_URL =
  Constants.expoConfig?.extra?.legalPagesUrl ||
  process.env.EXPO_PUBLIC_LEGAL_PAGES_URL ||
  "";

const PAGE_PATHS: Record<string, string> = {
  terms: "terms-conditions.html",
  privacy: "privacy-policy.html",
};

interface LegalWebViewScreenProps {
  page: "terms" | "privacy";
  title: string;
  onBack?: () => void;
}

export default function LegalWebViewScreen({ page, title, onBack }: LegalWebViewScreenProps) {
  const { theme, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const lang = isRTL ? "ar" : "en";
  const themeParam = isDark ? "dark" : "light";
  const pagePath = PAGE_PATHS[page] || `${page}.html`;
  const url = `${LEGAL_PAGES_BASE_URL}/${pagePath}?lang=${lang}&theme=${themeParam}`;

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  if (!LEGAL_PAGES_BASE_URL) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, {
          paddingTop: insets.top + Spacing.md,
          backgroundColor: theme.surface,
          borderBottomColor: theme.border
        }]}>
          <DirectionalRow style={styles.headerRow} alignItems="center">
            {onBack ? (
              <Pressable onPress={onBack} style={styles.backButton}>
                <DDIcon name={isRTL ? "chevron-right" : "chevron-left"} size={24} variant="primary" />
              </Pressable>
            ) : null}
            <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
              {title}
            </ThemedText>
            <View style={{ width: 40 }} />
          </DirectionalRow>
        </View>
        <View style={styles.centerContent}>
          <DDIcon name="alert-circle" size={48} variant="muted" />
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
            {isRTL ? "الصفحة غير متوفرة حالياً" : "Page not available at this time"}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, {
        paddingTop: insets.top + Spacing.md,
        backgroundColor: theme.surface,
        borderBottomColor: theme.border
      }]}>
        <DirectionalRow style={styles.headerRow} alignItems="center">
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backButton}>
              <DDIcon name={isRTL ? "chevron-right" : "chevron-left"} size={24} variant="primary" />
            </Pressable>
          ) : null}
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            {title}
          </ThemedText>
          <View style={{ width: 40 }} />
        </DirectionalRow>
      </View>

      {hasError ? (
        <View style={styles.centerContent}>
          <DDIcon name="wifi-off" size={48} variant="muted" />
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
            {isRTL ? "تعذر تحميل الصفحة" : "Could not load page"}
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={handleRetry}
          >
            <ThemedText style={[styles.retryText, { color: "#FFFFFF" }]}>
              {isRTL ? "إعادة المحاولة" : "Try Again"}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          {isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : null}
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={[styles.webView, { opacity: isLoading ? 0 : 1 }]}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            onHttpError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            startInLoadingState={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
            showsVerticalScrollIndicator={false}
            originWhitelist={["*"]}
            cacheEnabled={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: {
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
