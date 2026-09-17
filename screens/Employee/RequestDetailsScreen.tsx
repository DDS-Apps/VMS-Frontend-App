import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
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
  TouchableWithoutFeedback,
  useWindowDimensions,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { TimePicker } from "@/components/TimePicker";
import { DDIcon, type IconName } from "@/components/DDIcon";
import {
  SelectableCard,
  CardGridStyles,
  getGridStyle,
  getCardWrapper3ColStyle,
} from "@/components/SelectableCard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { ExpiredVisitFooter } from "@/components/shared/ExpiredVisitFooter";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  RequestTimeline,
  useTimelineSteps,
  type TimelineData,
  type TimelineActionCallbacks,
} from "@/components/shared/RequestTimeline";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography, getInputFontFamily } from "@/constants/theme";
import { REQUEST_STATUS, PURPOSE_OPTIONS, PURPOSE_VALUE_TO_KEY, normalizePurposeValue } from "@/constants/requestConstants";
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
import type { RoomAvailabilityParams, RoomAvailabilityRoomDto } from "@/types/api.types";
import { VisitorRequest } from "@/types/vms.types";
import {
  getStatusConfig as getStatusStyle,
  applyOpacity,
  createModalOverlayStyle,
} from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { RequestDetailsScreenProps } from "@/types/employeeNavigation.types";
import {
  mapVisitDetailsToVisitorRequest,
  calculateDuration,
  getDurationOptions,
} from "@/utils/requestMappers";
import { calculateServerDuration, getServerDateParts } from "@/utils/dateTimeUtils";
import { computeHasVisitStarted } from "@/utils/visitStartGuard";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsVisitExpired,
  getPendingApprovalWalkInScheduledEndMs,
} from "@/utils/visitExpiredGuard";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import { formatPhoneNumber, formatPhoneForDisplay, capitalizeFirst, getInitials } from "@/utils/formatters";
import { useServerDateTime } from "@/hooks/useServerDateTime";
import { useAuth } from "@/contexts/AuthContext";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";


export default function RequestDetailsScreen({
  navigation,
  route,
  userRole = "employee",
}: RequestDetailsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    formatDateForApi,
    formatTimeForApi,
    formatTime24ForApi,
    formatDateForDisplay,
    formatTimeForDisplay,
    parseDateTime,
  } = useServerDateTime();
  const {
    formatDate,
    formatDateShort,
    formatTime,
    formatDateTime: fmtDateTime,
    formatTimeRange,
    formatVisitTimeRange,
    toLocalNumerals,
    parseISODuration,
    parseTimeString,
    formatTimeFromString,
  } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [expiredFooterHeight, setExpiredFooterHeight] = useState(0);
  const handleExpiredFooterLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const nextHeight = Math.ceil(event.nativeEvent.layout.height);
      setExpiredFooterHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      );
    },
    [],
  );
  const { width: screenWidth } = useWindowDimensions();
  const { requestId } = route.params;
  
  // Responsive layout: use grid on web (>768px), single column on mobile
  const isWebLayout = screenWidth >= 768;
  const gridItemWidth = screenWidth >= 900 ? '32%' : '48%';
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
  const [selectedEditRoomId, setSelectedEditRoomId] = useState<string | null>(null);
  const [editRequiresBuffet, setEditRequiresBuffet] = useState(false);
  const [editRequiresValet, setEditRequiresValet] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editEndTime, setEditEndTime] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  });
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [showEditEndTimePicker, setShowEditEndTimePicker] = useState(false);
  const [showPurposePicker, setShowPurposePicker] = useState(false);
  // Inline picker mode for iOS (can't stack Modals on iOS)
  const [inlinePickerMode, setInlinePickerMode] = useState<'none' | 'purpose' | 'endTime' | 'startTime' | 'date'>('none');
  const [editSendWhatsApp, setEditSendWhatsApp] = useState(false);
  const [editSendSMS, setEditSendSMS] = useState(false);
  const [editModalMode, setEditModalMode] = useState<"full" | "services-only">(
    "full",
  );
  const [isApprovalFlow, setIsApprovalFlow] = useState(false);
  const [approvalStartTime, setApprovalStartTime] = useState<Date | null>(null);

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
  const initializeEditServices = (data: typeof visitData) => {
    const requiresBuffet = !!data?.buffet;
    setEditRequiresMeetingRoom(!!data?.meetingRoom || requiresBuffet);
    setEditRequiresBuffet(requiresBuffet);
  };
  const cancelMutation = useCancelVisitMutation();
  const updateMutation = useUpdateVisitMutation();
  const hostApproveMutation = useHostApproveVisitMutation();
  const hostRejectMutation = useHostRejectVisitMutation();
  const managerApproveMutation = useApproveVisitMutation();
  const managerRejectMutation = useRejectVisitMutation();

  // Room availability check for edit modal
  const formatDateForApiLocal = (date: Date): string => {
    return formatDateForApi(date);
  };

  const formatTimeForQuery = (time: Date): string => {
    return formatTime24ForApi(time);
  };

  const editRoomAvailabilityParams: RoomAvailabilityParams | null =
    showEditModal &&
    editRequiresMeetingRoom &&
    editDate &&
    editTime &&
    editEndTime
      ? {
          date: formatDateForApiLocal(editDate),
          startTime: formatTimeForQuery(editTime),
          endTime: formatTimeForQuery(editEndTime),
        }
      : null;

  const {
    data: editRoomAvailability,
    isLoading: isLoadingEditRooms,
    isFetching: isFetchingEditRooms,
    isError: isEditRoomsError,
  } = useRoomAvailabilityQuery(editRoomAvailabilityParams);

  const isEditRoomAvailable = editRoomAvailability?.available === true;
  const availableEditRooms: RoomAvailabilityRoomDto[] = editRoomAvailability?.rooms ?? [];
  const hasCheckedEditAvailability =
    (editRoomAvailability !== undefined || isEditRoomsError) &&
    !isLoadingEditRooms &&
    !isFetchingEditRooms;

  // Reset room selection whenever the time slot changes so the user must re-pick
  useEffect(() => {
    setSelectedEditRoomId(null);
  }, [editRoomAvailabilityParams?.date, editRoomAvailabilityParams?.startTime, editRoomAvailabilityParams?.endTime]);

  const request = useMemo(() => {
    if (!visitData) return null;
    return mapVisitDetailsToVisitorRequest(visitData);
  }, [visitData]);

  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();

  // Tick every minute so hasVisitStarted re-evaluates while the screen is open.
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setMinuteTick(t => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Check if the visit START time has passed — once started, the request is no longer editable.
  // Logic lives in utils/visitStartGuard.ts so it can be unit-tested without rendering this screen.
  const hasVisitStarted = useMemo(
    () => computeHasVisitStarted(request?.visitStartAt, request?.visitDate, request?.visitTime),
    [request?.visitStartAt, request?.visitDate, request?.visitTime, minuteTick], // minuteTick forces re-evaluation every minute
  );

  // Check if the visit date/time has passed - disable approval actions for expired visits
  // Uses mapped request object for consistency with display data.
  // A visit is only expired when the END time has passed, not the start time.
  // minuteTick forces re-evaluation every minute so the buttons disappear in
  // real-time if the visit ends while this screen is open.
  const pendingApprovalExpirationBoundary = useMemo(
    () =>
      getPendingApprovalWalkInScheduledEndMs({
        isWalkIn: request?.isWalkIn,
        status: request?.status,
        visitDate: request?.visitDate,
        visitTime: request?.visitTime,
        endTime: request?.endTime,
        duration: request?.duration,
      }),
    [
      request?.duration,
      request?.endTime,
      request?.isWalkIn,
      request?.status,
      request?.visitDate,
      request?.visitTime,
    ],
  );
  const pendingApprovalExpirationTick = useTimeBoundaryTick([
    pendingApprovalExpirationBoundary,
  ]);
  const isPendingApprovalWalkInExpired = useMemo(
    () =>
      computeIsPendingApprovalWalkInExpired({
        isWalkIn: request?.isWalkIn,
        status: request?.status,
        visitDate: request?.visitDate,
        visitTime: request?.visitTime,
        endTime: request?.endTime,
        duration: request?.duration,
      }),
    [
      pendingApprovalExpirationTick,
      request?.duration,
      request?.endTime,
      request?.isWalkIn,
      request?.status,
      request?.visitDate,
      request?.visitTime,
    ],
  );
  const isVisitExpired = useMemo(
    () =>
      isPendingApprovalWalkInExpired ||
      computeIsVisitExpired(
        request?.visitDate,
        request?.visitTime,
        request?.endTime,
        request?.duration,
        { isWalkIn: request?.isWalkIn },
      ),
    [
      request?.visitDate,
      request?.visitTime,
      request?.endTime,
      request?.duration,
      request?.isWalkIn,
      riyadhBusinessDateKey,
      minuteTick, // forces re-evaluation every minute while the screen is open
      isPendingApprovalWalkInExpired,
    ],
  );

  const computeCurrentPendingHostWalkInExpiration = useCallback(() => {
    if (
      !request?.isWalkIn ||
      request.status !== REQUEST_STATUS.PENDING_HOST_APPROVAL
    ) {
      return false;
    }

    return computeIsVisitExpired(
      request.visitDate,
      request.visitTime,
      request.endTime,
      request.duration,
      { isWalkIn: true },
    );
  }, [
    request?.duration,
    request?.endTime,
    request?.isWalkIn,
    request?.status,
    request?.visitDate,
    request?.visitTime,
  ]);

  const isExpiredPendingHostWalkIn = useMemo(
    () => computeCurrentPendingHostWalkInExpiration(),
    [
      computeCurrentPendingHostWalkInExpiration,
      riyadhBusinessDateKey,
      minuteTick,
    ],
  );

  useEffect(() => {
    if (!isExpiredPendingHostWalkIn || !showHostRejectModal) return;
    setShowHostRejectModal(false);
    setHostRejectReason("");
  }, [isExpiredPendingHostWalkIn, showHostRejectModal]);
  useEffect(() => {
    if (!isVisitExpired || !showManagerRejectModal) return;
    setShowManagerRejectModal(false);
    setManagerRejectReason("");
  }, [isVisitExpired, showManagerRejectModal]);

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

  const isCancelledVisit = useMemo(() => {
    if (!request) return false;
    return [
      REQUEST_STATUS.CANCELLED,
      REQUEST_STATUS.AUTO_CANCELLED,
      REQUEST_STATUS.REJECTED,
      REQUEST_STATUS.VISITOR_REJECTED,
    ].includes(request.status as any);
  }, [request]);

  const showExpiredWalkInFooter =
    request?.isWalkIn &&
    ((request?.status === REQUEST_STATUS.PENDING_HOST_APPROVAL &&
      isExpiredPendingHostWalkIn) ||
      isPendingApprovalWalkInExpired);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: showExpiredWalkInFooter
      ? Math.max(expiredFooterHeight, insets.bottom + Spacing.xl)
      : insets.bottom + Spacing.xl,
  };

  const isProcessing =
    cancelMutation.isPending ||
    updateMutation.isPending ||
    hostApproveMutation.isPending ||
    hostRejectMutation.isPending ||
    managerApproveMutation.isPending ||
    managerRejectMutation.isPending;

  const timelineData: TimelineData = useMemo(
    () => ({
      createdAt: request?.createdAt || "",
      status: request?.status || "",
      approval: {
        requiresApproval: request?.approval?.requiresApproval ?? false,
        autoApproved: request?.approval?.autoApproved ?? false,
        approvedAt: request?.approval?.approvedAt,
        rejectedAt: request?.approval?.rejectedAt,
        rejectionReason: request?.approval?.rejectionReason,
      },
      hostApproval: (request as any)?.hostApproval
        ? {
            required: true,
            approvedAt: (request as any).hostApproval.approvedAt,
            rejectedAt: (request as any).hostApproval.rejectedAt,
          }
        : undefined,
      acceptedAt: request?.acceptedAt,
      checkedInAt: request?.checkedInAt,
      checkedOutAt: (request as any)?.checkedOutAt,
      completedAt: request?.completedAt,
      cancelledAt: request?.cancelledAt,
      timeline: (request as any)?.timeline,
    }),
    [request],
  );

  const handleHostApproveForTimeline = () => {
    if (computeCurrentPendingHostWalkInExpiration()) return;

    const approvalTime = new Date();
    hostApproveMutation.mutate(
      { id: requestId },
      {
        onSuccess: () => {
          if (visitData) {
            setEditPurpose(normalizePurposeValue(visitData.purpose || ""));
            setEditRequiresParking(visitData.parkingType !== "none");
            setEditRequiresValet(visitData.parkingType === "valet");
            initializeEditServices(visitData);
            const channels = (visitData.communicationChannels || []).map((c) =>
              c.toLowerCase(),
            );
            setEditSendWhatsApp(channels.includes("whatsapp"));
            setEditSendSMS(channels.includes("sms"));
            if (visitData.isWalkIn) {
              setApprovalStartTime(approvalTime);
              setEditTime(approvalTime);
              const defaultEndTime = new Date(
                approvalTime.getTime() + 60 * 60 * 1000,
              );
              setEditEndTime(defaultEndTime);
            }
          }
          setIsApprovalFlow(true);
          setEditModalMode("services-only");
          setShowEditModal(true);
          refetch();
        },
        onError: (error: any) => {
          Alert.alert(t("errors.somethingWentWrong"), error.message);
        },
      },
    );
  };

  const timelineActionCallbacks: TimelineActionCallbacks | undefined =
    request?.status === "pending_host_approval" &&
    !isExpiredPendingHostWalkIn
      ? {
          onAccept: handleHostApproveForTimeline,
          onReject: () => setShowHostRejectModal(true),
          isAcceptLoading: hostApproveMutation.isPending,
          isRejectLoading: hostRejectMutation.isPending,
        }
      : undefined;

  const timelineSteps = useTimelineSteps({
    data: timelineData,
    role: "employee",
    flowType: "standard",
    actions: timelineActionCallbacks,
    showActions:
      request?.status === "pending_host_approval" &&
      !isExpiredPendingHostWalkIn,
  });

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
  const parkingDisplayDecision = resolveParkingDisplayDecision({
    parkingDecision: request.parkingDecision,
    visitorNeedsParking: request.visitorNeedsParking,
    isVisitorNeedsParking: request.isVisitorNeedsParking,
    hasParkingAllocation: !!request.parkingSlot,
  });

  const formatDateTimeLocal = (isoString: string, timezone?: string) => {
    const date = new Date(isoString);
    return fmtDateTime(date, timezone);
  };

  const handleCancelRequest = () => {
    if (isTerminalStatus) {
      return;
    }
    cancelMutation.mutate(requestId, {
      onSuccess: () => {
        setShowCancelModal(false);
        navigation.goBack();
      },
      onError: () => {
        Alert.alert(t("errors.somethingWentWrong"), t("errors.submitFailed"));
      },
    });
  };

  const handleHostApprove = () => {
    // Defensive guard: reject approval attempts on an already-expired visit
    // (can happen on a slow connection if the end-time passes between the
    // last minuteTick re-render and the user tapping the button).
    if (computeCurrentPendingHostWalkInExpiration()) return;

    // Capture approval start time NOW for walk-in requests
    const approvalTime = new Date();

    hostApproveMutation.mutate(
      { id: requestId },
      {
        onSuccess: () => {
          // Approval successful, now open edit modal in services-only mode for service selection
          if (visitData) {
            setEditPurpose(normalizePurposeValue(visitData.purpose || ""));
            setEditRequiresParking(visitData.parkingType !== "none");
            setEditRequiresValet(visitData.parkingType === "valet");
            initializeEditServices(visitData);

            // Initialize communication channels from existing request data
            const channels = (visitData.communicationChannels || []).map((c) =>
              c.toLowerCase(),
            );
            setEditSendWhatsApp(channels.includes("whatsapp"));
            setEditSendSMS(channels.includes("sms"));

            // For walk-in approval: store approval start time and set default end time to 1 hour later
            if (visitData.isWalkIn) {
              setApprovalStartTime(approvalTime);
              setEditTime(approvalTime);
              const defaultEndTime = new Date(
                approvalTime.getTime() + 60 * 60 * 1000,
              ); // 1 hour from approval time
              setEditEndTime(defaultEndTime);
            }
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
    if (computeCurrentPendingHostWalkInExpiration()) return;

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
    if (isVisitExpired) return;
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
    if (isVisitExpired) {
      setShowManagerRejectModal(false);
      setManagerRejectReason("");
      return;
    }
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

  const handleManagerRejectOpen = () => {
    if (isVisitExpired) return;
    setShowManagerRejectModal(true);
  };

  const formatTimeForApiLocal = (time: Date): string => {
    return formatTimeForApi(time);
  };

  // Display formatters for picker values - use server timezone from API
  const formatDisplayDate = (date: Date): string => {
    return formatDateForDisplay(date, isRTL);
  };

  const formatDisplayTime = (time: Date): string => {
    return formatTimeForDisplay(time, isRTL);
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
    if (!visitData || isTerminalStatus) {
      return;
    }

    // Block full edits once the visit has started. The services-only path (post-approval
    // walk-in service selection) is intentionally exempt — it does not touch date/time.
    if (mode === "full" && hasVisitStarted) {
      return;
    }

    setIsApprovalFlow(false);
    setEditModalMode(mode);
    setEditPurpose(normalizePurposeValue(visitData.purpose || ""));
    const visitDateStr = visitData.visitDate || formatDateForApi(new Date());
    const visitDate = new Date(visitDateStr);
    setEditDate(visitDate);
    const visitTimeStr = visitData.visitTime || formatTimeForApi(new Date());
    const startTime = parseDateTime(visitDateStr, visitTimeStr);
    setEditTime(startTime);

    // For walk-ins, use the stored end time if available; otherwise calculate from duration
    if (visitData.isWalkIn && visitData.endTime) {
      // Try to parse endTime - it could be "HH:MM", "HH:MM AM/PM", or ISO format
      let endTime: Date;
      if (visitData.endTime.includes("T") || visitData.endTime.includes("Z")) {
        // ISO format - parse directly
        endTime = new Date(visitData.endTime);
        if (isNaN(endTime.getTime())) {
          // Invalid ISO, fall back to duration calculation
          const rawDuration = visitData.duration || "1 hour";
          const durationMs = parseDurationToMs(rawDuration);
          endTime = new Date(startTime.getTime() + durationMs);
        }
      } else {
        // Time string format - use parseDateTime for consistency
        endTime = parseDateTime(visitDateStr, visitData.endTime);
      }
      setEditEndTime(endTime);
    } else {
      // Calculate end time from duration - parse API duration (supports both ISO and human-readable formats)
      const rawDuration = visitData.duration || "1 hour";
      const durationMs = parseDurationToMs(rawDuration);
      const endTime = new Date(startTime.getTime() + durationMs);
      setEditEndTime(endTime);
    }

    const rawDuration = visitData.duration || "1 hour";
    setEditDuration(parseISODuration(rawDuration));

    setEditRequiresParking(visitData.parkingType !== "none");
    initializeEditServices(visitData);
    setEditRequiresValet(visitData.parkingType === "valet");

    // Pre-select communication channels from existing request data (normalize to lowercase for comparison)
    const channels = (visitData.communicationChannels || []).map((c) =>
      c.toLowerCase(),
    );
    setEditSendWhatsApp(channels.includes("whatsapp"));
    setEditSendSMS(channels.includes("sms"));

    setEditNotes("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setIsApprovalFlow(false);
    setSelectedEditRoomId(null);
  };

  const parseDurationToMs = (duration: string): number => {
    // Parse ISO 8601 duration (e.g., "PT1H30M")
    if (duration.startsWith("PT")) {
      const hoursMatch = duration.match(/(\d+)H/);
      const minutesMatch = duration.match(/(\d+)M/);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      return (hours * 60 + minutes) * 60 * 1000;
    }
    // Parse human-readable format (e.g., "2 hours 10 minutes", "1hour", "30 minutes", "1h 30m")
    let totalMs = 0;
    const hoursMatch = duration.match(/(\d+)\s*(?:hours?|h\b)/i);
    const minutesMatch = duration.match(/(\d+)\s*(?:minutes?|mins?|m\b)/i);
    if (hoursMatch) {
      totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
    }
    if (minutesMatch) {
      totalMs += parseInt(minutesMatch[1]) * 60 * 1000;
    }
    return totalMs > 0 ? totalMs : 60 * 60 * 1000; // Default 1 hour if parsing fails
  };

  const calculateEditDuration = (): string => {
    // Normalize both times to the same reference date to only compare time-of-day
    const referenceDate = new Date(2000, 0, 1);
    const startNormalized = new Date(referenceDate);
    startNormalized.setHours(editTime.getHours(), editTime.getMinutes(), 0, 0);
    const endNormalized = new Date(referenceDate);
    endNormalized.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
    
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

  const isEditEndTimeBeforeStartTime = (): boolean => {
    // Normalize both times to the same reference date to only compare time-of-day
    const referenceDate = new Date(2000, 0, 1);
    const startNormalized = new Date(referenceDate);
    startNormalized.setHours(editTime.getHours(), editTime.getMinutes(), 0, 0);
    const endNormalized = new Date(referenceDate);
    endNormalized.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
    
    return endNormalized.getTime() <= startNormalized.getTime();
  };

  const isWalkInEndTimeBeforeStartTime = (): boolean => {
    const startTime = editTime;
    const refDate = new Date(2000, 0, 1);
    const startNorm = new Date(refDate);
    startNorm.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const endNorm = new Date(refDate);
    endNorm.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
    return endNorm.getTime() <= startNorm.getTime();
  };

  const calculateWalkInDuration = (): string => {
    const startTime = editTime;
    const refDate = new Date(2000, 0, 1);
    const startNorm = new Date(refDate);
    startNorm.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const endNorm = new Date(refDate);
    endNorm.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
    const diffMs = endNorm.getTime() - startNorm.getTime();

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
      let timeToSet = selectedTime;
      if (isApprovalFlow) {
        const now = new Date();
        if (timeToSet < now) {
          timeToSet = now;
        }
        setApprovalStartTime(timeToSet);
      }
      setEditTime(timeToSet);
      if (editEndTime <= timeToSet) {
        const newEnd = new Date(timeToSet.getTime() + 60 * 60 * 1000);
        setEditEndTime(newEnd);
      }
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
    const requiresMeetingRoom = editRequiresMeetingRoom || editRequiresBuffet;

    // Validate meeting room selection before submitting
    if (requiresMeetingRoom && (isLoadingEditRooms || isFetchingEditRooms)) {
      Alert.alert(t("errors.validation"), t("errors.meetingRoomLoading"));
      return;
    }
    // An availability error is not evidence that a room is available. Keep
    // this guard here as well as on the button so programmatic submits cannot
    // bypass a failed check.
    if (requiresMeetingRoom && isEditRoomsError) {
      Alert.alert(t("errors.validation"), t("errors.meetingRoomCheckFailed"));
      return;
    }
    if (
      requiresMeetingRoom &&
      hasCheckedEditAvailability &&
      (!isEditRoomAvailable || availableEditRooms.length === 0)
    ) {
      Alert.alert(t("errors.validation"), t("errors.noRoomsAvailable"));
      return;
    }
    if (requiresMeetingRoom && hasCheckedEditAvailability && isEditRoomAvailable && availableEditRooms.length > 0 && !selectedEditRoomId) {
      Alert.alert(t("errors.validation"), t("errors.meetingRoomRequired"));
      return;
    }

    // Build communication channels array - always include email and qr_code
    const communicationChannels: ("email" | "sms" | "whatsapp" | "qr_code")[] =
      ["email", "qr_code"];
    if (editSendSMS) communicationChannels.push("sms");
    if (editSendWhatsApp) communicationChannels.push("whatsapp");

    const payload: Record<string, unknown> = {
      purpose: editPurpose,
      needsParking: editRequiresParking,
      needsMeetingRoom: requiresMeetingRoom,
      meetingRoomId: requiresMeetingRoom && selectedEditRoomId ? selectedEditRoomId : undefined,
      needsBuffet: editRequiresBuffet,
      needsValet: editRequiresValet,
      communicationChannels,
    };

    if (editModalMode === "full") {
      // Full mode: use the edited date/time values
      payload.visitDate = formatDateForApiLocal(editDate);
      payload.visitTime = formatTimeForApiLocal(editTime);
      payload.endTime = formatTimeForApiLocal(editEndTime);

      // Calculate human-readable duration from start and end times
      // Normalize both times to the same date to avoid date-mismatch issues from picker initialization
      const startNormalized = new Date(editDate);
      startNormalized.setHours(editTime.getHours(), editTime.getMinutes(), 0, 0);
      const endNormalized = new Date(editDate);
      endNormalized.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
      payload.duration = calculateServerDuration(startNormalized, endNormalized);
    } else if (editModalMode === "services-only" && visitData) {
      // Services-only mode
      if (isApprovalFlow && visitData.isWalkIn) {
        // Walk-in approval: use user-selected start time (editTime is always kept in sync)
        const startTime = editTime || approvalStartTime || new Date();

        // Validate end time is after start time (normalize to same date for time-of-day comparison)
        const refDate = new Date(2000, 0, 1);
        const startNorm = new Date(refDate);
        startNorm.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        const endNorm = new Date(refDate);
        endNorm.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
        if (endNorm.getTime() <= startNorm.getTime()) {
          Alert.alert(t("errors.validation"), t("errors.endTimeBeforeStartTime"));
          return;
        }

        payload.visitDate = formatDateForApiLocal(startTime);
        payload.visitTime = formatTimeForApiLocal(startTime);
        payload.endTime = formatTimeForApiLocal(editEndTime);

        const endNormalizedForWalkIn = new Date(startTime);
        endNormalizedForWalkIn.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
        payload.duration = calculateServerDuration(startTime, endNormalizedForWalkIn);

        setApprovalStartTime(null);
      } else if (visitData.isWalkIn) {
        // Walk-in edit (not approval flow): use user-selected start time
        const startTime = editTime || new Date();

        // Validate end time is after start time (normalize to same date for time-of-day comparison)
        const refDate = new Date(2000, 0, 1);
        const startNorm = new Date(refDate);
        startNorm.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        const endNorm = new Date(refDate);
        endNorm.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
        if (endNorm.getTime() <= startNorm.getTime()) {
          Alert.alert(t("errors.validation"), t("errors.endTimeBeforeStartTime"));
          return;
        }

        // Use the visit's existing date with the user-selected time
        const visitDate = visitData.visitDate || formatDateForApiLocal(new Date());
        payload.visitDate = visitDate;
        payload.visitTime = formatTimeForApiLocal(startTime);
        payload.endTime = formatTimeForApiLocal(editEndTime);

        const startForDuration = new Date(refDate);
        startForDuration.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        const endForDuration = new Date(refDate);
        endForDuration.setHours(editEndTime.getHours(), editEndTime.getMinutes(), 0, 0);
        payload.duration = calculateServerDuration(
          startForDuration,
          endForDuration,
        );
      } else {
        // Non-walk-in services-only edit: use existing schedule fields
        payload.visitDate =
          visitData.visitDate || formatDateForApiLocal(new Date());
        payload.visitTime =
          visitData.visitTime || formatTimeForApiLocal(new Date());
        payload.endTime =
          visitData.endTime || formatTimeForApiLocal(editEndTime);
        payload.duration = visitData.duration || "1 hour";
      }
    }

    updateMutation.mutate(
      { id: requestId, data: payload },
      {
        onSuccess: () => {
          setShowEditModal(false);
          let message = t("notifications.visitUpdated");
          if (isApprovalFlow) {
            const hasAutoApproval = user?.autoApproval === true;
            message = hasAutoApproval
              ? t("notifications.walkInApproved")
              : t("notifications.walkInForwardedToManager");
          }
          setSuccessMessage(message);
          setShowSuccessModal(true);
          setIsApprovalFlow(false);
        },
        onError: () => {
          Alert.alert(t("errors.somethingWentWrong"), t("errors.submitFailed"));
        },
      },
    );
  };

  const statusConfig = getStatusStyle(theme, request.status, t);

  const getServiceStatusVariant = (
    status?: string,
  ): "success" | "warning" | "error" | "info" | "muted" => {
    if (!status) return "muted";
    const lowerStatus = status.toLowerCase();
    if (
      [
        "active",
        "scheduled",
        "allocated",
        "confirmed",
        "in_progress",
        "ready",
        "served",
      ].includes(lowerStatus)
    )
      return "success";
    if (["pending", "awaiting", "preparing"].includes(lowerStatus))
      return "warning";
    if (["cancelled", "expired", "no_show", "released"].includes(lowerStatus))
      return "error";
    if (["completed", "checked_out", "checked_in"].includes(lowerStatus))
      return "info";
    return "muted";
  };

  const formatServiceStatus = (status?: string): string => {
    if (!status) return "";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const canHostApproveWalkIn =
    request.isWalkIn &&
    request.status === REQUEST_STATUS.PENDING_HOST_APPROVAL &&
    !isExpiredPendingHostWalkIn;
  const canManagerApproveRequest =
    request.canApprove === true &&
    userRole === "manager" &&
    !canHostApproveWalkIn &&
    !isVisitExpired;
  const showInlineExpiredVisitNotice =
    isVisitExpired &&
    !request.isWalkIn &&
    request.status === REQUEST_STATUS.PENDING_APPROVAL &&
    userRole === "manager";
  const showStickyFooter =
    showExpiredWalkInFooter ||
    canHostApproveWalkIn ||
    canManagerApproveRequest ||
    (request.status !== REQUEST_STATUS.PENDING_HOST_APPROVAL &&
      !(
        request.status === REQUEST_STATUS.PENDING_APPROVAL &&
        userRole === "manager"
      ) &&
      request.status !== REQUEST_STATUS.COMPLETED &&
      request.status !== REQUEST_STATUS.CANCELLED &&
      request.status !== REQUEST_STATUS.REJECTED &&
      request.status !== REQUEST_STATUS.VISITOR_REJECTED &&
      request.status !== REQUEST_STATUS.AUTO_CANCELLED);

  const expiredVisitNotice = (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
      }}
    >
      <DirectionalRow
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: Spacing.xs,
        }}
      >
        <DDIcon name="alert-circle" size={16} color={theme.warning} />
        <ThemedText
          style={[
            Typography.caption,
            {
              color: theme.warning,
              fontWeight: "600",
              textAlign: "center",
            },
          ]}
        >
          {t("status.visitExpired")}
        </ThemedText>
      </DirectionalRow>
      <ThemedText
        style={[
          Typography.caption,
          {
            color: theme.textSecondary,
            textAlign: "center",
            marginTop: 2,
            fontSize: 12,
          },
        ]}
      >
        {t("errors.visitDatePassed")}
      </ThemedText>
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      <ScreenScrollView
        contentContainerStyle={[
          scrollContentStyle,
          showStickyFooter && { paddingBottom: insets.bottom + 120 },
        ]}
      >
        {/* Rejection/Decline Reason */}
        {request.approval.rejectedAt && request.approval.rejectionReason ? (
          <>
            <ThemedView
              style={[
                styles.alertBox,
                {
                  flexDirection: getFlexDirection(isRTL),
                  backgroundColor: applyOpacity(theme.error, "10"),
                  borderStartColor: theme.error,
                  borderStartWidth: 4,
                },
              ]}
            >
              <>
                <DDIcon name="alert-circle" size={16} variant="danger" />
                <ThemedText
                  style={[
                    Typography.bodySmall,
                    { marginStart: Spacing.sm, flex: 1, color: theme.error },
                  ]}
                >
                  {t("form.reason")}: {request.approval.rejectionReason}
                </ThemedText>
              </>
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
                  flexDirection: getFlexDirection(isRTL),
                  backgroundColor: applyOpacity(theme.error, "10"),
                  borderStartColor: theme.error,
                  borderStartWidth: 4,
                },
              ]}
            >
              {isRTL ? (
                <>
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        marginStart: Spacing.sm,
                        flex: 1,
                        color: theme.error,
                        textAlign: "right",
                      },
                    ]}
                  >
                    {t("visitor.visitorDeclineReason")}:{" "}
                    {request.visitorDecision.reason}
                  </ThemedText>
                  <DDIcon name="user-x" size={16} variant="danger" />
                </>
              ) : (
                <>
                  <DDIcon name="user-x" size={16} variant="danger" />
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        marginStart: Spacing.sm,
                        flex: 1,
                        color: theme.error,
                        textAlign: "left",
                      },
                    ]}
                  >
                    {t("visitor.visitorDeclineReason")}:{" "}
                    {request.visitorDecision.reason}
                  </ThemedText>
                </>
              )}
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
                  name={
                    request.approval.approvedAt ? "check-circle" : "x-circle"
                  }
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
                      //  
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
                  {
                    color: theme.textSecondary,
                    fontSize: 14,
                    lineHeight: 20,
                    //    
                  },
                ]}
              >
                {request.approval.managerComment}
              </ThemedText>
              {request.approval.managerName && (
                <>
                  <Spacer height={Spacing.md} />
                  <DirectionalRow style={{ alignItems: "center" }}>
                    {isRTL ? (
                      <>
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
                            {
                              marginStart: 6,
                              color: theme.textSecondary,
                              fontSize: 11,
                            },
                          ]}
                        >
                          {request.approval.managerName}
                        </ThemedText>
                        <DDIcon name="user" size={12} variant="muted" />
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </DirectionalRow>
                </>
              )}
            </ThemedView>
            <Spacer height={Spacing.lg} />
          </>
        ) : null}

        {/* Walk-in Notes */}
        {request.isWalkIn && request.notes ? (
          <>
            <ThemedView
              style={[styles.cardNew, { backgroundColor: theme.surface }]}
            >
              <DirectionalRow style={{ alignItems: "center" }}>
                <>
                  <DDIcon name="file-text" size={16} color={theme.info} />
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
                    {t("form.notes")}
                  </ThemedText>
                </>
              </DirectionalRow>
              <Spacer height={Spacing.sm} />
              <ThemedText
                style={[
                  Typography.body,
                  { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
                ]}
              >
                {request.notes}
              </ThemedText>
            </ThemedView>
            <Spacer height={Spacing.lg} />
          </>
        ) : null}

        <ThemedView
          style={[styles.cardNew, { backgroundColor: theme.surface }]}
        >
          {/* Responsive visitor header - compact row on web, centered stack on mobile */}
          {isWebLayout ? (
            <DirectionalRow style={{ alignItems: 'center', justifyContent: 'space-between', gap: Spacing.lg }}>
              {/* Left group: Avatar, Name, Status */}
              <DirectionalRow style={{ alignItems: 'center', gap: Spacing.lg, flexShrink: 1 }}>
                {/* Avatar */}
                <View
                  style={[
                    styles.avatarNew,
                    { backgroundColor: applyOpacity(theme.primary, "15"), width: 56, height: 56 },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.avatarText,
                      { color: theme.primary, fontSize: 24, fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {getInitials(request.visitor.fullName)}
                  </ThemedText>
                </View>

                {/* Name and Company */}
                <View style={{ minWidth: 100, flexShrink: 1 }}>
                  <ThemedText
                    style={[Typography.title, { fontWeight: "600", fontSize: 18, color: theme.text }]}
                    numberOfLines={1}
                  >
                    {capitalizeFirst(request.visitor.fullName)}
                  </ThemedText>
                  {request.visitor.company && (
                    <ThemedText
                      style={[Typography.body, { color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}
                      numberOfLines={1}
                    >
                      {request.visitor.company}
                    </ThemedText>
                  )}
                </View>

                {/* Status Badge */}
                <RequestStatusBadge status={request.status} />
              </DirectionalRow>

              {/* Right group: Contact info */}
              <DirectionalRow style={{ alignItems: 'center', gap: Spacing.lg, flexShrink: 0 }}>
                {/* Email — only shown when present */}
                {request.visitor.email ? (
                  <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                    <View
                      style={[
                        styles.serviceIcon,
                        { backgroundColor: applyOpacity(theme.textSecondary, "15"), width: 32, height: 32 },
                      ]}
                    >
                      <DDIcon name="mail" size={16} color={theme.text} />
                    </View>
                    <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14 }]}>
                      {request.visitor.email}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}

                {/* Phone */}
                <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                  <View
                    style={[
                      styles.serviceIcon,
                      { backgroundColor: applyOpacity(theme.textSecondary, "15"), width: 32, height: 32 },
                    ]}
                  >
                    <DDIcon name="phone" size={16} color={theme.text} />
                  </View>
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, writingDirection: 'ltr' }]}>
                    {formatPhoneForDisplay(request.visitor.phone || '')}
                  </ThemedText>
                </DirectionalRow>
              </DirectionalRow>
            </DirectionalRow>
          ) : (
            <>
              {/* Mobile layout - centered stack */}
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
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {getInitials(request.visitor.fullName)}
                  </ThemedText>
                </View>

                <Spacer height={Spacing.lg} />

                <ThemedText
                  style={[Typography.title, { fontWeight: "600", fontSize: 22, color: theme.text }]}
                >
                  {capitalizeFirst(request.visitor.fullName)}
                </ThemedText>
                <ThemedText
                  style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginTop: 4 }]}
                >
                  {request.visitor.company}
                </ThemedText>

                <Spacer height={Spacing.sm} />

                <View style={{ alignSelf: 'center' }}>
                  <RequestStatusBadge status={request.status} />
                </View>
              </View>

              <Spacer height={Spacing.xl} />

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <Spacer height={Spacing.lg} />

              {request.visitor.email ? (
                <>
                  <DirectionalRow
                    style={[styles.infoRowNew, { justifyContent: "flex-start", gap: Spacing.md }]}
                  >
                    <View
                      style={[
                        styles.serviceIcon,
                        { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                      ]}
                    >
                      <DDIcon name="mail" size={18} color={theme.text} />
                    </View>
                    <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14 }]}>
                      {request.visitor.email}
                    </ThemedText>
                  </DirectionalRow>
                  <Spacer height={Spacing.md} />
                </>
              ) : null}

              <DirectionalRow
                style={[styles.infoRowNew, { justifyContent: "flex-start", gap: Spacing.md }]}
              >
                <View
                  style={[
                    styles.serviceIcon,
                    { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                  ]}
                >
                  <DDIcon name="phone" size={18} color={theme.text} />
                </View>
                <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, writingDirection: 'ltr' }]}>
                  {formatPhoneForDisplay(request.visitor.phone || '')}
                </ThemedText>
              </DirectionalRow>
            </>
          )}
        </ThemedView>

        <Spacer height={Spacing.lg} />

        <ThemedView
          style={[styles.cardNew, { backgroundColor: theme.surface }]}
        >
          <DirectionalRow
            style={{ alignItems: "center", justifyContent: "space-between" }}
          >
            {isRTL ? (
              <>
                {request.isWalkIn ? (
                  <DirectionalRow
                    style={{
                      alignItems: "center",
                      gap: Spacing.xs,
                      backgroundColor: applyOpacity(theme.warning, "15"),
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: Spacing.xs,
                      borderRadius: BorderRadius.sm,
                    }}
                  >
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: theme.warning,
                          fontWeight: "600",
                          fontSize: 11,
                        },
                      ]}
                    >
                      {t("reception.walkInVisitor")}
                    </ThemedText>
                    <DDIcon name="user-check" size={14} color={theme.warning} />
                  </DirectionalRow>
                ) : null}
                <ThemedText
                  style={[
                    Typography.subtitle,
                    {
                      fontSize: 16,
                      fontWeight: "600",
                      color: theme.text,
                      // textAlign: "right",
                      flex: 1,
                    },
                  ]}
                >
                  {t("visitor.visitDetails")}
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText
                  style={[
                    Typography.subtitle,
                    {
                      fontSize: 16,
                      fontWeight: "600",
                      color: theme.text,
                      //   textAlign: "left",
                      flex: 1,
                    },
                  ]}
                >
                  {t("visitor.visitDetails")}
                </ThemedText>
                {request.isWalkIn ? (
                  <DirectionalRow
                    style={{
                      alignItems: "center",
                      gap: Spacing.xs,
                      backgroundColor: applyOpacity(theme.warning, "15"),
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: Spacing.xs,
                      borderRadius: BorderRadius.sm,
                    }}
                  >
                    <DDIcon name="user-check" size={14} color={theme.warning} />
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: theme.warning,
                          fontWeight: "600",
                          fontSize: 11,
                        },
                      ]}
                    >
                      {t("reception.walkInVisitor")}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
              </>
            )}
          </DirectionalRow>
          <Spacer height={Spacing.xl} />

          {/* Responsive grid for Visit Details items */}
          <View style={isWebLayout ? styles.responsiveGrid : undefined}>
            {/* Date & Time */}
            <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
              <DirectionalRow
                style={[styles.serviceRowNew, { justifyContent: "flex-start" }]}
              >
                <View
                  style={[
                    styles.serviceIcon,
                    {
                      backgroundColor: applyOpacity(
                        isVisitExpired ? theme.secondary : theme.textSecondary,
                        "15",
                      ),
                    },
                  ]}
                >
                  <DDIcon
                    name={isVisitExpired ? "check-circle" : "calendar"}
                    size={18}
                    color={isVisitExpired ? theme.secondary : theme.text}
                  />
                </View>
                <View>
                  <DirectionalRow
                    style={{ alignItems: "center", gap: Spacing.xs }}
                  >
                    <ThemedText
                      style={[
                        Typography.body,
                        { fontWeight: "600", fontSize: 15 },
                      ]}
                    >
                      {t("time.dateAndTime")}
                    </ThemedText>
                    {isVisitExpired ? (
                      <DDIcon name="check" size={14} color={theme.secondary} />
                    ) : null}
                  </DirectionalRow>
                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.textSecondary, marginTop: 2, fontSize: 13 },
                    ]}
                  >
                    {formatDateShort(request.visitDate)} •{" "}
                    {formatVisitTimeRange(request.visitTime, request.endTime)}
                  </ThemedText>
                  {/* Calendar sync badge — visible once the Outlook event is created */}
                  {(request as any).calendarSynced === true ? (() => {
                    const isCancelled = request.status === 'cancelled' || request.status === 'auto_cancelled';
                    return (
                      <DirectionalRow style={{ alignItems: 'center', marginTop: 4, gap: 4 }}>
                        <DDIcon
                          name="calendar"
                          size={12}
                          color={isCancelled ? theme.textSecondary : theme.success}
                        />
                        <ThemedText style={[
                          Typography.caption,
                          { fontSize: 11, color: isCancelled ? theme.textSecondary : theme.success },
                        ]}>
                          {isCancelled ? t('calendar.eventCancelled') : t('calendar.syncedToOutlook')}
                        </ThemedText>
                      </DirectionalRow>
                    );
                  })() : null}
                </View>
              </DirectionalRow>
              {!isWebLayout && <Spacer height={Spacing.lg} />}
            </View>

            {/* Duration */}
            <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
              <DirectionalRow
                style={[styles.serviceRowNew, { justifyContent: "flex-start" }]}
              >
                <View
                  style={[
                    styles.serviceIcon,
                    { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                  ]}
                >
                  <DDIcon name="clock" size={18} color={theme.text} />
                </View>
                <View>
                  <ThemedText
                    style={[Typography.body, { fontWeight: "600", fontSize: 15 }]}
                  >
                    {t("form.duration")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.textSecondary, marginTop: 2, fontSize: 13 },
                    ]}
                  >
                    {parseISODuration(request.duration)}
                  </ThemedText>
                </View>
              </DirectionalRow>
              {!isWebLayout && <Spacer height={Spacing.lg} />}
            </View>

            {/* Purpose */}
            <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
              <DirectionalRow style={[styles.serviceRowNew]}>
                <View
                  style={[
                    styles.serviceIcon,
                    { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                  ]}
                >
                  <DDIcon name="briefcase" size={18} color={theme.text} />
                </View>
                <View>
                  <ThemedText
                    style={[Typography.body, { fontWeight: "600", fontSize: 15 }]}
                  >
                    {t("form.purpose")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: theme.textSecondary,
                        marginTop: 2,
                        fontSize: 13,
                        lineHeight: 20,
                      },
                    ]}
                  >
                    {(() => { const pv = normalizePurposeValue(request.purpose || ''); return PURPOSE_VALUE_TO_KEY[pv] ? t(PURPOSE_VALUE_TO_KEY[pv] as any) : (request.purpose || '-'); })()}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </View>
          </View>
        </ThemedView>

        <Spacer height={Spacing.lg} />

        {/* Host Details Section - only show if we have host phone info */}
        {(request.employeePhoneNumber || request.employeeBusinessPhone) && (
          <>
            <ThemedView
              style={[styles.cardNew, { backgroundColor: theme.surface }]}
            >
              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 16, fontWeight: "600", color: theme.text },
                ]}
              >
                {t("visitor.hostDetails")}
              </ThemedText>
              <Spacer height={Spacing.xl} />

              {/* Responsive grid for Host Details items */}
              <View style={isWebLayout ? styles.responsiveGrid : undefined}>
                {/* Host Name */}
                <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
                  <DirectionalRow
                    style={[styles.serviceRowNew, { justifyContent: "flex-start" }]}
                  >
                    <View
                      style={[
                        styles.serviceIcon,
                        { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                      ]}
                    >
                      <DDIcon name="user" size={18} color={theme.text} />
                    </View>
                    <View>
                      <ThemedText
                        style={[Typography.body, { fontWeight: "600", fontSize: 15 }]}
                      >
                        {t("visitor.hostName")}
                      </ThemedText>
                      <ThemedText
                        style={[
                          Typography.caption,
                          { color: theme.textSecondary, marginTop: 2, fontSize: 13 },
                        ]}
                      >
                        {request.employeeName}
                        {request.employeeDepartment ? ` (${request.employeeDepartment})` : ''}
                      </ThemedText>
                    </View>
                  </DirectionalRow>
                  {!isWebLayout && <Spacer height={Spacing.md} />}
                </View>

                {/* Host Phone */}
                {request.employeePhoneNumber && (
                  <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
                    <DirectionalRow
                      style={[styles.serviceRowNew, { justifyContent: "flex-start" }]}
                    >
                      <View
                        style={[
                          styles.serviceIcon,
                          { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                        ]}
                      >
                        <DDIcon name="phone" size={18} color={theme.text} />
                      </View>
                      <View>
                        <ThemedText
                          style={[Typography.body, { fontWeight: "600", fontSize: 15 }]}
                        >
                          {t("form.phone")}
                        </ThemedText>
                        <ThemedText
                          style={[
                            Typography.caption,
                            { color: theme.textSecondary, marginTop: 2, fontSize: 13, writingDirection: 'ltr' },
                          ]}
                        >
                          {formatPhoneNumber(request.employeePhoneNumber || '')}
                        </ThemedText>
                      </View>
                    </DirectionalRow>
                    {!isWebLayout && <Spacer height={Spacing.md} />}
                  </View>
                )}

                {/* Host Landline */}
                {request.employeeBusinessPhone && (
                  <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
                    <DirectionalRow
                      style={[styles.serviceRowNew, { justifyContent: "flex-start" }]}
                    >
                      <View
                        style={[
                          styles.serviceIcon,
                          { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                        ]}
                      >
                        <DDIcon name="phone" size={18} color={theme.text} />
                      </View>
                      <View>
                        <ThemedText
                          style={[Typography.body, { fontWeight: "600", fontSize: 15 }]}
                        >
                          {t("form.landline")}
                        </ThemedText>
                        <ThemedText
                          style={[
                            Typography.caption,
                            { color: theme.textSecondary, marginTop: 2, fontSize: 13, writingDirection: 'ltr' },
                          ]}
                        >
                          {formatPhoneForDisplay(request.employeeBusinessPhone || '')}
                        </ThemedText>
                      </View>
                    </DirectionalRow>
                  </View>
                )}
              </View>
            </ThemedView>
            <Spacer height={Spacing.lg} />
          </>
        )}

        <ThemedView
          style={[styles.cardNew, { backgroundColor: theme.surface }]}
        >
          <ThemedText
            style={[
              Typography.subtitle,
              { fontSize: 16, fontWeight: "600", color: theme.text },
            ]}
          >
            {t("services.additionalServices")}
          </ThemedText>
          <Spacer height={Spacing.xl} />

          {/* Responsive grid for Additional Services items */}
          <View style={isWebLayout ? styles.responsiveGrid : undefined}>
            {/* Meeting Room */}
            <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
              <DirectionalRow
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
                        isCancelledVisit
                          ? theme.textSecondary
                          : (request.meetingRoom || request.isMeetingRoom)
                            ? theme.secondary
                            : theme.textSecondary,
                        "15",
                      ),
                    },
                  ]}
                >
                  <DDIcon
                    name="briefcase"
                    size={18}
                    color={
                      isCancelledVisit
                        ? theme.textSecondary
                        : (request.meetingRoom || request.isMeetingRoom)
                          ? theme.secondary
                          : theme.textSecondary
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      Typography.body,
                      { fontWeight: "600", fontSize: 14, color: theme.text },
                    ]}
                  >
                    {t("services.meetingRoom")}
                  </ThemedText>
                  {isCancelledVisit && (request.meetingRoom?.name || request.isMeetingRoom || (request as any).meetingRoomPending) ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.error, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {t("status.cancelled")}
                    </ThemedText>
                  ) : isCancelledVisit ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.error, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {t("status.cancelled")}
                    </ThemedText>
                  ) : request.meetingRoom?.name ? (
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
                        {formatDateShort(request.visitDate)} •{" "}
                        {formatVisitTimeRange(request.visitTime, request.endTime)}
                      </ThemedText>
                    </>
                  ) : request.isMeetingRoom || (request as any).meetingRoomPending ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.warning, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {request.status === REQUEST_STATUS.PENDING_APPROVAL || request.status === REQUEST_STATUS.PENDING_HOST_APPROVAL
                        ? t("status.pendingApproval")
                        : t("status.pending")}
                    </ThemedText>
                  ) : (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: "italic" },
                      ]}
                    >
                      {t("common.notRequested")}
                    </ThemedText>
                  )}
                </View>
                {!isCancelledVisit && request.meetingRoom?.status ? (
                  <StatusBadge
                    label={formatServiceStatus(request.meetingRoom.status)}
                    variant={getServiceStatusVariant(request.meetingRoom.status)}
                    size="sm"
                  />
                ) : null}
              </DirectionalRow>
              {!isWebLayout && <Spacer height={Spacing.md} />}
            </View>

            {/* Buffet Service */}
            <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
              <DirectionalRow
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
                        isCancelledVisit
                          ? theme.textSecondary
                          : (request.buffet || request.isBuffet || (request as any).buffetPending)
                            ? theme.secondary
                            : theme.textSecondary,
                        "15",
                      ),
                    },
                  ]}
                >
                  <DDIcon
                    name="cloche"
                    size={18}
                    color={
                      isCancelledVisit
                        ? theme.textSecondary
                        : (request.buffet || request.isBuffet || (request as any).buffetPending)
                          ? theme.secondary
                          : theme.textSecondary
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      Typography.body,
                      { fontWeight: "600", fontSize: 14, color: theme.text },
                    ]}
                  >
                    {t("buffet.buffetService")}
                  </ThemedText>
                  {isCancelledVisit && (request.buffet?.mealType || request.isBuffet || (request as any).buffetPending) ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.error, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {t("status.cancelled")}
                    </ThemedText>
                  ) : isCancelledVisit ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.error, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {t("status.cancelled")}
                    </ThemedText>
                  ) : request.buffet?.mealType ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {request.meetingRoom?.name ? `${request.meetingRoom.name} - ${request.meetingRoom.floor}` : request.buffet.location}
                    </ThemedText>
                  ) : request.isBuffet || (request as any).buffetPending ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.warning, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {request.status === REQUEST_STATUS.PENDING_APPROVAL || request.status === REQUEST_STATUS.PENDING_HOST_APPROVAL
                        ? t("status.pendingApproval")
                        : t("status.pending")}
                    </ThemedText>
                  ) : (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: "italic" },
                      ]}
                    >
                      {t("common.notRequested")}
                    </ThemedText>
                  )}
                </View>
                {!isCancelledVisit && request.buffet?.status ? (
                  <StatusBadge
                    label={formatServiceStatus(request.buffet.status)}
                    variant={getServiceStatusVariant(request.buffet.status)}
                    size="sm"
                  />
                ) : null}
              </DirectionalRow>
              {!isWebLayout && <Spacer height={Spacing.md} />}
            </View>

            {/* Parking */}
            <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
              <DirectionalRow
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
                        isCancelledVisit
                          ? theme.textSecondary
                          : parkingDisplayDecision === 'required'
                            ? theme.secondary
                            : theme.textSecondary,
                        "15",
                      ),
                    },
                  ]}
                >
                  <DDIcon
                    name="truck"
                    size={18}
                    color={
                      isCancelledVisit
                        ? theme.textSecondary
                        : parkingDisplayDecision === 'required'
                          ? theme.secondary
                          : theme.textSecondary
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      Typography.body,
                      { fontWeight: "600", fontSize: 14, color: theme.text },
                    ]}
                  >
                    {t("services.parking")}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                    {parkingDisplayDecision === 'required' ? t("parking.needsParking") : t("parking.noParking")}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </View>
          </View>
        </ThemedView>
        <Spacer height={Spacing.lg} />

        {/* Responsive 2-column layout for Timeline and QR Code on web */}
        <View style={isWebLayout ? { flexDirection: 'row', gap: Spacing.lg } : undefined}>
          <View style={isWebLayout ? { width: '48%' } : undefined}>
            <RequestTimeline steps={timelineSteps} timezone={(request as any)?.timezone} />
          </View>

          {!isWebLayout && <Spacer height={Spacing.lg} />}

          <View style={isWebLayout ? { width: '48%' } : undefined}>
            <ThemedView
              style={[
                styles.cardNew,
                { backgroundColor: theme.surface, alignItems: "center", flex: isWebLayout ? 1 : undefined },
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
                  <View
                    style={[styles.qrPlaceholder, { borderColor: theme.border }]}
                  >
                    <DDIcon name="maximize" size={80} color={theme.border} />
                  </View>
                )}
              </View>
            </ThemedView>
          </View>
        </View>

        <Spacer height={Spacing.xl} />

        {/* Existing scheduled manager expired message remains inline. */}
        {showInlineExpiredVisitNotice ? expiredVisitNotice : null}

        <Modal
          visible={showCancelModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View style={styles.modalOverlay} pointerEvents="box-none">
            <Pressable
              style={[
                styles.modalBackdrop,
                createModalOverlayStyle(theme, "50"),
              ]}
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
                  onPress={() => {
                    handleCancelRequest();
                  }}
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
          <View style={styles.modalOverlay} pointerEvents="box-none">
            <Pressable
              style={[
                styles.modalBackdrop,
                createModalOverlayStyle(theme, "50"),
              ]}
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
                    fontFamily: getInputFontFamily(hostRejectReason, isRTL),
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
          <View style={styles.modalOverlay} pointerEvents="box-none">
            <Pressable
              style={[
                styles.modalBackdrop,
                createModalOverlayStyle(theme, "50"),
              ]}
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
                    fontFamily: getInputFontFamily(managerRejectReason, isRTL),
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
                    managerRejectMutation.isPending ||
                    !managerRejectReason.trim()
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
          {/* Container for backdrop + content as siblings (not nested) */}
          {/* This prevents touch propagation issues on iOS */}
          <View style={[styles.modalOverlay, createModalOverlayStyle(theme, "50")]}>
            {/* Backdrop - positioned absolutely, closes modal on tap */}
            <Pressable
              style={StyleSheet.absoluteFill}
                onPress={closeEditModal}
            />
            {/* Content - positioned on top of backdrop, touches don't affect backdrop */}
            <View
              style={[
                styles.editModalContent,
                { backgroundColor: theme.surface },
              ]}
            >
              <DirectionalRow style={styles.modalHeader}>
                <ThemedText
                  style={[
                    Typography.subtitle,
                    {
                      fontSize: 18,
                      fontWeight: "600",
                      color: theme.text,
                      flex: 1,
                      
                    },
                  ]}
                >
                  {isApprovalFlow
                    ? t("services.additionalServices")
                    : editModalMode === "services-only"
                      ? t("actions.editServices")
                      : t("actions.editRequest")}
                </ThemedText>
                <Pressable 
                    onPress={closeEditModal}
                >
                  <DDIcon name="x" size={22} variant="muted" />
                </Pressable>
              </DirectionalRow>

              <Spacer height={Spacing.lg} />

              <ScrollView
                style={styles.editModalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginBottom: 8,
                      
                    },
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
                      flexDirection: getFlexDirection(isRTL),
                    },
                  ]}
                  onPress={() => {
                    // iOS can't stack Modals, use inline overlay instead
                    if (Platform.OS === 'ios') {
                      setInlinePickerMode('purpose');
                    } else {
                      setShowPurposePicker(true);
                    }
                  }}
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
                        //  
                      },
                    ]}
                  >
                    {editPurpose ? (PURPOSE_VALUE_TO_KEY[editPurpose] ? t(PURPOSE_VALUE_TO_KEY[editPurpose] as any) : editPurpose) : t("visitor.selectVisitType")}
                  </ThemedText>
                  <DDIcon name="chevron-down" size={16} variant="muted" />
                </Pressable>

                {/* Walk-in: Start Time and End Time picker (only in services-only mode) */}
                {visitData?.isWalkIn && editModalMode === "services-only" ? (
                  <>
                    <Spacer height={Spacing.lg} />
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginBottom: 8,
                        },
                      ]}
                    >
                      {t("form.startTime")} *
                    </ThemedText>
                    <Pressable
                      style={[
                        styles.pickerButton,
                        {
                          backgroundColor: theme.surfaceSecondary,
                          borderColor: theme.border,
                          flexDirection: getFlexDirection(isRTL),
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          setInlinePickerMode('startTime');
                        } else {
                          setShowEditTimePicker(true);
                        }
                      }}
                    >
                      <DDIcon name="clock" size={16} variant="muted" />
                      <ThemedText
                        style={[
                          Typography.body,
                          {
                            marginStart: Spacing.sm,
                            color: theme.text,
                            fontSize: 14,
                            flex: 1,
                          },
                        ]}
                      >
                        {isApprovalFlow && approvalStartTime
                          ? formatDisplayTime(approvalStartTime)
                          : formatDisplayTime(editTime)}
                      </ThemedText>
                      <DDIcon name="chevron-down" size={16} variant="muted" />
                    </Pressable>

                    <Spacer height={Spacing.lg} />
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginBottom: 8,
                          //   
                        },
                      ]}
                    >
                      {t("form.endTime")} *
                    </ThemedText>
                    <Pressable
                      style={[
                        styles.pickerButton,
                        {
                          backgroundColor: theme.surfaceSecondary,
                          borderColor: isWalkInEndTimeBeforeStartTime()
                            ? theme.error
                            : theme.border,
                          flexDirection: getFlexDirection(isRTL),
                        },
                      ]}
                      onPress={() => {
                        // iOS can't stack Modals, use inline overlay instead
                        if (Platform.OS === 'ios') {
                          setInlinePickerMode('endTime');
                        } else {
                          setShowEditEndTimePicker(true);
                        }
                      }}
                    >
                      <DDIcon
                        name="clock"
                        size={16}
                        color={
                          isWalkInEndTimeBeforeStartTime()
                            ? theme.error
                            : theme.textSecondary
                        }
                      />
                      <ThemedText
                        style={[
                          Typography.body,
                          {
                            marginStart: Spacing.sm,
                            color: isWalkInEndTimeBeforeStartTime()
                              ? theme.error
                              : theme.text,
                            fontSize: 14,
                            flex: 1,
                            //  
                          },
                        ]}
                      >
                        {formatDisplayTime(editEndTime)}
                      </ThemedText>
                      <DDIcon name="chevron-down" size={16} variant="muted" />
                    </Pressable>
                    {isWalkInEndTimeBeforeStartTime() ? (
                      <ThemedText
                        style={[
                          Typography.caption,
                          {
                            color: theme.error,
                            marginTop: Spacing.xs,
                            fontSize: 11,
                            
                          },
                        ]}
                      >
                        {t("errors.endTimeMustBeLater")}
                      </ThemedText>
                    ) : (
                      <ThemedText
                        style={[
                          Typography.caption,
                          {
                            color: theme.textSecondary,
                            marginTop: Spacing.xs,
                            fontSize: 11,
                            //  
                          },
                        ]}
                      >
                        {t("form.duration")}: {calculateWalkInDuration()}
                      </ThemedText>
                    )}
                  </>
                ) : null}

                {editModalMode === "full" ? (
                  <>
                    <Spacer height={Spacing.lg} />

                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginBottom: 8,
                          //    
                        },
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
                          flexDirection: getFlexDirection(isRTL),
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          setInlinePickerMode('date');
                        } else {
                          setShowEditDatePicker(true);
                        }
                      }}
                      android_ripple={{ color: theme.border }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <DDIcon name="calendar" size={16} variant="muted" />
                      <ThemedText
                        style={[
                          Typography.body,
                          {
                            marginStart: Spacing.sm,
                            color: theme.text,
                            fontSize: 14,
                            flex: 1,
                            //   
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
                        {
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginBottom: 8,
                          //   
                        },
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
                          flexDirection: getFlexDirection(isRTL),
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          setInlinePickerMode('startTime');
                        } else {
                          setShowEditTimePicker(true);
                        }
                      }}
                      android_ripple={{ color: theme.border }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <DDIcon name="clock" size={16} variant="muted" />
                      <ThemedText
                        style={[
                          Typography.body,
                          {
                            marginStart: Spacing.sm,
                            color: theme.text,
                            fontSize: 14,
                            flex: 1,
                            //   
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
                        {
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginBottom: 8,
                          //    
                        },
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
                          flexDirection: getFlexDirection(isRTL),
                        },
                      ]}
                      onPress={() => {
                        // iOS can't stack Modals, use inline overlay instead
                        if (Platform.OS === 'ios') {
                          setInlinePickerMode('endTime');
                        } else {
                          setShowEditEndTimePicker(true);
                        }
                      }}
                      android_ripple={{ color: theme.border }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <DDIcon name="clock" size={16} variant="muted" />
                      <ThemedText
                        style={[
                          Typography.body,
                          {
                            marginStart: Spacing.sm,
                            color: theme.text,
                            fontSize: 14,
                            flex: 1,
                            //  
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
                        {
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginBottom: 8,
                          //   
                        },
                      ]}
                    >
                      {t("form.duration")}
                    </ThemedText>
                    <DirectionalRow
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
                            color: isEditEndTimeBeforeStartTime()
                              ? theme.error
                              : theme.textSecondary,
                            fontSize: 14,
                            flex: 1,
                            //   
                          },
                        ]}
                      >
                        {calculateEditDuration()}
                      </ThemedText>
                      <DDIcon name="lock" size={16} variant="muted" />
                    </DirectionalRow>
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: theme.textSecondary,
                          marginTop: Spacing.xs,
                          fontSize: 11,
                          //  
                        },
                      ]}
                    >
                      {t("form.calculatedAutomatically")}
                    </ThemedText>
                  </>
                ) : null}

                {/* Optional Services - Hide for walk-in requests (services-only mode) */}
                {editModalMode !== "services-only" ? (
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
                      {t("services.optionalServices")}
                    </ThemedText>

                    <View style={getGridStyle(isRTL)}>
                      <View style={getCardWrapper3ColStyle()}>
                        <SelectableCard
                          onPress={() => {
                            const newRoomValue = !editRequiresMeetingRoom;
                            setEditRequiresMeetingRoom(newRoomValue);
                            if (!newRoomValue) {
                              setEditRequiresBuffet(false);
                              setSelectedEditRoomId(null);
                            }
                          }}
                          selected={editRequiresMeetingRoom}
                        >
                          <View
                            style={[
                              styles.compactServiceIcon,
                              {
                                backgroundColor: applyOpacity(theme.cardIcon, "15"),
                              },
                            ]}
                          >
                            <DDIcon name="users" size={20} color={theme.cardIcon} />
                          </View>
                          <ThemedText
                            style={[
                              Typography.caption,
                              {
                                fontWeight: "600",
                                marginTop: Spacing.xs,
                                textAlign: "center",
                                color: theme.text,
                                fontSize: 11,
                              },
                            ]}
                          >
                            {t("services.meetingRoom")}
                          </ThemedText>
                        </SelectableCard>
                      </View>

                      <View style={getCardWrapper3ColStyle()}>
                        <SelectableCard
                          onPress={() => {
                            const newBuffetValue = !editRequiresBuffet;
                            setEditRequiresBuffet(newBuffetValue);
                            if (newBuffetValue) {
                              setEditRequiresMeetingRoom(true);
                            }
                          }}
                          selected={editRequiresBuffet}
                        >
                          <View
                            style={[
                              styles.compactServiceIcon,
                              {
                                backgroundColor: applyOpacity(theme.cardIcon, "15"),
                              },
                            ]}
                          >
                            <DDIcon
                              name="cloche"
                              size={20}
                              color={theme.cardIcon}
                            />
                          </View>
                          <ThemedText
                            style={[
                              Typography.caption,
                              {
                                fontWeight: "600",
                                marginTop: Spacing.xs,
                                textAlign: "center",
                                color: theme.text,
                                fontSize: 11,
                              },
                            ]}
                          >
                            {t("buffet.buffet")}
                          </ThemedText>
                        </SelectableCard>
                      </View>
                    </View>

                    {/* Meeting Room Picker */}
                    {editRequiresMeetingRoom ? (
                      <View style={{ marginTop: Spacing.md }}>
                    {isLoadingEditRooms || isFetchingEditRooms ? (
                          <DirectionalRow
                            style={[styles.availabilityBadge, { backgroundColor: theme.surface, borderColor: theme.border, justifyContent: "flex-start" }]}
                          >
                            <ActivityIndicator size="small" color={theme.primary} style={{ marginEnd: Spacing.xs }} />
                            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                              {t("common.checkingAvailability")}...
                            </ThemedText>
                          </DirectionalRow>
                        ) : isEditRoomsError ? (
                          <DirectionalRow
                            style={[styles.availabilityBadge, { backgroundColor: applyOpacity(theme.error, "15"), borderColor: theme.error, justifyContent: "flex-start" }]}
                            gap={Spacing.xs}
                          >
                            <DDIcon name="alert-circle" size={16} color={theme.error} />
                            <ThemedText style={[Typography.bodySmall, { color: theme.error, fontWeight: "500", flex: 1, flexWrap: "wrap" }]}>
                              {t("errors.meetingRoomCheckFailed")}
                            </ThemedText>
                          </DirectionalRow>
                        ) : hasCheckedEditAvailability && availableEditRooms.length === 0 ? (
                          <DirectionalRow
                            style={[styles.availabilityBadge, { backgroundColor: applyOpacity(theme.error, "15"), borderColor: theme.error, justifyContent: "flex-start" }]}
                            gap={Spacing.xs}
                          >
                            <DDIcon name="alert-circle" size={16} color={theme.error} />
                            <ThemedText style={[Typography.bodySmall, { color: theme.error, fontWeight: "500", flex: 1, flexWrap: "wrap" }]}>
                              {t("errors.noRoomsAvailableForTime")}
                            </ThemedText>
                          </DirectionalRow>
                        ) : hasCheckedEditAvailability && availableEditRooms.length > 0 ? (
                          <View style={{ gap: Spacing.sm }}>
                            <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
                              {t("form.selectMeetingRoom").toUpperCase()}
                            </ThemedText>
                            {availableEditRooms.map((room) => {
                              const isSelected = selectedEditRoomId === room.id;
                              return (
                                <Pressable
                                  key={room.id}
                                  onPress={() => setSelectedEditRoomId(room.id)}
                                  style={[
                                    styles.roomCard,
                                    {
                                      backgroundColor: isSelected ? applyOpacity(theme.primary, "10") : theme.background,
                                      borderColor: isSelected ? theme.primary : theme.border,
                                      borderWidth: isSelected ? 2 : 1,
                                    },
                                  ]}
                                >
                                  <DirectionalRow alignItems="stretch" style={{ gap: Spacing.sm }}>
                                    <View
                                      style={[
                                        styles.roomCardIcon,
                                        { backgroundColor: isSelected ? applyOpacity(theme.primary, "15") : applyOpacity(theme.cardIcon, "10") },
                                      ]}
                                    >
                                      <DDIcon name="users" size={20} color={isSelected ? theme.primary : theme.cardIcon} />
                                    </View>
                                    <View style={{ flex: 1, gap: 3 }}>
                                      <ThemedText style={[Typography.bodySmall, { fontWeight: "700", color: isSelected ? theme.primary : theme.text }]}>
                                        {room.name}
                                      </ThemedText>
                                      {(room.floor || room.building) ? (
                                        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                                          {[room.floor, room.building].filter(Boolean).join(" · ")}
                                        </ThemedText>
                                      ) : null}
                                      <DirectionalRow gap={Spacing.xs} style={{ flexWrap: "wrap" }}>
                                        <DirectionalRow gap={4} alignItems="center">
                                          <DDIcon name="users" size={12} color={theme.textSecondary} />
                                          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                                            {room.capacity}
                                          </ThemedText>
                                        </DirectionalRow>
                                        {room.features && room.features.length > 0 &&
                                          room.features.slice(0, 3).map((f) => (
                                            <View key={f} style={[styles.featureTag, { backgroundColor: applyOpacity(theme.primary, "10") }]}>
                                              <ThemedText style={[Typography.caption, { color: theme.primary, fontSize: 10 }]}>
                                                {f.replace(/_/g, " ")}
                                              </ThemedText>
                                            </View>
                                          ))}
                                      </DirectionalRow>
                                    </View>
                                    <View
                                      style={[
                                        styles.squareCheckbox,
                                        { borderColor: isSelected ? theme.primary : theme.border, backgroundColor: isSelected ? theme.primary : "transparent" },
                                      ]}
                                    >
                                      {isSelected ? <DDIcon name="check" size={10} color={theme.buttonText} /> : null}
                                    </View>
                                  </DirectionalRow>
                                </Pressable>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </>
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
                            borderColor: editSendWhatsApp
                              ? theme.primary
                              : theme.border,
                          },
                        ]}
                        onPress={() => {
                          setEditSendWhatsApp(!editSendWhatsApp);
                        }}
                      >
                        <View
                          style={[
                            styles.channelChipIcon,
                            {
                              backgroundColor: applyOpacity(
                                theme.success,
                                "15",
                              ),
                            },
                          ]}
                        >
                          <DDIcon
                            name="message-circle"
                            size={16}
                            variant="success"
                          />
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
                            <DDIcon
                              name="check"
                              size={10}
                              color={theme.buttonText}
                            />
                          </View>
                        ) : null}
                      </Pressable>

                      <Pressable
                        style={[
                          styles.channelChip,
                          {
                            backgroundColor: theme.surface,
                            borderColor: editSendSMS
                              ? theme.primary
                              : theme.border,
                          },
                        ]}
                        onPress={() => {
                          setEditSendSMS(!editSendSMS);
                        }}
                      >
                        <View
                          style={[
                            styles.channelChipIcon,
                            { backgroundColor: applyOpacity(theme.info, "15") },
                          ]}
                        >
                          <DDIcon
                            name="smartphone"
                            size={16}
                            color={theme.info}
                          />
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
                            <DDIcon
                              name="check"
                              size={10}
                              color={theme.buttonText}
                            />
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
                            {
                              backgroundColor: applyOpacity(
                                theme.warning,
                                "15",
                              ),
                            },
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
                          <DDIcon
                            name="check"
                            size={10}
                            color={theme.buttonText}
                          />
                        </View>
                      </View>
                    </View>

                    <Spacer height={Spacing.lg} />
                  </>
                ) : null}

                <Spacer height={Spacing.md} />
              </ScrollView>

              <View style={styles.modalActions}>
                <LoadingButton
                  onPress={() => {
                    closeEditModal();
                  }}
                  variant="secondary"
                  size="medium"
                  style={{ flex: 1 }}
                >
                  {t("common.cancel")}
                </LoadingButton>

                <Spacer width={12} />

                <LoadingButton
                  onPress={() => {
                    handleEditConfirm();
                  }}
                  loading={updateMutation.isPending}
                  disabled={
                    updateMutation.isPending ||
                    // Rooms still loading — wait before saving
                    (editRequiresMeetingRoom && (isLoadingEditRooms || isFetchingEditRooms)) ||
                    // A failed or unavailable check is never safe to submit.
                    (editRequiresMeetingRoom && isEditRoomsError) ||
                    (editRequiresMeetingRoom && hasCheckedEditAvailability && (!isEditRoomAvailable || availableEditRooms.length === 0)) ||
                    // Meeting room toggled on, rooms are available, but none selected yet
                    (editRequiresMeetingRoom && hasCheckedEditAvailability && isEditRoomAvailable && availableEditRooms.length > 0 && !selectedEditRoomId)
                  }
                  variant={isApprovalFlow ? "success" : "primary"}
                  size="medium"
                  icon={isApprovalFlow ? "check" : undefined}
                  loadingText={
                    isApprovalFlow ? t("common.approving") : t("common.saving")
                  }
                  style={{ flex: 1 }}
                >
                  {isApprovalFlow ? t("actions.approve") : t("common.save")}
                </LoadingButton>
              </View>

              {/* iOS Inline Picker Overlays - rendered inside the Edit Modal to avoid Modal stacking issues */}
              {Platform.OS === 'ios' && inlinePickerMode === 'purpose' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, borderRadius: 12 }]}>
                  <View style={{ flex: 1, padding: 24 }}>
                    <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: Spacing.md, marginBottom: Spacing.md }]}>
                      <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text, flex: 1 }]}>
                        {t("visitor.selectVisitType")}
                      </ThemedText>
                      <Pressable onPress={() => setInlinePickerMode('none')} hitSlop={8}>
                        <DDIcon name="x" size={20} variant="muted" />
                      </Pressable>
                    </View>
                    <ScrollView>
                      {PURPOSE_OPTIONS.map((option) => (
                        <Pressable
                          key={option.value}
                          style={[
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: Spacing.md,
                              borderRadius: BorderRadius.md,
                              borderWidth: 1,
                              marginBottom: Spacing.sm,
                              borderColor: editPurpose === option.value ? theme.primary : theme.border,
                              backgroundColor: editPurpose === option.value ? applyOpacity(theme.primary, '10') : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setEditPurpose(option.value);
                            setInlinePickerMode('none');
                          }}
                        >
                          <ThemedText style={[Typography.body, { flex: 1, color: theme.text }]}>
                            {t(option.labelKey)}
                          </ThemedText>
                          {editPurpose === option.value && (
                            <DDIcon name="check" size={18} color={theme.primary} />
                          )}
                        </Pressable>
                      ))}
                      <Spacer height={Spacing.xl} />
                    </ScrollView>
                  </View>
                </View>
              )}

              {Platform.OS === 'ios' && inlinePickerMode === 'endTime' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, borderRadius: 12 }]}>
                  <View style={{ flex: 1, padding: 24 }}>
                    <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: Spacing.md, marginBottom: Spacing.md }]}>
                      <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text, flex: 1 }]}>
                        {t("time.selectTime")}
                      </ThemedText>
                      <Pressable onPress={() => setInlinePickerMode('none')} hitSlop={8}>
                        <DDIcon name="x" size={20} variant="muted" />
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={editEndTime}
                      mode="time"
                      display="spinner"
                      onChange={(event: DateTimePickerEvent, date?: Date) => {
                        if (date) {
                          setEditEndTime(date);
                        }
                      }}
                      style={{ height: 180 }}
                      minuteInterval={5}
                    />
                    <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                      <LoadingButton
                        onPress={() => setInlinePickerMode('none')}
                        variant="secondary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.cancel")}
                      </LoadingButton>
                      <LoadingButton
                        onPress={() => setInlinePickerMode('none')}
                        variant="primary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.confirm")}
                      </LoadingButton>
                    </View>
                  </View>
                </View>
              )}

              {Platform.OS === 'ios' && inlinePickerMode === 'startTime' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, borderRadius: 12 }]}>
                  <View style={{ flex: 1, padding: 24 }}>
                    <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: Spacing.md, marginBottom: Spacing.md }]}>
                      <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text, flex: 1 }]}>
                        {t("time.selectTime")}
                      </ThemedText>
                      <Pressable onPress={() => setInlinePickerMode('none')} hitSlop={8}>
                        <DDIcon name="x" size={20} variant="muted" />
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={editTime}
                      mode="time"
                      display="spinner"
                      onChange={(event: DateTimePickerEvent, date?: Date) => {
                        if (date) {
                          let timeToSet = date;
                          if (isApprovalFlow) {
                            const now = new Date();
                            if (timeToSet < now) {
                              timeToSet = now;
                            }
                            setApprovalStartTime(timeToSet);
                          }
                          setEditTime(timeToSet);
                          if (editEndTime <= timeToSet) {
                            setEditEndTime(new Date(timeToSet.getTime() + 60 * 60 * 1000));
                          }
                        }
                      }}
                      style={{ height: 180 }}
                      minuteInterval={5}
                    />
                    <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                      <LoadingButton
                        onPress={() => setInlinePickerMode('none')}
                        variant="secondary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.cancel")}
                      </LoadingButton>
                      <LoadingButton
                        onPress={() => setInlinePickerMode('none')}
                        variant="primary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.confirm")}
                      </LoadingButton>
                    </View>
                  </View>
                </View>
              )}

              {Platform.OS === 'ios' && inlinePickerMode === 'date' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, borderRadius: 12 }]}>
                  <View style={{ flex: 1, padding: 24 }}>
                    <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: Spacing.md, marginBottom: Spacing.md }]}>
                      <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text, flex: 1 }]}>
                        {t("form.date")}
                      </ThemedText>
                      <Pressable onPress={() => setInlinePickerMode('none')} hitSlop={8}>
                        <DDIcon name="x" size={20} variant="muted" />
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={editDate}
                      mode="date"
                      display="spinner"
                      onChange={(event: DateTimePickerEvent, date?: Date) => {
                        if (date) {
                          setEditDate(date);
                        }
                      }}
                      style={{ height: 180 }}
                      minimumDate={new Date()}
                    />
                    <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                      <LoadingButton
                        onPress={() => setInlinePickerMode('none')}
                        variant="secondary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.cancel")}
                      </LoadingButton>
                      <LoadingButton
                        onPress={() => setInlinePickerMode('none')}
                        variant="primary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.confirm")}
                      </LoadingButton>
                    </View>
                  </View>
                </View>
              )}
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
            let timeToSet = time;
            if (isApprovalFlow) {
              const now = new Date();
              if (timeToSet < now) {
                timeToSet = now;
              }
              setApprovalStartTime(timeToSet);
            }
            setEditTime(timeToSet);
            if (editEndTime <= timeToSet) {
              setEditEndTime(new Date(timeToSet.getTime() + 60 * 60 * 1000));
            }
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
          presentationStyle="overFullScreen"
          statusBarTranslucent
        >
          <Pressable
            style={[
              styles.modalOverlay,
              createModalOverlayStyle(theme, "50"),
            ]}
            onPress={() => setShowPurposePicker(false)}
          >
            <Pressable
              style={[
                styles.modalContent,
                { backgroundColor: theme.surface, maxHeight: "60%" },
              ]}
              onPress={(e) => e.stopPropagation()}
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

              <ScrollView
                style={{ marginTop: Spacing.md }}
                keyboardShouldPersistTaps="handled"
              >
                {PURPOSE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.purposePickerItem,
                      {
                        borderBottomColor: theme.border,
                        backgroundColor:
                          editPurpose === option.value
                            ? applyOpacity(theme.primary, "10")
                            : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setEditPurpose(option.value);
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
                              editPurpose === option.value
                                ? "600"
                                : "400",
                          },
                        ]}
                      >
                        {t(option.labelKey as any)}
                      </ThemedText>
                      {editPurpose === option.value ? (
                        <DDIcon name="check" size={18} variant="primary" />
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
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

      {showExpiredWalkInFooter ? (
        <View
          testID="expired-visit-footer"
          onLayout={handleExpiredFooterLayout}
          style={[
            styles.stickyFooter,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <ExpiredVisitFooter theme={theme} t={t} />
        </View>
      ) : null}

      {/* Sticky Footer for Actions */}
      {canHostApproveWalkIn ? (
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
          <ApprovalActionGroup
            onApprove={handleHostApprove}
            onReject={() => setShowHostRejectModal(true)}
            approveLoading={hostApproveMutation.isPending}
            rejectLoading={hostRejectMutation.isPending}
            size="large"
            showIcons={true}
          />
        </View>
      ) : null}

      {canManagerApproveRequest ? (
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
          <ApprovalActionGroup
            onApprove={handleManagerApprove}
            onReject={handleManagerRejectOpen}
            approveLoading={managerApproveMutation.isPending}
            rejectLoading={managerRejectMutation.isPending}
            size="large"
            showIcons={true}
          />
        </View>
      ) : null}

      {request.status !== REQUEST_STATUS.PENDING_HOST_APPROVAL &&
      !request.canApprove &&
      request.status !== REQUEST_STATUS.COMPLETED &&
      request.status !== REQUEST_STATUS.CANCELLED &&
      request.status !== REQUEST_STATUS.REJECTED &&
      request.status !== REQUEST_STATUS.VISITOR_REJECTED &&
      request.status !== REQUEST_STATUS.AUTO_CANCELLED &&
      !isVisitExpired ? (
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
          <DirectionalRow style={styles.actionButtonsRow}>
            {/* Full edit: hidden once the visit has started — user must cancel and re-create */}
            {!hasVisitStarted && !request.isWalkIn ? (
              <>
                <LoadingButton
                  onPress={() => openEditModal("full")}
                  variant="primary"
                  size="large"
                  icon="edit-2"
                  iconPosition="left"
                  style={{ flex: 1 }}
                >
                  {t("common.edit")}
                </LoadingButton>
                <View style={{ width: Spacing.md }} />
              </>
            ) : null}
            {/* Walk-in Edit Services: always available — services-only mode is exempt from the start guard */}
            {request.isWalkIn ? (
              <>
                <LoadingButton
                  onPress={() => openEditModal("services-only")}
                  variant="primary"
                  size="large"
                  icon="settings"
                  iconPosition="left"
                  style={{ flex: 1 }}
                >
                  {t("actions.editServices")}
                </LoadingButton>
                <View style={{ width: Spacing.md }} />
              </>
            ) : null}
            <LoadingButton
              onPress={() => setShowCancelModal(true)}
              variant="danger-outline"
              size="large"
              icon="x-circle"
              iconPosition="left"
              style={{ flex: hasVisitStarted && !request.isWalkIn ? undefined : 1 }}
            >
              {t("common.cancel")}
            </LoadingButton>
          </DirectionalRow>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  container: {
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
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
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  infoRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  infoRowNew: {
    alignItems: "center",
    gap: Spacing.md,
  },
  detailRow: {
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  detailRowNew: {
    alignItems: "center",
    gap: Spacing.md,
  },
  detailRowStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  serviceItem: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  serviceItemNew: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 8,
    gap: Spacing.md,
  },
  serviceRowNew: {
    alignItems: "center",
    gap: Spacing.md,
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
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
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  shareButtonNew: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 10,
    width: "100%",
  },
  cancelButtonNew: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionButtonsRow: {
    alignItems: "center",
  },
  actionButtonHalf: {
    flex: 1,
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
    zIndex: 1,
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
    zIndex: 10,
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
    elevation: 10,
    zIndex: 10,
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
    width: "100%",
  },
  serviceToggleRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  serviceToggleLabel: {
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
  roomCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  roomCardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  squareCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  featureTag: {
    borderRadius: BorderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
