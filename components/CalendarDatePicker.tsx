import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, Modal, I18nManager } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon } from "@/components/DDIcon";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyOpacity } from "@/utils/statusStyles";
import { toArabicNumerals } from "@/utils/formatters";

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface CalendarDatePickerProps {
  visible: boolean;
  onClose: () => void;
  selectedDate?: Date;
  dateRange?: DateRange;
  onDateSelect?: (date: Date) => void;
  onRangeSelect?: (range: DateRange) => void;
  mode?: 'single' | 'range';
  minimumDate?: Date;
}

export function CalendarDatePicker({
  visible,
  onClose,
  selectedDate,
  dateRange,
  onDateSelect,
  onRangeSelect,
  mode = 'range',
  minimumDate,
}: CalendarDatePickerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();  const [currentMonth, setCurrentMonth] = useState(
    selectedDate || dateRange?.startDate || new Date()
  );
  const [tempRange, setTempRange] = useState<DateRange>(
    dateRange || { startDate: null, endDate: null }
  );
  const [selectionMode, setSelectionMode] = useState<'idle' | 'start_selected'>('idle');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const DAYS_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const MONTHS_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;
  const MONTHS_SHORT_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

  const localizedDays = DAYS_KEYS.map(key => t(`calendar.daysShort.${key}`));
  const localizedMonths = MONTHS_KEYS.map(key => t(`calendar.months.${key}`));
  const localizedMonthsShort = MONTHS_SHORT_KEYS.map(key => t(`calendar.monthsShort.${key}`));

  const formatLocalNumber = (num: number): string => {
    return isRTL ? toArabicNumerals(String(num)) : String(num);
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return d1.toDateString() === d2.toDateString();
  };

  const isInRange = (date: Date) => {
    if (!tempRange.startDate || !tempRange.endDate) return false;
    return date >= tempRange.startDate && date <= tempRange.endDate;
  };

  const isRangeStart = (date: Date) => isSameDay(date, tempRange.startDate);
  const isRangeEnd = (date: Date) => isSameDay(date, tempRange.endDate);

  const handleDatePress = (day: number) => {
    const selectedDay = new Date(year, month, day);
    selectedDay.setHours(0, 0, 0, 0);

    if (minimumDate) {
      const minDateStart = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
      if (selectedDay < minDateStart) return;
    }

    if (mode === 'single') {
      onDateSelect?.(selectedDay);
      onClose();
      return;
    }

    if (selectionMode === 'idle') {
      setTempRange({ startDate: selectedDay, endDate: null });
      setSelectionMode('start_selected');
    } else {
      if (isSameDay(selectedDay, tempRange.startDate)) {
        onDateSelect?.(selectedDay);
        setSelectionMode('idle');
        setTempRange({ startDate: null, endDate: null });
        onClose();
      } else {
        let start = tempRange.startDate!;
        let end = selectedDay;
        if (selectedDay < start) {
          end = start;
          start = selectedDay;
        }
        const newRange = { startDate: start, endDate: end };
        setTempRange(newRange);
        onRangeSelect?.(newRange);
        setSelectionMode('idle');
        onClose();
      }
    }
  };

  const formatDateRange = () => {
    if (mode === 'single') {
      if (selectedDate) {
        const todayDate = new Date();
        if (selectedDate.toDateString() === todayDate.toDateString()) {
          return t('calendar.today');
        }
        return `${formatLocalNumber(selectedDate.getDate())} ${localizedMonthsShort[selectedDate.getMonth()]} ${formatLocalNumber(selectedDate.getFullYear())}`;
      }
      return t('calendar.tapToSelect');
    }

    if (tempRange.startDate && tempRange.endDate) {
      const start = tempRange.startDate;
      const end = tempRange.endDate;
      return `${formatLocalNumber(start.getDate())} ${localizedMonthsShort[start.getMonth()]} - ${formatLocalNumber(end.getDate())} ${localizedMonthsShort[end.getMonth()]} ${formatLocalNumber(end.getFullYear())}`;
    }
    
    if (tempRange.startDate) {
      const todayDate = new Date();
      if (tempRange.startDate.toDateString() === todayDate.toDateString()) {
        return `${t('calendar.today')} - ${t('calendar.tapAgainToConfirm')}`;
      }
      return `${formatLocalNumber(tempRange.startDate.getDate())} ${localizedMonthsShort[tempRange.startDate.getMonth()]} - ${t('calendar.selectEndDate')}`;
    }
    
    if (selectedDate) {
      const todayDate = new Date();
      if (selectedDate.toDateString() === todayDate.toDateString()) {
        return t('calendar.today');
      }
      return `${formatLocalNumber(selectedDate.getDate())} ${localizedMonthsShort[selectedDate.getMonth()]} ${formatLocalNumber(selectedDate.getFullYear())}`;
    }
    
    return t('calendar.tapToSelect');
  };

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  }, [startDayOfWeek, daysInMonth]);

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const isPastDate = (day: number) => {
    const date = new Date(year, month, day);
    const minDate = minimumDate || today;
    const minDateStart = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return date < minDateStart;
  };

  const isSelected = (day: number) => {
    if (selectedDate && !tempRange.startDate && !tempRange.endDate) {
      return day === selectedDate.getDate() && 
             month === selectedDate.getMonth() && 
             year === selectedDate.getFullYear();
    }
    return false;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <Pressable 
        style={[styles.overlay, { backgroundColor: applyOpacity(theme.overlay, '50') }]}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.container, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: theme.border, flexDirection: 'row' }]}>
            <View style={[styles.calendarIcon, { backgroundColor: applyOpacity(theme.primary, '10') }]}>
              <DDIcon name="calendar" size={20} color={theme.primary} />
            </View>
            <View style={[styles.headerTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {t('calendar.chooseDate')}
              </ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                {formatDateRange()}
              </ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <DDIcon name="chevron-up" size={20} variant="muted" />
            </Pressable>
          </View>

          <View style={styles.calendarContainer}>
            <View style={[styles.monthNavigation, { flexDirection: 'row' }]}>
              <Pressable onPress={prevMonth} hitSlop={12}>
                <DDIcon name="chevron-left" size={20} variant="muted" directionAware />
              </Pressable>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {localizedMonths[month]} {formatLocalNumber(year)}
              </ThemedText>
              <Pressable onPress={nextMonth} hitSlop={12}>
                <DDIcon name="chevron-right" size={20} variant="muted" directionAware />
              </Pressable>
            </View>

            <View style={[styles.weekDays, { flexDirection: 'row' }]}>
              {localizedDays.map((day, index) => (
                <View key={DAYS_KEYS[index]} style={styles.weekDayCell}>
                  <ThemedText style={[styles.weekDayText, { color: theme.textSecondary }]}>
                    {day}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={[styles.daysGrid, { flexDirection: 'row' }]}>
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const date = new Date(year, month, day);
                const selected = isSelected(day);
                const rangeStart = isRangeStart(date);
                const rangeEnd = isRangeEnd(date);
                const inRange = isInRange(date) && !rangeStart && !rangeEnd;
                const todayDate = isToday(day);
                const past = isPastDate(day);

                return (
                  <Pressable
                    key={day}
                    style={[
                      styles.dayCell,
                      inRange && { backgroundColor: applyOpacity(theme.primary, '10') },
                    ]}
                    onPress={() => handleDatePress(day)}
                  >
                    <View
                      style={[
                        styles.dayContent,
                        (selected || rangeStart || rangeEnd) && { 
                          backgroundColor: applyOpacity(theme.primary, '20'),
                        },
                        todayDate && !selected && !rangeStart && !rangeEnd && {
                          backgroundColor: applyOpacity(theme.warning, '15'),
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.dayText,
                          past && { color: theme.textSecondary, opacity: 0.4 },
                          (selected || rangeStart || rangeEnd) && { 
                            color: theme.primary, 
                            fontWeight: '600',
                          },
                          todayDate && !selected && !rangeStart && !rangeEnd && {
                            color: theme.warning,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {formatLocalNumber(day)}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {mode === 'range' && selectionMode === 'start_selected' && tempRange.startDate ? (
            <View style={[styles.rangeHint, { borderTopColor: theme.border }]}>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                {t('calendar.rangeHint')}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 9999,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 30,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  calendarIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  calendarContainer: {
    padding: Spacing.lg,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'AlbertSans_500Medium',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'AlbertSans_400Regular',
  },
  rangeHint: {
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
  },
});

export default CalendarDatePicker;
