import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator, Alert, Platform, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { StyledInput } from "@/components/StyledInput";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { ReminderRules } from "@/types/vms.types";
import { useReminderRulesQuery, useUpdateReminderRulesMutation } from "@/hooks/queries/useAdminQueries";

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

const convert24To12Hour = (time24: string): string => {
  if (!time24) return "";
  const [hoursStr, minutes] = time24.split(":");
  let hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return time24;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
};

const convert12To24Hour = (time12: string): string => {
  if (!time12) return "";
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
};

const timeStringToDate = (time24: string): Date => {
  const date = new Date();
  if (!time24) {
    date.setHours(9, 0, 0, 0);
    return date;
  }
  const [hours, minutes] = time24.split(":").map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

const dateToTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const WebTimePicker = ({ 
  value, 
  onChange, 
  theme 
}: { 
  value: string; 
  onChange: (time24: string) => void; 
  theme: any;
}) => {
  return (
    <View style={[webTimePickerStyles.container, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={{ marginEnd: Spacing.sm }}>
        <DDIcon name="clock" size={18} color={theme.primary} />
      </View>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          backgroundColor: "transparent",
          color: theme.text,
          fontSize: 16,
          fontFamily: "inherit",
          padding: 0,
          cursor: "pointer",
        }}
      />
    </View>
  );
};

const webTimePickerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 48,
  },
});

export default function ReminderRulesScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [localRules, setLocalRules] = useState<ReminderRules | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState<Date | null>(null);
  const [tempEndTime, setTempEndTime] = useState<Date | null>(null);

  const { data: rules, isLoading, isError, error, refetch } = useReminderRulesQuery();
  const updateMutation = useUpdateReminderRulesMutation();

  useEffect(() => {
    if (rules) {
      setLocalRules(rules);
      setHasChanges(false);
    }
  }, [rules]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleUpdate = (updates: Partial<ReminderRules>) => {
    if (!localRules) return;
    setLocalRules({ ...localRules, ...updates });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localRules) return;

    try {
      await updateMutation.mutateAsync({
        firstReminderDelayMinutes: localRules.firstReminderDelayMinutes,
        secondReminderDelayMinutes: localRules.secondReminderDelayMinutes,
        autoCancelDelayMinutes: localRules.autoCancelDelayMinutes,
        officeStartTime: localRules.officeStartTime,
        officeEndTime: localRules.officeEndTime,
        workingDays: localRules.workingDays,
        isActive: localRules.isActive,
      });
      setHasChanges(false);
      setNotification({ type: "success", message: t("common.savedSuccessfully") });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("common.errorOccurred");
      setNotification({ type: "error", message: errorMessage });
    }
  };

  const openStartTimePicker = () => {
    if (localRules) {
      setTempStartTime(timeStringToDate(localRules.officeStartTime));
    }
    setShowStartTimePicker(true);
  };

  const openEndTimePicker = () => {
    if (localRules) {
      setTempEndTime(timeStringToDate(localRules.officeEndTime));
    }
    setShowEndTimePicker(true);
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowStartTimePicker(false);
      if (event.type === "set" && selectedDate) {
        handleUpdate({ officeStartTime: dateToTimeString(selectedDate) });
      }
    } else if (Platform.OS === "ios" && selectedDate) {
      setTempStartTime(selectedDate);
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowEndTimePicker(false);
      if (event.type === "set" && selectedDate) {
        handleUpdate({ officeEndTime: dateToTimeString(selectedDate) });
      }
    } else if (Platform.OS === "ios" && selectedDate) {
      setTempEndTime(selectedDate);
    }
  };

  const confirmStartTime = () => {
    if (tempStartTime) {
      handleUpdate({ officeStartTime: dateToTimeString(tempStartTime) });
    }
    setShowStartTimePicker(false);
    setTempStartTime(null);
  };

  const confirmEndTime = () => {
    if (tempEndTime) {
      handleUpdate({ officeEndTime: dateToTimeString(tempEndTime) });
    }
    setShowEndTimePicker(false);
    setTempEndTime(null);
  };

  const cancelStartTimePicker = () => {
    setShowStartTimePicker(false);
    setTempStartTime(null);
  };

  const cancelEndTimePicker = () => {
    setShowEndTimePicker(false);
    setTempEndTime(null);
  };

  const handleToggleDay = (dayId: number) => {
    if (!localRules) return;
    const newDays = localRules.workingDays.includes(dayId)
      ? localRules.workingDays.filter((d) => d !== dayId)
      : [...localRules.workingDays, dayId].sort();
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

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[Typography.body, { marginTop: Spacing.md, color: theme.textSecondary }]}>
            {t("common.loading")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <DDIcon name="alert-circle" size={48} color={theme.error} />
          <ThemedText style={[Typography.body, { marginTop: Spacing.md, color: theme.error, textAlign: "center" }]}>
            {error?.message || t("common.errorOccurred")}
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={[Typography.body, { color: theme.buttonText }]}>
              {t("common.retry")}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!localRules) {
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
      {notification ? (
        <View
          style={[
            styles.notification,
            {
              backgroundColor: notification.type === "success" ? theme.success + "20" : theme.error + "20",
              borderColor: notification.type === "success" ? theme.success : theme.error,
            },
          ]}
        >
          <DDIcon
            name={notification.type === "success" ? "check-circle" : "alert-circle"}
            size={20}
            color={notification.type === "success" ? theme.success : theme.error}
          />
          <ThemedText
            style={[
              Typography.body,
              {
                color: notification.type === "success" ? theme.success : theme.error,
                marginStart: Spacing.sm,
                flex: 1,
              },
            ]}
          >
            {notification.message}
          </ThemedText>
        </View>
      ) : null}

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
                {t("admin.systemActive")}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                {t("admin.enableAutomatedReminders")}
              </ThemedText>
            </View>
            <Switch
              value={localRules.isActive}
              onValueChange={(value) => handleUpdate({ isActive: value })}
              trackColor={{ false: theme.border, true: theme.primary + "80" }}
              thumbColor={localRules.isActive ? theme.primary : theme.textSecondary}
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
                value={localRules.firstReminderDelayMinutes.toString()}
                onChangeText={(text) => handleUpdate({ firstReminderDelayMinutes: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="120"
              />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {formatMinutesToDisplay(localRules.firstReminderDelayMinutes)} {t("admin.afterOfficeHoursStart")}
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
                value={localRules.secondReminderDelayMinutes.toString()}
                onChangeText={(text) => handleUpdate({ secondReminderDelayMinutes: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="240"
              />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {formatMinutesToDisplay(localRules.secondReminderDelayMinutes)} {t("admin.afterFirstReminder")}
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
                value={localRules.autoCancelDelayMinutes.toString()}
                onChangeText={(text) => handleUpdate({ autoCancelDelayMinutes: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="60"
              />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {formatMinutesToDisplay(localRules.autoCancelDelayMinutes)} {t("admin.afterSecondReminder")}
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
              {Platform.OS === "web" ? (
                <WebTimePicker
                  value={localRules.officeStartTime}
                  onChange={(time24) => handleUpdate({ officeStartTime: time24 })}
                  theme={theme}
                />
              ) : (
                <>
                  <Pressable
                    style={[styles.timeButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={openStartTimePicker}
                  >
                    <View style={{ marginEnd: Spacing.sm }}>
                      <DDIcon name="clock" size={18} color={theme.primary} />
                    </View>
                    <ThemedText style={[Typography.body, { flex: 1 }]}>
                      {convert24To12Hour(localRules.officeStartTime)}
                    </ThemedText>
                    <DDIcon name="chevron-down" size={18} color={theme.textSecondary} />
                  </Pressable>
                  {showStartTimePicker ? (
                    Platform.OS === "ios" ? (
                      <Modal transparent animationType="slide" visible={showStartTimePicker}>
                        <View style={styles.pickerModalOverlay}>
                          <View style={[styles.pickerModalContent, { backgroundColor: theme.surface }]}>
                            <View style={[styles.pickerModalHeader, { borderBottomColor: theme.border }]}>
                              <Pressable onPress={cancelStartTimePicker}>
                                <ThemedText style={[Typography.body, { color: theme.error }]}>{t("common.cancel")}</ThemedText>
                              </Pressable>
                              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>{t("admin.officeStartTime")}</ThemedText>
                              <Pressable onPress={confirmStartTime}>
                                <ThemedText style={[Typography.body, { color: theme.primary, fontWeight: "600" }]}>{t("common.done")}</ThemedText>
                              </Pressable>
                            </View>
                            <DateTimePicker
                              value={tempStartTime || timeStringToDate(localRules.officeStartTime)}
                              mode="time"
                              display="spinner"
                              onChange={handleStartTimeChange}
                              themeVariant={isDark ? "dark" : "light"}
                            />
                          </View>
                        </View>
                      </Modal>
                    ) : (
                      <DateTimePicker
                        value={timeStringToDate(localRules.officeStartTime)}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={handleStartTimeChange}
                      />
                    )
                  ) : null}
                </>
              )}
            </View>
            <View style={styles.timeField}>
              <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                {t("admin.officeEndTime")}
              </ThemedText>
              {Platform.OS === "web" ? (
                <WebTimePicker
                  value={localRules.officeEndTime}
                  onChange={(time24) => handleUpdate({ officeEndTime: time24 })}
                  theme={theme}
                />
              ) : (
                <>
                  <Pressable
                    style={[styles.timeButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={openEndTimePicker}
                  >
                    <View style={{ marginEnd: Spacing.sm }}>
                      <DDIcon name="clock" size={18} color={theme.primary} />
                    </View>
                    <ThemedText style={[Typography.body, { flex: 1 }]}>
                      {convert24To12Hour(localRules.officeEndTime)}
                    </ThemedText>
                    <DDIcon name="chevron-down" size={18} color={theme.textSecondary} />
                  </Pressable>
                  {showEndTimePicker ? (
                    Platform.OS === "ios" ? (
                      <Modal transparent animationType="slide" visible={showEndTimePicker}>
                        <View style={styles.pickerModalOverlay}>
                          <View style={[styles.pickerModalContent, { backgroundColor: theme.surface }]}>
                            <View style={[styles.pickerModalHeader, { borderBottomColor: theme.border }]}>
                              <Pressable onPress={cancelEndTimePicker}>
                                <ThemedText style={[Typography.body, { color: theme.error }]}>{t("common.cancel")}</ThemedText>
                              </Pressable>
                              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>{t("admin.officeEndTime")}</ThemedText>
                              <Pressable onPress={confirmEndTime}>
                                <ThemedText style={[Typography.body, { color: theme.primary, fontWeight: "600" }]}>{t("common.done")}</ThemedText>
                              </Pressable>
                            </View>
                            <DateTimePicker
                              value={tempEndTime || timeStringToDate(localRules.officeEndTime)}
                              mode="time"
                              display="spinner"
                              onChange={handleEndTimeChange}
                              themeVariant={isDark ? "dark" : "light"}
                            />
                          </View>
                        </View>
                      </Modal>
                    ) : (
                      <DateTimePicker
                        value={timeStringToDate(localRules.officeEndTime)}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={handleEndTimeChange}
                      />
                    )
                  ) : null}
                </>
              )}
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
                    backgroundColor: localRules.workingDays.includes(day.id) ? theme.primary : theme.surface,
                    borderColor: localRules.workingDays.includes(day.id) ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleToggleDay(day.id)}
              >
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: localRules.workingDays.includes(day.id) ? theme.buttonText : theme.text,
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
            loading={updateMutation.isPending}
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
    padding: Spacing.xl,
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
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
    paddingBottom: Spacing.sm,
  },
  ruleCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  ruleInput: {
    marginStart: 36,
  },
  timeInputs: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  timeField: {
    flex: 1,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dayButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 44,
    alignItems: "center",
  },
});
