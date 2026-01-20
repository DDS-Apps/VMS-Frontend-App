import React, { useState, useEffect } from "react";
import { View, StyleSheet, Switch, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DDIcon } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { SkeletonForm } from "@/components/shared/Skeleton";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/contexts/ToastContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "@/hooks/queries/useNotificationQueries";
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesDto,
} from "@/types";

export default function NotificationPreferencesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const { requestPermission, permissionStatus } = useNotifications();

  const {
    data: preferences,
    isLoading,
    isFetching,
    error,
  } = useNotificationPreferencesQuery();
  const updateMutation = useUpdateNotificationPreferencesMutation();

  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
      setHasChanges(false);
    }
  }, [preferences]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xxl,
  };

  const handleToggle = (field: keyof NotificationPreferences, value: boolean) => {
    if (!localPrefs) return;
    setLocalPrefs({
      ...localPrefs,
      [field]: value,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localPrefs || !hasChanges) return;

    const updateDto: UpdateNotificationPreferencesDto = {
      emailEnabled: localPrefs.emailEnabled,
      smsEnabled: localPrefs.smsEnabled,
      whatsappEnabled: localPrefs.whatsappEnabled,
      pushEnabled: localPrefs.pushEnabled,
      visitReminders: localPrefs.visitReminders,
      approvalRequests: localPrefs.approvalRequests,
      checkInOut: localPrefs.checkInOut,
      dailyAgenda: localPrefs.dailyAgenda,
    };

    try {
      await updateMutation.mutateAsync(updateDto);
      showSuccess(t('settings.preferencesSaved'));
      setHasChanges(false);
    } catch (err) {
      showError(t('settings.preferencesError'));
    }
  };

  const handleRequestPushPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      showSuccess(t('notifications.permissionGranted'));
    } else {
      showError(t('notifications.permissionDenied'));
    }
  };

  if (isLoading || isFetching) {
    return (
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <ThemedText style={Typography.title}>{t('settings.notificationPreferences')}</ThemedText>
        <Spacer height={Spacing.xl} />
        <SkeletonForm />
      </ScreenScrollView>
    );
  }

  if (error || !localPrefs) {
    return (
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <ThemedText style={Typography.title}>{t('settings.notificationPreferences')}</ThemedText>
        <Spacer height={Spacing.xl} />
        <ThemedView style={[styles.errorCard, { backgroundColor: theme.surface }]}>
          <DDIcon name="alert-circle" size={48} color={theme.error} />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { textAlign: "center" }]}>
            {t('common.loadError')}
          </ThemedText>
        </ThemedView>
      </ScreenScrollView>
    );
  }

  const channelSettings: { field: keyof NotificationPreferences; label: string; icon: string }[] = [
    { field: 'pushEnabled', label: t('notifications.push'), icon: 'smartphone' },
    { field: 'emailEnabled', label: t('notifications.email'), icon: 'mail' },
    { field: 'smsEnabled', label: t('notifications.sms'), icon: 'message-square' },
    { field: 'whatsappEnabled', label: t('notifications.whatsapp'), icon: 'message-circle' },
  ];

  const eventSettings: { field: keyof NotificationPreferences; label: string; icon: string }[] = [
    { field: 'visitReminders', label: t('notifications.visitReminders'), icon: 'clock' },
    { field: 'approvalRequests', label: t('notifications.approvalRequests'), icon: 'check-circle' },
    { field: 'checkInOut', label: t('notifications.checkInOut'), icon: 'log-in' },
    { field: 'dailyAgenda', label: t('notifications.dailyAgenda'), icon: 'calendar' },
  ];

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={Typography.title}>{t('settings.notificationPreferences')}</ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {t('settings.notificationPreferencesDescription')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      {permissionStatus !== "granted" && (
        <>
          <DirectionalRow style={[styles.permissionCard, { backgroundColor: theme.warning + "20" }]}>
            <DDIcon name="bell-off" size={24} color={theme.warning} />
            <View style={styles.permissionText}>
              <ThemedText style={[Typography.bodySmall, { fontWeight: "600", textAlign: isRTL ? 'right' : 'left' }]}>
                {t('notifications.pushDisabled')}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('notifications.enablePushDescription')}
              </ThemedText>
            </View>
            <LoadingButton
              onPress={handleRequestPushPermission}
              variant="primary"
              size="small"
            >
              {t('common.enable')}
            </LoadingButton>
          </DirectionalRow>
          <Spacer height={Spacing.lg} />
        </>
      )}

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('notifications.channels')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        {channelSettings.map((setting, index) => (
          <React.Fragment key={setting.field}>
            <DirectionalRow style={styles.row}>
              <DirectionalRow style={styles.rowLeft}>
                <DDIcon name={setting.icon as any} size={20} color={theme.primary} />
                <ThemedText style={[Typography.body, { marginEnd: Spacing.sm, textAlign: 'right' }]}>
                  {setting.label}
                </ThemedText>
              </DirectionalRow>
              <Switch
                value={localPrefs[setting.field]}
                onValueChange={(value) => handleToggle(setting.field, value)}
                trackColor={{ false: theme.border, true: theme.primary + "80" }}
                thumbColor={localPrefs[setting.field] ? theme.primary : theme.textSecondary}
              />
            </DirectionalRow>
            {index < channelSettings.length - 1 && (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            )}
          </React.Fragment>
        ))}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('notifications.eventTypes')}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
          {t('notifications.eventTypesDescription')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        {eventSettings.map((setting, index) => (
          <React.Fragment key={setting.field}>
            <DirectionalRow style={styles.row}>
              <DirectionalRow style={styles.rowLeft}>
                <DDIcon name={setting.icon as any} size={20} color={theme.primary} />
                <ThemedText style={[Typography.body, { marginEnd: Spacing.sm, textAlign: 'right' }]}>
                  {setting.label}
                </ThemedText>
              </DirectionalRow>
              <Switch
                value={localPrefs[setting.field]}
                onValueChange={(value) => handleToggle(setting.field, value)}
                trackColor={{ false: theme.border, true: theme.primary + "80" }}
                thumbColor={localPrefs[setting.field] ? theme.primary : theme.textSecondary}
              />
            </DirectionalRow>
            {index < eventSettings.length - 1 && (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            )}
          </React.Fragment>
        ))}
      </ThemedView>

      <Spacer height={Spacing.xl} />

      <LoadingButton
        onPress={handleSave}
        loading={updateMutation.isPending}
        disabled={!hasChanges}
        variant="primary"
        size="large"
        fullWidth
        icon="check"
      >
        {t('common.save')}
      </LoadingButton>

      <Spacer height={Spacing.xxl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  sectionTitle: {
    ...Typography.subtitle,
    fontWeight: "600",
  },
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  rowLeft: {
    alignItems: "center",
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  permissionCard: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  permissionText: {
    flex: 1,
  },
  errorCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
});
