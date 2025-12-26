import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import {
  useBuffetAdminTaskQuery,
  useBuffetAdminStaffQuery,
  useUpdateBuffetAdminTaskStatusMutation,
  useAssignBuffetTaskMutation,
} from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminTaskDto, BuffetAdminStaffDto } from "@/types/api.types";
import type { BuffetRequestDetailsScreenProps } from "@/types/buffetAdminNavigation.types";
import { useAuth } from "@/contexts/AuthContext";

type BuffetRequest = BuffetAdminTaskDto & {
  timeSlot: string;
  assignedStaff?: string;
  assignedStaffId?: string;
  mealType: string;
  meetingRoom?: string;
};

interface StaffDisplayItem {
  id: string;
  name: string;
  role: string;
  status: 'on_duty' | 'off_duty';
  currentTasks: number;
}

const mapTaskToRequest = (task: BuffetAdminTaskDto): BuffetRequest => ({
  ...task,
  timeSlot: task.visitTime,
  assignedStaff: task.assignedTo,
  assignedStaffId: task.assignedToId,
  meetingRoom: task.location,
});

const mapStaffDto = (staff: BuffetAdminStaffDto): StaffDisplayItem => ({
  id: staff.id,
  name: staff.name,
  role: staff.role,
  status: staff.status,
  currentTasks: staff.currentTasks,
});

export default function BuffetRequestDetailsScreen({ route, navigation }: BuffetRequestDetailsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const isReadOnlyRole = user?.role === 'building_admin';
  const initialRequest = route.params.request;
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string | null>(null);

  const { data: taskData, isLoading, isFetching, refetch: refetchTask } = useBuffetAdminTaskQuery(initialRequest.id);
  const { data: staffResponse } = useBuffetAdminStaffQuery();
  const updateStatusMutation = useUpdateBuffetAdminTaskStatusMutation();
  const assignTaskMutation = useAssignBuffetTaskMutation();

  const request: BuffetRequest = useMemo(() => {
    if (taskData) {
      const actualTask = (taskData as { data?: BuffetAdminTaskDto })?.data || taskData;
      if (actualTask && 'visitorName' in actualTask) {
        return mapTaskToRequest(actualTask as BuffetAdminTaskDto);
      }
    }
    if (initialRequest && 'visitorName' in initialRequest) {
      return mapTaskToRequest(initialRequest as BuffetAdminTaskDto);
    }
    return {
      id: initialRequest?.id || '',
      requestId: '',
      visitorName: 'Unknown',
      company: '',
      hostName: '',
      visitDate: '',
      visitTime: '',
      mealType: 'lunch',
      guestCount: 0,
      location: '',
      status: 'pending',
      assignedToId: null,
      notes: null,
      createdAt: '',
      updatedAt: '',
      timeSlot: '',
      assignedStaff: undefined,
      assignedStaffId: undefined,
      meetingRoom: '',
    } as BuffetRequest;
  }, [taskData, initialRequest]);

  const availableStaff = useMemo(() => {
    const responseData = staffResponse?.data as { data?: BuffetAdminStaffDto[] } | BuffetAdminStaffDto[] | undefined;
    const allStaff = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminStaffDto[] })?.data) ? (responseData as { data: BuffetAdminStaffDto[] }).data : []);
    return allStaff
      .filter(s => s.status === 'on_duty')
      .map(mapStaffDto);
  }, [staffResponse]);

  const handleOpenAssignModal = () => {
    setShowAssignModal(true);
  };

  const handleAssignStaff = (staff: StaffDisplayItem) => {
    if (isReadOnlyRole) return;
    setAssigningStaffId(staff.id);
    assignTaskMutation.mutate(
      { id: request.id, data: { staffId: staff.id } },
      {
        onSuccess: () => {
          refetchTask();
          setShowAssignModal(false);
          setAssigningStaffId(null);
          showSuccess(`${staff.name} ${t('buffet.hasBeenAssigned')}`, t('buffet.staffAssigned'));
        },
        onError: (error: any) => {
          setAssigningStaffId(null);
          const errorMessage = error?.response?.data?.message || t('common.errorOccurred');
          showError(errorMessage, t('common.error'));
        },
      }
    );
  };

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t('status.pending');
      case 'in_progress':
        return t('status.inProgress');
      case 'preparing':
        return t('buffet.preparing');
      case 'ready':
        return t('buffet.ready');
      case 'served':
        return t('buffet.served');
      case 'completed':
        return t('status.completed');
      case 'cancelled':
        return t('status.cancelled');
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.primary;
      case 'in_progress':
        return theme.warning;
      case 'preparing':
        return theme.warning;
      case 'ready':
        return theme.info;
      case 'served':
        return theme.success;
      case 'completed':
        return theme.success;
      case 'cancelled':
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'sunrise';
      case 'lunch':
        return 'sun';
      case 'dinner':
        return 'moon';
      case 'snacks':
        return 'disc';
      default:
        return 'disc';
    }
  };

  const getMealTypeLabel = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return t('buffet.breakfast');
      case 'lunch':
        return t('buffet.lunch');
      case 'dinner':
        return t('buffet.dinner');
      case 'snacks':
        return t('buffet.snacks');
      default:
        return mealType;
    }
  };

  const handleAdvanceStatus = () => {
    if (isReadOnlyRole) return;
    if (request.status === 'in_progress' && !request.assignedStaffId) return;
    const statusFlow = ['pending', 'in_progress', 'completed'] as const;
    const currentIndex = statusFlow.indexOf(request.status as any);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentIndex + 1];
      updateStatusMutation.mutate(
        { id: request.id, data: { status: nextStatus } },
        {
          onSuccess: () => {
            refetchTask();
            if (nextStatus === 'completed') {
              showSuccess(t('status.completed'), t('common.success'));
              navigation.goBack();
            } else {
              showSuccess(getStatusLabel(nextStatus), t('common.success'));
            }
          },
          onError: (error: any) => {
            const errorMessage = error?.response?.data?.message || t('common.errorOccurred');
            showError(errorMessage, t('common.error'));
          },
        }
      );
    }
  };

  const getNextStatusAction = () => {
    switch (request.status) {
      case 'pending':
        return { label: t('status.inProgress'), icon: 'play' };
      case 'in_progress':
        return { label: t('actions.markAsComplete'), icon: 'check' };
      default:
        return null;
    }
  };

  if (isLoading || isFetching) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const initials = request.visitorName.split(' ').map(n => n[0]).join('');
  const showActions = !isReadOnlyRole && request.status !== 'completed' && request.status !== 'cancelled';

  return (
    <>
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={[styles.headerCard, { backgroundColor: theme.surface }]}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {initials}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.visitorName, { color: theme.text }]}>
              {request.visitorName}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: applyOpacity(getStatusColor(request.status), '15') }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                {getStatusLabel(request.status)}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <Spacer height={Spacing.lg} />

      <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('buffet.orderDetails')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <DDIcon name="user" size={16} color={theme.primary} />
          </View>
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('reception.hostName')}</ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.hostName}</ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: applyOpacity(theme.success, '12') }]}>
            <DDIcon name="map-pin" size={16} color={theme.success} />
          </View>
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('invitation.location')}</ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.location}</ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: applyOpacity(theme.warning, '12') }]}>
            <DDIcon name="clock" size={16} color={theme.warning} />
          </View>
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('buffet.servingTime')}</ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.timeSlot}</ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <DDIcon name="users" size={16} color={theme.primary} />
          </View>
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('buffet.numberOfGuests')}</ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.guestCount}</ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: applyOpacity(theme.info, '12') }]}>
            <DDIcon name={getMealTypeIcon(request.mealType) as any} size={16} color={theme.info} />
          </View>
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('buffet.mealType')}</ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.text }]}>{getMealTypeLabel(request.mealType)}</ThemedText>
          </View>
        </View>

        {request.meetingRoom ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: applyOpacity(theme.warning, '12') }]}>
                <DDIcon name="home" size={16} color={theme.warning} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('buffet.meetingRoom')}</ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.meetingRoom}</ThemedText>
              </View>
            </View>
          </>
        ) : null}
      </View>

      {request.notes ? (
        <>
          <Spacer height={Spacing.lg} />

          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              {t('form.notes')}
            </ThemedText>

            <Spacer height={Spacing.md} />

            <ThemedText style={[styles.notesText, { color: theme.textSecondary }]}>
              {request.notes}
            </ThemedText>
          </View>
        </>
      ) : null}

      <Spacer height={Spacing.lg} />

      <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('navigation.staffManagement')}
          </ThemedText>
          {showActions ? (
            <Pressable
              style={[styles.assignButton, { backgroundColor: applyOpacity(theme.warning, '12') }]}
              onPress={handleOpenAssignModal}
            >
              <DDIcon name={request.assignedStaff ? "edit-2" : "user-plus"} size={14} color={theme.warning} />
              <ThemedText style={[styles.assignButtonText, { color: theme.warning }]}>
                {request.assignedStaff ? t('common.edit') : t('buffet.assignStaff')}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <Spacer height={Spacing.md} />

        {request.assignedStaff ? (
          <View style={styles.staffRow}>
            <View style={[styles.staffAvatar, { backgroundColor: applyOpacity(theme.success, '12') }]}>
              <DDIcon name="user-check" size={16} color={theme.success} />
            </View>
            <ThemedText style={[styles.staffName, { color: theme.text }]}>
              {request.assignedStaff}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.noStaffState}>
            <DDIcon name="user-x" size={24} variant="muted" />
            <ThemedText style={[styles.noStaffText, { color: theme.textSecondary }]}>
              {t('common.noData')}
            </ThemedText>
          </View>
        )}
      </View>

      {showActions ? (
        <>
          <Spacer height={Spacing.xl} />

          <View style={styles.actionsRow}>
            {getNextStatusAction() ? (
              request.status === 'in_progress' && !request.assignedStaffId ? null : (
                <LoadingButton
                  variant="success"
                  size="medium"
                  icon={getNextStatusAction()!.icon as any}
                  loading={updateStatusMutation.isPending}
                  loadingText={t('common.loading')}
                  onPress={handleAdvanceStatus}
                  style={styles.actionButtonNew}
                >
                  {getNextStatusAction()!.label}
                </LoadingButton>
              )
            ) : null}
          </View>
        </>
      ) : null}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>

    <Modal
      visible={showAssignModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAssignModal(false)}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setShowAssignModal(false)}
      >
        <Pressable style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
              {request.assignedStaff ? t('buffet.reassignStaff') : t('buffet.assignStaff')}
            </ThemedText>
            <Pressable
              onPress={() => setShowAssignModal(false)}
              hitSlop={8}
            >
              <DDIcon name="x" size={20} variant="muted" />
            </Pressable>
          </View>

          <View style={styles.modalRequestInfo}>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('buffet.assigningStaffFor')}
            </ThemedText>
            <ThemedText style={[Typography.body, { fontWeight: '600', marginTop: 4 }]}>
              {request.visitorName}
            </ThemedText>
            {request.assignedStaff ? (
              <ThemedText style={[Typography.caption, { color: theme.warning, marginTop: 4 }]}>
                {t('buffet.currentlyAssigned')} {request.assignedStaff}
              </ThemedText>
            ) : null}
          </View>

          <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.md }]}>
            {t('buffet.selectFromAvailable')} ({availableStaff.length} {t('dashboard.onDuty')})
          </ThemedText>

          <ScrollView style={styles.modalStaffList} showsVerticalScrollIndicator={false}>
            {availableStaff.length > 0 ? (
              availableStaff.map((staff) => (
                <Pressable
                  key={staff.id}
                  style={[
                    styles.modalStaffItem,
                    { 
                      backgroundColor: theme.surfaceSecondary,
                      borderColor: request.assignedStaffId === staff.id ? theme.success : 'transparent',
                      borderWidth: request.assignedStaffId === staff.id ? 2 : 0,
                      opacity: assigningStaffId && assigningStaffId !== staff.id ? 0.5 : 1,
                    }
                  ]}
                  onPress={() => handleAssignStaff(staff)}
                  disabled={assignTaskMutation.isPending}
                >
                  {assigningStaffId === staff.id ? (
                    <View style={[styles.modalStaffAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <LoadingSpinner size="small" color={theme.primary} inline />
                    </View>
                  ) : (
                    <View style={[styles.modalStaffAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <ThemedText style={[styles.modalStaffAvatarText, { color: theme.primary }]}>
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.modalStaffInfo}>
                    <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                      {staff.name}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                      {staff.role} - {staff.currentTasks} {t('dashboard.activeTasks')}
                    </ThemedText>
                  </View>
                  <View style={[
                    styles.modalStaffStatusDot,
                    { backgroundColor: staff.status === 'on_duty' ? theme.success : theme.textSecondary }
                  ]} />
                </Pressable>
              ))
            ) : (
              <View style={styles.modalNoStaff}>
                <DDIcon name="users" size={32} variant="muted" />
                <Spacer height={Spacing.sm} />
                <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
                  {t('buffet.noStaffOnDuty')}
                </ThemedText>
              </View>
            )}
          </ScrollView>

          <Pressable
            style={[styles.modalCancelButton, { borderColor: theme.border }]}
            onPress={() => setShowAssignModal(false)}
          >
            <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
              {t('common.cancel')}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginStart: Spacing.md,
    flex: 1,
  },
  visitorName: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
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
    marginStart: Spacing.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffName: {
    marginStart: Spacing.md,
    fontSize: 15,
    fontWeight: '500',
  },
  noStaffState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noStaffText: {
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  actionButtonNew: {
    flex: 1,
  },
  primaryButton: {},
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  assignButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalRequestInfo: {
    marginBottom: Spacing.md,
  },
  modalDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  modalStaffList: {
    maxHeight: 300,
  },
  modalStaffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  modalStaffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStaffAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalStaffInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  modalStaffStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalNoStaff: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
