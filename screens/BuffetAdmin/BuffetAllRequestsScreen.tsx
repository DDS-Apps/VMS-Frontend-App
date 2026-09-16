import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView, Modal, GestureResponderEvent, ActivityIndicator, Platform, RefreshControl, LayoutChangeEvent } from "react-native";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ScreenFlatList } from "@/components/ScreenFlatList";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { DashboardKpiSection, VisitorMatrixTable, type VisitorMatrixItem } from "@/components/shared";
import { useRefreshDashboardKpis } from "@/hooks/queries/useDashboardKpiQuery";
import { applyOpacity, getStatusConfig as getStatusStyle } from "@/utils/statusStyles";
import { BUFFET_GRID_PADDING_SIDE } from "@/utils/gridLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { useToast } from "@/contexts/ToastContext";
import {
  useBuffetAdminTasksQuery,
  useBuffetAdminStaffQuery,
  useUpdateBuffetAdminTaskStatusMutation,
  useAssignBuffetTaskMutation,
} from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminTaskDto, BuffetAdminStaffDto } from "@/types/api.types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BuffetAdminStackParamList } from "@/types/buffetAdminNavigation.types";
import type { Theme } from "@/types/theme.types";
import { formatDateForApi, formatDate } from "@/utils/dateTimeUtils";
import { useRetainedDatedData } from "@/hooks/useRetainedDatedData";
import { getInitials } from "@/utils/formatters";

type BuffetRequest = BuffetAdminTaskDto & {
  timeSlot: string;
  assignedStaff?: string;
  assignedStaffId?: string;
  mealType: string;
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

const toMatrixItem = (request: BuffetRequest): VisitorMatrixItem => ({
  id: request.id,
  visitorName: request.hostName,
  visitorSubtitle: request.hostDepartment,
  visitDate: request.visitDate,
  plannedInTime: request.timeSlot,
  status: request.status,
  location: request.location,
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

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.xxl,
  contentGap: Spacing.md,
  statCardRadius: BorderRadius.md,
  statusBorderWidth: 3,
  tableRowHeight: 110,
  tableFixedColumnWidth: 240,
  tableScrollColumnWidth: 200,
};

type BuffetAllRequestsScreenProps = NativeStackScreenProps<
  BuffetAdminStackParamList,
  "BuffetAllRequests"
>;

const StatusAccent = ({ color }: { color: string }) => (
  <View style={[styles.statusAccent, { backgroundColor: color }]} />
);

const VisitorAvatar = ({ name, theme, size = 44 }: { name: string; theme: Theme; size?: number }) => {
  const initials = getInitials(name);
  return (
    <View style={[
      styles.avatar, 
      { 
        backgroundColor: applyOpacity(theme.primary, '15'),
        width: size,
        height: size,
        borderRadius: LAYOUT.cardRadius - 2,
      }
    ]}>
      <ThemedText
        style={[styles.avatarText, { color: theme.primary, fontSize: size * 0.36 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {initials}
      </ThemedText>
    </View>
  );
};

const StatusBadge = ({ statusConfig, compact = false }: { statusConfig: { bg: string; border: string; text: string; label: string }; compact?: boolean }) => (
  <View style={[
    styles.statusBadge, 
    { 
      backgroundColor: statusConfig.bg, 
      borderColor: statusConfig.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
    }
  ]}>
    <ThemedText style={[styles.statusText, { color: statusConfig.text, fontSize: 9 }]}>
      {statusConfig.label}
    </ThemedText>
  </View>
);

const SectionHeader = ({ 
  viewMode, 
  onViewModeChange, 
  theme,
  t,
}: { 
  viewMode: 'card' | 'list';
  onViewModeChange: (mode: 'card' | 'list') => void;
  theme: Theme;
  t: (key: string) => string;
}) => {
  return (
    <DirectionalRow style={[styles.sectionTitleRow, styles.paddedContent]}>
      <ThemedText style={[Typography.subtitle]}>
        {t('navigation.buffetRequests')}
      </ThemedText>
      {Platform.OS === 'web' ? (
        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'card' ? theme.primary : theme.surface },
            ]}
            onPress={() => onViewModeChange('card')}
          >
            <DDIcon
              name="grid"
              size={18}
              color={viewMode === 'card' ? theme.buttonText : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'list' ? theme.primary : theme.surface },
            ]}
            onPress={() => onViewModeChange('list')}
          >
            <DDIcon
              name="list"
              size={18}
              color={viewMode === 'list' ? theme.buttonText : theme.textSecondary}
            />
          </Pressable>
        </View>
      ) : null}
    </DirectionalRow>
  );
};

const BuffetRequestCard = React.memo(({ 
  request, 
  isExpanded,
  onPress,
  onToggleExpand,
  onComplete,
  onAssignStaff,
  isCompleting,
  theme 
}: { 
  request: BuffetRequest; 
  isExpanded: boolean;
  onPress: () => void;
  onToggleExpand: () => void;
  onComplete: () => void;
  onAssignStaff: (e: GestureResponderEvent) => void;
  isCompleting?: boolean;
  theme: Theme;
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();  const statusConfig = getStatusStyle(theme, request.status, t);

  return (
    <ThemedView style={[styles.requestCard, { backgroundColor: theme.surface }]}>
      <StatusAccent color={statusConfig.borderColor} />

      <Pressable onPress={onPress} android_ripple={{ color: applyOpacity(theme.primary, '10') }}>
        <View style={styles.cardMainSection}>
          <DirectionalRow style={styles.cardHeaderRow}>
            <VisitorAvatar name={request.hostName ?? ''} theme={theme} />
            
            <View style={styles.cardNameSection}>
              <DirectionalRow style={styles.nameWithBadgeRow}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 16, flex: 1 }]} numberOfLines={1}>
                  {request.hostName}
                </ThemedText>
                <StatusBadge statusConfig={statusConfig} />
              </DirectionalRow>
              {request.hostDepartment ? (
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                  {request.hostDepartment}
                </ThemedText>
              ) : null}
            </View>
          </DirectionalRow>

          <Spacer height={LAYOUT.contentGap} />

          <DirectionalRow style={styles.detailsRow}>
            <DirectionalRow style={styles.detailItem}>
              <DDIcon name="map-pin" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {request.location}
              </ThemedText>
            </DirectionalRow>
            <ThemedText style={[styles.detailText, { color: theme.border, marginHorizontal: Spacing.xs }]}>•</ThemedText>
            <DirectionalRow style={styles.detailItem}>
              <DDIcon name="clock" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {request.timeSlot}
              </ThemedText>
            </DirectionalRow>
          </DirectionalRow>


        </View>
      </Pressable>

    </ThemedView>
  );
});

const EmptyState = ({ theme, t }: { theme: Theme; t: (key: string) => string }) => (
  <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
    <DDIcon name="inbox" size={48} variant="muted" />
    <Spacer height={Spacing.md} />
    <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
      {t('common.noData')}
    </ThemedText>
  </ThemedView>
);


export default function BuffetAllRequestsScreen({ navigation }: BuffetAllRequestsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();

  // Measure the card grid's actual rendered width (post-sidebar, post-padding) instead of
  // guessing from screen width, so the column count and card sizing always match the space
  // really available. Widths are percentages, not fixed pixel math, so they never fight
  // with the row's gap/padding — each card's own end-padding creates the gutter instead.
  const [gridWidth, setGridWidth] = useState(0);
  const handleGridLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setGridWidth((prev) => (Math.abs(prev - width) > 1 ? width : prev));
  };
  const numColumns = gridWidth >= 900 ? 3 : gridWidth >= 600 ? 2 : 1;
  const cardWidthPercent: `${number}%` | undefined =
    numColumns === 3 ? '33.33%' : numColumns === 2 ? '50%' : undefined;

  // Get card style based on numColumns
  const getCardStyle = useMemo(() => {
    if (!cardWidthPercent) {
      return { width: '100%' as const, marginBottom: Spacing.md };
    }
    return { width: cardWidthPercent, paddingEnd: Spacing.md, marginBottom: Spacing.md };
  }, [cardWidthPercent]);
  
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BuffetRequest | null>(null);
  const [assigningStaffId, setAssigningStaffId] = useState<string | null>(null);
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateParam = formatDateForApi(selectedDate);
  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    isError: isTasksError,
    refetch: refetchTasks,
  } = useBuffetAdminTasksQuery({ date: dateParam });
  const retainedTasks = useRetainedDatedData(dateParam, tasksData);
  const displayedTasksData = retainedTasks.data;
  
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };
  
  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };
  
  const [displayedYear, displayedMonth, displayedDay] = retainedTasks.dateKey.split('-').map(Number);
  const displayedDate = new Date(displayedYear, displayedMonth - 1, displayedDay);
  const now = new Date();
  const isToday = displayedDate.getFullYear() === now.getFullYear() &&
    displayedDate.getMonth() === now.getMonth() &&
    displayedDate.getDate() === now.getDate();
  
  const getDisplayDate = () => {
    if (isToday) {
      return t('common.today');
    }
    return formatDate(displayedDate, { isRTL });
  };
  const { data: staffData } = useBuffetAdminStaffQuery();
  const updateStatusMutation = useUpdateBuffetAdminTaskStatusMutation();
  const assignTaskMutation = useAssignBuffetTaskMutation();
  const refreshDashboardKpis = useRefreshDashboardKpis();
  const refreshDashboard = useCallback(async () => {
    await Promise.all([refetchTasks(), refreshDashboardKpis()]);
  }, [refetchTasks, refreshDashboardKpis]);

  const parseTimeSlot = (timeSlot: string): number => {
    const match = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Buffet admins should only see requests once the visit itself is confirmed —
  // pending/awaiting-response/rejected/cancelled visits aren't actionable for buffet service.
  const VISIBLE_STATUSES = ['visitor_accepted', 'checked_in', 'checked_out', 'completed'];

  const requests = useMemo(() => {
    const responseData = displayedTasksData?.data as { data?: BuffetAdminTaskDto[] } | BuffetAdminTaskDto[] | undefined;
    const tasks = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminTaskDto[] })?.data) ? (responseData as { data: BuffetAdminTaskDto[] }).data : []);
    const visibleTasks = tasks.filter(task => VISIBLE_STATUSES.includes(task.status));
    const mapped = visibleTasks.map(mapTaskToRequest);
    return [...mapped].sort((a, b) => {
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
      // Append Riyadh offset so sorting uses a consistent timezone, not device-local
      const dateA = new Date(`${a.visitDate}T${(a.timeSlot?.replace(/\s*(AM|PM)/i, '') || '00:00')}+03:00`).getTime();
      const dateB = new Date(`${b.visitDate}T${(b.timeSlot?.replace(/\s*(AM|PM)/i, '') || '00:00')}+03:00`).getTime();
      return dateB - dateA;
    });
  }, [displayedTasksData]);

  const availableStaff = useMemo(() => {
    const responseData = staffData?.data as { data?: BuffetAdminStaffDto[] } | BuffetAdminStaffDto[] | undefined;
    const staffList = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminStaffDto[] })?.data) ? (responseData as { data: BuffetAdminStaffDto[] }).data : []);
    return staffList
      .filter(s => s.dutyStatus === 'on_duty')
      .map(mapAdminStaffDto);
  }, [staffData]);

  const handleViewDetails = (request: BuffetRequest) => {
    navigation.navigate(ROUTES.BUFFET_REQUEST_DETAILS as any, { request: request as any } as any);
  };

  const handleOpenAssignModal = (request: BuffetRequest, event?: GestureResponderEvent) => {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    setSelectedRequest(request);
    setShowAssignModal(true);
  };

  const handleAssignStaff = (staff: BuffetStaff) => {
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

  const handleMarkComplete = (request: BuffetRequest, event?: GestureResponderEvent) => {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    setCompletingRequestId(request.id);
    updateStatusMutation.mutate(
      { id: request.id, data: { status: 'completed' } },
      {
        onSuccess: () => {
          refetchTasks();
          setCompletingRequestId(null);
          showSuccess(t('status.completed'), t('common.success'));
        },
        onError: (error: any) => {
          setCompletingRequestId(null);
          const errorMessage = error?.response?.data?.message || t('common.errorOccurred');
          showError(errorMessage, t('common.error'));
        },
      }
    );
  };

  if ((isLoadingTasks || isFetchingTasks) && !displayedTasksData) {
    return (
      <ThemedView style={{ flex: 1, padding: Spacing.lg }}>
        <SkeletonCard showImage={false} lines={3} />
        <SkeletonCard showImage={false} lines={3} />
        <SkeletonCard showImage={false} lines={3} />
      </ThemedView>
    );
  }

  if (isTasksError && !displayedTasksData) {
    return (
      <ThemedView style={styles.queryState}>
        <DDIcon name="alert-circle" size={40} color={theme.error} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.error, textAlign: 'center' }]}>
          {t('common.errorLoadingData')}
        </ThemedText>
        <Spacer height={Spacing.md} />
        <Pressable onPress={() => refetchTasks()} style={[styles.retryButton, { backgroundColor: theme.primary }]}>
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>{t('common.retry')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const warmQueryState = displayedTasksData && (isFetchingTasks || isTasksError || retainedTasks.isRetained) ? (
    <DirectionalRow style={[styles.inlineQueryState, { backgroundColor: applyOpacity(isTasksError && !isFetchingTasks ? theme.error : theme.primary, '10') }]}>
      {isTasksError && !isFetchingTasks ? (
        <DDIcon name="alert-circle" size={16} color={theme.error} />
      ) : (
        <ActivityIndicator size="small" color={theme.primary} />
      )}
      <ThemedText style={[Typography.caption, { color: isTasksError && !isFetchingTasks ? theme.error : theme.textSecondary, flex: 1 }]}>
        {t(isTasksError && !isFetchingTasks ? 'common.errorLoadingData' : 'common.loading')}
      </ThemedText>
      {isTasksError && !isFetchingTasks ? (
        <Pressable onPress={() => refetchTasks()} hitSlop={8}>
          <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>{t('common.retry')}</ThemedText>
        </Pressable>
      ) : null}
    </DirectionalRow>
  ) : null;

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
                {selectedRequest.hostName}
              </ThemedText>
              {selectedRequest.hostDepartment ? (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                  {selectedRequest.hostDepartment}
                </ThemedText>
              ) : null}
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
                  onPress={() => handleAssignStaff(staff)}
                  disabled={assignTaskMutation.isPending}
                >
                  {assigningStaffId === staff.id ? (
                    <View style={[styles.staffAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <LoadingSpinner size="small" color={theme.primary} inline />
                    </View>
                  ) : (
                    <View style={[styles.staffAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <ThemedText
                        style={[styles.staffAvatarText, { color: theme.primary }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                      >
                        {getInitials(staff.name)}
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

  if (viewMode === 'list') {
    return (
      <>
        <ScreenFlatList
          data={[]}
          keyExtractor={() => '_'}
          contentContainerStyle={{ paddingTop: Spacing.xl }}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {warmQueryState ? (
                <View style={styles.paddedContent}>
                  {warmQueryState}
                  <Spacer height={Spacing.md} />
                </View>
              ) : null}
              <DirectionalRow style={[styles.paddedContent, styles.dateNavRow]}>
                <Pressable
                  style={[styles.dateNavButton, { backgroundColor: theme.surfaceSecondary }]}
                  onPress={handlePrevDay}
                >
                  <DDIcon name={isRTL ? "chevron-right" : "chevron-left"} size={20} color={theme.text} />
                </Pressable>
                
                <Pressable
                  style={[styles.dateDisplay, { backgroundColor: theme.surfaceSecondary, flexDirection: getFlexDirection(isRTL) }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <DDIcon name="calendar" size={18} color={theme.primary} />
                  <ThemedText style={[Typography.body, { fontWeight: '600', marginStart: Spacing.sm }]}>
                    {getDisplayDate()}
                  </ThemedText>
                </Pressable>
                
                <Pressable
                  style={[styles.dateNavButton, { backgroundColor: theme.surfaceSecondary }]}
                  onPress={handleNextDay}
                >
                  <DDIcon name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={theme.text} />
                </Pressable>
              </DirectionalRow>

              <Spacer height={Spacing.lg} />

              <View style={styles.paddedContent}>
                <DashboardKpiSection />
              </View>

              <Spacer height={LAYOUT.sectionSpacing} />

              <SectionHeader 
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                theme={theme}
                t={t}
              />

              <Spacer height={Spacing.lg} />

              <View style={styles.paddedContent}>
                <VisitorMatrixTable
                  variant="matrix"
                  columns="simple"
                  nameColumnLabel={t('dashboard.requestedBy')}
                  visitors={requests.map(toMatrixItem)}
                  onPressRow={(id) => {
                    const request = requests.find((item) => item.id === id);
                    if (request) handleViewDetails(request);
                  }}
                  emptyMessage={t('common.noResults')}
                />
              </View>
            </>
          }
        />
        {renderStaffAssignModal()}
        <CalendarDatePicker
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date);
            setShowDatePicker(false);
          }}
          mode="single"
        />
      </>
    );
  }

  return (
    <>
      <ScreenScrollView
        refreshControl={
          <RefreshControl refreshing={isLoadingTasks} onRefresh={refreshDashboard} tintColor={theme.primary} />
        }
      >
        {warmQueryState ? (
          <View style={styles.paddedContent}>
            {warmQueryState}
            <Spacer height={Spacing.md} />
          </View>
        ) : null}
        <DirectionalRow style={[styles.paddedContent, styles.dateNavRow]}>
          <Pressable
            style={[styles.dateNavButton, { backgroundColor: theme.surfaceSecondary }]}
            onPress={handlePrevDay}
          >
            <DDIcon name={isRTL ? "chevron-right" : "chevron-left"} size={20} color={theme.text} />
          </Pressable>
          
          <Pressable
            style={[styles.dateDisplay, { backgroundColor: theme.surfaceSecondary, flexDirection: getFlexDirection(isRTL) }]}
            onPress={() => setShowDatePicker(true)}
          >
            <DDIcon name="calendar" size={18} color={theme.primary} />
            <ThemedText style={[Typography.body, { fontWeight: '600', marginStart: Spacing.sm }]}>
              {getDisplayDate()}
            </ThemedText>
          </Pressable>
          
          <Pressable
            style={[styles.dateNavButton, { backgroundColor: theme.surfaceSecondary }]}
            onPress={handleNextDay}
          >
            <DDIcon name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={theme.text} />
          </Pressable>
        </DirectionalRow>

        <Spacer height={Spacing.lg} />

        <View style={styles.paddedContent}>
          <DashboardKpiSection />
        </View>

        <Spacer height={LAYOUT.sectionSpacing} />

        <SectionHeader 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          theme={theme}
          t={t}
        />

        <Spacer height={Spacing.lg} />

        <View style={[styles.paddedContent, styles.cardGrid]} onLayout={handleGridLayout}>
          {requests.length > 0 ? (
            requests.map((request) => (
              <View 
                key={request.id}
                style={getCardStyle}
              >
                <BuffetRequestCard
                  request={request}
                  isExpanded={expandedCard === request.id}
                  onPress={() => handleViewDetails(request)}
                  onToggleExpand={() => setExpandedCard(expandedCard === request.id ? null : request.id)}
                  onComplete={() => handleMarkComplete(request)}
                  onAssignStaff={(e) => handleOpenAssignModal(request, e)}
                  isCompleting={completingRequestId === request.id}
                  theme={theme}
                />
              </View>
            ))
          ) : (
            <View style={{ width: '100%' }}>
              <EmptyState theme={theme} t={t} />
            </View>
          )}
        </View>

        <Spacer height={LAYOUT.sectionSpacing} />
      </ScreenScrollView>
      {renderStaffAssignModal()}
      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          setSelectedDate(date);
          setShowDatePicker(false);
        }}
        mode="single"
      />
    </>
  );
}

const styles = StyleSheet.create({
  queryState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  inlineQueryState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  paddedContent: {
    paddingHorizontal: BUFFET_GRID_PADDING_SIDE,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dateNavRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    flex: 1,
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: LAYOUT.contentGap,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: LAYOUT.statCardRadius,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  viewToggleButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusAccent: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.statusBorderWidth,
    borderTopStartRadius: LAYOUT.cardRadius,
    borderBottomStartRadius: LAYOUT.cardRadius,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  statusBadge: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dateTimeText: {
    fontSize: 13,
  },
  separator: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  emptyState: {
    padding: Spacing.xxl,
    borderRadius: LAYOUT.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  requestCard: {
    borderRadius: LAYOUT.cardRadius,
    padding: LAYOUT.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMainSection: {},
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardNameSection: {
    flex: 1,
    marginStart: LAYOUT.contentGap,
  },
  nameWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dividerLine: {
    height: 1,
    marginVertical: LAYOUT.contentGap,
  },
  expandedContentInside: {
    paddingBottom: Spacing.xs,
  },
  secondaryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: LAYOUT.contentGap,
    gap: 4,
  },
  moreDetailsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tableRow: {
    minHeight: LAYOUT.tableRowHeight,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  fixedColumn: {
    justifyContent: 'center',
    borderEndWidth: 1,
    borderEndColor: 'rgba(0,0,0,0.06)',
  },
  fixedColumnContent: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.md,
  },
  scrollableColumns: {
    flex: 1,
  },
  scrollableContent: {
    paddingEnd: Spacing.xl,
  },
  tableColumn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  columnValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  tableActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tableActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  tableActionText: {
    fontSize: 12,
    fontWeight: '600',
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
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxHeight: '80%',
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
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  cardLoadingButton: {
    paddingHorizontal: Spacing.md,
    height: 36,
  },
  tableLoadingButton: {
    paddingHorizontal: Spacing.sm,
    height: 32,
  },
});
