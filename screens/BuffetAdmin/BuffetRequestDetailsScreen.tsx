import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { RequestTimeline, type TimelineStep } from "@/components/shared/RequestTimeline";
import {
  useBuffetAdminTaskQuery,
  useBuffetAdminStaffQuery,
  useUpdateBuffetAdminTaskStatusMutation,
  useAssignBuffetTaskMutation,
} from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminTaskDto, BuffetAdminStaffDto, BuffetAdminTaskStatus } from "@/types/api.types";
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
  status: staff.dutyStatus,
  currentTasks: staff.currentTasks,
});

const BUFFET_STATUS_ORDER = ['pending', 'preparing', 'ready', 'served', 'completed'] as const;

const getStepStatus = (stepIndex: number, currentStatusIndex: number, isCancelled: boolean): 'completed' | 'current' | 'pending' => {
  if (isCancelled) return 'pending';
  if (stepIndex < currentStatusIndex) return 'completed';
  if (stepIndex === currentStatusIndex) return 'current';
  return 'pending';
};

const buildBuffetTimelineSteps = (
  request: BuffetRequest,
  t: (key: string) => string
): TimelineStep[] => {
  const currentStatusIndex = BUFFET_STATUS_ORDER.indexOf(request.status as typeof BUFFET_STATUS_ORDER[number]);
  const isCancelled = request.status === 'cancelled';

  // Define all possible steps
  const allSteps: Array<{ id: string; label: string; icon: string; statusIndex: number }> = [
    { id: 'pending', label: t('buffet.pending'), icon: 'clock', statusIndex: 0 },
    { id: 'preparing', label: t('buffet.preparing'), icon: 'loader', statusIndex: 1 },
    { id: 'ready', label: t('buffet.ready'), icon: 'check-circle', statusIndex: 2 },
    { id: 'served', label: t('buffet.served'), icon: 'coffee', statusIndex: 3 },
    { id: 'completed', label: t('buffet.completed'), icon: 'check', statusIndex: 4 },
  ];

  // Always start with Request Created
  const steps: TimelineStep[] = [
    {
      id: 'created',
      label: t('timeline.requestCreated'),
      timestamp: request.createdAt,
      status: 'completed',
      icon: 'file-plus',
    },
  ];

  if (isCancelled) {
    // When cancelled, show Pending as completed (the step before cancellation), then Cancelled
    steps.push({
      id: 'pending',
      label: t('buffet.pending'),
      status: 'completed',
      icon: 'clock',
    });
    steps.push({
      id: 'cancelled',
      label: t('status.cancelled'),
      status: 'error',
      icon: 'x-circle',
    });
    // Don't show any subsequent steps (preparing, ready, served, completed)
    return steps;
  }

  // Normal flow - add all steps with their appropriate status
  for (const step of allSteps) {
    steps.push({
      id: step.id,
      label: step.label,
      status: getStepStatus(step.statusIndex, currentStatusIndex, isCancelled),
      icon: step.icon,
    });
  }

  return steps;
};

export default function BuffetRequestDetailsScreen({ route, navigation }: BuffetRequestDetailsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
  const { showSuccess } = useToast();
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
    if (initialRequest && 'visitorName' in initialRequest && 'visitTime' in initialRequest) {
      return mapTaskToRequest(initialRequest as unknown as BuffetAdminTaskDto);
    }
    const id = (initialRequest as { id?: string })?.id || '';
    return {
      id,
      requestId: '',
      visitorName: 'Unknown',
      company: '',
      hostName: '',
      visitDate: '',
      visitTime: '',
      mealType: 'lunch' as const,
      guestCount: 0,
      location: '',
      status: 'pending' as const,
      assignedToId: undefined,
      assignedTo: undefined,
      notes: undefined,
      createdAt: '',
      updatedAt: '',
      timeSlot: '',
      assignedStaff: undefined,
      assignedStaffId: undefined,
      meetingRoom: '',
    };
  }, [taskData, initialRequest]);

  const availableStaff = useMemo(() => {
    const responseData = staffResponse?.data as { data?: BuffetAdminStaffDto[] } | BuffetAdminStaffDto[] | undefined;
    const allStaff = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminStaffDto[] })?.data) ? (responseData as { data: BuffetAdminStaffDto[] }).data : []);
    return allStaff
      .filter(s => s.dutyStatus === 'on_duty')
      .map(mapStaffDto);
  }, [staffResponse]);

  const timelineSteps = useMemo(() => buildBuffetTimelineSteps(request, t), [request, t]);

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
        onError: () => {
          setAssigningStaffId(null);
          // Error toast is handled globally by QueryProvider
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
      case 'preparing':
        return theme.warning;
      case 'ready':
        return '#10B981';
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

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'served';
      case 'served':
        return 'completed';
      default:
        return null;
    }
  };

  const handleAdvanceStatus = () => {
    if (isReadOnlyRole) return;
    const nextStatus = getNextStatus(request.status);
    if (!nextStatus) return;
    
    updateStatusMutation.mutate(
      { id: request.id, data: { status: nextStatus as BuffetAdminTaskStatus } },
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
        // Error toast is handled globally by QueryProvider with actual API error message
      }
    );
  };

  const getNextStatusAction = () => {
    switch (request.status) {
      case 'pending':
        return { label: t('buffet.startPreparing'), icon: 'play', color: theme.warning };
      case 'preparing':
        return { label: t('buffet.markReady'), icon: 'check', color: '#10B981' };
      case 'ready':
        return { label: t('buffet.markServed'), icon: 'coffee', color: theme.success };
      case 'served':
        return { label: t('actions.markAsComplete'), icon: 'check-circle', color: theme.success };
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

  const initials = request.visitorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const showActions = !isReadOnlyRole && request.status !== 'completed' && request.status !== 'cancelled';
  const statusColor = getStatusColor(request.status);

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
            {request.company || ''}
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
              {getStatusLabel(request.status)}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
          {t('buffet.orderDetails')}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <DirectionalRow style={styles.serviceRowNew}>
          <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
            <DDIcon name="user" size={18} color={theme.text} />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
              {t('reception.hostName')}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
              {request.hostName}
            </ThemedText>
          </View>
        </DirectionalRow>

        <Spacer height={Spacing.lg} />

        <DirectionalRow style={styles.serviceRowNew}>
          <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
            <DDIcon name="map-pin" size={18} color={theme.text} />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
              {t('invitation.location')}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
              {request.meetingRoom || request.hostName}
            </ThemedText>
          </View>
        </DirectionalRow>

        <Spacer height={Spacing.lg} />

        <DirectionalRow style={styles.serviceRowNew}>
          <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
            <DDIcon name="clock" size={18} color={theme.text} />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
              {t('buffet.servingTime')}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
              {request.timeSlot}
            </ThemedText>
          </View>
        </DirectionalRow>

      </ThemedView>

      {request.notes ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
            <DirectionalRow style={styles.notesHeader}>
              <DDIcon name="file-text" size={16} color={theme.info} />
              <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginStart: Spacing.sm, fontSize: 14, color: theme.text }]}>
                {t('form.notes')}
              </ThemedText>
            </DirectionalRow>
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20 }]}>
              {request.notes}
            </ThemedText>
          </ThemedView>
        </>
      ) : null}

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <DirectionalRow style={[styles.sectionHeaderRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
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
        </DirectionalRow>

        <Spacer height={Spacing.lg} />

        {request.assignedStaff ? (
          <DirectionalRow style={styles.serviceRowNew}>
            <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.success, '15') }]}>
              <DDIcon name="user-check" size={18} color={theme.success} />
            </View>
            <View style={{ flex: 1, marginStart: Spacing.md }}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                {t('buffet.assignedStaff')}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.success, marginTop: 2, fontSize: 13, fontWeight: '500' }]}>
                {request.assignedStaff}
              </ThemedText>
            </View>
          </DirectionalRow>
        ) : (
          <View style={styles.noStaffState}>
            <DDIcon name="user-x" size={24} variant="muted" />
            <ThemedText style={[styles.noStaffText, { color: theme.textSecondary }]}>
              {t('common.noData')}
            </ThemedText>
          </View>
        )}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <RequestTimeline steps={timelineSteps} />

      {showActions ? (
        <>
          <Spacer height={Spacing.xl} />

          <View style={styles.actionsRow}>
            {getNextStatusAction() ? (
              <LoadingButton
                variant="success"
                size="medium"
                icon={getNextStatusAction()!.icon as any}
                loading={updateStatusMutation.isPending}
                loadingText={t('common.loading')}
                onPress={handleAdvanceStatus}
                fullWidth
              >
                {getNextStatusAction()!.label}
              </LoadingButton>
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
          <DirectionalRow style={[styles.modalHeader, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
              {request.assignedStaff ? t('buffet.reassignStaff') : t('buffet.assignStaff')}
            </ThemedText>
            <Pressable
              onPress={() => setShowAssignModal(false)}
              hitSlop={8}
            >
              <DDIcon name="x" size={20} variant="muted" />
            </Pressable>
          </DirectionalRow>

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
                        {staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
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
  sectionHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  assignButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noStaffState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noStaffText: {
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  actionsRow: {
    gap: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalRequestInfo: {
    paddingVertical: Spacing.md,
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
    width: 8,
    height: 8,
    borderRadius: 4,
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
