import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DDIcon } from "@/components/DDIcon";
import Constants from "expo-constants";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { UserRole } from "@/types/vms.types";
import { applyOpacity } from "@/utils/statusStyles";
import { SupportedLocale } from "@/constants/i18n";
import {
  getUserPreferences,
  updateUserNotificationPreferences,
  updateEventPreference,
  getRelevantEventTypesForRole,
  getEventTypeLabel,
  getEventTypeDescription,
  EmailSummaryFrequency,
  NotificationEventPreference,
} from "@/services/mock/userPreferencesState";

interface SettingsScreenProps {
  userRole?: UserRole;
  userName?: string;
  userEmail?: string;
  userId?: string;
  onLogout?: () => void;
}

export default function SettingsScreen({ 
  userRole = 'employee', 
  userName = 'User',
  userEmail,
  userId = 'user_default',
  onLogout 
}: SettingsScreenProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { t, locale, setLocale, locales, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<{ EditProfile: undefined }>>();
  
  const [preferences, setPreferences] = useState(() => getUserPreferences(userId, userRole));
  const [showEventPreferences, setShowEventPreferences] = useState(false);

  useEffect(() => {
    setPreferences(getUserPreferences(userId, userRole));
  }, [userId, userRole]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const getRoleLabel = (role: UserRole) => {
    const roleKeys: Record<UserRole, string> = {
      employee: 'roles.employee',
      manager: 'roles.manager',
      building_admin: 'roles.buildingAdmin',
      buffet_admin: 'roles.buffetAdmin',
      buffet_staff: 'roles.buffetStaff',
      valet_admin: 'roles.valetAdmin',
      valet_driver: 'roles.valetDriver',
      visitor: 'roles.visitor',
      receptionist: 'roles.receptionist',
      security: 'roles.security',
    };
    return t(roleKeys[role]);
  };

  const handleLanguageChange = async (langCode: SupportedLocale) => {
    await setLocale(langCode);
  };

  const handlePushToggle = (enabled: boolean) => {
    const updated = updateUserNotificationPreferences(userId, userRole, { pushEnabled: enabled });
    setPreferences(updated);
  };

  const handleEmailToggle = (enabled: boolean) => {
    const updated = updateUserNotificationPreferences(userId, userRole, { emailEnabled: enabled });
    setPreferences(updated);
  };

  const handleEmailFrequencyChange = (frequency: EmailSummaryFrequency) => {
    const updated = updateUserNotificationPreferences(userId, userRole, { emailSummaryFrequency: frequency });
    setPreferences(updated);
  };

  const handleEventPreferenceToggle = (eventKey: keyof NotificationEventPreference, enabled: boolean) => {
    const updated = updateEventPreference(userId, userRole, eventKey, enabled);
    setPreferences(updated);
  };

  const relevantEventTypes = getRelevantEventTypesForRole(userRole);
  const notificationsEnabled = preferences.notifications.pushEnabled || preferences.notifications.emailEnabled;

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title]}>
        {t('settings.title')}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {t('settings.subtitle')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('settings.profile')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        <View style={styles.profileContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText style={[Typography.subtitle, { color: theme.primary, fontWeight: '700' }]}>
              {userName.split(' ').map(n => n[0]).join('')}
            </ThemedText>
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[styles.userName, { color: theme.text }]}>
              {userName}
            </ThemedText>
            <ThemedText style={[styles.userRole, { color: theme.textSecondary }]}>
              {getRoleLabel(userRole)}
            </ThemedText>
            <Spacer height={2} />
            {userEmail ? (
              <ThemedText style={[styles.userEmail, { color: theme.textSecondary }]}>
                {userEmail}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <Spacer height={Spacing.md} />

        <Pressable
          style={({ pressed }) => [
            styles.editProfileButton,
            { 
              borderColor: theme.primary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <DDIcon name="edit-2" size={16} variant="primary" />
          <ThemedText style={[styles.editProfileText, { color: theme.primary }]}>
            {t('settings.editProfile')}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('settings.appearance')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              {t('settings.darkMode')}
            </ThemedText>
            <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {t('settings.darkModeDesc')}
            </ThemedText>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: applyOpacity(theme.primary, '80') }}
            thumbColor={isDark ? theme.primary : theme.buttonText}
            ios_backgroundColor={theme.border}
          />
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: theme.surfaceSecondary }]} />

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              {t('settings.language')}
            </ThemedText>
            <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {t('settings.languageDesc')}
            </ThemedText>
          </View>
        </View>
        
        <Spacer height={Spacing.md} />

        <View style={styles.languageContainer}>
          {locales.map((lang) => (
            <Pressable
              key={lang.code}
              style={({ pressed }) => [
                styles.languageButton,
                { 
                  backgroundColor: locale === lang.code ? applyOpacity(theme.primary, '15') : theme.background,
                  borderColor: locale === lang.code ? theme.primary : theme.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <ThemedText style={[styles.languageLabel, { color: locale === lang.code ? theme.primary : theme.text }]}>
                {lang.nativeName}
              </ThemedText>
              {locale === lang.code ? (
                <DDIcon name="check-circle" size={18} variant="primary" />
              ) : null}
            </Pressable>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('settings.notificationSettings')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              {t('settings.pushNotifications')}
            </ThemedText>
            <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {t('settings.pushNotificationsDesc')}
            </ThemedText>
          </View>
          <Switch
            value={preferences.notifications.pushEnabled}
            onValueChange={handlePushToggle}
            trackColor={{ false: theme.border, true: applyOpacity(theme.primary, '80') }}
            thumbColor={preferences.notifications.pushEnabled ? theme.primary : theme.buttonText}
            ios_backgroundColor={theme.border}
          />
        </View>

      </ThemedView>

      {/* Email Notifications, Event Notifications, and About sections hidden - app info shown in sidebar */}

      {onLogout ? (
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { 
              backgroundColor: theme.error,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={onLogout}
        >
          <DDIcon name="log-out" size={20} color={theme.buttonTextOnError} directionAware />
          <ThemedText style={[Typography.body, { color: theme.buttonTextOnError, fontWeight: '600', marginStart: Spacing.sm }]}>
            {t('auth.signOut')}
          </ThemedText>
        </Pressable>
      ) : null}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  section: {
    borderRadius: 12,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subsectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 13,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 3,
  },
  languageContainer: {
    gap: Spacing.sm,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  languageFlag: {
    fontSize: 20,
  },
  languageLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  frequencyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  frequencyLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
