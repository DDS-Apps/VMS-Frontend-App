import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, ScrollView, Modal, FlatList, Alert } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { ROUTES } from "@/constants";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { DDIcon } from "@/components/DDIcon";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ServiceIcons, SelectionCheckbox, StatusAccent, WalkInBadge, SkeletonDashboard, LoadingSpinner, ApprovalActionGroup, LoadingButton, VisitorRequestCard } from "@/components/shared";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  useInfinitePendingApprovalsQuery,
  useApproveVisitMutation,
  useRejectVisitMutation,
  useBulkApproveRequestsMutation,
  useBulkRejectRequestsMutation,
} from "@/hooks/queries/useApprovalQueries";
import { ListLoadingFooter } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
import { VisitorRequest } from "@/types/vms.types";
import type { PendingApprovalDto } from "@/types/api.types";
import { applyOpacity } from "@/utils/statusStyles";
import type { ManagerDashboardScreenProps } from "@/types/managerNavigation.types";
import type { Theme } from "@/types/theme.types";
import { mapPendingApprovalToVisitorRequest } from "@/utils/requestMappers";
import { isVisitExpired } from "@/utils/dateTimeUtils";

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.xxl,
  contentGap: Spacing.md,
  statusBorderWidth: 3,
  tableRowHeight: 110,
  tableFixedColumnWidth: 160,
  tableScrollColumnWidth: 240,
};


const DateTimeDisplay = ({ date, time, duration, theme, compact = false, fmtDate, fmtTime, isRTL = false }: { date: string; time: string; duration?: string; theme: Theme; compact?: boolean; fmtDate: (d: Date | string) => string; fmtTime: (t: string) => string; isRTL?: boolean }) => {  const calendarIcon = <DDIcon name="calendar" size={compact ? 13 : 14} variant="muted" />;
  const dateText = (
    <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: compact ? 12 : 13 }]}>
      {fmtDate(date)}
    </ThemedText>
  );
  const clockIcon = <DDIcon name="clock" size={compact ? 13 : 14} variant="muted" />;
  const timeText = (
    <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: compact ? 12 : 13 }]}>
      {fmtTime(time)}
    </ThemedText>
  );
  const durationText = duration ? (
    <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: compact ? 12 : 13 }]}>
      {duration}
    </ThemedText>
  ) : null;
  
  return (
    <View style={[styles.dateTimeRow, { flexDirection: 'row' }]}>
      {calendarIcon}
      {dateText}
      <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
      {clockIcon}
      {timeText}
      {duration ? (
        <>
          <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
          {durationText}
        </>
      ) : null}
    </View>
  );
};

const SectionHeader = ({ 
  viewMode, 
  onViewModeChange,
  isSelectionMode,
  onToggleSelectionMode,
  theme,
  t,
  isRTL = false
}: { 
  viewMode: 'card' | 'list'; 
  onViewModeChange: (mode: 'card' | 'list') => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  theme: Theme;
  t: (key: string) => string;
  isRTL?: boolean;
}) => {  
  const titleContent = (
    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
      <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
        {t('navigation.pendingApprovals')}
      </ThemedText>
      <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 12, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('dashboard.requestsAwaitingApproval')}
      </ThemedText>
    </View>
  );
  
  const selectButton = (
    <Pressable
      onPress={onToggleSelectionMode}
      style={[
        styles.selectButton,
        { 
          backgroundColor: isSelectionMode ? theme.primary : theme.surfaceSecondary,
          borderColor: isSelectionMode ? theme.primary : theme.border,
        }
      ]}
    >
      <ThemedText 
        style={[
          styles.selectButtonText, 
          { color: isSelectionMode ? theme.buttonText : theme.text }
        ]}
      >
        {isSelectionMode ? t('bulkActions.cancelSelection') : t('bulkActions.selectMode')}
      </ThemedText>
    </Pressable>
  );
  
  const gridButton = (
    <Pressable
      onPress={() => onViewModeChange('card')}
      style={[
        styles.toggleButton,
        { backgroundColor: viewMode === 'card' ? theme.primary : 'transparent' }
      ]}
    >
      <DDIcon 
        name="grid" 
        size={18} 
        color={viewMode === 'card' ? theme.buttonText : theme.textSecondary} 
      />
    </Pressable>
  );
  
  const listButton = (
    <Pressable
      onPress={() => onViewModeChange('list')}
      style={[
        styles.toggleButton,
        { backgroundColor: viewMode === 'list' ? theme.primary : 'transparent' }
      ]}
    >
      <DDIcon 
        name="list" 
        size={18} 
        color={viewMode === 'list' ? theme.buttonText : theme.textSecondary} 
      />
    </Pressable>
  );
  
  const actionsContent = (
    <View style={[styles.headerActions, { flexDirection: 'row' }]}>
      {selectButton}
      <Spacer width={Spacing.sm} />
      <View style={[styles.viewModeToggle, { flexDirection: 'row' }]}>
        {gridButton}
        {listButton}
      </View>
    </View>
  );
  
  return (
    <View style={[styles.header, { flexDirection: 'row' }]}>
      {titleContent}
      {actionsContent}
    </View>
  );
};

const SelectAllBar = ({
  allSelected,
  onToggleAll,
  theme,
  t,
  isRTL = false
}: {
  allSelected: boolean;
  onToggleAll: () => void;
  theme: Theme;
  t: (key: string) => string;
  isRTL?: boolean;
}) => {
  return (
    <View style={[styles.selectAllBar, { backgroundColor: theme.surfaceSecondary, flexDirection: 'row' }]}>
      <Pressable onPress={onToggleAll} style={[styles.selectAllButton, { flexDirection: 'row' }]}>
        <SelectionCheckbox isSelected={allSelected} onToggle={onToggleAll} />
        <Spacer width={Spacing.sm} />
        <ThemedText style={[Typography.body, { color: theme.text }]}>
          {allSelected ? t('bulkActions.deselectAll') : t('bulkActions.selectAll')}
        </ThemedText>
      </Pressable>
    </View>
  );
};

const BulkActionBar = ({
  selectedCount,
  onApprove,
  onReject,
  theme,
  t,
  bottomInset,
  isProcessing = false,
  processingAction,
  isRTL = false
}: {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  theme: Theme;
  t: (key: string) => string;
  bottomInset: number;
  isProcessing?: boolean;
  processingAction?: 'approve' | 'reject' | null;
  isRTL?: boolean;
}) => {  
  return (
    <View 
      style={[
        styles.bulkActionBar,
        { 
          bottom: bottomInset + Spacing.md,
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }
      ]}
    >
      <View style={[styles.bulkActionContent, { flexDirection: 'row' }]}>
        <ThemedText style={[Typography.body, { fontWeight: '600', color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
          {isProcessing ? t('common.processing') : `${selectedCount} ${t('bulkActions.selected')}`}
        </ThemedText>
        <View style={[styles.bulkActionButtons, { flexDirection: 'row' }]}>
          <Pressable
            style={[styles.bulkRejectButton, { borderColor: theme.error, opacity: isProcessing ? 0.6 : 1, flexDirection: 'row' }]}
            onPress={onReject}
            disabled={isProcessing}
          >
            {isProcessing && processingAction === 'reject' ? (
              <LoadingSpinner size="small" color={theme.error} inline />
            ) : (
              <DDIcon name="x" size={16} color={theme.error} />
            )}
            <Spacer width={6} />
            <ThemedText style={[styles.bulkButtonText, { color: theme.error }]}>
              {t('actions.reject')}
            </ThemedText>
          </Pressable>
          <Spacer width={Spacing.sm} />
          <Pressable
            style={[styles.bulkApproveButton, { backgroundColor: theme.success, opacity: isProcessing ? 0.6 : 1, flexDirection: 'row' }]}
            onPress={onApprove}
            disabled={isProcessing}
          >
            {isProcessing && processingAction === 'approve' ? (
              <LoadingSpinner size="small" color={theme.buttonText} inline />
            ) : (
              <DDIcon name="check" size={16} color={theme.buttonText} />
            )}
            <Spacer width={6} />
            <ThemedText style={[styles.bulkButtonText, { color: theme.buttonText }]}>
              {t('actions.approve')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const ApprovalTableRow = React.memo(({ 
  request, 
  onApprove,
  onReject,
  onViewDetails,
  onLongPress,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  theme,
  isProcessing,
  isExpired = false,
  t,
  fmtDate,
  fmtTime,
  isRTL = false
}: { 
  request: VisitorRequest; 
  onApprove: () => void;
  onReject: () => void;
  onViewDetails: () => void;
  onLongPress: () => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  theme: Theme;
  isProcessing: boolean;
  isExpired?: boolean;
  t: (key: string) => string;
  fmtDate: (d: Date | string) => string;
  fmtTime: (t: string) => string;
  isRTL?: boolean;
}) => {  
  const nameText = (
    <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, flex: 1, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
      {request.visitor.fullName}
    </ThemedText>
  );
  const walkInBadge = request.isWalkIn ? <WalkInBadge /> : null;
  
  const rejectBtn = (
    <Pressable
      style={[styles.actionButton, styles.rejectActionButton, { borderColor: theme.error, opacity: isProcessing || isExpired ? 0.5 : 1 }]}
      onPress={onReject}
      disabled={isProcessing || isExpired}
    >
      <DDIcon name="x" size={16} color={theme.error} />
    </Pressable>
  );
  const approveBtn = (
    <Pressable
      style={[styles.actionButton, styles.approveActionButton, { backgroundColor: theme.success, opacity: isProcessing || isExpired ? 0.5 : 1 }]}
      onPress={onApprove}
      disabled={isProcessing || isExpired}
    >
      <DDIcon name="check" size={16} color={theme.buttonText} />
    </Pressable>
  );
  const detailsBtn = (
    <Pressable
      style={[styles.actionButton, styles.detailsActionButton, { borderColor: theme.border }]}
      onPress={onViewDetails}
    >
      <DDIcon name="eye" size={16} variant="muted" />
    </Pressable>
  );
  
  const statusAccent = <StatusAccent color={theme.primary} />;
  const checkboxColumn = isSelectionMode ? (
    <View style={styles.tableCheckboxColumn}>
      <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelection} />
    </View>
  ) : null;
  
  const fixedColumnContent = (
    <View style={[styles.fixedColumn, { width: isSelectionMode ? LAYOUT.tableFixedColumnWidth - 40 : LAYOUT.tableFixedColumnWidth }]}>
      <View style={styles.fixedColumnContent}>
        <View style={{ flex: 1 }}>
          <View style={[styles.nameWithBadge, { flexDirection: 'row' }]}>
            {nameText}
            {walkInBadge}
          </View>
          <Spacer height={6} />
          <DateTimeDisplay 
            date={request.visitDate} 
            time={request.visitTime} 
            theme={theme} 
            compact 
            fmtDate={fmtDate}
            fmtTime={fmtTime}
            isRTL={isRTL}
          />
        </View>
      </View>
    </View>
  );
  
  const scrollableContent = (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={true}
      style={styles.scrollableColumns}
      contentContainerStyle={styles.scrollableColumnsContent}
      persistentScrollbar={true}
      nestedScrollEnabled={true}
    >
      <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
        <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
          {t('form.company').toUpperCase()}
        </ThemedText>
        <Spacer height={10} />
        <ThemedText style={[styles.columnValue, { fontSize: 15 }]} numberOfLines={2}>
          {request.visitor.company || '-'}
        </ThemedText>
      </View>

      <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
        <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
          {t('dashboard.requestedBy').toUpperCase()}
        </ThemedText>
        <Spacer height={10} />
        <ThemedText style={[styles.columnValue, { fontSize: 15 }]} numberOfLines={2}>
          {request.employeeName}
        </ThemedText>
      </View>

      <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
        <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
          {t('form.purpose').toUpperCase()}
        </ThemedText>
        <Spacer height={10} />
        <ThemedText style={[styles.columnValue, { fontSize: 15 }]} numberOfLines={3}>
          {request.purpose}
        </ThemedText>
      </View>

      <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
        <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
          {t('services.additionalServices').toUpperCase()}
        </ThemedText>
        <Spacer height={10} />
        <ServiceIcons parkingSlot={request.parkingSlot} meetingRoom={request.meetingRoom} buffet={request.buffet} valet={request.valet} size={16} />
      </View>

      {!isSelectionMode ? (
        <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
          <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
            {t('common.actions').toUpperCase()}
          </ThemedText>
          <Spacer height={10} />
          <View style={[styles.actionsRow, { flexDirection: 'row' }]}>
            {rejectBtn}
            <Spacer width={Spacing.sm} />
            {approveBtn}
            <Spacer width={Spacing.sm} />
            {detailsBtn}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
  
  return (
    <Pressable onLongPress={onLongPress}>
      <ThemedView style={[styles.tableRow, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: 'row' }]}>
        {statusAccent}
        {checkboxColumn}
        {fixedColumnContent}
        {scrollableContent}
      </ThemedView>
    </Pressable>
  );
});


const RejectRequestModal = ({
  visible,
  onClose,
  onSubmit,
  theme,
  isDark,
  isProcessing,
  isBulk,
  t,
  insets,
  isRTL
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  theme: Theme;
  isDark: boolean;
  isProcessing: boolean;
  isBulk?: boolean;
  t: (key: string) => string;
  insets: { bottom: number };
  isRTL: boolean;
}) => {
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSubmit = () => {
    onSubmit(rejectionReason);
    setRejectionReason('');
  };

  const handleCancel = () => {
    if (isProcessing) return;
    setRejectionReason('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={!isProcessing ? handleCancel : undefined}
      >
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <Pressable 
          style={[
            styles.rejectModalContainer,
            { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              marginHorizontal: Spacing.lg,
              marginBottom: insets.bottom,
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedView style={styles.rejectModalContent}>
            <Pressable 
              onPress={handleCancel}
              style={styles.rejectModalCloseButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isProcessing}
            >
              <DDIcon name="x" size={20} variant="muted" />
            </Pressable>

            <View style={styles.rejectModalIconContainer}>
              <View style={[styles.rejectModalIcon, { backgroundColor: applyOpacity(theme.warning, '15') }]}>
                <DDIcon name="alert-triangle" size={28} color={theme.warning} />
              </View>
            </View>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.h3, { textAlign: 'center' }]}>
              {isBulk ? t('bulkActions.rejectSelected') : t('actions.reject')}
            </ThemedText>

            <Spacer height={Spacing.sm} />

            <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
              {t('form.enterNotes')} ({t('form.optional').toLowerCase()})
            </ThemedText>

            <Spacer height={Spacing.xl} />

            <TextInput
              style={[
                styles.reasonInput,
                { 
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  color: theme.text
                }
              ]}
              placeholder={t('form.enterNotes')}
              placeholderTextColor={theme.textSecondary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isProcessing}
            />

            <Spacer height={Spacing.xl} />

            <View style={[styles.rejectModalActions, { flexDirection: 'row' }]}>
              <LoadingButton
                onPress={handleCancel}
                variant="outline"
                size="medium"
                fullWidth={false}
                disabled={isProcessing}
                style={{ flex: 1, marginEnd: Spacing.sm }}
              >
                {t('common.cancel')}
              </LoadingButton>
              <LoadingButton
                onPress={handleSubmit}
                variant="primary"
                size="medium"
                fullWidth={false}
                loading={isProcessing}
                disabled={isProcessing}
                style={{ flex: 1, backgroundColor: theme.warning }}
              >
                {t('common.confirm')}
              </LoadingButton>
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function ManagerDashboardScreen({ navigation }: ManagerDashboardScreenProps) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { formatDate, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isBulkReject, setIsBulkReject] = useState(false);

  const { 
    data: pendingApprovalsData, 
    isLoading: isLoadingPending, 
    isFetching: isFetchingPending,
    error: pendingError, 
    refetch: refetchPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePendingApprovalsQuery();

  // Refetch data when screen gains focus to show latest status
  useFocusEffect(
    useCallback(() => {
      refetchPending();
    }, [refetchPending])
  );
  
  const approveMutation = useApproveVisitMutation();
  const rejectMutation = useRejectVisitMutation();
  const bulkApproveMutation = useBulkApproveRequestsMutation();
  const bulkRejectMutation = useBulkRejectRequestsMutation();

  const isProcessing = approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending || bulkRejectMutation.isPending;
  const isBulkProcessing = bulkApproveMutation.isPending || bulkRejectMutation.isPending;
  const bulkProcessingAction: 'approve' | 'reject' | null = bulkApproveMutation.isPending ? 'approve' : bulkRejectMutation.isPending ? 'reject' : null;
  const isLoading = isLoadingPending;
  const isFetching = isFetchingPending;

  const pendingApprovals = useMemo(() => {
    if (!pendingApprovalsData?.pages) return [];
    return pendingApprovalsData.pages.flatMap(page => page.data.map(mapPendingApprovalToVisitorRequest));
  }, [pendingApprovalsData?.pages]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredRequests = pendingApprovals.filter(request =>
    request.visitor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (request.visitor.company && request.visitor.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allSelected = filteredRequests.length > 0 && filteredRequests.every(r => selectedIds.has(r.id));

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedIds(new Set());
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.id)));
    }
  };

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
    }
  };

  const handleApprove = (requestId: string) => {
    if (isProcessing) return;
    approveMutation.mutate(
      { id: requestId, payload: {} },
      {
        onError: (error) => {
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  };

  const handleReject = (requestId: string) => {
    if (isProcessing) return;
    setActiveRequestId(requestId);
    setIsBulkReject(false);
    setShowRejectModal(true);
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0 || isBulkProcessing) return;
    
    bulkApproveMutation.mutate(
      { ids: Array.from(selectedIds) },
      {
        onSuccess: () => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
        },
        onError: (error) => {
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0 || isBulkProcessing) return;
    setIsBulkReject(true);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = (reason: string) => {
    const rejectReason = reason.trim() || 'No reason provided';
    
    if (isBulkReject) {
      bulkRejectMutation.mutate(
        { ids: Array.from(selectedIds), reason: rejectReason },
        {
          onSuccess: () => {
            setIsSelectionMode(false);
            setSelectedIds(new Set());
            setShowRejectModal(false);
            setIsBulkReject(false);
          },
          onError: (error) => {
            Alert.alert(t('errors.somethingWentWrong'), error.message);
          },
        }
      );
    } else if (activeRequestId) {
      rejectMutation.mutate(
        { id: activeRequestId, payload: { reason: rejectReason } },
        {
          onSuccess: () => {
            setShowRejectModal(false);
            setActiveRequestId(null);
          },
          onError: (error) => {
            Alert.alert(t('errors.somethingWentWrong'), error.message);
          },
        }
      );
    }
  };

  const handleViewDetails = (requestId: string) => {
    navigation.navigate(ROUTES.MANAGER_APPROVAL_DETAIL as never, { requestId } as never);
  };

  const renderStickyHeader = () => (
    <View style={[styles.stickyHeader, { backgroundColor: theme.backgroundRoot }]}>
      <SectionHeader 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={toggleSelectionMode}
        theme={theme}
        t={t}
        isRTL={isRTL}
      />

      <Spacer height={Spacing.lg} />

      <View style={[styles.searchBar, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
        <DDIcon name="search" size={20} variant="muted" />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t('common.search')}
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <DDIcon name="x-circle" size={18} variant="muted" />
          </Pressable>
        ) : null}
      </View>

      {isSelectionMode && filteredRequests.length > 0 ? (
        <>
          <Spacer height={Spacing.md} />
          <SelectAllBar
            allSelected={allSelected}
            onToggleAll={toggleSelectAll}
            theme={theme}
            t={t}
            isRTL={isRTL}
          />
        </>
      ) : null}

      <Spacer height={Spacing.lg} />
    </View>
  );

  const renderListHeader = () => (
    <Spacer height={Spacing.md} />
  );

  const renderEmptyState = () => (
    <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
      <DDIcon name="check-circle" size={48} variant="success" />
      <Spacer height={Spacing.md} />
      <ThemedText style={[Typography.bodyLarge, { fontWeight: '600' }]}>
        {t('common.done')}!
      </ThemedText>
      <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
        {searchQuery ? t('common.noResults') : t('dashboard.noPendingApprovals')}
      </ThemedText>
    </ThemedView>
  );

  if (isLoading || isFetching) {
    return (
      <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot, paddingTop, paddingHorizontal: Spacing.xl }]}>
        <SkeletonDashboard cards={4} />
      </View>
    );
  }

  if (viewMode === 'list') {
    return (
      <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.stickyHeaderContainer, { paddingTop }]}>
          {renderStickyHeader()}
        </View>
        
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ApprovalTableRow 
              request={item}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onViewDetails={() => handleViewDetails(item.id)}
              onLongPress={() => handleLongPress(item.id)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelection={() => toggleSelection(item.id)}
              theme={theme}
              isProcessing={isProcessing}
              isExpired={isVisitExpired(item.visitDate, item.visitTime, item.endTime, item.duration)}
              t={t}
              fmtDate={formatDate}
              fmtTime={formatTimeFromString}
              isRTL={isRTL}
            />
          )}
          ListHeaderComponent={renderListHeader()}
          ListEmptyComponent={renderEmptyState()}
          ListFooterComponent={<ListLoadingFooter isLoading={isFetchingNextPage} />}
          ItemSeparatorComponent={() => <Spacer height={Spacing.md} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ 
            paddingHorizontal: Spacing.md,
            paddingBottom: paddingBottom + (selectedIds.size > 0 ? 80 : 0),
          }}
          showsVerticalScrollIndicator={true}
        />

        {selectedIds.size > 0 ? (
          <BulkActionBar
            selectedCount={selectedIds.size}
            onApprove={handleBulkApprove}
            onReject={handleBulkReject}
            theme={theme}
            t={t}
            bottomInset={insets.bottom}
            isProcessing={isBulkProcessing}
            processingAction={bulkProcessingAction}
            isRTL={isRTL}
          />
        ) : null}

        <RejectRequestModal
          visible={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setActiveRequestId(null);
            setIsBulkReject(false);
          }}
          onSubmit={handleRejectSubmit}
          theme={theme}
          isDark={isDark}
          isProcessing={isProcessing}
          isBulk={isBulkReject}
          t={t}
          insets={insets}
          isRTL={isRTL}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.stickyHeaderContainer, { paddingTop }]}>
        {renderStickyHeader()}
      </View>
      
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VisitorRequestCard
            request={item}
            onPress={() => handleViewDetails(item.id)}
            onLongPress={() => handleLongPress(item.id)}
            showRequestedBy
            showActions={!isSelectionMode}
            onApprove={() => handleApprove(item.id)}
            onReject={() => handleReject(item.id)}
            isProcessing={isProcessing}
            isExpired={isVisitExpired(item.visitDate, item.visitTime, item.endTime, item.duration)}
            isSelectionMode={isSelectionMode}
            isSelected={selectedIds.has(item.id)}
            onToggleSelection={() => toggleSelection(item.id)}
            accentColor={theme.primary}
          />
        )}
        ListHeaderComponent={renderListHeader()}
        ListEmptyComponent={renderEmptyState()}
        ListFooterComponent={<ListLoadingFooter isLoading={isFetchingNextPage} />}
        ItemSeparatorComponent={() => <Spacer height={LAYOUT.contentGap} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        style={styles.scrollableContent}
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl,
          paddingBottom: paddingBottom + (selectedIds.size > 0 ? 80 : 0),
        }}
        showsVerticalScrollIndicator={true}
      />

      {selectedIds.size > 0 ? (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
          theme={theme}
          t={t}
          bottomInset={insets.bottom}
          isProcessing={isBulkProcessing}
          processingAction={bulkProcessingAction}
          isRTL={isRTL}
        />
      ) : null}

      <RejectRequestModal
        visible={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setActiveRequestId(null);
          setIsBulkReject(false);
        }}
        onSubmit={handleRejectSubmit}
        theme={theme}
        isDark={isDark}
        isProcessing={isProcessing}
        isBulk={isBulkReject}
        t={t}
        insets={insets}
        isRTL={isRTL}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  stickyHeaderContainer: {
    paddingHorizontal: Spacing.xl,
  },
  stickyHeader: {
  },
  scrollableContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewModeToggle: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  toggleButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  walkInBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginStart: Spacing.sm,
  },
  walkInBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  nameWithBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  bulkActionBar: {
    position: 'absolute',
    start: Spacing.md,
    end: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bulkActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  bulkActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkRejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
  },
  bulkApproveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  bulkButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  tableCheckboxColumn: {
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCheckboxContainer: {
    position: 'absolute',
    top: Spacing.md,
    end: Spacing.md,
    zIndex: 10,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginStart: Spacing.sm,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },

  statusAccent: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.statusBorderWidth,
  },
  servicesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  servicePill: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
  },
  separator: {
    fontSize: 13,
  },

  tableRow: {
    flexDirection: 'row',
    height: LAYOUT.tableRowHeight,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  fixedColumn: {
    padding: Spacing.md,
    borderEndWidth: 1,
    borderEndColor: 'rgba(0,0,0,0.05)',
  },
  fixedColumnContent: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollableColumns: {
    flex: 1,
  },
  scrollableColumnsContent: {
    paddingEnd: Spacing.md,
  },
  tableColumn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  columnHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  columnValue: {
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectActionButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  approveActionButton: {
    borderWidth: 0,
  },
  detailsActionButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },

  requestCard: {
    borderRadius: LAYOUT.cardRadius,
    padding: LAYOUT.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: LAYOUT.cardRadius - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  nameSection: {
    flex: 1,
    marginStart: Spacing.md,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  companyText: {
    fontSize: 12,
    marginTop: 2,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeLabel: {
    fontSize: 11,
  },
  employeeName: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
  },
  cardRejectButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cardRejectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardApproveButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cardApproveText: {
    fontSize: 14,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    maxWidth: 440,
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    paddingTop: Spacing.lg,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    zIndex: 10,
  },
  modalIconWrapper: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    minHeight: 110,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
  },
  modalSubmitButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
  },

  emptyState: {
    padding: Spacing.xl * 2,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  rejectModalContainer: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    maxWidth: 400,
    width: '100%',
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
    overflow: 'hidden',
  },
  rejectModalCloseButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    zIndex: 10,
  },
  rejectModalIconContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  rejectModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectModalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  rejectModalContent: {
    alignItems: 'center',
  },
});
