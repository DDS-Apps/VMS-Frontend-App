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
import {
  getValetTaskById,
  assignDriverToTask,
  updateTaskStatus,
  getAllDrivers,
  ValetTask,
} from '@/services/mock/valetMockData';
import type { ValetService, ValetDriver } from '@/types/vms.types';

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
  const insets = useSafeAreaInsets();
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
    const updatedTask = assignDriverToTask(taskId, driverId);
    if (updatedTask) {
      setTask({...updatedTask});
      setShowDriverPicker(false);
    }
  };

  const handleUpdateStatus = (status: ValetService['status']) => {
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

  return (
    <ScreenScrollView contentContainerStyle={{ 
      paddingHorizontal: Spacing.xl,
      paddingTop: insets.top + Spacing.xl,
      paddingBottom: insets.bottom + Spacing.xl
    }}>
      <View>
        <ThemedText style={[Typography.title, { fontWeight: '700', fontSize: 28, marginBottom: Spacing.sm }]}>
          {t('actions.viewDetails')}
        </ThemedText>
        <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
          #{task.id}
        </ThemedText>

        <Spacer height={Spacing.xl} />

        <ThemedView style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.lg }]}>
            {t('visitor.visitorDetails')}
          </ThemedText>

          <View style={styles.infoRow}>
            <DDIcon name="user" size={20} variant="primary" />
            <View style={{ marginStart: Spacing.md, flex: 1 }}>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {task.visitorName}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {task.visitorCompany}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.infoRow}>
            <DDIcon name="briefcase" size={20} variant="muted" />
            <View style={{ marginStart: Spacing.md, flex: 1 }}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('reception.hostName')}
              </ThemedText>
              <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                {task.hostName}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.infoRow}>
            <DDIcon name="calendar" size={20} variant="muted" />
            <View style={{ marginStart: Spacing.md, flex: 1 }}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('visitor.visitDate')}
              </ThemedText>
              <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                {task.visitDate}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.infoRow}>
            <DDIcon name="clock" size={20} variant="muted" />
            <View style={{ marginStart: Spacing.md, flex: 1 }}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('visitor.visitTime')}
              </ThemedText>
              <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                {task.pickupTime} - {task.returnTime}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.infoRow}>
            <DDIcon name="map-pin" size={20} variant="muted" />
            <View style={{ marginStart: Spacing.md, flex: 1 }}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('invitation.location')}
              </ThemedText>
              <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                {task.location}
              </ThemedText>
            </View>
          </View>

          {task.vehicleInfo ? (
            <>
              <Spacer height={Spacing.md} />
              <View style={styles.infoRow}>
                <DDIcon name="truck" size={20} variant="muted" />
                <View style={{ marginStart: Spacing.md, flex: 1 }}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('valet.vehiclePlate')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                    {task.vehicleInfo.color} {task.vehicleInfo.make} {task.vehicleInfo.model}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {task.vehicleInfo.plateNumber}
                  </ThemedText>
                </View>
              </View>
            </>
          ) : null}

          {task.notes ? (
            <>
              <Spacer height={Spacing.md} />
              <View
                style={[
                  styles.notesContainer,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <DDIcon name="file-text" size={16} variant="muted" />
                <ThemedText
                  style={[
                    Typography.body,
                    { color: theme.textSecondary, marginStart: Spacing.sm, flex: 1 },
                  ]}
                >
                  {task.notes}
                </ThemedText>
              </View>
            </>
          ) : null}
        </ThemedView>

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.lg }]}>
            {t('status.pending')}
          </ThemedText>

          <Pressable
            onPress={() => setShowStatusPicker(true)}
            style={({ pressed }) => [
              styles.statusButton,
              {
                backgroundColor: `${currentStatusOption?.color}15`,
                borderColor: currentStatusOption?.color,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <DDIcon
                name={currentStatusOption?.icon as IconName}
                size={20}
                color={currentStatusOption?.color}
              />
              <ThemedText
                style={[
                  Typography.body,
                  {
                    color: currentStatusOption?.color,
                    fontWeight: '600',
                    marginStart: Spacing.md,
                  },
                ]}
              >
                {currentStatusOption?.label}
              </ThemedText>
            </View>
            <DDIcon name="chevron-down" size={20} color={currentStatusOption?.color} directionAware />
          </Pressable>
        </ThemedView>

        <Spacer height={Spacing.lg} />

        <ThemedView style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.lg }]}>
            {t('actions.assignDriver')}
          </ThemedText>

          {task.valet.driver ? (
            <View
              style={[
                styles.driverCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs }}>
                  <DDIcon name="truck" size={20} variant="primary" />
                  <ThemedText
                    style={[Typography.body, { fontWeight: '600', marginStart: Spacing.sm }]}
                  >
                    {task.valet.driver.name}
                  </ThemedText>
                </View>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {task.valet.driver.phone}
                </ThemedText>
                <Spacer height={Spacing.xs} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          task.valet.driver.status === 'available' ? theme.success : theme.warning,
                      },
                    ]}
                  />
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {task.valet.driver.status === 'available' ? t('status.available') : t('status.occupied')} • {task.valet.driver.currentTasks} {t('valet.assignedTasks').toLowerCase()}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                onPress={() => setShowDriverPicker(true)}
                style={({ pressed }) => [
                  styles.changeButton,
                  { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                  {t('common.edit')}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowDriverPicker(true)}
              style={({ pressed }) => [
                styles.assignButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <DDIcon name="user-plus" size={20} color={theme.buttonText} />
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
      </View>

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
                      { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                        {driver.name}
                      </ThemedText>
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                        {driver.phone}
                      </ThemedText>
                      <Spacer height={Spacing.xs} />
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
                        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                          {t('status.available')} • {driver.currentTasks} {t('valet.assignedTasks').toLowerCase()}
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
                    backgroundColor: task.valet.status === option.value ? `${option.color}15` : 'transparent',
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
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
  container: {
    padding: Spacing.xl,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notesContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  changeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cancelButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
});
