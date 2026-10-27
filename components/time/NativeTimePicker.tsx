import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { isValidTime } from '@/utils/timeInput';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

export interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  selectedTime: Date;
  onTimeSelect: (time: Date) => void;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
}

/** Reusable inside an existing modal: never stack a second iOS Modal. */
export function TimePickerContent({
  selectedTime, onTimeSelect, onClose, minuteInterval = 5,
}: Omit<TimePickerProps, 'visible'>) {
  const { theme, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const [pending, setPending] = useState(() => new Date(selectedTime?.getTime()));
  const stamp = selectedTime?.getTime();
  useEffect(() => setPending(new Date(stamp)), [stamp]);
  const valid = isValidTime(pending);
  // Retain previously entered off-step minutes rather than rounding them on open.
  const interval = isValidTime(selectedTime) && selectedTime.getMinutes() % minuteInterval === 0 ? minuteInterval : 1;

  return (
    <View style={{ backgroundColor: theme.surface }}>
      <View style={[styles.header, { borderBottomColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ThemedText style={[Typography.subtitle, { color: theme.text, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>{t('time.selectTime')}</ThemedText>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.cancel')} hitSlop={10}>
          <DDIcon name="x" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>
      {valid ? (
        <View style={styles.spinnerContainer}>
          <DateTimePicker
            value={pending}
            mode="time"
            display="spinner"
            is24Hour={false}
            locale={isRTL ? 'ar-SA' : 'en-US'}
            themeVariant={isDark ? 'dark' : 'light'}
            textColor={theme.text}
            accentColor={theme.primary}
            minuteInterval={interval}
            // Let iOS measure its localized wheel width instead of stretching it;
            // a stretched UIDatePicker can offset the wheels in Arabic.
            style={styles.spinner}
            onChange={(event, time) => {
              if (event.type === 'set' && isValidTime(time)) setPending(new Date(time.getTime()));
            }}
          />
        </View>
      ) : (
        <ThemedText accessibilityRole="alert" style={[Typography.body, { color: theme.error, marginVertical: Spacing.lg }]}>
          {t('time.invalidTime')}
        </ThemedText>
      )}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: Spacing.md, marginTop: Spacing.md }}>
        <LoadingButton variant="secondary" onPress={onClose} style={{ flex: 1 }}>{t('common.cancel')}</LoadingButton>
        <LoadingButton
          variant="primary" disabled={!valid} style={{ flex: 1 }}
          onPress={() => { if (isValidTime(pending)) { onTimeSelect(new Date(pending.getTime())); onClose(); } }}
        >{t('common.confirm')}</LoadingButton>
      </View>
    </View>
  );
}

export function TimePicker({ visible, onClose, selectedTime, onTimeSelect, minuteInterval = 5 }: TimePickerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  if (!visible || Platform.OS === 'web') return null;
  if (Platform.OS === 'android' && isValidTime(selectedTime)) {
    return (
      <DateTimePicker
        value={selectedTime}
        mode="time"
        display="spinner"
        is24Hour={false}
        positiveButton={{ label: t('common.confirm'), textColor: theme.primary }}
        negativeButton={{ label: t('common.cancel'), textColor: theme.primary }}
        onChange={(event, time) => {
          if (event.type === 'set' && isValidTime(time)) onTimeSelect(new Date(time.getTime()));
          onClose();
        }}
      />
    );
  }
  return (
    <Modal visible transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.cancel')} />
        <ScrollView style={[styles.dialog, { backgroundColor: theme.surface, maxHeight: height * 0.85 }]}>
          <TimePickerContent selectedTime={selectedTime} onTimeSelect={onTimeSelect} onClose={onClose} minuteInterval={minuteInterval} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  dialog: { width: '92%', maxWidth: 420, flexGrow: 0, borderRadius: BorderRadius.lg, padding: Spacing.xl },
  // Row order is chosen explicitly above; prevent inherited native RTL from
  // reversing it a second time and putting the close button beside the title.
  header: { direction: 'ltr', alignItems: 'center', borderBottomWidth: 1, paddingBottom: Spacing.md, marginBottom: Spacing.md },
  spinnerContainer: { width: '100%', alignItems: 'center' },
  spinner: { height: 216, maxWidth: '100%', alignSelf: 'center' },
});
