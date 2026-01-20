import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, ActivityIndicator, Alert, Modal, ScrollView } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon, IconName } from "@/components/DDIcon";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { applyOpacity, getStatusConfig } from "@/utils/statusStyles";
import type { StatusConfig } from "@/types/theme.types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import {
  useBuffetLoadSummaryQuery,
  useBuffetAdminTasksQuery,
  useBuffetAdminStaffQuery,
  useUpdateBuffetAdminTaskStatusMutation,
  useAssignBuffetTaskMutation,
} from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminTaskDto, BuffetAdminStaffDto } from "@/types/api.types";
import type { BuffetAdminDashboardScreenProps } from "@/types/buffetAdminNavigation.types";

type BuffetRequest = BuffetAdminTaskDto & {
  timeSlot: string;
  assignedStaff?: string;
  assignedStaffId?: string;
  meetingRoom?: string;
};

type BuffetStaff = {
  id: string;
  name: string;
  role: string;
  shift: string;
  status: string;
  currentTasks?: number;
};

const mapTaskToRequest = (task: BuffetAdminTaskDto): BuffetRequest => ({
  ...task,
  timeSlot: task.visitTime,
  assignedStaff: task.assignedTo,
  assignedStaffId: task.assignedToId,
  meetingRoom: task.location,
});

const mapAdminStaffDto = (staff: BuffetAdminStaffDto): BuffetStaff => {
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    shift: staff.dutyStatus === 'on_duty' ? 'On Duty' : 'Off Duty',
    status: staff.dutyStatus,
    currentTasks: staff.currentTasks,
  };
};

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  cardBgColor: string;
}

function KPICard({ title, value, icon, iconBgColor, iconColor, cardBgColor }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: cardBgColor, borderWidth: StyleSheet.hairlineWidth, borderColor: applyOpacity(iconColor, '15') }]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon as IconName} size={28} color={iconColor} />
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={[styles.kpiValue, { color: theme.text }]}>
        {value}
      </ThemedText>

      <Spacer height={Spacing.xs} />

      <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, iconBgColor, iconColor, onPress }: QuickActionProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon as IconName} size={24} color={iconColor} />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[styles.quickActionLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function BuffetAdminDashboardScreen({ navigation }: BuffetAdminDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BuffetRequest | null>(null);
  const [assigningStaffId, setAssigningStaffId] = useState<string | null>(null);

  const { data: loadSummaryData, isLoading: isLoadingSummary, isFetching: isFetchingSummary } = useBuffetLoadSummaryQuery();
  const { data: tasksResponse, isLoading: isLoadingTasks, isFetching: isFetchingTasks, refetch: refetchTasks } = useBuffetAdminTasksQuery();
  const { data: staffData } = useBuffetAdminStaffQuery();
  const updateStatusMutation = useUpdateBuffetAdminTaskStatusMutation();
  const assignTaskMutation = useAssignBuffetTaskMutation();

  const stats = useMemo(() => {
    if (loadSummaryData?.locations) {
      const locations = loadSummaryData.locations;
      const pending = locations.reduce((sum, loc) => sum + loc.pendingTasks, 0);
      const inProgress = locations.reduce((sum, loc) => sum + loc.activeTasks, 0);
      const completed = locations.reduce((sum, loc) => sum + loc.completedTasks, 0);
      const total = locations.reduce((sum, loc) => sum + loc.tasksToday, 0);
      return { pending, inProgress, completed, total };
    }
    return { pending: 0, inProgress: 0, completed: 0, total: 0 };
  }, [loadSummaryData]);

  const parseTimeSlot = (timeSlot: string): number => {
    const match = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const requests = useMemo(() => {
    const responseData = tasksResponse?.data as { data?: BuffetAdminTaskDto[] } | BuffetAdminTaskDto[] | undefined;
    const tasks = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminTaskDto[] })?.data) ? (responseData as { data: BuffetAdminTaskDto[] }).data : []);
    return [...tasks].sort((a, b) => {
      const statusOrder: Record<string, number> = { 
        pending: 0, 
        preparing: 1, 
        ready: 2, 
        served: 3, 
        completed: 4, 
        cancelled: 5 
      };
      const statusA = statusOrder[a.status] ?? 99;
      const statusB = statusOrder[b.status] ?? 99;
      if (statusA !== statusB) return statusA - statusB;
      const dateA = new Date(a.visitDate + 'T' + (a.visitTime?.replace(/\s*(AM|PM)/i, '') || '00:00')).getTime();
      const dateB = new Date(b.visitDate + 'T' + (b.visitTime?.replace(/\s*(AM|PM)/i, '') || '00:00')).getTime();
      return dateB - dateA;
    });
  }, [tasksResponse]);

  const availableStaff = useMemo(() => {
    const responseData = staffData?.data as { data?: BuffetAdminStaffDto[] } | BuffetAdminStaffDto[] | undefined;
    const staffList = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminStaffDto[] })?.data) ? (responseData as { data: BuffetAdminStaffDto[] }).data : []);
    return staffList
      .filter(s => s.dutyStatus === 'on_duty')
      .map(mapAdminStaffDto);
  }, [staffData]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const handleMarkComplete = (requestId: string, event: GestureResponderEvent) => {
    event.stopPropagation();
    updateStatusMutation.mutate(
      { id: requestId, data: { status: 'completed' } },
      {
        onSuccess: () => {
          refetchTasks();
        },
        onError: () => {
          Alert.alert(t('common.error'), t('common.errorOccurred'));
        },
      }
    );
  };

  const handleViewDetails = (request: BuffetAdminTaskDto, event: GestureResponderEvent) => {
    event.stopPropagation();
    const mappedRequest = mapTaskToRequest(request);
    navigation.navigate(ROUTES.BUFFET_REQUEST_DETAILS as never, { request: mappedRequest as any } as never);
  };

  const handleOpenAssignModal = (item: BuffetAdminTaskDto, event: GestureResponderEvent) => {
    event.stopPropagation();
    const mappedRequest = mapTaskToRequest(item);
    setSelectedRequest(mappedRequest);
    setShowAssignModal(true);
  };

  const handleStaffAssignment = (staff: BuffetStaff) => {
    if (selectedRequest) {
      setAssigningStaffId(staff.id);
      assignTaskMutation.mutate(
        { id: selectedRequest.id, data: { staffId: staff.id } },
        {
          onSuccess: () => {
            refetchTasks();
            setShowAssignModal(false);
            setSelectedRequest(null);
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
    }
  };

  const renderStaffAssignModal = () => (
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
              {t('buffet.assignStaff')}
            </ThemedText>
            <Pressable
              onPress={() => setShowAssignModal(false)}
              hitSlop={8}
            >
              <DDIcon name="x" size={20} variant="muted" />
            </Pressable>
          </View>

          {selectedRequest ? (
            <View style={styles.modalRequestInfo}>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                {t('buffet.assigningStaffFor')}:
              </ThemedText>
              <ThemedText style={[Typography.body, { fontWeight: '600', marginTop: 4 }]}>
                {selectedRequest.visitorName}
              </ThemedText>
              {selectedRequest.assignedStaff ? (
                <ThemedText style={[Typography.caption, { color: theme.warning, marginTop: 4 }]}>
                  {t('buffet.currentlyAssigned')}: {selectedRequest.assignedStaff}
                </ThemedText>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.md }]}>
            {t('buffet.selectFromAvailableStaff')} ({availableStaff.length} {t('buffet.onDuty')})
          </ThemedText>

          <ScrollView style={styles.staffList} showsVerticalScrollIndicator={false}>
            {availableStaff.length > 0 ? (
              availableStaff.map((staff) => (
                <Pressable
                  key={staff.id}
                  style={[
                    styles.staffItem,
                    { 
                      backgroundColor: theme.surfaceSecondary,
                      borderColor: selectedRequest?.assignedStaffId === staff.id ? theme.success : 'transparent',
                      borderWidth: selectedRequest?.assignedStaffId === staff.id ? 2 : 0,
                      opacity: assigningStaffId && assigningStaffId !== staff.id ? 0.5 : 1,
                    }
                  ]}
                  onPress={() => handleStaffAssignment(staff)}
                  disabled={assignTaskMutation.isPending}
                >
                  {assigningStaffId === staff.id ? (
                    <View style={[styles.staffAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <LoadingSpinner size="small" color={theme.primary} inline />
                    </View>
                  ) : (
                    <View style={[styles.staffAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <ThemedText style={[styles.staffAvatarText, { color: theme.primary }]}>
                        {staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.staffInfo}>
                    <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                      {staff.name}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                      {staff.role} - {staff.shift}
                    </ThemedText>
                  </View>
                  <View style={[
                    styles.staffStatusDot,
                    { backgroundColor: staff.status === 'on_duty' ? theme.success : theme.textSecondary }
                  ]} />
                </Pressable>
              ))
            ) : (
              <View style={styles.noStaffState}>
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
  );

  const renderRequestCard = (item: BuffetAdminTaskDto) => {
    const statusConfig = getStatusConfig(theme, item.status, t);
    const initials = item.visitorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const showActions = item.status !== 'completed' && item.status !== 'cancelled';
    
    return (
      <Pressable 
        key={item.id}
        onPress={(e) => handleViewDetails(item, e)}
        android_ripple={{ color: applyOpacity(theme.primary, '10') }}
        style={({ pressed }) => [
          styles.requestCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: statusConfig.borderColor,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {initials}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameWithBadgeRow}>
              <ThemedText style={[styles.visitorName, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                {item.visitorName}
              </ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: StyleSheet.hairlineWidth }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.hostName, { color: theme.textSecondary }]} numberOfLines={1}>
              {t('reception.hostName')}: {item.hostName}
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.metaRow}>
          <DDIcon name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.location}
          </ThemedText>
        </View>

        <Spacer height={Spacing.xs} />

        <View style={styles.metaRow}>
          <DDIcon name="clock" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {formatTimeFromString(item.visitTime)}
          </ThemedText>
          <View style={styles.metaDot} />
          <DDIcon name="users" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {item.guestCount} {t('buffet.numberOfGuests').toLowerCase()}
          </ThemedText>
        </View>

        {item.assignedTo ? (
          <>
            <Spacer height={Spacing.xs} />
            <View style={styles.metaRow}>
              <DDIcon name="user-check" size={14} color={theme.success} />
              <ThemedText style={[styles.metaText, { color: theme.success }]}>
                {item.assignedTo}
              </ThemedText>
            </View>
          </>
        ) : null}

        <Spacer height={Spacing.md} />

        <View style={styles.cardFooter}>
          {showActions ? (
            <Pressable
              style={[styles.assignButton, { backgroundColor: applyOpacity(theme.warning, '12') }]}
              onPress={(e) => handleOpenAssignModal(item, e)}
            >
              <DDIcon name="user-plus" size={14} color={theme.warning} />
              <ThemedText style={[styles.assignButtonText, { color: theme.warning }]}>
                {item.assignedTo ? t('buffet.reassign') : t('buffet.assignStaff')}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={[styles.completedBadge, { backgroundColor: applyOpacity(theme.success, '15') }]}>
              <DDIcon name="check-circle" size={14} color={theme.success} />
              <ThemedText style={[styles.completedText, { color: theme.success }]}>
                {t('common.done')}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const isLoading = isLoadingSummary || isLoadingTasks;
  const isFetching = isFetchingSummary || isFetchingTasks;

  if (isLoading || isFetching) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <DirectionalRow style={styles.kpiRow}>
        <KPICard 
          title={t('time.today')} 
          value={String(stats.total)} 
          icon="disc" 
          iconBgColor={applyOpacity(theme.primary, '20')}
          iconColor={theme.primary}
          cardBgColor={applyOpacity(theme.primary, '06')}
        />
        <KPICard 
          title={t('status.pending')} 
          value={String(stats.pending)} 
          icon="clock" 
          iconBgColor={applyOpacity(theme.warning, '20')}
          iconColor={theme.warning}
          cardBgColor={applyOpacity(theme.warning, '06')}
        />
        <KPICard 
          title={t('status.completed')} 
          value={String(stats.completed)} 
          icon="check-circle" 
          iconBgColor={applyOpacity(theme.success, '20')}
          iconColor={theme.success}
          cardBgColor={applyOpacity(theme.success, '06')}
        />
      </View>

      <Spacer height={Spacing.xl} />

      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        {t('dashboard.quickActions')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      <View style={styles.quickActionsGrid}>
        <DirectionalRow style={styles.quickActionsRow}>
          <QuickActionButton
            icon="bar-chart-2"
            label={t('buffet.capacityOverview')}
            iconBgColor={applyOpacity(theme.info, '12')}
            iconColor={theme.info}
            onPress={() => navigation.navigate(ROUTES.BUFFET_OVERVIEW as never)}
          />
          <QuickActionButton
            icon="users"
            label={t('navigation.staffManagement')}
            iconBgColor={applyOpacity(theme.primary, '12')}
            iconColor={theme.primary}
            onPress={() => navigation.navigate(ROUTES.BUFFET_STAFF as never)}
          />
        </DirectionalRow>
        <DirectionalRow style={styles.quickActionsRow}>
          <QuickActionButton
            icon="map-pin"
            label={t('navigation.locations')}
            iconBgColor={applyOpacity(theme.success, '12')}
            iconColor={theme.success}
            onPress={() => navigation.navigate(ROUTES.BUFFET_LOCATIONS as never)}
          />
          <QuickActionButton
            icon="list"
            label={t('navigation.allRequests')}
            iconBgColor={applyOpacity(theme.warning, '12')}
            iconColor={theme.warning}
            onPress={() => navigation.navigate(ROUTES.BUFFET_ALL_REQUESTS as never)}
          />
        </DirectionalRow>
      </View>

      <Spacer height={Spacing.xl} />

      <DirectionalRow style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('buffet.buffetService')}
        </ThemedText>
        {requests.length > 3 ? (
          <Pressable 
            onPress={() => navigation.navigate(ROUTES.BUFFET_ALL_REQUESTS as never)}
            style={({ pressed }) => [
              styles.viewAllButton,
              { flexDirection: getFlexDirection(isRTL), opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <ThemedText style={[styles.viewAllText, { color: theme.primary }]}>
              {t('common.viewAll')}
            </ThemedText>
            <DDIcon name="chevron-right" size={16} variant="primary" directionAware />
          </Pressable>
        ) : null}
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      {requests.length > 0 ? (
        <View style={styles.requestsList}>
          {requests.slice(0, 5).map((request) => renderRequestCard(request))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="cloche" size={32} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {t('common.noData')}
          </ThemedText>
        </ThemedView>
      )}

      <Spacer height={Spacing.xl} />
      {renderStaffAssignModal()}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsGrid: {
    gap: Spacing.sm,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  requestsList: {
    gap: Spacing.md,
  },
  requestCard: {
    borderRadius: 12,
    borderStartWidth: 4,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    marginStart: Spacing.md,
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  hostName: {
    fontSize: 13,
    marginTop: 2,
  },
  nameWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    marginStart: 4,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  assignButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
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
  staffList: {
    maxHeight: 300,
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  staffInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  staffStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noStaffState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCancelButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
