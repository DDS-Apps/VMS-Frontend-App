import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  Platform,
  Alert,
  Modal,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  SelectableCard,
  CardGridStyles,
  getGridStyle,
  getCardWrapper2ColStyle,
} from "@/components/SelectableCard";
import { LoadingButton } from "@/components/shared/LoadingButton";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography, FontFamily, getLocaleFontFamily, getInputFontFamily } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateVisitMutation, useDuplicateCheckQuery } from "@/hooks/queries/useApprovalQueries";
import { useToast } from "@/contexts/ToastContext";
import { useRoomAvailabilityQuery } from "@/hooks/queries/useMeetingRoomQueries";
import { useRegisterWalkInMutation } from "@/hooks/queries/useReceptionQueries";
import { useUsersQuery } from "@/hooks/queries/useUserQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  DUPLICATE_CHECK_DEBOUNCE_MS,
  buildDuplicateCheckParams,
  isDuplicateCheckPending,
} from "@/utils/duplicateCheckParams";
import type {
  ParkingDecision,
  CreateVisitPayload,
  RoomAvailabilityParams,
  RoomAvailabilityRoomDto,
  UserDto,
} from "@/types/api.types";
import type {
  WalkInRegistrationDto,
  VisitorIdType,
} from "@/types/reception.types";
import { applyOpacity, createModalOverlayStyle } from "@/utils/statusStyles";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { TimePicker } from "@/components/TimePicker";
import { normalizePhoneNumber, getInitials } from "@/utils/formatters";
import { PhoneInputWithCountry } from "@/components/PhoneInputWithCountry";
import type { VisitorRequestFormScreenProps } from "@/types/employeeNavigation.types";
import { calculateServerDuration, getBusinessDateKey, getServerDateParts } from "@/utils/dateTimeUtils";
import { useServerDateTime } from "@/hooks/useServerDateTime";
import { PURPOSE_OPTIONS, PURPOSE_VALUE_TO_KEY, normalizePurposeValue } from "@/constants/requestConstants";
import {
  computeHasCheckedAvailability,
  isSubmitDisabledByLoading,
  isEmployeeListStillLoading,
  isRoomAvailabilityStillLoading,
} from "@/utils/formLoadingGuards";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface VisitorRequestFormScreenPropsExtended
  extends VisitorRequestFormScreenProps {
  asManager?: boolean;
  asReceptionist?: boolean;
  isWalkIn?: boolean;
}

const ID_TYPE_OPTIONS: { value: VisitorIdType; labelKey: string }[] = [
  { value: "national_id", labelKey: "visitor.nationalId" },
  { value: "passport", labelKey: "visitor.passport" },
  { value: "iqama", labelKey: "visitor.iqama" },
  { value: "driver_license", labelKey: "visitor.driverLicense" },
];

export default function VisitorRequestFormScreen({
  navigation,
  route,
  asManager,
  asReceptionist,
  isWalkIn,
}: VisitorRequestFormScreenPropsExtended) {
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
    getNowForPicker,
  } = useServerDateTime();
  const { showError } = useToast();
  const createVisitMutation = useCreateVisitMutation();
  const walkInMutation = useRegisterWalkInMutation();
  const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = useState("");
  const { data: usersData, isLoading: isLoadingUsers } = useUsersQuery(
    debouncedEmployeeSearch.trim().length > 0
      ? { page: 1, limit: 100, search: debouncedEmployeeSearch.trim() }
      : { page: 1, limit: 100 },
    isWalkIn === true,
  );
  const visitTypeId =
    ((route?.params as any)?.visitTypeId as string | undefined) ||
    ((route?.params as any)?.visitType as string | undefined);
  const initialPurposeValue = visitTypeId ? (normalizePurposeValue(visitTypeId) || visitTypeId) : '';

  // Pre-fill from deep link / Outlook add-in URL params (mobile nav params)
  const prefill = (route?.params as any)?.prefill as {
    name?: string; email?: string; company?: string; phone?: string;
  } | undefined;

  const FOOTER_HEIGHT = 100;
  const scrollContentStyle = {
    paddingTop: Spacing.lg,
    paddingBottom: FOOTER_HEIGHT + Spacing.xl,
  };

  const [fullName, setFullName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [company, setCompany] = useState(prefill?.company ?? "");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(() => new Date());
  const [selectedEndTime, setSelectedEndTime] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [purposeValue, setPurposeValue] = useState(initialPurposeValue);

  const [needsMeetingRoom, setNeedsMeetingRoom] = useState(false);
  const [needsBuffet, setNeedsBuffet] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [parkingDecision, setParkingDecision] = useState<ParkingDecision>('not_required');

  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendSMS, setSendSMS] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const [hostEmployee, setHostEmployee] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

  const [idType, setIdType] = useState<VisitorIdType>("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showPurposePicker, setShowPurposePicker] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Web: read pre-fill params directly from the URL on first mount
  // (covers the case where the user lands on /requests/new?name=… before auth)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const n = params.get('name');
      const e = params.get('email');
      const c = params.get('company');
      const ph = params.get('phone');
      if (n || e || c || ph) {
        if (n) setFullName(n);
        if (e) setEmail(e);
        if (c) setCompany(c);
        if (ph) setPhone(ph);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {
      // non-critical
    }
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDateForApiLocal = (date: Date): string => {
    return formatDateForApi(date);
  };

  const formatTimeForQuery = (time: Date): string => {
    return formatTime24ForApi(time);
  };

  const roomAvailabilityParams: RoomAvailabilityParams | null =
    needsMeetingRoom && selectedDate && selectedTime && selectedEndTime
      ? {
          date: formatDateForApiLocal(selectedDate),
          startTime: formatTimeForQuery(selectedTime),
          endTime: formatTimeForQuery(selectedEndTime),
        }
      : null;

  const {
    data: roomAvailability,
    isLoading: isLoadingRooms,
    isFetching: isFetchingRooms,
    isError: isRoomsError,
    refetch: refetchRooms,
  } = useRoomAvailabilityQuery(roomAvailabilityParams);

  // The duplicate check waits for the guest's email/phone to settle and to look
  // complete, so typing an address fires one request instead of one per key.
  const debouncedEmail = useDebouncedValue(email, DUPLICATE_CHECK_DEBOUNCE_MS);
  const debouncedPhone = useDebouncedValue(phone, DUPLICATE_CHECK_DEBOUNCE_MS);
  const duplicateCheckDate = selectedDate ? formatDateForApiLocal(selectedDate) : undefined;
  const duplicateCheckParams = buildDuplicateCheckParams({
    isWalkIn: isWalkIn === true,
    date: duplicateCheckDate,
    email: debouncedEmail,
    phone: debouncedPhone,
  });
  // While the latest keystrokes have not reached the query yet, a check is
  // still owed: treat it as in flight so Submit keeps waiting for it.
  const isDuplicateCheckDebouncing = isDuplicateCheckPending(
    buildDuplicateCheckParams({
      isWalkIn: isWalkIn === true,
      date: duplicateCheckDate,
      email,
      phone,
    }),
    duplicateCheckParams,
  );

  const {
    data: duplicateCheckData,
    isLoading: isDuplicateCheckLoading,
    isFetching: isDuplicateCheckFetching,
    isError: isDuplicateCheckError,
    refetch: refetchDuplicateCheck,
  } = useDuplicateCheckQuery(duplicateCheckParams, !isWalkIn);
  const isCheckingDuplicate =
    isDuplicateCheckDebouncing || isDuplicateCheckLoading || isDuplicateCheckFetching ||
    isDuplicateCheckError;

  const availableRooms: RoomAvailabilityRoomDto[] = roomAvailability?.rooms ?? [];
  const isRoomAvailable = roomAvailability?.available === true;
  const hasCheckedAvailability = computeHasCheckedAvailability(
    roomAvailability,
    isRoomsError,
    isLoadingRooms,
    isFetchingRooms,
  );

  useEffect(() => {
    setSelectedRoomId(null);
  }, [roomAvailabilityParams?.date, roomAvailabilityParams?.startTime, roomAvailabilityParams?.endTime]);

  useEffect(() => {
    if (idNumber) {
      let filtered = idNumber;
      if (idType === 'national_id' || idType === 'iqama' || idType === 'driver_license') {
        filtered = idNumber.replace(/\D/g, '').slice(0, 10);
      } else if (idType === 'passport') {
        filtered = idNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      }
      if (filtered !== idNumber) {
        setIdNumber(filtered);
      }
    }
  }, [idType]);

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
      const targetScreen = isWalkIn ? "AllVisitors" : "Dashboard";
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: targetScreen }],
        }),
      );
    });
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedEmployeeSearch(employeeSearchQuery);
    }, 350);
    return () => clearTimeout(handle);
  }, [employeeSearchQuery]);

  const employees = usersData?.data || [];
  const filteredEmployees = employees.filter((employee) => {
    const searchLower = employeeSearchQuery.toLowerCase();
    return (
      employee.name?.toLowerCase().includes(searchLower) ||
      false ||
      employee.department?.toLowerCase().includes(searchLower) ||
      false
    );
  });

  const handleEmployeeSelect = (employee: UserDto) => {
    setHostEmployee(employee.name || "");
    setSelectedEmployeeId(employee.id);
    setShowEmployeePicker(false);
    setEmployeeSearchQuery("");
    setDebouncedEmployeeSearch("");
    if (errors.hostEmployee) {
      setErrors({ ...errors, hostEmployee: "" });
    }
  };

  const handleCloseEmployeePicker = () => {
    setShowEmployeePicker(false);
    setEmployeeSearchQuery("");
    setDebouncedEmployeeSearch("");
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const digitsOnly = normalizePhoneNumber(phone);
    // Valid international phone: 7-15 digits (E.164 standard)
    // Saudi: 12 digits (966 + 9), US: 11 digits (1 + 10), etc.
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  };

  const handlePhoneChange = (fullNumber: string) => {
    setPhone(fullNumber);
    if (errors.phone) {
      setErrors({ ...errors, phone: "" });
    }
  };

  // Display formatter for picker values - uses server timezone from API
  const formatPickerDate = (date: Date): string => {
    // Check if today using server timezone comparison
    const todayStr = formatDateForDisplay(new Date(), isRTL);
    const dateStr = formatDateForDisplay(date, isRTL);
    if (todayStr === dateStr) {
      return t("time.today");
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
      setErrors({ ...errors, visitDate: "" });
    }
  };

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time);
    if (errors.visitTime) {
      setErrors({ ...errors, visitTime: "" });
    }
  };

  const handleEndTimeSelect = (time: Date) => {
    setSelectedEndTime(time);
    if (errors.endTime) {
      setErrors({ ...errors, endTime: "" });
    }
  };

  const calculateDuration = (): string => {
    // Normalize both times to the same reference date to only compare time-of-day
    const referenceDate = new Date(2000, 0, 1); // Use a fixed reference date
    const startNormalized = new Date(referenceDate);
    startNormalized.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    const endNormalized = new Date(referenceDate);
    endNormalized.setHours(selectedEndTime.getHours(), selectedEndTime.getMinutes(), 0, 0);
    
    const diffMs = endNormalized.getTime() - startNormalized.getTime();

    if (diffMs <= 0) return "--";

    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) {
      return `${toLocalNumerals(String(minutes))} ${t("time.min")}`;
    } else if (minutes === 0) {
      return `${toLocalNumerals(String(hours))} ${hours === 1 ? t("time.hour") : t("time.hours")}`;
    } else {
      return `${toLocalNumerals(String(hours))}${t("time.hourShort")} ${toLocalNumerals(String(minutes))}${t("time.minShort")}`;
    }
  };

  const getDurationString = (): string => {
    // Normalize both times to the same reference date to only compare time-of-day
    const referenceDate = new Date(2000, 0, 1); // Use a fixed reference date
    const startNormalized = new Date(referenceDate);
    startNormalized.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    const endNormalized = new Date(referenceDate);
    endNormalized.setHours(selectedEndTime.getHours(), selectedEndTime.getMinutes(), 0, 0);
    
    const diffMs = endNormalized.getTime() - startNormalized.getTime();

    if (diffMs <= 0) return "";

    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) {
      return `${toLocalNumerals(String(minutes))} ${t("time.minutes")}`;
    } else if (minutes === 0) {
      return `${toLocalNumerals(String(hours))} ${hours === 1 ? t("time.hour") : t("time.hours")}`;
    } else {
      return `${toLocalNumerals(String(hours))} ${hours === 1 ? t("time.hour") : t("time.hours")} ${toLocalNumerals(String(minutes))} ${t("time.minutes")}`;
    }
  };

  const isTimeInPast = (_date: Date, time: Date): boolean => {
    // Treat the picked h:mm as a Riyadh wall-clock time and compare it
    // against the current Riyadh hour:minute — never device-local clock.
    const pickedMins = time.getHours() * 60 + time.getMinutes();
    const { hours: rh, minutes: rm } = getServerDateParts(new Date(), 'Asia/Riyadh');
    return pickedMins < rh * 60 + rm;
  };

  const isEndTimeBeforeStartTime = (): boolean => {
    // Normalize both times to the same reference date to only compare time-of-day
    const referenceDate = new Date(2000, 0, 1);
    const startNormalized = new Date(referenceDate);
    startNormalized.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    const endNormalized = new Date(referenceDate);
    endNormalized.setHours(selectedEndTime.getHours(), selectedEndTime.getMinutes(), 0, 0);
    
    return endNormalized.getTime() <= startNormalized.getTime();
  };

  const validateForm = (): { isValid: boolean; errorFields: string[] } => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = t("errors.fullNameRequired");
    }

    if (email.trim() && !validateEmail(email)) {
      newErrors.email = t("errors.invalidEmail");
    }

    if (!phone.trim()) {
      newErrors.phone = t("errors.phoneRequired");
    } else if (!validatePhone(phone)) {
      newErrors.phone = t("errors.invalidPhone");
    }

    if (!isWalkIn && isDuplicateCheckError) {
      newErrors.duplicateCheck = t("errors.duplicateCheckFailed");
    } else if (!isWalkIn && isCheckingDuplicate) {
      // Duplicate check still in flight — button is disabled but guard here too
      // so a programmatic submit cannot bypass the loading state.
      newErrors.duplicateCheck = t("errors.duplicateCheckLoading");
    }

    if (isEmployeeListStillLoading(isWalkIn === true, isLoadingUsers)) {
      // Employee list is still loading — button is disabled but guard here too
      // so a programmatic submit cannot bypass the loading state.
      newErrors.hostEmployee = t("errors.hostEmployeeLoading");
    } else if ((asReceptionist || isWalkIn) && !hostEmployee.trim()) {
      newErrors.hostEmployee = t("form.fieldRequired");
    }

    if (!purposeValue) {
      newErrors.purpose = t("form.fieldRequired");
    }

    // Walk-in requires ID number with type-specific validation
    if (isWalkIn) {
      const trimmedId = idNumber.trim();
      if (!trimmedId) {
        newErrors.idNumber = t("form.fieldRequired");
      } else {
        switch (idType) {
          case 'national_id':
          case 'driver_license':
            if (!/^\d{10}$/.test(trimmedId)) {
              newErrors.idNumber = t("errors.invalidNationalId");
            }
            break;
          case 'iqama':
            if (!/^\d{1,10}$/.test(trimmedId)) {
              newErrors.idNumber = t("errors.invalidIqama");
            }
            break;
          case 'passport':
            if (!/^[a-zA-Z0-9]{6,12}$/.test(trimmedId)) {
              newErrors.idNumber = t("errors.invalidPassport");
            }
            break;
        }
      }
    }

    // Skip date/time validation for walk-in registrations
    if (!isWalkIn) {
      // Compare against the Riyadh business date — not the device-local clock.
      const todayRiyadh = getBusinessDateKey(new Date(), 'Asia/Riyadh');
      const selectedRiyadh = getBusinessDateKey(selectedDate, 'Asia/Riyadh');

      if (selectedRiyadh < todayRiyadh) {
        newErrors.visitDate = t("errors.pastDateNotAllowed");
      }

      if (
        selectedRiyadh === todayRiyadh &&
        isTimeInPast(selectedDate, selectedTime)
      ) {
        newErrors.visitTime = t("errors.pastTimeNotAllowed");
      }

      if (isEndTimeBeforeStartTime()) {
        newErrors.endTime = t("errors.endTimeBeforeStartTime");
      }

      if (isRoomAvailabilityStillLoading({
        isWalkIn: false, // already inside if (!isWalkIn)
        needsMeetingRoom,
        roomAvailabilityParamsFired: roomAvailabilityParams !== null,
        hasCheckedAvailability,
      })) {
        // Rooms are still loading — button is disabled but guard here too so
        // a programmatic submit cannot bypass the loading state.
        newErrors.roomAvailability = t("errors.meetingRoomLoading");
      } else if (needsMeetingRoom && isRoomsError) {
        newErrors.roomAvailability = t("errors.meetingRoomCheckFailed");
      } else if (needsMeetingRoom && hasCheckedAvailability) {
        if (!isRoomAvailable || availableRooms.length === 0) {
          newErrors.roomAvailability = t("errors.noRoomsAvailable");
        } else if (!selectedRoomId) {
          newErrors.roomAvailability = t("errors.meetingRoomRequired");
        }
      }
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errorFields: Object.keys(newErrors),
    };
  };

  const handleSubmit = async () => {
    const { isValid } = validateForm();
    if (!isValid) {
      return;
    }

    if (!user?.id) {
      Alert.alert(t("errors.error"), t("errors.notAuthenticated"), [
        { text: t("common.ok") },
      ]);
      return;
    }

    setIsSubmitting(true);

    try {
      // Duplicate invitation prevention (skip for walk-ins)
      if (!isWalkIn && duplicateCheckData) {
        const activeStatuses = ['pending', 'pending_approval', 'approved', 'visitor_accepted', 'expected', 'checked_in'];

        // Convert "HH:MM" or "HH:MM:SS" to minutes since midnight
        const toMinutes = (t: string): number => {
          const parts = t.split(':').map(Number);
          return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
        };

        const newStart = toMinutes(formatTimeForQuery(selectedTime));
        const newEnd = toMinutes(formatTimeForQuery(selectedEndTime));

        const timesOverlap = (existingStart: string, existingEnd?: string | null): boolean => {
          const eStart = toMinutes(existingStart);
          // If backend doesn't return endTime yet, fall back to eStart + 60 min
          const eEnd = existingEnd ? toMinutes(existingEnd) : eStart + 60;
          return eStart < newEnd && newStart < eEnd;
        };

        const matchingVisits = duplicateCheckData.data.filter((visit) =>
          activeStatuses.includes(visit.status) &&
          timesOverlap(visit.visitTime, visit.endTime)
        );

        if (matchingVisits.length > 0) {
          const sameEmployeeVisits = matchingVisits.filter(
            (v) => Boolean(user?.name) && v.employeeName === user?.name
          );

          if (sameEmployeeVisits.length > 0) {
            // Rule 1: Same employee + same guest + same day
            setIsSubmitting(false);
            Alert.alert(
              t("errors.duplicateInviteTitle"),
              t("errors.duplicateInviteSameEmployee"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("common.edit"),
                  onPress: () => {
                    const existingVisit = sameEmployeeVisits[0];
                    navigation.navigate("RequestDetails", {
                      requestId: existingVisit.id,
                    });
                  },
                },
              ]
            );
            return;
          }

          // Rule 2: Different employee + same guest + same day
          setIsSubmitting(false);
          Alert.alert(
            t("errors.duplicateInviteTitle"),
            t("errors.duplicateInviteDifferentEmployee"),
            [{ text: t("common.ok") }]
          );
          return;
        }
      }

      // Handle walk-in registration
      if (isWalkIn) {
        const walkInPayload: WalkInRegistrationDto = {
          visitorName: fullName.trim(),
          visitorEmail: email.trim() || undefined,
          visitorCompany: company.trim() || undefined,
          visitorPhone: phone.trim() || undefined,
          hostId: selectedEmployeeId,
          hostName: hostEmployee,
          visitType: purposeValue,
          purpose: purposeValue,
          idType: idType,
          idNumber: idNumber.trim(),
        };

        console.log(
          "[VisitorRequestForm] Submitting walk-in registration:",
          JSON.stringify(walkInPayload, null, 2),
        );

        const result = await walkInMutation.mutateAsync(walkInPayload);

        console.log(
          "[VisitorRequestForm] Walk-in registered successfully:",
          result,
        );

        const message = t("reception.walkInRegistered").replace(
          "{name}",
          fullName,
        );
        setSuccessMessage(message);
        setShowSuccessModal(true);
        return;
      }

      // Handle regular visit request - include email channel only when an address is provided
      const communicationChannels: (
        | "email"
        | "sms"
        | "whatsapp"
        | "qr_code"
      )[] = ["qr_code"];
      if (sendEmail && email.trim()) communicationChannels.push("email");
      if (sendSMS) communicationChannels.push("sms");
      if (sendWhatsApp) communicationChannels.push("whatsapp");

      // Calculate human-readable duration using timezone utility
      // Normalize both times to the same reference date to only compare time-of-day
      // (selectedTime and selectedEndTime may have different date parts from picker initialization)
      const referenceDate = new Date(selectedDate);
      const startNormalized = new Date(referenceDate);
      startNormalized.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      const endNormalized = new Date(referenceDate);
      endNormalized.setHours(selectedEndTime.getHours(), selectedEndTime.getMinutes(), 0, 0);
      const duration = calculateServerDuration(startNormalized, endNormalized);

      const payload: CreateVisitPayload = {
        visitor: {
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: normalizePhoneNumber(phone),
          company: company.trim() || undefined,
        },
        visitDate: formatDate(selectedDate),
        visitTime: formatTimeForApi(selectedTime),
        endTime: formatTimeForApi(selectedEndTime),
        duration: duration,
        purpose: purposeValue,
        communicationChannels,
        needsMeetingRoom: asReceptionist ? false : needsMeetingRoom,
        meetingRoomId: (!asReceptionist && needsMeetingRoom && selectedRoomId) ? selectedRoomId : undefined,
        needsBuffet: asReceptionist ? false : needsBuffet,
        parkingDecision: asReceptionist ? undefined : parkingDecision,
      };

      console.log(
        "[VisitorRequestForm] Submitting request with payload:",
        JSON.stringify(payload, null, 2),
      );

      const result = await createVisitMutation.mutateAsync(payload);

      console.log(
        "[VisitorRequestForm] Request submitted successfully:",
        result,
      );

      // Use the API response to decide the message — the backend is the
      // source of truth for whether the visit was actually auto-approved.
      // Do NOT use `asManager` here: a manager-role user can still have
      // requests that require approval from a senior manager.
      const isAutoApproved = result.approval?.autoApproved === true;
      const message = isAutoApproved
        ? t("notifications.requestAutoApproved").replace("{name}", fullName)
        : t("notifications.requestSubmitted").replace("{name}", fullName);

      setSuccessMessage(message);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("[VisitorRequestForm] Submit error:", error);
      console.error(
        "[VisitorRequestForm] Error type:",
        error?.constructor?.name,
      );
      console.error("[VisitorRequestForm] Error code:", error?.code);
      console.error("[VisitorRequestForm] Error message:", error?.message);

      let errorMessage = t("errors.submitFailed");

      if (error?.code === "NETWORK_ERROR") {
        errorMessage =
          t("errors.networkError") ||
          "Network error. Please check your connection and try again.";
      } else if (error?.code === "TIMEOUT") {
        errorMessage =
          t("errors.timeoutError") || "Request timed out. Please try again.";
      } else if (error?.code === "UNAUTHORIZED") {
        errorMessage =
          t("errors.sessionExpired") || "Session expired. Please login again.";
      } else if (error?.code === "SERVER_ERROR") {
        errorMessage =
          t("errors.serverError") || "Server error. Please try again later.";
      } else if (error?.code === "VALIDATION_ERROR") {
        // Map API field-level errors (errors array) to inline form state
        const apiFieldErrors: Array<{ field: string; message: string }> | undefined =
          (error as any)?.details?.errors;

        if (Array.isArray(apiFieldErrors) && apiFieldErrors.length > 0) {
          const API_TO_STATE: Record<string, string> = {
            'visitor.fullName': 'fullName',
            'visitor.email': 'email',
            'visitor.phone': 'phone',
            'visitor.company': 'company',
            'visitDate': 'visitDate',
            'visitTime': 'visitTime',
            'endTime': 'endTime',
            'purpose': 'purpose',
            'communicationChannels': 'communicationChannels',
            'parkingDecision': 'parkingDecision',
            'meetingRoomId': 'roomAvailability',
            'buffetPreferences.mealType': 'mealType',
            'buffetPreferences.guestCount': 'guestCount',
          };

          const stateErrors: { [key: string]: string } = {};
          for (const { field, message } of apiFieldErrors) {
            const stateKey = API_TO_STATE[field] ?? field;
            stateErrors[stateKey] = message;
          }
          setErrors((prev) => ({ ...prev, ...stateErrors }));
          showError(t("errors.fixHighlightedFields") || "Please fix the highlighted fields");
          setIsSubmitting(false);
          return;
        }

        // No field errors array — business-logic rejection; show the top-level message
        errorMessage = error?.message || t("errors.validationError");
      } else if (
        error?.status === 409 ||
        error?.status === 422 ||
        (error?.message &&
          (error.message.toLowerCase().includes("room") ||
            error.message.toLowerCase().includes("no longer available")))
      ) {
        errorMessage = t("errors.meetingRoomConflict");
        setSelectedRoomId(null);
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert(t("errors.error"), errorMessage, [{ text: t("common.ok") }]);
    } finally {
      console.log(
        "[VisitorRequestForm] Submit complete, resetting isSubmitting",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ScreenKeyboardAwareScrollView contentContainerStyle={scrollContentStyle}>

        <ThemedView
          style={[styles.section, { backgroundColor: theme.surface }]}
        >
          <ThemedText style={[Typography.subtitle]}>
            {t("visitor.visitorInformation")}
          </ThemedText>
          <Spacer height={Spacing.lg} />

          <ThemedText
            style={[
              Typography.label,
              {
                color: theme.textSecondary,
                // 
              },
            ]}
          >
            {t("form.fullName").toUpperCase()} *
          </ThemedText>
          <Spacer height={Spacing.xs} />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: errors.fullName ? theme.error : theme.border,
                color: theme.text,
                fontFamily: getInputFontFamily(fullName, isRTL),
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              },
            ]}
            placeholder={t("form.fullNamePlaceholder")}
            placeholderTextColor={theme.textSecondary}
            value={fullName}
            scrollEnabled={false}
            onChangeText={(text) => {
              setFullName(text);
              if (errors.fullName) {
                setErrors({ ...errors, fullName: "" });
              }
            }}
          />
          {errors.fullName ? (
            <>
              <Spacer height={Spacing.xs} />
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.error,
                    //textAlign: isRTL ? "right" : "left"
                  },
                ]}
              >
                {errors.fullName}
              </ThemedText>
            </>
          ) : null}

          <Spacer height={Spacing.lg} />

          <ThemedText
            style={[
              Typography.label,
              {
                color: theme.textSecondary,
                //   
              },
            ]}
          >
            {t("form.email").toUpperCase()}
          </ThemedText>
          <Spacer height={Spacing.xs} />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: errors.email ? theme.error : theme.border,
                color: theme.text,
                fontFamily: getInputFontFamily(email, isRTL),
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              },
            ]}
            placeholder={t("form.emailPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            value={email}
            scrollEnabled={false}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) {
                setErrors({ ...errors, email: "" });
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? (
            <>
              <Spacer height={Spacing.xs} />
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.error,
                    //  textAlign: isRTL ? "right" : "left"
                  },
                ]}
              >
                {errors.email}
              </ThemedText>
            </>
          ) : null}

          <Spacer height={Spacing.lg} />

          <PhoneInputWithCountry
            value={phone}
            onChangeText={handlePhoneChange}
            label={t("form.phone")}
            required
            error={errors.phone}
            testID="input-phone"
          />
          {errors.duplicateCheck || isDuplicateCheckError ? (
            <DirectionalRow style={{ marginTop: Spacing.xs, alignItems: 'center' }} gap={Spacing.sm}>
              <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
                {errors.duplicateCheck || t("errors.duplicateCheckFailed")}
              </ThemedText>
              {isDuplicateCheckError ? (
                <Pressable
                  onPress={() => {
                    setErrors((previous) => ({ ...previous, duplicateCheck: "" }));
                    void refetchDuplicateCheck();
                  }}
                  hitSlop={8}
                >
                  <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                    {t("common.retry")}
                  </ThemedText>
                </Pressable>
              ) : null}
            </DirectionalRow>
          ) : null}

          <Spacer height={Spacing.lg} />

          <ThemedText
            style={[
              Typography.label,
              {
                color: theme.textSecondary,
                // 
              },
            ]}
          >
            {t("form.company").toUpperCase()}
          </ThemedText>
          <Spacer height={Spacing.xs} />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: getInputFontFamily(company, isRTL),
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              },
            ]}
            placeholder={t("form.companyPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            value={company}
            scrollEnabled={false}
            onChangeText={(text) => {
              setCompany(text);
              if (errors.company) setErrors({ ...errors, company: "" });
            }}
          />
          {errors.company ? (
            <>
              <Spacer height={Spacing.xs} />
              <ThemedText style={[Typography.caption, { color: theme.error }]}>
                {errors.company}
              </ThemedText>
            </>
          ) : null}

          {asReceptionist || isWalkIn ? (
            <>
              <Spacer height={Spacing.lg} />
              <ThemedText
                style={[
                  Typography.label,
                  {
                    color: theme.textSecondary,
                    // 
                  },
                ]}
              >
                {t("reception.hostName").toUpperCase()} *
              </ThemedText>
              <Spacer height={Spacing.xs} />
              <Pressable
                style={[
                  styles.iconInputButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: errors.hostEmployee
                      ? theme.error
                      : theme.border,
                    flexDirection: getFlexDirection(isRTL),
                  },
                ]}
                onPress={() => setShowEmployeePicker(true)}
              >
                <DDIcon name="user" size={20} variant="muted" />
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      color: hostEmployee ? theme.text : theme.textSecondary,
                      flex: 1,
                      marginStart: Spacing.md,
                      marginEnd: Spacing.md,
                      //  
                    },
                  ]}
                >
                  {hostEmployee || t("visitor.selectHost")}
                </ThemedText>
                <DDIcon name="chevron-down" size={20} variant="muted" />
              </Pressable>
              {errors.hostEmployee ? (
                <>
                  <Spacer height={Spacing.xs} />
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: theme.error,
                        // 
                      },
                    ]}
                  >
                    {errors.hostEmployee}
                  </ThemedText>
                </>
              ) : null}
            </>
          ) : null}

          {isWalkIn ? (
            <>
              <Spacer height={Spacing.lg} />
              <ThemedText
                style={[
                  Typography.label,
                  {
                    color: theme.textSecondary,
                    //   
                  },
                ]}
              >
                {t("visitor.idType").toUpperCase()} *
              </ThemedText>
              <Spacer height={Spacing.xs} />
              <Pressable
                style={[
                  styles.iconInputButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    flexDirection: getFlexDirection(isRTL),
                  },
                ]}
                onPress={() => setShowIdTypePicker(true)}
              >
                <DDIcon name="credit-card" size={20} variant="muted" />
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      color: theme.text,
                      flex: 1,
                      marginStart: Spacing.md,
                      marginEnd: Spacing.md,
                      //   
                    },
                  ]}
                >
                  {t(
                    ID_TYPE_OPTIONS.find((opt) => opt.value === idType)
                      ?.labelKey || "visitor.nationalId",
                  )}
                </ThemedText>
                <DDIcon name="chevron-down" size={20} variant="muted" />
              </Pressable>

              <Spacer height={Spacing.lg} />
              <ThemedText
                style={[
                  Typography.label,
                  {
                    color: theme.textSecondary,
                    //   
                  },
                ]}
              >
                {t("visitor.idNumber").toUpperCase()} *
              </ThemedText>
              <Spacer height={Spacing.xs} />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: errors.idNumber ? theme.error : theme.border,
                    color: theme.text,
                    fontFamily: getInputFontFamily(idNumber, isRTL),
                    textAlign: isRTL ? "right" : "left",
                    writingDirection: isRTL ? "rtl" : "ltr",
                  },
                ]}
                placeholder={t("visitor.idNumberPlaceholder")}
                placeholderTextColor={theme.textSecondary}
                value={idNumber}
                scrollEnabled={false}
                onChangeText={(text) => {
                  let filtered = text;
                  if (idType === 'national_id' || idType === 'iqama' || idType === 'driver_license') {
                    filtered = text.replace(/\D/g, '').slice(0, 10);
                  } else if (idType === 'passport') {
                    filtered = text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
                  }
                  setIdNumber(filtered);
                  if (errors.idNumber) {
                    setErrors({ ...errors, idNumber: "" });
                  }
                }}
                keyboardType={idType === 'passport' ? 'default' : 'number-pad'}
                maxLength={idType === 'passport' ? 12 : 10}
                autoCapitalize="characters"
              />
              {errors.idNumber ? (
                <>
                  <Spacer height={Spacing.xs} />
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: theme.error,
                        //   
                      },
                    ]}
                  >
                    {errors.idNumber}
                  </ThemedText>
                </>
              ) : null}
            </>
          ) : null}

          {/* Type of Visit / Purpose — shown for all roles */}
          <Spacer height={Spacing.lg} />
          <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
            {t("form.purpose").toUpperCase()} *
          </ThemedText>
          <Spacer height={Spacing.xs} />
          <Pressable
            style={[
              styles.iconInputButton,
              {
                backgroundColor: theme.background,
                borderColor: errors.purpose ? theme.error : theme.border,
              },
            ]}
            onPress={() => {
              setShowPurposePicker(true);
              if (errors.purpose) setErrors({ ...errors, purpose: '' });
            }}
          >
            <DirectionalRow style={{ flex: 1, alignItems: "center", gap: Spacing.md }}>
              <DDIcon name="clipboard" size={20} variant="muted" />
              <ThemedText
                style={[
                  Typography.body,
                  {
                    color: purposeValue ? theme.text : theme.textSecondary,
                    flex: 1,
                  },
                ]}
              >
                {purposeValue && PURPOSE_VALUE_TO_KEY[purposeValue] ? t(PURPOSE_VALUE_TO_KEY[purposeValue] as any) : t("visitor.selectPurpose")}
              </ThemedText>
              <DDIcon name="chevron-down" size={20} variant="muted" />
            </DirectionalRow>
          </Pressable>
          {errors.purpose ? (
            <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs }]}>
              {errors.purpose}
            </ThemedText>
          ) : null}
        </ThemedView>

        {!isWalkIn ? (
          <>
            <Spacer height={Spacing.lg} />

            <ThemedView
              style={[styles.section, { backgroundColor: theme.surface }]}
            >
              <DirectionalRow
                style={[styles.sectionHeader, { gap: Spacing.md }]}
              >
                <View
                  style={[
                    styles.sectionIconContainer,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <DDIcon name="calendar" size={20} variant="primary" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      Typography.subtitle,
                      //   { textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {t("visitor.visitSchedule")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: theme.textSecondary,
                        //  
                      },
                    ]}
                  >
                    {t("visitor.whenVisitorComing")}
                  </ThemedText>
                </View>
              </DirectionalRow>

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.label,
                  {
                    color: theme.textSecondary,
                    //  
                  },
                ]}
              >
                {t("form.visitDate")} *
              </ThemedText>
              <Spacer height={Spacing.xs} />
              <Pressable
                style={[
                  styles.iconInputButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: errors.visitDate ? theme.error : theme.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <DirectionalRow
                  style={{ flex: 1, alignItems: "center", gap: Spacing.md }}
                >
                  <DDIcon name="calendar" size={20} variant="primary" />
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: theme.text,
                        flex: 1,
                        lineHeight: 26,
                      },
                    ]}
                  >
                    {formatPickerDate(selectedDate)}
                  </ThemedText>
                  <DDIcon name="chevron-down" size={20} variant="muted" />
                </DirectionalRow>
              </Pressable>
              {errors.visitDate ? (
                <>
                  <Spacer height={Spacing.xs} />
                  <ThemedText
                    style={[Typography.caption, { color: theme.error }]}
                  >
                    {errors.visitDate}
                  </ThemedText>
                </>
              ) : null}

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.label,
                  {
                    color: theme.textSecondary,
                    //  
                  },
                ]}
              >
                {t("form.visitTime")} *
              </ThemedText>
              <Spacer height={Spacing.xs} />
              <Pressable
                style={[
                  styles.iconInputButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: errors.visitTime ? theme.error : theme.border,
                  },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <DirectionalRow
                  style={{ flex: 1, alignItems: "center", gap: Spacing.md }}
                >
                  <DDIcon name="clock" size={20} variant="primary" />
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: theme.text,
                        flex: 1,
                        lineHeight: 26,
                      },
                    ]}
                  >
                    {formatPickerTime(selectedTime)}
                  </ThemedText>
                  <DDIcon name="chevron-down" size={20} variant="muted" />
                </DirectionalRow>
              </Pressable>
              {errors.visitTime ? (
                <>
                  <Spacer height={Spacing.xs} />
                  <ThemedText
                    style={[Typography.caption, { color: theme.error }]}
                  >
                    {errors.visitTime}
                  </ThemedText>
                </>
              ) : null}

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.label,
                  {
                    color: theme.textSecondary,
                    //   
                  },
                ]}
              >
                {t("form.endTime")} *
              </ThemedText>
              <Spacer height={Spacing.xs} />
              <Pressable
                style={[
                  styles.iconInputButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: errors.endTime ? theme.error : theme.border,
                  },
                ]}
                onPress={() => setShowEndTimePicker(true)}
              >
                <DirectionalRow
                  style={{ flex: 1, alignItems: "center", gap: Spacing.md }}
                >
                  <DDIcon name="clock" size={20} variant="primary" />
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: theme.text,
                        flex: 1,
                        lineHeight: 26,
                      },
                    ]}
                  >
                    {formatPickerTime(selectedEndTime)}
                  </ThemedText>
                  <DDIcon name="chevron-down" size={20} variant="muted" />
                </DirectionalRow>
              </Pressable>
              {errors.endTime ? (
                <>
                  <Spacer height={Spacing.xs} />
                  <ThemedText
                    style={[Typography.caption, { color: theme.error }]}
                  >
                    {errors.endTime}
                  </ThemedText>
                </>
              ) : null}

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.label,
                  {
                    color: theme.textSecondary,
                    //   
                  },
                ]}
              >
                {t("form.duration").toUpperCase()}
              </ThemedText>
              <Spacer height={Spacing.xs} />
              <View
                style={[
                  styles.iconInputButton,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: 0.7,
                  },
                ]}
              >
                <DirectionalRow
                  style={{ flex: 1, alignItems: "center", gap: Spacing.md }}
                >
                  <DDIcon name="clock" size={20} variant="muted" />
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: isEndTimeBeforeStartTime()
                          ? theme.error
                          : theme.textSecondary,
                        flex: 1,
                        lineHeight: 26,
                      },
                    ]}
                  >
                    {calculateDuration()}
                  </ThemedText>
                  <DDIcon name="lock" size={16} variant="muted" />
                </DirectionalRow>
              </View>
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, marginTop: Spacing.xs },
                ]}
              >
                {t("form.calculatedAutomatically")}
              </ThemedText>
            </ThemedView>
          </>
        ) : null}

        {!asReceptionist && !isWalkIn ? (
          <>
            <Spacer height={Spacing.lg} />

            <ThemedText
              style={[
                Typography.subtitle,
                {
                  marginBottom: Spacing.sm,
                  //  
                },
              ]}
            >
              {t("services.optionalServices")}
            </ThemedText>

            <View style={{ maxWidth: 224, alignSelf: Platform.OS === 'web' ? 'flex-start' : 'center', width: "100%" }}>
              <DirectionalRow style={{ gap: Spacing.sm }}>
                <SelectableCard
                  onPress={() => {
                    const newValue = !needsMeetingRoom;
                    setNeedsMeetingRoom(newValue);
                    if (!newValue) {
                      setNeedsBuffet(false);
                      setSelectedRoomId(null);
                    }
                  }}
                  selected={needsMeetingRoom}
                  showCheckbox
                  style={{ flex: 1, padding: Spacing.sm }}
                >
                  <View
                    style={[
                      styles.compactServiceIcon,
                      { backgroundColor: applyOpacity(theme.cardIcon, "15") },
                    ]}
                  >
                    <DDIcon name="users" size={16} color={theme.cardIcon} />
                  </View>
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        fontWeight: "600",
                        marginTop: Spacing.xs,
                        textAlign: "center",
                        color: theme.text,
                        fontSize: 9,
                      },
                    ]}
                  >
                    {t("services.meetingRoom")}
                  </ThemedText>
                </SelectableCard>

                <SelectableCard
                  onPress={() => {
                    const newValue = !needsBuffet;
                    setNeedsBuffet(newValue);
                    if (newValue) {
                      setNeedsMeetingRoom(true);
                    }
                  }}
                  selected={needsBuffet}
                  showCheckbox
                  style={{ flex: 1, padding: Spacing.sm }}
                >
                  <View
                    style={[
                      styles.compactServiceIcon,
                      { backgroundColor: applyOpacity(theme.cardIcon, "15") },
                    ]}
                  >
                    <DDIcon name="cloche" size={16} color={theme.cardIcon} />
                  </View>
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        fontWeight: "600",
                        marginTop: Spacing.xs,
                        textAlign: "center",
                        color: theme.text,
                        fontSize: 9,
                      },
                    ]}
                  >
                    {t("buffet.buffet")}
                  </ThemedText>
                </SelectableCard>
              </DirectionalRow>
            </View>

            {needsMeetingRoom ? (
              <View style={{ marginTop: Spacing.md }}>
                {isLoadingRooms || isFetchingRooms ? (
                  <DirectionalRow
                    style={[
                      styles.availabilityBadge,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        justifyContent: "flex-start",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[Typography.bodySmall, { color: theme.textSecondary }]}
                    >
                      {t("common.checkingAvailability")}...
                    </ThemedText>
                  </DirectionalRow>
                ) : hasCheckedAvailability && availableRooms.length === 0 ? (
                  <DirectionalRow
                    style={[
                      styles.availabilityBadge,
                      {
                        backgroundColor: applyOpacity(theme.error, "15"),
                        borderColor: theme.error,
                        justifyContent: "flex-start",
                      },
                    ]}
                    gap={Spacing.xs}
                  >
                    <DDIcon name="alert-circle" size={16} color={theme.error} />
                    <ThemedText
                      style={[
                        Typography.bodySmall,
                        { color: theme.error, fontWeight: "500", flex: 1, flexWrap: "wrap" },
                      ]}
                    >
                      {t("errors.noRoomsAvailableForTime")}
                    </ThemedText>
                  </DirectionalRow>
                ) : hasCheckedAvailability && availableRooms.length > 0 ? (
                  <View style={{ gap: Spacing.sm }}>
                    <ThemedText
                      style={[
                        Typography.label,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t("form.selectMeetingRoom").toUpperCase()}
                    </ThemedText>
                    {availableRooms.map((room) => {
                      const isSelected = selectedRoomId === room.id;
                      return (
                        <Pressable
                          key={room.id}
                          onPress={() => {
                            setSelectedRoomId(room.id);
                            if (errors.roomAvailability) {
                              setErrors({ ...errors, roomAvailability: "" });
                            }
                          }}
                          style={[
                            styles.roomCard,
                            {
                              backgroundColor: isSelected
                                ? applyOpacity(theme.primary, "10")
                                : theme.background,
                              borderColor: isSelected ? theme.primary : theme.border,
                              borderWidth: isSelected ? 2 : 1,
                            },
                          ]}
                        >
                          <DirectionalRow alignItems="stretch" style={{ gap: Spacing.sm }}>
                            <View
                              style={[
                                styles.roomCardIcon,
                                {
                                  backgroundColor: isSelected
                                    ? applyOpacity(theme.primary, "15")
                                    : applyOpacity(theme.cardIcon, "10"),
                                },
                              ]}
                            >
                              <DDIcon
                                name="users"
                                size={20}
                                color={isSelected ? theme.primary : theme.cardIcon}
                              />
                            </View>
                            <View style={{ flex: 1, gap: 3 }}>
                              <ThemedText
                                style={[
                                  Typography.bodySmall,
                                  {
                                    fontWeight: "700",
                                    color: isSelected ? theme.primary : theme.text,
                                  },
                                ]}
                              >
                                {room.name}
                              </ThemedText>
                              {(room.floor || room.building) ? (
                                <ThemedText
                                  style={[Typography.caption, { color: theme.textSecondary }]}
                                >
                                  {[room.floor, room.building].filter(Boolean).join(" · ")}
                                </ThemedText>
                              ) : null}
                              <DirectionalRow gap={Spacing.xs} style={{ flexWrap: "wrap" }}>
                                <DirectionalRow gap={4} alignItems="center">
                                  <DDIcon name="users" size={12} color={theme.textSecondary} />
                                  <ThemedText
                                    style={[Typography.caption, { color: theme.textSecondary }]}
                                  >
                                    {room.capacity}
                                  </ThemedText>
                                </DirectionalRow>
                                {room.features && room.features.length > 0 &&
                                  room.features.slice(0, 3).map((f) => (
                                    <View
                                      key={f}
                                      style={[
                                        styles.featureTag,
                                        { backgroundColor: applyOpacity(theme.primary, "10") },
                                      ]}
                                    >
                                      <ThemedText
                                        style={[
                                          Typography.caption,
                                          { color: theme.primary, fontSize: 10 },
                                        ]}
                                      >
                                        {f.replace(/_/g, " ")}
                                      </ThemedText>
                                    </View>
                                  ))}
                              </DirectionalRow>
                            </View>
                            <View
                              style={[
                                styles.squareCheckbox,
                                {
                                  borderColor: isSelected ? theme.primary : theme.border,
                                  backgroundColor: isSelected ? theme.primary : 'transparent',
                                },
                              ]}
                            >
                              {isSelected ? (
                                <DDIcon name="check" size={10} color={theme.buttonText} />
                              ) : null}
                            </View>
                          </DirectionalRow>
                        </Pressable>
                      );
                    })}
                    {errors.roomAvailability || isRoomsError ? (
                      <DirectionalRow style={{ marginTop: 2, alignItems: 'center' }} gap={Spacing.sm}>
                        <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
                          {errors.roomAvailability || t("errors.meetingRoomCheckFailed")}
                        </ThemedText>
                        {isRoomsError ? (
                          <Pressable
                            onPress={() => {
                              setErrors((previous) => ({ ...previous, roomAvailability: "" }));
                              void refetchRooms();
                            }}
                            hitSlop={8}
                          >
                            <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                              {t("common.retry")}
                            </ThemedText>
                          </Pressable>
                        ) : null}
                      </DirectionalRow>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            <Spacer height={Spacing.lg} />
          </>
        ) : null}

        {/* Parking Section — hidden for walk-in registration (visitor already on-site) */}
        {!isWalkIn ? (
          <>
            <ThemedText
              style={[Typography.subtitle, { marginBottom: Spacing.sm }]}
            >
              {t("invitation.parkingDecision")}
            </ThemedText>

            {(
              [
                { value: 'required' as ParkingDecision, icon: 'map-pin', label: t('invitation.requiredParking'), desc: t('invitation.requiredParkingDesc') },
                { value: 'not_required' as ParkingDecision, icon: 'slash', label: t('invitation.notRequiredParking'), desc: t('invitation.notRequiredParkingDesc') },
                { value: 'visitor_decides' as ParkingDecision, icon: 'help-circle', label: t('invitation.visitorDecides'), desc: t('invitation.visitorDecidesDesc') },
              ] as const
            ).map(({ value, icon, label, desc }) => {
              const isSelected = parkingDecision === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setParkingDecision(value);
                    if (errors.parkingDecision) setErrors({ ...errors, parkingDecision: "" });
                  }}
                  style={[
                    styles.parkingOptionRow,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                    <View
                      style={[
                        styles.parkingOptionIcon,
                        { backgroundColor: isSelected ? applyOpacity(theme.primary, '15') : applyOpacity(theme.cardIcon, '10') },
                      ]}
                    >
                      <DDIcon name={icon} size={18} color={isSelected ? theme.primary : theme.cardIcon} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[Typography.bodySmall, { fontWeight: '600', color: isSelected ? theme.primary : theme.text }]}>
                        {label}
                      </ThemedText>
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                        {desc}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.squareCheckbox,
                        {
                          borderColor: isSelected ? theme.primary : theme.border,
                          backgroundColor: isSelected ? theme.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected ? <DDIcon name="check" size={10} color={theme.buttonText} /> : null}
                    </View>
                  </DirectionalRow>
                </Pressable>
              );
            })}

            {errors.parkingDecision ? (
              <>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: theme.error }]}>
                  {errors.parkingDecision}
                </ThemedText>
              </>
            ) : null}

            <Spacer height={Spacing.lg} />
          </>
        ) : null}

        <ThemedText
          style={[
            Typography.subtitle,
            {
              marginBottom: Spacing.sm,
            },
          ]}
        >
          {t("invitation.communicationChannels")}
        </ThemedText>

        <DirectionalRow style={styles.channelsContainer} gap={Spacing.sm}>
          <Pressable
            style={[
              styles.channelChip,
              {
                backgroundColor: theme.surface,
                borderColor: sendWhatsApp ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setSendWhatsApp(!sendWhatsApp)}
          >
            <DirectionalRow style={{ alignItems: "center", gap: Spacing.xs }}>
              <View
                style={[
                  styles.channelChipIcon,
                  { backgroundColor: theme.success + "15" },
                ]}
              >
                <DDIcon name="message-circle" size={16} variant="success" />
              </View>
              <ThemedText style={[Typography.bodySmall, { fontWeight: "500", lineHeight: 24 }]}>
                {t("services.whatsapp")}
              </ThemedText>
              <View
                style={[
                  styles.squareCheckbox,
                  {
                    borderColor: sendWhatsApp ? theme.primary : theme.border,
                    backgroundColor: sendWhatsApp ? theme.primary : 'transparent',
                  },
                ]}
              >
                {sendWhatsApp ? (
                  <DDIcon name="check" size={10} color={theme.buttonText} />
                ) : null}
              </View>
            </DirectionalRow>
          </Pressable>

          <Pressable
            style={[
              styles.channelChip,
              {
                backgroundColor: theme.surface,
                borderColor: sendSMS ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setSendSMS(!sendSMS)}
          >
            <DirectionalRow style={{ alignItems: "center", gap: Spacing.xs }}>
              <View
                style={[
                  styles.channelChipIcon,
                  { backgroundColor: theme.info + "15" },
                ]}
              >
                <DDIcon name="smartphone" size={16} color={theme.info} />
              </View>
              <ThemedText style={[Typography.bodySmall, { fontWeight: "500", lineHeight: 24 }]}>
                {t("services.sms")}
              </ThemedText>
              <View
                style={[
                  styles.squareCheckbox,
                  {
                    borderColor: sendSMS ? theme.primary : theme.border,
                    backgroundColor: sendSMS ? theme.primary : 'transparent',
                  },
                ]}
              >
                {sendSMS ? (
                  <DDIcon name="check" size={10} color={theme.buttonText} />
                ) : null}
              </View>
            </DirectionalRow>
          </Pressable>

          <Pressable
            style={[
              styles.channelChip,
              {
                backgroundColor: theme.surface,
                borderColor: sendEmail ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setSendEmail(!sendEmail)}
          >
            <DirectionalRow style={{ alignItems: "center", gap: Spacing.xs }}>
              <View
                style={[
                  styles.channelChipIcon,
                  { backgroundColor: theme.warning + "15" },
                ]}
              >
                <DDIcon name="mail" size={16} color={theme.warning} />
              </View>
              <ThemedText style={[Typography.bodySmall, { fontWeight: "500", lineHeight: 24 }]}>
                {t("services.email")}
              </ThemedText>
              <View
                style={[
                  styles.squareCheckbox,
                  {
                    borderColor: sendEmail ? theme.primary : theme.border,
                    backgroundColor: sendEmail ? theme.primary : 'transparent',
                  },
                ]}
              >
                {sendEmail ? (
                  <DDIcon name="check" size={10} color={theme.buttonText} />
                ) : null}
              </View>
            </DirectionalRow>
          </Pressable>
        </DirectionalRow>

        {errors.communicationChannels ? (
          <>
            <Spacer height={Spacing.xs} />
            <ThemedText style={[Typography.caption, { color: theme.error }]}>
              {errors.communicationChannels}
            </ThemedText>
          </>
        ) : null}

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
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.iosModalContainer}
          >
            <Pressable
              style={[
                styles.iosModalBackdrop,
                createModalOverlayStyle(theme, "50"),
              ]}
              onPress={handleCloseEmployeePicker}
            />
            <View
              style={[
                styles.employeePickerModal,
                { backgroundColor: theme.surface },
              ]}
            >
              <View
                style={[
                  styles.iosPickerHeader,
                  { borderBottomColor: theme.border },
                ]}
              >
                <View style={{ width: 60 }} />
                <ThemedText style={[Typography.subtitle]}>
                  {t("reception.hostName")}
                </ThemedText>
                <Pressable
                  onPress={handleCloseEmployeePicker}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 60, alignItems: "flex-end" }}
                >
                  <DDIcon name="x" size={24} variant="muted" />
                </Pressable>
              </View>
              <DirectionalRow
                style={[
                  styles.searchContainer,
                  {
                    backgroundColor: theme.background,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <DDIcon name="search" size={20} variant="muted" />
                <TextInput
                  style={[styles.searchInput, { color: theme.text, fontFamily: getInputFontFamily(employeeSearchQuery, isRTL), textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', textAlignVertical: 'center' as const }]}
                  placeholder={t("common.search")}
                  placeholderTextColor={theme.textSecondary}
                  value={employeeSearchQuery}
                  onChangeText={setEmployeeSearchQuery}
                  scrollEnabled={false}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {employeeSearchQuery.length > 0 ? (
                  <Pressable onPress={() => setEmployeeSearchQuery("")}>
                    <DDIcon name="x-circle" size={20} variant="muted" />
                  </Pressable>
                ) : null}
              </DirectionalRow>
              <ScrollView
                style={{ maxHeight: 300 }}
                keyboardShouldPersistTaps="handled"
              >
                {isLoadingUsers ? (
                  <View style={styles.noResultsContainer}>
                    <ActivityIndicator color={theme.primary} />
                    <Spacer height={Spacing.md} />
                    <ThemedText
                      style={[
                        Typography.body,
                        { color: theme.textSecondary, textAlign: "center" },
                      ]}
                    >
                      {t("common.loading")}
                    </ThemedText>
                  </View>
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <Pressable
                      key={employee.id}
                      style={[
                        styles.employeeOption,
                        {
                          borderBottomColor: theme.border,
                          flexDirection: getFlexDirection(isRTL),
                          gap: Spacing.md,
                        },
                        selectedEmployeeId === employee.id && {
                          backgroundColor: applyOpacity(theme.primary, "10"),
                        },
                      ]}
                      onPress={() => handleEmployeeSelect(employee)}
                    >
                      <View
                        style={[
                          styles.employeeAvatar,
                          {
                            backgroundColor: applyOpacity(theme.primary, "15"),
                          },
                        ]}
                      >
                        <ThemedText
                          style={{
                            fontSize: 14,
                            lineHeight: 26,
                            color: theme.primary,
                            fontWeight: "600",
                          }}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.5}
                        >
                          {getInitials(employee.name)}
                        </ThemedText>
                      </View>
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <ThemedText
                          style={[
                            Typography.body,
                            {
                              fontWeight: "500",
                            },
                          ]}
                        >
                          {employee.name || "Unknown"}
                        </ThemedText>
                        <ThemedText
                          style={[
                            Typography.caption,
                            {
                              color: theme.textSecondary,
                            },
                          ]}
                        >
                          {employee.department || ""}
                        </ThemedText>
                      </View>
                      {selectedEmployeeId === employee.id ? (
                        <View style={{ marginStart: Spacing.sm }}>
                          <DDIcon
                            name="check-circle"
                            size={24}
                            variant="primary"
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <DDIcon name="users" size={40} variant="muted" />
                    <Spacer height={Spacing.md} />
                    <ThemedText
                      style={[
                        Typography.body,
                        { color: theme.textSecondary, textAlign: "center" },
                      ]}
                    >
                      {t("common.noResults")} "{employeeSearchQuery}"
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={showIdTypePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIdTypePicker(false)}
        >
          <View style={styles.iosModalContainer}>
            <Pressable
              style={[
                styles.iosModalBackdrop,
                createModalOverlayStyle(theme, "50"),
              ]}
              onPress={() => setShowIdTypePicker(false)}
            />
            <View
              style={[
                styles.employeePickerModal,
                { backgroundColor: theme.surface },
              ]}
            >
              <View
                style={[
                  styles.iosPickerHeader,
                  { borderBottomColor: theme.border },
                ]}
              >
                <View style={{ width: 60 }} />
                <ThemedText style={[Typography.subtitle]}>
                  {t("visitor.idType")}
                </ThemedText>
                <Pressable
                  onPress={() => setShowIdTypePicker(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 60, alignItems: "flex-end" }}
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
                      idType === option.value && {
                        backgroundColor: applyOpacity(theme.primary, "10"),
                      },
                    ]}
                    onPress={() => {
                      setIdType(option.value);
                      setShowIdTypePicker(false);
                    }}
                  >
                    <View
                      style={[
                        styles.employeeAvatar,
                        { backgroundColor: applyOpacity(theme.primary, "15") },
                      ]}
                    >
                      <DDIcon
                        name="credit-card"
                        size={20}
                        color={theme.primary}
                      />
                    </View>
                    <View style={{ flex: 1, marginStart: Spacing.md }}>
                      <ThemedText
                        style={[Typography.body, { fontWeight: "500" }]}
                      >
                        {t(option.labelKey)}
                      </ThemedText>
                    </View>
                    {idType === option.value ? (
                      <View style={{ marginStart: Spacing.sm }}>
                        <DDIcon name="check-circle" size={24} variant="primary" />
                      </View>
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
              style={[
                styles.iosModalBackdrop,
                createModalOverlayStyle(theme, "50"),
              ]}
              onPress={() => setShowPurposePicker(false)}
            />
            <View
              style={[
                styles.employeePickerModal,
                { backgroundColor: theme.surface },
              ]}
            >
              <View
                style={[
                  styles.iosPickerHeader,
                  { borderBottomColor: theme.border },
                ]}
              >
                <View style={{ width: 60 }} />
                <ThemedText style={[Typography.subtitle]}>
                  {t("visitor.selectVisitType")}
                </ThemedText>
                <Pressable
                  onPress={() => setShowPurposePicker(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 60, alignItems: "flex-end" }}
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
                      purposeValue === option.value && {
                        backgroundColor: applyOpacity(theme.primary, "10"),
                      },
                    ]}
                    onPress={() => {
                      setPurposeValue(option.value);
                      setShowPurposePicker(false);
                    }}
                  >
                    <View
                      style={[
                        styles.employeeAvatar,
                        { backgroundColor: applyOpacity(theme.primary, "15") },
                      ]}
                    >
                      <DDIcon
                        name="clipboard"
                        size={20}
                        color={theme.primary}
                      />
                    </View>
                    <View style={{ flex: 1, marginStart: Spacing.md }}>
                      <ThemedText
                        style={[Typography.body, { fontWeight: "500" }]}
                      >
                        {t(option.labelKey as any)}
                      </ThemedText>
                    </View>
                    {purposeValue === option.value ? (
                      <View style={{ marginStart: Spacing.sm }}>
                        <DDIcon name="check-circle" size={24} variant="primary" />
                      </View>
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
            style={[
              styles.successModalOverlay,
              createModalOverlayStyle(theme, "50"),
            ]}
            onPress={handleCloseSuccessModal}
          >
            <Animated.View
              style={[
                styles.successModalContent,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  backgroundColor: theme.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.successIconContainer,
                  { backgroundColor: applyOpacity(theme.success, "15") },
                ]}
              >
                <DDIcon name="check-circle" size={48} variant="success" />
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.subtitle,
                  {
                    fontSize: 18,
                    fontWeight: "700",
                    color: theme.text,
                    textAlign: "center",
                  },
                ]}
              >
                {t("common.success")}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <ThemedText
                style={[
                  Typography.body,
                  {
                    color: theme.textSecondary,
                    textAlign: "center",
                    lineHeight: 22,
                  },
                ]}
              >
                {successMessage}
              </ThemedText>

              <Spacer height={Spacing.xl} />

              <Pressable
                style={[
                  styles.successButton,
                  { backgroundColor: theme.success },
                ]}
                onPress={handleCloseSuccessModal}
              >
                <ThemedText
                  style={[
                    Typography.body,
                    { color: theme.buttonText, fontWeight: "600" },
                  ]}
                >
                  {t("common.close")}
                </ThemedText>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      </ScreenKeyboardAwareScrollView>

      {/* Sticky Footer for Action Buttons */}
      <View
        style={[
          styles.stickyFooter,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <DirectionalRow style={styles.buttonRow}>
          <LoadingButton
            onPress={() => navigation.goBack()}
            variant="outline"
            size="large"
            style={styles.actionButton}
          >
            {t("actions.cancel")}
          </LoadingButton>

          <View style={{ width: Spacing.md }} />

          <LoadingButton
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={
              isSubmitting ||
              // Employee list or rooms still loading — wait before submitting
              isSubmitDisabledByLoading({
                isWalkIn: isWalkIn === true,
                isLoadingUsers,
                needsMeetingRoom,
                isLoadingRooms,
                isFetchingRooms,
              }) ||
              // A failed room check is not proof that a room is available.
              (needsMeetingRoom && isRoomsError) ||
              // Duplicate check still in flight — wait before submitting
              (!isWalkIn && isCheckingDuplicate) ||
              // Rooms loaded and available but none selected yet
              (needsMeetingRoom && hasCheckedAvailability && isRoomAvailable && !selectedRoomId)
            }
            variant="primary"
            size="large"
            style={styles.actionButton}
          >
            {t("actions.submitRequest")}
          </LoadingButton>
        </DirectionalRow>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  container: {},
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.latinRegular,
    fontSize: 16,
    textAlignVertical: "center" as const,
  },
  pickerButton: {
    minHeight: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconInputButton: {
    minHeight: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeader: {
    alignItems: "center",
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 100,
    fontFamily: FontFamily.latinRegular,
    fontSize: 16,
    lineHeight: 28,
  },
  row: {
    alignItems: "center",
  },
  compactServiceIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.lg,
  },
  serviceHeader: {
    alignItems: "center",
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonRow: {
    flexDirection: "row",
  },
  actionButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopStartRadius: BorderRadius.lg,
    borderTopEndRadius: BorderRadius.lg,
    maxHeight: "80%",
  },
  pickerModalContent: {
    borderRadius: BorderRadius.lg,
    margin: Spacing.xl,
    maxWidth: 400,
    alignSelf: "center",
  },
  modalHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  durationOption: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  iosModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  iosModalBackdrop: {
    position: "absolute",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  webModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  webPickerModal: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  webPickerHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  channelsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  channelChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  channelChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  chipCheckmark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginStart: Spacing.xs,
  },
  squareCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginStart: 4,
  },
  channelRow: {
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  channelContent: {
    alignItems: "center",
    flex: 1,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  successModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  successModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: Spacing.xl * 1.5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  successButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityBadge: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  parkingOptionRow: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  parkingOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  roomCardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  roomCardCheck: {
    alignSelf: "center",
    display: "none",
  },
  featureTag: {
    borderRadius: BorderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  employeePickerModal: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
});
