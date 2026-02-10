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
          <ThemedText style={styles.brandTitle}>Dallah Albaraka</ThemedText>
          <ThemedText style={styles.brandSubtitle}>Visitor Management System</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.lastUpdated, { color: theme.textSecondary }]}>
            Last Updated: February 2026
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            1. Introduction
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            Dallah Albaraka Group ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Visitor Management System (VMS) mobile application.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            2. Information We Collect
          </ThemedText>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Personal Information
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`\u2022 Full name and contact information (email address, phone number)\n\u2022 Profile photograph (optional)\n\u2022 Company/organization affiliation\n\u2022 Government-issued identification details (for visitor verification)\n\u2022 Vehicle information (license plate, make, model) for parking and valet services`}
          </ThemedText>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Technical Information
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`\u2022 Device identifiers for push notification delivery\n\u2022 App usage data and interaction logs\n\u2022 Crash reports and diagnostic data (via Firebase Crashlytics)\n\u2022 IP address and general location data`}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            3. How We Use Your Information
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`We use the collected information to:\n\n\u2022 Manage visitor registrations, approvals, and check-ins\n\u2022 Provide parking and valet services\n\u2022 Send push notifications about visit status updates and approvals\n\u2022 Manage meeting room and buffet bookings\n\u2022 Authenticate and authorize users based on their assigned roles\n\u2022 Improve application performance and user experience\n\u2022 Ensure the security of our facilities and systems`}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            4. Data Sharing and Disclosure
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`We do not sell your personal information. We may share your data with:\n\n\u2022 Authorized personnel within Dallah Albaraka Group who need access for visitor management purposes\n\u2022 Service providers who assist in operating the VMS (e.g., cloud hosting, push notification services)\n\u2022 Law enforcement or regulatory authorities when required by applicable law`}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            5. Data Security
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            We implement appropriate technical and organizational measures to protect your personal information, including encryption in transit (TLS/SSL), secure authentication with JWT tokens, and role-based access controls. However, no method of electronic transmission or storage is 100% secure.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            6. Data Retention
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, comply with legal obligations, resolve disputes, and enforce our agreements. Visit records may be retained for security audit purposes as required by applicable regulations.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            7. Your Rights
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`You have the right to:\n\n\u2022 Access and review your personal information\n\u2022 Request correction of inaccurate data\n\u2022 Request deletion of your account and associated data\n\u2022 Opt out of non-essential push notifications\n\u2022 Withdraw consent for optional data processing`}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            8. Third-Party Services
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`Our application uses the following third-party services:\n\n\u2022 Firebase Cloud Messaging (FCM) for push notifications\n\u2022 Firebase Crashlytics for crash reporting and diagnostics\n\u2022 Microsoft Azure Active Directory for single sign-on authentication\n\nEach service has its own privacy policy governing data processing.`}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            9. Children's Privacy
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            This application is designed for business use and is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            10. Changes to This Policy
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy within the application. Your continued use of the VMS after such modifications constitutes your acknowledgment of the modified policy.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            11. Contact Us
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:{"\n\n"}Dallah Albaraka Group{"\n"}Email: support@dallahdigital.com
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
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});
