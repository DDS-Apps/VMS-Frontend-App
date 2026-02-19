import React, { useState, useRef } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import Constants from "expo-constants";
import { TERMS_CONTENT, PRIVACY_CONTENT } from "./legalContent";

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

function WebLegalContent({ page, isRTL, isDark }: {
  page: "terms" | "privacy";
  isRTL: boolean;
  isDark: boolean;
}) {
  const { theme } = useTheme();
  const lang = isRTL ? 'ar' : 'en';
  const content = page === 'terms' ? TERMS_CONTENT[lang] : PRIVACY_CONTENT[lang];

  return (
    <ScrollView
      style={styles.webScrollView}
      contentContainerStyle={styles.webScrollContent}
      showsVerticalScrollIndicator={true}
    >
      <View style={[styles.webHeader, { backgroundColor: '#F58423' }]}>
        <View style={styles.webHeaderContent}>
          <ThemedText style={styles.webBrandName}>{content.brandName}</ThemedText>
          <ThemedText style={styles.webBrandSub}>{content.brandSub}</ThemedText>
          <View style={styles.webPageTitleDivider} />
          <ThemedText style={styles.webPageTitle}>{content.pageTitle}</ThemedText>
        </View>
      </View>

      <View style={styles.webContainer}>
        <View style={[styles.webCard, {
          backgroundColor: isDark ? '#282829' : '#ffffff',
          shadowColor: isDark ? '#000' : '#000',
        }]}>
          <ThemedText style={[styles.webLastUpdated, { color: theme.textSecondary }]}>
            {content.lastUpdated}
          </ThemedText>

          {content.sections.map((section: any, index: number) => (
            <View key={index} style={styles.webSection}>
              <ThemedText style={[styles.webSectionTitle, { color: '#F58423' }]}>
                {section.title}
              </ThemedText>
              {section.body ? (
                <ThemedText style={[styles.webSectionBody, { color: theme.text }]}>
                  {section.body}
                </ThemedText>
              ) : null}
              {section.subsections ? section.subsections.map((sub: any, subIdx: number) => (
                <View key={subIdx} style={styles.webSubsection}>
                  <ThemedText style={[styles.webSubsectionTitle, { color: theme.text }]}>
                    {sub.subtitle}
                  </ThemedText>
                  {sub.items ? sub.items.map((item: string, itemIdx: number) => (
                    <View key={itemIdx} style={[styles.webListItem, isRTL ? { paddingRight: 20, paddingLeft: 0 } : null]}>
                      <ThemedText style={[styles.webBullet, isRTL ? { left: 'auto' as any, right: 4 } : null, { color: '#F58423' }]}>
                        {'\u2022'}
                      </ThemedText>
                      <ThemedText style={[styles.webListText, { color: theme.text }]}>
                        {item}
                      </ThemedText>
                    </View>
                  )) : null}
                </View>
              )) : null}
              {section.items ? section.items.map((item: string, itemIdx: number) => (
                <View key={itemIdx} style={[styles.webListItem, isRTL ? { paddingRight: 20, paddingLeft: 0 } : null]}>
                  <ThemedText style={[styles.webBullet, isRTL ? { left: 'auto' as any, right: 4 } : null, { color: '#F58423' }]}>
                    {'\u2022'}
                  </ThemedText>
                  <ThemedText style={[styles.webListText, { color: theme.text }]}>
                    {item}
                  </ThemedText>
                </View>
              )) : null}
              {section.footer ? (
                <ThemedText style={[styles.webSectionBody, { color: theme.text, marginTop: 8 }]}>
                  {section.footer}
                </ThemedText>
              ) : null}
              {section.contact ? (
                <View style={styles.webContactBlock}>
                  <ThemedText style={[styles.webSectionBody, { color: theme.text }]}>
                    {section.contact}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function NativeWebContent({ url, isLoading, setIsLoading, setHasError, theme }: {
  url: string;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  setHasError: (v: boolean) => void;
  theme: any;
}) {
  const WebView = require("react-native-webview").WebView;
  const webViewRef = useRef<any>(null);

  return (
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
  );
}

export default function LegalWebViewScreen({ page, title, onBack }: LegalWebViewScreenProps) {
  const { theme, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const lang = isRTL ? "ar" : "en";
  const themeParam = isDark ? "dark" : "light";
  const pagePath = PAGE_PATHS[page] || `${page}.html`;
  const url = `${LEGAL_PAGES_BASE_URL}/${pagePath}?lang=${lang}&theme=${themeParam}`;

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  const renderHeader = () => (
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
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
        {renderHeader()}
        <WebLegalContent page={page} isRTL={isRTL} isDark={isDark} />
      </View>
    );
  }

  if (!LEGAL_PAGES_BASE_URL) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {renderHeader()}
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
      {renderHeader()}

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
        <NativeWebContent
          url={url}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          setHasError={setHasError}
          theme={theme}
        />
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
  webScrollView: {
    flex: 1,
  },
  webScrollContent: {
    paddingBottom: 40,
  },
  webHeader: {
    padding: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  webHeaderContent: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  webBrandName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  webBrandSub: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
  },
  webPageTitleDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 12,
  },
  webPageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 12,
  },
  webContainer: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
    padding: 16,
    paddingTop: 20,
  },
  webCard: {
    borderRadius: 12,
    padding: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  webLastUpdated: {
    fontSize: 13,
    marginBottom: 4,
  },
  webSection: {
    marginBottom: 24,
  },
  webSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  webSectionBody: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  webSubsection: {
    marginTop: 12,
  },
  webSubsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  webListItem: {
    paddingLeft: 20,
    paddingVertical: 4,
    position: 'relative',
  },
  webBullet: {
    position: 'absolute',
    left: 4,
    top: 4,
    fontWeight: '700',
    fontSize: 14,
  },
  webListText: {
    fontSize: 14,
    lineHeight: 22,
  },
  webContactBlock: {
    marginTop: 4,
  },
});
