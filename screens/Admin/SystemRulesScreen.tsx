import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import { DDIcon } from '@/components/DDIcon';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';

export default function SystemRulesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    officeStartTime: '08:00',
    officeEndTime: '17:00',
    reminderTime1: '2',
    reminderTime2: '4',
    reminderTime3: '5',
    parkingBufferTime: '15',
    valetBufferTime: '20',
    maxVisitorsPerRequest: '10',
    autoApprovalEnabled: false,
    qrCodeExpiration: '24',
  });

  const handleSave = () => {
    console.log('Settings saved:', settings);
  };

  return (
    <ScreenKeyboardAwareScrollView 
      contentContainerStyle={{ 
        paddingHorizontal: Spacing.xl, 
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl 
      }}
    >
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <ThemedText style={[Typography.title, { fontWeight: '700' }]}>
          {t('navigation.systemSettings')}
        </ThemedText>
        <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
          {t('settings.subtitle')}
        </ThemedText>
      </View>
        <ThemedView style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <DDIcon name="clock" variant="primary" size={20} />
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginStart: Spacing.sm }]}>
              {t('form.time')}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                {t('form.time')}
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={settings.officeStartTime}
                onChangeText={(text) => setSettings({ ...settings, officeStartTime: text })}
                placeholder="08:00"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={{ width: Spacing.md }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                {t('form.time')}
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={settings.officeEndTime}
                onChangeText={(text) => setSettings({ ...settings, officeEndTime: text })}
                placeholder="17:00"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>
        </ThemedView>

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <DDIcon name="bell" variant="primary" size={20} />
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginStart: Spacing.sm }]}>
              {t('notifications.title')}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />

          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('actions.sendReminder')} ({t('time.hours')})
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={settings.reminderTime1}
            onChangeText={(text) => setSettings({ ...settings, reminderTime1: text })}
            placeholder="2"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />

          <Spacer height={Spacing.md} />

          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('actions.sendReminder')} ({t('time.hours')})
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={settings.reminderTime2}
            onChangeText={(text) => setSettings({ ...settings, reminderTime2: text })}
            placeholder="4"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />

          <Spacer height={Spacing.md} />

          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('actions.sendReminder')} ({t('time.hours')})
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={settings.reminderTime3}
            onChangeText={(text) => setSettings({ ...settings, reminderTime3: text })}
            placeholder="5"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />
        </ThemedView>

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <DDIcon name="truck" variant="primary" size={20} />
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginStart: Spacing.sm }]}>
              {t('services.parking')} & {t('services.valet')}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />

          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('services.parking')} ({t('time.minutes')})
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={settings.parkingBufferTime}
            onChangeText={(text) => setSettings({ ...settings, parkingBufferTime: text })}
            placeholder="15"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />

          <Spacer height={Spacing.md} />

          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('services.valet')} ({t('time.minutes')})
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={settings.valetBufferTime}
            onChangeText={(text) => setSettings({ ...settings, valetBufferTime: text })}
            placeholder="20"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />
        </ThemedView>

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <DDIcon name="settings" variant="primary" size={20} />
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginStart: Spacing.sm }]}>
              {t('navigation.settings')}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />

          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('visitor.expectedVisitors')}
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={settings.maxVisitorsPerRequest}
            onChangeText={(text) => setSettings({ ...settings, maxVisitorsPerRequest: text })}
            placeholder="10"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />

          <Spacer height={Spacing.md} />

          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t('invitation.accessCode')} ({t('time.hours')})
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={settings.qrCodeExpiration}
            onChangeText={(text) => setSettings({ ...settings, qrCodeExpiration: text })}
            placeholder="24"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />

          <Spacer height={Spacing.md} />

          <Pressable
            style={styles.switchRow}
            onPress={() => setSettings({ ...settings, autoApprovalEnabled: !settings.autoApprovalEnabled })}
          >
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                {t('actions.approve')} ({t('roles.manager')})
              </ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4 }]}>
                {t('actions.approve')}
              </ThemedText>
            </View>
            <View
              style={[
                styles.switch,
                {
                  backgroundColor: settings.autoApprovalEnabled ? theme.primary : theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: theme.surface,
                    transform: [{ translateX: settings.autoApprovalEnabled ? 20 : 0 }],
                  },
                ]}
              />
            </View>
          </Pressable>
        </ThemedView>

        <Spacer height={Spacing.xl} />

        <LoadingButton
          onPress={handleSave}
          variant="primary"
          size="medium"
          icon="check"
          iconPosition="left"
          fullWidth
        >
          {t('common.save')}
        </LoadingButton>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 120,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
