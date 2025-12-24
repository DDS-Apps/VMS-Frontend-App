import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, Modal, Animated, Alert, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { SelectableCard, CardGridStyles } from "@/components/SelectableCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { REQUEST_STATUS } from "@/constants/requestConstants";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useVisitDetailsQuery, useApproveVisitMutation, useRejectVisitMutation, useCancelVisitMutation, useUpdateVisitMutation } from "@/hooks/queries/useApprovalQueries";
import { useAuth } from "@/contexts/AuthContext";
import { VisitorRequest } from "@/types/vms.types";
import { applyOpacity, createModalOverlayStyle } from "@/utils/statusStyles";
import { ManagerApprovalDetailScreenProps } from "@/types/managerNavigation.types";
import { Theme } from "@/types/theme.types";
import { mapVisitDetailsToVisitorRequest } from "@/services/utils/requestMappers";
import { calculateServerDuration } from "@/services/utils/dateTimeUtils";
import { useServerDateTime } from "@/hooks/useServerDateTime";

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.xxl,
  contentGap: Spacing.md,
  headerPadding: Spacing.lg,
  accentWidth: 3,
};

const Toast = ({ message, type, visible }: { message: string; type: 'success' | 'error'; visible: boolean }) => {
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
          backgroundColor: type === 'success' ? theme.success : theme.error,
          opacity: fadeAnim,
        },
      ]}
    >
      <DDIcon
        name={type === 'success' ? 'check-circle' : 'x-circle'}
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
    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontWeight: '700', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }]}>
      {title}
    </ThemedText>
  </View>
);

export default function ManagerApprovalDetailScreen({ navigation, route }: ManagerApprovalDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDateTime: fmtDateTime, formatDateShort, parseISODuration, formatTimeFromString, formatTimeRange } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { requestId } = route.params;
  const { user } = useAuth();
  const isReadOnlyRole = user?.role === 'building_admin';
  const { 
    formatDateForApi, 
    formatTimeForApi,
    formatTimeForDisplay
  } = useServerDateTime();

  // Helper function for consistent service status colors
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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showWalkInApprovalModal, setShowWalkInApprovalModal] = useState(false);
  const [isWalkInEditMode, setIsWalkInEditMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [walkInEndTime, setWalkInEndTime] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  });
  const [approvalStartTime, setApprovalStartTime] = useState<Date | null>(null);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  // Walk-in approval services state
  const [walkInRequiresMeetingRoom, setWalkInRequiresMeetingRoom] = useState(false);
  const [walkInRequiresParking, setWalkInRequiresParking] = useState(false);
  const [walkInRequiresBuffet, setWalkInRequiresBuffet] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  const { data: visitData, isLoading, isFetching, error, refetch } = useVisitDetailsQuery(requestId);
  const approveMutation = useApproveVisitMutation();
  const rejectMutation = useRejectVisitMutation();
  const cancelMutation = useCancelVisitMutation();
  const updateMutation = useUpdateVisitMutation();

  // Refetch data when screen gains focus to show latest status
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const request = useMemo(() => {
    if (!visitData) return null;
    return mapVisitDetailsToVisitorRequest(visitData);
  }, [visitData]);

  // Check if the logged-in manager is the host of this walk-in
  // If manager IS the host: Receptionist created this for the manager → Manager can add services
  // If manager is NOT the host: Employee created this walk-in → Manager can only approve/reject
  const isManagerTheHost = visitData?.employeeId === user?.id;

  const isProcessing = approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending || updateMutation.isPending;

  if (isLoading || isFetching) {
    return (
      <ScreenScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl }}>
        <Spacer height={Spacing.xl} />
        <SkeletonCard />
        <Spacer height={Spacing.lg} />
        <SkeletonCard />
      </ScreenScrollView>
    );
  }

  if (error || !request) {
    return (
      <ScreenScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl }}>
        <Spacer height={Spacing.xl} />
        <ThemedText style={[Typography.title]}>{t('errors.notFound')}</ThemedText>
      </ScreenScrollView>
    );
  }

  const formatDateTime = (isoString: string) => {
    return fmtDateTime(new Date(isoString));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast({ message: '', type: 'success', visible: false });
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
    if (isReadOnlyRole) return;
    
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
          showToast(t('notifications.requestApproved'), 'success');
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        },
        onError: (error) => {
          showToast(t('errors.somethingWentWrong'), 'error');
        },
      }
    );
  };

  // Handler to open the walk-in services modal in edit mode (for already approved walk-ins)
  const handleEditWalkInServices = () => {
    if (isReadOnlyRole || !visitData?.isWalkIn) return;
    
    // Initialize with existing data from the visit - preserve original start time
    const now = new Date();
    
    // Parse existing start time from visit data, fallback to now if not available
    let existingStartTime = now;
    if (visitData.visitDate && visitData.visitTime) {
      const parsedStart = new Date(`${visitData.visitDate}T${visitData.visitTime}`);
      if (!isNaN(parsedStart.getTime())) {
        existingStartTime = parsedStart;
      }
    }
    setApprovalStartTime(existingStartTime);
    
    // Set end time from existing visit data or default to 1 hour from start
    if (visitData.endTime) {
      // Parse existing end time
      const existingEndTime = new Date(visitData.endTime);
      if (!isNaN(existingEndTime.getTime())) {
        setWalkInEndTime(existingEndTime);
      } else {
        setWalkInEndTime(new Date(existingStartTime.getTime() + 60 * 60 * 1000));
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
            showToast(t('notifications.visitUpdated'), 'success');
            refetch();
          },
          onError: (error) => {
            showToast(t('errors.somethingWentWrong'), 'error');
          },
        }
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
                  showToast(t('notifications.walkInApproved'), 'success');
                  setTimeout(() => {
                    navigation.goBack();
                  }, 1000);
                },
                onError: (error) => {
                  showToast(t('errors.somethingWentWrong'), 'error');
                },
              }
            );
          },
          onError: (error) => {
            showToast(t('errors.somethingWentWrong'), 'error');
          },
        }
      );
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      setWalkInEndTime(selectedTime);
    }
  };

  const handleReject = () => {
    if (isReadOnlyRole) return;
    const reason = rejectionReason.trim() || 'No reason provided';
    rejectMutation.mutate(
      { id: requestId, payload: { reason } },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectionReason('');
          showToast(t('notifications.requestRejected'), 'success');
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        },
        onError: (error) => {
          showToast(t('errors.somethingWentWrong'), 'error');
        },
      }
    );
  };

  const handleCancel = () => {
    if (isReadOnlyRole) return;
    cancelMutation.mutate(requestId, {
      onSuccess: () => {
        setShowCancelModal(false);
        showToast(t('notifications.requestCancelled'), 'success');
        setTimeout(() => {
          navigation.goBack();
        }, 1000);
      },
      onError: (error) => {
        showToast(t('errors.somethingWentWrong'), 'error');
      },
    });
  };

  const renderStatusHeader = () => {
    let statusColor = theme.primary;
    let statusIcon: IconName = 'clock';
    let statusText = t('status.pending');

    if (request.status === REQUEST_STATUS.APPROVED) {
      statusColor = theme.success;
      statusIcon = 'check-circle';
      statusText = t('status.approved');
    } else if (request.status === REQUEST_STATUS.REJECTED) {
      statusColor = theme.error;
      statusIcon = 'x-circle';
      statusText = t('status.rejected');
    }

    return (
      <ThemedView style={[styles.statusHeader, { backgroundColor: theme.surface }]}>
        <View style={[styles.statusAccent, { backgroundColor: statusColor }]} />
        <View style={styles.statusContent}>
          <DDIcon name={statusIcon} size={20} color={statusColor} />
          <View style={styles.statusTextContainer}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 16 }]}>
              {statusText}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 12 }]}>
              ID: {request.id}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  };

  const initials = request.visitor.fullName.split(' ').map(n => n[0]).join('');

  return (
    <>
      <ScreenScrollView 
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl,
        }}
      >
        <Spacer height={Spacing.xl} />

        {renderStatusHeader()}

        <Spacer height={LAYOUT.sectionSpacing} />

        <SectionHeader title={t('visitor.visitorDetails')} theme={theme} />
        <Spacer height={Spacing.md} />

        <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.visitorRow}>
            <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                {initials}
              </ThemedText>
            </View>
            <View style={styles.visitorInfo}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 17 }]}>
                {request.visitor.fullName}
              </ThemedText>
              {request.visitor.company ? (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 4 }}>
                  <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                    {request.visitor.company}
                  </ThemedText>
                  {request.isWalkIn ? (
                    <View style={{ marginStart: Spacing.sm }}>
                      <DDIcon name="user-check" size={14} color={theme.warning} />
                    </View>
                  ) : null}
                </View>
              ) : request.isWalkIn ? (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 4 }}>
                  <DDIcon name="user-check" size={14} color={theme.warning} />
                </View>
              ) : null}
            </View>
          </View>

          <Spacer height={Spacing.lg} />

          <View style={styles.contactRow}>
            <DDIcon name="mail" size={14} variant="muted" />
            <ThemedText style={[Typography.caption, { marginStart: 8, color: theme.textSecondary, fontSize: 13 }]}>
              {request.visitor.email}
            </ThemedText>
          </View>

          <Spacer height={Spacing.sm} />

          <View style={styles.contactRow}>
            <DDIcon name="phone" size={14} variant="muted" />
            <ThemedText style={[Typography.caption, { marginStart: 8, color: theme.textSecondary, fontSize: 13 }]}>
              {request.visitor.phone}
            </ThemedText>
          </View>
        </ThemedView>

        <Spacer height={LAYOUT.sectionSpacing} />

        <SectionHeader title={t('visitor.visitorRequest')} theme={theme} />
        <Spacer height={Spacing.md} />

        <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>
              {t('dashboard.requestedBy')}
            </ThemedText>
            <ThemedText style={[styles.detailValue]}>
              {request.employeeName}{request.employeeDepartment ? ` (${request.employeeDepartment})` : ''}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>
              {t('visitor.visitDate')} & {t('visitor.visitTime')}
            </ThemedText>
            <ThemedText style={[styles.detailValue]}>
              {formatDateShort(request.visitDate)} • {formatTimeFromString(request.visitTime)}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>
              {t('form.duration')}
            </ThemedText>
            <ThemedText style={[styles.detailValue]}>
              {parseISODuration(request.duration)}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>
              {t('form.requestDateTime')}
            </ThemedText>
            <ThemedText style={[styles.detailValue]}>
              {formatDateTime(request.createdAt)}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>
              {t('form.purpose')}
            </ThemedText>
            <Spacer height={6} />
            <ThemedText style={[styles.detailValue, { lineHeight: 22 }]}>
              {request.purpose}
            </ThemedText>
          </View>
        </ThemedView>

        <Spacer height={LAYOUT.sectionSpacing} />

        <SectionHeader title={t('services.additionalServices')} theme={theme} />
        <Spacer height={Spacing.md} />

        <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Meeting Room */}
          <View style={styles.serviceRow}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(request.meetingRoom ? theme.secondary : theme.textSecondary, '20') }]}>
              <DDIcon name="briefcase" size={18} color={request.meetingRoom ? theme.secondary : theme.textSecondary} />
            </View>
            <View style={[styles.serviceInfo, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('services.meetingRoom')}
                </ThemedText>
                {request.meetingRoom?.status ? (
                  <StatusBadge
                    label={formatServiceStatus(request.meetingRoom.status)}
                    variant={getServiceStatusVariant(request.meetingRoom.status)}
                    size="sm"
                  />
                ) : null}
              </View>
              {request.meetingRoom ? (
                <>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                    {request.meetingRoom.name} - {request.meetingRoom.floor}
                  </ThemedText>
                  {request.meetingRoom.timeSlot ? (
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                      {formatDateShort(request.visitDate)} • {formatTimeRange(request.meetingRoom.timeSlot)}
                    </ThemedText>
                  ) : null}
                </>
              ) : (request as any).meetingRoomPending ? (
                <ThemedText style={[Typography.caption, { color: theme.warning, marginTop: 2, fontSize: 13 }]}>
                  {t('status.pending')}
                </ThemedText>
              ) : (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, fontStyle: 'italic' }]}>
                  {t('common.notRequested')}
                </ThemedText>
              )}
            </View>
          </View>
          <Spacer height={Spacing.lg} />

          {/* Parking */}
          <View style={styles.serviceRow}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(request.parkingSlot ? theme.info : theme.textSecondary, '20') }]}>
              <DDIcon name="map-pin" size={18} color={request.parkingSlot ? theme.info : theme.textSecondary} />
            </View>
            <View style={[styles.serviceInfo, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('services.parking')}
                </ThemedText>
                {request.parkingSlot?.status ? (
                  <StatusBadge
                    label={formatServiceStatus(request.parkingSlot.status)}
                    variant={getServiceStatusVariant(request.parkingSlot.status)}
                    size="sm"
                  />
                ) : null}
              </View>
              {request.parkingSlot ? (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {request.parkingSlot.location === 'SKBC_basement' || request.parkingSlot.location === 'skbc_basement' ? 'SKBC Basement' : request.parkingSlot.location}, {t('parking.slotNumber')} {request.parkingSlot.slotNumber}
                </ThemedText>
              ) : (request as any).parkingPending ? (
                <ThemedText style={[Typography.caption, { color: theme.warning, marginTop: 2, fontSize: 13 }]}>
                  {t('status.pending')}
                </ThemedText>
              ) : (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, fontStyle: 'italic' }]}>
                  {t('common.notRequested')}
                </ThemedText>
              )}
            </View>
          </View>
          <Spacer height={Spacing.lg} />

          {/* Valet */}
          <View style={styles.serviceRow}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(request.valet ? theme.primary : theme.textSecondary, '20') }]}>
              <DDIcon name="truck" size={18} color={request.valet ? theme.primary : theme.textSecondary} />
            </View>
            <View style={[styles.serviceInfo, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('services.valet')}
                </ThemedText>
                {request.valet?.status ? (
                  <StatusBadge
                    label={formatServiceStatus(request.valet.status)}
                    variant={getServiceStatusVariant(request.valet.status)}
                    size="sm"
                  />
                ) : null}
              </View>
              {request.valet ? (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {request.valet.driver ? `${t('navigation.drivers')}: ${request.valet.driver.name}` : t('status.pending')}
                </ThemedText>
              ) : (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, fontStyle: 'italic' }]}>
                  {t('common.notRequested')}
                </ThemedText>
              )}
            </View>
          </View>
          <Spacer height={Spacing.lg} />

          {/* Buffet */}
          <View style={styles.serviceRow}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(request.buffet ? theme.secondary : theme.textSecondary, '20') }]}>
              <DDIcon name="cloche" size={18} color={request.buffet ? theme.secondary : theme.textSecondary} />
            </View>
            <View style={[styles.serviceInfo, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('services.buffet')}
                </ThemedText>
                {request.buffet?.status ? (
                  <StatusBadge
                    label={formatServiceStatus(request.buffet.status)}
                    variant={getServiceStatusVariant(request.buffet.status)}
                    size="sm"
                  />
                ) : null}
              </View>
              {request.buffet && request.buffet.mealType ? (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {request.buffet.location} ({request.buffet.mealType.charAt(0).toUpperCase() + request.buffet.mealType.slice(1)})
                </ThemedText>
              ) : request.buffet ? (
                <ThemedText style={[Typography.caption, { color: theme.warning, marginTop: 2, fontSize: 13 }]}>
                  {t('status.pending')}
                </ThemedText>
              ) : (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, fontStyle: 'italic' }]}>
                  {t('common.notRequested')}
                </ThemedText>
              )}
            </View>
          </View>
        </ThemedView>

        <Spacer height={LAYOUT.sectionSpacing} />

        <Spacer height={100} />
      </ScreenScrollView>

      {!isReadOnlyRole && request.status === REQUEST_STATUS.PENDING_APPROVAL && (
        <View style={[styles.actionBar, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
          <ApprovalActionGroup
            onApprove={handleApprove}
            onReject={() => setShowRejectModal(true)}
            approveLoading={approveMutation.isPending}
            rejectLoading={false}
            disabled={isProcessing}
            size="large"
          />
        </View>
      )}

      {!isReadOnlyRole && (request.status === REQUEST_STATUS.APPROVED || request.status === REQUEST_STATUS.VISITOR_ACCEPTED) && (
        <View style={[styles.actionBar, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
          {request.isWalkIn && isManagerTheHost ? (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: Spacing.md }}>
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
                {t('actions.editServices')}
              </LoadingButton>
              <LoadingButton
                onPress={() => setShowCancelModal(true)}
                loading={cancelMutation.isPending}
                disabled={isProcessing}
                variant="danger"
                size="large"
                icon="x"
                iconPosition="left"
                loadingText={t('common.loading')}
                style={{ flex: 1 }}
              >
                {t('common.cancel')}
              </LoadingButton>
            </View>
          ) : (
            <LoadingButton
              onPress={() => setShowCancelModal(true)}
              loading={cancelMutation.isPending}
              disabled={isProcessing}
              variant="danger"
              size="large"
              icon="x"
              iconPosition="left"
              loadingText={t('common.loading')}
              fullWidth
            >
              {t('actions.cancelRequest')}
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
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
            onPress={() => !isProcessing && setShowCancelModal(false)}
          />
          <View style={styles.modalContainer}>
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Pressable 
                onPress={() => !isProcessing && setShowCancelModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <DDIcon name="x" size={20} variant="muted" />
              </Pressable>

              <View style={styles.modalIconWrapper}>
                <View style={[styles.modalIconContainer, { backgroundColor: applyOpacity(theme.error, '15') }]}>
                  <DDIcon name="x-circle" size={22} color={theme.error} />
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', textAlign: 'center' }]}>
                {t('actions.cancelRequest')}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' }]}>
                {t('settings.logoutConfirm').replace('logout', t('common.cancel').toLowerCase())}
              </ThemedText>

              <Spacer height={Spacing.xl} />

              <View style={styles.modalActions}>
                <LoadingButton
                  onPress={() => setShowCancelModal(false)}
                  disabled={isProcessing}
                  variant="secondary"
                  size="medium"
                  style={styles.modalActionButton}
                >
                  {t('common.back')}
                </LoadingButton>

                <Spacer width={Spacing.md} />

                <LoadingButton
                  onPress={handleCancel}
                  loading={cancelMutation.isPending}
                  disabled={isProcessing}
                  variant="danger"
                  size="medium"
                  loadingText={t('common.loading')}
                  style={styles.modalActionButton}
                >
                  {t('actions.cancelRequest')}
                </LoadingButton>
              </View>
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
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
            onPress={() => !isProcessing && setShowRejectModal(false)}
          />
          <View style={styles.modalContainer}>
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Pressable 
                onPress={() => !isProcessing && setShowRejectModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <DDIcon name="x" size={20} variant="muted" />
              </Pressable>

              <View style={styles.modalIconWrapper}>
                <View style={[styles.modalIconContainer, { backgroundColor: applyOpacity(theme.warning, '15') }]}>
                  <DDIcon name="alert-triangle" size={22} color={theme.warning} />
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', textAlign: 'center' }]}>
                {t('actions.reject')}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' }]}>
                {t('form.enterNotes')} ({t('form.optional').toLowerCase()})
              </ThemedText>

              <Spacer height={Spacing.xl} />

              <TextInput
                style={[
                  styles.reasonInput,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text
                  }
                ]}
                placeholder={t('form.enterNotes')}
                placeholderTextColor={theme.textSecondary}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isProcessing}
              />

              <Spacer height={Spacing.xl} />

              <View style={styles.modalActions}>
                <LoadingButton
                  onPress={() => setShowRejectModal(false)}
                  disabled={isProcessing}
                  variant="secondary"
                  size="medium"
                  style={styles.modalActionButton}
                >
                  {t('common.cancel')}
                </LoadingButton>

                <Spacer width={Spacing.md} />

                <LoadingButton
                  onPress={handleReject}
                  loading={rejectMutation.isPending}
                  disabled={isProcessing}
                  variant="danger"
                  size="medium"
                  loadingText={t('common.loading')}
                  style={styles.modalActionButton}
                >
                  {t('common.confirm')}
                </LoadingButton>
              </View>
            </ThemedView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWalkInApprovalModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isProcessing && setShowWalkInApprovalModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
            onPress={() => !isProcessing && setShowWalkInApprovalModal(false)}
          />
          <View style={styles.modalContainer}>
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Pressable 
                onPress={() => !isProcessing && setShowWalkInApprovalModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <DDIcon name="x" size={20} variant="muted" />
              </Pressable>

              <View style={styles.modalIconWrapper}>
                <View style={[styles.modalIconContainer, { backgroundColor: applyOpacity(isWalkInEditMode ? theme.primary : theme.success, '15') }]}>
                  <DDIcon name={isWalkInEditMode ? "settings" : "check-circle"} size={22} color={isWalkInEditMode ? theme.primary : theme.success} />
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', textAlign: 'center' }]}>
                {isWalkInEditMode ? t('services.additionalServices') : `${t('actions.approve')} ${t('visitor.walkIn')}`}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' }]}>
                {isWalkInEditMode ? t('actions.editServicesDescription') : t('visitor.selectEndTime')}
              </ThemedText>

              <Spacer height={Spacing.xl} />

              <View style={{ width: '100%' }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('form.endTime')} *
                </ThemedText>
                <Pressable
                  onPress={() => setShowEndTimePicker(true)}
                  style={[
                    styles.reasonInput,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      paddingVertical: Spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }
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

              {/* Additional Services Section - Only show when Manager is the host */}
              {isManagerTheHost ? (
                <>
                  <Spacer height={Spacing.xl} />
                  <View style={{ width: '100%' }}>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.md }]}>
                      {t('services.additionalServices')}
                    </ThemedText>
                    
                    <View style={CardGridStyles.grid}>
                      <View style={CardGridStyles.cardWrapper3Col}>
                        <SelectableCard
                          onPress={() => setWalkInRequiresMeetingRoom(!walkInRequiresMeetingRoom)}
                          selected={walkInRequiresMeetingRoom}
                        >
                          <View style={[styles.compactServiceIcon, { backgroundColor: applyOpacity(theme.cardIcon, "15") }]}>
                            <DDIcon name="users" size={20} color={theme.cardIcon} />
                          </View>
                          <ThemedText style={[Typography.caption, { fontWeight: "600", marginTop: Spacing.xs, textAlign: "center", color: theme.text, fontSize: 11 }]}>
                            {t("services.meetingRoom")}
                          </ThemedText>
                        </SelectableCard>
                      </View>

                      <View style={[CardGridStyles.cardWrapper3Col, { opacity: 0.5 }]}>
                        <SelectableCard
                          onPress={() => {}}
                          selected={false}
                        >
                          <View style={[styles.compactServiceIcon, { backgroundColor: applyOpacity(theme.textSecondary, "15") }]}>
                            <DDIcon name="map-pin" size={20} color={theme.textSecondary} />
                          </View>
                          <ThemedText style={[Typography.caption, { fontWeight: "600", marginTop: Spacing.xs, textAlign: "center", color: theme.textSecondary, fontSize: 11 }]}>
                            {t("parking.parking")}
                          </ThemedText>
                        </SelectableCard>
                      </View>

                      <View style={CardGridStyles.cardWrapper3Col}>
                        <SelectableCard
                          onPress={() => setWalkInRequiresBuffet(!walkInRequiresBuffet)}
                          selected={walkInRequiresBuffet}
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
                  </View>
                </>
              ) : null}

              <Spacer height={Spacing.xl} />

              <View style={styles.modalActions}>
                <LoadingButton
                  onPress={() => setShowWalkInApprovalModal(false)}
                  disabled={isProcessing}
                  variant="secondary"
                  size="medium"
                  style={styles.modalActionButton}
                >
                  {t('common.cancel')}
                </LoadingButton>

                <Spacer width={Spacing.md} />

                <LoadingButton
                  onPress={handleWalkInApprovalSubmit}
                  loading={approveMutation.isPending || updateMutation.isPending}
                  disabled={isProcessing}
                  variant={isWalkInEditMode ? "primary" : "success"}
                  size="medium"
                  loadingText={isWalkInEditMode ? t('common.saving') : t('common.approving')}
                  style={styles.modalActionButton}
                >
                  {isWalkInEditMode ? t('common.save') : t('actions.approve')}
                </LoadingButton>
              </View>
            </ThemedView>
          </View>
        </View>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
  },

  statusHeader: {
    borderRadius: LAYOUT.cardRadius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  statusAccent: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.accentWidth,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.headerPadding,
  },
  statusTextContainer: {
    marginStart: Spacing.md,
    flex: 1,
  },

  card: {
    borderRadius: LAYOUT.cardRadius,
    padding: LAYOUT.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  visitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.cardRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  visitorInfo: {
    flex: 1,
    marginStart: Spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
  },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  compactServiceIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    maxWidth: 440,
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    paddingTop: Spacing.lg,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    zIndex: 10,
  },
  modalIconWrapper: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    minHeight: 110,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  modalActionButton: {
    flex: 1,
  },

  toast: {
    position: 'absolute',
    bottom: 120,
    start: Spacing.xl,
    end: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    fontSize: 15,
    fontWeight: '600',
    marginStart: Spacing.sm,
  },
});
