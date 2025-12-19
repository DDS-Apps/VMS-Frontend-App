import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, Alert, ScrollView, ActivityIndicator } from "react-native";
import type { VisitorDetailScreenProps } from "@/types/receptionistNavigation.types";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, type IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyOpacity } from "@/utils/statusStyles";
import type { VisitorExceptionType } from "@/services/mock/receptionistVisitorState";
import { VisitorActionButton } from "@/components/VisitorActionButton";
import { useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import { useVisitDetailsQuery } from "@/hooks/queries/useApprovalQueries";

interface LegacyVisitor {
  id: string;
  name: string;
  company: string;
  time: string;
  host: string;
  hostDepartment?: string;
  status: 'pending' | 'checked_in' | 'completed';
  isWalkIn: boolean;
  phone: string;
  parking?: string;
  valet?: string;
  meetingRoom?: { name: string; floor?: string };
  origin: 'scheduled' | 'walk_in';
  scheduledFor: string;
  createdAt: string;
}

export default function VisitorDetailScreen({ navigation, route }: VisitorDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, toLocalNumerals } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  
  const { visitor: legacyVisitor, visitId } = route.params as { visitor?: LegacyVisitor; visitId?: string };
  
  const { data: visitDetails, isLoading, isError } = useVisitDetailsQuery(visitId ?? '', !!visitId);
  
  const visitor: LegacyVisitor | null = legacyVisitor ?? (visitDetails ? {
    id: visitDetails.id,
    name: visitDetails.visitor.fullName,
    company: visitDetails.visitor.company ?? '',
    time: visitDetails.visitTime,
    host: visitDetails.employeeName,
    hostDepartment: visitDetails.employeeDepartment,
    status: (visitDetails.status === 'approved' || visitDetails.status === 'pending_approval' ? 'pending' : visitDetails.status) as 'pending' | 'checked_in' | 'completed',
    isWalkIn: visitDetails.isWalkIn ?? false,
    phone: visitDetails.visitor.phone ?? '',
    parking: visitDetails.parkingSlot?.slotNumber,
    valet: visitDetails.parkingAllocation?.status,
    meetingRoom: visitDetails.meetingRoom ? { name: visitDetails.meetingRoom.name, floor: visitDetails.meetingRoom.floor } : undefined,
    origin: visitDetails.isWalkIn ? 'walk_in' : 'scheduled',
    scheduledFor: visitDetails.visitDate,
    createdAt: visitDetails.createdAt,
  } : null);
  
  const checkInMutation = useReceptionCheckInMutation();
  const checkOutMutation = useReceptionCheckOutMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedExceptionType, setSelectedExceptionType] = useState<VisitorExceptionType | null>(null);
  const [guidanceNotes, setGuidanceNotes] = useState('');
  const [exceptionFloor, setExceptionFloor] = useState('');
  const [exceptionRoom, setExceptionRoom] = useState('');

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

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

  const getStatusConfig = (status: string): { label: string; bg: string; text: string; icon: IconName } => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, icon: 'check-circle' };
      case 'completed':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, icon: 'log-out' };
      default:
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, icon: 'clock' };
    }
  };

  const handleCheckIn = () => {
    checkInMutation.mutate(
      { visitId: visitor.id },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate('CheckInOutConfirmation', {
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
    checkOutMutation.mutate(
      { visitId: visitor.id },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate('CheckInOutConfirmation', {
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

  const handleCancel = () => {
    // API endpoint for cancellation not yet available
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

    // API endpoint for exception reporting not yet available
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
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.header}>
        <View style={[styles.largeAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
          <ThemedText style={[styles.largeAvatarText, { color: theme.primary }]}>
            {visitor.name.split(' ').map(n => n[0]).join('')}
          </ThemedText>
        </View>
        <Spacer height={Spacing.lg} />
        <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '700', textAlign: 'center' }]}>
          {visitor.name}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {visitor.company}
        </ThemedText>
        <Spacer height={Spacing.md} />
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <DDIcon name={statusConfig.icon} size={14} color={statusConfig.text} />
          <ThemedText style={[Typography.caption, { color: statusConfig.text, fontWeight: '600', marginStart: Spacing.xs }]}>
            {statusConfig.label}
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing.xxl} />

      <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
          {t('visitor.visitorDetails')}
        </ThemedText>

        <View style={styles.infoRow}>
          <DDIcon name="phone" size={18} variant="muted" />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('form.phoneNumber')}
            </ThemedText>
            <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
              {visitor.phone}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <DDIcon name="clock" size={18} variant="muted" />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('visitor.visitTime')}
            </ThemedText>
            <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
              {visitor.time}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <DDIcon name="user" size={18} variant="muted" />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('reception.hostName')}
            </ThemedText>
            <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
              {visitor.host}{visitor.hostDepartment ? ` - ${visitor.hostDepartment}` : ''}
            </ThemedText>
          </View>
        </View>

        {visitor.meetingRoom && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <DDIcon name="home" size={18} variant="muted" />
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                  {t('meeting.meetingRoom')}
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                  {visitor.meetingRoom.name}{visitor.meetingRoom.floor ? ` (${visitor.meetingRoom.floor})` : ''}
                </ThemedText>
              </View>
            </View>
          </>
        )}

        {visitor.isWalkIn && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <DDIcon name="user-plus" size={18} variant="warning" />
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                  {t('visitor.visitType')}
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                  {t('reception.walkInVisitor')}
                </ThemedText>
              </View>
            </View>
          </>
        )}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      {(visitor.parking || visitor.valet) && (
        <>
          <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
              {t('services.additionalServices')}
            </ThemedText>

            {visitor.parking && (
              <>
                <View style={styles.infoRow}>
                  <DDIcon name="map-pin" size={18} color={theme.info} />
                  <View style={{ flex: 1, marginStart: Spacing.md }}>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                      {t('services.parking')}
                    </ThemedText>
                    <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                      {visitor.parking}
                    </ThemedText>
                  </View>
                </View>
              </>
            )}

            {visitor.valet && visitor.parking && (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            )}

            {visitor.valet && (
              <View style={styles.infoRow}>
                <DDIcon name="truck" size={18} variant="primary" />
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                    {t('services.valet')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                    {visitor.valet}
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedView>
          <Spacer height={Spacing.lg} />
        </>
      )}

      {visitor.status === 'pending' && (
        <>
          <VisitorActionButton 
            type="check_in" 
            onPress={handleCheckIn} 
            fullWidth 
          />
          <Spacer height={Spacing.md} />
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.outlineButton, { borderColor: theme.error, flex: 1 }]}
              onPress={() => setShowCancelModal(true)}
            >
              <DDIcon name="x" size={18} color={theme.error} />
              <ThemedText style={[styles.outlineButtonText, { color: theme.error }]}>
                {t('actions.cancelRequest')}
              </ThemedText>
            </Pressable>
            <Spacer width={Spacing.md} />
            <Pressable
              style={[styles.outlineButton, { borderColor: theme.warning, flex: 1 }]}
              onPress={() => setShowExceptionModal(true)}
            >
              <DDIcon name="alert-triangle" size={18} color={theme.warning} />
              <ThemedText style={[styles.outlineButtonText, { color: theme.warning }]}>
                {t('reception.reportException')}
              </ThemedText>
            </Pressable>
          </View>
        </>
      )}

      {visitor.status === 'checked_in' && (
        <>
          <VisitorActionButton 
            type="check_out" 
            onPress={handleCheckOut} 
            fullWidth 
          />
          <Spacer height={Spacing.md} />
          <Pressable
            style={[styles.outlineButton, { borderColor: theme.warning }]}
            onPress={() => setShowExceptionModal(true)}
          >
            <DDIcon name="alert-triangle" size={18} color={theme.warning} />
            <ThemedText style={[styles.outlineButtonText, { color: theme.warning }]}>
              {t('reception.reportException')}
            </ThemedText>
          </Pressable>
        </>
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
              <View style={styles.modalHeader}>
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

              <View style={styles.modalActions}>
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
              <View style={styles.modalHeader}>
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
                        backgroundColor: selectedExceptionType === option.type ? applyOpacity(theme.warning, '10') : 'transparent'
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
                  numberOfLines={3}
                />

                <Spacer height={Spacing.lg} />

                <View style={styles.optionalFieldsRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginBottom: Spacing.sm }]}>
                      {t('reception.floorNumber')} ({t('form.optional')})
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }
                      ]}
                      placeholder="e.g. 3"
                      placeholderTextColor={theme.textSecondary}
                      value={exceptionFloor}
                      onChangeText={setExceptionFloor}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Spacer width={Spacing.md} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginBottom: Spacing.sm }]}>
                      {t('reception.roomNumber')} ({t('form.optional')})
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }
                      ]}
                      placeholder="e.g. 301"
                      placeholderTextColor={theme.textSecondary}
                      value={exceptionRoom}
                      onChangeText={setExceptionRoom}
                    />
                  </View>
                </View>

                <Spacer height={Spacing.md} />
              </ScrollView>

              <Spacer height={Spacing.lg} />

              <View style={styles.modalActions}>
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
                      backgroundColor: selectedExceptionType ? theme.warning : applyOpacity(theme.warning, '50')
                    }
                  ]}
                  onPress={handleReportException}
                  disabled={!selectedExceptionType}
                >
                  <ThemedText style={[Typography.body, { color: theme.buttonText, fontWeight: '600', fontSize: 14 }]}>
                    {t('common.submit')}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </View>
        </View>
      </Modal>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 20,
    borderWidth: 2,
    gap: Spacing.sm,
    height: 50,
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  exceptionTypeOption: {
    flexDirection: 'row',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
