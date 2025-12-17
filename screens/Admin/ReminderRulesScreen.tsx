import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { StyledInput } from "@/components/StyledInput";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { ReminderRules } from "@/types/vms.types";
import { getReminderRules, updateReminderRules } from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

const DAYS = [
  { id: 0, name: "sunday" },
  { id: 1, name: "monday" },
  { id: 2, name: "tuesday" },
  { id: 3, name: "wednesday" },
  { id: 4, name: "thursday" },
  { id: 5, name: "friday" },
  { id: 6, name: "saturday" },
];

export default function ReminderRulesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [rules, setRules] = useState<ReminderRules | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRules();
    }, [])
  );

  const loadRules = () => {
    setRules(getReminderRules());
    setHasChanges(false);
  };

  const handleUpdate = (updates: Partial<ReminderRules>) => {
    if (!rules) return;
    setRules({ ...rules, ...updates });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!rules) return;
    updateReminderRules(rules);
    setHasChanges(false);
  };

  const handleToggleDay = (dayId: number) => {
    if (!rules) return;
    const newDays = rules.workingDays.includes(dayId)
      ? rules.workingDays.filter((d) => d !== dayId)
      : [...rules.workingDays, dayId].sort();
    handleUpdate({ workingDays: newDays });
  };

  const getDayName = (name: string) => {
    return t(`days.${name}` as any);
  };

  const formatMinutesToDisplay = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  if (!rules) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>{t("common.loading")}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
            {t("admin.reminderRules")}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            {t("admin.autoCancelSettings")}
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
              <DDIcon name="power" size={24} color={theme.primary} />
            </View>
            <View style={styles.sectionInfo}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                System Active
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                Enable automated reminders and auto-cancel
              </ThemedText>
            </View>
            <Switch
              value={rules.isActive}
              onValueChange={(value) => handleUpdate({ isActive: value })}
              trackColor={{ false: theme.border, true: theme.primary + "80" }}
              thumbColor={rules.isActive ? theme.primary : theme.textSecondary}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <DDIcon name="bell" size={20} color={theme.text} />
            <ThemedText style={[Typography.subtitle, { fontWeight: "600", marginStart: Spacing.sm }]}>
              {t("admin.reminderRules")}
            </ThemedText>
          </View>

          <View style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={[styles.ruleBadge, { backgroundColor: theme.info + "20" }]}>
                <ThemedText style={[Typography.caption, { color: theme.info, fontWeight: "600" }]}>1st</ThemedText>
              </View>
              <ThemedText style={[Typography.body, { flex: 1, marginStart: Spacing.sm }]}>
                {t("admin.firstReminderDelay")}
              </ThemedText>
            </View>
            <View style={styles.ruleInput}>
              <StyledInput
                value={rules.firstReminderDelayMinutes.toString()}
                onChangeText={(text) => handleUpdate({ firstReminderDelayMinutes: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="120"
              />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {formatMinutesToDisplay(rules.firstReminderDelayMinutes)} after office hours start
              </ThemedText>
            </View>
          </View>

          <View style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={[styles.ruleBadge, { backgroundColor: theme.warning + "20" }]}>
                <ThemedText style={[Typography.caption, { color: theme.warning, fontWeight: "600" }]}>2nd</ThemedText>
              </View>
              <ThemedText style={[Typography.body, { flex: 1, marginStart: Spacing.sm }]}>
                {t("admin.secondReminderDelay")}
              </ThemedText>
            </View>
            <View style={styles.ruleInput}>
              <StyledInput
                value={rules.secondReminderDelayMinutes.toString()}
                onChangeText={(text) => handleUpdate({ secondReminderDelayMinutes: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="240"
              />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {formatMinutesToDisplay(rules.secondReminderDelayMinutes)} after first reminder
              </ThemedText>
            </View>
          </View>

          <View style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={[styles.ruleBadge, { backgroundColor: theme.error + "20" }]}>
                <DDIcon name="x-circle" size={14} color={theme.error} />
              </View>
              <ThemedText style={[Typography.body, { flex: 1, marginStart: Spacing.sm }]}>
                {t("admin.autoCancelDelay")}
              </ThemedText>
            </View>
            <View style={styles.ruleInput}>
              <StyledInput
                value={rules.autoCancelDelayMinutes.toString()}
                onChangeText={(text) => handleUpdate({ autoCancelDelayMinutes: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="60"
              />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {formatMinutesToDisplay(rules.autoCancelDelayMinutes)} after second reminder
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <DDIcon name="clock" size={20} color={theme.text} />
            <ThemedText style={[Typography.subtitle, { fontWeight: "600", marginStart: Spacing.sm }]}>
              {t("admin.officeHours")}
            </ThemedText>
          </View>

          <View style={styles.timeInputs}>
            <View style={styles.timeField}>
              <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                {t("admin.officeStartTime")}
              </ThemedText>
              <StyledInput
                value={rules.officeStartTime}
                onChangeText={(text) => handleUpdate({ officeStartTime: text })}
                placeholder="08:00"
              />
            </View>
            <View style={styles.timeField}>
              <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                {t("admin.officeEndTime")}
              </ThemedText>
              <StyledInput
                value={rules.officeEndTime}
                onChangeText={(text) => handleUpdate({ officeEndTime: text })}
                placeholder="17:00"
              />
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <DDIcon name="calendar" size={20} color={theme.text} />
            <ThemedText style={[Typography.subtitle, { fontWeight: "600", marginStart: Spacing.sm }]}>
              {t("admin.workingDays")}
            </ThemedText>
          </View>

          <View style={styles.daysGrid}>
            {DAYS.map((day) => (
              <Pressable
                key={day.id}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: rules.workingDays.includes(day.id) ? theme.primary : theme.surface,
                    borderColor: rules.workingDays.includes(day.id) ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleToggleDay(day.id)}
              >
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: rules.workingDays.includes(day.id) ? theme.buttonText : theme.text,
                      fontWeight: "500",
                    },
                  ]}
                >
                  {getDayName(day.name).substring(0, 3)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {hasChanges ? (
          <LoadingButton
            onPress={handleSave}
            variant="primary"
            size="medium"
            icon="save"
            iconPosition="left"
            fullWidth
          >
            {t("common.save")}
          </LoadingButton>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: Spacing.lg,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginEnd: Spacing.md,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  ruleCard: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  ruleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  ruleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  ruleInput: {},
  timeInputs: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  timeField: {
    flex: 1,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
});
