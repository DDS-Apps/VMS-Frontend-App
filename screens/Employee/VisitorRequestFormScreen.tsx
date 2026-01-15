import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Switch, Platform, Alert, Modal, Animated, ScrollView } from "react-native";
import { CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SelectableCard, CardGridStyles, getGridStyle, getCardWrapper2ColStyle } from "@/components/SelectableCard";
import { LoadingButton } from "@/components/shared/LoadingButton";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateVisitMutation } from "@/hooks/queries/useApprovalQueries";
import { useRoomAvailabilityQuery } from "@/hooks/queries/useMeetingRoomQueries";
import { useRegisterWalkInMutation } from "@/hooks/queries/useReceptionQueries";
import { useUsersQuery } from "@/hooks/queries/useUserQueries";
import type { CreateVisitPayload, RoomAvailabilityParams, UserDto } from "@/types/api.types";
import type { WalkInRegistrationDto, VisitorIdType } from "@/types/reception.types";
import { applyOpacity, createModalOverlayStyle } from "@/utils/statusStyles";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { TimePicker } from "@/components/TimePicker";
import type { VisitorRequestFormScreenProps } from "@/types/employeeNavigation.types";
import { calculateServerDuration } from "@/utils/dateTimeUtils";
import { useServerDateTime } from "@/hooks/useServerDateTime";
import { PURPOSE_OPTIONS } from "@/constants/requestConstants";

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface VisitorRequestFormScreenPropsExtended extends VisitorRequestFormScreenProps {
  asManager?: boolean;
  asReceptionist?: boolean;
  isWalkIn?: boolean;
}

const ID_TYPE_OPTIONS: { value: VisitorIdType; labelKey: string }[] = [
  { value: 'national_id', labelKey: 'visitor.nationalId' },
  { value: 'passport', labelKey: 'visitor.passport' },
  { value: 'driver_license', labelKey: 'visitor.driverLicense' },
  { value: 'other', labelKey: 'common.other' },
];

export default function VisitorRequestFormScreen({ navigation, route, asManager, asReceptionist, isWalkIn }: VisitorRequestFormScreenPropsExtended) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { toLocalNumerals } = useFormatters();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { 
    formatDateForApi, 
    formatTimeForApi,
    formatTime24ForApi,
    formatDateForDisplay,
    formatTimeForDisplay,
    getNowForPicker 
  } = useServerDateTime();
  const createVisitMutation = useCreateVisitMutation();
  const walkInMutation = useRegisterWalkInMutation();
  const { data: usersData, isLoading: isLoadingUsers } = useUsersQuery(
    { page: 1, limit: 100 },
    isWalkIn === true
  );
  const visitType = route?.params?.visitType || t('visitor.generalVisit');

  const FOOTER_HEIGHT = 100;
  const scrollContentStyle = {
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: FOOTER_HEIGHT + Spacing.xl
  };
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(() => new Date());
  const [selectedEndTime, setSelectedEndTime] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [purposeValue, setPurposeValue] = useState('general');
  const [purposeLabel, setPurposeLabel] = useState(visitType);
  
  const [needsMeetingRoom, setNeedsMeetingRoom] = useState(false);
  const [needsBuffet, setNeedsBuffet] = useState(false);

  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [sendSMS, setSendSMS] = useState(false);

  const [hostEmployee, setHostEmployee] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  const [idType, setIdType] = useState<VisitorIdType>('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showPurposePicker, setShowPurposePicker] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const formatDateForApiLocal = (date: Date): string => {
    return formatDateForApi(date);
  };

  const formatTimeForQuery = (time: Date): string => {
    return formatTime24ForApi(time);
  };

  const roomAvailabilityParams: RoomAvailabilityParams | null = needsMeetingRoom && selectedDate && selectedTime && selectedEndTime
    ? {
        date: formatDateForApiLocal(selectedDate),
        startTime: formatTimeForQuery(selectedTime),
        endTime: formatTimeForQuery(selectedEndTime),
      }
    : null;

  const { data: roomAvailability, isLoading: isLoadingRooms } = useRoomAvailabilityQuery(roomAvailabilityParams);
  
  const isRoomAvailable = roomAvailability?.available === true;
  const hasCheckedAvailability = roomAvailability !== undefined && !isLoadingRooms;

  useEffect(() => {
    if (showSuccessModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleCloseSuccessModal();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const handleCloseSuccessModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessModal(false);
      const targetScreen = isWalkIn ? 'AllVisitors' : 'Dashboard';
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: targetScreen }],
        })
      );
    });
  };

  const employees = usersData?.data || [];
  const filteredEmployees = employees.filter(employee => {
    const searchLower = employeeSearchQuery.toLowerCase();
    return (employee.name?.toLowerCase().includes(searchLower) || false) ||
      (employee.department?.toLowerCase().includes(searchLower) || false);
  });

  const handleEmployeeSelect = (employee: UserDto) => {
    setHostEmployee(employee.name || '');
    setSelectedEmployeeId(employee.id);
    setShowEmployeePicker(false);
    setEmployeeSearchQuery('');
    if (errors.hostEmployee) {
      setErrors({ ...errors, hostEmployee: '' });
    }
  };

  const handleCloseEmployeePicker = () => {
    setShowEmployeePicker(false);
    setEmployeeSearchQuery('');
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    // Saudi phone: country code (966) + 9 digits = 12 digits total
    // Or without country code: 9 digits starting with 5 (mobile) or area code
    return digitsOnly.length >= 9 && digitsOnly.length <= 12;
  };

  const formatSaudiPhone = (input: string): string => {
    // Remove all non-digits
    let digits = input.replace(/\D/g, '');
    
    // If starts with 00966, convert to 966
    if (digits.startsWith('00966')) {
      digits = digits.substring(2);
    }
    
    // If doesn't start with 966, add it (unless empty or already has it)
    if (digits.length > 0 && !digits.startsWith('966')) {
      // If starts with 0, remove it (local format)
      if (digits.startsWith('0')) {
        digits = digits.substring(1);
      }
      digits = '966' + digits;
    }
    
    // Limit to 12 digits (966 + 9 digits)
    digits = digits.substring(0, 12);
    
    // Format: +966 XX XXX XXXX
    if (digits.length === 0) return '';
    if (digits.length <= 3) return '+' + digits;
    if (digits.length <= 5) return '+' + digits.substring(0, 3) + ' ' + digits.substring(3);
    if (digits.length <= 8) return '+' + digits.substring(0, 3) + ' ' + digits.substring(3, 5) + ' ' + digits.substring(5);
    return '+' + digits.substring(0, 3) + ' ' + digits.substring(3, 5) + ' ' + digits.substring(5, 8) + ' ' + digits.substring(8);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatSaudiPhone(text);
    setPhone(formatted);
    if (errors.phone) {
      setErrors({ ...errors, phone: '' });
    }
  };

  // Display formatter for picker values - uses server timezone from API
  const formatPickerDate = (date: Date): string => {
    // Check if today using server timezone comparison
    const todayStr = formatDateForDisplay(new Date(), isRTL);
    const dateStr = formatDateForDisplay(date, isRTL);
    if (todayStr === dateStr) {
      return t('time.today');
    }
    return dateStr;
  };

  // Display formatter for picker time values - uses server timezone from API
  const formatPickerTime = (date: Date): string => {
    return formatTimeForDisplay(date, isRTL);
  };

  // API formatter - formats device-local date for submission
  const formatDate = (date: Date) => {
    return formatDateForApi(date);
  };

  // API formatter - formats device-local time for submission
  const formatTimeForApiLocal = (date: Date): string => {
    return formatTimeForApi(date);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (errors.visitDate) {
      setErrors({ ...errors, visitDate: '' });
    }
  };

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time);
    if (errors.visitTime) {
      setErrors({ ...errors, visitTime: '' });
    }
  };

  const handleEndTimeSelect = (time: Date) => {
    setSelectedEndTime(time);
    if (errors.endTime) {
      setErrors({ ...errors, endTime: '' });
    }
  };

  const calculateDuration = (): string => {
    const startMs = selectedTime.getTime();
    const endMs = selectedEndTime.getTime();
    const diffMs = endMs - startMs;
    
    if (diffMs <= 0) return '--';
    
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours === 0) {
      return `${toLocalNumerals(String(minutes))} ${t('time.min')}`;
    } else if (minutes === 0) {
      return `${toLocalNumerals(String(hours))} ${hours === 1 ? t('time.hour') : t('time.hours')}`;
    } else {
      return `${toLocalNumerals(String(hours))}${t('time.hourShort')} ${toLocalNumerals(String(minutes))}${t('time.minShort')}`;
    }
  };

  const getDurationString = (): string => {
    const startMs = selectedTime.getTime();
    const endMs = selectedEndTime.getTime();
    const diffMs = endMs - startMs;
    
    if (diffMs <= 0) return '';
    
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours === 0) {
      return `${toLocalNumerals(String(minutes))} ${t('time.minutes')}`;
    } else if (minutes === 0) {
      return `${toLocalNumerals(String(hours))} ${hours === 1 ? t('time.hour') : t('time.hours')}`;
    } else {
      return `${toLocalNumerals(String(hours))} ${hours === 1 ? t('time.hour') : t('time.hours')} ${toLocalNumerals(String(minutes))} ${t('time.minutes')}`;
    }
  };

  const isTimeInPast = (date: Date, time: Date): boolean => {
    const now = new Date();
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return selectedDateTime < now;
  };

  const isEndTimeBeforeStartTime = (): boolean => {
    return selectedEndTime.getTime() <= selectedTime.getTime();
  };

  const validateForm = (): { isValid: boolean; errorFields: string[] } => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = t('errors.fullNameRequired');
    }

    // Email is required for walk-in registrations
    if (isWalkIn) {
      if (!email.trim()) {
        newErrors.email = t('form.fieldRequired');
      } else if (!validateEmail(email)) {
        newErrors.email = t('errors.invalidEmail');
      }
    } else if (email.trim() && !validateEmail(email)) {
      newErrors.email = t('errors.invalidEmail');
    }

    if (!phone.trim()) {
      newErrors.phone = t('errors.phoneRequired');
    } else if (!validatePhone(phone)) {
      newErrors.phone = t('errors.invalidPhone');
    }

    if ((asReceptionist || isWalkIn) && !hostEmployee.trim()) {
      newErrors.hostEmployee = t('form.fieldRequired');
    }

    // Walk-in requires ID number
    if (isWalkIn && !idNumber.trim()) {
      newErrors.idNumber = t('form.fieldRequired');
    }

    // Skip date/time validation for walk-in registrations
    if (!isWalkIn) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateOnly = new Date(selectedDate);
      selectedDateOnly.setHours(0, 0, 0, 0);
      
      if (selectedDateOnly < today) {
        newErrors.visitDate = t('errors.pastDateNotAllowed');
      }

      if (selectedDateOnly.getTime() === today.getTime() && isTimeInPast(selectedDate, selectedTime)) {
        newErrors.visitTime = t('errors.pastTimeNotAllowed');
      }

      if (isEndTimeBeforeStartTime()) {
        newErrors.endTime = t('errors.endTimeBeforeStartTime');
      }

      if (needsMeetingRoom && hasCheckedAvailability && !isRoomAvailable) {
        newErrors.roomAvailability = t('errors.noRoomsAvailable');
      }
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errorFields: Object.keys(newErrors) };
  };

  const handleSubmit = async () => {
    const { isValid } = validateForm();
    if (!isValid) {
      return;
    }

    if (!user?.id) {
      Alert.alert(
        t('errors.error'),
        t('errors.notAuthenticated'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Handle walk-in registration
      if (isWalkIn) {
        const walkInPayload: WalkInRegistrationDto = {
          visitorName: fullName.trim(),
          visitorEmail: email.trim(),
          visitorCompany: company.trim() || undefined,
          visitorPhone: phone.trim() || undefined,
          hostId: selectedEmployeeId,
          hostName: hostEmployee,
          visitType: purposeLabel || t('visitor.generalVisit'),
          purpose: purposeLabel || t('visitor.generalVisit'),
          idType: idType,
          idNumber: idNumber.trim(),
        };

        console.log('[VisitorRequestForm] Submitting walk-in registration:', JSON.stringify(walkInPayload, null, 2));
        
        const result = await walkInMutation.mutateAsync(walkInPayload);
        
        console.log('[VisitorRequestForm] Walk-in registered successfully:', result);

        const message = t('reception.walkInRegistered').replace('{name}', fullName);
        setSuccessMessage(message);
        setShowSuccessModal(true);
        return;
      }

      // Handle regular visit request - always include email and qr_code
      const communicationChannels: ('email' | 'sms' | 'whatsapp' | 'qr_code')[] = ['email', 'qr_code'];
      if (sendSMS) communicationChannels.push('sms');
      if (sendWhatsApp) communicationChannels.push('whatsapp');

      // Calculate human-readable duration using timezone utility
      const duration = calculateServerDuration(selectedTime, selectedEndTime);

      const payload: CreateVisitPayload = {
        visitor: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim() || undefined,
        },
        visitDate: formatDate(selectedDate),
        visitTime: formatTimeForApi(selectedTime),
        endTime: formatTimeForApi(selectedEndTime),
        duration: duration,
        purpose: purposeLabel || t('visitor.generalVisit'),
        communicationChannels,
        needsMeetingRoom: asReceptionist ? false : needsMeetingRoom,
        needsBuffet: asReceptionist ? false : needsBuffet,
      };

      console.log('[VisitorRequestForm] Submitting request with payload:', JSON.stringify(payload, null, 2));
      
      const result = await createVisitMutation.mutateAsync(payload);
      
      console.log('[VisitorRequestForm] Request submitted successfully:', result);

      const message = asManager 
        ? t('notifications.requestAutoApproved').replace('{name}', fullName)
        : t('notifications.requestSubmitted').replace('{name}', fullName);
      
      setSuccessMessage(message);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('[VisitorRequestForm] Submit error:', error);
      console.error('[VisitorRequestForm] Error type:', error?.constructor?.name);
      console.error('[VisitorRequestForm] Error code:', error?.code);
      console.error('[VisitorRequestForm] Error message:', error?.message);
      
      let errorMessage = t('errors.submitFailed');
      
      if (error?.code === 'NETWORK_ERROR') {
        errorMessage = t('errors.networkError') || 'Network error. Please check your connection and try again.';
      } else if (error?.code === 'TIMEOUT') {
        errorMessage = t('errors.timeoutError') || 'Request timed out. Please try again.';
      } else if (error?.code === 'UNAUTHORIZED') {
        errorMessage = t('errors.sessionExpired') || 'Session expired. Please login again.';
      } else if (error?.code === 'SERVER_ERROR') {
        errorMessage = t('errors.serverError') || 'Server error. Please try again later.';
      } else if (error?.code === 'VALIDATION_ERROR') {
        errorMessage = error?.message || t('errors.validationError');
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        t('errors.error'),
        errorMessage,
        [{ text: t('common.ok') }]
      );
    } finally {
      console.log('[VisitorRequestForm] Submit complete, resetting isSubmitting');
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <ScreenKeyboardAwareScrollView contentContainerStyle={scrollContentStyle}>
      {visitType && visitType !== t('visitor.generalVisit') && (
        <>
          <ThemedView style={[styles.visitTypeBanner, { backgroundColor: applyOpacity(theme.primary, '15'), borderStartColor: theme.primary, borderStartWidth: 4, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
              <DDIcon name="info" size={18} variant="primary" />
              <ThemedText style={[Typography.body, { fontWeight: '600', color: theme.primary }]}>
                {t('visitor.typeOfVisit')}: {visitType}
              </ThemedText>
            </View>
          </ThemedView>
          <Spacer height={Spacing.lg} />
        </>
      )}
      
      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('visitor.visitorInformation')}</ThemedText>
        <Spacer height={Spacing.lg} />

        <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('form.fullName').toUpperCase()} *
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: theme.background, 
              borderColor: errors.fullName ? theme.error : theme.border, 
              color: theme.text,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
          placeholder={t('form.fullNamePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            if (errors.fullName) {
              setErrors({ ...errors, fullName: '' });
            }
          }}
        />
        {errors.fullName ? (
          <>
            <Spacer height={Spacing.xs} />
            <ThemedText style={[Typography.caption, { color: theme.error, textAlign: isRTL ? 'right' : 'left' }]}>
              {errors.fullName}
            </ThemedText>
          </>
        ) : null}

        <Spacer height={Spacing.lg} />

        <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('form.email').toUpperCase()}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: theme.background, 
              borderColor: errors.email ? theme.error : theme.border, 
              color: theme.text,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
          placeholder={t('form.emailPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) {
              setErrors({ ...errors, email: '' });
            }
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email ? (
          <>
            <Spacer height={Spacing.xs} />
            <ThemedText style={[Typography.caption, { color: theme.error, textAlign: isRTL ? 'right' : 'left' }]}>
              {errors.email}
            </ThemedText>
          </>
        ) : null}

        <Spacer height={Spacing.lg} />

        <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('form.phone').toUpperCase()} *
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: theme.background, 
              borderColor: errors.phone ? theme.error : theme.border, 
              color: theme.text,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
          placeholder="+966 5X XXX XXXX"
          placeholderTextColor={theme.textSecondary}
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
        />
        {errors.phone ? (
          <>
            <Spacer height={Spacing.xs} />
            <ThemedText style={[Typography.caption, { color: theme.error, textAlign: isRTL ? 'right' : 'left' }]}>
              {errors.phone}
            </ThemedText>
          </>
        ) : null}

        <Spacer height={Spacing.lg} />

        <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('form.company').toUpperCase()}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
          placeholder={t('form.companyPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          value={company}
          onChangeText={setCompany}
        />

        {(asReceptionist || isWalkIn) ? (
          <>
            <Spacer height={Spacing.lg} />
            <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('reception.hostName').toUpperCase()} *
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <Pressable 
              style={[
                styles.iconInputButton, 
                { 
                  backgroundColor: theme.background, 
                  borderColor: errors.hostEmployee ? theme.error : theme.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row'
                }
              ]}
              onPress={() => setShowEmployeePicker(true)}
            >
              <DDIcon name="user" size={20} variant="muted" />
              <ThemedText style={[Typography.body, { color: hostEmployee ? theme.text : theme.textSecondary, flex: 1, marginStart: Spacing.md, marginEnd: Spacing.md, textAlign: isRTL ? 'right' : 'left' }]}>
                {hostEmployee || t('visitor.selectHost')}
              </ThemedText>
              <DDIcon name="chevron-down" size={20} variant="muted" />
            </Pressable>
            {errors.hostEmployee ? (
              <>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: theme.error, textAlign: isRTL ? 'right' : 'left' }]}>
                  {errors.hostEmployee}
                </ThemedText>
              </>
            ) : null}
          </>
        ) : null}

        {isWalkIn ? (
          <>
            <Spacer height={Spacing.lg} />
            <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('visitor.idType').toUpperCase()} *
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <Pressable 
              style={[
                styles.iconInputButton, 
                { 
                  backgroundColor: theme.background, 
                  borderColor: theme.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row'
                }
              ]}
              onPress={() => setShowIdTypePicker(true)}
            >
              <DDIcon name="credit-card" size={20} variant="muted" />
              <ThemedText style={[Typography.body, { color: theme.text, flex: 1, marginStart: Spacing.md, marginEnd: Spacing.md, textAlign: isRTL ? 'right' : 'left' }]}>
                {t(ID_TYPE_OPTIONS.find(opt => opt.value === idType)?.labelKey || 'visitor.nationalId')}
              </ThemedText>
              <DDIcon name="chevron-down" size={20} variant="muted" />
            </Pressable>

            <Spacer height={Spacing.lg} />
            <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('visitor.idNumber').toUpperCase()} *
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.background, 
                  borderColor: errors.idNumber ? theme.error : theme.border, 
                  color: theme.text,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr'
                }
              ]}
              placeholder={t('visitor.idNumberPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={idNumber}
              onChangeText={(text) => {
                setIdNumber(text);
                if (errors.idNumber) {
                  setErrors({ ...errors, idNumber: '' });
                }
              }}
              keyboardType="default"
              autoCapitalize="characters"
            />
            {errors.idNumber ? (
              <>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: theme.error, textAlign: isRTL ? 'right' : 'left' }]}>
                  {errors.idNumber}
                </ThemedText>
              </>
            ) : null}

            <Spacer height={Spacing.lg} />
            <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('form.purpose').toUpperCase()}
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <Pressable 
              style={[
                styles.iconInputButton, 
                { 
                  backgroundColor: theme.background, 
                  borderColor: theme.border,
                }
              ]}
              onPress={() => setShowPurposePicker(true)}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                {isRTL ? (
                  <>
                    <DDIcon name="chevron-down" size={20} variant="muted" />
                    <ThemedText style={[Typography.body, { color: theme.text, flex: 1, textAlign: 'right' }]}>
                      {purposeLabel || t('form.selectPurpose')}
                    </ThemedText>
                    <DDIcon name="clipboard" size={20} variant="muted" />
                  </>
                ) : (
                  <>
                    <DDIcon name="clipboard" size={20} variant="muted" />
                    <ThemedText style={[Typography.body, { color: theme.text, flex: 1, textAlign: 'left' }]}>
                      {purposeLabel || t('form.selectPurpose')}
                    </ThemedText>
                    <DDIcon name="chevron-down" size={20} variant="muted" />
                  </>
                )}
              </View>
            </Pressable>
          </>
        ) : null}
      </ThemedView>

      {!isWalkIn ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.sectionHeader, { flexDirection: 'row', gap: Spacing.md }]}>
                <View style={[styles.sectionIconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <DDIcon name="calendar" size={20} variant="primary" />
                </View>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <ThemedText style={[Typography.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('visitor.visitSchedule')}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('visitor.whenVisitorComing')}
                  </ThemedText>
                </View>
              </View>
            </View>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('form.visitDate')} *
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <Pressable 
              style={[
                styles.iconInputButton, 
                { 
                  backgroundColor: theme.background, 
                  borderColor: errors.visitDate ? theme.error : theme.border,
                }
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <DDIcon name="calendar" size={20} variant="primary" />
                <ThemedText style={[Typography.body, { color: theme.text, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                  {formatPickerDate(selectedDate)}
                </ThemedText>
                <DDIcon name="chevron-down" size={20} variant="muted" />
              </View>
            </Pressable>
            {errors.visitDate ? (
              <>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: theme.error }]}>
                  {errors.visitDate}
                </ThemedText>
              </>
            ) : null}

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('form.visitTime')} *
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <Pressable 
              style={[
                styles.iconInputButton, 
                { 
                  backgroundColor: theme.background, 
                  borderColor: errors.visitTime ? theme.error : theme.border,
                }
              ]}
              onPress={() => setShowTimePicker(true)}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <DDIcon name="clock" size={20} variant="primary" />
                <ThemedText style={[Typography.body, { color: theme.text, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                  {formatPickerTime(selectedTime)}
                </ThemedText>
                <DDIcon name="chevron-down" size={20} variant="muted" />
              </View>
            </Pressable>
            {errors.visitTime ? (
              <>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: theme.error }]}>
                  {errors.visitTime}
                </ThemedText>
              </>
            ) : null}

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('form.endTime')} *
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <Pressable 
              style={[
                styles.iconInputButton, 
                { 
                  backgroundColor: theme.background, 
                  borderColor: errors.endTime ? theme.error : theme.border,
                }
              ]}
              onPress={() => setShowEndTimePicker(true)}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <DDIcon name="clock" size={20} variant="primary" />
                <ThemedText style={[Typography.body, { color: theme.text, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                  {formatPickerTime(selectedEndTime)}
                </ThemedText>
                <DDIcon name="chevron-down" size={20} variant="muted" />
              </View>
            </Pressable>
            {errors.endTime ? (
              <>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: theme.error }]}>
                  {errors.endTime}
                </ThemedText>
              </>
            ) : null}

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('form.duration').toUpperCase()}
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <View 
              style={[
                styles.iconInputButton, 
                { 
                  backgroundColor: theme.surface, 
                  borderColor: theme.border,
                  opacity: 0.7,
                }
              ]}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <DDIcon name="clock" size={20} variant="muted" />
                <ThemedText style={[Typography.body, { color: isEndTimeBeforeStartTime() ? theme.error : theme.textSecondary, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                  {calculateDuration()}
                </ThemedText>
                <DDIcon name="lock" size={16} variant="muted" />
              </View>
            </View>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
              {t('form.calculatedAutomatically')}
            </ThemedText>

          </ThemedView>
        </>
      ) : null}

      {!asReceptionist && !isWalkIn ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedText style={[Typography.subtitle, { marginBottom: Spacing.sm, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('services.optionalServices')}
          </ThemedText>

          <View style={getGridStyle(isRTL)}>
            <View style={getCardWrapper2ColStyle()}>
              <SelectableCard
                onPress={() => setNeedsMeetingRoom(!needsMeetingRoom)}
                selected={needsMeetingRoom}
              >
                <View style={[styles.compactServiceIcon, { backgroundColor: applyOpacity(theme.cardIcon, '15') }]}>
                  <DDIcon name="users" size={20} color={theme.cardIcon} />
                </View>
                <ThemedText style={[Typography.caption, { fontWeight: '600', marginTop: Spacing.xs, textAlign: 'center', color: theme.text, fontSize: 11 }]}>
                  {t('services.meetingRoom')}
                </ThemedText>
              </SelectableCard>
            </View>

            <View style={getCardWrapper2ColStyle()}>
              <SelectableCard
                onPress={() => setNeedsBuffet(!needsBuffet)}
                selected={needsBuffet}
              >
                <View style={[styles.compactServiceIcon, { backgroundColor: applyOpacity(theme.cardIcon, '15') }]}>
                  <DDIcon name="cloche" size={20} color={theme.cardIcon} />
                </View>
                <ThemedText style={[Typography.caption, { fontWeight: '600', marginTop: Spacing.xs, textAlign: 'center', color: theme.text, fontSize: 11 }]}>
                  {t('buffet.buffet')}
                </ThemedText>
              </SelectableCard>
            </View>
          </View>

          {needsMeetingRoom ? (
            <View style={{ marginTop: Spacing.md }}>
              {hasCheckedAvailability ? (
                <View 
                  style={[
                    styles.availabilityBadge, 
                    { 
                      backgroundColor: isRoomAvailable 
                        ? applyOpacity(theme.success, '15') 
                        : applyOpacity(theme.error, '15'),
                      borderColor: isRoomAvailable ? theme.success : theme.error,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'flex-start',
                    }
                  ]}
                >
                  <DDIcon 
                    name={isRoomAvailable ? "check-circle" : "alert-circle"} 
                    size={16} 
                    color={isRoomAvailable ? theme.success : theme.error} 
                  />
                  <ThemedText 
                    style={[
                      Typography.bodySmall, 
                      { 
                        color: isRoomAvailable ? theme.success : theme.error,
                        marginStart: Spacing.xs,
                        fontWeight: '500'
                      }
                    ]}
                  >
                    {isRoomAvailable 
                      ? t('form.meetingRoomAvailable')
                      : t('errors.noRoomsAvailableForTime')
                    }
                  </ThemedText>
                </View>
              ) : isLoadingRooms ? (
                <View style={[styles.availabilityBadge, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-start' }]}>
                  <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('common.checkingAvailability')}...
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}

          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      <ThemedText style={[Typography.subtitle, { marginBottom: Spacing.sm, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('invitation.communicationChannels')}
      </ThemedText>

      <DirectionalRow style={styles.channelsContainer} gap={Spacing.sm}>
        <Pressable
          style={[styles.channelChip, { backgroundColor: theme.surface, borderColor: sendWhatsApp ? theme.primary : theme.border }]}
          onPress={() => setSendWhatsApp(!sendWhatsApp)}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs }}>
            <View style={[styles.channelChipIcon, { backgroundColor: theme.success + '15' }]}>
              <DDIcon name="message-circle" size={16} variant="success" />
            </View>
            <ThemedText style={[Typography.bodySmall, { fontWeight: '500' }]}>
              {t('services.whatsapp')}
            </ThemedText>
            {sendWhatsApp ? (
              <View style={[styles.chipCheckmark, { backgroundColor: theme.primary }]}>
                <DDIcon name="check" size={10} color={theme.buttonText} />
              </View>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          style={[styles.channelChip, { backgroundColor: theme.surface, borderColor: sendSMS ? theme.primary : theme.border }]}
          onPress={() => setSendSMS(!sendSMS)}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs }}>
            <View style={[styles.channelChipIcon, { backgroundColor: theme.info + '15' }]}>
              <DDIcon name="smartphone" size={16} color={theme.info} />
            </View>
            <ThemedText style={[Typography.bodySmall, { fontWeight: '500' }]}>
              {t('services.sms')}
            </ThemedText>
            {sendSMS ? (
              <View style={[styles.chipCheckmark, { backgroundColor: theme.primary }]}>
                <DDIcon name="check" size={10} color={theme.buttonText} />
              </View>
            ) : null}
          </View>
        </Pressable>

        <View
          style={[styles.channelChip, { backgroundColor: theme.surface, borderColor: theme.primary, opacity: 0.8 }]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs }}>
            <View style={[styles.channelChipIcon, { backgroundColor: theme.warning + '15' }]}>
              <DDIcon name="mail" size={16} color={theme.warning} />
            </View>
            <ThemedText style={[Typography.bodySmall, { fontWeight: '500' }]}>
              {t('services.email')}
            </ThemedText>
            <View style={[styles.chipCheckmark, { backgroundColor: theme.primary }]}>
              <DDIcon name="check" size={10} color={theme.buttonText} />
            </View>
          </View>
        </View>
      </DirectionalRow>

      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        mode="single"
        minimumDate={new Date()}
      />

      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        selectedTime={selectedTime}
        onTimeSelect={handleTimeSelect}
        minuteInterval={5}
      />

      <TimePicker
        visible={showEndTimePicker}
        onClose={() => setShowEndTimePicker(false)}
        selectedTime={selectedEndTime}
        onTimeSelect={handleEndTimeSelect}
        minuteInterval={5}
      />

      <Modal
        visible={showEmployeePicker}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEmployeePicker}
      >
        <View style={styles.iosModalContainer}>
          <Pressable 
            style={[styles.iosModalBackdrop, createModalOverlayStyle(theme, '50')]}
            onPress={handleCloseEmployeePicker}
          />
          <View style={[styles.employeePickerModal, { backgroundColor: theme.surface }]}>
            <View style={[styles.iosPickerHeader, { borderBottomColor: theme.border }]}>
              <View style={{ width: 60 }} />
              <ThemedText style={[Typography.subtitle]}>{t('reception.hostName')}</ThemedText>
              <Pressable 
                onPress={handleCloseEmployeePicker}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 60, alignItems: 'flex-end' }}
              >
                <DDIcon name="x" size={24} variant="muted" />
              </Pressable>
            </View>
            <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="search" size={20} variant="muted" />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder={t('common.search')}
                placeholderTextColor={theme.textSecondary}
                value={employeeSearchQuery}
                onChangeText={setEmployeeSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {employeeSearchQuery.length > 0 ? (
                <Pressable onPress={() => setEmployeeSearchQuery('')}>
                  <DDIcon name="x-circle" size={20} variant="muted" />
                </Pressable>
              ) : null}
            </View>
            <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <Pressable
                    key={employee.id}
                    style={[
                      styles.employeeOption,
                      { borderBottomColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                      selectedEmployeeId === employee.id && { backgroundColor: applyOpacity(theme.primary, '10') }
                    ]}
                    onPress={() => handleEmployeeSelect(employee)}
                  >
                    <View style={[styles.employeeAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <ThemedText style={[Typography.body, { color: theme.primary, fontWeight: '600' }]}>
                        {employee.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1, marginStart: Spacing.md, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <ThemedText style={[Typography.body, { fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }]}>
                        {employee.name || 'Unknown'}
                      </ThemedText>
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {employee.department || ''}
                      </ThemedText>
                    </View>
                    {selectedEmployeeId === employee.id ? (
                      <DDIcon name="check-circle" size={24} variant="primary" />
                    ) : null}
                  </Pressable>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <DDIcon name="users" size={40} variant="muted" />
                  <Spacer height={Spacing.md} />
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
                    {t('common.noResults')} "{employeeSearchQuery}"
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showIdTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIdTypePicker(false)}
      >
        <View style={styles.iosModalContainer}>
          <Pressable 
            style={[styles.iosModalBackdrop, createModalOverlayStyle(theme, '50')]}
            onPress={() => setShowIdTypePicker(false)}
          />
          <View style={[styles.employeePickerModal, { backgroundColor: theme.surface }]}>
            <View style={[styles.iosPickerHeader, { borderBottomColor: theme.border }]}>
              <View style={{ width: 60 }} />
              <ThemedText style={[Typography.subtitle]}>{t('visitor.idType')}</ThemedText>
              <Pressable 
                onPress={() => setShowIdTypePicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 60, alignItems: 'flex-end' }}
              >
                <DDIcon name="x" size={24} variant="muted" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {ID_TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.employeeOption,
                    { borderBottomColor: theme.border },
                    idType === option.value && { backgroundColor: applyOpacity(theme.primary, '10') }
                  ]}
                  onPress={() => {
                    setIdType(option.value);
                    setShowIdTypePicker(false);
                  }}
                >
                  <View style={[styles.employeeAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                    <DDIcon name="credit-card" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, marginStart: Spacing.md }}>
                    <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                      {t(option.labelKey)}
                    </ThemedText>
                  </View>
                  {idType === option.value ? (
                    <DDIcon name="check-circle" size={24} variant="primary" />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Purpose Picker Modal */}
      <Modal
        visible={showPurposePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPurposePicker(false)}
      >
        <View style={styles.iosModalContainer}>
          <Pressable 
            style={[styles.iosModalBackdrop, createModalOverlayStyle(theme, '50')]}
            onPress={() => setShowPurposePicker(false)}
          />
          <View style={[styles.employeePickerModal, { backgroundColor: theme.surface }]}>
            <View style={[styles.iosPickerHeader, { borderBottomColor: theme.border }]}>
              <View style={{ width: 60 }} />
              <ThemedText style={[Typography.subtitle]}>{t('visitor.selectVisitType')}</ThemedText>
              <Pressable 
                onPress={() => setShowPurposePicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 60, alignItems: 'flex-end' }}
              >
                <DDIcon name="x" size={24} variant="muted" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {PURPOSE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.employeeOption,
                    { borderBottomColor: theme.border },
                    purposeValue === option.value && { backgroundColor: applyOpacity(theme.primary, '10') }
                  ]}
                  onPress={() => {
                    setPurposeValue(option.value);
                    setPurposeLabel(t(option.labelKey as any));
                    setShowPurposePicker(false);
                  }}
                >
                  <View style={[styles.employeeAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                    <DDIcon name="clipboard" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, marginStart: Spacing.md }}>
                    <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                      {t(option.labelKey as any)}
                    </ThemedText>
                  </View>
                  {purposeValue === option.value ? (
                    <DDIcon name="check-circle" size={24} variant="primary" />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="none"
        onRequestClose={handleCloseSuccessModal}
      >
        <Pressable 
          style={[styles.successModalOverlay, createModalOverlayStyle(theme, '50')]}
          onPress={handleCloseSuccessModal}
        >
          <Animated.View 
            style={[
              styles.successModalContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                backgroundColor: theme.surface,
              }
            ]}
          >
            <View style={[styles.successIconContainer, { backgroundColor: applyOpacity(theme.success, '15') }]}>
              <DDIcon name="check-circle" size={48} variant="success" />
            </View>
            
            <Spacer height={Spacing.lg} />
            
            <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '700', color: theme.text, textAlign: 'center' }]}>
              {t('common.success')}
            </ThemedText>
            
            <Spacer height={Spacing.sm} />
            
            <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
              {successMessage}
            </ThemedText>
            
            <Spacer height={Spacing.xl} />
            
            <Pressable
              style={[styles.successButton, { backgroundColor: theme.success }]}
              onPress={handleCloseSuccessModal}
            >
              <ThemedText style={[Typography.body, { color: theme.buttonText, fontWeight: '600' }]}>
                {t('common.close')}
              </ThemedText>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </ScreenKeyboardAwareScrollView>

    {/* Sticky Footer for Action Buttons */}
    <View style={[styles.stickyFooter, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <LoadingButton
          onPress={() => navigation.goBack()}
          variant="outline"
          size="large"
          style={styles.actionButton}
        >
          {t('actions.cancel')}
        </LoadingButton>

        <View style={{ width: Spacing.md }} />

        <LoadingButton
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          variant="primary"
          size="large"
          style={styles.actionButton}
        >
          {t('actions.submitRequest')}
        </LoadingButton>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  container: {
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  pickerButton: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconInputButton: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeader: {
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 100,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  row: {
    alignItems: 'center',
  },
  compactServiceIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.lg,
  },
  serviceHeader: {
    alignItems: 'center',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopStartRadius: BorderRadius.lg,
    borderTopEndRadius: BorderRadius.lg,
    maxHeight: '80%',
  },
  pickerModalContent: {
    borderRadius: BorderRadius.lg,
    margin: Spacing.xl,
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  durationOption: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  iosModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  iosModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iosPickerModal: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  webModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  webPickerModal: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  webPickerHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  channelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  channelChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipCheckmark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginStart: Spacing.xs,
  },
  channelRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  channelContent: {
    alignItems: 'center',
    flex: 1,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitTypeBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  successModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: Spacing.xl * 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityBadge: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  employeePickerModal: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.sm,
  },
  employeeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
});
