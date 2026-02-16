import React from "react";
import { StyleSheet, ScrollView, View, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { BrandColors } from "@/constants/theme";

interface PrivacyPolicyScreenProps {
  onBack?: () => void;
}

export default function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { 
        paddingTop: insets.top + Spacing.md, 
        backgroundColor: theme.surface,
        borderBottomColor: theme.border 
      }]}>
        <DirectionalRow style={styles.headerRow} alignItems="center">
          {onBack && (
            <Pressable onPress={onBack} style={styles.backButton}>
              <DDIcon name={isRTL ? "chevron-right" : "chevron-left"} size={24} variant="primary" />
            </Pressable>
          )}
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            {t('settings.privacyPolicy')}
          </ThemedText>
          <View style={{ width: 40 }} />
        </DirectionalRow>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
      >
        <View style={[styles.brandHeader, { backgroundColor: BrandColors.brandOrange }]}>
          <ThemedText style={styles.brandTitle}>{t('common.brandName')}</ThemedText>
          <ThemedText style={styles.brandSubtitle}>{t('common.welcomeSubtitle')}</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.lastUpdated, { color: theme.textSecondary }]}>
            {t('legal.lastUpdated')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.introduction')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.introductionBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.infoCollect')}
          </ThemedText>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.personalInfo')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.personalInfoBody')}
          </ThemedText>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.technicalInfo')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.technicalInfoBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.howWeUse')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.howWeUseBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.dataSharing')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.dataSharingBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.dataSecurity')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.dataSecurityBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.dataRetention')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.dataRetentionBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.yourRights')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.yourRightsBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.thirdParty')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.thirdPartyBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.childrenPrivacy')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.childrenPrivacyBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.changesToPolicy')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.changesToPolicyBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('legal.privacyPolicy.contactUs')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {t('legal.privacyPolicy.contactUsBody')}
          </ThemedText>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  brandHeader: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 33,
    marginBottom: Spacing.xs,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
    }),
  },
  lastUpdated: {
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 26,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});
