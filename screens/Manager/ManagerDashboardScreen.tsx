import React, { useState, useMemo, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput, Modal, FlatList, Alert, useWindowDimensions, ActivityIndicator } from "react-native";
import { capitalizeFirst } from "@/utils/formatters";
import { ROUTES } from "@/constants";
import { useRefetchOnRefocus } from "@/hooks/useRefetchOnRefocus";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { DDIcon } from "@/components/DDIcon";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import Spacer from "@/components/Spacer";
import { ServiceIcons, SelectionCheckbox, StatusAccent, WalkInBadge, SkeletonDashboard, LoadingSpinner, ApprovalActionGroup, LoadingButton, VisitorRequestCard, RTLHorizontalScrollView, ListLoadingFooter, VisitorMatrixTable } from "@/components/shared";
import type { VisitorMatrixItem } from "@/components/shared";
import { Spacing, BorderRadius, Typography, FontFamily, getLocaleFontFamily, getInputFontFamily } from "@/constants/theme";
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
  requestKeys,
} from "@/hooks/queries/useApprovalQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { VisitorRequest } from "@/types/vms.types";
import type { PendingApprovalDto } from "@/types/api.types";
import { applyOpacity } from "@/utils/statusStyles";
import type { ManagerDashboardScreenProps } from "@/types/managerNavigation.types";
import type { Theme } from "@/types/theme.types";
import { mapPendingApprovalToVisitorRequest } from "@/utils/requestMappers";
import { isVisitExpired } from "@/utils/dateTimeUtils";
import { PURPOSE_VALUE_TO_KEY, normalizePurposeValue } from "@/constants/requestConstants";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import {
  computeIsPendingApprovalWalkInExpired,
  getPendingApprovalWalkInScheduledEndMs,
} from "@/utils/visitExpiredGuard";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";

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


const SectionHeader = ({ 
  viewMode, 
  onViewModeChange,
  isSelectionMode,
  onToggleSelectionMode,
  theme,
  t,
  isRTL = false,
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
      <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600' }]}>
        {t('navigation.pendingApprovals')}
      </ThemedText>
      <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 12 }]}>
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
    <DirectionalRow style={styles.headerActions}>
      {selectButton}
      <Spacer width={Spacing.sm} />
      <DirectionalRow style={styles.viewModeToggle}>
        {gridButton}
        {listButton}
      </DirectionalRow>
    </DirectionalRow>
  );
  
  return (
    <DirectionalRow style={styles.header}>
      {titleContent}
      {actionsContent}
    </DirectionalRow>
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
    <DirectionalRow style={[styles.selectAllBar, { backgroundColor: theme.surfaceSecondary }]}>
      <Pressable onPress={onToggleAll} style={[styles.selectAllButton, { flexDirection: getFlexDirection(isRTL) }]}>
        <SelectionCheckbox isSelected={allSelected} onToggle={onToggleAll} />
        <Spacer width={Spacing.sm} />
        <ThemedText style={[Typography.body, { color: theme.text }]}>
          {allSelected ? t('bulkActions.deselectAll') : t('bulkActions.selectAll')}
        </ThemedText>
      </Pressable>
    </DirectionalRow>
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
      <DirectionalRow style={styles.bulkActionContent}>
        <ThemedText style={[Typography.body, { fontWeight: '600', color: theme.text }]}>
          {isProcessing ? t('common.processing') : `${selectedCount} ${t('bulkActions.selected')}`}
        </ThemedText>
        <DirectionalRow style={styles.bulkActionButtons}>
          <Pressable
            style={[styles.bulkRejectButton, { borderColor: theme.error, opacity: isProcessing ? 0.6 : 1, flexDirection: getFlexDirection(isRTL) }]}
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
            style={[styles.bulkApproveButton, { backgroundColor: theme.success, opacity: isProcessing ? 0.6 : 1, flexDirection: getFlexDirection(isRTL) }]}
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
        </DirectionalRow>
      </DirectionalRow>
    </View>
  );
};


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
                  color: theme.text,
                  fontFamily: getInputFontFamily(rejectionReason, isRTL)
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

            <DirectionalRow style={styles.rejectModalActions}>
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
            </DirectionalRow>
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
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth >= 900 ? 3 : screenWidth >= 600 ? 2 : 1;
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isBulkReject, setIsBulkReject] = useState(false);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);

  const { 
    data: pendingApprovalsData, 
    isLoading: isLoadingPending, 
    isFetching: isFetchingPending,
    error: pendingError, 
    refetch: refetchPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfinitePendingApprovalsQuery();

  // Infinite-query data can briefly become undefined when its parameters or
  // cache entry change. Keep the last successful snapshot mounted until the
  // replacement request succeeds; an empty successful page is still usable.
  const approvalSourceKey = `${user?.id ?? 'anonymous'}|manager-pending-approvals`;
  const pendingRetention = useRef<{ key: string; data: typeof pendingApprovalsData } | null>(null);
  const paginationRetryLock = useRef(false);
  if (pendingApprovalsData !== undefined) {
    pendingRetention.current = { key: approvalSourceKey, data: pendingApprovalsData };
  }
  const displayedPendingApprovalsData =
    pendingApprovalsData !== undefined
      ? pendingApprovalsData
      : pendingRetention.current?.key === approvalSourceKey
        ? pendingRetention.current.data
        : undefined;
  const pendingIsRetained =
    pendingApprovalsData === undefined &&
    pendingRetention.current?.key === approvalSourceKey &&
    pendingRetention.current.data !== undefined;
  const hasUsablePendingData = displayedPendingApprovalsData !== undefined;
  const isBackgroundFetchingPending = isFetchingPending && !isFetchingNextPage;

  // Refresh approvals when returning to the dashboard; the mount fetch covers
  // the first focus.
  useRefetchOnRefocus([refetchPending]);
  
  const queryClient = useQueryClient();
  const approveMutation = useApproveVisitMutation();
  const rejectMutation = useRejectVisitMutation();
  const bulkApproveMutation = useBulkApproveRequestsMutation();
  const bulkRejectMutation = useBulkRejectRequestsMutation();

  const isProcessing = approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending || bulkRejectMutation.isPending;
  const isBulkProcessing = bulkApproveMutation.isPending || bulkRejectMutation.isPending;
  const bulkProcessingAction: 'approve' | 'reject' | null = bulkApproveMutation.isPending ? 'approve' : bulkRejectMutation.isPending ? 'reject' : null;
  const pendingApprovals = useMemo(() => {
    if (!displayedPendingApprovalsData?.pages) return [];
    return displayedPendingApprovalsData.pages.flatMap(page => page.data.map(mapPendingApprovalToVisitorRequest));
  }, [displayedPendingApprovalsData?.pages]);
  const expirationBoundaries = useMemo(
    () =>
      pendingApprovals.map((request) =>
        getPendingApprovalWalkInScheduledEndMs({
          isWalkIn: request.isWalkIn,
          status: request.status,
          visitDate: request.visitDate,
          visitTime: request.visitTime,
          endTime: request.endTime,
          duration: request.duration,
        }),
      ),
    [pendingApprovals],
  );
  const expirationTick = useTimeBoundaryTick(expirationBoundaries);
  const isPendingApprovalWalkInExpired = useCallback(
    (request: VisitorRequest) =>
      computeIsPendingApprovalWalkInExpired({
        isWalkIn: request.isWalkIn,
        status: request.status,
        visitDate: request.visitDate,
        visitTime: request.visitTime,
        endTime: request.endTime,
        duration: request.duration,
      }),
    [expirationTick],
  );
  const isRequestExpired = useCallback(
    (request: VisitorRequest) =>
      isPendingApprovalWalkInExpired(request) ||
      isVisitExpired(
        request.visitDate,
        request.visitTime,
        request.endTime,
        request.duration,
      ),
    [isPendingApprovalWalkInExpired],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRetryNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || paginationRetryLock.current) return;
    paginationRetryLock.current = true;
    void fetchNextPage({ cancelRefetch: false }).finally(() => {
      paginationRetryLock.current = false;
    });
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
    const request = pendingApprovals.find((candidate) => candidate.id === requestId);
    if (!request || isPendingApprovalWalkInExpired(request)) return;
    setApprovingRequestId(requestId);
    approveMutation.mutate(
      { id: requestId, payload: {} },
      {
        onSuccess: () => {
          setApprovingRequestId(null);
          // Remove stale visitDetail cache so the detail page loads fresh data
          // rather than briefly showing pending-status action buttons.
          queryClient.removeQueries({ queryKey: requestKeys.visitDetail(requestId) });
        },
        onError: (error) => {
          setApprovingRequestId(null);
          Alert.alert(t('errors.somethingWentWrong'), error.message);
        },
      }
    );
  };

  const handleReject = (requestId: string) => {
    if (isProcessing) return;
    const request = pendingApprovals.find((candidate) => candidate.id === requestId);
    if (!request || isPendingApprovalWalkInExpired(request)) return;
    setActiveRequestId(requestId);
    setIsBulkReject(false);
    setShowRejectModal(true);
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0 || isBulkProcessing) return;
    const eligibleIds = Array.from(selectedIds).filter((id) => {
      const request = pendingApprovals.find((candidate) => candidate.id === id);
      return request && !isPendingApprovalWalkInExpired(request);
    });
    if (eligibleIds.length !== selectedIds.size) {
      setSelectedIds(new Set(eligibleIds));
    }
    if (eligibleIds.length === 0) return;
    
    bulkApproveMutation.mutate(
      { ids: eligibleIds },
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
    const eligibleIds = Array.from(selectedIds).filter((id) => {
      const request = pendingApprovals.find((candidate) => candidate.id === id);
      return request && !isPendingApprovalWalkInExpired(request);
    });
    if (eligibleIds.length !== selectedIds.size) {
      setSelectedIds(new Set(eligibleIds));
    }
    if (eligibleIds.length === 0) return;
    setIsBulkReject(true);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = (reason: string) => {
    const rejectReason = reason.trim() || 'No reason provided';
    
    if (isBulkReject) {
      const eligibleIds = Array.from(selectedIds).filter((id) => {
        const request = pendingApprovals.find((candidate) => candidate.id === id);
        return request && !isPendingApprovalWalkInExpired(request);
      });
      if (eligibleIds.length !== selectedIds.size) {
        setSelectedIds(new Set(eligibleIds));
      }
      if (eligibleIds.length === 0) {
        setShowRejectModal(false);
        setIsBulkReject(false);
        return;
      }
      bulkRejectMutation.mutate(
        { ids: eligibleIds, reason: rejectReason },
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
      const requestIdToReject = activeRequestId;
      const request = pendingApprovals.find((candidate) => candidate.id === requestIdToReject);
      if (!request || isPendingApprovalWalkInExpired(request)) {
        setShowRejectModal(false);
        setActiveRequestId(null);
        return;
      }
      setRejectingRequestId(activeRequestId);
      rejectMutation.mutate(
        { id: activeRequestId, payload: { reason: rejectReason } },
        {
          onSuccess: () => {
            // Remove stale visitDetail cache so the detail page loads fresh data.
            queryClient.removeQueries({ queryKey: requestKeys.visitDetail(requestIdToReject) });
            setShowRejectModal(false);
            setActiveRequestId(null);
            setRejectingRequestId(null);
          },
          onError: (error) => {
            setRejectingRequestId(null);
            Alert.alert(t('errors.somethingWentWrong'), error.message);
          },
        }
      );
    }
  };

  const handleViewDetails = (requestId: string) => {
    navigation.navigate(ROUTES.MANAGER_APPROVAL_DETAIL as any, { requestId } as any);
  };

  const toMatrixItem = useCallback((request: VisitorRequest): VisitorMatrixItem => {
    const pv = normalizePurposeValue(request.purpose || '');
    const purposeLabel = PURPOSE_VALUE_TO_KEY[pv] ? t(PURPOSE_VALUE_TO_KEY[pv] as any) : request.purpose;
    return {
      id: request.id,
      visitorName: capitalizeFirst(request.visitor.fullName),
      company: request.visitor.company || undefined,
      visitDate: request.visitDate,
      plannedInTime: request.visitTime,
      plannedOutTime: request.endTime,
      status: request.status,
      hostName: request.employeeName || undefined,
      hasParking: resolveParkingDisplayDecision({
        parkingDecision: request.parkingDecision,
        visitorNeedsParking: request.visitorNeedsParking,
        isVisitorNeedsParking: request.isVisitorNeedsParking,
        hasParkingAllocation: !!request.parkingSlot,
      }) === 'required',
      hasBuffet: !!request.buffet,
      hasValet: !!request.valet,
      hasMeetingRoom: !!request.meetingRoom,
      purpose: purposeLabel || undefined,
      isExpired: isRequestExpired(request),
    };
  }, [expirationTick, isRequestExpired, t]);

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
          style={[styles.searchInput, { color: theme.text, fontFamily: getInputFontFamily(searchQuery, isRTL), textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
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

      {hasUsablePendingData && (isBackgroundFetchingPending || (pendingError && !isFetchNextPageError) || pendingIsRetained) ? (
        <>
          <DirectionalRow
            style={[
              styles.inlineFeedback,
              {
                backgroundColor: applyOpacity(
                  pendingError && !isFetchNextPageError && !isBackgroundFetchingPending ? theme.error : theme.primary,
                  '10',
                ),
              },
            ]}
          >
            {isBackgroundFetchingPending ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <DDIcon
                name={pendingError && !isFetchNextPageError ? 'alert-circle' : 'info'}
                size={16}
                color={pendingError && !isFetchNextPageError ? theme.error : theme.primary}
              />
            )}
            <ThemedText
              style={[
                Typography.caption,
                {
                  color: pendingError && !isFetchNextPageError && !isBackgroundFetchingPending ? theme.error : theme.textSecondary,
                  flex: 1,
                },
              ]}
            >
              {isBackgroundFetchingPending ? t('common.loading') : t('errors.generic')}
            </ThemedText>
            {pendingError && !isFetchNextPageError && !isBackgroundFetchingPending ? (
              <Pressable onPress={() => refetchPending()} hitSlop={8}>
                <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                  {t('common.retry')}
                </ThemedText>
              </Pressable>
            ) : null}
          </DirectionalRow>
          <Spacer height={Spacing.md} />
        </>
      ) : null}
    </View>
  );

  const renderListHeader = () => (
    <Spacer height={Spacing.md} />
  );

  const paginationFooter = (
    <>
      <ListLoadingFooter isLoading={isFetchingNextPage} />
      {isFetchNextPageError ? (
        <Pressable style={styles.paginationError} onPress={handleRetryNextPage}>
          <ThemedText style={[Typography.caption, { color: theme.error, textAlign: 'center' }]}>
            {t('common.loadError')}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      ) : null}
    </>
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

  if (isLoadingPending && !hasUsablePendingData) {
    return (
      <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot, paddingTop, paddingHorizontal: Spacing.xl }]}>
        <SkeletonDashboard cards={4} />
      </View>
    );
  }

  if (pendingError && !hasUsablePendingData) {
    return (
      <View style={[styles.screenContainer, styles.coldError, { backgroundColor: theme.backgroundRoot, paddingTop }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
        <Spacer height={Spacing.md} />
        <Pressable onPress={() => refetchPending()}>
          <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>{t('common.retry')}</ThemedText>
        </Pressable>
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
          data={[]}
          extraData={expirationTick}
          keyExtractor={() => '_'}
          renderItem={() => null}
          ListHeaderComponent={
            <View>
              {renderListHeader()}
              {filteredRequests.length > 0 ? (
                <VisitorMatrixTable
                  variant="matrix"
                  visitors={filteredRequests.map(toMatrixItem)}
                  onPressRow={handleViewDetails}
                  showApproveReject
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isSelectionMode={isSelectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                  onLongPressRow={handleLongPress}
                  emptyMessage={t('common.noResults')}
                />
              ) : (
                renderEmptyState()
              )}
            </View>
          }
          ListFooterComponent={paginationFooter}
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
        key={`flatlist-${numColumns}`}
        data={filteredRequests}
        extraData={expirationTick}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <View style={numColumns > 1 ? { width: numColumns === 2 ? '50%' : '33.33%', flexGrow: 0, marginBottom: LAYOUT.contentGap, paddingEnd: Spacing.sm } : { width: '100%' }}>
            <VisitorRequestCard
              request={item}
              onPress={() => handleViewDetails(item.id)}
              onLongPress={() => handleLongPress(item.id)}
              showRequestedBy
              showActions={!isSelectionMode && !isPendingApprovalWalkInExpired(item)}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              isProcessing={isProcessing}
              approveLoading={approvingRequestId === item.id}
              rejectLoading={rejectingRequestId === item.id}
              isExpired={isRequestExpired(item)}
              showExpiredState={isPendingApprovalWalkInExpired(item)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelection={() => toggleSelection(item.id)}
              accentColor={theme.primary}
            />
          </View>
        )}
        ListHeaderComponent={renderListHeader()}
        ListEmptyComponent={renderEmptyState()}
        ListFooterComponent={paginationFooter}
        ItemSeparatorComponent={numColumns === 1 ? () => <Spacer height={LAYOUT.contentGap} /> : undefined}
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
  inlineFeedback: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  coldError: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  paginationError: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  scrollableContent: {
    flex: 1,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  selectAllButton: {
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
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  nameWithBadgeCard: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  bulkActionButtons: {
    alignItems: 'center',
  },
  bulkRejectButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
  },
  bulkApproveButton: {
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
    fontFamily: FontFamily.latinRegular,
  },

  statusAccent: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.statusBorderWidth,
  },
  servicesRow: {
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  servicePill: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeRow: {
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
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
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
  },
  cardRejectButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
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
    fontFamily: FontFamily.latinRegular,
    lineHeight: 21,
  },
  modalActions: {
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
    width: '100%',
  },
  rejectModalContent: {
    alignItems: 'center',
  },
});
