import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, Modal, GestureResponderEvent, ActivityIndicator } from "react-native";
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
import { applyOpacity, getStatusConfig as getStatusStyle } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { LoadingButton } from "@/components/shared/LoadingButton";
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

const mapAdminStaffDto = (staff: BuffetAdminStaffDto): BuffetStaff => {
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    shift: staff.status === 'on_duty' ? 'On Duty' : 'Off Duty',
    status: staff.status,
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
  tableFixedColumnWidth: 160,
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
  const initials = name.split(' ').map(n => n[0]).join('');
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
      <ThemedText style={[styles.avatarText, { color: theme.primary, fontSize: size * 0.36 }]}>
        {initials}
      </ThemedText>
    </View>
  );
};

const DateTimeDisplay = ({ date, time, theme, compact = false }: { date: string; time: string; theme: Theme; compact?: boolean }) => {
  return (
    <View style={styles.dateTimeRow}>
      <DDIcon name="calendar" size={compact ? 13 : 14} variant="muted" />
      <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: compact ? 12 : 13 }]}>
        {date}
      </ThemedText>
      <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
      <DDIcon name="clock" size={compact ? 13 : 14} variant="muted" />
      <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: compact ? 12 : 13 }]}>
        {time}
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
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    }
  ]}>
    <ThemedText style={[styles.statusText, { color: statusConfig.text, fontSize: compact ? 10 : 10 }]}>
      {statusConfig.label}
    </ThemedText>
  </View>
);

const StatsCards = ({ totalRequests, inProgress, completed, theme, t }: { totalRequests: number; inProgress: number; completed: number; theme: Theme; t: (key: string) => string }) => (
  <View style={styles.statsGrid}>
    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
        <DDIcon name="clipboard" size={24} variant="primary" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {totalRequests}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('dashboard.totalRequests')}
      </ThemedText>
    </ThemedView>

    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
        <DDIcon name="loader" size={24} variant="warning" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {inProgress}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('status.inProgress')}
      </ThemedText>
    </ThemedView>

    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.success, '20') }]}>
        <DDIcon name="check-circle" size={24} variant="success" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {completed}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('status.completed')}
      </ThemedText>
    </ThemedView>
  </View>
);

type StatusFilter = 'all' | 'pending' | 'preparing' | 'ready' | 'served' | 'completed';

const getFilterPillColors = (filterKey: StatusFilter, isActive: boolean, theme: Theme) => {
  if (!isActive) {
    return {
      bg: theme.surfaceSecondary,
      text: theme.textSecondary,
      countBg: applyOpacity(theme.textSecondary, '15'),
      countText: theme.textSecondary,
    };
  }
  
  switch (filterKey) {
    case 'pending':
      return {
        bg: applyOpacity(theme.primary, '15'),
        text: theme.primary,
        countBg: applyOpacity(theme.primary, '25'),
        countText: theme.primary,
      };
    case 'preparing':
      return {
        bg: applyOpacity(theme.warning, '15'),
        text: theme.warning,
        countBg: applyOpacity(theme.warning, '25'),
        countText: theme.warning,
      };
    case 'ready':
      return {
        bg: applyOpacity('#10B981', '15'),
        text: '#10B981',
        countBg: applyOpacity('#10B981', '25'),
        countText: '#10B981',
      };
    case 'served':
      return {
        bg: applyOpacity(theme.success, '15'),
        text: theme.success,
        countBg: applyOpacity(theme.success, '25'),
        countText: theme.success,
      };
    case 'completed':
      return {
        bg: applyOpacity(theme.success, '15'),
        text: theme.success,
        countBg: applyOpacity(theme.success, '25'),
        countText: theme.success,
      };
    default:
      return {
        bg: applyOpacity(theme.primary, '15'),
        text: theme.primary,
        countBg: applyOpacity(theme.primary, '25'),
        countText: theme.primary,
      };
  }
};

const SectionHeader = ({ 
  filterStatus, 
  onFilterChange, 
  viewMode, 
  onViewModeChange, 
  statusCounts,
  theme,
  t
}: { 
  filterStatus: string; 
  onFilterChange: (status: string) => void;
  viewMode: 'card' | 'list';
  onViewModeChange: (mode: 'card' | 'list') => void;
  statusCounts: Record<StatusFilter, number>;
  theme: Theme;
  t: (key: string) => string;
}) => {
  const filterOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'pending', label: t('status.pending') },
    { key: 'preparing', label: t('buffet.preparing') },
    { key: 'ready', label: t('buffet.ready') },
    { key: 'served', label: t('buffet.served') },
    { key: 'completed', label: t('status.completed') },
  ];

  return (
    <>
      <View style={[styles.sectionTitleRow, styles.paddedContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ThemedText style={[Typography.subtitle]}>
          {t('navigation.buffetRequests')}
        </ThemedText>
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
      </View>

      <Spacer height={Spacing.md} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        nestedScrollEnabled={true}
      >
        {filterOptions.map((option) => {
          const isActive = filterStatus === option.key;
          const count = statusCounts[option.key];
          const colors = getFilterPillColors(option.key, isActive, theme);
          
          return (
            <Pressable
              key={option.key}
              style={[
                styles.filterPill,
                { backgroundColor: colors.bg }
              ]}
              onPress={() => onFilterChange(option.key)}
            >
              <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                {option.label}
              </ThemedText>
              <View style={[styles.filterCount, { backgroundColor: colors.countBg }]}>
                <ThemedText style={[styles.filterCountText, { color: colors.countText }]}>
                  {count}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
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
  const statusConfig = getStatusStyle(theme, request.status, t);

  return (
    <ThemedView style={[styles.requestCard, { backgroundColor: theme.surface }]}>
      <StatusAccent color={statusConfig.borderColor} />

      <Pressable onPress={onPress} android_ripple={{ color: applyOpacity(theme.primary, '10') }}>
        <View style={styles.cardMainSection}>
          <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <VisitorAvatar name={request.visitorName} theme={theme} />
            
            <View style={styles.cardNameSection}>
              <View style={[styles.nameWithBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 16, flex: 1 }]} numberOfLines={1}>
                  {request.visitorName}
                </ThemedText>
                <StatusBadge statusConfig={statusConfig} />
              </View>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
                {t('reception.hostName')}: {request.hostName}
              </ThemedText>
            </View>
          </View>

          <Spacer height={LAYOUT.contentGap} />

          <View style={[styles.detailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="map-pin" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {request.location}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.sm} />

          <DateTimeDisplay date={request.visitDate} time={request.timeSlot} theme={theme} />

          {request.assignedStaff ? (
            <>
              <Spacer height={Spacing.sm} />
              <View style={[styles.detailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="user-check" size={14} variant="success" />
                  <ThemedText style={[styles.detailText, { color: theme.success }]}>
                    {request.assignedStaff}
                  </ThemedText>
                </View>
              </View>
            </>
          ) : null}

          {request.status !== 'completed' && request.status !== 'cancelled' ? (
            <>
              <Spacer height={LAYOUT.contentGap} />
              <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: applyOpacity(theme.warning, '12') }]}
                  onPress={(e) => onAssignStaff(e)}
                >
                  <DDIcon name="user-plus" size={14} color={theme.warning} />
                  <ThemedText style={[styles.actionButtonText, { color: theme.warning }]}>
                    {request.assignedStaff ? t('buffet.reassign') : t('actions.assign')}
                  </ThemedText>
                </Pressable>
                {request.assignedStaffId ? (
                  <LoadingButton
                    variant="success"
                    size="small"
                    icon="check"
                    loading={isCompleting}
                    onPress={onComplete}
                    fullWidth={false}
                    style={styles.cardLoadingButton}
                  >
                    {t('actions.markAsComplete')}
                  </LoadingButton>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </Pressable>

      {isExpanded && (
        <>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <View style={styles.expandedContentInside}>
            <View style={styles.secondaryDetail}>
              <DDIcon name="users" size={14} variant="muted" />
              <ThemedText style={[Typography.caption, { marginStart: 6, color: theme.textSecondary, fontSize: 12 }]}>
                {t('buffet.guestCount')}: {request.guestCount}
              </ThemedText>
            </View>
            {request.notes ? (
              <>
                <Spacer height={Spacing.sm} />
                <View style={styles.secondaryDetail}>
                  <DDIcon name="file-text" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { marginStart: 6, color: theme.textSecondary, flex: 1, fontSize: 12 }]}>
                    {t('form.notes')}: {request.notes}
                  </ThemedText>
                </View>
              </>
            ) : null}
          </View>
        </>
      )}

      <Pressable
        style={styles.moreDetailsButton}
        onPress={onToggleExpand}
      >
        <ThemedText style={[styles.moreDetailsText, { color: theme.primary }]}>
          {isExpanded ? t('common.lessDetails') : t('common.moreDetails')}
        </ThemedText>
        <DDIcon 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={16} 
          variant="primary" 
        />
      </Pressable>
    </ThemedView>
  );
});

const BuffetRequestTableRow = React.memo(({ 
  request, 
  onPress,
  onComplete,
  onAssignStaff,
  isCompleting,
  theme 
}: { 
  request: BuffetRequest; 
  onPress: () => void;
  onComplete: () => void;
  onAssignStaff: (e: GestureResponderEvent) => void;
  isCompleting?: boolean;
  theme: Theme;
}) => {
  const { t } = useTranslation();
  const statusConfig = getStatusStyle(theme, request.status, t);

  return (
    <Pressable onPress={onPress}>
      <ThemedView style={[styles.tableRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <StatusAccent color={statusConfig.borderColor} />
        
        <View style={[styles.fixedColumn, { width: LAYOUT.tableFixedColumnWidth }]}>
          <View style={styles.fixedColumnContent}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]} numberOfLines={2}>
                {request.visitorName}
              </ThemedText>
              <Spacer height={4} />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
                {t('reception.hostName')}: {request.hostName}
              </ThemedText>
              <Spacer height={6} />
              <DateTimeDisplay 
                date={request.visitDate} 
                time={request.timeSlot} 
                theme={theme} 
                compact 
              />
            </View>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.scrollableColumns}
          contentContainerStyle={styles.scrollableContent}
          persistentScrollbar={true}
          nestedScrollEnabled={true}
        >
          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('invitation.location').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ThemedText style={[styles.columnValue, { fontSize: 14 }]} numberOfLines={2}>
              {request.location}
            </ThemedText>
          </View>

          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('buffet.assignedTo').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            {request.assignedStaff ? (
              <ThemedText style={[styles.columnValue, { fontSize: 14, color: theme.success }]} numberOfLines={1}>
                {request.assignedStaff}
              </ThemedText>
            ) : (
              <ThemedText style={[styles.columnValue, { fontSize: 14, color: theme.textSecondary }]}>
                {t('buffet.unassigned')}
              </ThemedText>
            )}
          </View>

          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('common.status').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <StatusBadge statusConfig={statusConfig} compact />
          </View>

          {request.status !== 'completed' && request.status !== 'cancelled' ? (
            <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth * 1.2 }]}>
              <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
                {t('dashboard.quickActions').toUpperCase()}
              </ThemedText>
              <Spacer height={10} />
              <View style={[styles.tableActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Pressable
                  style={[styles.tableActionButton, { backgroundColor: applyOpacity(theme.warning, '12') }]}
                  onPress={onAssignStaff}
                >
                  <DDIcon name="user-plus" size={14} color={theme.warning} />
                  <ThemedText style={[styles.tableActionText, { color: theme.warning }]}>
                    {request.assignedStaff ? t('buffet.reassign') : t('actions.assign')}
                  </ThemedText>
                </Pressable>
                {request.assignedStaffId ? (
                  <LoadingButton
                    variant="success"
                    size="small"
                    icon="check"
                    loading={isCompleting}
                    onPress={onComplete}
                    fullWidth={false}
                    style={styles.tableLoadingButton}
                  >
                    {t('status.completed')}
                  </LoadingButton>
                ) : null}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </ThemedView>
    </Pressable>
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

function getStatusColor(status: string, theme: Theme) {
  switch (status) {
    case 'pending':
      return theme.primary;
    case 'in_progress':
      return theme.warning;
    case 'completed':
      return theme.success;
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
    case 'in_progress':
      return t('status.inProgress');
    case 'completed':
      return t('status.completed');
    case 'cancelled':
      return t('status.cancelled');
    default:
      return status;
  }
}

export default function BuffetAllRequestsScreen({ navigation }: BuffetAllRequestsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BuffetRequest | null>(null);
  const [assigningStaffId, setAssigningStaffId] = useState<string | null>(null);
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);

  const { data: tasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useBuffetAdminTasksQuery();
  const { data: staffData } = useBuffetAdminStaffQuery();
  const updateStatusMutation = useUpdateBuffetAdminTaskStatusMutation();
  const assignTaskMutation = useAssignBuffetTaskMutation();

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

  const requests = useMemo(() => {
    const responseData = tasksData?.data as { data?: BuffetAdminTaskDto[] } | BuffetAdminTaskDto[] | undefined;
    const tasks = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminTaskDto[] })?.data) ? (responseData as { data: BuffetAdminTaskDto[] }).data : []);
    const mapped = tasks.map(mapTaskToRequest);
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
      const dateA = new Date(a.visitDate + 'T' + (a.timeSlot?.replace(/\s*(AM|PM)/i, '') || '00:00')).getTime();
      const dateB = new Date(b.visitDate + 'T' + (b.timeSlot?.replace(/\s*(AM|PM)/i, '') || '00:00')).getTime();
      return dateB - dateA;
    });
  }, [tasksData]);

  const availableStaff = useMemo(() => {
    const responseData = staffData?.data as { data?: BuffetAdminStaffDto[] } | BuffetAdminStaffDto[] | undefined;
    const staffList = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminStaffDto[] })?.data) ? (responseData as { data: BuffetAdminStaffDto[] }).data : []);
    return staffList.map(mapAdminStaffDto);
  }, [staffData]);

  const handleViewDetails = (request: BuffetRequest) => {
    navigation.navigate('BuffetRequestDetails', { request: request as any });
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

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  const totalRequests = requests.length;
  const activeCount = requests.filter(r => ['pending', 'preparing', 'ready', 'served'].includes(r.status)).length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  const statusCounts: Record<StatusFilter, number> = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    preparing: requests.filter(r => r.status === 'preparing').length,
    ready: requests.filter(r => r.status === 'ready').length,
    served: requests.filter(r => r.status === 'served').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  if (isLoadingTasks) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

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
                  onPress={() => handleAssignStaff(staff)}
                  disabled={assignTaskMutation.isPending}
                >
                  {assigningStaffId === staff.id ? (
                    <View style={[styles.staffAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <LoadingSpinner size="small" color={theme.primary} inline />
                    </View>
                  ) : (
                    <View style={[styles.staffAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                      <ThemedText style={[styles.staffAvatarText, { color: theme.primary }]}>
                        {staff.name.split(' ').map(n => n[0]).join('')}
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
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BuffetRequestTableRow 
              request={item} 
              onPress={() => handleViewDetails(item)}
              onComplete={() => handleMarkComplete(item)}
              onAssignStaff={(e) => handleOpenAssignModal(item, e)}
              isCompleting={completingRequestId === item.id}
              theme={theme}
            />
          )}
          ListHeaderComponent={
            <>
              <View style={styles.paddedContent}>
                <StatsCards 
                  totalRequests={totalRequests} 
                  inProgress={activeCount} 
                  completed={completedCount} 
                  theme={theme}
                  t={t}
                />
              </View>

              <Spacer height={LAYOUT.sectionSpacing} />

              <SectionHeader 
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                statusCounts={statusCounts}
                theme={theme}
                t={t}
              />

              <Spacer height={Spacing.lg} />
            </>
          }
          ListEmptyComponent={<View style={styles.paddedContent}><EmptyState theme={theme} t={t} /></View>}
          ItemSeparatorComponent={() => <Spacer height={Spacing.md} />}
        />
        {renderStaffAssignModal()}
      </>
    );
  }

  return (
    <>
      <ScreenScrollView>
        <Spacer height={Spacing.xl} />

        <View style={styles.paddedContent}>
          <StatsCards 
            totalRequests={totalRequests} 
            inProgress={activeCount} 
            completed={completedCount} 
            theme={theme}
            t={t}
          />
        </View>

        <Spacer height={LAYOUT.sectionSpacing} />

        <SectionHeader 
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          statusCounts={statusCounts}
          theme={theme}
          t={t}
        />

        <Spacer height={Spacing.lg} />

        <View style={styles.paddedContent}>
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <View key={request.id}>
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
                <Spacer height={LAYOUT.contentGap} />
              </View>
            ))
          ) : (
            <EmptyState theme={theme} t={t} />
          )}
        </View>

        <Spacer height={LAYOUT.sectionSpacing} />
      </ScreenScrollView>
      {renderStaffAssignModal()}
    </>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: Spacing.xl,
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
  filtersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingEnd: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  filterCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 22,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
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
