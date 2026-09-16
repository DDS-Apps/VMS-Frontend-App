import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Animated,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DDIcon, IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { ExpiredVisitFooter } from "@/components/shared/ExpiredVisitFooter";
import {
  RequestTimeline,
  useTimelineSteps,
  type TimelineData,
} from "@/components/shared/RequestTimeline";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import {
  SelectableCard,
  CardGridStyles,
  getGridStyle,
  getCardWrapper3ColStyle,
} from "@/components/SelectableCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Typography, FontFamily, getLocaleFontFamily, getInputFontFamily } from "@/constants/theme";
import { REQUEST_STATUS, PURPOSE_VALUE_TO_KEY, normalizePurposeValue } from "@/constants/requestConstants";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import {
  useVisitDetailsQuery,
  useApproveVisitMutation,
  useRejectVisitMutation,
  useCancelVisitMutation,
  useUpdateVisitMutation,
} from "@/hooks/queries/useApprovalQueries";
import { ManagerApprovalDetailScreenProps } from "@/types/managerNavigation.types";
import { Theme } from "@/types/theme.types";
import { mapVisitDetailsToVisitorRequest } from "@/utils/requestMappers";
import { calculateServerDuration, getServerDateParts } from "@/utils/dateTimeUtils";
import { useServerDateTime } from "@/hooks/useServerDateTime";
import { applyOpacity, getStatusConfig as getSharedStatusConfig } from "@/utils/statusStyles";
import { formatPhoneNumber, formatPhoneForDisplay, capitalizeFirst, getInitials } from "@/utils/formatters";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsPendingHostWalkInExpired,
  computeIsVisitExpired,
  getPendingApprovalWalkInScheduledEndMs,
  isPendingManagerApprovalStatus,
} from "@/utils/visitExpiredGuard";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";


const LAYOUT = {
  cardPadding: 20,
  cardRadius: 10,
  sectionSpacing: Spacing.lg,
  contentGap: Spacing.md,
  headerPadding: Spacing.lg,
  accentWidth: 3,
};

const Toast = ({
  message,
  type,
  visible,
}: {
  message: string;
  type: "success" | "error";
  visible: boolean;
}) => {
  const { theme } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: type === "success" ? theme.success : theme.error,
          opacity: fadeAnim,
        },
      ]}
    >
      <DDIcon
        name={type === "success" ? "check-circle" : "x-circle"}
        size={20}
        color={theme.buttonText}
      />
      <ThemedText style={[styles.toastText, { color: theme.buttonText }]}>
        {message}
      </ThemedText>
    </Animated.View>
  );
};

const SectionHeader = ({ title, theme }: { title: string; theme: Theme }) => (
  <View style={styles.sectionHeader}>
    <ThemedText
      style={[
        Typography.caption,
        {
          color: theme.textSecondary,
          fontWeight: "700",
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
        },
      ]}
    >
      {title}
    </ThemedText>
  </View>
);

export default function ManagerApprovalDetailScreen({
  navigation,
  route,
}: ManagerApprovalDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    formatDateTime: fmtDateTime,
    formatDateShort,
    parseISODuration,
    formatTimeFromString,
    formatTimeRange,
    formatVisitTimeRange,
  } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { requestId } = route.params;
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
  
  // Responsive layout: use grid on web (>768px), single column on mobile
  const isWebLayout = screenWidth >= 768;
  const gridItemWidth = screenWidth >= 900 ? '32%' : '48%';
  const { user } = useAuth();
  const isReadOnlyRole = user?.role === "building_admin";
  const {
    formatDateForApi,
    formatTimeForApi,
    formatTimeForDisplay,
    parseDateTime,
  } = useServerDateTime();

  // Helper function for consistent service status colors
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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showWalkInApprovalModal, setShowWalkInApprovalModal] = useState(false);
  const [isWalkInEditMode, setIsWalkInEditMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [walkInEndTime, setWalkInEndTime] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  });
  const [approvalStartTime, setApprovalStartTime] = useState<Date | null>(null);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

  // Inline end time editing state (for approved walk-ins)
  const [showInlineEndTimePicker, setShowInlineEndTimePicker] = useState(false);
  const [inlineEndTime, setInlineEndTime] = useState<Date | null>(null);

  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();

  // Tick every minute so hasVisitStarted re-evaluates while the screen is open.
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setMinuteTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Walk-in approval services state
  const [walkInRequiresMeetingRoom, setWalkInRequiresMeetingRoom] =
    useState(false);
  const [walkInRequiresParking, setWalkInRequiresParking] = useState(false);
  const [walkInRequiresBuffet, setWalkInRequiresBuffet] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({
    message: "",
    type: "success",
    visible: false,
  });

  const {
    data: visitData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useVisitDetailsQuery(requestId);

  const initializeWalkInServices = (data: typeof visitData) => {
    const requiresBuffet = !!data?.buffet;
    setWalkInRequiresMeetingRoom(!!data?.meetingRoom || requiresBuffet);
    setWalkInRequiresBuffet(requiresBuffet);
  };
  const approveMutation = useApproveVisitMutation();
  const rejectMutation = useRejectVisitMutation();
  const cancelMutation = useCancelVisitMutation();
  const updateMutation = useUpdateVisitMutation();

  // Refetch data when screen gains focus to show latest status
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const request = useMemo(() => {
    if (!visitData) return null;
    const mapped = mapVisitDetailsToVisitorRequest(visitData);
    return mapped;
  }, [visitData]);

  // Precise boundary: fire exactly when the visit start time arrives so the guard
  // updates immediately rather than waiting up to 60 s for the next interval tick.
  useEffect(() => {
    if (!visitData?.visitStartAt) return;
    const startMs = new Date(visitData.visitStartAt).getTime();
    if (isNaN(startMs)) return;
    const msUntilStart = startMs - Date.now();
    if (msUntilStart <= 0) return; // already started
    const boundary = setTimeout(() => setMinuteTick((t) => t + 1), msUntilStart);
    return () => clearTimeout(boundary);
  }, [visitData?.visitStartAt]);

  // Check if the visit START time has passed — once started, walk-in edits are no longer allowed.
  const hasVisitStarted = useMemo(() => {
    const now = new Date();

    // Primary path: use visitStartAt ISO timestamp — absolute time, no format ambiguity.
    // Validate explicitly: new Date(invalid) returns NaN rather than throwing.
    if (request?.visitStartAt) {
      const startMs = new Date(request.visitStartAt).getTime();
      if (!isNaN(startMs)) {
        return startMs <= now.getTime();
      }
      // invalid ISO string — fall through to the string-comparison fallback
    }

    // Fallback: reconstruct from visitDate (YYYY-MM-DD) + visitTime.
    if (!request?.visitDate || !request?.visitTime) return false;
    try {
      const { year, month, day, hours: rh, minutes: rm } = getServerDateParts(now, 'Asia/Riyadh');
      const nowKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;

      let h24 = -1;
      let mm = -1;
      const ampmMatch = request.visitTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (ampmMatch) {
        let hh = parseInt(ampmMatch[1], 10);
        mm = parseInt(ampmMatch[2], 10);
        const period = ampmMatch[3].toUpperCase();
        if (period === 'AM') h24 = hh === 12 ? 0 : hh;
        else h24 = hh === 12 ? 12 : hh + 12;
      } else {
        const hhmm = request.visitTime.match(/^(\d{2}):(\d{2})/);
        if (hhmm) {
          h24 = parseInt(hhmm[1], 10);
          mm  = parseInt(hhmm[2], 10);
        }
      }
      if (h24 < 0 || mm < 0) return false;

      const visitKey = `${request.visitDate}T${String(h24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      return visitKey <= nowKey;
    } catch {
      return false;
    }
  }, [request?.visitStartAt, request?.visitDate, request?.visitTime, minuteTick]);

  const timelineData: TimelineData = useMemo(
    () => ({
      createdAt: visitData?.createdAt ?? "",
      status: visitData?.status ?? "pending",
      isWalkIn: visitData?.isWalkIn ?? false,
      timeline: (visitData as any)?.timeline,
      approval: visitData?.approval ? {
        requiresApproval: visitData.approval.requiresApproval,
        autoApproved: visitData.approval.autoApproved,
        approvedAt: visitData.approval.approvedAt,
        rejectedAt: visitData.approval.rejectedAt,
        rejectionReason: visitData.approval.rejectionReason,
      } : undefined,
    }),
    [visitData],
  );

  const timelineSteps = useTimelineSteps({
    data: timelineData,
    role: "manager",
    flowType: visitData?.isWalkIn ? "walk_in" : "standard",
    showActions: false,
  });

  // Check if the logged-in manager is the host of this walk-in
  // If manager IS the host: Receptionist created this for the manager → Manager can add services
  // If manager is NOT the host: Employee created this walk-in → Manager can only approve/reject
  const isManagerTheHost = visitData?.employeeId === user?.id;

  const isProcessing =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    updateMutation.isPending;

  const expirationStatus = request?.status ?? visitData?.status;
  const isExpiredPendingHostWalkIn = useMemo(
    () =>
      computeIsPendingHostWalkInExpired({
        isWalkIn: visitData?.isWalkIn,
        status: expirationStatus,
        visitDate: visitData?.visitDate,
      }),
    [
      expirationStatus,
      riyadhBusinessDateKey,
      visitData?.isWalkIn,
      visitData?.visitDate,
    ],
  );
  const expirationBoundary = useMemo(
    () =>
      getPendingApprovalWalkInScheduledEndMs({
        isWalkIn: visitData?.isWalkIn,
        status: expirationStatus,
        visitDate: visitData?.visitDate,
        visitTime: visitData?.visitTime,
        endTime: visitData?.endTime,
        duration: visitData?.duration,
      }),
    [
      expirationStatus,
      visitData?.duration,
      visitData?.endTime,
      visitData?.isWalkIn,
      visitData?.visitDate,
      visitData?.visitTime,
    ],
  );
  const expirationBoundaryTick = useTimeBoundaryTick([expirationBoundary]);
  const computeCurrentVisitExpiration = useCallback(() => {
    if (
      visitData?.isWalkIn &&
      expirationStatus?.toLowerCase() === "pending_host_approval"
    ) {
      return isExpiredPendingHostWalkIn;
    }

    if (
      visitData?.isWalkIn &&
      isPendingManagerApprovalStatus(expirationStatus)
    ) {
      return computeIsPendingApprovalWalkInExpired({
        isWalkIn: visitData.isWalkIn,
        status: expirationStatus,
        visitDate: visitData.visitDate,
        visitTime: visitData.visitTime,
        endTime: visitData.endTime,
        duration: visitData.duration,
      });
    }

    return computeIsVisitExpired(
      visitData?.visitDate,
      visitData?.visitTime,
      visitData?.endTime,
      visitData?.duration,
      { isWalkIn: visitData?.isWalkIn },
    );
  }, [
    expirationStatus,
    isExpiredPendingHostWalkIn,
    minuteTick,
    riyadhBusinessDateKey,
    visitData?.duration,
    visitData?.endTime,
    visitData?.isWalkIn,
    visitData?.visitDate,
    visitData?.visitTime,
  ]);
  const isVisitExpired = useMemo(
    computeCurrentVisitExpiration,
    [
      computeCurrentVisitExpiration,
      expirationBoundaryTick,
      visitData?.status,
      riyadhBusinessDateKey,
      minuteTick,
    ],
  );
  const showExpiredWalkInStatus =
    !!visitData?.isWalkIn &&
    isPendingManagerApprovalStatus(expirationStatus) &&
    isVisitExpired;
  const showPendingHostExpiredFooter =
    !isReadOnlyRole && isExpiredPendingHostWalkIn;
  const showExpiredWalkInFooter =
    !isReadOnlyRole && showExpiredWalkInStatus;

  if ((isLoading || isFetching) && !request) {
    return (
      <ScreenScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl }}
      >
        <Spacer height={Spacing.xl} />
        <SkeletonCard />
        <Spacer height={Spacing.lg} />
        <SkeletonCard />
      </ScreenScrollView>
    );
  }

  if (!request) {
    return (
      <ScreenScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl }}
      >
        <Spacer height={Spacing.xl} />
        <ThemedText style={[Typography.title]}>
          {error ? t("common.loadError") : t("errors.notFound")}
        </ThemedText>
        {error ? (
          <>
            <Spacer height={Spacing.lg} />
            <Pressable
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={() => refetch()}
            >
              <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
                {t("common.retry")}
              </ThemedText>
            </Pressable>
          </>
        ) : null}
      </ScreenScrollView>
    );
  }
  const parkingDisplayDecision = resolveParkingDisplayDecision({
    parkingDecision: request.parkingDecision,
    visitorNeedsParking: request.visitorNeedsParking,
    isVisitorNeedsParking: request.isVisitorNeedsParking,
    hasParkingAllocation: !!request.parkingSlot,
  });

  const formatDateTime = (isoString: string, timezone?: string) => {
    return fmtDateTime(new Date(isoString), timezone);
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast({ message: "", type: "success", visible: false });
    }, 2600);
  };

  const formatTimeForApiLocal = (time: Date): string => {
    return formatTimeForApi(time);
  };

  const formatDateForApiLocal = (date: Date): string => {
    return formatDateForApi(date);
  };

  // Display formatter for picker values - uses server timezone from API
  const formatDisplayTime = (date: Date): string => {
    return formatTimeForDisplay(date, isRTL);
  };

  const handleApprove = () => {
    if (isReadOnlyRole || computeCurrentVisitExpiration()) return;

    // For walk-in requests where manager IS the host, show the end time modal with service selection
    // If manager is NOT the host, the employee already configured end time/services, so just approve directly
    if (visitData?.isWalkIn && isManagerTheHost) {
      const approvalTime = new Date();
      setApprovalStartTime(approvalTime);
      const defaultEndTime = new Date(approvalTime.getTime() + 60 * 60 * 1000);
      setWalkInEndTime(defaultEndTime);

      // Initialize services from existing visit data
      // For walk-ins, parking is always disabled (same as Employee flow)
      initializeWalkInServices(visitData);
      setWalkInRequiresParking(false); // Parking disabled for walk-ins

      setIsWalkInEditMode(false);
      setShowWalkInApprovalModal(true);
      return;
    }

    // For regular requests OR walk-ins where manager is NOT the host, approve directly
    approveMutation.mutate(
      { id: requestId, payload: {} },
      {
        onSuccess: () => {
          showToast(t("notifications.requestApproved"), "success");
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        },
        onError: (error) => {
          showToast(t("errors.somethingWentWrong"), "error");
        },
      },
    );
  };

  // Handler to open the walk-in services modal in edit mode (for already approved walk-ins)
  const handleEditWalkInServices = () => {
    if (isReadOnlyRole || !visitData?.isWalkIn) return;
    if (computeCurrentVisitExpiration()) return;
    if (hasVisitStarted) return;

    // Initialize with existing data from the visit - preserve original start time
    const now = new Date();

    let existingStartTime = now;
    if (visitData.visitDate && visitData.visitTime) {
      const parsedStart = parseDateTime(
        visitData.visitDate,
        visitData.visitTime,
      );
      if (!isNaN(parsedStart.getTime())) {
        existingStartTime = parsedStart;
      }
    }
    if (existingStartTime.getTime() < now.getTime()) {
      existingStartTime = now;
    }
    setApprovalStartTime(existingStartTime);

    // Set end time from existing visit data or default to 1 hour from start
    if (visitData.endTime && visitData.visitDate) {
      // Parse existing end time using the same date and the end time string
      const parsedEndTime = parseDateTime(
        visitData.visitDate,
        visitData.endTime,
      );
      if (!isNaN(parsedEndTime.getTime())) {
        setWalkInEndTime(parsedEndTime);
      } else {
        setWalkInEndTime(
          new Date(existingStartTime.getTime() + 60 * 60 * 1000),
        );
      }
    } else {
      setWalkInEndTime(new Date(existingStartTime.getTime() + 60 * 60 * 1000));
    }

    // Initialize services from existing visit data
    initializeWalkInServices(visitData);
    setWalkInRequiresParking(false); // Parking disabled for walk-ins

    setIsWalkInEditMode(true);
    setShowWalkInApprovalModal(true);
  };

  const handleWalkInApprovalSubmit = () => {
    if (isReadOnlyRole) return;
    if (isWalkInEditMode && hasVisitStarted) return;
    if (computeCurrentVisitExpiration()) return;

    const now = new Date();
    const startTime = approvalStartTime || now;

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    if (startTime.getTime() < todayStart.getTime() || startTime.getTime() > todayEnd.getTime()) {
      Alert.alert(t("errors.validation"), t("errors.startTimeMustBeToday"));
      return;
    }

    if (walkInEndTime.getTime() <= startTime.getTime()) {
      Alert.alert(t("errors.validation"), t("errors.endTimeMustBeLater"));
      return;
    }

    // Calculate duration from approval start time to selected end time using timezone utility
    // Normalize end time to same date as start time to avoid date-mismatch issues from picker initialization
    const endNormalized = new Date(startTime);
    endNormalized.setHours(walkInEndTime.getHours(), walkInEndTime.getMinutes(), 0, 0);
    const isoDuration = calculateServerDuration(startTime, endNormalized);
    const requiresMeetingRoom =
      walkInRequiresMeetingRoom || walkInRequiresBuffet;

    // Build payload based on whether manager is the host
    // If manager IS the host: can edit services
    // If manager is NOT the host: preserve existing services from employee's submission
    const payload: Record<string, any> = {
      visitDate: formatDateForApiLocal(startTime),
      visitTime: formatTimeForApiLocal(startTime),
      endTime: formatTimeForApiLocal(walkInEndTime),
      duration: isoDuration,
    };

    if (isManagerTheHost) {
      // Manager is the host - can modify services
      payload.needsMeetingRoom = requiresMeetingRoom;
      payload.needsParking = walkInRequiresParking;
      payload.needsBuffet = walkInRequiresBuffet;
    }
    // If not the host, don't include service fields - preserve existing services

    // Handle based on mode: edit mode vs approval mode
    if (isWalkInEditMode) {
      // Edit mode: Just update the visit, no need to approve again
      updateMutation.mutate(
        { id: requestId, data: payload },
        {
          onSuccess: () => {
            setShowWalkInApprovalModal(false);
            setApprovalStartTime(null);
            setShowStartTimePicker(false);
            setShowEndTimePicker(false);
            setIsWalkInEditMode(false);
            setWalkInRequiresMeetingRoom(false);
            setWalkInRequiresParking(false);
            setWalkInRequiresBuffet(false);
            showToast(t("notifications.visitUpdated"), "success");
            refetch();
          },
          onError: (error) => {
            showToast(t("errors.somethingWentWrong"), "error");
          },
        },
      );
    } else {
      // Approval mode: First approve the request, then update with the time details
      approveMutation.mutate(
        { id: requestId, payload: {} },
        {
          onSuccess: () => {
            // Then update with the time details
            updateMutation.mutate(
              { id: requestId, data: payload },
              {
                onSuccess: () => {
                  setShowWalkInApprovalModal(false);
                  setApprovalStartTime(null);
                  setShowStartTimePicker(false);
                  setShowEndTimePicker(false);
                  setIsWalkInEditMode(false);
                  setWalkInRequiresMeetingRoom(false);
                  setWalkInRequiresParking(false);
                  setWalkInRequiresBuffet(false);
                  showToast(t("notifications.walkInApproved"), "success");
                  setTimeout(() => {
                    navigation.goBack();
                  }, 1000);
                },
                onError: (error) => {
                  showToast(t("errors.somethingWentWrong"), "error");
                },
              },
            );
          },
          onError: (error) => {
            showToast(t("errors.somethingWentWrong"), "error");
          },
        },
      );
    }
  };

  const handleStartTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      const now = new Date();
      // Use Riyadh wall-clock "now" so clamp is correct for users outside Saudi Arabia
      const { hours: riyadhH, minutes: riyadhM } = getServerDateParts(now, 'Asia/Riyadh');
      const clampedTime = new Date(selectedTime);
      clampedTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      clampedTime.setSeconds(0, 0);
      const pickedMins = clampedTime.getHours() * 60 + clampedTime.getMinutes();
      if (pickedMins < riyadhH * 60 + riyadhM) {
        clampedTime.setHours(riyadhH, riyadhM, 0, 0);
      }
      setApprovalStartTime(clampedTime);
      if (walkInEndTime.getTime() <= clampedTime.getTime()) {
        setWalkInEndTime(new Date(clampedTime.getTime() + 60 * 60 * 1000));
      }
    }
  };

  const handleEndTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      setWalkInEndTime(selectedTime);
    }
  };

  // Handler for inline end time editing (approved walk-ins)
  const handleInlineEndTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowInlineEndTimePicker(false);
    }
    if (selectedTime) {
      setInlineEndTime(selectedTime);
    }
  };

  // Save inline end time to API
  const handleSaveInlineEndTime = () => {
    if (!inlineEndTime || !visitData) return;
    if (hasVisitStarted) return;

    const payload = {
      endTime: formatTimeForApi(inlineEndTime),
    };

    updateMutation.mutate(
      { id: requestId, data: payload },
      {
        onSuccess: () => {
          setInlineEndTime(null);
          setShowInlineEndTimePicker(false);
          showToast(t("notifications.visitUpdated"), "success");
          refetch();
        },
        onError: () => {
          setShowInlineEndTimePicker(false);
          showToast(t("errors.somethingWentWrong"), "error");
        },
      },
    );
  };

  // Cancel inline end time editing
  const handleCancelInlineEndTime = () => {
    setInlineEndTime(null);
    setShowInlineEndTimePicker(false);
  };

  // Initialize inline end time from visit data for editing
  const handleStartInlineEndTimeEdit = () => {
    if (hasVisitStarted) return;
    if (visitData?.visitDate && visitData?.endTime) {
      const parsedEndTime = parseDateTime(
        visitData.visitDate,
        visitData.endTime,
      );
      if (!isNaN(parsedEndTime.getTime())) {
        setInlineEndTime(parsedEndTime);
      } else {
        // Default to 1 hour from now if no valid end time
        setInlineEndTime(new Date(Date.now() + 60 * 60 * 1000));
      }
    } else {
      // Default to 1 hour from now
      setInlineEndTime(new Date(Date.now() + 60 * 60 * 1000));
    }
    setShowInlineEndTimePicker(true);
  };

  const handleReject = () => {
    if (isReadOnlyRole || computeCurrentVisitExpiration()) return;
    const reason = rejectionReason.trim() || "No reason provided";

    // Close modal immediately to prevent re-opening during loading
    setShowRejectModal(false);

    rejectMutation.mutate(
      { id: requestId, payload: { reason } },
      {
        onSuccess: () => {
          setRejectionReason("");
          showToast(t("notifications.requestRejected"), "success");
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        },
        onError: (error) => {
          showToast(t("errors.somethingWentWrong"), "error");
        },
      },
    );
  };

  const handleCancel = () => {
    console.log('[CancelRequest Manager] Called, requestId:', requestId, 'isReadOnlyRole:', isReadOnlyRole);
    if (isReadOnlyRole) {
      console.log('[CancelRequest Manager] Blocked - user has read-only role');
      return;
    }
    console.log('[CancelRequest Manager] Calling cancelMutation.mutate...');
    cancelMutation.mutate(requestId, {
      onSuccess: () => {
        console.log('[CancelRequest Manager] SUCCESS - request cancelled');
        setShowCancelModal(false);
        showToast(t("notifications.requestCancelled"), "success");
        setTimeout(() => {
          navigation.goBack();
        }, 1000);
      },
      onError: (error) => {
        console.error('[CancelRequest Manager] ERROR:', error);
        showToast(t("errors.somethingWentWrong"), "error");
      },
    });
  };

  const statusConfig = getSharedStatusConfig(theme, request.status, t);
  const initials = getInitials(request.visitor.fullName);
  const expiredVisitNotice = (
    <ExpiredVisitFooter theme={theme} t={t} />
  );

  return (
    <View style={styles.screenContainer}>
      <ScreenScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.lg,
          ...(showPendingHostExpiredFooter || showExpiredWalkInFooter
            ? {
                paddingBottom: Math.max(
                  expiredFooterHeight,
                  insets.bottom + Spacing.xl,
                ),
              }
            : {}),
        }}
      >
        {error ? (
          <>
            <DirectionalRow
              style={[
                styles.inlineQueryFeedback,
                { backgroundColor: applyOpacity(theme.error, "10") },
              ]}
            >
              <DDIcon name="alert-circle" size={16} color={theme.error} />
              <ThemedText
                style={[Typography.caption, { color: theme.error, flex: 1 }]}
              >
                {t("common.loadError")}
              </ThemedText>
              <Pressable onPress={() => refetch()} hitSlop={8}>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.primary, fontWeight: "600" },
                  ]}
                >
                  {t("common.retry")}
                </ThemedText>
              </Pressable>
            </DirectionalRow>
            <Spacer height={Spacing.md} />
          </>
        ) : isFetching ? (
          <>
            <DirectionalRow
              style={[
                styles.inlineQueryFeedback,
                { backgroundColor: applyOpacity(theme.primary, "10") },
              ]}
            >
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText
                style={[Typography.caption, { color: theme.textSecondary }]}
              >
                {t("common.loading")}
              </ThemedText>
            </DirectionalRow>
            <Spacer height={Spacing.md} />
          </>
        ) : null}
        {/* Rejection Reason - Moved to top */}
        {request.status === REQUEST_STATUS.REJECTED &&
        request.approval.rejectionReason ? (
          <>
            <ThemedView
              style={[
                styles.cardNew,
                { backgroundColor: applyOpacity(theme.error, "08") },
              ]}
            >
              <DirectionalRow
                style={{ alignItems: "flex-start", gap: Spacing.sm }}
              >
                <View style={{ marginTop: 2 }}>
                  <DDIcon name="message-circle" size={18} color={theme.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        color: theme.error,
                        fontWeight: "600",
                        marginBottom: 4,
                        
                      },
                    ]}
                  >
                    {t("form.reason")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: theme.text,
                        lineHeight: 22,
                        
                      },
                    ]}
                  >
                    {request.approval.rejectionReason}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </ThemedView>
            <Spacer height={Spacing.lg} />
          </>
        ) : null}

        {/* Visitor Decline Reason - Moved to top */}
        {request.visitorDecision &&
        !request.visitorDecision.accepted &&
        request.visitorDecision.reason ? (
          <>
            <ThemedView
              style={[
                styles.cardNew,
                { backgroundColor: applyOpacity(theme.error, "08") },
              ]}
            >
              <DirectionalRow
                style={{ alignItems: "flex-start", gap: Spacing.sm }}
              >
                <View style={{ marginTop: 2 }}>
                  <DDIcon name="user-x" size={18} color={theme.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        color: theme.error,
                        fontWeight: "600",
                        marginBottom: 4,
                        
                      },
                    ]}
                  >
                    {t("visitor.visitorDeclineReason")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: theme.text,
                        lineHeight: 22,
                        
                      },
                    ]}
                  >
                    {request.visitorDecision.reason}
                  </ThemedText>
                </View>
              </DirectionalRow>
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
                    style={[styles.avatarTextNew, { color: theme.primary, fontSize: 20 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {initials}
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
                  {request.visitor.company ? (
                    <ThemedText
                      style={[Typography.body, { color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}
                      numberOfLines={1}
                    >
                      {request.visitor.company}
                    </ThemedText>
                  ) : null}
                </View>

                {/* Status Badges */}
                <DirectionalRow style={{ alignItems: "center", gap: Spacing.sm }}>
                  {request.isWalkIn ? (
                    <View
                      style={{
                        backgroundColor: applyOpacity(theme.warning, "15"),
                        borderColor: applyOpacity(theme.warning, "30"),
                        borderWidth: StyleSheet.hairlineWidth,
                        paddingHorizontal: Spacing.md,
                        paddingVertical: 6,
                        borderRadius: BorderRadius.full,
                      }}
                    >
                      <ThemedText
                        style={[Typography.caption, { color: theme.warning, fontWeight: "600", fontSize: 12 }]}
                      >
                        {t("reception.walkInVisitor")}
                      </ThemedText>
                    </View>
                  ) : null}
                  <RequestStatusBadge status={request.status} />
                </DirectionalRow>
              </DirectionalRow>

              {/* Right group: Contact info */}
              <DirectionalRow style={{ alignItems: 'center', gap: Spacing.lg, flexShrink: 0 }}>
                {/* Email */}
                <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                  <View
                    style={[
                      styles.contactIcon,
                      { backgroundColor: applyOpacity(theme.textSecondary, "15"), width: 32, height: 32 },
                    ]}
                  >
                    <DDIcon name="mail" size={16} color={theme.text} />
                  </View>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13 }]}>
                    {request.visitor.email}
                  </ThemedText>
                </DirectionalRow>

                {/* Phone */}
                <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                  <View
                    style={[
                      styles.contactIcon,
                      { backgroundColor: applyOpacity(theme.textSecondary, "15"), width: 32, height: 32 },
                    ]}
                  >
                    <DDIcon name="phone" size={16} color={theme.text} />
                  </View>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, writingDirection: 'ltr' }]}>
                    {formatPhoneNumber(request.visitor.phone || '')}
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
                    style={[styles.avatarTextNew, { color: theme.primary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {initials}
                  </ThemedText>
                </View>

                <Spacer height={Spacing.lg} />

                <ThemedText
                  style={[Typography.title, { fontWeight: "600", fontSize: 22, color: theme.text }]}
                >
                  {capitalizeFirst(request.visitor.fullName)}
                </ThemedText>
                {request.visitor.company ? (
                  <ThemedText
                    style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginTop: 4 }]}
                  >
                    {request.visitor.company}
                  </ThemedText>
                ) : null}

                <Spacer height={Spacing.sm} />

                <DirectionalRow style={{ alignItems: "center", gap: Spacing.sm }}>
                  {request.isWalkIn ? (
                    <View
                      style={{
                        backgroundColor: applyOpacity(theme.warning, "15"),
                        borderColor: applyOpacity(theme.warning, "30"),
                        borderWidth: StyleSheet.hairlineWidth,
                        paddingHorizontal: Spacing.md,
                        paddingVertical: 6,
                        borderRadius: BorderRadius.full,
                      }}
                    >
                      <ThemedText
                        style={[Typography.caption, { color: theme.warning, fontWeight: "600", fontSize: 12 }]}
                      >
                        {t("reception.walkInVisitor")}
                      </ThemedText>
                    </View>
                  ) : null}
                  <RequestStatusBadge status={request.status} />
                </DirectionalRow>
              </View>

              <Spacer height={Spacing.lg} />

              <DirectionalRow style={{ alignItems: "center", justifyContent: "flex-start", gap: Spacing.md }}>
                <View
                  style={[
                    styles.contactIcon,
                    { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                  ]}
                >
                  <DDIcon name="mail" size={18} color={theme.text} />
                </View>
                <ThemedText
                  style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, flex: 1 }]}
                >
                  {request.visitor.email}
                </ThemedText>
              </DirectionalRow>

              <Spacer height={Spacing.md} />

              <DirectionalRow style={{ alignItems: "center", justifyContent: "flex-start", gap: Spacing.md }}>
                <View
                  style={[
                    styles.contactIcon,
                    { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                  ]}
                >
                  <DDIcon name="phone" size={18} color={theme.text} />
                </View>
                <ThemedText
                  style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, flex: 1, writingDirection: 'ltr' }]}
                >
                  {formatPhoneNumber(request.visitor.phone || '')}
                </ThemedText>
              </DirectionalRow>
            </>
          )}
        </ThemedView>

        <Spacer height={LAYOUT.sectionSpacing} />

        <ThemedView
          style={[styles.cardNew, { backgroundColor: theme.surface }]}
        >
          <ThemedText
            style={[
              Typography.subtitle,
              {
                fontSize: 16,
                fontWeight: "600",
                color: theme.text,
                
                marginBottom: Spacing.xl,
              },
            ]}
          >
            {t("visitor.visitorRequest")}
          </ThemedText>
          {/* Visit Details Grid - 3 columns */}
          <View style={styles.visitDetailsGrid}>
            {/* Date & Time */}
            <DirectionalRow style={styles.visitDetailItem}>
              <View
                style={[
                  styles.compactServiceIcon,
                  { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                ]}
              >
                <DDIcon name="calendar" size={18} color={theme.text} />
              </View>
              <View style={styles.visitDetailText}>
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      fontWeight: "600",
                      fontSize: 14,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t("visitor.dateAndTime")}
                </ThemedText>
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      marginTop: 2,
                      fontSize: 13,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {formatDateShort(request.visitDate)} • {formatVisitTimeRange(request.visitTime, request.endTime)}
                </ThemedText>
              </View>
            </DirectionalRow>

            {/* Duration */}
            <DirectionalRow style={styles.visitDetailItem}>
              <View
                style={[
                  styles.compactServiceIcon,
                  { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                ]}
              >
                <DDIcon name="clock" size={18} color={theme.text} />
              </View>
              <View style={styles.visitDetailText}>
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      fontWeight: "600",
                      fontSize: 14,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t("form.duration")}
                </ThemedText>
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      marginTop: 2,
                      fontSize: 13,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {parseISODuration(request.duration)}
                </ThemedText>
              </View>
            </DirectionalRow>

            {/* Purpose */}
            <DirectionalRow style={styles.visitDetailItem}>
              <View
                style={[
                  styles.compactServiceIcon,
                  { backgroundColor: applyOpacity(theme.textSecondary, "15") },
                ]}
              >
                <DDIcon name="file-text" size={18} color={theme.text} />
              </View>
              <View style={styles.visitDetailText}>
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      fontWeight: "600",
                      fontSize: 14,
                    },
                  ]}
                  numberOfLines={1}
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
                    },
                  ]}
                  numberOfLines={1}
                >
                  {(() => { const pv = normalizePurposeValue(request.purpose || ''); return PURPOSE_VALUE_TO_KEY[pv] ? t(PURPOSE_VALUE_TO_KEY[pv] as any) : (request.purpose || '-'); })()}
                </ThemedText>
              </View>
            </DirectionalRow>
          </View>

          {/* End Time - Inline editable for walk-ins */}
          {request.isWalkIn ? (
            <>
              <Spacer height={Spacing.lg} />
              <DirectionalRow style={styles.serviceRow}>
                <View
                  style={[
                    styles.serviceIcon,
                    {
                      backgroundColor: applyOpacity(theme.textSecondary, "15"),
                    },
                  ]}
                >
                  <DDIcon name="log-out" size={18} color={theme.text} />
                </View>
                <View style={styles.serviceInfo}>
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        fontWeight: "600",
                        fontSize: 15,
                        
                      },
                    ]}
                  >
                    {t("form.endTime")}
                  </ThemedText>
                  {inlineEndTime !== null ? (
                    <DirectionalRow
                      style={{
                        alignItems: "center",
                        gap: Spacing.sm,
                        marginTop: 2,
                      }}
                    >
                      <Pressable
                        onPress={() => setShowInlineEndTimePicker(true)}
                        style={[
                          styles.inlineTimeButton,
                          {
                            backgroundColor: applyOpacity(theme.primary, "10"),
                            borderColor: theme.primary,
                          },
                        ]}
                      >
                        <DDIcon name="clock" size={14} color={theme.primary} />
                        <ThemedText
                          style={[
                            Typography.body,
                            {
                              color: theme.primary,
                              fontWeight: "600",
                              marginStart: 4,
                            },
                          ]}
                        >
                          {formatTimeForDisplay(inlineEndTime)}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={handleSaveInlineEndTime}
                        disabled={updateMutation.isPending}
                      >
                        <DDIcon name="check" size={20} color={theme.success} />
                      </Pressable>
                      <Pressable onPress={handleCancelInlineEndTime}>
                        <DDIcon name="x" size={20} color={theme.error} />
                      </Pressable>
                    </DirectionalRow>
                  ) : (
                    <DirectionalRow
                      style={{
                        alignItems: "center",
                        gap: Spacing.sm,
                        marginTop: 2,
                      }}
                    >
                      <ThemedText
                        style={[
                          Typography.caption,
                          {
                            color: request.endTime
                              ? theme.textSecondary
                              : theme.warning,
                            fontSize: 13,
                            
                          },
                        ]}
                      >
                        {request.endTime
                          ? formatTimeFromString(request.endTime)
                          : t("common.notRequested")}
                      </ThemedText>
                      {!isReadOnlyRole &&
                      !hasVisitStarted &&
                      isManagerTheHost &&
                      (request.status === REQUEST_STATUS.APPROVED ||
                        request.status === REQUEST_STATUS.VISITOR_ACCEPTED) ? (
                        <Pressable
                          onPress={handleStartInlineEndTimeEdit}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <DDIcon
                            name="edit-2"
                            size={16}
                            color={theme.primary}
                          />
                        </Pressable>
                      ) : null}
                    </DirectionalRow>
                  )}
                </View>
              </DirectionalRow>
            </>
          ) : null}

          {/* Walk-in Notes */}
          {request.isWalkIn && request.notes ? (
            <>
              <Spacer height={Spacing.lg} />
              <DirectionalRow style={styles.serviceRow}>
                <View
                  style={[
                    styles.serviceIcon,
                    {
                      backgroundColor: applyOpacity(theme.textSecondary, "15"),
                    },
                  ]}
                >
                  <DDIcon name="edit-3" size={18} color={theme.text} />
                </View>
                <View style={styles.serviceInfo}>
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        fontWeight: "600",
                        fontSize: 15,
                        
                      },
                    ]}
                  >
                    {t("form.notes")}
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
                    {request.notes}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </>
          ) : null}
        </ThemedView>

        <Spacer height={LAYOUT.sectionSpacing} />

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
                  <DirectionalRow style={styles.serviceRow}>
                    <View
                      style={[
                        styles.serviceIcon,
                        { backgroundColor: applyOpacity(theme.textSecondary, "20") },
                      ]}
                    >
                      <DDIcon name="user" size={18} color={theme.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={[Typography.body, { fontWeight: "600", fontSize: 14, color: theme.text }]}
                      >
                        {t("visitor.hostName")}
                      </ThemedText>
                      <ThemedText
                        style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}
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
                    <DirectionalRow style={styles.serviceRow}>
                      <View
                        style={[
                          styles.serviceIcon,
                          { backgroundColor: applyOpacity(theme.textSecondary, "20") },
                        ]}
                      >
                        <DDIcon name="phone" size={18} color={theme.text} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          style={[Typography.body, { fontWeight: "600", fontSize: 14, color: theme.text }]}
                        >
                          {t("form.phone")}
                        </ThemedText>
                        <ThemedText
                          style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, writingDirection: 'ltr' }]}
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
                    <DirectionalRow style={styles.serviceRow}>
                      <View
                        style={[
                          styles.serviceIcon,
                          { backgroundColor: applyOpacity(theme.textSecondary, "20") },
                        ]}
                      >
                        <DDIcon name="phone" size={18} color={theme.text} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          style={[Typography.body, { fontWeight: "600", fontSize: 14, color: theme.text }]}
                        >
                          {t("form.landline")}
                        </ThemedText>
                        <ThemedText
                          style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, writingDirection: 'ltr' }]}
                        >
                          {formatPhoneForDisplay(request.employeeBusinessPhone || '')}
                        </ThemedText>
                      </View>
                    </DirectionalRow>
                  </View>
                )}
              </View>
            </ThemedView>
            <Spacer height={LAYOUT.sectionSpacing} />
          </>
        )}

        <ThemedView
          style={[styles.cardNew, { backgroundColor: theme.surface }]}
        >
          <ThemedText
            style={[
              Typography.subtitle,
              {
                fontSize: 16,
                fontWeight: "600",
                color: theme.text,
                
                marginBottom: Spacing.xl,
              },
            ]}
          >
            {t("services.additionalServices")}
          </ThemedText>
          
          {/* Responsive grid for Additional Services items */}
          <View style={isWebLayout ? styles.responsiveGrid : undefined}>
          {/* Meeting Room */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
          <DirectionalRow style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]}>
            <View
              style={[
                styles.serviceIcon,
                {
                  backgroundColor: applyOpacity(
                    request.meetingRoom || request.isMeetingRoom
                      ? theme.secondary
                      : theme.textSecondary,
                    "20",
                  ),
                },
              ]}
            >
              <DDIcon
                name="briefcase"
                size={18}
                color={
                  request.meetingRoom || request.isMeetingRoom
                    ? theme.secondary
                    : theme.textSecondary
                }
              />
            </View>
            <View style={[styles.serviceInfo, { flex: 1 }]}>
              <DirectionalRow
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      fontWeight: "600",
                      fontSize: 15,
                      
                    },
                  ]}
                >
                  {t("services.meetingRoom")}
                </ThemedText>
                {request.meetingRoom?.status ? (
                  <StatusBadge
                    label={formatServiceStatus(request.meetingRoom.status)}
                    variant={getServiceStatusVariant(
                      request.meetingRoom.status,
                    )}
                    size="sm"
                  />
                ) : null}
              </DirectionalRow>
              {request.meetingRoom ? (
                <>
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: theme.textSecondary,
                        marginTop: 2,
                        fontSize: 13,
                        
                      },
                    ]}
                  >
                    {request.meetingRoom.name} - {request.meetingRoom.floor}
                  </ThemedText>
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: theme.textSecondary,
                        fontSize: 12,
                        
                      },
                    ]}
                  >
                    {formatDateShort(request.visitDate)} •{" "}
                    {formatVisitTimeRange(request.visitTime, request.endTime)}
                  </ThemedText>
                </>
              ) : request.isMeetingRoom ? (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.warning,
                      marginTop: 2,
                      fontSize: 13,
                      
                    },
                  ]}
                >
                  {t("status.pending")}
                </ThemedText>
              ) : (request as any).meetingRoomPending ? (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.warning,
                      marginTop: 2,
                      fontSize: 13,
                      
                    },
                  ]}
                >
                  {t("status.pending")}
                </ThemedText>
              ) : request.status === REQUEST_STATUS.CANCELLED || request.status === REQUEST_STATUS.AUTO_CANCELLED || request.status === REQUEST_STATUS.VISITOR_REJECTED ? (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.error,
                      marginTop: 2,
                      fontSize: 13,
                      
                    },
                  ]}
                >
                  {t("status.cancelled")}
                </ThemedText>
              ) : (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      marginTop: 2,
                      fontSize: 13,
                      fontStyle: "italic",
                      
                    },
                  ]}
                >
                  {t("common.notRequested")}
                </ThemedText>
              )}
            </View>
          </DirectionalRow>
          {!isWebLayout && <Spacer height={Spacing.lg} />}
          </View>

          {/* Buffet */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
          <DirectionalRow style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]}>
            <View
              style={[
                styles.serviceIcon,
                {
                  backgroundColor: applyOpacity(
                    request.buffet ||
                      request.isBuffet ||
                      (request as any).buffetPending
                      ? theme.secondary
                      : theme.textSecondary,
                    "20",
                  ),
                },
              ]}
            >
              <DDIcon
                name="cloche"
                size={18}
                color={
                  request.buffet ||
                  request.isBuffet ||
                  (request as any).buffetPending
                    ? theme.secondary
                    : theme.textSecondary
                }
              />
            </View>
            <View style={[styles.serviceInfo, { flex: 1 }]}>
              <DirectionalRow
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      fontWeight: "600",
                      fontSize: 15,
                      
                    },
                  ]}
                >
                  {t("services.buffet")}
                </ThemedText>
                {request.buffet?.status ? (
                  <StatusBadge
                    label={formatServiceStatus(request.buffet.status)}
                    variant={getServiceStatusVariant(request.buffet.status)}
                    size="sm"
                  />
                ) : null}
              </DirectionalRow>
              {request.buffet && request.buffet.mealType ? (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      marginTop: 2,
                      fontSize: 13,
                      
                    },
                  ]}
                >
                  {request.meetingRoom?.name ? `${request.meetingRoom.name} - ${request.meetingRoom.floor}` : request.buffet.location}
                </ThemedText>
              ) : request.isBuffet ? (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.warning,
                      marginTop: 2,
                      fontSize: 13,
                      
                    },
                  ]}
                >
                  {t("status.pending")}
                </ThemedText>
              ) : (request as any).buffetPending ? (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.warning,
                      marginTop: 2,
                      fontSize: 13,
                      
                    },
                  ]}
                >
                  {t("status.pending")}
                </ThemedText>
              ) : request.status === REQUEST_STATUS.CANCELLED || request.status === REQUEST_STATUS.AUTO_CANCELLED || request.status === REQUEST_STATUS.VISITOR_REJECTED ? (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.error,
                      marginTop: 2,
                      fontSize: 13,
                      
                    },
                  ]}
                >
                  {t("status.cancelled")}
                </ThemedText>
              ) : (
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      marginTop: 2,
                      fontSize: 13,
                      fontStyle: "italic",
                      
                    },
                  ]}
                >
                  {t("common.notRequested")}
                </ThemedText>
              )}
            </View>
          </DirectionalRow>
          {!isWebLayout && <Spacer height={Spacing.lg} />}
          </View>

          {/* Parking */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
          <DirectionalRow style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]}>
            <View
              style={[
                styles.serviceIcon,
                {
                  backgroundColor: applyOpacity(
                    parkingDisplayDecision === 'required'
                      ? theme.secondary
                      : theme.textSecondary,
                    "20",
                  ),
                },
              ]}
            >
              <DDIcon
                name="truck"
                size={18}
                color={
                  parkingDisplayDecision === 'required'
                    ? theme.secondary
                    : theme.textSecondary
                }
              />
            </View>
            <View style={[styles.serviceInfo, { flex: 1 }]}>
              <DirectionalRow
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      fontWeight: "600",
                      fontSize: 15,
                      
                    },
                  ]}
                >
                  {t("services.parking")}
                </ThemedText>
              </DirectionalRow>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                {parkingDisplayDecision === 'required' ? t("parking.needsParking") : t("parking.noParking")}
              </ThemedText>
            </View>
          </DirectionalRow>
          </View>
          </View>
        </ThemedView>

        <Spacer height={LAYOUT.sectionSpacing} />

        <RequestTimeline steps={timelineSteps} timezone={visitData?.timezone} />

        <Spacer height={showPendingHostExpiredFooter || showExpiredWalkInFooter ? 0 : 100} />
      </ScreenScrollView>

      {showPendingHostExpiredFooter || showExpiredWalkInFooter ? (
        <View
          testID="expired-visit-footer"
          onLayout={handleExpiredFooterLayout}
          style={[
            styles.actionBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          {expiredVisitNotice}
        </View>
      ) : null}

      {!isReadOnlyRole &&
        request.status === REQUEST_STATUS.PENDING_APPROVAL &&
        !showExpiredWalkInFooter &&
        visitData?.canApprove !== false && (
          <View
            style={[
              styles.actionBar,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            {isVisitExpired ? (
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
            ) : (
              <ApprovalActionGroup
                onApprove={handleApprove}
                onReject={() => setShowRejectModal(true)}
                approveLoading={approveMutation.isPending}
                rejectLoading={false}
                disabled={isProcessing}
                size="large"
              />
            )}
          </View>
        )}

      {!isReadOnlyRole &&
        !hasVisitStarted &&
        request.isWalkIn && isManagerTheHost &&
        (request.status === REQUEST_STATUS.APPROVED ||
          request.status === REQUEST_STATUS.VISITOR_ACCEPTED) && (
          <View
            style={[
              styles.actionBar,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            <LoadingButton
              onPress={handleEditWalkInServices}
              loading={false}
              disabled={isProcessing}
              variant="primary"
              size="large"
              icon="settings"
              iconPosition="left"
              fullWidth
            >
              {t("actions.editServices")}
            </LoadingButton>
          </View>
        )}

      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isProcessing && setShowCancelModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable
            style={[
              styles.modalBackdrop,
              { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            ]}
            onPress={() => !isProcessing && setShowCancelModal(false)}
          />
          <View style={styles.modalContainer}>
            <ThemedView
              style={[styles.modalContent, { backgroundColor: theme.surface }]}
            >
              <Pressable
                onPress={() => !isProcessing && setShowCancelModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <DDIcon name="x" size={20} variant="muted" />
              </Pressable>

              <View style={styles.modalIconWrapper}>
                <View
                  style={[
                    styles.modalIconContainer,
                    { backgroundColor: applyOpacity(theme.error, "15") },
                  ]}
                >
                  <DDIcon name="x-circle" size={22} color={theme.error} />
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 18, fontWeight: "600", textAlign: "center" },
                ]}
              >
                {t("actions.cancelRequest")}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.textSecondary,
                    fontSize: 13,
                    lineHeight: 20,
                    textAlign: "center",
                  },
                ]}
              >
                {t("settings.logoutConfirm").replace(
                  "logout",
                  t("common.cancel").toLowerCase(),
                )}
              </ThemedText>

              <Spacer height={Spacing.xl} />

              <DirectionalRow style={styles.modalActions}>
                <LoadingButton
                  onPress={() => setShowCancelModal(false)}
                  disabled={isProcessing}
                  variant="secondary"
                  size="medium"
                  style={styles.modalActionButton}
                >
                  {t("common.back")}
                </LoadingButton>

                <Spacer width={Spacing.md} />

                <LoadingButton
                  onPress={() => {
                    console.log('[CancelRequest Manager] BUTTON TAPPED - calling handleCancel');
                    handleCancel();
                  }}
                  loading={cancelMutation.isPending}
                  disabled={isProcessing}
                  variant="danger"
                  size="medium"
                  loadingText={t("common.loading")}
                  style={styles.modalActionButton}
                >
                  {t("actions.cancelRequest")}
                </LoadingButton>
              </DirectionalRow>
            </ThemedView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isProcessing && setShowRejectModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable
            style={[
              styles.modalBackdrop,
              { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            ]}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboardAvoidingView}
            pointerEvents="box-none"
            accessibilityViewIsModal
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: theme.surface }]}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <Pressable
                onPress={() => !isProcessing && setShowRejectModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <DDIcon name="x" size={20} variant="muted" />
              </Pressable>

              <View style={styles.modalIconWrapper}>
                <View
                  style={[
                    styles.modalIconContainer,
                    { backgroundColor: applyOpacity(theme.warning, "15") },
                  ]}
                >
                  <DDIcon
                    name="alert-triangle"
                    size={22}
                    color={theme.warning}
                  />
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 18, fontWeight: "600", textAlign: "center" },
                ]}
              >
                {t("actions.reject")}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.textSecondary,
                    fontSize: 13,
                    lineHeight: 20,
                    textAlign: "center",
                  },
                ]}
              >
                {t("form.enterNotes")} ({t("form.optional").toLowerCase()})
              </ThemedText>

              <Spacer height={Spacing.xl} />

              <TextInput
                style={[
                  styles.reasonInput,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontFamily: getInputFontFamily(rejectionReason, isRTL),
                  },
                ]}
                placeholder={t("form.enterNotes")}
                placeholderTextColor={theme.textSecondary}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isProcessing}
              />

              <Spacer height={Spacing.xl} />

              <DirectionalRow style={styles.modalActions}>
                <LoadingButton
                  onPress={() => setShowRejectModal(false)}
                  disabled={isProcessing}
                  variant="secondary"
                  size="medium"
                  style={styles.modalActionButton}
                >
                  {t("common.cancel")}
                </LoadingButton>

                <Spacer width={Spacing.md} />

                <LoadingButton
                  onPress={handleReject}
                  loading={rejectMutation.isPending}
                  disabled={isProcessing}
                  variant="danger"
                  size="medium"
                  loadingText={t("common.loading")}
                  style={styles.modalActionButton}
                >
                  {t("common.confirm")}
                </LoadingButton>
              </DirectionalRow>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showWalkInApprovalModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isProcessing) {
            setShowWalkInApprovalModal(false);
            setShowStartTimePicker(false);
            setShowEndTimePicker(false);
          }
        }}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable
            style={[
              styles.modalBackdrop,
              { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            ]}
            onPress={() => {
              if (!isProcessing) {
                setShowWalkInApprovalModal(false);
                setShowStartTimePicker(false);
                setShowEndTimePicker(false);
              }
            }}
          />
          <View style={styles.modalContainer}>
            <ThemedView
              style={[styles.modalContent, { backgroundColor: theme.surface }]}
            >
              <Pressable
                onPress={() => {
                  if (!isProcessing) {
                    setShowWalkInApprovalModal(false);
                    setShowStartTimePicker(false);
                    setShowEndTimePicker(false);
                  }
                }}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <DDIcon name="x" size={20} variant="muted" />
              </Pressable>

              <View style={styles.modalIconWrapper}>
                <View
                  style={[
                    styles.modalIconContainer,
                    {
                      backgroundColor: applyOpacity(
                        isWalkInEditMode ? theme.primary : theme.success,
                        "15",
                      ),
                    },
                  ]}
                >
                  <DDIcon
                    name={isWalkInEditMode ? "settings" : "check-circle"}
                    size={22}
                    color={isWalkInEditMode ? theme.primary : theme.success}
                  />
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText
                style={[
                  Typography.subtitle,
                  { fontSize: 18, fontWeight: "600", textAlign: "center" },
                ]}
              >
                {isWalkInEditMode
                  ? t("services.additionalServices")
                  : `${t("actions.approve")} ${t("visitor.walkIn")}`}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: theme.textSecondary,
                    fontSize: 13,
                    lineHeight: 20,
                    textAlign: "center",
                  },
                ]}
              >
                {isWalkInEditMode
                  ? t("actions.editServicesDescription")
                  : t("visitor.selectEndTime")}
              </ThemedText>

              <Spacer height={Spacing.xl} />

              {/* Start Time Field */}
              <View style={{ width: "100%" }}>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.textSecondary, marginBottom: Spacing.xs },
                  ]}
                >
                  {t("form.startTime")} *
                </ThemedText>
                <Pressable
                  onPress={() => setShowStartTimePicker(true)}
                  style={[
                    styles.reasonInput,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      paddingVertical: Spacing.md,
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexDirection: getFlexDirection(isRTL),
                    },
                  ]}
                >
                  <ThemedText style={{ color: theme.text }}>
                    {formatDisplayTime(approvalStartTime || new Date())}
                  </ThemedText>
                  <DDIcon name="clock" size={18} variant="muted" />
                </Pressable>
              </View>

              <Spacer height={Spacing.lg} />

              <View style={{ width: "100%" }}>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.textSecondary, marginBottom: Spacing.xs },
                  ]}
                >
                  {t("form.endTime")} *
                </ThemedText>
                <Pressable
                  onPress={() => setShowEndTimePicker(true)}
                  style={[
                    styles.reasonInput,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      paddingVertical: Spacing.md,
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexDirection: getFlexDirection(isRTL),
                    },
                  ]}
                >
                  <ThemedText style={{ color: theme.text }}>
                    {formatDisplayTime(walkInEndTime)}
                  </ThemedText>
                  <DDIcon name="clock" size={18} variant="muted" />
                </Pressable>
              </View>

              {showEndTimePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={walkInEndTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleEndTimeChange}
                />
              )}

              {/* iOS Inline End Time Picker Overlay - covers modal content to avoid stacking issues */}
              {showEndTimePicker && Platform.OS === 'ios' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, borderRadius: 12 }]}>
                  <View style={{ flex: 1, padding: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: Spacing.md, marginBottom: Spacing.md }}>
                      <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text, flex: 1 }]}>
                        {t("form.endTime")}
                      </ThemedText>
                      <Pressable onPress={() => setShowEndTimePicker(false)} hitSlop={8}>
                        <DDIcon name="x" size={20} variant="muted" />
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={walkInEndTime}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      onChange={handleEndTimeChange}
                      style={{ height: 180 }}
                    />
                    <Spacer height={Spacing.lg} />
                    <DirectionalRow style={{ gap: Spacing.md }}>
                      <LoadingButton
                        onPress={() => setShowEndTimePicker(false)}
                        variant="secondary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.cancel")}
                      </LoadingButton>
                      <LoadingButton
                        onPress={() => setShowEndTimePicker(false)}
                        variant="primary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.done")}
                      </LoadingButton>
                    </DirectionalRow>
                  </View>
                </View>
              )}

              {showStartTimePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={approvalStartTime || new Date()}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  minimumDate={new Date()}
                  onChange={handleStartTimeChange}
                />
              )}

              {showStartTimePicker && Platform.OS === 'ios' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, borderRadius: 12 }]}>
                  <View style={{ flex: 1, padding: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: Spacing.md, marginBottom: Spacing.md }}>
                      <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text, flex: 1 }]}>
                        {t("form.startTime")}
                      </ThemedText>
                      <Pressable onPress={() => setShowStartTimePicker(false)} hitSlop={8}>
                        <DDIcon name="x" size={20} variant="muted" />
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={approvalStartTime || new Date()}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      minimumDate={new Date()}
                      onChange={handleStartTimeChange}
                      style={{ height: 180 }}
                    />
                    <Spacer height={Spacing.lg} />
                    <DirectionalRow style={{ gap: Spacing.md }}>
                      <LoadingButton
                        onPress={() => setShowStartTimePicker(false)}
                        variant="secondary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.cancel")}
                      </LoadingButton>
                      <LoadingButton
                        onPress={() => setShowStartTimePicker(false)}
                        variant="primary"
                        size="medium"
                        style={{ flex: 1 }}
                      >
                        {t("common.done")}
                      </LoadingButton>
                    </DirectionalRow>
                  </View>
                </View>
              )}

              {/* Additional Services Section - Hidden for walk-in requests */}

              <Spacer height={Spacing.xl} />

              <DirectionalRow style={styles.modalActions}>
                <LoadingButton
                  onPress={() => {
                    setShowWalkInApprovalModal(false);
                    setShowStartTimePicker(false);
                    setShowEndTimePicker(false);
                  }}
                  disabled={isProcessing}
                  variant="secondary"
                  size="medium"
                  style={styles.modalActionButton}
                >
                  {t("common.cancel")}
                </LoadingButton>

                <Spacer width={Spacing.md} />

                <LoadingButton
                  onPress={handleWalkInApprovalSubmit}
                  loading={
                    approveMutation.isPending || updateMutation.isPending
                  }
                  disabled={isProcessing}
                  variant={isWalkInEditMode ? "primary" : "success"}
                  size="medium"
                  loadingText={
                    isWalkInEditMode
                      ? t("common.saving")
                      : t("common.approving")
                  }
                  style={styles.modalActionButton}
                >
                  {isWalkInEditMode ? t("common.save") : t("actions.approve")}
                </LoadingButton>
              </DirectionalRow>
            </ThemedView>
          </View>
        </View>
      </Modal>

      {/* Inline End Time Picker for approved walk-ins */}
      {showInlineEndTimePicker && inlineEndTime && (
        <DateTimePicker
          value={inlineEndTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleInlineEndTimeChange}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  sectionHeader: {},
  inlineQueryFeedback: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
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
  avatarNew: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTextNew: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  statusHeader: {
    borderRadius: LAYOUT.cardRadius,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  statusAccent: {
    position: "absolute",
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.accentWidth,
  },
  statusContent: {
    alignItems: "center",
    padding: LAYOUT.headerPadding,
  },
  statusTextContainer: {
    marginStart: Spacing.md,
    flex: 1,
  },

  card: {
    borderRadius: LAYOUT.cardRadius,
    padding: LAYOUT.cardPadding,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  visitorRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.cardRadius,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  visitorInfo: {
    flex: 1,
    marginStart: Spacing.lg,
  },
  contactRow: {
    alignItems: "center",
    gap: Spacing.md,
  },

  detailRow: {
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  detailRowStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
  },
  inlineTimeButton: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
  },

  serviceRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  visitDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  visitDetailItem: {
    flex: 1,
    minWidth: 150,
    alignItems: "center",
    gap: Spacing.sm,
  },
  visitDetailText: {
    flex: 1,
  },
  serviceItemNew: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 8,
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
  serviceInfo: {
    flex: 1,
  },
  compactServiceIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },

  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: "100%",
    paddingHorizontal: Spacing.xl,
    maxWidth: 440,
    alignItems: "center",
  },
  modalKeyboardAvoidingView: {
    flex: 1,
    width: "100%",
    maxWidth: 440,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    paddingTop: Spacing.lg,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: "relative",
    zIndex: 10,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    zIndex: 10,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  modalIconWrapper: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    minHeight: 110,
    fontSize: 14,
    fontFamily: FontFamily.latinRegular,
    lineHeight: 21,
  },
  modalActions: {
    width: "100%",
  },
  modalActionButton: {
    flex: 1,
  },

  toast: {
    position: "absolute",
    bottom: 120,
    start: Spacing.xl,
    end: Spacing.xl,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    fontSize: 15,
    fontWeight: "600",
    marginStart: Spacing.sm,
  },
});
