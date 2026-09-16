import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Platform, Keyboard, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from "@/constants";
import type { NavigationProp } from '@react-navigation/native';
import { DDIcon, IconName } from '@/components/DDIcon';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { SearchInput } from '@/components/SearchInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import {
  EmptyState,
  RTLHorizontalScrollView,
  VisitorMatrixTable,
} from '@/components/shared';
import { SkeletonCard } from '@/components/shared/Skeleton';
import { RequestStatusBadge } from '@/components/shared/RequestStatusBadge';
import { CalendarDatePicker } from '@/components/CalendarDatePicker';
import { Spacing, BorderRadius, Typography, StatusCardColors, getInputFontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormatters } from '@/hooks/useFormatters';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyOpacity, getStatusConfig } from '@/utils/statusStyles';
import { computeCardWidth, computeGridColumns, computeContentWidth, computeAllRequestsCardWidth, ALL_REQUESTS_GRID_PADDING_SIDE } from '@/utils/gridLayout';
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { 
  useAllRequestsQuery,
  type UnifiedRequest,
  type UnifiedRequestType,
  type UnifiedStatus,
} from '@/hooks/queries/useAllRequestsQuery';
import { useApproveVisitMutation, useRejectVisitMutation } from '@/hooks/queries/useApprovalQueries';
import { useUpdateBuffetRequestMutation } from '@/hooks/queries/useBuffetQueries';
import { useUpdateValetAssignmentMutation } from '@/hooks/queries/useValetQueries';
import { useValetParkingDashboard } from '@/hooks/queries/useValetAdminQueries';
import { useRetainedDatedData } from '@/hooks/useRetainedDatedData';
import { useQueryClient } from '@tanstack/react-query';
import type { ValetParkingVisitorDto } from '@/types/api.types';
import type { Theme } from '@/types/theme.types';
import type { VisitListItemDto, BuffetAdminTaskDto, ValetTaskDto } from '@/types/api.types';
import { BuffetRequestStatus, ValetAssignmentStatus } from '@/types/api.types';
import { resolveParkingDisplayDecision } from '@/utils/parkingDecision';
import {
  formatAllRequestsDuration,
  formatAllRequestsScheduledTime,
  getStatusFilterForRequestType,
  shouldShowAllRequestsStatusFilters,
} from '@/utils/allRequestsPresentation';
import {
  dateKeyToLocalNoon,
  getCurrentBusinessMonthRange,
  localCalendarDateToKey,
} from '@/utils/adminAllRequestsDateRange';
import { getBusinessDateKey } from '@/utils/dateTimeUtils';
import {
  getAdminDatePickerMode,
  shouldFetchNextVisitPage,
} from '@/utils/allRequestsQueryHelpers';
import {
  ADMIN_ALL_REQUESTS_DEFAULT_VIEW_MODE,
  mapAdminRequestToMatrixItem,
  type AdminAllRequestsViewMode,
} from '@/utils/adminAllRequestsTable';
import {
  getAllRequestsSourceKey,
  resolvePrimaryListState,
  resolveRetainedDisplay,
} from '@/utils/allRequestsDisplayState';

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  contentGap: Spacing.md,
};

type RequestFilter = UnifiedRequestType;
type StatusFilter = UnifiedStatus | 'all' | 'visitor_accepted' | 'visitor_rejected';

const VISIT_PURPOSE_I18N_MAP: Record<string, string> = {
  business_meeting: 'visitor.businessMeeting',
  interview:        'visitor.interview',
  delivery:         'visitor.delivery',
  maintenance:      'visitor.maintenance',
  meeting:          'visitor.meeting',
  business:         'visitor.business',
  events:           'visitor.events',
  vendors:          'visitor.vendors',
  partners:         'visitor.partners',
  training:         'visitor.training',
  personal:         'visitor.personalVisit',
  other:            'visitor.other',
  contractor:       'visitor.contractor',
  vip:              'visitor.vip',
  government:       'visitor.government',
  general_visit:    'visitor.generalVisit',
};

function getPurposeLabel(rawPurpose: string | undefined, t: (key: string) => string): string | undefined {
  if (!rawPurpose) return undefined;
  const i18nKey = VISIT_PURPOSE_I18N_MAP[rawPurpose.toLowerCase()];
  if (i18nKey) {
    const label = t(i18nKey);
    // t() returns the key itself if missing — fall back to a title-cased raw value
    return label !== i18nKey ? label : rawPurpose.replace(/_/g, ' ');
  }
  // Unknown purpose: convert snake_case to Title Case as a graceful fallback
  return rawPurpose.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const getTypeIcon = (type: UnifiedRequestType): IconName => {
  switch (type) {
    case 'visitor': return 'users';
    case 'buffet': return 'cloche';
    case 'valet': return 'navigation';
    default: return 'layers';
  }
};

const getTypeColor = (type: UnifiedRequestType, theme: Theme) => {
  switch (type) {
    case 'visitor': return theme.primary;
    case 'buffet': return '#FF6B35';
    case 'valet': return '#6366F1';
    default: return theme.textSecondary;
  }
};

interface StatCardProps {
  value: number | null;
  label: string;
  color: string;
  isActive: boolean;
  onPress: () => void;
  theme: Theme;
  isLargeScreen?: boolean;
}

function StatCard({ value, label, color, isActive, onPress, theme, isLargeScreen }: StatCardProps) {
  const handlePress = () => {
    console.log('[StatCard] PRESSED:', label, 'value:', value, 'isActive:', isActive);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.statCard,
        isLargeScreen && styles.statCardFlex,
        {
          backgroundColor: isActive ? applyOpacity(color, '20') : applyOpacity(color, '08'),
        }
      ]}
    >
      <ThemedText style={[styles.statValue, { color }]}>{value ?? '—'}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={2}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}


interface RequestCardProps {
  request: UnifiedRequest;
  onPress: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  theme: Theme;
  t: (key: string) => string;
  formatDate: (date: string | Date) => string;
  formatTimeFromString: (time: string) => string;
  toLocalNumerals: (value: string) => string;
  isRTL: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function RequestCard({ request, onPress, onApprove, onReject, theme, t, formatDate, formatTimeFromString, toLocalNumerals, isRTL, isExpanded, onToggleExpand }: RequestCardProps) {
  const typeColor = getTypeColor(request.type, theme);
  const statusConfig = getStatusConfig(theme, request.originalStatus, t);
  const typeIcon = getTypeIcon(request.type);
  const scheduledTime = formatAllRequestsScheduledTime(
    request.time,
    request.endTime,
    formatTimeFromString,
    t('visitor.timeRangeTo'),
  );
  const hasExpandableDetails = useMemo(() => {
    if (request.type === 'visitor') {
      const originalData = request.originalData as VisitListItemDto;
      return Boolean(originalData?.visitor?.email || originalData?.visitor?.phone);
    }
    if (request.type === 'buffet') {
      return Boolean(request.guestCount);
    }
    return false;
  }, [request]);

  const renderExpandedDetails = () => {
    if (request.type === 'visitor') {
      const originalData = request.originalData as VisitListItemDto;
      const hasDetails = originalData?.visitor?.email || originalData?.visitor?.phone;
      if (!hasDetails) return null;

      return (
        <View style={styles.expandedSection}>
          {originalData?.visitor?.email ? (
            <DirectionalRow style={styles.expandedDetailRow}>
                <DDIcon name="mail" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.expandedDetailText, { color: theme.text }]} numberOfLines={1}>
                  {originalData.visitor.email}
                </ThemedText>
              </DirectionalRow>
          ) : null}
          {originalData?.visitor?.phone ? (
            <DirectionalRow style={styles.expandedDetailRow}>
                <DDIcon name="phone" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.expandedDetailText, { color: theme.text, writingDirection: 'ltr' }]} numberOfLines={1}>
                  {originalData.visitor.phone}
                </ThemedText>
              </DirectionalRow>
          ) : null}
        </View>
      );
    }

    if (request.type === 'buffet' && request.guestCount) {
      return (
        <View style={styles.expandedSection}>
          <DirectionalRow style={styles.expandedDetailRow}>
              <DDIcon name="users" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.expandedDetailText, { color: theme.text }]}>
                {t('buffet.guestCount')}: {request.guestCount}
              </ThemedText>
          </DirectionalRow>
          {request.mealType ? (
            <DirectionalRow style={styles.expandedDetailRow}>
                <DDIcon name="cloche" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.expandedDetailText, { color: theme.text }]}>
                  {request.mealType}
                </ThemedText>
              </DirectionalRow>
          ) : null}
        </View>
      );
    }

    if (request.type === 'valet') {
      const valetVisitor = request.originalData as unknown as ValetParkingVisitorDto;
      const parkingRequired = resolveParkingDisplayDecision({
        visitorNeedsParking: valetVisitor?.visitorNeedsParking,
        isVisitorNeedsParking: valetVisitor?.isVisitorNeedsParking,
        hasParkingAllocation: valetVisitor?.parkingType !== undefined && valetVisitor.parkingType !== 'none',
      }) === 'required';
      return (
        <View style={styles.expandedSection}>
          {parkingRequired ? (
            <DirectionalRow style={styles.expandedDetailRow}>
              <DDIcon name="map-pin" size={14} color={theme.textSecondary} />
            </DirectionalRow>
          ) : null}
        </View>
      );
    }

    return null;
  };

  return (
    <Pressable onPress={onPress}>
      <ThemedView style={[styles.requestCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.typeAccent, { backgroundColor: statusConfig.text }]} />
        
        <View style={styles.cardContent}>
          <DirectionalRow style={styles.cardHeader}>
            <ThemedText style={[Typography.body, { fontWeight: '600', flex: 1 }]} numberOfLines={1}>
              {request.visitorName}
            </ThemedText>
            <RequestStatusBadge status={request.originalStatus} />
          </DirectionalRow>

          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
            {t('reception.hostName')}: {request.hostName}
          </ThemedText>

          <Spacer height={Spacing.sm} />

          <DirectionalRow style={styles.detailsRow}>
            <DirectionalRow style={styles.detailItem}>
              <DDIcon name="calendar" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {formatDate(request.date)}
              </ThemedText>
            </DirectionalRow>
            {request.type === 'visitor' ? (
              request.duration ? (
                <DirectionalRow style={styles.detailItem}>
                  <ThemedText style={[styles.detailSeparator, { color: theme.border }]}>•</ThemedText>
                  <DDIcon name="clock" size={14} variant="muted" />
                  <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                    {t('visitor.duration')} {formatAllRequestsDuration(request.duration, t, toLocalNumerals)}
                  </ThemedText>
                </DirectionalRow>
              ) : null
            ) : (
              <DirectionalRow style={styles.detailItem}>
                <DDIcon name="clock" size={14} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {formatTimeFromString(request.time)}
                </ThemedText>
              </DirectionalRow>
            )}
          </DirectionalRow>

          {request.type === 'valet' && resolveParkingDisplayDecision({
            visitorNeedsParking: (request.originalData as unknown as ValetParkingVisitorDto)?.visitorNeedsParking,
            isVisitorNeedsParking: (request.originalData as unknown as ValetParkingVisitorDto)?.isVisitorNeedsParking,
            hasParkingAllocation: (request.originalData as unknown as ValetParkingVisitorDto)?.parkingType !== undefined
              && (request.originalData as unknown as ValetParkingVisitorDto).parkingType !== 'none',
          }) === 'required' ? (
            <>
              <Spacer height={Spacing.xs} />
              <DirectionalRow style={styles.detailItem}>
                <DDIcon name="map-pin" size={14} variant="muted" />
              </DirectionalRow>
            </>
          ) : null}

          {request.location ? (
            <>
              <Spacer height={Spacing.xs} />
              <DirectionalRow style={styles.detailItem}>
                <DDIcon name="map-pin" size={14} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {request.type === 'visitor'
                    ? getPurposeLabel(request.location, t)
                    : request.location}
                </ThemedText>
              </DirectionalRow>
            </>
          ) : null}

          {request.type === 'visitor' && (request.time || request.endTime || request.checkedInAt || request.checkedOutAt) ? (
            <>
              <Spacer height={Spacing.xs} />
              <DirectionalRow style={[styles.timingRow, { borderTopColor: theme.border }]}>
                {scheduledTime ? (
                  <View style={styles.timingCell}>
                    <ThemedText style={[styles.timingLabel, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('visitor.scheduledTime')}
                    </ThemedText>
                    <ThemedText style={[styles.timingValue, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                      {scheduledTime}
                    </ThemedText>
                  </View>
                ) : null}
                {request.checkedInAt ? (
                  <View style={styles.timingCell}>
                    <ThemedText style={[styles.timingLabel, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('visitor.actualIn')}
                    </ThemedText>
                    <ThemedText style={[styles.timingValue, { color: theme.success, textAlign: isRTL ? 'right' : 'left' }]}>
                      {formatTimeFromString(request.checkedInAt)}
                    </ThemedText>
                  </View>
                ) : null}
                {request.checkedOutAt ? (
                  <View style={styles.timingCell}>
                    <ThemedText style={[styles.timingLabel, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('visitor.actualOut')}
                    </ThemedText>
                    <ThemedText style={[styles.timingValue, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {formatTimeFromString(request.checkedOutAt)}
                    </ThemedText>
                  </View>
                ) : null}
              </DirectionalRow>
            </>
          ) : (request.type !== 'visitor' && (request.endTime || request.checkedInAt || request.checkedOutAt)) ? (
            <>
              <Spacer height={Spacing.xs} />
              <View style={{
                flexDirection: 'row',
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.border,
                paddingTop: Spacing.sm,
                gap: Spacing.md,
              }}>
                {request.endTime ? (
                  <View style={{ minWidth: 70 }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '500', color: theme.textSecondary, marginBottom: 2 }}>
                      {t('visitor.plannedOut')}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                      {formatTimeFromString(request.endTime)}
                    </ThemedText>
                  </View>
                ) : null}
                {request.checkedInAt ? (
                  <View style={{ minWidth: 70 }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '500', color: theme.textSecondary, marginBottom: 2 }}>
                      {t('visitor.actualIn')}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                      {formatTimeFromString(request.checkedInAt)}
                    </ThemedText>
                  </View>
                ) : null}
                {request.checkedOutAt ? (
                  <View style={{ minWidth: 70 }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '500', color: theme.textSecondary, marginBottom: 2 }}>
                      {t('visitor.actualOut')}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                      {formatTimeFromString(request.checkedOutAt)}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          <Spacer height={Spacing.sm} />

          <DirectionalRow style={styles.badgesRow}>
            <View style={[styles.typeBadge, { backgroundColor: applyOpacity(typeColor, '12') }]}>
              <DDIcon name={typeIcon} size={12} color={typeColor} />
              <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
                {request.type === 'visitor' ? t('services.visitor') : 
                 request.type === 'buffet' ? t('services.buffet') : t('services.valet')}
              </ThemedText>
            </View>
          </DirectionalRow>

          {(request.canApprove || request.canCancel) ? (
            <>
              <Spacer height={Spacing.md} />
              <DirectionalRow style={styles.actionsRow}>
                {request.canApprove ? (
                  <Pressable
                    style={[styles.approveButton, { backgroundColor: '#22C55E' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onApprove?.();
                    }}
                  >
                    <DirectionalRow>
                      <DDIcon name="check" size={14} color="#FFFFFF" />
                      <ThemedText style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                        {t('actions.approve')}
                      </ThemedText>
                    </DirectionalRow>
                  </Pressable>
                ) : null}
                {request.canCancel ? (
                  <Pressable
                    style={[styles.rejectButton, { borderColor: theme.error }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onReject?.();
                    }}
                  >
                    <DirectionalRow>
                      <ThemedText style={[styles.actionButtonText, { color: theme.error }]}>
                        {t('actions.reject')}
                      </ThemedText>
                    </DirectionalRow>
                  </Pressable>
                ) : null}
              </DirectionalRow>
            </>
          ) : null}
        </View>
      </ThemedView>
    </Pressable>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.paddedContent}>
      <SkeletonCard showImage={false} lines={3} />
      <SkeletonCard showImage={false} lines={3} />
      <SkeletonCard showImage={false} lines={3} />
    </View>
  );
}

export default function AllRequestsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate, formatTimeFromString, toLocalNumerals } = useFormatters();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  
  // Subtract sidebar width on large screens so columns are calculated from available content area
  const numColumns = computeGridColumns(width);
  // Pixel-based width avoids the percentage + gap overflow issue in RN flexWrap.
  // paddedContent has paddingHorizontal: 0; cardGrid uses space-between (no gap property).
  // Allocate Spacing.sm as the inter-column gap; space-between distributes the remainder evenly.
  // ScreenScrollView adds paddingHorizontal: Spacing.xl on each side; subtract
  // that from the card-width formula so three cards fit correctly on desktop.
  const cardWidth = computeCardWidth(width, numColumns, Spacing.xl, Spacing.sm);

  // Calculate card width accounting for gaps
  const getCardStyle = useMemo(() => {
    const gap = LAYOUT.contentGap;
    if (numColumns === 1) {
      return { width: '100%' as const, marginBottom: gap };
    } else {
      return { width: cardWidth, marginBottom: gap };
    }
  }, [numColumns, cardWidth]);
  const queryClient = useQueryClient();  
  const [typeFilter, setTypeFilter] = useState<RequestFilter>('visitor');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>(() => {
    const currentMonth = getCurrentBusinessMonthRange();
    return {
      startDate: dateKeyToLocalNoon(currentMonth.startDate),
      endDate: dateKeyToLocalNoon(currentMonth.endDate),
    };
  });
  const [buffetDate, setBuffetDate] = useState<Date>(() =>
    dateKeyToLocalNoon(getBusinessDateKey()),
  );
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<UnifiedRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<AdminAllRequestsViewMode>(
    ADMIN_ALL_REQUESTS_DEFAULT_VIEW_MODE,
  );
  const loadingNextPageRef = useRef(false);

  const toggleCardExpanded = useCallback((cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const activeDateRange = useMemo(
    () => typeFilter === 'buffet'
      ? { startDate: buffetDate, endDate: buffetDate }
      : dateRange,
    [buffetDate, dateRange, typeFilter],
  );
  const hasDateFilter = activeDateRange.startDate !== null;

  const filters = useMemo(() => ({
    type: typeFilter,
    status: statusFilter,
    searchQuery,
    startDate: activeDateRange.startDate ? localCalendarDateToKey(activeDateRange.startDate) : undefined,
    endDate: activeDateRange.endDate ? localCalendarDateToKey(activeDateRange.endDate) : (activeDateRange.startDate ? localCalendarDateToKey(activeDateRange.startDate) : undefined),
  }), [typeFilter, statusFilter, searchQuery, activeDateRange]);

  const {
    data: requests,
    stats,
    isLoading,
    isFetching,
    isError,
    hasResolvedData,
    dataUpdatedAt,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    hasNextPageError,
    fetchNextPage,
  } = useAllRequestsQuery(filters, { includeValet: false });
  
  const valetStartDate = dateRange.startDate ? localCalendarDateToKey(dateRange.startDate) : undefined;
  const valetEndDate = dateRange.endDate ? localCalendarDateToKey(dateRange.endDate) : valetStartDate;
  const { 
    data: valetDashboardData, 
    isLoading: isValetLoading, 
    isFetching: isValetFetching,
    isError: isValetError,
    refetch: refetchValet 
  } = useValetParkingDashboard(
    valetStartDate,
    valetEndDate,
    typeFilter === 'valet',
  );

  const mapValetVisitorToUnified = useCallback((visitor: ValetParkingVisitorDto): UnifiedRequest => {
    const mapStatus = (status: string): UnifiedStatus => {
      const statusLower = status.toLowerCase();
      if (['checked_in', 'in_progress'].includes(statusLower)) return 'in_progress';
      if (['completed', 'checked_out'].includes(statusLower)) return 'completed';
      if (['approved', 'visitor_accepted'].includes(statusLower)) return 'approved';
      if (statusLower === 'cancelled') return 'cancelled';
      if (statusLower === 'auto_cancelled') return 'auto_cancelled';
      if (['rejected'].includes(statusLower)) return 'rejected';
      return 'pending';
    };

    return {
      id: visitor.requestId,
      type: 'valet' as UnifiedRequestType,
      visitorName: visitor.visitorName,
      hostName: visitor.hostName,
      date: visitor.visitDate,
      time: visitor.visitTime,
      status: mapStatus(visitor.status),
      location: visitor.hostDepartment,
      canApprove: false,
      canCancel: false,
      createdAt: visitor.visitDate,
      company: visitor.visitorCompany,
      vehicleInfo: visitor.licensePlate ? {
        make: '',
        model: visitor.carModel ?? '',
        color: visitor.carColor ?? '',
        plateNumber: visitor.licensePlate,
      } : undefined,
      originalStatus: visitor.status,
      originalData: visitor as any,
    };
  }, []);

  const valetSourceKey = `${valetStartDate ?? ''}|${valetEndDate ?? ''}`;
  const retainedValetDashboard = useRetainedDatedData(
    valetSourceKey,
    typeFilter === 'valet' ? valetDashboardData : undefined,
  );
  const displayedValetDashboardData = retainedValetDashboard.data;

  const allValetRequests = useMemo(() => {
    if (!displayedValetDashboardData?.data) return [];
    return displayedValetDashboardData.data.map(mapValetVisitorToUnified);
  }, [displayedValetDashboardData, mapValetVisitorToUnified]);

  const valetRequests = useMemo(() => {
    let mapped = allValetRequests;
    
    if (statusFilter !== 'all') {
      mapped = mapped.filter(r => r.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      mapped = mapped.filter(r => 
        r.visitorName.toLowerCase().includes(query) || 
        r.hostName.toLowerCase().includes(query)
      );
    }
    return mapped;
  }, [allValetRequests, statusFilter, searchQuery]);

  const valetStats = useMemo(() => {
    if (!displayedValetDashboardData?.summary) return null;
    const countStatus = (statusToCount: UnifiedStatus) =>
      allValetRequests.filter(request => request.status === statusToCount).length;

    return {
      total: displayedValetDashboardData.summary.totalVisitors,
      pending: countStatus('pending'),
      approved: countStatus('approved'),
      inProgress: countStatus('in_progress'),
      completed: countStatus('completed'),
      cancelled: countStatus('cancelled'),
      rejected: countStatus('rejected'),
      areStatusCountsComplete: true,
      byType: {
        visitor: 0,
        buffet: 0,
        valet: displayedValetDashboardData.summary.totalVisitors,
      },
    };
  }, [allValetRequests, displayedValetDashboardData]);

  type NonValetDisplaySnapshot = {
    sourceKey: string;
    dataUpdatedAt: number;
    requests: UnifiedRequest[];
    stats: typeof stats;
    total: number;
    startDate?: string;
    endDate?: string;
  };

  const [visitorSnapshot, setVisitorSnapshot] =
    useState<NonValetDisplaySnapshot | null>(null);
  const [buffetSnapshot, setBuffetSnapshot] =
    useState<NonValetDisplaySnapshot | null>(null);

  const nonValetSourceKey = getAllRequestsSourceKey({
    type: typeFilter,
    status: statusFilter,
    searchQuery,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const currentNonValetSnapshot =
    typeFilter !== 'valet' && hasResolvedData
      ? {
          sourceKey: nonValetSourceKey,
          dataUpdatedAt,
          requests,
          stats,
          total:
            typeFilter === 'visitor' &&
            (statusFilter !== 'all' || searchQuery.trim())
              ? requests.length
              : stats.total,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      : null;

  useEffect(() => {
    if (!currentNonValetSnapshot) return;

    const setSnapshot =
      typeFilter === 'visitor' ? setVisitorSnapshot : setBuffetSnapshot;
    setSnapshot(current => {
      if (
        current?.sourceKey === currentNonValetSnapshot.sourceKey &&
        current.dataUpdatedAt === currentNonValetSnapshot.dataUpdatedAt
      ) {
        return current;
      }
      return currentNonValetSnapshot;
    });
  }, [currentNonValetSnapshot, typeFilter]);

  const retainedNonValetSnapshot =
    typeFilter === 'visitor' ? visitorSnapshot : buffetSnapshot;
  const resolvedNonValetDisplay = resolveRetainedDisplay(
    currentNonValetSnapshot,
    retainedNonValetSnapshot,
  );
  const displayedNonValetSnapshot = resolvedNonValetDisplay.snapshot;
  const displayRequests =
    typeFilter === 'valet'
      ? valetRequests
      : (displayedNonValetSnapshot?.requests ?? []);
  const displayStats =
    typeFilter === 'valet'
      ? (valetStats ?? stats)
      : (displayedNonValetSnapshot?.stats ?? stats);
  const hasUsableDisplayData =
    typeFilter === 'valet'
      ? displayedValetDashboardData !== undefined
      : displayedNonValetSnapshot !== null;
  const activePrimaryError =
    typeFilter === 'valet'
      ? isValetError
      : isError && !(typeFilter === 'visitor' && hasNextPageError);
  const displayIsFetching =
    typeFilter === 'valet' ? isValetFetching : isFetching;
  const primaryListState = resolvePrimaryListState({
    hasUsableData: hasUsableDisplayData,
    isLoading: typeFilter === 'valet' ? isValetLoading : isLoading,
    isFetching: displayIsFetching,
    isError: activePrimaryError,
    isFetchingNextPage:
      typeFilter === 'visitor' && isFetchingNextPage,
  });
  const displayIsLoading = primaryListState.showSkeleton;
  const displayIsRefreshing = primaryListState.isRefreshing;
  const displayIsError = primaryListState.showError;
  const displayHasRefreshError = primaryListState.showRefreshError;
  const isShowingRetainedData =
    typeFilter === 'valet'
      ? retainedValetDashboard.isRetained
      : resolvedNonValetDisplay.isRetained;
  const displayTotal = typeFilter === 'valet'
    ? (displayedValetDashboardData?.summary.totalVisitors ?? 0)
    : (displayedNonValetSnapshot?.total ?? 0);
  const displayedSourceDates =
    typeFilter === 'valet'
      ? retainedValetDashboard.dateKey.split('|')
      : [
          displayedNonValetSnapshot?.startDate,
          displayedNonValetSnapshot?.endDate,
        ];
  const displayedSourceDateLabel = displayedSourceDates[0]
    ? displayedSourceDates[1] &&
      displayedSourceDates[1] !== displayedSourceDates[0]
      ? `${formatDate(displayedSourceDates[0])} - ${formatDate(displayedSourceDates[1])}`
      : formatDate(displayedSourceDates[0])
    : '';
  const tableRequests = useMemo(
    () => displayRequests.map(request => {
      const item = mapAdminRequestToMatrixItem(request);
      return request.type === 'visitor'
        ? { ...item, purpose: getPurposeLabel(request.purpose, t) }
        : item;
    }),
    [displayRequests, t],
  );

  const approveVisitMutation = useApproveVisitMutation();
  const rejectVisitMutation = useRejectVisitMutation();
  const updateBuffetMutation = useUpdateBuffetRequestMutation();
  const updateValetMutation = useUpdateValetAssignmentMutation();

  const handleRefresh = useCallback(() => {
    if (typeFilter === 'valet') {
      return refetchValet();
    }
    return refetch();
  }, [refetch, refetchValet, typeFilter]);

  const invalidateAllQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['all-requests'] });
    queryClient.invalidateQueries({ queryKey: ['visits'] });
    queryClient.invalidateQueries({ queryKey: ['buffet-admin-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['valet-admin-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
  }, [queryClient]);

  const typeFilters: { id: RequestFilter; label: string; icon: IconName }[] = [
    { id: 'visitor', label: t('navigation.allVisitors'), icon: 'users' },
    { id: 'buffet', label: t('services.buffet'), icon: 'cloche' },
    { id: 'valet', label: t('services.valet'), icon: 'navigation' },
  ];

  const getStatusFiltersForType = useCallback((type: RequestFilter): { id: StatusFilter; label: string }[] => {
    const baseFilters: { id: StatusFilter; label: string }[] = [
      { id: 'all', label: t('common.all') },
      { id: 'pending', label: t('status.pending') },
    ];

    switch (type) {
      case 'visitor':
        return [
          ...baseFilters,
          { id: 'approved', label: t('status.approved') },
          { id: 'visitor_accepted', label: t('status.visitorAccepted') },
          { id: 'in_progress', label: t('status.checkedIn') },
          { id: 'completed', label: t('status.checkedOut') },
          { id: 'cancelled', label: t('status.cancelled') },
          { id: 'auto_cancelled', label: t('status.autoCancelled') },
          { id: 'rejected', label: t('status.rejected') },
          { id: 'visitor_rejected', label: t('status.visitorRejected') },
        ];
      case 'buffet':
        // Buffet tasks carry the same visit-lifecycle statuses as regular visits,
        // not the old food-prep statuses (confirmed/preparing/delivered).
        return [
          ...baseFilters,
          { id: 'approved', label: t('status.approved') },
          { id: 'visitor_accepted', label: t('status.visitorAccepted') },
          { id: 'in_progress', label: t('status.checkedIn') },
          { id: 'completed', label: t('status.checkedOut') },
          { id: 'cancelled', label: t('status.cancelled') },
          { id: 'auto_cancelled', label: t('status.autoCancelled') },
          { id: 'rejected', label: t('status.rejected') },
          { id: 'visitor_rejected', label: t('status.visitorRejected') },
        ];
      case 'valet':
        return [
          ...baseFilters,
          { id: 'approved', label: t('status.assigned') },
          { id: 'in_progress', label: t('status.inProgress') },
          { id: 'completed', label: t('status.completed') },
          { id: 'cancelled', label: t('status.cancelled') },
          { id: 'auto_cancelled', label: t('status.autoCancelled') },
        ];
      default:
        return [
          ...baseFilters,
          { id: 'approved', label: t('status.approved') },
          { id: 'in_progress', label: t('status.inProgress') },
          { id: 'completed', label: t('status.completed') },
          { id: 'cancelled', label: t('status.cancelled') },
          { id: 'auto_cancelled', label: t('status.autoCancelled') },
          { id: 'rejected', label: t('status.rejected') },
        ];
    }
  }, [t]);

  const statusFilters = useMemo(() => getStatusFiltersForType(typeFilter), [getStatusFiltersForType, typeFilter]);

  const handleTypeFilterPress = useCallback((nextType: UnifiedRequestType) => {
    setTypeFilter(nextType);
    setStatusFilter(current => getStatusFilterForRequestType(nextType, current) as StatusFilter);
  }, []);

  const handleStatPress = (filter: StatusFilter) => {
    console.log('[AllRequests] handleStatPress called:', filter, 'current:', statusFilter);
    setStatusFilter(statusFilter === filter ? 'all' : filter);
  };

  const handleApprove = useCallback(async (request: UnifiedRequest) => {
    const confirmApprove = () => {
      setActionLoading(true);
      
      if (request.type === 'visitor') {
        approveVisitMutation.mutate(
          { id: request.id },
          {
            onSuccess: () => {
              invalidateAllQueries();
              setActionLoading(false);
            },
            onError: () => {
              setActionLoading(false);
            },
          }
        );
      } else if (request.type === 'buffet') {
        updateBuffetMutation.mutate(
          { id: request.id, data: { status: BuffetRequestStatus.CONFIRMED } },
          {
            onSuccess: () => {
              invalidateAllQueries();
              setActionLoading(false);
            },
            onError: () => {
              setActionLoading(false);
            },
          }
        );
      } else if (request.type === 'valet') {
        updateValetMutation.mutate(
          { id: request.id, data: { status: ValetAssignmentStatus.ACCEPTED } },
          {
            onSuccess: () => {
              invalidateAllQueries();
              setActionLoading(false);
            },
            onError: () => {
              setActionLoading(false);
            },
          }
        );
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('approvals.confirmApprove'))) {
        confirmApprove();
      }
    } else {
      Alert.alert(
        t('actions.approve'),
        t('approvals.confirmApprove'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('actions.approve'), style: 'default', onPress: confirmApprove },
        ]
      );
    }
  }, [approveVisitMutation, updateBuffetMutation, updateValetMutation, invalidateAllQueries, t]);

  const handleReject = useCallback((request: UnifiedRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  }, []);

  const confirmReject = useCallback(() => {
    if (!selectedRequest || !rejectReason.trim()) return;
    
    setActionLoading(true);
    
    if (selectedRequest.type === 'visitor') {
      rejectVisitMutation.mutate(
        { id: selectedRequest.id, payload: { reason: rejectReason } },
        {
          onSuccess: () => {
            invalidateAllQueries();
            setShowRejectModal(false);
            setSelectedRequest(null);
            setActionLoading(false);
          },
          onError: () => {
            setActionLoading(false);
          },
        }
      );
    } else if (selectedRequest.type === 'buffet') {
      updateBuffetMutation.mutate(
        { id: selectedRequest.id, data: { status: BuffetRequestStatus.CANCELLED } },
        {
          onSuccess: () => {
            invalidateAllQueries();
            setShowRejectModal(false);
            setSelectedRequest(null);
            setActionLoading(false);
          },
          onError: () => {
            setActionLoading(false);
          },
        }
      );
    } else if (selectedRequest.type === 'valet') {
      updateValetMutation.mutate(
        { id: selectedRequest.id, data: { status: ValetAssignmentStatus.CANCELLED } },
        {
          onSuccess: () => {
            invalidateAllQueries();
            setShowRejectModal(false);
            setSelectedRequest(null);
            setActionLoading(false);
          },
          onError: () => {
            setActionLoading(false);
          },
        }
      );
    }
  }, [selectedRequest, rejectReason, rejectVisitMutation, updateBuffetMutation, updateValetMutation, invalidateAllQueries]);

  const navigation = useNavigation<NavigationProp<any>>();
  
  const handleCardPress = (request: UnifiedRequest) => {
    if (!request.id) {
      console.warn('Cannot navigate: request ID is undefined');
      return;
    }
    switch (request.type) {
      case 'visitor':
        navigation.navigate(ROUTES.MANAGER_APPROVAL_DETAIL as any, { requestId: request.id } as any);
        break;
      case 'buffet':
        navigation.navigate(ROUTES.BUFFET_REQUEST_DETAILS as any, { request: request.originalData } as any);
        break;
      case 'valet': {
        const valetVisitor = request.originalData as any;
        const valetRequest = {
          id: valetVisitor.requestId || request.id,
          visitorName: valetVisitor.visitorName || request.visitorName,
          visitorCompany: valetVisitor.visitorCompany || request.company || '',
          hostName: valetVisitor.hostName || request.hostName,
          visitDate: valetVisitor.visitDate || request.date,
          pickupTime: valetVisitor.visitTime || '',
          returnTime: '',
          location: valetVisitor.hostDepartment || request.location || '',
          status: valetVisitor.status?.toLowerCase() || 'pending',
          vehicleInfo: valetVisitor.licensePlate ? {
            make: '',
            model: valetVisitor.carModel || '',
            color: valetVisitor.carColor || '',
            plateNumber: valetVisitor.licensePlate,
          } : undefined,
          notes: '',
          createdAt: valetVisitor.visitDate || request.createdAt || '',
          updatedAt: valetVisitor.visitDate || '',
        };
        navigation.navigate(ROUTES.VALET_REQUEST_DETAILS as any, { request: valetRequest } as any);
        break;
      }
    }
  };

  const clearDateFilter = () => {
    if (typeFilter === 'buffet') {
      setBuffetDate(dateKeyToLocalNoon(getBusinessDateKey()));
      return;
    }
    const currentMonth = getCurrentBusinessMonthRange();
    setDateRange({
      startDate: dateKeyToLocalNoon(currentMonth.startDate),
      endDate: dateKeyToLocalNoon(currentMonth.endDate),
    });
  };

  const handleScroll = useCallback(({ nativeEvent }: {
    nativeEvent: {
      layoutMeasurement: { height: number };
      contentOffset: { y: number };
      contentSize: { height: number };
    };
  }) => {
    if (loadingNextPageRef.current) return;
    if (shouldFetchNextVisitPage({
      requestType: typeFilter,
      hasNextPage: Boolean(hasNextPage),
      isFetchingNextPage,
      hasNextPageError,
      viewportHeight: nativeEvent.layoutMeasurement.height,
      scrollOffset: nativeEvent.contentOffset.y,
      contentHeight: nativeEvent.contentSize.height,
    })) {
      loadingNextPageRef.current = true;
      void fetchNextPage().finally(() => {
        loadingNextPageRef.current = false;
      });
    }
  }, [fetchNextPage, hasNextPage, hasNextPageError, isFetchingNextPage, typeFilter]);

  return (
    <ScreenScrollView
      onScroll={handleScroll}
      scrollEventThrottle={250}
      refreshControl={
        <RefreshControl
          refreshing={displayIsRefreshing && !displayIsLoading}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
    >
      <View style={styles.paddedContent}>
        <DirectionalRow style={styles.headerRow}>
          <View>
            <ThemedText style={Typography.title}>{t('navigation.allRequests')}</ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('dashboard.overview')}
            </ThemedText>
          </View>
          <DirectionalRow
            style={[
              styles.viewToggle,
              { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cardView')}
              accessibilityState={{ selected: viewMode === 'card' }}
              onPress={() => setViewMode('card')}
              style={[
                styles.viewToggleButton,
                { backgroundColor: viewMode === 'card' ? theme.primary : 'transparent' },
              ]}
            >
              <DDIcon
                name="grid"
                size={18}
                color={viewMode === 'card' ? theme.buttonText : theme.textSecondary}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.tableView')}
              accessibilityState={{ selected: viewMode === 'table' }}
              onPress={() => setViewMode('table')}
              style={[
                styles.viewToggleButton,
                { backgroundColor: viewMode === 'table' ? theme.primary : 'transparent' },
              ]}
            >
              <DDIcon
                name="list"
                size={18}
                color={viewMode === 'table' ? theme.buttonText : theme.textSecondary}
              />
            </Pressable>
          </DirectionalRow>
        </DirectionalRow>
      </View>

      <Spacer height={Spacing.lg} />

      {(() => {
        const cards = [
          { key: 'all' as const, value: displayStats.total, label: t('common.all'), color: StatusCardColors.all },
          { key: 'pending' as const, value: displayStats.pending, label: t('status.pending'), color: StatusCardColors.pending },
          { key: 'approved' as const, value: displayStats.approved, label: t('status.approved'), color: StatusCardColors.approved },
          { key: 'in_progress' as const, value: displayStats.inProgress, label: t('status.checkedIn'), color: StatusCardColors.inProgress },
          { key: 'completed' as const, value: displayStats.completed, label: t('status.checkedOut'), color: StatusCardColors.done },
          { key: 'cancelled' as const, value: displayStats.cancelled, label: t('status.cancelled'), color: StatusCardColors.cancelled },
          { key: 'rejected' as const, value: displayStats.rejected, label: t('status.rejected'), color: StatusCardColors.rejected },
        ];
        const content = cards.map(card => (
          <StatCard
            key={card.key}
            value={card.value}
            label={card.label}
            color={card.color}
            isActive={statusFilter === card.key}
            onPress={() => handleStatPress(card.key)}
            theme={theme}
            isLargeScreen={isLargeScreen}
          />
        ));
        return isLargeScreen ? (
          <View style={styles.paddedContent}>
            <DirectionalRow style={styles.statsRow}>{content}</DirectionalRow>
          </View>
        ) : (
          <RTLHorizontalScrollView
            showsHorizontalScrollIndicator={false}
            style={styles.statsScrollContainer}
            contentContainerStyle={styles.statsScrollContent}
            nestedScrollEnabled={true}
          >
            {content}
          </RTLHorizontalScrollView>
        );
      })()}

      <Spacer height={Spacing.lg} />

      <View style={styles.paddedContent}>
        <DirectionalRow style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <SearchInput
              placeholder={t('common.search')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable 
            style={[
              styles.dateFilterButton, 
              { 
                backgroundColor: hasDateFilter ? applyOpacity(theme.primary, '12') : theme.surface,
                borderColor: hasDateFilter ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <DDIcon 
              name="calendar" 
              size={18} 
              color={hasDateFilter ? theme.primary : theme.textSecondary} 
            />
          </Pressable>
        </DirectionalRow>

        {hasDateFilter ? (
          <>
            <Spacer height={Spacing.sm} />
            <Pressable 
              style={[styles.dateChip, { backgroundColor: applyOpacity(theme.primary, '12') }]}
              onPress={clearDateFilter}
            >
              <DDIcon name="calendar" size={14} color={theme.primary} />
              <ThemedText style={[styles.dateChipText, { color: theme.primary }]}>
                {activeDateRange.endDate && activeDateRange.startDate && activeDateRange.endDate.getTime() !== activeDateRange.startDate.getTime()
                  ? `${formatDate(localCalendarDateToKey(activeDateRange.startDate))} - ${formatDate(localCalendarDateToKey(activeDateRange.endDate))}`
                  : formatDate(localCalendarDateToKey(activeDateRange.startDate!))}
              </ThemedText>
              <DDIcon name="x" size={14} color={theme.primary} />
            </Pressable>
          </>
        ) : null}
      </View>

      <Spacer height={Spacing.md} />

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersRow}
        nestedScrollEnabled={true}
      >
        {typeFilters.map(filter => (
          <TouchableOpacity
            activeOpacity={0.7}
            key={filter.id}
            style={[
              styles.filterChip,
              { 
                backgroundColor: typeFilter === filter.id ? theme.primary : theme.surface,
                borderColor: typeFilter === filter.id ? theme.primary : theme.border,
              }
            ]}
            onPress={() => handleTypeFilterPress(filter.id)}
          >
            <DDIcon 
              name={filter.icon} 
              size={14} 
              color={typeFilter === filter.id ? theme.buttonText : theme.textSecondary} 
            />
            <ThemedText 
              style={[
                styles.filterChipText, 
                { color: typeFilter === filter.id ? theme.buttonText : theme.text }
              ]}
            >
              {filter.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </RTLHorizontalScrollView>

      {shouldShowAllRequestsStatusFilters(typeFilter) ? (
        <>
          <Spacer height={Spacing.sm} />
          <RTLHorizontalScrollView
            showsHorizontalScrollIndicator={false}
            style={styles.statusFiltersContainer}
            contentContainerStyle={styles.statusFiltersRow}
            nestedScrollEnabled={true}
          >
            {statusFilters.map(filter => (
              <TouchableOpacity
                activeOpacity={0.7}
                key={filter.id}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: statusFilter === filter.id ? applyOpacity(theme.info, '12') : 'transparent',
                    borderColor: statusFilter === filter.id ? theme.info : theme.border,
                  }
                ]}
                onPress={() => setStatusFilter(filter.id)}
              >
                <ThemedText
                  style={[
                    styles.statusChipText,
                    { color: statusFilter === filter.id ? theme.info : theme.textSecondary }
                  ]}
                >
                  {filter.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </RTLHorizontalScrollView>
        </>
      ) : null}

      <Spacer height={Spacing.lg} />

      {displayIsLoading ? (
        <LoadingSkeleton />
      ) : displayIsError ? (
        <View style={styles.paddedContent}>
          <EmptyState
            icon="alert-circle"
            title={t('errors.somethingWentWrong')}
            message={t('errors.tryAgain')}
          />
          <Spacer height={Spacing.md} />
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={handleRefresh}
          >
            <ThemedText style={[styles.retryButtonText, { color: theme.buttonText }]}>
              {t('common.retry')}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.paddedContent}>
          <View style={styles.resultsSummary}>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('dashboard.showingXofY')
                .replace('{{shown}}', String(displayRequests.length))
                .replace('{{total}}', String(displayTotal))}
            </ThemedText>
            {displayIsRefreshing ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : null}
          </View>

          {isShowingRetainedData || displayHasRefreshError ? (
            <>
              <Spacer height={Spacing.sm} />
              <DirectionalRow
                style={[
                  styles.refreshNotice,
                  {
                    backgroundColor: applyOpacity(
                      displayHasRefreshError && !displayIsRefreshing
                        ? theme.error
                        : theme.info,
                      '08',
                    ),
                    borderColor: applyOpacity(
                      displayHasRefreshError && !displayIsRefreshing
                        ? theme.error
                        : theme.info,
                      '24',
                    ),
                  },
                ]}
              >
                <View style={styles.refreshNoticeText}>
                  {isShowingRetainedData && displayedSourceDateLabel ? (
                    <ThemedText
                      style={[
                        Typography.bodySmall,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t('requests.showingPreviousDataFor').replace(
                        '{{date}}',
                        displayedSourceDateLabel,
                      )}
                    </ThemedText>
                  ) : null}
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        color:
                          displayHasRefreshError && !displayIsRefreshing
                            ? theme.error
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {displayIsRefreshing
                      ? t('common.loading')
                      : t('common.loadError')}
                  </ThemedText>
                </View>
                {displayHasRefreshError && !displayIsRefreshing ? (
                  <Pressable
                    style={[
                      styles.refreshRetryButton,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={handleRefresh}
                  >
                    <ThemedText
                      style={[
                        styles.refreshRetryButtonText,
                        { color: theme.buttonText },
                      ]}
                    >
                      {t('common.retry')}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
              </DirectionalRow>
            </>
          ) : null}

          <Spacer height={Spacing.md} />

          {displayRequests.length > 0 && viewMode === 'table' ? (
            <VisitorMatrixTable
              visitors={tableRequests}
              variant="matrix"
              showApproveReject={displayRequests.some(request => request.canApprove)}
              onApprove={(requestId) => {
                const request = displayRequests.find(item => item.id === requestId);
                if (request) handleApprove(request);
              }}
              onReject={(requestId) => {
                const request = displayRequests.find(item => item.id === requestId);
                if (request) handleReject(request);
              }}
              onPressRow={(requestId) => {
                const request = displayRequests.find(item => item.id === requestId);
                if (request) handleCardPress(request);
              }}
            />
          ) : displayRequests.length > 0 ? (
            <View style={styles.cardGrid}>
              {displayRequests.map(request => {
                const cardKey = `${request.type}-${request.id}`;
                return (
                  <View 
                    key={cardKey}
                    style={getCardStyle}
                  >
                    <RequestCard
                      request={request}
                      onPress={() => handleCardPress(request)}
                      onApprove={() => handleApprove(request)}
                      onReject={() => handleReject(request)}
                      theme={theme}
                      t={t}
                      formatDate={formatDate}
                      formatTimeFromString={formatTimeFromString}
                      toLocalNumerals={toLocalNumerals}
                      isRTL={isRTL}
                      isExpanded={expandedCards.has(cardKey)}
                      onToggleExpand={() => toggleCardExpanded(cardKey)}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="inbox"
              title={t('common.noResults')}
              message={t('requests.tryDifferentFilters')}
            />
          )}
          {typeFilter === 'visitor' && isFetchingNextPage ? (
            <View style={styles.nextPageLoader}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null}
          {typeFilter === 'visitor' && hasNextPageError ? (
            <View style={styles.nextPageError}>
              <ThemedText style={[Typography.bodySmall, { color: theme.error }]}>
                {t('errors.tryAgain')}
              </ThemedText>
              <Pressable
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={() => void fetchNextPage()}
              >
                <ThemedText style={[styles.retryButtonText, { color: theme.buttonText }]}>
                  {t('common.retry')}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}

      <Spacer height={Spacing.xxl} />

      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={activeDateRange.startDate || new Date()}
        dateRange={typeFilter === 'buffet' ? undefined : dateRange}
        mode={getAdminDatePickerMode(typeFilter)}
        onDateSelect={(date) => {
          if (typeFilter === 'buffet') {
            setBuffetDate(date);
          } else {
            setDateRange({ startDate: date, endDate: date });
          }
        }}
        onRangeSelect={(range) => {
          if (typeFilter !== 'buffet') {
            setDateRange(range);
          }
        }}
        allowPastDates={true}
      />

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!actionLoading) {
            setShowRejectModal(false);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={Keyboard.dismiss}
          accessible={false}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoidingView}
            pointerEvents="box-none"
            accessibilityViewIsModal
          >
            <Pressable
              style={[styles.modalContainer, { backgroundColor: theme.surface }]}
              onPress={(event) => {
                event.stopPropagation();
                Keyboard.dismiss();
              }}
              accessible={false}
            >
            <ThemedText style={[Typography.subtitle, { marginBottom: Spacing.md }]}>
              {t('actions.reject')}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.lg }]}>
              {t('approvals.enterRejectReason')}
            </ThemedText>
            <TextInput
              style={[
                styles.reasonInput,
                { 
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: getInputFontFamily(rejectReason, isRTL),
                }
              ]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t('approvals.rejectReasonPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!actionLoading}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: applyOpacity(theme.error, '12') }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                }}
                disabled={actionLoading}
              >
                <ThemedText style={[styles.modalButtonText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton, 
                  { 
                    backgroundColor: theme.error,
                    opacity: !rejectReason.trim() || actionLoading ? 0.5 : 1,
                  }
                ]}
                onPress={confirmReject}
                disabled={!rejectReason.trim() || actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                    {t('actions.reject')}
                  </ThemedText>
                )}
              </Pressable>
            </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: ALL_REQUESTS_GRID_PADDING_SIDE,
  },
  headerRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  viewToggle: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: 2,
    overflow: 'hidden',
  },
  viewToggleButton: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xs,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // No CSS gap — inter-column spacing is baked into the pixel cardWidth
    // via ALL_REQUESTS_GRID_GAP inside computeAllRequestsCardWidth.
  },
  nextPageLoader: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  nextPageError: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statsScrollContainer: {
    marginHorizontal: -Spacing.xl,
  },
  statsScrollContent: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  statCard: {
    minWidth: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    overflow: 'visible',
  },
  statCardFlex: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 34,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
  },
  dateFilterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filtersContainer: {
    marginHorizontal: -Spacing.xl,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  statusFiltersContainer: {
    marginHorizontal: -Spacing.xl,
  },
  statusFiltersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterChipText: {
    fontSize: 13,
    lineHeight: 24,
    fontWeight: '500',
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 12,
    lineHeight: 22,
    fontWeight: '500',
  },
  resultsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshNotice: {
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
    justifyContent: 'space-between',
    padding: Spacing.sm,
  },
  refreshNoticeText: {
    flex: 1,
    gap: 2,
  },
  refreshRetryButton: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  refreshRetryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  requestCard: {
    borderRadius: LAYOUT.cardRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typeAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    borderTopStartRadius: LAYOUT.cardRadius,
    borderBottomStartRadius: LAYOUT.cardRadius,
  },
  cardContent: {
    padding: LAYOUT.cardPadding,
    paddingStart: LAYOUT.cardPadding + 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
  },
  detailSeparator: {
    fontSize: 13,
  },
  timingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  timingCell: {
    minWidth: 86,
    flexShrink: 1,
  },
  timingLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  timingValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandedSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  expandedDetailRow: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  expandedDetailText: {
    fontSize: 13,
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 4,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skeletonCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  skeletonLine: {
    height: 16,
    borderRadius: BorderRadius.sm,
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignSelf: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  modalKeyboardAvoidingView: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
