import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, Modal, Animated, Alert } from "react-native";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { REQUEST_STATUS } from "@/constants/requestConstants";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useVisitDetailsQuery, useApproveVisitMutation, useRejectVisitMutation, useCancelVisitMutation } from "@/hooks/queries/useApprovalQueries";
import { VisitorRequest } from "@/types/vms.types";
import { applyOpacity, createModalOverlayStyle } from "@/utils/statusStyles";
import { ManagerApprovalDetailScreenProps } from "@/types/managerNavigation.types";
import { Theme } from "@/types/theme.types";
import { mapVisitDetailsToVisitorRequest } from "@/services/utils/requestMappers";

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
  const { formatDateTime: fmtDateTime, formatDateShort, parseISODuration, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { requestId } = route.params;

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
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  const { data: visitData, isLoading, isFetching, error, refetch } = useVisitDetailsQuery(requestId);
  const approveMutation = useApproveVisitMutation();
  const rejectMutation = useRejectVisitMutation();
  const cancelMutation = useCancelVisitMutation();

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

  const isProcessing = approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending;

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

  const handleApprove = () => {
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

  const handleReject = () => {
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
              {t('form.date')}
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
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {request.meetingRoom.name}, {request.meetingRoom.floor}
                </ThemedText>
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
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(request.buffet ? theme.warning : theme.textSecondary, '20') }]}>
              <DDIcon name="cloche" size={18} color={request.buffet ? theme.warning : theme.textSecondary} />
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

      {request.status === REQUEST_STATUS.PENDING_APPROVAL && (
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

      {(request.status === REQUEST_STATUS.APPROVED || request.status === REQUEST_STATUS.VISITOR_ACCEPTED) && (
        <View style={[styles.actionBar, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
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
