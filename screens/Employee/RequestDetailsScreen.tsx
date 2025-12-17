import React, { useState, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, Modal, Platform, Alert, TextInput, Switch, Animated, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { TimePicker } from "@/components/TimePicker";
import { DDIcon, type IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ParkingSection } from "@/components/ParkingSection";
import { VisitTimeline, useVisitTimelineSteps, type VisitTimelineData } from "@/components/VisitTimeline";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVisitDetailsQuery, useCancelVisitMutation, useUpdateVisitMutation, useHostApproveVisitMutation, useHostRejectVisitMutation } from "@/hooks/queries/useApprovalQueries";
import { VisitorRequest, ParkingType, ParkingLocation } from "@/types/vms.types";
import type { VisitDetailsDto } from "@/types/api.types";
import { getStatusConfig as getStatusStyle, applyOpacity, createModalOverlayStyle } from "@/utils/statusStyles";
import { RequestDetailsScreenProps } from "@/types/employeeNavigation.types";

const isEmptyObject = (obj: any): boolean => {
  return obj && typeof obj === 'object' && Object.keys(obj).length === 0;
};

const hasValidData = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  if (Object.keys(obj).length === 0) return false;
  return true;
};

const mapVisitDetailsToVisitorRequest = (visit: VisitDetailsDto): VisitorRequest & { parkingPending?: boolean; meetingRoomPending?: boolean } => {
  const statusMap: Record<string, VisitorRequest['status']> = {
    pending: 'pending_approval',
    pending_approval: 'pending_approval',
    approved: 'approved',
    accepted: 'visitor_accepted',
    rejected: 'visitor_rejected',
    expired: 'auto_cancelled',
    checked_in: 'checked_in',
    checked_out: 'completed',
    cancelled: 'cancelled',
    completed: 'completed',
    awaiting_visitor: 'visitor_pending',
    visitor_pending: 'visitor_pending',
    visitor_accepted: 'visitor_accepted',
    visitor_rejected: 'visitor_rejected',
  };

  return {
    id: visit.id,
    employeeId: visit.employeeId,
    employeeName: visit.employeeName,
    employeeDepartment: visit.employeeDepartment,
    visitor: {
      id: visit.visitor.id,
      fullName: visit.visitor.fullName,
      email: visit.visitor.email || '',
      phone: visit.visitor.phone || '',
      company: visit.visitor.company,
    },
    visitDate: visit.visitDate,
    visitTime: visit.visitTime,
    duration: visit.duration || '1 hour',
    endTime: visit.endTime,
    purpose: visit.purpose || '',
    status: statusMap[visit.status] || 'pending_approval',
    communicationChannels: (visit.communicationChannels || ['email']) as ('email' | 'sms' | 'whatsapp' | 'qr_code')[],
    parkingType: (visit.parkingType || 'none') as ParkingType,
    parkingSlot: (hasValidData(visit.parkingAllocation) || hasValidData(visit.parkingSlot)) ? {
      id: visit.parkingAllocation?.id || visit.parkingSlot?.id || '',
      location: ((visit.parkingAllocation?.location || visit.parkingSlot?.location)?.toLowerCase() === 'skbc_basement' ? 'skbc_basement' : (visit.parkingAllocation?.location || visit.parkingSlot?.location || '')) as ParkingLocation,
      slotNumber: visit.parkingAllocation?.spotNumber || visit.parkingSlot?.slotNumber || '',
      floor: visit.parkingAllocation?.floor || visit.parkingSlot?.floor,
      status: visit.parkingAllocation?.status,
    } : undefined,
    parkingPending: (isEmptyObject(visit.parkingAllocation) || isEmptyObject(visit.parkingSlot)) && !hasValidData(visit.parkingAllocation) && !hasValidData(visit.parkingSlot),
    meetingRoom: (hasValidData(visit.meetingBooking) || hasValidData(visit.meetingRoom)) ? {
      id: visit.meetingBooking?.roomId || visit.meetingRoom?.id || '',
      name: visit.meetingBooking?.roomName || visit.meetingRoom?.name || '',
      capacity: visit.meetingRoom?.capacity || 10,
      floor: visit.meetingRoom?.floor || '1',
      timeSlot: visit.meetingBooking ? `${visit.meetingBooking.startTime} - ${visit.meetingBooking.endTime}` : (visit.meetingRoom?.timeSlot || ''),
    } : undefined,
    meetingRoomPending: (isEmptyObject(visit.meetingBooking) || isEmptyObject(visit.meetingRoom)) && !hasValidData(visit.meetingBooking) && !hasValidData(visit.meetingRoom),
    buffet: visit.buffet ? {
      id: visit.buffet.id,
      mealType: visit.buffet.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snacks',
      location: visit.buffet.location,
    } : undefined,
    valet: undefined,
    qrCode: visit.qrCode,
    approval: {
      requiresApproval: visit.approval.requiresApproval,
      autoApproved: visit.approval.autoApproved,
      managerId: visit.approval.managerId,
      managerName: visit.approval.managerName,
      approvedAt: visit.approval.approvedAt,
      rejectedAt: visit.approval.rejectedAt,
      rejectionReason: visit.approval.rejectionReason,
      managerComment: visit.approval.managerComment,
    },
    reminders: visit.reminders ? {
      firstReminderAt: visit.reminders.firstReminderAt,
      secondReminderAt: visit.reminders.secondReminderAt,
      autoCancelAt: visit.reminders.autoCancelAt,
      firstReminderSent: visit.reminders.firstReminderSent,
      secondReminderSent: visit.reminders.secondReminderSent,
    } : {},
    createdAt: visit.createdAt,
    updatedAt: visit.updatedAt,
    isWalkIn: visit.isWalkIn ?? false,
  };
};

const calculateDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours <= 0.5) return '30 minutes';
  if (diffHours <= 1) return '1 hour';
  if (diffHours <= 1.5) return '1.5 hours';
  if (diffHours <= 2) return '2 hours';
  if (diffHours <= 3) return '3 hours';
  return '4 hours';
};

const getDurationOptions = (t: (key: string) => string) => [
  { label: t('durations.thirtyMinutes'), value: '30 minutes' },
  { label: t('durations.oneHour'), value: '1 hour' },
  { label: t('durations.oneAndHalfHours'), value: '1.5 hours' },
  { label: t('durations.twoHours'), value: '2 hours' },
  { label: t('durations.threeHours'), value: '3 hours' },
  { label: t('durations.fourHours'), value: '4 hours' },
];

export default function RequestDetailsScreen({ navigation, route }: RequestDetailsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate, formatDateShort, formatTime, formatDateTime: fmtDateTime, toLocalNumerals, parseISODuration, parseTimeString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { requestId } = route.params;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHostRejectModal, setShowHostRejectModal] = useState(false);
  const [hostRejectReason, setHostRejectReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState(new Date());
  const [rescheduleDuration, setRescheduleDuration] = useState<string | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  
  const [editPurpose, setEditPurpose] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [editTime, setEditTime] = useState(new Date());
  const [editDuration, setEditDuration] = useState<string>('1 hour');
  const [editRequiresParking, setEditRequiresParking] = useState(false);
  const [editRequiresMeetingRoom, setEditRequiresMeetingRoom] = useState(false);
  const [editRequiresBuffet, setEditRequiresBuffet] = useState(false);
  const [editRequiresValet, setEditRequiresValet] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [showEditDurationPicker, setShowEditDurationPicker] = useState(false);

  // Success modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const { data: visitData, isLoading, isFetching, error, refetch } = useVisitDetailsQuery(requestId);
  const cancelMutation = useCancelVisitMutation();
  const updateMutation = useUpdateVisitMutation();
  const hostApproveMutation = useHostApproveVisitMutation();
  const hostRejectMutation = useHostRejectVisitMutation();

  const request = useMemo(() => {
    if (!visitData) return null;
    return mapVisitDetailsToVisitorRequest(visitData);
  }, [visitData]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const isProcessing = cancelMutation.isPending || updateMutation.isPending || hostApproveMutation.isPending || hostRejectMutation.isPending;

  // Success modal animation effect
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
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [showSuccessModal, fadeAnim, scaleAnim]);

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };

  if (isLoading || isFetching) {
    return (
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <SkeletonCard />
        <Spacer height={Spacing.lg} />
        <SkeletonCard />
        <Spacer height={Spacing.lg} />
        <SkeletonCard />
      </ScreenScrollView>
    );
  }

  if (error || !request) {
    return (
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <ThemedText style={[Typography.title]}>{t('errors.requestNotFound')}</ThemedText>
        <Spacer height={Spacing.lg} />
        <Pressable
          onPress={() => refetch()}
          style={[{ backgroundColor: theme.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' }]}
        >
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>{t('actions.retry')}</ThemedText>
        </Pressable>
      </ScreenScrollView>
    );
  }

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    return fmtDateTime(date);
  };

  const handleCancelRequest = () => {
    cancelMutation.mutate(requestId, {
      onSuccess: () => {
        setShowCancelModal(false);
        navigation.goBack();
      },
      onError: (error) => {
        Alert.alert(t('errors.somethingWentWrong'), error.message);
      },
    });
  };

  const handleHostApprove = () => {
    hostApproveMutation.mutate(
      { id: requestId },
      {
        onSuccess: () => {
          setSuccessMessage(t('notifications.walkInApproved'));
          setShowSuccessModal(true);
        },
        onError: (error) => {
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  };

  const handleHostReject = () => {
    if (!hostRejectReason.trim()) {
      Alert.alert(t('errors.validation'), t('errors.reasonRequired'));
      return;
    }
    hostRejectMutation.mutate(
      { id: requestId, payload: { reason: hostRejectReason.trim() } },
      {
        onSuccess: () => {
          setShowHostRejectModal(false);
          setHostRejectReason('');
          setSuccessMessage(t('notifications.walkInRejected'));
          setShowSuccessModal(true);
        },
        onError: (error) => {
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  };

  const openRescheduleModal = () => {
    const now = new Date();
    setRescheduleDate(now);
    setRescheduleTime(now);
    setRescheduleDuration(request?.duration);
    setShowRescheduleModal(true);
  };

  const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForApi = (time: Date): string => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minuteStr = String(minutes).padStart(2, '0');
    return `${hour12}:${minuteStr} ${period}`;
  };

  const formatDisplayDate = (date: Date): string => {
    return formatDate(date);
  };

  const formatDisplayTime = (time: Date): string => {
    return formatTime(time);
  };

  const handleRescheduleConfirm = () => {
    if (!request) return;
    
    const payload = {
      visitDate: formatDateForApi(rescheduleDate),
      visitTime: formatTimeForApi(rescheduleTime),
      duration: rescheduleDuration || request.duration,
    };

    console.log('[RequestDetails] Submitting reschedule with payload:', JSON.stringify(payload, null, 2));

    updateMutation.mutate(
      { id: requestId, data: payload },
      {
        onSuccess: () => {
          console.log('[RequestDetails] Reschedule successful');
          setShowRescheduleModal(false);
          setSuccessMessage(t('notifications.visitUpdated'));
          setShowSuccessModal(true);
        },
        onError: (error) => {
          console.log('[RequestDetails] Reschedule failed:', error.message);
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  };
  
  const getDurationHours = (duration: string): number => {
    switch (duration) {
      case '30 minutes': return 0.5;
      case '1 hour': return 1;
      case '1.5 hours': return 1.5;
      case '2 hours': return 2;
      case '3 hours': return 3;
      case '4 hours': return 4;
      default: return 1;
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setRescheduleDate(selectedDate);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setRescheduleTime(selectedTime);
    }
  };

  const handleRescheduleDateSelect = (date: Date) => {
    setRescheduleDate(date);
  };

  const handleRescheduleTimeSelect = (time: Date) => {
    setRescheduleTime(time);
  };

  const openEditModal = () => {
    if (!visitData) return;
    
    setEditPurpose(visitData.purpose || '');
    setEditDate(visitData.visitDate ? new Date(visitData.visitDate) : new Date());
    setEditTime(parseTimeString(visitData.visitTime || '', visitData.visitDate));
    setEditDuration(parseISODuration(request?.duration || '1 hour'));
    setEditRequiresParking(visitData.parkingType !== 'none');
    setEditRequiresMeetingRoom(!!visitData.meetingRoom);
    setEditRequiresBuffet(!!visitData.buffet);
    setEditRequiresValet(visitData.parkingType === 'valet');
    setEditNotes('');
    setShowEditModal(true);
  };

  const handleEditDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEditDatePicker(false);
    }
    if (selectedDate) {
      setEditDate(selectedDate);
    }
  };

  const handleEditTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEditTimePicker(false);
    }
    if (selectedTime) {
      setEditTime(selectedTime);
    }
  };

  const handleEditConfirm = () => {
    const payload = {
      visitDate: formatDateForApi(editDate),
      visitTime: formatTimeForApi(editTime),
      duration: editDuration,
      purpose: editPurpose,
      requiresParking: editRequiresParking,
      requiresMeetingRoom: editRequiresMeetingRoom,
      requiresBuffet: editRequiresBuffet,
      requiresValet: editRequiresValet,
      notes: editNotes || undefined,
    };

    console.log('[RequestDetails] Submitting edit with payload:', JSON.stringify(payload, null, 2));

    updateMutation.mutate(
      { id: requestId, data: payload },
      {
        onSuccess: () => {
          console.log('[RequestDetails] Edit successful');
          setShowEditModal(false);
          setSuccessMessage(t('notifications.visitUpdated'));
          setShowSuccessModal(true);
        },
        onError: (error) => {
          console.log('[RequestDetails] Edit failed:', error.message);
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  };

  const statusConfig = getStatusStyle(theme, request.status, t);

  const timelineData: VisitTimelineData = {
    createdAt: request.createdAt,
    status: request.status,
    approval: {
      requiresApproval: request.approval.requiresApproval,
      autoApproved: request.approval.autoApproved ?? false,
      approvedAt: request.approval.approvedAt,
      rejectedAt: request.approval.rejectedAt,
    },
    acceptedAt: request.acceptedAt,
    checkedInAt: request.checkedInAt,
    completedAt: request.completedAt,
    cancelledAt: request.cancelledAt,
  };
  const timelineSteps = useVisitTimelineSteps(timelineData);

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      {/* Header with Status Badge */}
      <View style={styles.headerRow}>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
          {t('visitor.requestId')}: {request.id}
        </ThemedText>
        <View style={[styles.statusBadgeNew, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 }]}>
          <ThemedText style={[Typography.caption, { color: statusConfig.text, fontWeight: '600', fontSize: 10 }]}>
            {statusConfig.label}
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing.xl} />

      {/* Rejection/Decline Reason */}
      {request.approval.rejectedAt && request.approval.rejectionReason ? (
        <>
          <ThemedView style={[styles.alertBox, { backgroundColor: applyOpacity(theme.error, '10'), borderStartColor: theme.error, borderStartWidth: 4 }]}>
            <DDIcon name="alert-circle" size={16} variant="danger" />
            <ThemedText style={[Typography.bodySmall, { marginStart: Spacing.sm, flex: 1, color: theme.error }]}>
              {t('form.reason')}: {request.approval.rejectionReason}
            </ThemedText>
          </ThemedView>
          <Spacer height={Spacing.lg} />
        </>
      ) : null}
      {request.visitorDecision && !request.visitorDecision.accepted && request.visitorDecision.reason ? (
        <>
          <ThemedView style={[styles.alertBox, { backgroundColor: applyOpacity(theme.warning, '10'), borderStartColor: theme.warning, borderStartWidth: 4 }]}>
            <DDIcon name="info" size={16} variant="warning" />
            <ThemedText style={[Typography.bodySmall, { marginStart: Spacing.sm, flex: 1, color: theme.warning }]}>
              {t('visitor.visitorReason')}: {request.visitorDecision.reason}
            </ThemedText>
          </ThemedView>
          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      {/* Manager Comment - Only show for employee requests (not auto-approved) */}
      {request.approval.managerComment && (request.approval.approvedAt || request.approval.rejectedAt) && !request.approval.autoApproved ? (
        <>
          <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
            <View style={styles.managerCommentHeader}>
              <DDIcon 
                name={request.approval.approvedAt ? "check-circle" : "x-circle"} 
                size={16} 
                color={request.approval.approvedAt ? theme.secondary : theme.error} 
              />
              <ThemedText style={[Typography.subtitle, { marginStart: Spacing.sm, fontSize: 14, fontWeight: '600', color: theme.text }]}>
                {t('visitor.managerComment')}
              </ThemedText>
            </View>
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20 }]}>
              {request.approval.managerComment}
            </ThemedText>
            {request.approval.managerName && (
              <>
                <Spacer height={Spacing.md} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <DDIcon name="user" size={12} variant="muted" />
                  <ThemedText style={[Typography.caption, { marginStart: 6, color: theme.textSecondary, fontSize: 11 }]}>
                    {request.approval.managerName}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { marginHorizontal: 6, color: theme.border }]}>
                    •
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                    {formatDateTimeLocal(request.approval.approvedAt || request.approval.rejectedAt || '')}
                  </ThemedText>
                </View>
              </>
            )}
          </ThemedView>
          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary, fontSize: 32, fontWeight: '700' }]}>
              {request.visitor.fullName.split(' ').map(n => n[0]).join('')}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />

          <ThemedText style={[Typography.title, { fontWeight: '600', fontSize: 22, color: theme.text }]}>
            {request.visitor.fullName}
          </ThemedText>
          <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginTop: 4 }]}>
            {request.visitor.company}
          </ThemedText>
        </View>

        <Spacer height={Spacing.xl} />
        
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        <Spacer height={Spacing.lg} />

        <View style={styles.infoRowNew}>
          <DDIcon name="mail" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { marginStart: Spacing.md, color: theme.textSecondary, flex: 1, fontSize: 14 }]}>
            {request.visitor.email}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.infoRowNew}>
          <DDIcon name="phone" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { marginStart: Spacing.md, color: theme.textSecondary, fontSize: 14 }]}>
            {request.visitor.phone}
          </ThemedText>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>{t('visitor.visitDetails')}</ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={styles.detailRowNew}>
          <DDIcon name="calendar" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginStart: Spacing.md, fontSize: 13, minWidth: 90 }]}>
            {t('time.dateAndTime')}
          </ThemedText>
          <ThemedText style={[Typography.body, { fontWeight: '600', color: theme.text, flex: 1, fontSize: 14 }]}>
            {formatDateShort(request.visitDate)} {t('time.at')} {request.visitTime}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={styles.detailRowNew}>
          <DDIcon name="clock" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginStart: Spacing.md, fontSize: 13, minWidth: 90 }]}>
            {t('form.duration')}
          </ThemedText>
          <ThemedText style={[Typography.body, { fontWeight: '600', color: theme.text, flex: 1, fontSize: 14 }]}>
            {parseISODuration(request.duration)}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={styles.detailRowNew}>
          <DDIcon name="briefcase" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginStart: Spacing.md, fontSize: 13, minWidth: 90 }]}>
            {t('form.purpose')}
          </ThemedText>
          <ThemedText style={[Typography.body, { color: theme.text, flex: 1, fontSize: 14 }]}>
            {request.purpose}
          </ThemedText>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>{t('services.additionalServices')}</ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]}>
          <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(request.meetingRoom ? theme.secondary : theme.textSecondary, '15') }]}>
            <DDIcon name="briefcase" size={18} color={request.meetingRoom ? theme.secondary : theme.textSecondary} />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text }]}>
              {t('services.meetingRoom')}
            </ThemedText>
            {request.meetingRoom ? (
              <>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                  {request.meetingRoom.name} - {request.meetingRoom.floor}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                  {request.meetingRoom.timeSlot}
                </ThemedText>
              </>
            ) : (request as any).meetingRoomPending ? (
              <ThemedText style={[Typography.caption, { color: theme.warning, fontSize: 12, marginTop: 2 }]}>
                {t('status.pending')}
              </ThemedText>
            ) : (
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }]}>
                {t('common.notRequested')}
              </ThemedText>
            )}
          </View>
        </View>
        <Spacer height={Spacing.md} />

        <View style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]}>
          <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(request.parkingSlot ? theme.info : theme.textSecondary, '15') }]}>
            <DDIcon name="map-pin" size={18} color={request.parkingSlot ? theme.info : theme.textSecondary} />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text }]}>
              {t('services.parking')}
            </ThemedText>
            {request.parkingSlot ? (
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                {request.parkingSlot.location === 'skbc_basement' || request.parkingSlot.location === 'SKBC_basement' ? 'SKBC Basement' : request.parkingSlot.location} - {t('parking.slotNumber')} {request.parkingSlot.slotNumber}
              </ThemedText>
            ) : (request as any).parkingPending ? (
              <ThemedText style={[Typography.caption, { color: theme.warning, fontSize: 12, marginTop: 2 }]}>
                {t('status.pending')}
              </ThemedText>
            ) : (
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }]}>
                {t('common.notRequested')}
              </ThemedText>
            )}
          </View>
        </View>
        <Spacer height={Spacing.md} />

        <View style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]}>
          <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(request.buffet ? theme.warning : theme.textSecondary, '15') }]}>
            <DDIcon name="coffee" size={18} color={request.buffet ? theme.warning : theme.textSecondary} />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text }]}>
              {t('buffet.buffetService')}
            </ThemedText>
            {request.buffet && request.buffet.mealType ? (
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                {request.buffet.location} - {request.buffet.mealType.charAt(0).toUpperCase() + request.buffet.mealType.slice(1)}
              </ThemedText>
            ) : request.buffet ? (
              <ThemedText style={[Typography.caption, { color: theme.warning, fontSize: 12, marginTop: 2 }]}>
                {t('status.pending')}
              </ThemedText>
            ) : (
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }]}>
                {t('common.notRequested')}
              </ThemedText>
            )}
          </View>
        </View>
      </ThemedView>
      <Spacer height={Spacing.lg} />

      <VisitTimeline steps={timelineSteps} />

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface, alignItems: 'center' }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>{t('invitation.qrCode')}</ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={[styles.qrContainerNew, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
          <View style={[styles.qrPlaceholder, { borderColor: theme.border }]}>
            <DDIcon name="maximize" size={80} color={theme.border} />
          </View>
        </View>

        <Spacer height={Spacing.md} />

        <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: 'center', fontSize: 12 }]}>
          {t('invitation.shareQrCodeDescription')}
        </ThemedText>

        <Spacer height={Spacing.xl} />

        <Pressable
          style={[styles.shareButtonNew, { backgroundColor: theme.primary }]}
        >
          <DDIcon name="share-2" size={18} color={theme.buttonText} />
          <ThemedText style={[Typography.body, { color: theme.buttonText, marginStart: Spacing.sm, fontWeight: '600', fontSize: 14 }]}>
            {t('invitation.shareQrCode')}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <Spacer height={Spacing.xl} />

      {/* Walk-in request: Show Approve/Reject buttons */}
      {request.isWalkIn && request.status === 'pending_approval' ? (
        <>
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={[styles.actionButtonHalf, { backgroundColor: theme.success }]}
              onPress={handleHostApprove}
              disabled={hostApproveMutation.isPending}
            >
              {hostApproveMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <>
                  <DDIcon name="check" size={18} color={theme.buttonText} />
                  <ThemedText style={[Typography.body, { color: theme.buttonText, marginStart: Spacing.sm, fontWeight: '600', fontSize: 14 }]}>
                    {t('actions.approve')}
                  </ThemedText>
                </>
              )}
            </Pressable>
            <Spacer width={Spacing.md} />
            <Pressable
              style={[styles.actionButtonHalf, { borderColor: theme.error, backgroundColor: theme.surface }]}
              onPress={() => setShowHostRejectModal(true)}
              disabled={hostRejectMutation.isPending}
            >
              <DDIcon name="x" size={18} variant="danger" />
              <ThemedText style={[Typography.body, { color: theme.error, marginStart: Spacing.sm, fontWeight: '600', fontSize: 14 }]}>
                {t('actions.reject')}
              </ThemedText>
            </Pressable>
          </View>
          <Spacer height={Spacing.xl} />
        </>
      ) : null}

      {/* Non-walk-in request: Show Edit, Reschedule, Cancel buttons */}
      {!request.isWalkIn && (request.status === 'pending_approval' || request.status === 'approved' || request.status === 'visitor_accepted') ? (
        <>
          <Pressable
            style={[styles.actionButtonFull, { backgroundColor: theme.primary }]}
            onPress={openEditModal}
          >
            <DDIcon name="edit-2" size={18} color={theme.buttonText} />
            <ThemedText style={[Typography.body, { color: theme.buttonText, marginStart: Spacing.sm, fontWeight: '600', fontSize: 14 }]}>
              {t('actions.editRequest')}
            </ThemedText>
          </Pressable>
          <Spacer height={Spacing.md} />
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={[styles.actionButtonHalf, { borderColor: theme.primary, backgroundColor: theme.surface }]}
              onPress={openRescheduleModal}
            >
              <DDIcon name="calendar" size={18} color={theme.primary} />
              <ThemedText style={[Typography.body, { color: theme.primary, marginStart: Spacing.sm, fontWeight: '600', fontSize: 14 }]}>
                {t('actions.reschedule')}
              </ThemedText>
            </Pressable>
            <Spacer width={Spacing.md} />
            <Pressable
              style={[styles.actionButtonHalf, { borderColor: theme.error, backgroundColor: theme.surface }]}
              onPress={() => setShowCancelModal(true)}
            >
              <DDIcon name="x" size={18} variant="danger" />
              <ThemedText style={[Typography.body, { color: theme.error, marginStart: Spacing.sm, fontWeight: '600', fontSize: 14 }]}>
                {t('actions.cancel')}
              </ThemedText>
            </Pressable>
          </View>
          <Spacer height={Spacing.xl} />
        </>
      ) : null}

      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, '50')]}
            onPress={() => setShowCancelModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text }]}>
                {t('actions.confirmCancel')}
              </ThemedText>
              <Pressable onPress={() => setShowCancelModal(false)}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={20} />

            <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20 }]}>
              {t('actions.cancelConfirmMessage')}
            </ThemedText>

            <Spacer height={24} />

            <View style={styles.modalActions}>
              <LoadingButton
                onPress={() => setShowCancelModal(false)}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              >
                {t('common.goBack')}
              </LoadingButton>

              <Spacer width={12} />

              <LoadingButton
                onPress={handleCancelRequest}
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending}
                variant="danger"
                size="medium"
                loadingText={t('common.loading')}
                style={{ flex: 1 }}
              >
                {t('actions.cancel')}
              </LoadingButton>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHostRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHostRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, '50')]}
            onPress={() => setShowHostRejectModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text }]}>
                {t('actions.rejectWalkIn')}
              </ThemedText>
              <Pressable onPress={() => setShowHostRejectModal(false)}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={20} />

            <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20 }]}>
              {t('actions.rejectWalkInMessage')}
            </ThemedText>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
              {t('form.reason')} *
            </ThemedText>
            <TextInput
              style={[styles.textAreaField, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
              value={hostRejectReason}
              onChangeText={setHostRejectReason}
              placeholder={t('form.enterReason')}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Spacer height={24} />

            <View style={styles.modalActions}>
              <LoadingButton
                onPress={() => {
                  setShowHostRejectModal(false);
                  setHostRejectReason('');
                }}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              >
                {t('common.cancel')}
              </LoadingButton>

              <Spacer width={12} />

              <LoadingButton
                onPress={handleHostReject}
                loading={hostRejectMutation.isPending}
                disabled={hostRejectMutation.isPending || !hostRejectReason.trim()}
                variant="danger"
                size="medium"
                loadingText={t('common.loading')}
                style={{ flex: 1 }}
              >
                {t('actions.reject')}
              </LoadingButton>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRescheduleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, '50')]}
            onPress={() => setShowRescheduleModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text }]}>
                {t('actions.rescheduleVisit')}
              </ThemedText>
              <Pressable onPress={() => setShowRescheduleModal(false)}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14 }]}>
              {t('actions.selectNewDateTime')}
            </ThemedText>

            <Spacer height={Spacing.md} />

            <ThemedView style={[styles.currentScheduleBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11, marginBottom: 4 }]}>
                {t('actions.currentSchedule')}
              </ThemedText>
              <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600', fontSize: 14 }]}>
                {request?.visitDate} {t('time.at')} {request?.visitTime}
              </ThemedText>
            </ThemedView>

            <Spacer height={Spacing.xl} />

            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
              {t('actions.newDate')}
            </ThemedText>
            <Pressable 
              style={[styles.pickerButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <DDIcon name="calendar" size={16} variant="muted" />
              <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14 }]}>
                {formatDisplayDate(rescheduleDate)}
              </ThemedText>
            </Pressable>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
              {t('actions.newTime')}
            </ThemedText>
            <Pressable 
              style={[styles.pickerButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <DDIcon name="clock" size={16} variant="muted" />
              <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14 }]}>
                {formatDisplayTime(rescheduleTime)}
              </ThemedText>
            </Pressable>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
              {t('actions.newDuration')} ({t('form.optional')})
            </ThemedText>
            <Pressable 
              style={[styles.pickerButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              onPress={() => setShowDurationPicker(!showDurationPicker)}
            >
              <DDIcon name="clock" size={16} variant="muted" />
              <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14, flex: 1 }]}>
                {rescheduleDuration || t('form.selectDuration')}
              </ThemedText>
              <DDIcon name={showDurationPicker ? 'chevron-up' : 'chevron-down'} size={16} variant="muted" />
            </Pressable>

            {showDurationPicker && (
              <View style={[styles.durationDropdown, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                {getDurationOptions(t).map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.durationOption,
                      rescheduleDuration === option.value && { backgroundColor: applyOpacity(theme.primary, '10') }
                    ]}
                    onPress={() => {
                      setRescheduleDuration(option.value);
                      setShowDurationPicker(false);
                    }}
                  >
                    <ThemedText style={[Typography.body, { 
                      color: rescheduleDuration === option.value ? theme.primary : theme.text, 
                      fontSize: 14,
                      fontWeight: rescheduleDuration === option.value ? '600' : '400'
                    }]}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}

            <Spacer height={Spacing.xl} />

            <View style={styles.modalActions}>
              <LoadingButton
                onPress={() => setShowRescheduleModal(false)}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              >
                {t('common.cancel')}
              </LoadingButton>

              <Spacer width={12} />

              <LoadingButton
                onPress={handleRescheduleConfirm}
                loading={updateMutation.isPending}
                disabled={updateMutation.isPending}
                variant="primary"
                size="medium"
                loadingText={t('common.saving')}
                style={{ flex: 1 }}
              >
                {t('actions.confirmReschedule')}
              </LoadingButton>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, '50')]}
            onPress={() => setShowEditModal(false)}
          />
          <View style={[styles.editModalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text }]}>
                {t('actions.editRequest')}
              </ThemedText>
              <Pressable onPress={() => setShowEditModal(false)}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={Spacing.lg} />

            <ScrollView style={styles.editModalScroll} showsVerticalScrollIndicator={false}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
                {t('form.purpose')} *
              </ThemedText>
              <TextInput
                style={[styles.textInputField, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editPurpose}
                onChangeText={setEditPurpose}
                placeholder={t('form.enterPurpose')}
                placeholderTextColor={theme.textSecondary}
              />

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
                {t('form.date')}
              </ThemedText>
              <Pressable 
                style={[styles.pickerButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                onPress={() => setShowEditDatePicker(true)}
              >
                <DDIcon name="calendar" size={16} variant="muted" />
                <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14 }]}>
                  {formatDisplayDate(editDate)}
                </ThemedText>
              </Pressable>

              {showEditDatePicker && (
                <DateTimePicker
                  value={editDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEditDateChange}
                  minimumDate={new Date()}
                />
              )}

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
                {t('form.time')}
              </ThemedText>
              <Pressable 
                style={[styles.pickerButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                onPress={() => setShowEditTimePicker(true)}
              >
                <DDIcon name="clock" size={16} variant="muted" />
                <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14 }]}>
                  {formatDisplayTime(editTime)}
                </ThemedText>
              </Pressable>

              {showEditTimePicker && (
                <DateTimePicker
                  value={editTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEditTimeChange}
                />
              )}

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
                {t('form.duration')}
              </ThemedText>
              <Pressable 
                style={[styles.pickerButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                onPress={() => setShowEditDurationPicker(!showEditDurationPicker)}
              >
                <DDIcon name="clock" size={16} variant="muted" />
                <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14, flex: 1 }]}>
                  {editDuration}
                </ThemedText>
                <DDIcon name={showEditDurationPicker ? 'chevron-up' : 'chevron-down'} size={16} variant="muted" />
              </Pressable>

              {showEditDurationPicker && (
                <View style={[styles.durationDropdown, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  {getDurationOptions(t).map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.durationOption,
                        editDuration === option.value && { backgroundColor: applyOpacity(theme.primary, '10') }
                      ]}
                      onPress={() => {
                        setEditDuration(option.value);
                        setShowEditDurationPicker(false);
                      }}
                    >
                      <ThemedText style={[Typography.body, { 
                        color: editDuration === option.value ? theme.primary : theme.text, 
                        fontSize: 14,
                        fontWeight: editDuration === option.value ? '600' : '400'
                      }]}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}

              <Spacer height={Spacing.xl} />

              <ThemedText style={[Typography.subtitle, { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: Spacing.md }]}>
                {t('services.additionalServices')}
              </ThemedText>

              <View style={[styles.serviceToggleRow, { borderColor: theme.border }]}>
                <View style={styles.serviceToggleLabel}>
                  <DDIcon name="map-pin" size={18} variant="muted" />
                  <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14 }]}>
                    {t('services.parking')}
                  </ThemedText>
                </View>
                <Switch
                  value={editRequiresParking}
                  onValueChange={setEditRequiresParking}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={theme.buttonText}
                />
              </View>

              <View style={[styles.serviceToggleRow, { borderColor: theme.border }]}>
                <View style={styles.serviceToggleLabel}>
                  <DDIcon name="home" size={18} variant="muted" />
                  <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14 }]}>
                    {t('services.meetingRoom')}
                  </ThemedText>
                </View>
                <Switch
                  value={editRequiresMeetingRoom}
                  onValueChange={setEditRequiresMeetingRoom}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={theme.buttonText}
                />
              </View>

              <View style={[styles.serviceToggleRow, { borderColor: theme.border }]}>
                <View style={styles.serviceToggleLabel}>
                  <DDIcon name="coffee" size={18} variant="muted" />
                  <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14 }]}>
                    {t('buffet.buffetService')}
                  </ThemedText>
                </View>
                <Switch
                  value={editRequiresBuffet}
                  onValueChange={setEditRequiresBuffet}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={theme.buttonText}
                />
              </View>

              <View style={[styles.serviceToggleRow, { borderColor: theme.border }]}>
                <View style={styles.serviceToggleLabel}>
                  <DDIcon name="truck" size={18} variant="muted" />
                  <ThemedText style={[Typography.body, { marginStart: Spacing.sm, color: theme.text, fontSize: 14 }]}>
                    {t('valet.valetService')}
                  </ThemedText>
                </View>
                <Switch
                  value={editRequiresValet}
                  onValueChange={setEditRequiresValet}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={theme.buttonText}
                />
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginBottom: 8 }]}>
                {t('form.notes')} ({t('form.optional')})
              </ThemedText>
              <TextInput
                style={[styles.textAreaField, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder={t('form.additionalNotes')}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Spacer height={Spacing.xl} />
            </ScrollView>

            <View style={styles.modalActions}>
              <LoadingButton
                onPress={() => setShowEditModal(false)}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              >
                {t('common.cancel')}
              </LoadingButton>

              <Spacer width={12} />

              <LoadingButton
                onPress={handleEditConfirm}
                loading={updateMutation.isPending}
                disabled={updateMutation.isPending}
                variant="primary"
                size="medium"
                loadingText={t('common.saving')}
                style={{ flex: 1 }}
              >
                {t('common.save')}
              </LoadingButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
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
            
            <LoadingButton
              onPress={handleCloseSuccessModal}
              variant="success"
              size="medium"
              fullWidth
            >
              {t('common.close')}
            </LoadingButton>
          </Animated.View>
        </Pressable>
      </Modal>

      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={rescheduleDate}
        onDateSelect={handleRescheduleDateSelect}
        mode="single"
        minimumDate={new Date()}
      />

      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        selectedTime={rescheduleTime}
        onTimeSelect={handleRescheduleTimeSelect}
        minuteInterval={5}
      />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusBadgeNew: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  managerCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  cardNew: {
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarNew: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  serviceItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  timelineItemNew: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIconContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  timelineDotNew: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 20,
    width: 1,
    height: 40,
  },
  timelineLineNew: {
    position: 'absolute',
    top: 32,
    width: 2,
    height: 36,
  },
  qrContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  qrContainerNew: {
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  shareButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 10,
    width: '100%',
  },
  cancelButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  currentScheduleBox: {
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationDropdown: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  durationOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  actionButtons: {
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalSubmitButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 10,
  },
  editModalContent: {
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  editModalScroll: {
    maxHeight: 400,
  },
  textInputField: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  textAreaField: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 80,
  },
  serviceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  serviceToggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    borderRadius: 16,
    padding: 28,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
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
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});
