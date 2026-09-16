import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { BrandColors, Spacing, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Branded startup screen.
 *
 * Purely presentational: it is shown by AppContent for exactly as long as
 * startup work (locale verification, session restore) is pending and is
 * replaced the moment that work finishes. It adds no fixed delay of its own.
 */
export default function SplashScreen() {
  const { t } = useTranslation();
  const logoSource = require("@/assets/images/logo.png");

  return (
    <View style={styles.container}>
      <Image
        source={logoSource}
        style={styles.logo}
        resizeMode="contain"
      />
      <ThemedText style={styles.welcomeText}>
        {t('common.welcomeTitle')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 400,
    height: 160,
  },
  welcomeText: {
    ...Typography.display,
    color: BrandColors.brandGrey,
    marginTop: Spacing.lg,
    textAlign: 'center',
    fontSize: 22,
  },
});
