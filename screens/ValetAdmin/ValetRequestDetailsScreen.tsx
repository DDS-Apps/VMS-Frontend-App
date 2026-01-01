import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert, Modal, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormatters } from "@/hooks/useFormatters";
import { DDIcon, IconName } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getValetRequestById,
  updateValetRequestStatus,
  assignDriverToRequest,
  getValetDrivers,
  ValetRequest,
  ValetDriverExtended,
} from "@/services/state/valetAdminState";
import type { ValetRequestDetailsScreenProps } from "@/types/valetAdminNavigation.types";
import type { Theme } from "@/types/theme.types";

function getStatusColor(status: string, theme: Theme) {
  switch (status) {
    case 'pending':
      return theme.primary;
    case 'assigned':
      return theme.warning;
    case 'parked':
      return theme.info;
    case 'ready_for_pickup':
      return theme.success;
    case 'completed':
      return theme.secondary;
    case 'cancelled':
      return theme.error;
    default:
      return theme.textSecondary;
  }
}

function getStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case 'pending':
      return t('status.pending');
    case 'assigned':
      return t('status.assigned');
    case 'parked':
      return t('parking.parked');
    case 'ready_for_pickup':
      return t('valet.readyForPickup');
    case 'completed':
      return t('status.completed');
    case 'cancelled':
      return t('status.cancelled');
    default:
      return status;
  }
}

export default function ValetRequestDetailsScreen({ route, navigation }: ValetRequestDetailsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { formatDate, formatTime } = useFormatters();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<ValetRequest>(route.params.request);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState<ValetDriverExtended[]>([]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  useFocusEffect(
    React.useCallback(() => {
      const updated = getValetRequestById(request.id);
      if (updated) {
        setRequest(updated);
      }
      setDrivers(getValetDrivers().filter(d => d.status === 'available'));
    }, [request.id])
  );

  const statusColor = getStatusColor(request.status, theme);
  const statusLabel = getStatusLabel(request.status, t);
  const initials = request.visitorName.split(' ').map(n => n[0]).join('');

  const handleStatusUpdate = (newStatus: ValetRequest['status']) => {
    const updated = updateValetRequestStatus(request.id, newStatus);
    if (updated) {
      setRequest(updated);
    }
  };

  const handleAssignDriver = (driverId: string) => {
    const updated = assignDriverToRequest(request.id, driverId);
    if (updated) {
      setRequest(updated);
    }
    setShowDriverModal(false);
  };

  const handleComplete = () => {
    Alert.alert(
      t('actions.markAsComplete'),
      t('valet.completeRequestConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('status.completed'), 
          onPress: () => handleStatusUpdate('completed')
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      t('common.cancel'),
      t('valet.cancelRequestConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        { 
          text: t('common.yes'), 
          style: 'destructive',
          onPress: () => handleStatusUpdate('cancelled')
        },
      ]
    );
  };

  const renderInfoRow = (icon: IconName, label: string, value: string, valueColor?: string) => (
    <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.infoIcon, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
        <DDIcon name={icon} size={16} color={theme.primary} />
      </View>
      <View style={styles.infoContent}>
        <ThemedText style={[styles.infoLabel, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {label}
        </ThemedText>
        <ThemedText style={[styles.infoValue, { color: valueColor || theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
          {value}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <View style={[styles.headerCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statusAccent, { backgroundColor: statusColor }]} />
          
          <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                {initials}
              </ThemedText>
            </View>
            
            <View style={styles.headerInfo}>
              <ThemedText style={[Typography.subtitle, { fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
                {request.visitorName}
              </ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }]}>
                {request.visitorCompany}
              </ThemedText>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '15') }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </ThemedText>
            </View>
          </View>
        </View>

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('invitation.visitDetails')}
          </ThemedText>
          
          <Spacer height={Spacing.md} />

          {renderInfoRow('user', t('reception.hostName'), request.hostName)}
          {renderInfoRow('map-pin', t('invitation.location'), request.location)}
          {renderInfoRow('calendar', t('form.date'), formatDate(new Date(request.visitDate), 'long'))}
          {renderInfoRow('clock', t('form.time'), `${request.pickupTime} - ${request.returnTime}`)}
        </ThemedView>

        <Spacer height={Spacing.lg} />

        {request.vehicleInfo ? (
          <>
            <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                {t('valet.vehicleInfo')}
              </ThemedText>
              
              <Spacer height={Spacing.md} />

              {renderInfoRow('truck', t('valet.vehicle'), `${request.vehicleInfo.make} ${request.vehicleInfo.model}`)}
              {renderInfoRow('droplet', t('valet.color'), request.vehicleInfo.color)}
              {renderInfoRow('tag', t('valet.plateNumber'), request.vehicleInfo.plateNumber)}
            </ThemedView>

            <Spacer height={Spacing.lg} />
          </>
        ) : null}

        <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('valet.assignment')}
          </ThemedText>
          
          <Spacer height={Spacing.md} />

          {request.assignedDriver ? (
            <>
              {renderInfoRow('user', t('valet.driver'), request.assignedDriver.name, theme.success)}
              {renderInfoRow('phone', t('form.phone'), request.assignedDriver.phone || 'N/A')}
            </>
          ) : (
            <View style={styles.noDriverContainer}>
              <DDIcon name="user-x" size={24} variant="muted" />
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
                {t('valet.noDriverAssigned')}
              </ThemedText>
              {request.status === 'pending' ? (
                <Pressable
                  style={[styles.assignButton, { backgroundColor: theme.primary }]}
                  onPress={() => setShowDriverModal(true)}
                >
                  <DDIcon name="user-plus" size={16} color={theme.buttonText} />
                  <ThemedText style={[styles.assignButtonText, { color: theme.buttonText }]}>
                    {t('actions.assignDriver')}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          )}

          {request.parkingSlot ? (
            <>
              <Spacer height={Spacing.sm} />
              {renderInfoRow('map-pin', t('parking.parkingSlot'), request.parkingSlot, theme.info)}
            </>
          ) : null}
        </ThemedView>

        {request.notes ? (
          <>
            <Spacer height={Spacing.lg} />
            <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                {t('form.notes')}
              </ThemedText>
              <Spacer height={Spacing.sm} />
              <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
                {request.notes}
              </ThemedText>
            </ThemedView>
          </>
        ) : null}

        <Spacer height={Spacing.xl} />

        {request.status !== 'completed' && request.status !== 'cancelled' ? (
          <View style={styles.actionButtons}>
            {request.status === 'pending' && request.assignedDriver ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.warning }]}
                onPress={() => handleStatusUpdate('assigned')}
              >
                <DDIcon name="send" size={18} color={theme.buttonText} />
                <ThemedText style={[styles.actionButtonText, { color: theme.buttonText }]}>
                  {t('valet.markAssigned')}
                </ThemedText>
              </Pressable>
            ) : null}

            {request.status === 'assigned' ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.info }]}
                onPress={() => handleStatusUpdate('parked')}
              >
                <DDIcon name="map-pin" size={18} color={theme.buttonText} />
                <ThemedText style={[styles.actionButtonText, { color: theme.buttonText }]}>
                  {t('valet.markParked')}
                </ThemedText>
              </Pressable>
            ) : null}

            {request.status === 'parked' ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.success }]}
                onPress={() => handleStatusUpdate('ready_for_pickup')}
              >
                <DDIcon name="bell" size={18} color={theme.buttonText} />
                <ThemedText style={[styles.actionButtonText, { color: theme.buttonText }]}>
                  {t('valet.readyForPickup')}
                </ThemedText>
              </Pressable>
            ) : null}

            {request.status === 'ready_for_pickup' ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.success }]}
                onPress={handleComplete}
              >
                <DDIcon name="check-circle" size={18} color={theme.buttonText} />
                <ThemedText style={[styles.actionButtonText, { color: theme.buttonText }]}>
                  {t('actions.markAsComplete')}
                </ThemedText>
              </Pressable>
            ) : null}

            <LoadingButton
              onPress={handleCancel}
              variant="danger"
              size="medium"
              icon="x-circle"
              iconPosition="left"
              fullWidth
              style={{ marginTop: Spacing.sm }}
            >
              {t('common.cancel')}
            </LoadingButton>
          </View>
        ) : (
          <View style={[styles.completedContainer, { backgroundColor: applyOpacity(statusColor, '10'), flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <DDIcon 
              name={request.status === 'completed' ? 'check-circle' : 'x-circle'} 
              size={24} 
              color={statusColor} 
            />
            <ThemedText style={[Typography.body, { color: statusColor, fontWeight: '600', marginStart: Spacing.sm }]}>
              {request.status === 'completed' ? t('status.completed') : t('status.cancelled')}
            </ThemedText>
          </View>
        )}

        <Spacer height={Spacing.xl} />
      </ScreenScrollView>

      <Modal
        visible={showDriverModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDriverModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: applyOpacity(theme.overlay, '50') }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
                {t('actions.assignDriver')}
              </ThemedText>
              <Pressable onPress={() => setShowDriverModal(false)}>
                <DDIcon name="x" size={24} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={Spacing.md} />

            <ScrollView style={styles.driversList}>
              {drivers.length > 0 ? (
                drivers.map((driver) => (
                  <Pressable
                    key={driver.id}
                    style={[styles.driverItem, { borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => handleAssignDriver(driver.id)}
                  >
                    <View style={[styles.driverAvatar, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                      <ThemedText style={[styles.driverInitials, { color: theme.success }]}>
                        {driver.name.split(' ').map(n => n[0]).join('')}
                      </ThemedText>
                    </View>
                    <View style={styles.driverInfo}>
                      <ThemedText style={[Typography.body, { fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
                        {driver.name}
                      </ThemedText>
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {driver.phone} - {driver.shift}
                      </ThemedText>
                    </View>
                    <DDIcon name="chevron-right" size={20} variant="muted" directionAware />
                  </Pressable>
                ))
              ) : (
                <View style={styles.noDriversState}>
                  <DDIcon name="users" size={32} variant="muted" />
                  <Spacer height={Spacing.sm} />
                  <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                    {t('valet.noDriversAvailable')}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusAccent: {
    height: 4,
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginStart: Spacing.md,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  noDriverContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    gap: Spacing.md,
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
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driversList: {
    maxHeight: 400,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInitials: {
    fontSize: 16,
    fontWeight: '600',
  },
  driverInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  noDriversState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
