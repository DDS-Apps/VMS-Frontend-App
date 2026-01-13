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

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                {initials}
              </ThemedText>
            </View>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.title, { fontWeight: '600', fontSize: 22, color: theme.text }]}>
              {request.visitorName}
            </ThemedText>
            <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginTop: 4 }]}>
              {request.visitorCompany}
            </ThemedText>

            <Spacer height={Spacing.sm} />

            <View
              style={{
                alignSelf: 'center',
                backgroundColor: applyOpacity(statusColor, '15'),
                borderColor: applyOpacity(statusColor, '30'),
                borderWidth: StyleSheet.hairlineWidth,
                paddingHorizontal: Spacing.md,
                paddingVertical: 6,
                borderRadius: BorderRadius.full,
              }}
            >
              <ThemedText style={[Typography.caption, { color: statusColor, fontWeight: '600', fontSize: 12 }]}>
                {statusLabel}
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
          <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('invitation.visitDetails')}
          </ThemedText>
          <Spacer height={Spacing.xl} />

          <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
              <DDIcon name="user" size={18} color={theme.text} />
            </View>
            <View style={{ flex: 1, marginStart: Spacing.md }}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('reception.hostName')}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                {request.hostName}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.lg} />

          <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
              <DDIcon name="map-pin" size={18} color={theme.text} />
            </View>
            <View style={{ flex: 1, marginStart: Spacing.md }}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('invitation.location')}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                {request.location}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.lg} />

          <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
              <DDIcon name="calendar" size={18} color={theme.text} />
            </View>
            <View style={{ flex: 1, marginStart: Spacing.md }}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('form.date')}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                {formatDate(new Date(request.visitDate), 'long')}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.lg} />

          <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
              <DDIcon name="clock" size={18} color={theme.text} />
            </View>
            <View style={{ flex: 1, marginStart: Spacing.md }}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('form.time')}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                {request.pickupTime} - {request.returnTime}
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {request.vehicleInfo ? (
          <>
            <Spacer height={Spacing.lg} />

            <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
              <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('valet.vehicleInfo')}
              </ThemedText>
              <Spacer height={Spacing.xl} />

              <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.info, '15') }]}>
                  <DDIcon name="truck" size={18} color={theme.info} />
                </View>
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('valet.vehicle')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.vehicleInfo.make} {request.vehicleInfo.model}
                  </ThemedText>
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.info, '15') }]}>
                  <DDIcon name="droplet" size={18} color={theme.info} />
                </View>
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('valet.color')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.vehicleInfo.color}
                  </ThemedText>
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.info, '15') }]}>
                  <DDIcon name="tag" size={18} color={theme.info} />
                </View>
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('valet.plateNumber')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.vehicleInfo.plateNumber}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          </>
        ) : null}

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
          <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('valet.assignment')}
          </ThemedText>
          <Spacer height={Spacing.xl} />

          {request.assignedDriver ? (
            <>
              <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                  <DDIcon name="user" size={18} color={theme.success} />
                </View>
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('valet.driver')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.success, marginTop: 2, fontSize: 13, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.assignedDriver.name}
                  </ThemedText>
                </View>
              </View>

              <Spacer height={Spacing.lg} />

              <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                  <DDIcon name="phone" size={18} color={theme.text} />
                </View>
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('form.phone')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.assignedDriver.phone || 'N/A'}
                  </ThemedText>
                </View>
              </View>
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
              <Spacer height={Spacing.lg} />
              <View style={[styles.serviceRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.info, '15') }]}>
                  <DDIcon name="map-pin" size={18} color={theme.info} />
                </View>
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('parking.parkingSlot')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.info, marginTop: 2, fontSize: 13, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.parkingSlot}
                  </ThemedText>
                </View>
              </View>
            </>
          ) : null}
        </ThemedView>

        {request.notes ? (
          <>
            <Spacer height={Spacing.lg} />
            <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
              <View style={[styles.notesHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <DDIcon name="file-text" size={16} color={theme.info} />
                <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginStart: Spacing.sm, fontSize: 14, color: theme.text }]}>
                  {t('form.notes')}
                </ThemedText>
              </View>
              <Spacer height={Spacing.sm} />
              <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }]}>
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
  notesHeader: {
    alignItems: 'center',
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
  completedContainer: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driversList: {
    maxHeight: 400,
  },
  driverItem: {
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
