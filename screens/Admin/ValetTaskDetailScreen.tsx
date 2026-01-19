import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from '@/components/DDIcon';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getValetTaskById,
  assignDriverToTask,
  updateTaskStatus,
  getAllDrivers,
  ValetTask,
} from '@/services/state/valetTasksState';
import type { ValetService, ValetDriver } from '@/types/vms.types';
import { useAuth } from '@/contexts/AuthContext';
import { applyOpacity } from '@/utils/statusStyles';
import { shouldSwapChildrenForRTL } from '@/utils/rtlInitializer';

interface ValetTaskDetailScreenProps {
  taskId: string;
}

interface StatusOption {
  value: ValetService['status'];
  label: string;
  icon: string;
  color: string;
}

const getStatusOptions = (theme: ReturnType<typeof useTheme>['theme'], t: (key: string) => string): StatusOption[] => [
  { value: 'pending', label: t('status.pending'), icon: 'clock', color: theme.warning },
  { value: 'assigned', label: t('status.scheduled'), icon: 'user-check', color: theme.info },
  { value: 'in_progress', label: t('status.inProgress'), icon: 'activity', color: theme.primary },
  { value: 'completed', label: t('status.completed'), icon: 'check-circle', color: theme.success },
];

export default function ValetTaskDetailScreen({ taskId }: ValetTaskDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const shouldSwap = shouldSwapChildrenForRTL(isRTL);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isReadOnlyRole = user?.role === 'building_admin';
  const [task, setTask] = useState<ValetTask | null>(null);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const taskData = getValetTaskById(taskId);
      setTask(taskData || null);
    }, [taskId])
  );

  if (!task) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText>{t('common.noResults')}</ThemedText>
      </ThemedView>
    );
  }

  const handleAssignDriver = (driverId: string) => {
    if (isReadOnlyRole) return;
    const updatedTask = assignDriverToTask(taskId, driverId);
    if (updatedTask) {
      setTask({...updatedTask});
      setShowDriverPicker(false);
    }
  };

  const handleUpdateStatus = (status: ValetService['status']) => {
    if (isReadOnlyRole) return;
    const updatedTask = updateTaskStatus(taskId, status);
    if (updatedTask) {
      setTask({...updatedTask});
      setShowStatusPicker(false);
    }
  };

  const allDrivers = getAllDrivers();
  const availableDrivers = allDrivers.filter((d) => d.status === 'available');

  const currentStatusOption = getStatusOptions(theme, t).find(
    (opt) => opt.value === task.valet.status
  );

  const statusColor = currentStatusOption?.color || theme.textSecondary;
  const initials = task.visitorName.split(' ').map(n => n[0]).join('');

  return (
    <ScreenScrollView contentContainerStyle={{ 
      paddingHorizontal: Spacing.lg,
      paddingTop: insets.top + Spacing.xl,
      paddingBottom: insets.bottom + Spacing.xl
    }}>
      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {initials}
            </ThemedText>
          </View>

          <Spacer height={Spacing.lg} />

          <ThemedText style={[Typography.title, { fontWeight: '600', fontSize: 22, color: theme.text }]}>
            {task.visitorName}
          </ThemedText>
          <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginTop: 4 }]}>
            {task.visitorCompany}
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
              {currentStatusOption?.label || task.valet.status}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('visitor.visitorDetails')}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={[styles.serviceRowNew, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>
              <View style={{ flex: 1, marginEnd: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('reception.hostName')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {task.hostName}
                </ThemedText>
              </View>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="briefcase" size={18} color={theme.text} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="briefcase" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('reception.hostName')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {task.hostName}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.serviceRowNew, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>
              <View style={{ flex: 1, marginEnd: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('visitor.visitDate')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {task.visitDate}
                </ThemedText>
              </View>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="calendar" size={18} color={theme.text} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="calendar" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('visitor.visitDate')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {task.visitDate}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.serviceRowNew, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>
              <View style={{ flex: 1, marginEnd: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('visitor.visitTime')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {task.pickupTime} - {task.returnTime}
                </ThemedText>
              </View>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="clock" size={18} color={theme.text} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="clock" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('visitor.visitTime')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {task.pickupTime} - {task.returnTime}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.serviceRowNew, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>
              <View style={{ flex: 1, marginEnd: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('invitation.location')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {task.location}
                </ThemedText>
              </View>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="map-pin" size={18} color={theme.text} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="map-pin" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('invitation.location')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                  {task.location}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        {task.vehicleInfo ? (
          <>
            <Spacer height={Spacing.lg} />
            <View style={[styles.serviceRowNew, { flexDirection: 'row' }]}>
              {shouldSwap ? (
                <>
                  <View style={{ flex: 1, marginEnd: Spacing.md }}>
                    <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('valet.vehiclePlate')}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                      {task.vehicleInfo.color} {task.vehicleInfo.make} {task.vehicleInfo.model}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.info, marginTop: 2, fontSize: 12, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }]}>
                      {task.vehicleInfo.plateNumber}
                    </ThemedText>
                  </View>
                  <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.info, '15') }]}>
                    <DDIcon name="truck" size={18} color={theme.info} />
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.info, '15') }]}>
                    <DDIcon name="truck" size={18} color={theme.info} />
                  </View>
                  <View style={{ flex: 1, marginStart: Spacing.md }}>
                    <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('valet.vehiclePlate')}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                      {task.vehicleInfo.color} {task.vehicleInfo.make} {task.vehicleInfo.model}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.info, marginTop: 2, fontSize: 12, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }]}>
                      {task.vehicleInfo.plateNumber}
                    </ThemedText>
                  </View>
                </>
              )}
            </View>
          </>
        ) : null}
      </ThemedView>

      {task.notes ? (
        <>
          <Spacer height={Spacing.lg} />
          <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
            <View style={[styles.notesHeader, { flexDirection: 'row' }]}>
              {shouldSwap ? (
                <>
                  <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginEnd: Spacing.sm, fontSize: 14, color: theme.text }]}>
                    {t('form.notes')}
                  </ThemedText>
                  <DDIcon name="file-text" size={16} color={theme.info} />
                </>
              ) : (
                <>
                  <DDIcon name="file-text" size={16} color={theme.info} />
                  <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginStart: Spacing.sm, fontSize: 14, color: theme.text }]}>
                    {t('form.notes')}
                  </ThemedText>
                </>
              )}
            </View>
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }]}>
              {task.notes}
            </ThemedText>
          </ThemedView>
        </>
      ) : null}

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: isRTL ? 'right' : 'left', marginBottom: Spacing.lg }]}>
          {t('status.pending')}
        </ThemedText>

        {isReadOnlyRole ? (
          <View
            style={[
              styles.statusButton,
              {
                backgroundColor: applyOpacity(statusColor, '15'),
                borderColor: statusColor,
                flexDirection: 'row',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {shouldSwap ? (
                <>
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: statusColor,
                        fontWeight: '600',
                        marginEnd: Spacing.md,
                      },
                    ]}
                  >
                    {currentStatusOption?.label}
                  </ThemedText>
                  <DDIcon
                    name={currentStatusOption?.icon as IconName}
                    size={20}
                    color={statusColor}
                  />
                </>
              ) : (
                <>
                  <DDIcon
                    name={currentStatusOption?.icon as IconName}
                    size={20}
                    color={statusColor}
                  />
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: statusColor,
                        fontWeight: '600',
                        marginStart: Spacing.md,
                      },
                    ]}
                  >
                    {currentStatusOption?.label}
                  </ThemedText>
                </>
              )}
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowStatusPicker(true)}
            style={({ pressed }) => [
              styles.statusButton,
              {
                backgroundColor: applyOpacity(statusColor, '15'),
                borderColor: statusColor,
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {shouldSwap ? (
                <>
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: statusColor,
                        fontWeight: '600',
                        marginEnd: Spacing.md,
                      },
                    ]}
                  >
                    {currentStatusOption?.label}
                  </ThemedText>
                  <DDIcon
                    name={currentStatusOption?.icon as IconName}
                    size={20}
                    color={statusColor}
                  />
                </>
              ) : (
                <>
                  <DDIcon
                    name={currentStatusOption?.icon as IconName}
                    size={20}
                    color={statusColor}
                  />
                  <ThemedText
                    style={[
                      Typography.body,
                      {
                        color: statusColor,
                        fontWeight: '600',
                        marginStart: Spacing.md,
                      },
                    ]}
                  >
                    {currentStatusOption?.label}
                  </ThemedText>
                </>
              )}
            </View>
            <DDIcon name="chevron-down" size={20} color={statusColor} directionAware />
          </Pressable>
        )}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }]}>
          <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
            {t('actions.assignDriver')}
          </ThemedText>
          {task.valet.driver && !isReadOnlyRole ? (
            <Pressable
              onPress={() => setShowDriverPicker(true)}
              style={[styles.editButton, { backgroundColor: applyOpacity(theme.warning, '12') }]}
            >
              <DDIcon name="edit-2" size={14} color={theme.warning} />
              <ThemedText style={[styles.editButtonText, { color: theme.warning }]}>
                {t('common.edit')}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {task.valet.driver ? (
          <View style={[styles.serviceRowNew, { flexDirection: 'row' }]}>
            {shouldSwap ? (
              <>
                <View style={{ flex: 1, marginEnd: Spacing.md }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                    {task.valet.driver.name}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                    {task.valet.driver.phone}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            task.valet.driver.status === 'available' ? theme.success : theme.warning,
                        },
                      ]}
                    />
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                      {task.valet.driver.status === 'available' ? t('status.available') : t('status.occupied')} - {task.valet.driver.currentTasks} {t('valet.assignedTasks').toLowerCase()}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                  <DDIcon name="truck" size={18} color={theme.success} />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                  <DDIcon name="truck" size={18} color={theme.success} />
                </View>
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, textAlign: isRTL ? 'right' : 'left' }]}>
                    {task.valet.driver.name}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                    {task.valet.driver.phone}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            task.valet.driver.status === 'available' ? theme.success : theme.warning,
                        },
                      ]}
                    />
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                      {task.valet.driver.status === 'available' ? t('status.available') : t('status.occupied')} - {task.valet.driver.currentTasks} {t('valet.assignedTasks').toLowerCase()}
                    </ThemedText>
                  </View>
                </View>
              </>
            )}
          </View>
        ) : isReadOnlyRole ? (
          <View style={styles.noDriverState}>
            <DDIcon name="user-x" size={24} variant="muted" />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
              {t('common.noData')}
            </ThemedText>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowDriverPicker(true)}
            style={({ pressed }) => [
              styles.assignButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <DDIcon name="user-plus" size={18} color={theme.buttonText} />
            <ThemedText
              style={[
                Typography.body,
                { color: theme.buttonText, fontWeight: '600', marginStart: Spacing.sm },
              ]}
            >
              {t('actions.assignDriver')}
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>

      <Modal
        visible={showDriverPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDriverPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDriverPicker(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <ThemedText style={[Typography.subtitle, { fontSize: 20, fontWeight: '600', marginBottom: Spacing.lg }]}>
              {t('navigation.drivers')}
            </ThemedText>

            <ScrollView style={{ maxHeight: 400 }}>
              {availableDrivers.length > 0 ? (
                availableDrivers.map((driver) => (
                  <Pressable
                    key={driver.id}
                    onPress={() => handleAssignDriver(driver.id)}
                    style={({ pressed }) => [
                      styles.driverOption,
                      { borderColor: theme.border, opacity: pressed ? 0.7 : 1, flexDirection: 'row' },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[Typography.body, { fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
                        {driver.name}
                      </ThemedText>
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {driver.phone}
                      </ThemedText>
                      <Spacer height={Spacing.xs} />
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
                        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                          {t('status.available')} - {driver.currentTasks} {t('valet.assignedTasks').toLowerCase()}
                        </ThemedText>
                      </View>
                    </View>
                    <DDIcon name="chevron-right" size={20} variant="muted" directionAware />
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <DDIcon name="user-x" size={32} variant="muted" />
                  <Spacer height={Spacing.md} />
                  <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
                    {t('common.noResults')}
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            <Spacer height={Spacing.lg} />

            <LoadingButton
              onPress={() => setShowDriverPicker(false)}
              variant="secondary"
              size="medium"
              fullWidth
            >
              {t('common.cancel')}
            </LoadingButton>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showStatusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowStatusPicker(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <ThemedText style={[Typography.subtitle, { fontSize: 20, fontWeight: '600', marginBottom: Spacing.lg }]}>
              {t('status.pending')}
            </ThemedText>

            {getStatusOptions(theme, t).map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleUpdateStatus(option.value)}
                style={({ pressed }) => [
                  styles.statusOption,
                  {
                    backgroundColor: task.valet.status === option.value ? applyOpacity(option.color, '15') : 'transparent',
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                    flexDirection: 'row',
                  },
                ]}
              >
                <DDIcon name={option.icon as IconName} size={20} color={option.color} />
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      color: task.valet.status === option.value ? option.color : theme.text,
                      fontWeight: task.valet.status === option.value ? '600' : '400',
                      marginStart: Spacing.md,
                      flex: 1,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                >
                  {option.label}
                </ThemedText>
                {task.valet.status === option.value ? (
                  <DDIcon name="check" size={20} color={option.color} />
                ) : null}
              </Pressable>
            ))}

            <Spacer height={Spacing.lg} />

            <LoadingButton
              onPress={() => setShowStatusPicker(false)}
              variant="secondary"
              size="medium"
              fullWidth
            >
              {t('common.cancel')}
            </LoadingButton>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScrollView>
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
  statusButton: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noDriverState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  driverOption: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  statusOption: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
});
