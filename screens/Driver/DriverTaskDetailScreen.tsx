import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from '@/components/DDIcon';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFormatters } from '@/hooks/useFormatters';
import { applyOpacity, getStatusIcon } from '@/utils/statusStyles';
import { StatusIcon } from '@/components/shared';
import {
  getValetRequestById,
  driverRejectRequest,
  driverParkVehicleAutomatically,
  driverMarkReadyForPickup,
  driverCompleteRequest,
  ValetRequest,
} from '@/services/state/valetAdminState';
import { resolveParkingDisplayDecision } from '@/utils/parkingDecision';

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
  const { isRTL } = useLanguage();  const { formatDate, formatTime } = useFormatters();
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState<ValetRequest | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
    setIsUpdating(true);
    setTimeout(() => {
      driverParkVehicleAutomatically(taskId);
      loadTask();
      setIsUpdating(false);
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
    <DirectionalRow style={styles.infoRow}>
      <DDIcon name={icon as IconName} variant={iconVariant} size={20} />
      <View style={{ flex: 1, marginStart: Spacing.md }}>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: 2 }]}>
          {label}
        </ThemedText>
        <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
          {value}
        </ThemedText>
      </View>
    </DirectionalRow>
  );

  return (
    <>
      <ScreenScrollView contentContainerStyle={{ 
        paddingHorizontal: Spacing.xl,
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl + 100
      }}>
        <Pressable onPress={onNavigateBack} style={[styles.backButton, { flexDirection: getFlexDirection(isRTL) }]}>
          <DDIcon name="arrow-left" variant="primary" directionAware />
          <ThemedText style={[Typography.body, { color: theme.primary, marginStart: Spacing.xs }]}>
            {t('common.back')}
          </ThemedText>
        </Pressable>

        <Spacer height={Spacing.xl} />

        <DirectionalRow style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '600' }]}>
              {task.visitorName}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4 }]}>
              {task.visitorCompany}
            </ThemedText>
          </View>
          <StatusIcon icon={getStatusIcon(task.status)} color={statusConfig.color} />
        </DirectionalRow>

        <Spacer height={Spacing.xl} />

        <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.cardIconHeader, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <DDIcon name="map-pin" size={20} color={theme.primary} />
          </View>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.lg }]}>
            {t('parking.todaysParkingStatus')}
          </ThemedText>
          {renderInfoRow(
            'map-pin',
            t('parking.todaysParkingStatus'),
            resolveParkingDisplayDecision({ hasParkingAllocation: Boolean(task.parkingSlot || task.vehicleInfo) }) === 'required'
              ? t('parking.needsParking')
              : t('parking.noParking'),
            'primary',
          )}
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
          <DirectionalRow style={styles.actionsContainer}>
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
          </DirectionalRow>
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
            flexDirection: getFlexDirection(isRTL)
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
