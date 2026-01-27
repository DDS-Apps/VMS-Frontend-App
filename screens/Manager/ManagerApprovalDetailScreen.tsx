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
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { REQUEST_STATUS } from "@/constants/requestConstants";
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
import { calculateServerDuration } from "@/utils/dateTimeUtils";
import { useServerDateTime } from "@/hooks/useServerDateTime";
import { applyOpacity } from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";

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
  const { requestId } = route.params;
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

  // Inline end time editing state (for approved walk-ins)
  const [showInlineEndTimePicker, setShowInlineEndTimePicker] = useState(false);
  const [inlineEndTime, setInlineEndTime] = useState<Date | null>(null);

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
    // DEBUG: Trace parking data in screen
    console.log('[DEBUG ManagerApprovalDetailScreen] Mapped request parking data:', {
      visitorNeedsParking: mapped.visitorNeedsParking,
      isVisitorNeedsParking: mapped.isVisitorNeedsParking,
      licensePlate: mapped.licensePlate,
      carModel: mapped.carModel,
      carColor: mapped.carColor,
    });
    return mapped;
  }, [visitData]);

  const timelineData: TimelineData = useMemo(
    () => ({
      createdAt: visitData?.createdAt ?? "",
      status: visitData?.status ?? "pending",
      isWalkIn: visitData?.isWalkIn ?? false,
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

  // Helper to parse duration string to milliseconds (supports various formats)
  const parseDurationToMs = (duration: string): number => {
    if (!duration) return 60 * 60 * 1000; // default 1 hour

    const durationStr = String(duration).trim();

    // Handle "Full Day" or similar
    if (/full\s*day/i.test(durationStr)) {
      return 24 * 60 * 60 * 1000;
    }

    // Parse ISO 8601 duration (e.g., "PT1H30M", "PT24H", "P1D")
    if (durationStr.startsWith("P")) {
      let totalMs = 0;
      const daysMatch = durationStr.match(/(\d+)D/i);
      const hoursMatch = durationStr.match(/(\d+)H/i);
      const minutesMatch = durationStr.match(/(\d+)M(?!O)/i); // M but not MO (month)
      if (daysMatch) totalMs += parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
      if (hoursMatch) totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
      if (minutesMatch) totalMs += parseInt(minutesMatch[1]) * 60 * 1000;
      return totalMs > 0 ? totalMs : 60 * 60 * 1000;
    }

    // Parse human-readable format (e.g., "2 hours 10 minutes", "1.5 hours", "1 day", "30 minutes")
    let totalMs = 0;
    const daysMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*days?/i);
    const hoursMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*(?:hours?|h\b)/i);
    const minutesMatch = durationStr.match(/(\d+)\s*(?:minutes?|mins?|m\b)/i);

    if (daysMatch) totalMs += parseFloat(daysMatch[1]) * 24 * 60 * 60 * 1000;
    if (hoursMatch) totalMs += parseFloat(hoursMatch[1]) * 60 * 60 * 1000;
    if (minutesMatch) totalMs += parseInt(minutesMatch[1]) * 60 * 1000;

    return totalMs > 0 ? totalMs : 60 * 60 * 1000; // Default 1 hour if parsing fails
  };

  // Check if the visit date/time has passed - disable approval actions for expired visits
  // A visit is only expired when the END time has passed, not the start time
  const isVisitExpired = useMemo(() => {
    if (!visitData?.visitDate) return false;

    try {
      const now = new Date();

      console.log("[isVisitExpired] Checking expiration:", {
        visitDate: visitData.visitDate,
        visitTime: visitData.visitTime,
        endTime: visitData.endTime,
        duration: visitData.duration,
        now: now.toISOString(),
      });

      // Priority 1: Check end time if available (endTime field)
      const endTimeStr = visitData.endTime;
      if (endTimeStr && visitData.visitDate) {
        const visitEndDateTime = parseDateTime(visitData.visitDate, endTimeStr);
        console.log("[isVisitExpired] Priority 1 - endTime parsed:", {
          endTimeStr,
          visitEndDateTime: visitEndDateTime.toISOString(),
          isValid: !isNaN(visitEndDateTime.getTime()),
          isExpired: visitEndDateTime < now,
        });
        if (!isNaN(visitEndDateTime.getTime())) {
          return visitEndDateTime < now;
        }
      }

      // Priority 2: Calculate end time from start time + duration
      if (visitData.visitTime && visitData.duration) {
        const startDateTime = parseDateTime(
          visitData.visitDate,
          visitData.visitTime,
        );
        if (!isNaN(startDateTime.getTime())) {
          const durationMs = parseDurationToMs(visitData.duration);
          const calculatedEndTime = new Date(
            startDateTime.getTime() + durationMs,
          );
          console.log("[isVisitExpired] Priority 2 - calculated end time:", {
            startDateTime: startDateTime.toISOString(),
            durationMs,
            calculatedEndTime: calculatedEndTime.toISOString(),
            isExpired: calculatedEndTime < now,
          });
          return calculatedEndTime < now;
        }
      }

      // Fallback: check if the visit date (end of day) has passed
      const [year, month, day] = visitData.visitDate.split("-").map(Number);
      if (year && month && day) {
        // End of visit day (23:59:59)
        const visitDateEndOfDay = new Date(year, month - 1, day, 23, 59, 59);
        console.log("[isVisitExpired] Fallback - end of day:", {
          visitDateEndOfDay: visitDateEndOfDay.toISOString(),
          isExpired: visitDateEndOfDay < now,
        });
        if (visitDateEndOfDay < now) {
          return true;
        }
      }

      return false;
    } catch (err) {
      console.log("[isVisitExpired] Error:", err);
      return false;
    }
  }, [
    visitData?.visitDate,
    visitData?.visitTime,
    visitData?.endTime,
    visitData?.duration,
    parseDateTime,
  ]);

  if (isLoading || isFetching) {
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

  if (error || !request) {
    return (
      <ScreenScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl }}
      >
        <Spacer height={Spacing.xl} />
        <ThemedText style={[Typography.title]}>
          {t("errors.notFound")}
        </ThemedText>
      </ScreenScrollView>
    );
  }

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
    if (isReadOnlyRole || isVisitExpired) return;

    // For walk-in requests where manager IS the host, show the end time modal with service selection
    // If manager is NOT the host, the employee already configured end time/services, so just approve directly
    if (visitData?.isWalkIn && isManagerTheHost) {
      const approvalTime = new Date();
      setApprovalStartTime(approvalTime);
      const defaultEndTime = new Date(approvalTime.getTime() + 60 * 60 * 1000);
      setWalkInEndTime(defaultEndTime);

      // Initialize services from existing visit data
      // For walk-ins, parking is always disabled (same as Employee flow)
      setWalkInRequiresMeetingRoom(!!visitData.meetingRoom);
      setWalkInRequiresParking(false); // Parking disabled for walk-ins
      setWalkInRequiresBuffet(!!visitData.buffet);

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

    // Initialize with existing data from the visit - preserve original start time
    const now = new Date();

    // Parse existing start time from visit data using proper 12-hour format parser
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
    setWalkInRequiresMeetingRoom(!!visitData.meetingRoom);
    setWalkInRequiresParking(false); // Parking disabled for walk-ins
    setWalkInRequiresBuffet(!!visitData.buffet);

    setIsWalkInEditMode(true);
    setShowWalkInApprovalModal(true);
  };

  const handleWalkInApprovalSubmit = () => {
    if (isReadOnlyRole) return;

    // Validate end time is after current time
    if (walkInEndTime.getTime() <= new Date().getTime()) {
      Alert.alert(t("errors.validation"), t("errors.endTimeMustBeLater"));
      return;
    }

    // Use the captured approval start time (or fallback to now)
    const startTime = approvalStartTime || new Date();

    // Calculate duration from approval start time to selected end time using timezone utility
    const isoDuration = calculateServerDuration(startTime, walkInEndTime);

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
      payload.needsMeetingRoom = walkInRequiresMeetingRoom;
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
            setIsWalkInEditMode(false);
            // Reset service states
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
                  setIsWalkInEditMode(false);
                  // Reset service states
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
    if (isReadOnlyRole || isVisitExpired) return;
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

  const getStatusInfo = () => {
    let statusColor = theme.warning;
    let statusText = t("status.pending");

    if (
      request.status === REQUEST_STATUS.APPROVED ||
      request.status === REQUEST_STATUS.VISITOR_ACCEPTED
    ) {
      statusColor = theme.success;
      statusText = t("status.approved");
    } else if (request.status === REQUEST_STATUS.REJECTED) {
      statusColor = theme.error;
      statusText = t("status.rejected");
    } else if (request.status === REQUEST_STATUS.CANCELLED) {
      statusColor = theme.error;
      statusText = t("status.cancelled");
    } else if (request.status === REQUEST_STATUS.AUTO_CANCELLED) {
      statusColor = theme.error;
      statusText = t("status.autoCancelled");
    }

    return { statusColor, statusText };
  };

  const { statusColor, statusText } = getStatusInfo();
  const initials = request.visitor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <>
      <ScreenScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.lg,
        }}
      >
        <ThemedView
          style={[styles.cardNew, { backgroundColor: theme.surface }]}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={[
                styles.avatarNew,
                { backgroundColor: applyOpacity(theme.primary, "15") },
              ]}
            >
              <ThemedText
                style={[styles.avatarTextNew, { color: theme.primary }]}
              >
                {initials}
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
            {request.visitor.company ? (
              <ThemedText
                style={[
                  Typography.body,
                  { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
                ]}
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
                    style={[
                      Typography.caption,
                      { color: theme.warning, fontWeight: "600", fontSize: 12 },
                    ]}
                  >
                    {t("reception.walkInVisitor")}
                  </ThemedText>
                </View>
              ) : null}
              <View
                style={{
                  backgroundColor: applyOpacity(statusColor, "15"),
                  borderColor: applyOpacity(statusColor, "30"),
                  borderWidth: StyleSheet.hairlineWidth,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: 6,
                  borderRadius: BorderRadius.full,
                }}
              >
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: statusColor, fontWeight: "600", fontSize: 12 },
                  ]}
                >
                  {statusText}
                </ThemedText>
              </View>
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
                style={[
                  Typography.caption,
                  {
                    color: theme.textSecondary,
                    fontSize: 13,
                    flex: 1,
                  },
                ]}
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
                style={[
                  Typography.caption,
                  {
                    color: theme.textSecondary,
                    fontSize: 13,
                    flex: 1,
                  },
                ]}
              >
                {request.visitor.phone}
              </ThemedText>
            </DirectionalRow>
        </ThemedView>

        {request.status === REQUEST_STATUS.REJECTED &&
        request.approval.rejectionReason ? (
          <>
            <Spacer height={Spacing.lg} />
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
          </>
        ) : null}

        {request.visitorDecision &&
        !request.visitorDecision.accepted &&
        request.visitorDecision.reason ? (
          <>
            <Spacer height={Spacing.lg} />
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
          </>
        ) : null}

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
          <DirectionalRow style={styles.serviceRow}>
            <View
              style={[
                styles.serviceIcon,
                { backgroundColor: applyOpacity(theme.textSecondary, "15") },
              ]}
            >
              <DDIcon name="user" size={18} color={theme.text} />
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
                {t("dashboard.requestedBy")}
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
              >
                {request.employeeName}
                {request.employeeDepartment
                  ? ` (${request.employeeDepartment})`
                  : ""}
              </ThemedText>
            </View>
          </DirectionalRow>

          <Spacer height={Spacing.lg} />

          <DirectionalRow style={styles.serviceRow}>
            <View
              style={[
                styles.serviceIcon,
                { backgroundColor: applyOpacity(theme.textSecondary, "15") },
              ]}
            >
              <DDIcon name="calendar" size={18} color={theme.text} />
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
                {t("visitor.visitDate")} & {t("visitor.visitTime")}
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
              >
                {formatDateShort(request.visitDate)} •{" "}
                {formatVisitTimeRange(request.visitTime, request.endTime)}
              </ThemedText>
            </View>
          </DirectionalRow>

          <Spacer height={Spacing.lg} />

          <DirectionalRow style={styles.serviceRow}>
            <View
              style={[
                styles.serviceIcon,
                { backgroundColor: applyOpacity(theme.textSecondary, "15") },
              ]}
            >
              <DDIcon name="clock" size={18} color={theme.text} />
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
              >
                {parseISODuration(request.duration)}
              </ThemedText>
            </View>
          </DirectionalRow>

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

          <Spacer height={Spacing.lg} />

          <DirectionalRow style={styles.serviceRow}>
            <View
              style={[
                styles.serviceIcon,
                { backgroundColor: applyOpacity(theme.textSecondary, "15") },
              ]}
            >
              <DDIcon name="file-text" size={18} color={theme.text} />
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
                {request.purpose}
              </ThemedText>
            </View>
          </DirectionalRow>

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
          {/* Meeting Room */}
          <DirectionalRow style={styles.serviceRow}>
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
          <Spacer height={Spacing.lg} />

          {/* Buffet */}
          <DirectionalRow style={styles.serviceRow}>
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
                  {request.buffet.location} (
                  {request.buffet.mealType.charAt(0).toUpperCase() +
                    request.buffet.mealType.slice(1)}
                  )
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
          <Spacer height={Spacing.lg} />

          {/* Parking */}
          <DirectionalRow style={styles.serviceRow}>
            <View
              style={[
                styles.serviceIcon,
                {
                  backgroundColor: applyOpacity(
                    request.visitorNeedsParking
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
                  request.visitorNeedsParking
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
              {request.visitorNeedsParking ? (
                request.licensePlate || request.carModel || request.carColor ? (
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
                    {[
                      request.licensePlate,
                      request.carModel,
                      request.carColor,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </ThemedText>
                ) : (
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
                    {t("parking.parkingPending")}
                  </ThemedText>
                )
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
        </ThemedView>

        <Spacer height={LAYOUT.sectionSpacing} />

        <RequestTimeline steps={timelineSteps} />

        <Spacer height={100} />
      </ScreenScrollView>

      {!isReadOnlyRole &&
        request.status === REQUEST_STATUS.PENDING_APPROVAL && (
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
            {request.isWalkIn && isManagerTheHost ? (
              <DirectionalRow style={{ gap: Spacing.md }}>
                <LoadingButton
                  onPress={handleEditWalkInServices}
                  loading={false}
                  disabled={isProcessing}
                  variant="primary"
                  size="large"
                  icon="settings"
                  iconPosition="left"
                  style={{ flex: 1 }}
                >
                  {t("actions.editServices")}
                </LoadingButton>
                <LoadingButton
                  onPress={() => setShowCancelModal(true)}
                  loading={cancelMutation.isPending}
                  disabled={isProcessing}
                  variant="danger"
                  size="large"
                  icon="x"
                  iconPosition="left"
                  loadingText={t("common.loading")}
                  style={{ flex: 1 }}
                >
                  {t("common.cancel")}
                </LoadingButton>
              </DirectionalRow>
            ) : (
              <LoadingButton
                onPress={() => setShowCancelModal(true)}
                loading={cancelMutation.isPending}
                disabled={isProcessing}
                variant="danger"
                size="large"
                icon="x"
                iconPosition="left"
                loadingText={t("common.loading")}
                fullWidth
              >
                {t("actions.cancelRequest")}
              </LoadingButton>
            )}
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
            onPress={() => !isProcessing && setShowRejectModal(false)}
          />
          <View style={styles.modalContainer}>
            <ThemedView
              style={[styles.modalContent, { backgroundColor: theme.surface }]}
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
            </ThemedView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWalkInApprovalModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          !isProcessing && setShowWalkInApprovalModal(false)
        }
        statusBarTranslucent
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable
            style={[
              styles.modalBackdrop,
              { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            ]}
            onPress={() => !isProcessing && setShowWalkInApprovalModal(false)}
          />
          <View style={styles.modalContainer}>
            <ThemedView
              style={[styles.modalContent, { backgroundColor: theme.surface }]}
            >
              <Pressable
                onPress={() =>
                  !isProcessing && setShowWalkInApprovalModal(false)
                }
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

              {/* Disabled Start Time Field */}
              <View style={{ width: "100%" }}>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.textSecondary, marginBottom: Spacing.xs },
                  ]}
                >
                  {t("form.startTime")}
                </ThemedText>
                <DirectionalRow
                  style={{
                    borderWidth: 1,
                    borderRadius: BorderRadius.md,
                    borderColor: theme.border,
                    backgroundColor: applyOpacity(theme.surfaceSecondary, "50"),
                    paddingVertical: Spacing.md,
                    paddingHorizontal: Spacing.lg,
                    alignItems: "center",
                    opacity: 0.7,
                  }}
                >
                  <DDIcon name="clock" size={16} variant="muted" />
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        marginStart: Spacing.sm,
                        color: theme.textSecondary,
                        fontSize: 14,
                        flex: 1,
                      },
                    ]}
                  >
                    {formatDisplayTime(approvalStartTime || new Date())}
                  </ThemedText>
                  <DDIcon name="lock" size={14} variant="muted" />
                </DirectionalRow>
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      marginTop: Spacing.xs,
                      fontSize: 11,
                    },
                  ]}
                >
                  {t("form.startTimeReadOnly")}
                </ThemedText>
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

              {showEndTimePicker && (
                <DateTimePicker
                  value={walkInEndTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleEndTimeChange}
                />
              )}

              {/* Additional Services Section - Hidden for walk-in requests */}

              <Spacer height={Spacing.xl} />

              <DirectionalRow style={styles.modalActions}>
                <LoadingButton
                  onPress={() => setShowWalkInApprovalModal(false)}
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
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {},
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
    lineHeight: 40,
    fontWeight: "700",
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
    alignItems: "flex-start",
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
    fontFamily: "Inter_400Regular",
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
