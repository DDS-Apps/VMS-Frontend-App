import React, { useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { ThemedText } from "@/components/ThemedText";
import { DirectionalRow } from "@/components/DirectionalRow";
import { BorderRadius, FontFamily, Spacing, Typography, getLocaleFontFamily } from "@/constants/theme";
import { APP_STORE_LINKS } from "@/constants/appStoreLinks";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";

type Store = "ios" | "android";

export default function AppDownloadSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [openError, setOpenError] = useState(false);

  // Keep downloads available in desktop/mobile browsers, not installed apps.
  if (Platform.OS !== "web") return null;

  const stores: { id: Store; name: string; action: string; testID: string }[] = [
    {
      id: "ios",
      name: t("auth.appStore"),
      action: t("auth.downloadOnAppStore"),
      testID: "download-ios",
    },
    {
      id: "android",
      name: t("auth.googlePlay"),
      action: t("auth.getItOnGooglePlay"),
      testID: "download-android",
    },
  ];

  const openStore = async (store: Store) => {
    setOpenError(false);
    try {
      await Linking.openURL(APP_STORE_LINKS[store]);
    } catch {
      setOpenError(true);
    }
  };

  return (
    <View style={[styles.section, { borderTopColor: theme.border }]}>
      <View style={styles.heading}>
        <ThemedText
          style={[
            Typography.title,
            { color: theme.text, textAlign: isRTL ? "right" : "left", fontFamily: getLocaleFontFamily(FontFamily.latinBold, isRTL) },
          ]}
        >
          {t("auth.appDownloadTitle")}
        </ThemedText>
        <ThemedText
          style={[
            Typography.bodySmall,
            { color: theme.textSecondary, textAlign: isRTL ? "right" : "left", fontFamily: getLocaleFontFamily(FontFamily.latinRegular, isRTL) },
          ]}
        >
          {t("auth.appDownloadDescription")}
        </ThemedText>
      </View>

      <DirectionalRow
        testID="app-download-cards"
        style={styles.cards}
        forceDirection={isRTL ? "row-reverse" : "row"}
        alignItems="stretch"
      >
        {stores.map((store) => (
          <Pressable
            key={store.id}
            testID={store.testID}
            accessibilityRole="link"
            accessibilityLabel={`${store.action} ${store.name}`}
            onPress={() => openStore(store.id)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <View style={styles.qrFrame}>
              <QRCode
                value={APP_STORE_LINKS[store.id]}
                size={112}
                color="#000000"
                backgroundColor="#FFFFFF"
                quietZone={8}
              />
            </View>
            <ThemedText
              style={[
                Typography.body,
                styles.storeName,
                { color: theme.text, fontFamily: getLocaleFontFamily(FontFamily.latinSemiBold, isRTL) },
              ]}
            >
              {store.name}
            </ThemedText>
            <ThemedText
              style={[
                Typography.caption,
                styles.storeAction,
                { color: theme.primary, fontFamily: getLocaleFontFamily(FontFamily.latinMedium, isRTL) },
              ]}
            >
              {store.action}
            </ThemedText>
          </Pressable>
        ))}
      </DirectionalRow>

      {openError ? (
        <ThemedText
          accessibilityRole="alert"
          style={[
            Typography.bodySmall,
            styles.error,
            { color: theme.error, fontFamily: getLocaleFontFamily(FontFamily.latinRegular, isRTL) },
          ]}
        >
          {t("errors.somethingWentWrong")}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.xxl,
    paddingTop: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  cards: {
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  card: {
    flexBasis: 180,
    flexGrow: 1,
    flexShrink: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minWidth: 0,
  },
  qrFrame: {
    backgroundColor: "#FFFFFF",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  storeName: {
    fontWeight: "600",
    textAlign: "center",
  },
  storeAction: {
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  error: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
