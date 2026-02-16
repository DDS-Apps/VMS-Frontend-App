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

interface TermsConditionsScreenProps {
  onBack?: () => void;
}

export default function TermsConditionsScreen({ onBack }: TermsConditionsScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const textAlign = isRTL ? 'right' as const : 'left' as const;
  const writingDirection = isRTL ? 'rtl' as const : 'ltr' as const;

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
            {t('settings.termsOfService')}
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
          <ThemedText style={[styles.lastUpdated, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.lastUpdated')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.acceptance')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.acceptanceBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.description')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.descriptionBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.userAccounts')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.userAccountsBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.acceptableUse')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.acceptableUseBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.visitorObligations')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.visitorObligationsBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.intellectualProperty')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.intellectualPropertyBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.dataPrivacy')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.dataPrivacyBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.pushNotifications')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.pushNotificationsBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.serviceAvailability')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.serviceAvailabilityBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.limitation')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.limitationBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.indemnification')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.indemnificationBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.governingLaw')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.governingLawBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.changesToTerms')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.changesToTermsBody')}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign, writingDirection }]}>
            {t('legal.termsConditions.contactInfo')}
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary, textAlign, writingDirection }]}>
            {t('legal.termsConditions.contactInfoBody')}
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
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});
