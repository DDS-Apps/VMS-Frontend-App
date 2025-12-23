import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Platform,
  Alert,
  TextInput,
  Switch,
  Animated,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { TimePicker } from "@/components/TimePicker";
import { DDIcon, type IconName } from "@/components/DDIcon";
import { SelectableCard, CardGridStyles } from "@/components/SelectableCard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ParkingSection } from "@/components/ParkingSection";
import {
  RequestTimeline,
  useTimelineSteps,
  type TimelineData,
  type TimelineActionCallbacks,
} from "@/components/shared/RequestTimeline";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { REQUEST_STATUS } from "@/constants/requestConstants";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useVisitDetailsQuery,
  useCancelVisitMutation,
  useUpdateVisitMutation,
  useHostApproveVisitMutation,
  useHostRejectVisitMutation,
  useApproveVisitMutation,
  useRejectVisitMutation,
} from "@/hooks/queries/useApprovalQueries";
import { useRoomAvailabilityQuery } from "@/hooks/queries/useMeetingRoomQueries";
import type { RoomAvailabilityParams } from "@/types/api.types";
import { VisitorRequest } from "@/types/vms.types";
import {
  getStatusConfig as getStatusStyle,
  applyOpacity,
  createModalOverlayStyle,
} from "@/utils/statusStyles";
import { RequestDetailsScreenProps } from "@/types/employeeNavigation.types";
import {
  mapVisitDetailsToVisitorRequest,
  calculateDuration,
  getDurationOptions,
} from "@/services/utils/requestMappers";

export default function RequestDetailsScreen({
  navigation,
  route,
  userRole = 'employee',
}: RequestDetailsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    formatDate,
    formatDateShort,
    formatTime,
    formatDateTime: fmtDateTime,
    formatTimeRange,
    toLocalNumerals,
    parseISODuration,
    parseTimeString,
    formatTimeFromString,
  } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { requestId } = route.params;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHostRejectModal, setShowHostRejectModal] = useState(false);
  const [hostRejectReason, setHostRejectReason] = useState("");
  const [showManagerRejectModal, setShowManagerRejectModal] = useState(false);
  const [managerRejectReason, setManagerRejectReason] = useState("");

  const [editPurpose, setEditPurpose] = useState("");
  const [editDate, setEditDate] = useState(new Date());
  const [editTime, setEditTime] = useState(new Date());
  const [editDuration, setEditDuration] = useState<string>("1 hour");
  const [editRequiresParking, setEditRequiresParking] = useState(false);
  const [editRequiresMeetingRoom, setEditRequiresMeetingRoom] = useState(false);
  const [editRequiresBuffet, setEditRequiresBuffet] = useState(false);
  const [editRequiresValet, setEditRequiresValet] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editEndTime, setEditEndTime] = useState<Date>(() => {
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 1);
    return endTime;
  });
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [showEditEndTimePicker, setShowEditEndTimePicker] = useState(false);
  const [showPurposePicker, setShowPurposePicker] = useState(false);
  const [editSendWhatsApp, setEditSendWhatsApp] = useState(false);
  const [editSendSMS, setEditSendSMS] = useState(false);
  const [editModalMode, setEditModalMode] = useState<"full" | "services-only">("full");
  const [isApprovalFlow, setIsApprovalFlow] = useState(false);

  const PURPOSE_OPTIONS = [
    { value: 'business_meeting', labelKey: 'visitor.businessMeeting' },
    { value: 'interview', labelKey: 'visitor.interview' },
    { value: 'delivery', labelKey: 'visitor.delivery' },
    { value: 'maintenance', labelKey: 'visitor.maintenance' },
    { value: 'general', labelKey: 'visitor.generalVisit' },
  ];

  // Success modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const {
    data: visitData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useVisitDetailsQuery(requestId);
  const cancelMutation = useCancelVisitMutation();
  const updateMutation = useUpdateVisitMutation();
  const hostApproveMutation = useHostApproveVisitMutation();
  const hostRejectMutation = useHostRejectVisitMutation();
  const managerApproveMutation = useApproveVisitMutation();
  const managerRejectMutation = useRejectVisitMutation();

  // Room availability check for edit modal
  const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForQuery = (time: Date): string => {
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const editRoomAvailabilityParams: RoomAvailabilityParams | null = 
    showEditModal && editRequiresMeetingRoom && editDate && editTime && editEndTime
      ? {
          date: formatDateForApi(editDate),
          startTime: formatTimeForQuery(editTime),
          endTime: formatTimeForQuery(editEndTime),
        }
      : null;

  const { data: editRoomAvailability, isLoading: isLoadingEditRooms } = 
    useRoomAvailabilityQuery(editRoomAvailabilityParams);
  
  const isEditRoomAvailable = editRoomAvailability?.available === true;
  const hasCheckedEditAvailability = editRoomAvailability !== undefined && !isLoadingEditRooms;

  const request = useMemo(() => {
    if (!visitData) return null;
    return mapVisitDetailsToVisitorRequest(visitData);
  }, [visitData]);

  const isTerminalStatus = useMemo(() => {
    if (!request) return false;
    const terminalStatuses = [
      REQUEST_STATUS.COMPLETED,
      REQUEST_STATUS.CANCELLED,
      REQUEST_STATUS.REJECTED,
      REQUEST_STATUS.VISITOR_REJECTED,
      REQUEST_STATUS.AUTO_CANCELLED,
    ];
    return terminalStatuses.includes(request.status as any);
  }, [request]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl,
  };

  const isProcessing =
    cancelMutation.isPending ||
    updateMutation.isPending ||
    hostApproveMutation.isPending ||
    hostRejectMutation.isPending ||
    managerApproveMutation.isPending ||
    managerRejectMutation.isPending;

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
        <ThemedText style={[Typography.title]}>
          {t("errors.requestNotFound")}
        </ThemedText>
        <Spacer height={Spacing.lg} />
        <Pressable
          onPress={() => refetch()}
          style={[
            {
              backgroundColor: theme.primary,
              padding: Spacing.md,
              borderRadius: BorderRadius.md,
              alignItems: "center",
            },
          ]}
        >
          <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
            {t("common.retry")}
          </ThemedText>
        </Pressable>
      </ScreenScrollView>
    );
  }

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    return fmtDateTime(date);
  };

  const handleCancelRequest = () => {
    if (isTerminalStatus) return;
    cancelMutation.mutate(requestId, {
      onSuccess: () => {
        setShowCancelModal(false);
        navigation.goBack();
      },
      onError: (error) => {
        Alert.alert(t("errors.somethingWentWrong"), error.message);
      },
    });
  };

  const handleHostApprove = () => {
    hostApproveMutation.mutate(
      { id: requestId },
      {
        onSuccess: () => {
          // Approval successful, now open edit modal in services-only mode for service selection
          if (visitData) {
            setEditPurpose(visitData.purpose || "");
            setEditRequiresParking(visitData.parkingType !== "none");
            setEditRequiresValet(visitData.parkingType === "valet");
            setEditRequiresMeetingRoom(!!visitData.meetingRoom);
            setEditRequiresBuffet(!!visitData.buffet);
            
            // Initialize communication channels from existing request data
            const channels = (visitData.communicationChannels || []).map(c => c.toLowerCase());
            setEditSendWhatsApp(channels.includes('whatsapp'));
            setEditSendSMS(channels.includes('sms'));
          }
          setIsApprovalFlow(true);
          setEditModalMode("services-only");
          setShowEditModal(true);
        },
        onError: (error) => {
          Alert.alert(t("errors.somethingWentWrong"), error.message);
        },
      },
    );
  };


  const handleHostReject = () => {
    if (!hostRejectReason.trim()) {
      Alert.alert(t("errors.validation"), t("errors.reasonRequired"));
      return;
    }
    hostRejectMutation.mutate(
      { id: requestId, payload: { reason: hostRejectReason.trim() } },
      {
        onSuccess: () => {
          setShowHostRejectModal(false);
          setHostRejectReason("");
          setSuccessMessage(t("notifications.walkInRejected"));
          setShowSuccessModal(true);
        },
        onError: (error) => {
          Alert.alert(t("errors.somethingWentWrong"), error.message);
        },
      },
    );
  };

  const handleManagerApprove = () => {
    managerApproveMutation.mutate(
      { id: requestId, payload: {} },
      {
        onSuccess: () => {
          setSuccessMessage(t("notifications.requestApproved"));
          setShowSuccessModal(true);
        },
        onError: (error) => {
          Alert.alert(t("errors.somethingWentWrong"), error.message);
        },
      },
    );
  };

  const handleManagerReject = () => {
    if (!managerRejectReason.trim()) {
      Alert.alert(t("errors.validation"), t("errors.reasonRequired"));
      return;
    }
    managerRejectMutation.mutate(
      { id: requestId, payload: { reason: managerRejectReason.trim() } },
      {
        onSuccess: () => {
          setShowManagerRejectModal(false);
          setManagerRejectReason("");
          setSuccessMessage(t("notifications.requestRejected"));
          setShowSuccessModal(true);
        },
        onError: (error) => {
          Alert.alert(t("errors.somethingWentWrong"), error.message);
        },
      },
    );
  };

  const formatTimeForApi = (time: Date): string => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const minuteStr = String(minutes).padStart(2, "0");
    return `${hour12}:${minuteStr} ${period}`;
  };

  const formatDisplayDate = (date: Date): string => {
    return formatDate(date);
  };

  const formatDisplayTime = (time: Date): string => {
    return formatTime(time);
  };

  const getDurationHours = (duration: string): number => {
    switch (duration) {
      case "30 minutes":
        return 0.5;
      case "1 hour":
        return 1;
      case "1.5 hours":
        return 1.5;
      case "2 hours":
        return 2;
      case "3 hours":
        return 3;
      case "4 hours":
        return 4;
      default:
        return 1;
    }
  };

  const openEditModal = (mode: "full" | "services-only" = "full") => {
    if (!visitData || isTerminalStatus) return;

    setIsApprovalFlow(false);
    setEditModalMode(mode);
    setEditPurpose(visitData.purpose || "");
    const visitDate = visitData.visitDate ? new Date(visitData.visitDate) : new Date();
    setEditDate(visitDate);
    const startTime = parseTimeString(visitData.visitTime || "", visitData.visitDate);
    setEditTime(startTime);
    
    // Calculate end time from duration - use raw ISO duration from API, not localized string
    const rawDuration = visitData.duration || "PT1H";
    const durationMs = parseDurationToMs(rawDuration);
    const endTime = new Date(startTime.getTime() + durationMs);
    setEditEndTime(endTime);
    setEditDuration(parseISODuration(rawDuration));
    
    setEditRequiresParking(visitData.parkingType !== "none");
    setEditRequiresMeetingRoom(!!visitData.meetingRoom);
    setEditRequiresBuffet(!!visitData.buffet);
    setEditRequiresValet(visitData.parkingType === "valet");
    
    // Pre-select communication channels from existing request data (normalize to lowercase for comparison)
    const channels = (visitData.communicationChannels || []).map(c => c.toLowerCase());
    console.log('[openEditModal] visitData.communicationChannels:', visitData.communicationChannels);
    console.log('[openEditModal] Normalized channels:', channels);
    console.log('[openEditModal] includes whatsapp:', channels.includes('whatsapp'));
    console.log('[openEditModal] includes sms:', channels.includes('sms'));
    setEditSendWhatsApp(channels.includes('whatsapp'));
    setEditSendSMS(channels.includes('sms'));
    
    setEditNotes("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setIsApprovalFlow(false);
  };
  
  const parseDurationToMs = (duration: string): number => {
    // Parse ISO 8601 duration (e.g., "PT1H30M") or display string (e.g., "1 hour")
    if (duration.startsWith("PT")) {
      const hoursMatch = duration.match(/(\d+)H/);
      const minutesMatch = duration.match(/(\d+)M/);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      return (hours * 60 + minutes) * 60 * 1000;
    }
    // Fallback for display strings
    if (duration.includes("hour")) {
      const hours = parseFloat(duration) || 1;
      return hours * 60 * 60 * 1000;
    }
    if (duration.includes("minute")) {
      const minutes = parseFloat(duration) || 30;
      return minutes * 60 * 1000;
    }
    return 60 * 60 * 1000; // Default 1 hour
  };
  
  const calculateEditDuration = (): string => {
    const startMs = editTime.getTime();
    const endMs = editEndTime.getTime();
    const diffMs = endMs - startMs;
    
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
  
  const isEditEndTimeBeforeStartTime = (): boolean => {
    return editEndTime.getTime() <= editTime.getTime();
  };

  const handleEditDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowEditDatePicker(false);
    }
    if (selectedDate) {
      setEditDate(selectedDate);
    }
  };

  const handleEditTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowEditTimePicker(false);
    }
    if (selectedTime) {
      setEditTime(selectedTime);
    }
  };

  const handleEditEndTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowEditEndTimePicker(false);
    }
    if (selectedTime) {
      setEditEndTime(selectedTime);
    }
  };

  const handleEditConfirm = () => {
    // Build communication channels array - always include email and qr_code
    const communicationChannels: ('email' | 'sms' | 'whatsapp' | 'qr_code')[] = ['email', 'qr_code'];
    if (editSendSMS) communicationChannels.push('sms');
    if (editSendWhatsApp) communicationChannels.push('whatsapp');

    const payload: Record<string, unknown> = {
      purpose: editPurpose,
      needsParking: editRequiresParking,
      needsMeetingRoom: editRequiresMeetingRoom,
      needsBuffet: editRequiresBuffet,
      needsValet: editRequiresValet,
      communicationChannels,
    };

    if (editModalMode === "full") {
      // Full mode: use the edited date/time values
      payload.visitDate = formatDateForApi(editDate);
      payload.visitTime = formatTimeForApi(editTime);
      
      // Calculate ISO-8601 duration from start and end times
      const startMs = editTime.getTime();
      const endMs = editEndTime.getTime();
      const diffMs = endMs - startMs;
      const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      let isoDuration = "PT";
      if (hours > 0) isoDuration += `${hours}H`;
      if (minutes > 0) isoDuration += `${minutes}M`;
      if (hours === 0 && minutes === 0) isoDuration = "PT0M";
      payload.duration = isoDuration;
    } else if (editModalMode === "services-only" && visitData) {
      // Services-only mode (walk-in): include existing schedule fields from visitData
      // Backend requires these fields even when only updating services
      payload.visitDate = visitData.visitDate || formatDateForApi(new Date());
      payload.visitTime = visitData.visitTime || formatTimeForApi(new Date());
      payload.duration = visitData.duration || "PT1H";
    }

    console.log(
      "[RequestDetails] Submitting edit with payload (mode: " + editModalMode + "):",
      JSON.stringify(payload, null, 2),
    );

    updateMutation.mutate(
      { id: requestId, data: payload },
      {
        onSuccess: () => {
          console.log("[RequestDetails] Edit successful");
          setShowEditModal(false);
          setSuccessMessage(isApprovalFlow ? t("notifications.walkInApproved") : t("notifications.visitUpdated"));
          setShowSuccessModal(true);
          setIsApprovalFlow(false);
        },
        onError: (error) => {
          console.log("[RequestDetails] Edit failed:", error.message);
          Alert.alert(t("errors.somethingWentWrong"), error.message);
        },
      },
    );
  };

  const statusConfig = getStatusStyle(theme, request.status, t);

  const timelineData: TimelineData = {
    createdAt: request.createdAt,
    status: request.status,
    approval: {
      requiresApproval: request.approval.requiresApproval,
      autoApproved: request.approval.autoApproved ?? false,
      approvedAt: request.approval.approvedAt,
      rejectedAt: request.approval.rejectedAt,
      rejectionReason: request.approval.rejectionReason,
    },
    hostApproval: request.hostApproval ? {
      required: true,
      approvedAt: request.hostApproval.approvedAt,
      rejectedAt: request.hostApproval.rejectedAt,
    } : undefined,
    acceptedAt: request.acceptedAt,
    checkedInAt: request.checkedInAt,
    checkedOutAt: request.checkedOutAt,
    completedAt: request.completedAt,
    cancelledAt: request.cancelledAt,
  };

  const timelineActionCallbacks: TimelineActionCallbacks | undefined = 
    request.status === 'pending_host_approval' ? {
      onAccept: handleHostApprove,
      onReject: () => setShowHostRejectModal(true),
      isAcceptLoading: hostApproveMutation.isPending,
      isRejectLoading: hostRejectMutation.isPending,
    } : undefined;

  const timelineSteps = useTimelineSteps({
    data: timelineData,
    role: 'employee',
    flowType: 'standard',
    actions: timelineActionCallbacks,
    showActions: request.status === 'pending_host_approval',
  });

  const getServiceStatusVariant = (status?: string): 'success' | 'warning' | 'error' | 'info' | 'muted' => {
    if (!status) return 'muted';
    const lowerStatus = status.toLowerCase();
    if (['active', 'scheduled', 'allocated', 'confirmed', 'in_progress', 'ready', 'served'].includes(lowerStatus)) return 'success';
    if (['pending', 'awaiting', 'preparing'].includes(lowerStatus)) return 'warning';
    if (['cancelled', 'expired', 'no_show', 'released'].includes(lowerStatus)) return 'error';
    if (['completed', 'checked_out', 'checked_in'].includes(lowerStatus)) return 'info';
    return 'muted';
  };

  const formatServiceStatus = (status?: string): string => {
    if (!status) return '';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      {/* Header with Status Badge */}
      <View style={styles.headerRow}>
        <ThemedText
          style={[
            Typography.caption,
            { color: theme.textSecondary, fontSize: 12 },
          ]}
        >
          {t("visitor.requestId")}: {request.id}
        </ThemedText>
        <View
          style={[
            styles.statusBadgeNew,
            {
              backgroundColor: statusConfig.bg,
              borderColor: statusConfig.border,
              borderWidth: 1,
            },
          ]}
        >
          <ThemedText
            style={[
              Typography.caption,
              { color: statusConfig.text, fontWeight: "600", fontSize: 10 },
            ]}
          >
            {statusConfig.label}
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing.xl} />

      {/* Rejection/Decline Reason */}
      {request.approval.rejectedAt && request.approval.rejectionReason ? (
        <>
          <ThemedView
            style={[
              styles.alertBox,
              {
                backgroundColor: applyOpacity(theme.error, "10"),
                borderStartColor: theme.error,
                borderStartWidth: 4,
              },
            ]}
          >
            <DDIcon name="alert-circle" size={16} variant="danger" />
            <ThemedText
              style={[
                Typography.bodySmall,
                { marginStart: Spacing.sm, flex: 1, color: theme.error },
              ]}
            >
              {t("form.reason")}: {request.approval.rejectionReason}
            </ThemedText>
          </ThemedView>
          <Spacer height={Spacing.lg} />
        </>
      ) : null}
      {request.visitorDecision &&
      !request.visitorDecision.accepted &&
      request.visitorDecision.reason ? (
        <>
          <ThemedView
            style={[
              styles.alertBox,
              {
                backgroundColor: applyOpacity(theme.warning, "10"),
                borderStartColor: theme.warning,
                borderStartWidth: 4,
              },
            ]}
          >
            <DDIcon name="info" size={16} variant="warning" />
            <ThemedText
              style={[
                Typography.bodySmall,
                { marginStart: Spacing.sm, flex: 1, color: theme.warning },
              ]}
            >
              {t("visitor.visitorReason")}: {request.visitorDecision.reason}
            </ThemedText>
          </ThemedView>
          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      {/* Manager Comment - Only show for employee requests (not auto-approved) */}
      {request.approval.managerComment &&
      (request.approval.approvedAt || request.approval.rejectedAt) &&
      !request.approval.autoApproved ? (
        <>
          <ThemedView
            style={[styles.cardNew, { backgroundColor: theme.surface }]}
          >
            <View style={styles.managerCommentHeader}>
              <DDIcon
                name={request.approval.approvedAt ? "check-circle" : "x-circle"}
                size={16}
                color={
                  request.approval.approvedAt ? theme.secondary : theme.error
                }
              />
              <ThemedText
                style={[
                  Typography.subtitle,
                  {
                    marginStart: Spacing.sm,
                    fontSize: 14,
                    fontWeight: "600",
                    color: theme.text,
                  },
                ]}
              >
                {t("visitor.managerComment")}
              </ThemedText>
            </View>
            <Spacer height={Spacing.sm} />
            <ThemedText
              style={[
                Typography.body,
                { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
              ]}
            >
              {request.approval.managerComment}
            </ThemedText>
            {request.approval.managerName && (
              <>
                <Spacer height={Spacing.md} />
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <DDIcon name="user" size={12} variant="muted" />
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        marginStart: 6,
                        color: theme.textSecondary,
                        fontSize: 11,
                      },
                    ]}
                  >
                    {request.approval.managerName}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.caption,
                      { marginHorizontal: 6, color: theme.border },
                    ]}
                  >
                    •
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.textSecondary, fontSize: 11 },
                    ]}
                  >
                    {formatDateTimeLocal(
                      request.approval.approvedAt ||
                        request.approval.rejectedAt ||
                        "",
                    )}
                  </ThemedText>
                </View>
              </>
            )}
          </ThemedView>
          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <View style={{ alignItems: "center" }}>
          <View
            style={[
              styles.avatarNew,
              { backgroundColor: applyOpacity(theme.primary, "15") },
            ]}
          >
            <ThemedText
              style={[
                styles.avatarText,
                { color: theme.primary, fontSize: 32, fontWeight: "700" },
              ]}
            >
              {request.visitor.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />

          <ThemedText
            style={[
              Typography.title,
              { fontWeight: "600", fontSize: 22, color: theme.text },
            ]}
          >
            {request.visitor.fullName}
          </ThemedText>
          <ThemedText
            style={[
              Typography.body,
              { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
            ]}
          >
            {request.visitor.company}
          </ThemedText>
        </View>

        <Spacer height={Spacing.xl} />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Spacer height={Spacing.lg} />

        <View style={styles.infoRowNew}>
          <DDIcon name="mail" size={16} variant="muted" />
          <ThemedText
            style={[
              Typography.body,
              {
                marginStart: Spacing.md,
                color: theme.textSecondary,
                flex: 1,
                fontSize: 14,
              },
            ]}
          >
            {request.visitor.email}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.infoRowNew}>
          <DDIcon name="phone" size={16} variant="muted" />
          <ThemedText
            style={[
              Typography.body,
              {
                marginStart: Spacing.md,
                color: theme.textSecondary,
                fontSize: 14,
              },
            ]}
          >
            {request.visitor.phone}
          </ThemedText>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemedText
            style={[
              Typography.subtitle,
              { fontSize: 16, fontWeight: "600", color: theme.text },
            ]}
          >
            {t("visitor.visitDetails")}
          </ThemedText>
          {request.isWalkIn ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: applyOpacity(theme.warning, '15'), paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm }}>
              <DDIcon name="user-check" size={14} color={theme.warning} />
              <ThemedText style={[Typography.caption, { color: theme.warning, fontWeight: '600', marginStart: Spacing.xs, fontSize: 11 }]}>
                {t("reception.walkInVisitor")}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <Spacer height={Spacing.xl} />

        <View style={styles.detailRowNew}>
          <DDIcon name="calendar" size={16} variant="muted" />
          <ThemedText
            style={[
              Typography.body,
              {
                color: theme.textSecondary,
                marginStart: Spacing.md,
                fontSize: 13,
                minWidth: 90,
              },
            ]}
          >
            {t("time.dateAndTime")}
          </ThemedText>
          <ThemedText
            style={[
              Typography.body,
              { fontWeight: "600", color: theme.text, flex: 1, fontSize: 14 },
            ]}
          >
            {formatDateShort(request.visitDate)} {t("time.at")}{" "}
            {formatTimeFromString(request.visitTime)}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={styles.detailRowNew}>
          <DDIcon name="clock" size={16} variant="muted" />
          <ThemedText
            style={[
              Typography.body,
              {
                color: theme.textSecondary,
                marginStart: Spacing.md,
                fontSize: 13,
                minWidth: 90,
              },
            ]}
          >
            {t("form.duration")}
          </ThemedText>
          <ThemedText
            style={[
              Typography.body,
              { fontWeight: "600", color: theme.text, flex: 1, fontSize: 14 },
            ]}
          >
            {parseISODuration(request.duration)}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={styles.detailRowNew}>
          <DDIcon name="briefcase" size={16} variant="muted" />
          <ThemedText
            style={[
              Typography.body,
              {
                color: theme.textSecondary,
                marginStart: Spacing.md,
                fontSize: 13,
                minWidth: 90,
              },
            ]}
          >
            {t("form.purpose")}
          </ThemedText>
          <ThemedText
            style={[
              Typography.body,
              { color: theme.text, flex: 1, fontSize: 14 },
            ]}
          >
            {request.purpose}
          </ThemedText>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText
          style={[
            Typography.subtitle,
            { fontSize: 16, fontWeight: "600", color: theme.text },
          ]}
        >
          {t("services.additionalServices")}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View
          style={[
            styles.serviceItemNew,
            { backgroundColor: theme.surfaceSecondary },
          ]}
        >
          <View
            style={[
              styles.serviceIcon,
              {
                backgroundColor: applyOpacity(
                  request.meetingRoom ? theme.secondary : theme.textSecondary,
                  "15",
                ),
              },
            ]}
          >
            <DDIcon
              name="briefcase"
              size={18}
              color={
                request.meetingRoom ? theme.secondary : theme.textSecondary
              }
            />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText
              style={[
                Typography.body,
                { fontWeight: "600", fontSize: 14, color: theme.text },
              ]}
            >
              {t("services.meetingRoom")}
            </ThemedText>
            {(request.meetingRoom || (request as any).meetingRoomPending) && (request.status === REQUEST_STATUS.REJECTED || request.status === REQUEST_STATUS.CANCELLED) ? (
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.error, fontSize: 12, marginTop: 2 },
                ]}
              >
                {t("status.cancelled")}
              </ThemedText>
            ) : request.meetingRoom ? (
              <>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
                  ]}
                >
                  {request.meetingRoom.name} - {request.meetingRoom.floor}
                </ThemedText>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.textSecondary, fontSize: 12 },
                  ]}
                >
                  {formatTimeRange(request.meetingRoom.timeSlot)}
                </ThemedText>
              </>
            ) : (request as any).meetingRoomPending ? (
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.warning, fontSize: 12, marginTop: 2 },
                ]}
              >
                {t("status.pending")}
              </ThemedText>
            ) : (
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                    fontStyle: "italic",
                  },
                ]}
              >
                {t("common.notRequested")}
              </ThemedText>
            )}
          </View>
          {request.meetingRoom?.status ? (
            <StatusBadge
              label={formatServiceStatus(request.meetingRoom.status)}
              variant={getServiceStatusVariant(request.meetingRoom.status)}
              size="sm"
            />
          ) : null}
        </View>
        <Spacer height={Spacing.md} />

        <View
          style={[
            styles.serviceItemNew,
            { backgroundColor: theme.surfaceSecondary },
          ]}
        >
          <View
            style={[
              styles.serviceIcon,
              {
                backgroundColor: applyOpacity(
                  request.parkingSlot ? theme.info : theme.textSecondary,
                  "15",
                ),
              },
            ]}
          >
            <DDIcon
              name="map-pin"
              size={18}
              color={request.parkingSlot ? theme.info : theme.textSecondary}
            />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText
              style={[
                Typography.body,
                { fontWeight: "600", fontSize: 14, color: theme.text },
              ]}
            >
              {t("services.parking")}
            </ThemedText>
            {(request.parkingSlot || (request as any).parkingPending) && (request.status === REQUEST_STATUS.REJECTED || request.status === REQUEST_STATUS.CANCELLED) ? (
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.error, fontSize: 12, marginTop: 2 },
                ]}
              >
                {t("status.cancelled")}
              </ThemedText>
            ) : request.parkingSlot ? (
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
                ]}
              >
                {request.parkingSlot.location === "skbc_basement" ||
                request.parkingSlot.location === "SKBC_basement"
                  ? "SKBC Basement"
                  : request.parkingSlot.location}{" "}
                - {t("parking.slotNumber")} {request.parkingSlot.slotNumber}
              </ThemedText>
            ) : (request as any).parkingPending ? (
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.warning, fontSize: 12, marginTop: 2 },
                ]}
              >
                {t("status.pending")}
              </ThemedText>
            ) : (
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                    fontStyle: "italic",
                  },
                ]}
              >
                {t("common.notRequested")}
              </ThemedText>
            )}
          </View>
          {request.parkingSlot?.status ? (
            <StatusBadge
              label={formatServiceStatus(request.parkingSlot.status)}
              variant={getServiceStatusVariant(request.parkingSlot.status)}
              size="sm"
            />
          ) : null}
        </View>
        <Spacer height={Spacing.md} />

        <View
          style={[
            styles.serviceItemNew,
            { backgroundColor: theme.surfaceSecondary },
          ]}
        >
          <View
            style={[
              styles.serviceIcon,
              {
                backgroundColor: applyOpacity(
                  (request.buffet || (request as any).buffetPending) ? theme.warning : theme.textSecondary,
                  "15",
                ),
              },
            ]}
          >
            <DDIcon
              name="cloche"
              size={18}
              color={(request.buffet || (request as any).buffetPending) ? theme.warning : theme.textSecondary}
            />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText
              style={[
                Typography.body,
                { fontWeight: "600", fontSize: 14, color: theme.text },
              ]}
            >
              {t("buffet.buffetService")}
            </ThemedText>
            {(request.buffet || (request as any).buffetPending) && (request.status === REQUEST_STATUS.REJECTED || request.status === REQUEST_STATUS.CANCELLED) ? (
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.error, fontSize: 12, marginTop: 2 },
                ]}
              >
                {t("status.cancelled")}
              </ThemedText>
            ) : request.buffet && request.buffet.mealType ? (
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
                ]}
              >
                {request.buffet.location} -{" "}
                {request.buffet.mealType.charAt(0).toUpperCase() +
                  request.buffet.mealType.slice(1)}
              </ThemedText>
            ) : (request as any).buffetPending ? (
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.warning, fontSize: 12, marginTop: 2 },
                ]}
              >
                {t("status.pending")}
              </ThemedText>
            ) : (
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                    fontStyle: "italic",
                  },
                ]}
              >
                {t("common.notRequested")}
              </ThemedText>
            )}
          </View>
          {request.buffet?.status ? (
            <StatusBadge
              label={formatServiceStatus(request.buffet.status)}
              variant={getServiceStatusVariant(request.buffet.status)}
              size="sm"
            />
          ) : null}
        </View>
      </ThemedView>
      <Spacer height={Spacing.lg} />

      <RequestTimeline steps={timelineSteps} />

      <Spacer height={Spacing.lg} />

      <ThemedView
        style={[
          styles.cardNew,
          { backgroundColor: theme.surface, alignItems: "center" },
        ]}
      >
        <ThemedText
          style={[
            Typography.subtitle,
            { fontSize: 16, fontWeight: "600", color: theme.text },
          ]}
        >
          {t("invitation.qrCode")}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View
          style={[
            styles.qrContainerNew,
            {
              backgroundColor: theme.surfaceSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          {request.qrCode ? (
            <QRCode
              value={request.qrCode}
              size={150}
              backgroundColor={theme.surfaceSecondary}
              color={theme.text}
            />
          ) : (
            <View style={[styles.qrPlaceholder, { borderColor: theme.border }]}>
              <DDIcon name="maximize" size={80} color={theme.border} />
            </View>
          )}
        </View>

      </ThemedView>

      <Spacer height={Spacing.xl} />

      {/* Walk-in request pending: Show Approve/Reject buttons */}
      {request.isWalkIn && request.status === REQUEST_STATUS.PENDING_HOST_APPROVAL ? (
        <>
          <ApprovalActionGroup
            onApprove={handleHostApprove}
            onReject={() => setShowHostRejectModal(true)}
            approveLoading={hostApproveMutation.isPending}
            rejectLoading={hostRejectMutation.isPending}
            size="medium"
            showIcons={true}
          />
          <Spacer height={Spacing.xl} />
        </>
      ) : null}

      {/* Manager approval pending: Show Accept/Reject buttons - only for managers */}
      {request.status === REQUEST_STATUS.PENDING_APPROVAL && userRole === 'manager' ? (
        <>
          <ApprovalActionGroup
            onApprove={handleManagerApprove}
            onReject={() => setShowManagerRejectModal(true)}
            approveLoading={managerApproveMutation.isPending}
            rejectLoading={managerRejectMutation.isPending}
            size="medium"
            showIcons={true}
          />
          <Spacer height={Spacing.xl} />
        </>
      ) : null}

      {/* Show Edit and Cancel buttons - hidden for terminal statuses and for managers on pending_approval */}
      {request.status !== REQUEST_STATUS.PENDING_HOST_APPROVAL &&
       !(request.status === REQUEST_STATUS.PENDING_APPROVAL && userRole === 'manager') &&
       request.status !== REQUEST_STATUS.COMPLETED &&
       request.status !== REQUEST_STATUS.CANCELLED &&
       request.status !== REQUEST_STATUS.REJECTED &&
       request.status !== REQUEST_STATUS.VISITOR_REJECTED &&
       request.status !== REQUEST_STATUS.AUTO_CANCELLED ? (
        <>
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={[
                styles.actionButtonHalf,
                { backgroundColor: theme.primary },
              ]}
              onPress={() => openEditModal(request.isWalkIn ? "services-only" : "full")}
            >
              <DDIcon name={request.isWalkIn ? "settings" : "edit-2"} size={18} color={theme.buttonText} />
              <ThemedText
                style={[
                  Typography.body,
                  {
                    color: theme.buttonText,
                    marginStart: Spacing.sm,
                    fontWeight: "600",
                    fontSize: 14,
                  },
                ]}
              >
                {request.isWalkIn ? t("actions.editServices") : t("common.edit")}
              </ThemedText>
            </Pressable>
            <Spacer width={Spacing.md} />
            <Pressable
              style={[
                styles.actionButtonHalf,
                { borderColor: theme.error, backgroundColor: theme.surface },
              ]}
              onPress={() => setShowCancelModal(true)}
            >
              <DDIcon name="x" size={18} variant="danger" />
              <ThemedText
                style={[
                  Typography.body,
                  {
                    color: theme.error,
                    marginStart: Spacing.sm,
                    fontWeight: "600",
                    fontSize: 14,
                  },
                ]}
              >
                {t("common.cancel")}
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
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, "50")]}
            onPress={() => setShowCancelModal(false)}
          />
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 18, fontWeight: "600", color: theme.text },
                ]}
              >
                {t("actions.confirmCancel")}
              </ThemedText>
              <Pressable onPress={() => setShowCancelModal(false)}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={20} />

            <ThemedText
              style={[
                Typography.body,
                { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
              ]}
            >
              {t("actions.cancelConfirmMessage")}
            </ThemedText>

            <Spacer height={24} />

            <View style={styles.modalActions}>
              <LoadingButton
                onPress={() => setShowCancelModal(false)}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              >
                {t("common.goBack")}
              </LoadingButton>

              <Spacer width={12} />

              <LoadingButton
                onPress={handleCancelRequest}
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending}
                variant="danger"
                size="medium"
                loadingText={t("common.loading")}
                style={{ flex: 1 }}
              >
                {t("actions.cancel")}
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
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, "50")]}
            onPress={() => setShowHostRejectModal(false)}
          />
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 18, fontWeight: "600", color: theme.text },
                ]}
              >
                {t("actions.rejectWalkIn")}
              </ThemedText>
              <Pressable onPress={() => setShowHostRejectModal(false)}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={20} />

            <ThemedText
              style={[
                Typography.body,
                { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
              ]}
            >
              {t("actions.rejectWalkInMessage")}
            </ThemedText>

            <Spacer height={Spacing.lg} />

            <ThemedText
              style={[
                Typography.caption,
                { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
              ]}
            >
              {t("form.reason")} *
            </ThemedText>
            <TextInput
              style={[
                styles.textAreaField,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={hostRejectReason}
              onChangeText={setHostRejectReason}
              placeholder={t("form.enterReason")}
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
                  setHostRejectReason("");
                }}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              >
                {t("common.cancel")}
              </LoadingButton>

              <Spacer width={12} />

              <LoadingButton
                onPress={handleHostReject}
                loading={hostRejectMutation.isPending}
                disabled={
                  hostRejectMutation.isPending || !hostRejectReason.trim()
                }
                variant="danger"
                size="medium"
                loadingText={t("common.loading")}
                style={{ flex: 1 }}
              >
                {t("actions.reject")}
              </LoadingButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manager Reject Modal */}
      <Modal
        visible={showManagerRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManagerRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, "50")]}
            onPress={() => setShowManagerRejectModal(false)}
          />
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 18, fontWeight: "600", color: theme.text },
                ]}
              >
                {t("actions.rejectRequest")}
              </ThemedText>
              <Pressable onPress={() => setShowManagerRejectModal(false)}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={20} />

            <ThemedText
              style={[
                Typography.body,
                { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
              ]}
            >
              {t("actions.rejectRequestMessage")}
            </ThemedText>

            <Spacer height={Spacing.lg} />

            <ThemedText
              style={[
                Typography.caption,
                { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
              ]}
            >
              {t("form.reason")} *
            </ThemedText>
            <TextInput
              style={[
                styles.textAreaField,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={managerRejectReason}
              onChangeText={setManagerRejectReason}
              placeholder={t("form.enterReason")}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Spacer height={24} />

            <View style={styles.modalActions}>
              <LoadingButton
                onPress={() => {
                  setShowManagerRejectModal(false);
                  setManagerRejectReason("");
                }}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              >
                {t("common.cancel")}
              </LoadingButton>

              <Spacer width={12} />

              <LoadingButton
                onPress={handleManagerReject}
                loading={managerRejectMutation.isPending}
                disabled={
                  managerRejectMutation.isPending || !managerRejectReason.trim()
                }
                variant="danger"
                size="medium"
                loadingText={t("common.loading")}
                style={{ flex: 1 }}
              >
                {t("actions.reject")}
              </LoadingButton>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, "50")]}
            onPress={closeEditModal}
          />
          <View
            style={[
              styles.editModalContent,
              { backgroundColor: theme.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 18, fontWeight: "600", color: theme.text },
                ]}
              >
                {isApprovalFlow
                  ? t("services.additionalServices")
                  : editModalMode === "services-only"
                  ? t("actions.editServices")
                  : t("actions.editRequest")}
              </ThemedText>
              <Pressable onPress={closeEditModal}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={Spacing.lg} />

            <ScrollView
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
            >
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
                ]}
              >
                {t("form.purpose")} *
              </ThemedText>
              <Pressable
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowPurposePicker(true)}
              >
                <DDIcon name="clipboard" size={16} variant="muted" />
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      marginStart: Spacing.sm,
                      color: editPurpose ? theme.text : theme.textSecondary,
                      fontSize: 14,
                      flex: 1,
                    },
                  ]}
                >
                  {editPurpose || t("visitor.selectVisitType")}
                </ThemedText>
                <DDIcon name="chevron-down" size={16} variant="muted" />
              </Pressable>

              {editModalMode === "full" ? (
                <>
                  <Spacer height={Spacing.lg} />

                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
                    ]}
                  >
                    {t("form.date")}
                  </ThemedText>
                  <Pressable
                    style={[
                      styles.pickerButton,
                      {
                        backgroundColor: theme.surfaceSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <DDIcon name="calendar" size={16} variant="muted" />
                    <ThemedText
                      style={[
                        Typography.body,
                        {
                          marginStart: Spacing.sm,
                          color: theme.text,
                          fontSize: 14,
                        },
                      ]}
                    >
                      {formatDisplayDate(editDate)}
                    </ThemedText>
                  </Pressable>

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
                ]}
              >
                {t("form.time")}
              </ThemedText>
              <Pressable
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowEditTimePicker(true)}
              >
                <DDIcon name="clock" size={16} variant="muted" />
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      marginStart: Spacing.sm,
                      color: theme.text,
                      fontSize: 14,
                    },
                  ]}
                >
                  {formatDisplayTime(editTime)}
                </ThemedText>
              </Pressable>

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
                ]}
              >
                {t("form.endTime")}
              </ThemedText>
              <Pressable
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowEditEndTimePicker(true)}
              >
                <DDIcon name="clock" size={16} variant="muted" />
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      marginStart: Spacing.sm,
                      color: theme.text,
                      fontSize: 14,
                    },
                  ]}
                >
                  {formatDisplayTime(editEndTime)}
                </ThemedText>
              </Pressable>

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
                ]}
              >
                {t("form.duration")}
              </ThemedText>
              <View
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: 0.7,
                  },
                ]}
              >
                <DDIcon name="clock" size={16} variant="muted" />
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      marginStart: Spacing.sm,
                      color: isEditEndTimeBeforeStartTime() ? theme.error : theme.textSecondary,
                      fontSize: 14,
                      flex: 1,
                    },
                  ]}
                >
                  {calculateEditDuration()}
                </ThemedText>
                <DDIcon name="lock" size={16} variant="muted" />
              </View>
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, marginTop: Spacing.xs, fontSize: 11 },
                ]}
              >
                {t("form.calculatedAutomatically")}
              </ThemedText>
                </>
              ) : null}

              <Spacer height={Spacing.xl} />

              <ThemedText
                style={[
                  Typography.subtitle,
                  {
                    fontSize: 14,
                    fontWeight: "600",
                    color: theme.text,
                    marginBottom: Spacing.md,
                  },
                ]}
              >
                {t("services.optionalServices")}
              </ThemedText>

              <View style={CardGridStyles.grid}>
                <View style={CardGridStyles.cardWrapper3Col}>
                  <SelectableCard
                    onPress={() => setEditRequiresMeetingRoom(!editRequiresMeetingRoom)}
                    selected={editRequiresMeetingRoom}
                  >
                    <View style={[styles.compactServiceIcon, { backgroundColor: applyOpacity(theme.cardIcon, "15") }]}>
                      <DDIcon name="users" size={20} color={theme.cardIcon} />
                    </View>
                    <ThemedText style={[Typography.caption, { fontWeight: "600", marginTop: Spacing.xs, textAlign: "center", color: theme.text, fontSize: 11 }]}>
                      {t("services.meetingRoom")}
                    </ThemedText>
                  </SelectableCard>
                </View>

                <View style={[CardGridStyles.cardWrapper3Col, request.isWalkIn && { opacity: 0.5 }]}>
                  <SelectableCard
                    onPress={() => !request.isWalkIn && setEditRequiresParking(!editRequiresParking)}
                    selected={request.isWalkIn ? false : editRequiresParking}
                  >
                    <View style={[styles.compactServiceIcon, { backgroundColor: applyOpacity(theme.cardIcon, "15") }]}>
                      <DDIcon name="map-pin" size={20} color={request.isWalkIn ? theme.textSecondary : theme.cardIcon} />
                    </View>
                    <ThemedText style={[Typography.caption, { fontWeight: "600", marginTop: Spacing.xs, textAlign: "center", color: request.isWalkIn ? theme.textSecondary : theme.text, fontSize: 11 }]}>
                      {t("parking.parking")}
                    </ThemedText>
                  </SelectableCard>
                </View>

                <View style={CardGridStyles.cardWrapper3Col}>
                  <SelectableCard
                    onPress={() => setEditRequiresBuffet(!editRequiresBuffet)}
                    selected={editRequiresBuffet}
                  >
                    <View style={[styles.compactServiceIcon, { backgroundColor: applyOpacity(theme.cardIcon, "15") }]}>
                      <DDIcon name="cloche" size={20} color={theme.cardIcon} />
                    </View>
                    <ThemedText style={[Typography.caption, { fontWeight: "600", marginTop: Spacing.xs, textAlign: "center", color: theme.text, fontSize: 11 }]}>
                      {t("buffet.buffet")}
                    </ThemedText>
                  </SelectableCard>
                </View>
              </View>

              {/* Meeting Room Availability Badge */}
              {editRequiresMeetingRoom ? (
                <View style={{ marginTop: Spacing.md }}>
                  {hasCheckedEditAvailability ? (
                    <View 
                      style={[
                        styles.availabilityBadge, 
                        { 
                          backgroundColor: isEditRoomAvailable 
                            ? applyOpacity(theme.success, '15') 
                            : applyOpacity(theme.error, '15'),
                          borderColor: isEditRoomAvailable ? theme.success : theme.error,
                        }
                      ]}
                    >
                      <DDIcon 
                        name={isEditRoomAvailable ? "check-circle" : "alert-circle"} 
                        size={16} 
                        color={isEditRoomAvailable ? theme.success : theme.error} 
                      />
                      <ThemedText 
                        style={[
                          Typography.bodySmall, 
                          { 
                            color: isEditRoomAvailable ? theme.success : theme.error,
                            marginStart: Spacing.xs,
                            fontWeight: '500'
                          }
                        ]}
                      >
                        {isEditRoomAvailable 
                          ? t('form.meetingRoomAvailable')
                          : t('errors.noRoomsAvailableForTime')
                        }
                      </ThemedText>
                    </View>
                  ) : isLoadingEditRooms ? (
                    <View style={[styles.availabilityBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <ActivityIndicator size="small" color={theme.primary} style={{ marginEnd: Spacing.xs }} />
                      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                        {t('common.checkingAvailability')}...
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Communication Channels - Hide for walk-in requests */}
              {!request?.isWalkIn ? (
                <>
                  <Spacer height={Spacing.xl} />

                  <ThemedText
                    style={[
                      Typography.subtitle,
                      {
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.text,
                        marginBottom: Spacing.md,
                      },
                    ]}
                  >
                    {t("invitation.communicationChannels")}
                  </ThemedText>

                  <View style={styles.channelsContainer}>
                    <Pressable
                      style={[
                        styles.channelChip,
                        {
                          backgroundColor: theme.surface,
                          borderColor: editSendWhatsApp ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setEditSendWhatsApp(!editSendWhatsApp)}
                    >
                      <View
                        style={[
                          styles.channelChipIcon,
                          { backgroundColor: applyOpacity(theme.success, "15") },
                        ]}
                      >
                        <DDIcon name="message-circle" size={16} variant="success" />
                      </View>
                      <ThemedText
                        style={[
                          Typography.bodySmall,
                          { fontWeight: "500", marginStart: Spacing.xs },
                        ]}
                      >
                        {t("services.whatsapp")}
                      </ThemedText>
                      {editSendWhatsApp ? (
                        <View
                          style={[
                            styles.chipCheckmark,
                            { backgroundColor: theme.primary },
                          ]}
                        >
                          <DDIcon name="check" size={10} color={theme.buttonText} />
                        </View>
                      ) : null}
                    </Pressable>

                    <Pressable
                      style={[
                        styles.channelChip,
                        {
                          backgroundColor: theme.surface,
                          borderColor: editSendSMS ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setEditSendSMS(!editSendSMS)}
                    >
                      <View
                        style={[
                          styles.channelChipIcon,
                          { backgroundColor: applyOpacity(theme.info, "15") },
                        ]}
                      >
                        <DDIcon name="smartphone" size={16} color={theme.info} />
                      </View>
                      <ThemedText
                        style={[
                          Typography.bodySmall,
                          { fontWeight: "500", marginStart: Spacing.xs },
                        ]}
                      >
                        {t("services.sms")}
                      </ThemedText>
                      {editSendSMS ? (
                        <View
                          style={[
                            styles.chipCheckmark,
                            { backgroundColor: theme.primary },
                          ]}
                        >
                          <DDIcon name="check" size={10} color={theme.buttonText} />
                        </View>
                      ) : null}
                    </Pressable>

                    <View
                      style={[
                        styles.channelChip,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.primary,
                          opacity: 0.8,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.channelChipIcon,
                          { backgroundColor: applyOpacity(theme.warning, "15") },
                        ]}
                      >
                        <DDIcon name="mail" size={16} color={theme.warning} />
                      </View>
                      <ThemedText
                        style={[
                          Typography.bodySmall,
                          { fontWeight: "500", marginStart: Spacing.xs },
                        ]}
                      >
                        {t("services.email")}
                      </ThemedText>
                      <View
                        style={[
                          styles.chipCheckmark,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <DDIcon name="check" size={10} color={theme.buttonText} />
                      </View>
                    </View>
                  </View>

                  <Spacer height={Spacing.lg} />
                </>
              ) : null}

              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
                ]}
              >
                {t("form.notes")} ({t("form.optional")})
              </ThemedText>
              <TextInput
                style={[
                  styles.textAreaField,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder={t("form.additionalNotes")}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Spacer height={Spacing.xl} />
            </ScrollView>

            <View style={styles.modalActions}>
              <LoadingButton
                onPress={closeEditModal}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              >
                {t("common.cancel")}
              </LoadingButton>

              <Spacer width={12} />

              <LoadingButton
                onPress={handleEditConfirm}
                loading={updateMutation.isPending}
                disabled={updateMutation.isPending}
                variant={isApprovalFlow ? "success" : "primary"}
                size="medium"
                icon={isApprovalFlow ? "check" : undefined}
                loadingText={isApprovalFlow ? t("common.approving") : t("common.saving")}
                style={{ flex: 1 }}
              >
                {isApprovalFlow ? t("actions.approve") : t("common.save")}
              </LoadingButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date/Time Picker Modals for Edit */}
      <CalendarDatePicker
        visible={showEditDatePicker}
        onClose={() => setShowEditDatePicker(false)}
        selectedDate={editDate}
        onDateSelect={(date) => {
          setEditDate(date);
          setShowEditDatePicker(false);
        }}
        mode="single"
        minimumDate={new Date()}
      />

      <TimePicker
        visible={showEditTimePicker}
        onClose={() => setShowEditTimePicker(false)}
        selectedTime={editTime}
        onTimeSelect={(time) => {
          setEditTime(time);
          setShowEditTimePicker(false);
        }}
        minuteInterval={5}
      />

      <TimePicker
        visible={showEditEndTimePicker}
        onClose={() => setShowEditEndTimePicker(false)}
        selectedTime={editEndTime}
        onTimeSelect={(time) => {
          setEditEndTime(time);
          setShowEditEndTimePicker(false);
        }}
        minuteInterval={5}
      />

      {/* Purpose Picker Modal */}
      <Modal
        visible={showPurposePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPurposePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={[styles.modalBackdrop, createModalOverlayStyle(theme, "50")]}
            onPress={() => setShowPurposePicker(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, maxHeight: "60%" },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 18, fontWeight: "600", color: theme.text },
                ]}
              >
                {t("visitor.selectVisitType")}
              </ThemedText>
              <Pressable onPress={() => setShowPurposePicker(false)}>
                <DDIcon name="x" size={22} variant="muted" />
              </Pressable>
            </View>

            <ScrollView style={{ marginTop: Spacing.md }}>
              {PURPOSE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.purposePickerItem,
                    {
                      borderBottomColor: theme.border,
                      backgroundColor:
                        editPurpose === t(option.labelKey as any)
                          ? applyOpacity(theme.primary, "10")
                          : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setEditPurpose(t(option.labelKey as any));
                    setShowPurposePicker(false);
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <ThemedText
                      style={[
                        Typography.body,
                        {
                          color: theme.text,
                          fontWeight:
                            editPurpose === t(option.labelKey as any)
                              ? "600"
                              : "400",
                        },
                      ]}
                    >
                      {t(option.labelKey as any)}
                    </ThemedText>
                    {editPurpose === t(option.labelKey as any) ? (
                      <DDIcon name="check" size={18} variant="primary" />
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
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

            <LoadingButton
              onPress={handleCloseSuccessModal}
              variant="success"
              size="medium"
              fullWidth
            >
              {t("common.close")}
            </LoadingButton>
          </Animated.View>
        </Pressable>
      </Modal>

    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  managerCommentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  cardNew: {
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarNew: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoRowNew: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailRowNew: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  serviceItemNew: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 8,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    position: "relative",
  },
  timelineItemNew: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineIconContainer: {
    alignItems: "center",
    position: "relative",
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
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    position: "absolute",
    left: 5.5,
    top: 20,
    width: 1,
    height: 40,
  },
  timelineLineNew: {
    position: "absolute",
    top: 32,
    width: 2,
    height: 36,
  },
  qrContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  qrContainerNew: {
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 10,
    borderStyle: "dashed",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  shareButtonNew: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 10,
    width: "100%",
  },
  cancelButtonNew: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtonHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationDropdown: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  durationOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  actionButtons: {
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: 10,
  },
  editModalContent: {
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 450,
    maxHeight: "80%",
    shadowColor: "#000",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  serviceToggleLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactServiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLoadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  successModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    borderRadius: 16,
    padding: 28,
    width: "85%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
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
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  channelsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  channelChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  channelChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCheckmark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginStart: Spacing.xs,
  },
  purposePickerItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
