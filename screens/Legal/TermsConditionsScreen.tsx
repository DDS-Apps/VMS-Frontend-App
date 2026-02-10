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
          <ThemedText style={styles.brandTitle}>Dallah Albaraka</ThemedText>
          <ThemedText style={styles.brandSubtitle}>Visitor Management System</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.lastUpdated, { color: theme.textSecondary }]}>
            Last Updated: February 2026
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            1. Acceptance of Terms
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            By accessing or using the Dallah Albaraka Visitor Management System ("VMS" or "the Application"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must not use the Application.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            2. Description of Service
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            The VMS is a corporate visitor management application that enables organizations to manage visitor registrations, approvals, check-ins, parking, valet services, meeting room bookings, and buffet services. The Application supports multiple user roles including employees, managers, receptionists, security personnel, and administrators.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            3. User Accounts and Access
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`\u2022 Access to the Application is provided by your organization's administrator\n\u2022 You are responsible for maintaining the confidentiality of your account credentials\n\u2022 You must not share your login credentials with unauthorized individuals\n\u2022 You must immediately notify your administrator of any unauthorized use of your account\n\u2022 Access privileges are determined by your assigned role and may be modified by administrators at any time`}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            4. Acceptable Use
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`You agree to use the Application only for its intended purposes. You must not:\n\n\u2022 Use the Application for any unlawful purpose\n\u2022 Attempt to gain unauthorized access to any part of the system\n\u2022 Submit false or misleading information\n\u2022 Interfere with or disrupt the Application's functionality\n\u2022 Attempt to reverse engineer, decompile, or disassemble the Application\n\u2022 Use automated tools or scripts to access or extract data from the Application`}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            5. Visitor Obligations
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            {`Visitors using the Application to accept invitations or check in must:\n\n\u2022 Provide accurate personal and identification information\n\u2022 Comply with all facility security requirements\n\u2022 Follow check-in and check-out procedures\n\u2022 Adhere to all applicable facility rules and regulations\n\u2022 Provide accurate vehicle information if requesting parking or valet services`}
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            6. Intellectual Property
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            The Application, including its design, features, content, and underlying technology, is owned by Dallah Albaraka Group and is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Application without prior written consent.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            7. Data and Privacy
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            Your use of the Application is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By using the Application, you consent to the data practices described in the Privacy Policy.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            8. Push Notifications
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            The Application may send push notifications related to visit approvals, check-in reminders, and other operational updates. You can manage your notification preferences within the Application settings. Critical security notifications may not be disabled.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            9. Service Availability
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            We strive to maintain continuous availability of the Application but do not guarantee uninterrupted access. The Application may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We reserve the right to modify, suspend, or discontinue any feature of the Application at any time.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            10. Limitation of Liability
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            To the maximum extent permitted by applicable law, Dallah Albaraka Group shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Application. Our total liability for any claims related to the Application shall not exceed the amount you paid for access to the Application.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            11. Indemnification
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            You agree to indemnify and hold harmless Dallah Albaraka Group, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your violation of these Terms and Conditions or your misuse of the Application.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            12. Governing Law
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            These Terms and Conditions shall be governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of the Kingdom of Saudi Arabia.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            13. Changes to Terms
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            We reserve the right to update or modify these Terms and Conditions at any time. Material changes will be communicated through the Application. Your continued use of the Application after such modifications constitutes acceptance of the updated terms.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            14. Contact Information
          </ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            For questions about these Terms and Conditions, please contact:{"\n\n"}Dallah Albaraka Group{"\n"}Email: support@dallahdigital.com
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
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});
