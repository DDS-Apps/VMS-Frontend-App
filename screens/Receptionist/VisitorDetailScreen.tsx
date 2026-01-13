import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, Alert, ScrollView, ActivityIndicator } from "react-native";
import type { VisitorDetailScreenProps } from "@/types/receptionistNavigation.types";
import { ROUTES } from "@/constants";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, type IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import {
  RequestTimeline,
  useTimelineSteps,
  type TimelineData,
  type TimelineActionCallbacks,
} from "@/components/shared/RequestTimeline";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyOpacity } from "@/utils/statusStyles";
import type { VisitorExceptionType } from "@/services/state/receptionistVisitorState";
import { VisitorActionButton } from "@/components/VisitorActionButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import { useVisitDetailsQuery } from "@/hooks/queries/useApprovalQueries";

interface LegacyVisitor {
  id: string;
  name: string;
  company: string;
  time: string;
  host: string;
  hostDepartment?: string;
  status: 'pending' | 'approved' | 'checked_in' | 'completed' | 'rejected' | 'cancelled' | 'pending_approval';
  isWalkIn: boolean;
  phone: string;
  parking?: string;
  valet?: string;
  meetingRoom?: { name: string; floor?: string };
  origin: 'scheduled' | 'walk_in';
  scheduledFor: string;
  createdAt: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export default function VisitorDetailScreen({ navigation, route }: VisitorDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, toLocalNumerals } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  
  const { visitor: legacyVisitor, visitId } = route.params as { visitor?: LegacyVisitor; visitId?: string };
  
  const { data: visitDetails, isLoading, isError } = useVisitDetailsQuery(visitId ?? '', !!visitId);
  
  const mapVisitStatus = (status: string): 'pending' | 'approved' | 'checked_in' | 'completed' | 'rejected' | 'cancelled' | 'pending_approval' => {
    if (status === 'rejected') return 'rejected';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'pending_approval') return 'pending_approval';
    if (status === 'approved') return 'approved';
    if (status === 'checked_in') return 'checked_in';
    if (status === 'completed' || status === 'checked_out') return 'completed';
    return 'pending';
  };
  
  const visitor: LegacyVisitor | null = legacyVisitor ?? (visitDetails ? {
    id: visitDetails.id,
    name: visitDetails.visitor.fullName,
    company: visitDetails.visitor.company ?? '',
    time: visitDetails.visitTime,
    host: visitDetails.employeeName,
    hostDepartment: visitDetails.employeeDepartment,
    status: mapVisitStatus(visitDetails.status),
    isWalkIn: visitDetails.isWalkIn ?? false,
    phone: visitDetails.visitor.phone ?? '',
    parking: visitDetails.parkingSlot?.slotNumber,
    valet: visitDetails.parkingAllocation?.status,
    meetingRoom: (visitDetails.meetingRoom && visitDetails.meetingRoom.name) ? { name: visitDetails.meetingRoom.name, floor: visitDetails.meetingRoom.floor } : undefined,
    origin: visitDetails.isWalkIn ? 'walk_in' : 'scheduled',
    scheduledFor: visitDetails.visitDate,
    createdAt: visitDetails.createdAt,
    rejectedAt: visitDetails.rejection?.rejectedAt,
    rejectionReason: visitDetails.rejection?.reason,
  } : null);
  
  const checkInMutation = useReceptionCheckInMutation();
  const checkOutMutation = useReceptionCheckOutMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedExceptionType, setSelectedExceptionType] = useState<VisitorExceptionType | null>(null);
  const [guidanceNotes, setGuidanceNotes] = useState('');
  const [exceptionFloor, setExceptionFloor] = useState('');
  const [exceptionRoom, setExceptionRoom] = useState('');

  const showStickyFooter = visitor && (
    visitor.status === 'approved' || 
    visitor.status === 'pending' || 
    visitor.status === 'checked_in'
  );

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: showStickyFooter ? insets.bottom + 140 : insets.bottom + Spacing.xl
  };

  const handleCheckIn = () => {
    if (!visitor) return;
    checkInMutation.mutate(
      { visitId: visitor.id },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate(ROUTES.CHECK_IN_OUT_CONFIRMATION as never, {
            action: 'check_in',
            visitorName: visitor.name,
            time: currentTime
          });
        },
        onError: (error) => {
          Alert.alert(t('common.error'), error.message || t('errors.checkInFailed'));
        }
      }
    );
  };

  const handleCheckOut = () => {
    if (!visitor) return;
    checkOutMutation.mutate(
      { visitId: visitor.id },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate(ROUTES.CHECK_IN_OUT_CONFIRMATION as never, {
            action: 'check_out',
            visitorName: visitor.name,
            time: currentTime
          });
        },
        onError: (error) => {
          Alert.alert(t('common.error'), error.message || t('errors.checkOutFailed'));
        }
      }
    );
  };

  const timelineData: TimelineData = useMemo(() => ({
    createdAt: visitor?.createdAt ?? '',
    status: visitor?.status ?? 'pending',
    isWalkIn: visitor?.isWalkIn ?? false,
    hostApproval: visitor?.rejectedAt ? {
      required: true,
      rejectedAt: visitor.rejectedAt,
    } : undefined,
    approval: visitor?.rejectedAt ? {
      requiresApproval: true,
      rejectedAt: visitor.rejectedAt,
      rejectionReason: visitor.rejectionReason,
    } : undefined,
  }), [visitor]);

  const timelineActions: TimelineActionCallbacks | undefined = useMemo(() => {
    if (!visitor) return undefined;
    if (visitor.status === 'approved' || visitor.status === 'pending') {
      return {
        onCheckIn: handleCheckIn,
        isCheckInLoading: checkInMutation.isPending,
      };
    }
    if (visitor.status === 'checked_in') {
      return {
        onCheckOut: handleCheckOut,
        isCheckOutLoading: checkOutMutation.isPending,
      };
    }
    return undefined;
  }, [visitor?.status, checkInMutation.isPending, checkOutMutation.isPending]);

  const timelineSteps = useTimelineSteps({
    data: timelineData,
    role: 'receptionist',
    flowType: 'receptionist_checkin',
    actions: timelineActions,
    showActions: false,
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
          {t('common.loading')}
        </ThemedText>
      </View>
    );
  }

  if (isError || !visitor) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
      </View>
    );
  }

  const getStatusConfig = (status: string): { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'muted' | 'primary'; icon: IconName } => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), variant: 'success', icon: 'check-circle' };
      case 'completed':
        return { label: t('status.checkedOut'), variant: 'muted', icon: 'log-out' };
      case 'rejected':
        return { label: t('status.rejected'), variant: 'error', icon: 'x-circle' };
      case 'cancelled':
        return { label: t('status.cancelled'), variant: 'error', icon: 'x-circle' };
      case 'pending_approval':
        return { label: t('status.pendingApproval'), variant: 'warning', icon: 'clock' };
      case 'approved':
        return { label: t('visitor.expectedVisitors'), variant: 'info', icon: 'check-circle' };
      default:
        return { label: t('visitor.expectedVisitors'), variant: 'warning', icon: 'clock' };
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('common.comingSoon'),
      t('reception.cancelNotAvailable'),
      [{ text: t('common.ok'), onPress: () => setShowCancelModal(false) }]
    );
  };

  const exceptionTypeOptions: { type: VisitorExceptionType; label: string }[] = [
    { type: 'communication_failure', label: t('reception.communicationFailure') },
    { type: 'qr_issue', label: t('reception.qrIssue') },
    { type: 'badge_malfunction', label: t('reception.badgeMalfunction') },
    { type: 'identity_mismatch', label: t('reception.identityMismatch') },
    { type: 'escort_required', label: t('reception.escortRequired') },
    { type: 'other', label: t('reception.otherException') },
  ];

  const handleReportException = () => {
    if (!selectedExceptionType) {
      return;
    }

    Alert.alert(
      t('common.comingSoon'),
      t('reception.exceptionNotAvailable'),
      [{ text: t('common.ok'), onPress: resetExceptionModal }]
    );
  };

  const resetExceptionModal = () => {
    setShowExceptionModal(false);
    setSelectedExceptionType(null);
    setGuidanceNotes('');
    setExceptionFloor('');
    setExceptionRoom('');
  };

  const statusConfig = getStatusConfig(visitor.status);

  return (
    <>
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {visitor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />

          <ThemedText style={[Typography.title, { fontWeight: '600', fontSize: 22, color: theme.text }]}>
            {visitor.name}
          </ThemedText>
          <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginTop: 4 }]}>
            {visitor.company}
          </ThemedText>

          <Spacer height={Spacing.sm} />

          <StatusBadge
            label={statusConfig.label}
            variant={statusConfig.variant}
            icon={statusConfig.icon}
          />
        </View>

        <Spacer height={Spacing.xl} />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Spacer height={Spacing.lg} />

        <View style={[styles.infoRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <DDIcon name="phone" size={16} variant="muted" />
          <ThemedText
            style={[
              Typography.body,
              {
                marginStart: Spacing.md,
                color: theme.textSecondary,
                flex: 1,
                fontSize: 14,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {visitor.phone || '-'}
          </ThemedText>
        </View>
      </ThemedView>

      {visitor.status === 'rejected' && visitor.rejectionReason ? (
        <>
          <Spacer height={Spacing.lg} />
          <ThemedView style={[styles.cardNew, { backgroundColor: applyOpacity(theme.error, '08') }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
              <View style={{ marginTop: 2 }}>
                <DDIcon name="message-circle" size={18} color={theme.error} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.bodySmall, { color: theme.error, fontWeight: '600', marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('form.reason')}
                </ThemedText>
                <ThemedText style={[Typography.body, { color: theme.text, lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }]}>
                  {visitor.rejectionReason}
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        </>
      ) : null}

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('visitor.visitorDetails')}
          </ThemedText>
          {visitor.isWalkIn ? (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: applyOpacity(theme.warning, '15'), paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm }}>
              <DDIcon name="user-check" size={14} color={theme.warning} />
              <ThemedText style={[Typography.caption, { color: theme.warning, fontWeight: '600', marginStart: Spacing.xs, fontSize: 11 }]}>
                {t('reception.walkInVisitor')}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <Spacer height={Spacing.xl} />

        <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
            <DDIcon name="clock" size={18} color={theme.text} />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('visitor.visitTime')}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
              {visitor.time}
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
            <DDIcon name="user" size={18} color={theme.text} />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('reception.hostName')}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
              {visitor.host}{visitor.hostDepartment ? ` - ${visitor.hostDepartment}` : ''}
            </ThemedText>
          </View>
        </View>

        {visitor.meetingRoom ? (
          <>
            <Spacer height={Spacing.lg} />

            <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="home" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('visitor.meetingRoom')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {visitor.meetingRoom.name}{visitor.meetingRoom.floor ? ` (${visitor.meetingRoom.floor})` : ''}
                </ThemedText>
              </View>
            </View>
          </>
        ) : null}
      </ThemedView>

      {visitor.parking ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
            <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('services.additionalServices')}
            </ThemedText>
            <Spacer height={Spacing.xl} />

            <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.info, '15') }]}>
                <DDIcon name="map-pin" size={18} color={theme.info} />
              </View>
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('services.parking')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.info, marginTop: 2, fontSize: 13, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }]}>
                  {visitor.parking}
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        </>
      ) : null}

      <Spacer height={Spacing.lg} />

      <RequestTimeline steps={timelineSteps} />

      <Spacer height={Spacing.lg} />

      {visitor.status === 'pending_approval' && (
        <ThemedView style={[styles.pendingApprovalBanner, { backgroundColor: applyOpacity(theme.warning, '10'), borderColor: theme.warning }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
            <DDIcon name="clock" size={20} color={theme.warning} />
            <ThemedText style={[Typography.body, { color: theme.warning, fontWeight: '600', flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('status.pendingApproval')}
            </ThemedText>
          </View>
        </ThemedView>
      )}

      {visitor.status === 'completed' && (
        <VisitorActionButton 
          type="completed" 
          fullWidth 
        />
      )}

      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
            onPress={() => setShowCancelModal(false)}
          />
          <View style={styles.modalContainer}>
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text }]}>
                  {t('actions.cancelRequest')}
                </ThemedText>
                <Pressable onPress={() => setShowCancelModal(false)}>
                  <DDIcon name="x" size={22} variant="muted" />
                </Pressable>
              </View>

              <Spacer height={20} />

              <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20 }]}>
                {t('common.confirm')}
              </ThemedText>

              <Spacer height={24} />

              <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelButton,
                    { opacity: pressed ? 0.7 : 1, backgroundColor: theme.surfaceSecondary, borderColor: theme.border }
                  ]}
                  onPress={() => setShowCancelModal(false)}
                >
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontWeight: '600', fontSize: 14 }]}>
                    {t('common.back')}
                  </ThemedText>
                </Pressable>

                <Spacer width={12} />

                <Pressable
                  style={({ pressed }) => [
                    styles.modalSubmitButton,
                    { opacity: pressed ? 0.8 : 1, backgroundColor: theme.error }
                  ]}
                  onPress={handleCancel}
                >
                  <ThemedText style={[Typography.body, { color: theme.buttonTextOnError, fontWeight: '600', fontSize: 14 }]}>
                    {t('actions.cancelRequest')}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showExceptionModal}
        transparent
        animationType="fade"
        onRequestClose={resetExceptionModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
            onPress={resetExceptionModal}
          />
          <View style={styles.modalContainer}>
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '90%' }]}>
              <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text }]}>
                  {t('reception.reportException')}
                </ThemedText>
                <Pressable onPress={resetExceptionModal}>
                  <DDIcon name="x" size={22} variant="muted" />
                </Pressable>
              </View>

              <Spacer height={20} />

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginBottom: Spacing.md }]}>
                  {t('reception.exceptionType')}
                </ThemedText>

                {exceptionTypeOptions.map((option) => (
                  <Pressable
                    key={option.type}
                    style={[
                      styles.exceptionTypeOption,
                      { 
                        borderColor: selectedExceptionType === option.type ? theme.warning : theme.border,
                        backgroundColor: selectedExceptionType === option.type ? applyOpacity(theme.warning, '10') : 'transparent',
                        flexDirection: isRTL ? 'row-reverse' : 'row'
                      }
                    ]}
                    onPress={() => setSelectedExceptionType(option.type)}
                  >
                    <View style={[
                      styles.radioButton,
                      { borderColor: selectedExceptionType === option.type ? theme.warning : theme.border }
                    ]}>
                      {selectedExceptionType === option.type ? (
                        <View style={[styles.radioButtonInner, { backgroundColor: theme.warning }]} />
                      ) : null}
                    </View>
                    <ThemedText style={[Typography.body, { color: theme.text, marginStart: Spacing.md }]}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}

                <Spacer height={Spacing.lg} />

                <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginBottom: Spacing.sm }]}>
                  {t('reception.guidanceNotes')}
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      borderColor: theme.border, 
                      color: theme.text,
                      backgroundColor: theme.surface,
                      minHeight: 80,
                      textAlignVertical: 'top'
                    }
                  ]}
                  placeholder={t('reception.guidanceNotesPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  value={guidanceNotes}
                  onChangeText={setGuidanceNotes}
                  multiline
                />

                <Spacer height={Spacing.lg} />

                <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginBottom: Spacing.sm }]}>
                  {t('reception.alternateLocation')} ({t('common.optional')})
                </ThemedText>
                <View style={[styles.optionalFieldsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }
                      ]}
                      placeholder={t('reception.floor')}
                      placeholderTextColor={theme.textSecondary}
                      value={exceptionFloor}
                      onChangeText={setExceptionFloor}
                    />
                  </View>
                  <Spacer width={Spacing.md} />
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }
                      ]}
                      placeholder={t('reception.room')}
                      placeholderTextColor={theme.textSecondary}
                      value={exceptionRoom}
                      onChangeText={setExceptionRoom}
                    />
                  </View>
                </View>
              </ScrollView>

              <Spacer height={24} />

              <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelButton,
                    { opacity: pressed ? 0.7 : 1, backgroundColor: theme.surfaceSecondary, borderColor: theme.border }
                  ]}
                  onPress={resetExceptionModal}
                >
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontWeight: '600', fontSize: 14 }]}>
                    {t('common.cancel')}
                  </ThemedText>
                </Pressable>

                <Spacer width={12} />

                <Pressable
                  style={({ pressed }) => [
                    styles.modalSubmitButton,
                    { 
                      opacity: pressed ? 0.8 : 1, 
                      backgroundColor: selectedExceptionType ? theme.warning : theme.surfaceSecondary 
                    }
                  ]}
                  onPress={handleReportException}
                  disabled={!selectedExceptionType}
                >
                  <ThemedText style={[Typography.body, { color: selectedExceptionType ? theme.buttonText : theme.textSecondary, fontWeight: '600', fontSize: 14 }]}>
                    {t('reception.submitException')}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </View>
        </View>
      </Modal>
    </ScreenScrollView>

    {/* Sticky Footer for Actions */}
    {(visitor.status === 'approved' || visitor.status === 'pending') && (
      <View style={[styles.stickyFooter, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
        <VisitorActionButton 
          type="check_in" 
          onPress={handleCheckIn} 
          fullWidth 
          loading={checkInMutation.isPending}
        />
        <Spacer height={Spacing.md} />
        <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <LoadingButton
            onPress={() => setShowCancelModal(true)}
            variant="danger-outline"
            size="large"
            icon="x-circle"
            iconPosition="left"
            style={{ flex: 1 }}
          >
            {t('actions.cancelRequest')}
          </LoadingButton>
          <View style={{ width: Spacing.md }} />
          <LoadingButton
            onPress={() => setShowExceptionModal(true)}
            variant="warning-outline"
            size="large"
            icon="alert-triangle"
            iconPosition="left"
            style={{ flex: 1 }}
          >
            {t('reception.reportException')}
          </LoadingButton>
        </View>
      </View>
    )}

    {visitor.status === 'checked_in' && (
      <View style={[styles.stickyFooter, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <VisitorActionButton 
            type="check_out" 
            onPress={handleCheckOut} 
            fullWidth 
            loading={checkOutMutation.isPending}
            flex={1}
          />
          <View style={{ width: Spacing.md }} />
          <LoadingButton
            onPress={() => setShowExceptionModal(true)}
            variant="warning-outline"
            size="large"
            icon="alert-triangle"
            iconPosition="left"
            style={{ flex: 1 }}
          >
            {t('reception.reportException')}
          </LoadingButton>
        </View>
      </View>
    )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  infoRowNew: {
    alignItems: 'center',
  },
  serviceRowNew: {
    alignItems: 'flex-start',
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    alignItems: 'center',
  },
  pendingApprovalBanner: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    alignItems: 'center',
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modalSubmitButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  exceptionTypeOption: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
  },
  optionalFieldsRow: {
    alignItems: 'center',
  },
});
