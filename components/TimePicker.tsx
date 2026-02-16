import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Modal, Platform, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ThemedText } from "@/components/ThemedText";
import { DDIcon } from "@/components/DDIcon";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { toArabicNumerals } from "@/utils/formatters";
import { applyOpacity, createModalOverlayStyle } from "@/utils/statusStyles";
import { DirectionalRow } from '@/components/DirectionalRow';

const WHEEL_ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelColumnProps {
  items: { value: number; label: string }[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  theme: any;
}

function WheelColumn({ items, selectedValue, onValueChange, theme }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);
  const selectedIndex = items.findIndex(item => item.value === selectedValue);

  useEffect(() => {
    if (!isUserScrolling.current && selectedIndex >= 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: selectedIndex * WHEEL_ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, [selectedIndex]);

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / WHEEL_ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    isUserScrolling.current = false;
    if (items[clampedIndex] && items[clampedIndex].value !== selectedValue) {
      onValueChange(items[clampedIndex].value);
    }
  }, [items, selectedValue, onValueChange]);

  const handleScrollBegin = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  const paddingVertical = WHEEL_ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

  return (
    <View style={{ height: WHEEL_HEIGHT, overflow: 'hidden', flex: 1 }}>
      <View
        pointerEvents="none"
        style={[
          wheelStyles.selectionIndicator,
          {
            top: paddingVertical,
            backgroundColor: applyOpacity(theme.primary, '12'),
            borderTopColor: applyOpacity(theme.primary, '30'),
            borderBottomColor: applyOpacity(theme.primary, '30'),
          },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical }}
      >
        {items.map((item, index) => {
          const isSelected = item.value === selectedValue;
          return (
            <Pressable
              key={`${item.value}-${index}`}
              style={[wheelStyles.wheelItem]}
              onPress={() => {
                onValueChange(item.value);
                scrollRef.current?.scrollTo({
                  y: index * WHEEL_ITEM_HEIGHT,
                  animated: true,
                });
              }}
            >
              <ThemedText
                style={[
                  wheelStyles.wheelItemText,
                  { color: isSelected ? theme.text : theme.textTertiary },
                  isSelected && { fontWeight: '700', fontSize: 20 },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 17,
    fontWeight: '400',
  },
});

interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  selectedTime: Date;
  onTimeSelect: (time: Date) => void;
  minuteInterval?: 5 | 10 | 15 | 30;
}

const QUICK_TIMES = [
  { label: '9:00 AM', hour: 9, minute: 0, period: 'AM' as const },
  { label: '10:00 AM', hour: 10, minute: 0, period: 'AM' as const },
  { label: '12:00 PM', hour: 12, minute: 0, period: 'PM' as const },
  { label: '2:00 PM', hour: 2, minute: 0, period: 'PM' as const },
  { label: '4:00 PM', hour: 4, minute: 0, period: 'PM' as const },
];

export function TimePicker({
  visible,
  onClose,
  selectedTime,
  onTimeSelect,
  minuteInterval = 5,
}: TimePickerProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();  const [pendingTime, setPendingTime] = useState<Date>(selectedTime);
  const [selectedHour, setSelectedHour] = useState<number>(12);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [activeSelector, setActiveSelector] = useState<'hour' | 'minute'>('hour');
  
  // Refs and state for web arrow navigation
  const selectorScrollRef = useRef<ScrollView>(null);
  const quickSelectScrollRef = useRef<ScrollView>(null);
  const [selectorScrollOffset, setSelectorScrollOffset] = useState(0);
  const [quickSelectScrollOffset, setQuickSelectScrollOffset] = useState(0);
  const [selectorContentWidth, setSelectorContentWidth] = useState(0);
  const [quickSelectContentWidth, setQuickSelectContentWidth] = useState(0);
  const [selectorContainerWidth, setSelectorContainerWidth] = useState(0);
  const [quickSelectContainerWidth, setQuickSelectContainerWidth] = useState(0);
  
  const SCROLL_AMOUNT = 100; // pixels to scroll per arrow click

  useEffect(() => {
    if (visible) {
      const time = selectedTime || new Date();
      setPendingTime(time);
      
      let hours = time.getHours();
      const minutes = time.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours === 0 ? 12 : hours;
      
      const roundedMinutes = Math.round(minutes / minuteInterval) * minuteInterval;
      
      setSelectedHour(hours);
      setSelectedMinute(roundedMinutes >= 60 ? 0 : roundedMinutes);
      setSelectedPeriod(period);
      setActiveSelector('hour');
    }
  }, [visible, selectedTime, minuteInterval]);

  const minutesArray = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 60; i += minuteInterval) {
      arr.push(i);
    }
    return arr;
  }, [minuteInterval]);

  const hoursArray = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  }, []);

  const updatePendingTime = (hour: number, minute: number, period: 'AM' | 'PM') => {
    const newTime = new Date(pendingTime);
    let hours24 = hour;
    
    if (period === 'AM') {
      hours24 = hour === 12 ? 0 : hour;
    } else {
      hours24 = hour === 12 ? 12 : hour + 12;
    }
    
    newTime.setHours(hours24, minute, 0, 0);
    setPendingTime(newTime);
  };

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    updatePendingTime(hour, selectedMinute, selectedPeriod);
    setActiveSelector('minute');
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    updatePendingTime(selectedHour, minute, selectedPeriod);
  };

  const handlePeriodToggle = () => {
    const newPeriod = selectedPeriod === 'AM' ? 'PM' : 'AM';
    setSelectedPeriod(newPeriod);
    updatePendingTime(selectedHour, selectedMinute, newPeriod);
  };

  const handleQuickSelect = (preset: typeof QUICK_TIMES[0]) => {
    setSelectedHour(preset.hour);
    setSelectedMinute(preset.minute);
    setSelectedPeriod(preset.period);
    updatePendingTime(preset.hour, preset.minute, preset.period);
  };

  const handleConfirm = () => {
    onTimeSelect(pendingTime);
    onClose();
  };

  const handleCancel = () => {
    setPendingTime(selectedTime);
    onClose();
  };

  const handleNativeTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (time) {
      if (Platform.OS === 'android') {
        onTimeSelect(time);
        onClose();
      } else {
        setPendingTime(time);
      }
    } else if (Platform.OS === 'android') {
      onClose();
    }
  };

  const formatDisplayTime = () => {
    const hours = String(selectedHour).padStart(2, '0');
    const minutes = String(selectedMinute).padStart(2, '0');
    if (isRTL) {
      return `${toArabicNumerals(hours)}:${toArabicNumerals(minutes)}`;
    }
    return `${hours}:${minutes}`;
  };

  // Web arrow navigation helpers
  const canScrollSelectorLeft = selectorScrollOffset > 0;
  const canScrollSelectorRight = selectorScrollOffset < (selectorContentWidth - selectorContainerWidth - 5);
  const canScrollQuickSelectLeft = quickSelectScrollOffset > 0;
  const canScrollQuickSelectRight = quickSelectScrollOffset < (quickSelectContentWidth - quickSelectContainerWidth - 5);

  const scrollSelectorLeft = () => {
    const newOffset = Math.max(0, selectorScrollOffset - SCROLL_AMOUNT);
    selectorScrollRef.current?.scrollTo({ x: newOffset, animated: true });
  };

  const scrollSelectorRight = () => {
    const maxOffset = selectorContentWidth - selectorContainerWidth;
    const newOffset = Math.min(maxOffset, selectorScrollOffset + SCROLL_AMOUNT);
    selectorScrollRef.current?.scrollTo({ x: newOffset, animated: true });
  };

  const scrollQuickSelectLeft = () => {
    const newOffset = Math.max(0, quickSelectScrollOffset - SCROLL_AMOUNT);
    quickSelectScrollRef.current?.scrollTo({ x: newOffset, animated: true });
  };

  const scrollQuickSelectRight = () => {
    const maxOffset = quickSelectContentWidth - quickSelectContainerWidth;
    const newOffset = Math.min(maxOffset, quickSelectScrollOffset + SCROLL_AMOUNT);
    quickSelectScrollRef.current?.scrollTo({ x: newOffset, animated: true });
  };

  if (Platform.OS === 'ios') {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <Pressable 
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, '50')]}
            onPress={handleCancel}
          />
          <View style={[styles.pickerModal, { backgroundColor: theme.surface }]}>
            <View style={[styles.headerCompact, { borderBottomColor: theme.border, flexDirection: 'row' }]}>
              <DirectionalRow>
                <DDIcon name="clock" size={18} color={theme.primary} />
                <ThemedText style={[Typography.body, { fontWeight: '600', marginStart: Spacing.sm }]}>{t('time.selectTime')}</ThemedText>
              </DirectionalRow>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md }}>
              <WheelColumn
                items={hoursArray.map(h => ({
                  value: h,
                  label: isRTL ? toArabicNumerals(String(h)) : String(h),
                }))}
                selectedValue={selectedHour}
                onValueChange={(h) => {
                  setSelectedHour(h);
                  updatePendingTime(h, selectedMinute, selectedPeriod);
                }}
                theme={theme}
              />
              <WheelColumn
                items={minutesArray.map(m => ({
                  value: m,
                  label: isRTL ? toArabicNumerals(String(m).padStart(2, '0')) : String(m).padStart(2, '0'),
                }))}
                selectedValue={selectedMinute}
                onValueChange={(m) => {
                  setSelectedMinute(m);
                  updatePendingTime(selectedHour, m, selectedPeriod);
                }}
                theme={theme}
              />
              <View style={{ width: 50, height: WHEEL_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <Pressable
                  onPress={handlePeriodToggle}
                  style={[{
                    paddingVertical: Spacing.sm,
                    paddingHorizontal: Spacing.md,
                    borderRadius: BorderRadius.md,
                    backgroundColor: applyOpacity(theme.primary, '12'),
                  }]}
                >
                  <ThemedText style={{ fontSize: 17, fontWeight: '700', color: theme.primary }}>
                    {t(`time.${selectedPeriod.toLowerCase()}`)}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            <View style={styles.quickSelectRowCompact}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickSelectScrollContent}
              >
                {QUICK_TIMES.map((preset) => {
                  const hours = pendingTime.getHours();
                  const minutes = pendingTime.getMinutes();
                  const period = hours >= 12 ? 'PM' : 'AM';
                  const displayHour = hours % 12 || 12;
                  const isSelected = displayHour === preset.hour && 
                                     minutes === preset.minute && 
                                     period === preset.period;
                  return (
                    <Pressable
                      key={preset.label}
                      style={[
                        styles.quickPill,
                        { borderColor: theme.border },
                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => {
                        let hours24 = preset.hour;
                        if (preset.period === 'AM') {
                          hours24 = preset.hour === 12 ? 0 : preset.hour;
                        } else {
                          hours24 = preset.hour === 12 ? 12 : preset.hour + 12;
                        }
                        const newTime = new Date(pendingTime);
                        newTime.setHours(hours24, preset.minute, 0, 0);
                        setPendingTime(newTime);
                      }}
                    >
                      <ThemedText style={[
                        styles.quickPillText,
                        { color: theme.text },
                        isSelected && { color: theme.buttonText }
                      ]}>
                        {isRTL 
                          ? `${t(`time.${preset.period.toLowerCase()}`)} ${toArabicNumerals(String(preset.hour))}:${toArabicNumerals(String(preset.minute).padStart(2, '0'))}`
                          : preset.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={[styles.footerButtonsCompact, { flexDirection: 'row' }]}>
              <Pressable 
                onPress={handleCancel}
                style={[styles.actionButton, styles.cancelButtonStyle, { borderColor: theme.border }]}
              >
                <ThemedText style={[Typography.body, { color: theme.textSecondary, fontWeight: '600' }]}>{t('common.cancel')}</ThemedText>
              </Pressable>
              <Pressable 
                onPress={handleConfirm}
                style={[styles.actionButton, styles.confirmButtonStyle, { backgroundColor: theme.primary }]}
              >
                <ThemedText style={[Typography.body, { color: theme.buttonText, fontWeight: '600' }]}>{t('common.confirm')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={selectedTime}
        mode="time"
        display="default"
        onChange={handleNativeTimeChange}
        locale={isRTL ? 'ar-SA' : undefined}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <Pressable 
        style={[styles.webModalOverlay, createModalOverlayStyle(theme, '60')]}
        onPress={handleCancel}
      >
        <Pressable 
          style={[styles.webPickerContainer, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.headerCompact, { borderBottomColor: theme.border, flexDirection: 'row' }]}>
            <DDIcon name="clock" size={18} color={theme.primary} />
            <ThemedText style={[Typography.body, { fontWeight: '600', marginStart: Spacing.sm, flex: 1 }]}>{t('time.selectTime')}</ThemedText>
            <Pressable onPress={handleCancel} hitSlop={8}>
              <DDIcon name="x" size={18} variant="muted" />
            </Pressable>
          </View>

          <View style={styles.mainTimeSection}>
            <View style={styles.digitalClockRow}>
              <Pressable
                onPress={() => setActiveSelector('hour')}
                style={[
                  styles.timeDigitBox,
                  { borderColor: theme.border },
                  activeSelector === 'hour' && { borderColor: theme.primary, backgroundColor: applyOpacity(theme.primary, '08') }
                ]}
              >
                <ThemedText style={[
                  styles.timeDigitText,
                  { color: theme.text },
                  activeSelector === 'hour' && { color: theme.primary }
                ]}>
                  {isRTL ? toArabicNumerals(String(selectedHour).padStart(2, '0')) : String(selectedHour).padStart(2, '0')}
                </ThemedText>
              </Pressable>
              
              <ThemedText style={[styles.timeSeparator, { color: theme.primary }]}>:</ThemedText>
              
              <Pressable
                onPress={() => setActiveSelector('minute')}
                style={[
                  styles.timeDigitBox,
                  { borderColor: theme.border },
                  activeSelector === 'minute' && { borderColor: theme.primary, backgroundColor: applyOpacity(theme.primary, '08') }
                ]}
              >
                <ThemedText style={[
                  styles.timeDigitText,
                  { color: theme.text },
                  activeSelector === 'minute' && { color: theme.primary }
                ]}>
                  {isRTL ? toArabicNumerals(String(selectedMinute).padStart(2, '0')) : String(selectedMinute).padStart(2, '0')}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={handlePeriodToggle}
                style={[styles.periodToggle, { backgroundColor: applyOpacity(theme.primary, '10') }]}
              >
                <View style={[
                  styles.periodOption,
                  selectedPeriod === 'AM' && { backgroundColor: theme.primary }
                ]}>
                  <ThemedText style={[
                    styles.periodOptionText,
                    { color: theme.textSecondary },
                    selectedPeriod === 'AM' && { color: theme.buttonText }
                  ]}>{t('time.am')}</ThemedText>
                </View>
                <View style={[
                  styles.periodOption,
                  selectedPeriod === 'PM' && { backgroundColor: theme.primary }
                ]}>
                  <ThemedText style={[
                    styles.periodOptionText,
                    { color: theme.textSecondary },
                    selectedPeriod === 'PM' && { color: theme.buttonText }
                  ]}>{t('time.pm')}</ThemedText>
                </View>
              </Pressable>
            </View>

            <View style={[styles.scrollWithArrows, { flexDirection: 'row' }]}>
              <Pressable 
                onPress={isRTL ? scrollSelectorRight : scrollSelectorLeft} 
                style={[
                  styles.scrollArrowOutside, 
                  { opacity: (isRTL ? canScrollSelectorRight : canScrollSelectorLeft) ? 1 : 0 }
                ]}
                disabled={isRTL ? !canScrollSelectorRight : !canScrollSelectorLeft}
              >
                <DDIcon name="chevron-left" size={20} color={theme.textSecondary} />
              </Pressable>
              <View style={[styles.selectorGrid, { flex: 1 }]}>
                <ScrollView 
                  ref={selectorScrollRef}
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectorScrollContent}
                  onScroll={(e) => setSelectorScrollOffset(e.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16}
                  onContentSizeChange={(w) => setSelectorContentWidth(w)}
                  onLayout={(e) => setSelectorContainerWidth(e.nativeEvent.layout.width)}
                >
                  {activeSelector === 'hour' ? (
                    hoursArray.map((hour) => (
                      <Pressable
                        key={`hour-${hour}`}
                        style={[
                          styles.selectorItem,
                          { borderColor: theme.border },
                          selectedHour === hour && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => handleHourSelect(hour)}
                      >
                        <ThemedText style={[
                          styles.selectorItemText,
                          { color: theme.text },
                          selectedHour === hour && { color: theme.buttonText, fontWeight: '600' }
                        ]}>
                          {isRTL ? toArabicNumerals(String(hour)) : hour}
                        </ThemedText>
                      </Pressable>
                    ))
                  ) : (
                    minutesArray.map((minute) => (
                      <Pressable
                        key={`minute-${minute}`}
                        style={[
                          styles.selectorItem,
                          { borderColor: theme.border },
                          selectedMinute === minute && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => handleMinuteSelect(minute)}
                      >
                        <ThemedText style={[
                          styles.selectorItemText,
                          { color: theme.text },
                          selectedMinute === minute && { color: theme.buttonText, fontWeight: '600' }
                        ]}>
                          {isRTL ? toArabicNumerals(String(minute).padStart(2, '0')) : String(minute).padStart(2, '0')}
                        </ThemedText>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
              <Pressable 
                onPress={isRTL ? scrollSelectorLeft : scrollSelectorRight} 
                style={[
                  styles.scrollArrowOutside, 
                  { opacity: (isRTL ? canScrollSelectorLeft : canScrollSelectorRight) ? 1 : 0 }
                ]}
                disabled={isRTL ? !canScrollSelectorLeft : !canScrollSelectorRight}
              >
                <DDIcon name="chevron-right" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.quickSelectSection}>
            <ThemedText style={[styles.quickSelectLabel, { color: theme.textSecondary }]}>{t('time.quickSelect')}</ThemedText>
            <View style={[styles.scrollWithArrows, { flexDirection: 'row' }]}>
              <Pressable 
                onPress={isRTL ? scrollQuickSelectRight : scrollQuickSelectLeft} 
                style={[
                  styles.scrollArrowOutside, 
                  { opacity: (isRTL ? canScrollQuickSelectRight : canScrollQuickSelectLeft) ? 1 : 0 }
                ]}
                disabled={isRTL ? !canScrollQuickSelectRight : !canScrollQuickSelectLeft}
              >
                <DDIcon name="chevron-left" size={20} color={theme.textSecondary} />
              </Pressable>
              <ScrollView 
                ref={quickSelectScrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickSelectScrollContent}
                style={{ flex: 1 }}
                onScroll={(e) => setQuickSelectScrollOffset(e.nativeEvent.contentOffset.x)}
                scrollEventThrottle={16}
                onContentSizeChange={(w) => setQuickSelectContentWidth(w)}
                onLayout={(e) => setQuickSelectContainerWidth(e.nativeEvent.layout.width)}
              >
                {QUICK_TIMES.map((preset) => {
                  const isSelected = selectedHour === preset.hour && 
                                     selectedMinute === preset.minute && 
                                     selectedPeriod === preset.period;
                  return (
                    <Pressable
                      key={preset.label}
                      style={[
                        styles.quickPill,
                        { borderColor: theme.border },
                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => handleQuickSelect(preset)}
                    >
                      <ThemedText style={[
                        styles.quickPillText,
                        { color: theme.text },
                        isSelected && { color: theme.buttonText }
                      ]}>
                        {isRTL 
                          ? `${t(`time.${preset.period.toLowerCase()}`)} ${toArabicNumerals(String(preset.hour))}:${toArabicNumerals(String(preset.minute).padStart(2, '0'))}`
                          : preset.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable 
                onPress={isRTL ? scrollQuickSelectLeft : scrollQuickSelectRight} 
                style={[
                  styles.scrollArrowOutside, 
                  { opacity: (isRTL ? canScrollQuickSelectLeft : canScrollQuickSelectRight) ? 1 : 0 }
                ]}
                disabled={isRTL ? !canScrollQuickSelectLeft : !canScrollQuickSelectRight}
              >
                <DDIcon name="chevron-right" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.footerButtonsCompact, { flexDirection: 'row' }]}>
            <Pressable 
              onPress={handleCancel}
              style={[styles.actionButton, styles.cancelButtonStyle, { borderColor: theme.border }]}
            >
              <ThemedText style={[Typography.body, { color: theme.textSecondary, fontWeight: '600' }]}>{t('common.cancel')}</ThemedText>
            </Pressable>
            <Pressable 
              onPress={handleConfirm}
              style={[styles.actionButton, styles.confirmButtonStyle, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={[Typography.body, { color: theme.buttonText, fontWeight: '600' }]}>{t('common.confirm')}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  pickerModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 30,
    zIndex: 9999,
  },
  headerCompact: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  webModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 9999,
  },
  webPickerContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 30,
    zIndex: 9999,
    overflow: 'hidden',
  },
  mainTimeSection: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  digitalClockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  timeDigitBox: {
    width: 72,
    minHeight: 64,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigitText: {
    fontSize: 32,
    lineHeight: 52,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeSeparator: {
    fontSize: 32,
    lineHeight: 52,
    fontWeight: '700',
  },
  periodToggle: {
    flexDirection: 'column',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginStart: Spacing.sm,
  },
  periodOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodOptionText: {
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '600',
  },
  selectorGrid: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
  },
  selectorScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  selectorItem: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorItemText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
  },
  quickSelectSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  quickSelectLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickSelectScrollContent: {
    gap: Spacing.xs,
  },
  quickSelectRowCompact: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  quickPill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footerButtonsCompact: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonStyle: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmButtonStyle: {},
  scrollWithArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  scrollArrowOutside: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TimePicker;
