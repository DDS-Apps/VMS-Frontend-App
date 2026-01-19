import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from '@/components/DDIcon';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFormatters } from '@/hooks/useFormatters';
import { getPlatformFlexDirection } from '@/utils/rtlInitializer';
import { applyOpacity } from '@/utils/statusStyles';
import {
  getValetRequestById,
  driverRejectRequest,
  driverParkVehicle,
  driverMarkReadyForPickup,
  driverCompleteRequest,
  getAvailableParkingSlots,
  ValetRequest,
  ValetParkingSlot,
} from '@/services/state/valetAdminState';

interface DriverTaskDetailScreenProps {
  taskId: string;
  onNavigateBack: () => void;
}

export default function DriverTaskDetailScreen({
  taskId,
  onNavigateBack,
}: DriverTaskDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { formatDate, formatTime } = useFormatters();
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState<ValetRequest | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showParkingModal, setShowParkingModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<ValetParkingSlot[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadTask();
    }, [taskId])
  );

  const loadTask = () => {
    const foundTask = getValetRequestById(taskId);
    if (foundTask) {
      setTask({ ...foundTask });
    }
  };

  if (!task) {
    return (
      <ScreenScrollView contentContainerStyle={{ 
        paddingHorizontal: Spacing.xl,
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl
      }}>
        <View style={styles.emptyState}>
          <DDIcon name="alert-circle" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
            {t('errors.notFound')}
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  const handleReject = () => {
    setIsUpdating(true);
    setTimeout(() => {
      driverRejectRequest(taskId);
      loadTask();
      setIsUpdating(false);
    }, 300);
  };

  const handleOpenParkingModal = () => {
    const slots = getAvailableParkingSlots();
    setAvailableSlots(slots);
    setShowParkingModal(true);
  };

  const handleSelectSlot = (slot: ValetParkingSlot) => {
    setIsUpdating(true);
    setTimeout(() => {
      driverParkVehicle(taskId, slot.slotNumber);
      loadTask();
      setIsUpdating(false);
      setShowParkingModal(false);
    }, 300);
  };

  const handleReadyForPickup = () => {
    setIsUpdating(true);
    setTimeout(() => {
      driverMarkReadyForPickup(taskId);
      loadTask();
      setIsUpdating(false);
    }, 300);
  };

  const handleComplete = () => {
    setIsUpdating(true);
    setTimeout(() => {
      driverCompleteRequest(taskId);
      loadTask();
      setIsUpdating(false);
    }, 300);
  };

  const getStatusConfig = (status: ValetRequest['status']) => {
    switch (status) {
      case 'pending':
        return { color: theme.primary, bgColor: applyOpacity(theme.primary, '12'), label: t('status.pending') };
      case 'assigned':
        return { color: theme.warning, bgColor: applyOpacity(theme.warning, '12'), label: t('status.assigned') };
      case 'parked':
        return { color: theme.info, bgColor: applyOpacity(theme.info, '12'), label: t('parking.parked') };
      case 'ready_for_pickup':
        return { color: theme.success, bgColor: applyOpacity(theme.success, '12'), label: t('valet.readyForPickup') };
      case 'completed':
        return { color: theme.secondary, bgColor: applyOpacity(theme.secondary, '12'), label: t('status.completed') };
      case 'cancelled':
        return { color: theme.textSecondary, bgColor: applyOpacity(theme.textSecondary, '12'), label: t('status.cancelled') };
      default:
        return { color: theme.textSecondary, bgColor: applyOpacity(theme.textSecondary, '12'), label: status };
    }
  };

  const statusConfig = getStatusConfig(task.status);
  const showAssignedActions = task.status === 'assigned';
  const showParkedActions = task.status === 'parked';
  const showReadyActions = task.status === 'ready_for_pickup';
  const isTerminalStatus = task.status === 'completed' || task.status === 'cancelled';

  const renderInfoRow = (icon: string, label: string, value: string, iconVariant: 'muted' | 'primary' | 'success' = 'muted') => (
    <View style={[styles.infoRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
      <DDIcon name={icon as IconName} variant={iconVariant} size={20} />
      <View style={{ flex: 1, marginStart: Spacing.md }}>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: 2, textAlign: isRTL ? 'right' : 'left' }]}>
          {label}
        </ThemedText>
        <ThemedText style={[Typography.body, { fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }]}>
          {value}
        </ThemedText>
      </View>
    </View>
  );

  const renderParkingModal = () => (
    <Modal
      visible={showParkingModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowParkingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
              {t('parking.assignSlot')}
            </ThemedText>
            <Pressable onPress={() => setShowParkingModal(false)} hitSlop={8}>
              <DDIcon name="x" size={24} variant="muted" />
            </Pressable>
          </View>

          <Spacer height={Spacing.lg} />

          {availableSlots.length > 0 ? (
            <ScrollView style={styles.slotsList}>
              {availableSlots.map((slot) => (
                <Pressable
                  key={slot.id}
                  style={[styles.slotCard, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: getPlatformFlexDirection(isRTL) }]}
                  onPress={() => handleSelectSlot(slot)}
                >
                  <View style={[styles.slotIcon, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                    <DDIcon name="check-circle" size={20} color={theme.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[Typography.body, { fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
                      {slot.slotNumber}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {slot.zone}
                    </ThemedText>
                  </View>
                  <DDIcon name="chevron-right" size={20} variant="muted" directionAware />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptySlots}>
              <DDIcon name="alert-circle" size={48} variant="muted" />
              <Spacer height={Spacing.md} />
              <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
                {t('valet.noDriversAvailable')}
              </ThemedText>
            </View>
          )}
        </ThemedView>
      </View>
    </Modal>
  );

  return (
    <>
      <ScreenScrollView contentContainerStyle={{ 
        paddingHorizontal: Spacing.xl,
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl + 100
      }}>
        <Pressable onPress={onNavigateBack} style={[styles.backButton, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <DDIcon name="arrow-left" variant="primary" directionAware />
          <ThemedText style={[Typography.body, { color: theme.primary, marginStart: Spacing.xs }]}>
            {t('common.back')}
          </ThemedText>
        </Pressable>

        <Spacer height={Spacing.xl} />

        <View style={[styles.headerSection, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
              {task.visitorName}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }]}>
              {task.visitorCompany}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <ThemedText style={[Typography.caption, { color: statusConfig.color, fontWeight: '600' }]}>
              {statusConfig.label}
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.xl} />

        <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.cardIconHeader, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <DDIcon name="truck" size={20} color={theme.primary} />
          </View>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.lg }]}>
            {t('valet.vehicleInfo')}
          </ThemedText>

          {task.vehicleInfo ? (
            <>
              {renderInfoRow('truck', t('valet.vehicle'), `${task.vehicleInfo.make} ${task.vehicleInfo.model}`)}
              <Spacer height={Spacing.md} />
              {renderInfoRow('droplet', t('valet.color'), task.vehicleInfo.color)}
              <Spacer height={Spacing.md} />
              {renderInfoRow('hash', t('valet.plateNumber'), task.vehicleInfo.plateNumber)}
            </>
          ) : (
            <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
              {t('valet.noVehicleInfo')}
            </ThemedText>
          )}

          {task.parkingSlot ? (
            <>
              <Spacer height={Spacing.md} />
              {renderInfoRow('map-pin', t('parking.parkingSlot'), task.parkingSlot, 'primary')}
            </>
          ) : null}
        </ThemedView>

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.cardIconHeader, { backgroundColor: applyOpacity(theme.secondary, '12') }]}>
            <DDIcon name="user" size={20} color={theme.secondary} />
          </View>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.lg }]}>
            {t('invitation.visitDetails')}
          </ThemedText>

          {renderInfoRow('user', t('reception.hostName'), task.hostName)}
          <Spacer height={Spacing.md} />
          {renderInfoRow('calendar', t('visitor.visitDate'), formatDate(new Date(task.visitDate), 'long'))}
          <Spacer height={Spacing.md} />
          {renderInfoRow('clock', t('valet.pickupVehicle'), task.pickupTime)}
          <Spacer height={Spacing.md} />
          {renderInfoRow('clock', t('valet.returnVehicle'), task.returnTime)}
          <Spacer height={Spacing.md} />
          {renderInfoRow('map-pin', t('invitation.location'), task.location)}
        </ThemedView>

        {task.notes ? (
          <>
            <Spacer height={Spacing.lg} />
            <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={[styles.cardIconHeader, { backgroundColor: applyOpacity(theme.warning, '12') }]}>
                <DDIcon name="file-text" size={20} color={theme.warning} />
              </View>
              <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
                {t('form.notes')}
              </ThemedText>
              <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
                {task.notes}
              </ThemedText>
            </ThemedView>
          </>
        ) : null}

        <Spacer height={Spacing.xl} />

        {showAssignedActions ? (
          <View style={[styles.actionsContainer, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
            <LoadingButton
              onPress={handleOpenParkingModal}
              disabled={isUpdating}
              variant="outline"
              size="medium"
              icon="navigation"
              iconPosition="left"
              style={{ flex: 1 }}
            >
              {t('valet.parkVehicle')}
            </LoadingButton>

            <View style={{ width: Spacing.md }} />

            <LoadingButton
              onPress={handleComplete}
              loading={isUpdating}
              disabled={isUpdating}
              variant="success"
              size="medium"
              icon="check-circle"
              iconPosition="left"
              loadingText={t('common.loading')}
              style={{ flex: 1 }}
            >
              {t('actions.completeTask')}
            </LoadingButton>
          </View>
        ) : null}

        {showAssignedActions ? (
          <>
            <Spacer height={Spacing.md} />
            <LoadingButton
              onPress={handleReject}
              loading={isUpdating}
              disabled={isUpdating}
              variant="danger"
              size="medium"
              icon="x-circle"
              iconPosition="left"
              loadingText={t('common.loading')}
              fullWidth
            >
              {t('actions.reject')}
            </LoadingButton>
          </>
        ) : null}

        {showParkedActions ? (
          <LoadingButton
            onPress={handleReadyForPickup}
            loading={isUpdating}
            disabled={isUpdating}
            variant="success"
            size="medium"
            icon="bell"
            iconPosition="left"
            loadingText={t('common.loading')}
            fullWidth
          >
            {t('valet.readyForPickup')}
          </LoadingButton>
        ) : null}

        {showReadyActions ? (
          <LoadingButton
            onPress={handleComplete}
            loading={isUpdating}
            disabled={isUpdating}
            variant="success"
            size="medium"
            icon="check-circle"
            iconPosition="left"
            loadingText={t('common.loading')}
            fullWidth
          >
            {t('valet.returnVehicle')}
          </LoadingButton>
        ) : null}

        {isTerminalStatus ? (
          <ThemedView style={[styles.statusCard, { 
            backgroundColor: task.status === 'completed' 
              ? applyOpacity(theme.success, '10') 
              : applyOpacity(theme.textSecondary, '10'),
            borderColor: task.status === 'completed' ? theme.success : theme.textSecondary,
            flexDirection: getPlatformFlexDirection(isRTL)
          }]}>
            <DDIcon 
              name={task.status === 'completed' ? 'check-circle' : 'x-circle'} 
              size={24} 
              color={task.status === 'completed' ? theme.success : theme.textSecondary}
            />
            <ThemedText style={[Typography.body, { 
              marginStart: Spacing.md, 
              color: task.status === 'completed' ? theme.success : theme.textSecondary,
              fontWeight: '500'
            }]}>
              {task.status === 'completed' ? t('status.completed') : t('status.cancelled')}
            </ThemedText>
          </ThemedView>
        ) : null}
      </ScreenScrollView>

      {renderParkingModal()}
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  cardIconHeader: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  infoRow: {
    alignItems: 'flex-start',
  },
  actionsContainer: {
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  statusCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotsList: {
    flex: 1,
  },
  slotCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  slotIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlots: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
});
