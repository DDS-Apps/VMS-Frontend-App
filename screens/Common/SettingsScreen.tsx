import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DDIcon } from "@/components/DDIcon";
import { ROUTES } from "@/constants";
import Constants from "expo-constants";
import { pushNotificationService } from "@/services/push";
import { InAppNotificationToast } from "@/components/InAppNotificationToast";
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
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "@/hooks/queries/useNotificationQueries";

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
  
  const { data: preferences, isLoading: isLoadingPrefs } = useNotificationPreferencesQuery();
  const updatePreferencesMutation = useUpdateNotificationPreferencesMutation();
  
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showInAppToast, setShowInAppToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', body: '' });

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
    updatePreferencesMutation.mutate(
      { pushEnabled: enabled },
      {
        onError: () => {
          setToastMessage({
            title: t('common.error'),
            body: t('settings.preferencesError'),
          });
          setShowInAppToast(true);
        },
      }
    );
  };

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    setDebugInfo('');
    try {
      const result = await pushNotificationService.sendTestNotification();
      setDebugInfo(result.debugInfo);
      
      if (result.success) {
        setTestResult('success');
        setToastMessage({
          title: 'Test Notification Sent',
          body: 'Check your device for the notification. If on web dev, notifications may not appear.',
        });
        setShowInAppToast(true);
      } else {
        setTestResult('error');
        setToastMessage({
          title: 'Notification Not Sent',
          body: result.debugInfo.includes('No push token') 
            ? 'Push notifications not initialized. Check debug info below.'
            : 'Failed to send notification. Check debug info below.',
        });
        setShowInAppToast(true);
      }
      setTimeout(() => setTestResult(null), 5000);
    } catch (error) {
      console.error('[Settings] Test notification failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setDebugInfo(prev => prev + '\nException: ' + errorMsg);
      setTestResult('error');
      setToastMessage({
        title: 'Error',
        body: errorMsg,
      });
      setShowInAppToast(true);
      setTimeout(() => setTestResult(null), 5000);
    } finally {
      setIsSendingTest(false);
      setShowDebugInfo(true);
    }
  };

  const handleShowDebugInfo = () => {
    const info = pushNotificationService.getDebugInfo();
    setDebugInfo(info);
    setShowDebugInfo(true);
  };

  const pushEnabled = preferences?.pushEnabled ?? false;

  return (
    <>
      <InAppNotificationToast
        visible={showInAppToast}
        title={toastMessage.title}
        body={toastMessage.body}
        onDismiss={() => setShowInAppToast(false)}
        type={testResult === 'success' ? 'success' : testResult === 'error' ? 'error' : 'info'}
        duration={5000}
      />
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

        <View style={[styles.profileContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText style={[Typography.subtitle, { color: theme.primary, fontWeight: '700' }]}>
              {userName.split(' ').map(n => n[0]).join('')}
            </ThemedText>
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[styles.userName, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {userName}
            </ThemedText>
            <ThemedText style={[styles.userRole, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {getRoleLabel(userRole)}
            </ThemedText>
            <Spacer height={2} />
            {userEmail ? (
              <ThemedText style={[styles.userEmail, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
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
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => navigation.navigate(ROUTES.EDIT_PROFILE as never)}
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

        <View style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.settingLabel, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.darkMode')}
            </ThemedText>
            <ThemedText style={[styles.settingDescription, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
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

        <View style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.settingLabel, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.language')}
            </ThemedText>
            <ThemedText style={[styles.settingDescription, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
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
                  flexDirection: isRTL ? 'row-reverse' : 'row',
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

        <View style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.settingLabel, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.pushNotifications')}
            </ThemedText>
            <ThemedText style={[styles.settingDescription, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.pushNotificationsDesc')}
            </ThemedText>
          </View>
          {isLoadingPrefs ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              trackColor={{ false: theme.border, true: applyOpacity(theme.primary, '80') }}
              thumbColor={pushEnabled ? theme.primary : theme.buttonText}
              ios_backgroundColor={theme.border}
            />
          )}
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: theme.surfaceSecondary }]} />

        <Pressable
          style={({ pressed }) => [
            styles.testNotificationButton,
            { 
              backgroundColor: testResult === 'success' 
                ? theme.success 
                : testResult === 'error' 
                  ? theme.error 
                  : theme.primary,
              opacity: pressed ? 0.8 : 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={handleTestNotification}
          disabled={isSendingTest}
        >
          {isSendingTest ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : testResult === 'success' ? (
            <DDIcon name="check-circle" size={18} color={theme.buttonText} />
          ) : testResult === 'error' ? (
            <DDIcon name="alert-circle" size={18} color={theme.buttonText} />
          ) : (
            <DDIcon name="bell" size={18} color={theme.buttonText} />
          )}
          <ThemedText style={[styles.testNotificationText, { color: theme.buttonText, marginStart: Spacing.sm }]}>
            {isSendingTest 
              ? t('settings.sendingTest') 
              : testResult === 'success' 
                ? t('settings.testSent')
                : testResult === 'error'
                  ? t('settings.testFailed')
                  : t('settings.testNotification')}
          </ThemedText>
        </Pressable>

        {Platform.OS === 'web' ? null : (
          <>
            <Spacer height={Spacing.sm} />
            <ThemedText style={[styles.testNotificationHint, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.testNotificationHint')}
            </ThemedText>
          </>
        )}

        <Spacer height={Spacing.md} />

        <Pressable
          style={({ pressed }) => [
            styles.debugButton,
            { 
              backgroundColor: theme.surfaceSecondary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleShowDebugInfo}
        >
          <DDIcon name="info" size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.debugButtonText, { color: theme.textSecondary }]}>
            {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
          </ThemedText>
        </Pressable>

        {showDebugInfo && debugInfo ? (
          <>
            <Spacer height={Spacing.sm} />
            <View style={[styles.debugInfoContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <ThemedText style={[styles.debugInfoText, { color: theme.textSecondary }]}>
                {debugInfo}
              </ThemedText>
            </View>
          </>
        ) : null}

      </ThemedView>

      {/* Email Notifications, Event Notifications, and About sections hidden - app info shown in sidebar */}

      {onLogout ? (
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { 
              backgroundColor: theme.error,
              opacity: pressed ? 0.8 : 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
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
    </>
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
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md - 2,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  testNotificationButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 10,
    gap: Spacing.sm,
  },
  testNotificationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  testNotificationHint: {
    fontSize: 11,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  debugInfoContainer: {
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  debugInfoText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
});
