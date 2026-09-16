import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useViewMode } from "@/hooks/useViewMode";
import { View, StyleSheet, Pressable, Alert, Switch, FlatList, ActivityIndicator, Modal, Platform, RefreshControl, useWindowDimensions } from "react-native";
import type { AllVisitorsScreenProps } from "@/types/receptionistNavigation.types";
import { ROUTES } from "@/constants";
import { SkeletonList, RTLHorizontalScrollView, VisitorMatrixTable, FilterChip, VisitorRequestCard } from "@/components/shared";
import type { VisitorMatrixItem } from "@/components/shared";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchInput } from "@/components/SearchInput";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { useInfiniteVisitsQuery } from "@/hooks/queries/useApprovalQueries";
import type { VisitListParams, VisitListItemDto } from "@/types";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import {
  formatVisitDateLabel,
  groupVisitsByDate,
} from "@/utils/groupVisitsByDate";
import { mapVisitListItemToVisitorRequest } from "@/utils/requestMappers";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import {
  getReceptionistStatusSources,
  getReceptionistDateRange,
  isReceptionistAllVisitorsRecordVisible,
  type ReceptionistDateFilter,
} from "@/utils/receptionistVisitorRules";
import { canAutomaticallyFetchNextPage } from "@/utils/queryPaginationState";
import { useRetainedDatedData } from "@/hooks/useRetainedDatedData";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsPendingHostWalkInExpired,
  getPendingApprovalWalkInScheduledEndMs,
} from "@/utils/visitExpiredGuard";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";

type DateFilter = ReceptionistDateFilter;
type StatusFilter = 
  | 'all'
  | 'waiting_acceptance'
  | 'accepted';

const RECEPTIONIST_ALLOWED_STATUSES = [
  'waiting_acceptance',
  'accepted',
  'visitor_accepted',
  'pending_host_approval',
];

function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  return getReceptionistDateRange(filter);
}

function toDateKey(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapStatusesToApi(statuses: Set<StatusFilter>): string | undefined {
  if (statuses.has('all') || statuses.size === 0) {
    return undefined;
  }
  const apiStatuses: string[] = [];
  for (const s of statuses) {
    if (s === 'all') continue;
    if (s === 'accepted') {
      apiStatuses.push('accepted', 'visitor_accepted');
    } else {
      apiStatuses.push(s);
    }
  }
  return apiStatuses.length > 0 ? apiStatuses.join(',') : undefined;
}

const PAGE_SIZE = 20;

const parseTimeToMinutes = (timeStr: string | undefined | null): number => {
  if (!timeStr) return Infinity;
  const cleanTime = timeStr.trim().toUpperCase();
  const isPM = cleanTime.includes('PM');
  const isAM = cleanTime.includes('AM');
  const timePart = cleanTime.replace(/\s*(AM|PM)\s*/gi, '').trim();
  const parts = timePart.split(':');
  if (parts.length < 2) return Infinity;
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return Infinity;
  if (isAM || isPM) {
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
};

export default function AllVisitorsScreen({ navigation, route }: AllVisitorsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL, localeCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();
  
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth >= 900 ? 3 : screenWidth >= 600 ? 2 : 1;
  
  const initialFilter = route.params?.initialFilter ?? null;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_week');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<StatusFilter>>(new Set(['all']));
  const [isWalkInFilter, setIsWalkInFilter] = useState(initialFilter === 'walk_in');
  const [customDateRange, setCustomDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [showQuickDatePicker, setShowQuickDatePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [viewMode, setViewMode] = useViewMode('allVisitors');

  useEffect(() => {
    if (!searchQuery) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectedDateRange = useMemo(
    () =>
      dateFilter === 'custom' && customDateRange.startDate
        ? {
            startDate: toDateKey(customDateRange.startDate),
            endDate: toDateKey(customDateRange.endDate ?? customDateRange.startDate),
          }
        : getDateRange(dateFilter),
    [customDateRange, dateFilter],
  );
  const queryParams: Omit<VisitListParams, 'page'> = useMemo(() => ({
    ...selectedDateRange,
    status: mapStatusesToApi(selectedStatuses),
    search: debouncedSearch || undefined,
    isWalkIn: isWalkInFilter || undefined,
    myRequestsOnly: false,
    limit: PAGE_SIZE,
  }), [selectedDateRange, selectedStatuses, debouncedSearch, isWalkInFilter]);

  const { 
    data, 
    isLoading, 
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isError, 
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteVisitsQuery(queryParams);
  const retainedInput = useMemo(
    () => (data ? { data, queryParams } : undefined),
    [data, queryParams],
  );
  const retainedQuery = useRetainedDatedData(JSON.stringify(queryParams), retainedInput);
  const displayedData = retainedQuery.data?.data;
  const displayedQueryParams = retainedQuery.data?.queryParams ?? queryParams;
  const displayedQuerySourceLabel = useMemo(() => {
    const sourceParts: string[] = [];
    if (displayedQueryParams.startDate) {
      sourceParts.push(
        displayedQueryParams.endDate &&
          displayedQueryParams.endDate !== displayedQueryParams.startDate
          ? `${displayedQueryParams.startDate} – ${displayedQueryParams.endDate}`
          : displayedQueryParams.startDate,
      );
    }
    if (displayedQueryParams.isWalkIn) {
      sourceParts.push(t('visitor.walkIn'));
    } else {
      for (const statusSource of getReceptionistStatusSources(displayedQueryParams.status)) {
        sourceParts.push(
          statusSource === 'waiting_acceptance'
            ? t('status.waitingAcceptance')
            : t('status.accepted'),
        );
      }
    }
    if (displayedQueryParams.search) {
      sourceParts.push(`${t('common.search')}: “${displayedQueryParams.search}”`);
    }
    return sourceParts.join(' · ') || t('common.all');
  }, [displayedQueryParams, t]);

  const DATE_FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'today', label: t('time.today') },
    { key: 'this_week', label: t('time.thisWeek') },
    { key: 'this_month', label: t('time.thisMonth') },
  ];

  const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'waiting_acceptance', label: t('status.waitingAcceptance') },
    { key: 'accepted', label: t('status.accepted') },
  ];

  const visitors = useMemo(() => {
    if (!displayedData?.pages) return [];
    const allItems = displayedData.pages
      .flatMap(page => page.data)
      .filter((visitor) => isReceptionistAllVisitorsRecordVisible(visitor));
    return [...allItems].sort((a, b) => {
      const dateA = a.visitDate || '';
      const dateB = b.visitDate || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const timeA = parseTimeToMinutes(a.visitTime);
      const timeB = parseTimeToMinutes(b.visitTime);
      return timeA - timeB;
    });
  }, [displayedData]);
  const expirationBoundaries = useMemo(
    () =>
      visitors.map((visitor) =>
        getPendingApprovalWalkInScheduledEndMs({
          isWalkIn: visitor.isWalkIn,
          status: visitor.status,
          visitDate: visitor.visitDate,
          visitTime: visitor.visitTime,
          endTime: visitor.endTime,
          duration: visitor.duration,
        }),
      ),
    [visitors],
  );
  const expirationTick = useTimeBoundaryTick(expirationBoundaries);

  const groupedVisitors = useMemo(() => {
    const todayKey = riyadhBusinessDateKey;
    const rangeIncludesToday =
      (!displayedQueryParams.startDate || displayedQueryParams.startDate <= todayKey) &&
      (!displayedQueryParams.endDate || displayedQueryParams.endDate >= todayKey);

    return groupVisitsByDate(
      visitors,
      rangeIncludesToday ? [todayKey] : [],
    ).sort((a, b) => {
        if (a.date === 'unknown') return 1;
        if (b.date === 'unknown') return -1;
        return b.date.localeCompare(a.date);
      });
  }, [displayedQueryParams, visitors, riyadhBusinessDateKey]);

  const totalCount = visitors.length;

  const toMatrixItem = useCallback((v: VisitListItemDto): VisitorMatrixItem => {
    const isExpired = computeIsPendingHostWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
    }) || computeIsPendingApprovalWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
      visitTime: v.visitTime,
      endTime: v.endTime,
      duration: v.duration,
    });

    return {
      id: v.id,
      visitorName: v.visitor.fullName,
      company: v.visitor.company ?? undefined,
      visitDate: v.visitDate ?? undefined,
      plannedInTime: v.visitTime,
      plannedOutTime: v.endTime ?? undefined,
      // Keep the raw status so Pending Host Approval remains distinguishable
      // from the separately-rendered expired notice.
      status: v.status,
      actualInTime: v.checkedInAt ?? undefined,
      actualOutTime: v.checkedOutAt ?? undefined,
      hasParking: resolveParkingDisplayDecision({
        parkingDecision: (v as any).parkingDecision,
        visitorNeedsParking: v.visitorNeedsParking,
        isVisitorNeedsParking: v.isVisitorNeedsParking,
        hasParking: v.hasParking,
      }) === 'required',
      hasBuffet: !!(v.hasBuffet || v.isBuffet),
      hasValet: !!v.hasValet,
      hasMeetingRoom: !!(v.hasMeetingRoom || v.isMeetingRoom),
      hostName: v.employeeName ?? undefined,
      hostDepartment: undefined,
      purpose: v.purpose ?? undefined,
      isExpired,
    };
  }, [expirationTick, riyadhBusinessDateKey]);

  const hasShownError = useRef(false);

  useEffect(() => {
    if (isError && !isFetchNextPageError && error && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(t('common.error'), (error as Error)?.message || t('common.loadError'));
    }
    if (!isError || isFetchNextPageError) {
      hasShownError.current = false;
    }
  }, [isError, isFetchNextPageError, error, t]);


  const handleVisitorPress = useCallback((visitor: VisitListItemDto) => {
    navigation.navigate(ROUTES.VISITOR_DETAIL as any, { visitId: visitor.id } as any);
  }, [navigation]);

  const handleEndReached = useCallback(() => {
    if (
      canAutomaticallyFetchNextPage({
        hasNextPage,
        isFetching,
        isFetchNextPageError,
      })
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  const getSelectedDateLabel = () => {
    if (dateFilter === 'custom') {
      return t('visitor.date');
    }
    const option = DATE_FILTER_OPTIONS.find(o => o.key === dateFilter);
    return option?.label || t('common.all');
  };

  const handleWalkInToggle = useCallback(() => {
    const newWalkInState = !isWalkInFilter;
    setIsWalkInFilter(newWalkInState);
    if (newWalkInState) {
      setSelectedStatuses(new Set());
    } else {
      setSelectedStatuses(new Set(['all']));
    }
  }, [isWalkInFilter]);

  const handleStatusChipPress = useCallback((status: StatusFilter) => {
    if (status === 'all') {
      setSelectedStatuses(new Set(['all']));
      setIsWalkInFilter(false);
    } else {
      setSelectedStatuses(prev => {
        const newSet = new Set(prev);
        newSet.delete('all');
        
        if (newSet.has(status)) {
          newSet.delete(status);
          if (newSet.size === 0) {
            return new Set(['all']);
          }
        } else {
          newSet.add(status);
        }
        return newSet;
      });
      setIsWalkInFilter(false);
    }
  }, []);

  const renderVisitorCard = useCallback(({ item }: { item: VisitListItemDto }) => {
    const isExpired = computeIsPendingHostWalkInExpired({
      isWalkIn: item.isWalkIn,
      status: item.status,
      visitDate: item.visitDate,
    }) || computeIsPendingApprovalWalkInExpired({
      isWalkIn: item.isWalkIn,
      status: item.status,
      visitDate: item.visitDate,
      visitTime: item.visitTime,
      endTime: item.endTime,
      duration: item.duration,
    });

    return (
      <VisitorRequestCard
        request={mapVisitListItemToVisitorRequest(item)}
        hostName={item.employeeName}
        isExpired={isExpired}
        showExpiredState={true}
        onPress={() => handleVisitorPress(item)}
      />
    );
  }, [expirationTick, handleVisitorPress, riyadhBusinessDateKey]);

  const renderFooter = useCallback(() => {
    if (isFetchNextPageError) {
      return (
        <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.error, '10') }]}>
          <DDIcon name="alert-circle" size={16} color={theme.error} />
          <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
            {t('common.loadError')}
          </ThemedText>
          <Pressable onPress={() => fetchNextPage()} hitSlop={8}>
            <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
              {t('common.retry')}
            </ThemedText>
          </Pressable>
        </DirectionalRow>
      );
    }
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: Spacing.sm }]}>
          {t('common.loading')}...
        </ThemedText>
      </View>
    );
  }, [fetchNextPage, isFetchNextPageError, isFetchingNextPage, theme, t]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <DDIcon name="users" size={40} variant="muted" />
        <Spacer height={Spacing.sm} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.noResults')}
        </ThemedText>
      </View>
    );
  }, [isLoading, theme, t]);

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    options: { key: string; label: string }[],
    selectedKey: string,
    onSelect: (key: string) => void,
    title: string
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.pickerModal, { backgroundColor: theme.surface }]}>
          <ThemedText style={[Typography.subtitle, { marginBottom: Spacing.md }]}>{title}</ThemedText>
          {options.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.pickerOption,
                selectedKey === option.key && { backgroundColor: applyOpacity(theme.primary, '15') }
              ]}
              onPress={() => {
                onSelect(option.key as any);
                onClose();
              }}
            >
              <ThemedText style={[
                Typography.body,
                { color: selectedKey === option.key ? theme.primary : theme.text }
              ]}>
                {option.label}
              </ThemedText>
              {selectedKey === option.key ? (
                <DDIcon name="check" size={18} color={theme.primary} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  const getStatusChipColor = useCallback((status: StatusFilter) => {
    switch (status) {
      case 'all':
        return theme.primary;
      case 'waiting_acceptance':
        return theme.warning;
      case 'accepted':
        return theme.info;
      default:
        return theme.textSecondary;
    }
  }, [theme]);

  const renderDateGroupHeader = useCallback((date: string, count: number) => (
    <DirectionalRow
      style={[
        styles.dateGroupHeader,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.dateGroupAccent, { backgroundColor: theme.primary }]} />
      <ThemedText style={[styles.dateGroupLabel, { color: theme.text }]}>
        {date === 'unknown'
          ? t('visitor.date')
          : formatVisitDateLabel(date, localeCode, {
              today: t('common.today'),
              tomorrow: t('time.tomorrow'),
            })}
      </ThemedText>
      <ThemedText style={[styles.dateGroupCount, { color: theme.textSecondary }]}>
        {count}
      </ThemedText>
    </DirectionalRow>
  ), [localeCode, t, theme]);

  const ListHeader = useMemo(() => (
    <View>
      {/* Title row with count and view toggle */}
      <DirectionalRow style={{ justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '700' }]}>
            {t('navigation.allVisitors')}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
            {totalCount} {totalCount === 1 ? t('reception.visitorsFound') : t('reception.visitorsFoundPlural')}
            {isFetching && !isFetchingNextPage ? ' ...' : ''}
          </ThemedText>
        </View>
        <DirectionalRow style={styles.viewToggle}>
          <Pressable
            style={[styles.viewToggleBtn, styles.viewToggleBtnLeft, { backgroundColor: viewMode === 'card' ? theme.primary : theme.surface, borderColor: theme.border }]}
            onPress={() => setViewMode('card')}
          >
            <DDIcon name="grid" size={16} color={viewMode === 'card' ? theme.buttonText : theme.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.viewToggleBtn, styles.viewToggleBtnRight, { backgroundColor: viewMode === 'list' ? theme.primary : theme.surface, borderColor: theme.border }]}
            onPress={() => setViewMode('list')}
          >
            <DDIcon name="menu" size={16} color={viewMode === 'list' ? theme.buttonText : theme.textSecondary} />
          </Pressable>
        </DirectionalRow>
      </DirectionalRow>

      <Spacer height={Spacing.lg} />

      {/* Search bar with date picker button */}
      <DirectionalRow style={{ gap: Spacing.sm, alignItems: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <SearchInput
            placeholder={t('reception.searchVisitor')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={[styles.datePickerButton, { backgroundColor: theme.surface, borderColor: theme.border, height: 44 }]}
          onPress={() => setShowQuickDatePicker(true)}
        >
          <DDIcon name="calendar" size={18} color={theme.primary} />
          <ThemedText style={[styles.datePickerLabel, { color: theme.text }]} numberOfLines={1}>
            {getSelectedDateLabel()}
          </ThemedText>
          <DDIcon name="chevron-down" size={14} variant="muted" />
        </Pressable>
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      {/* Horizontal scrollable status chips: All → Walk-In → other statuses */}
      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusChipsContainer}
      >
        {/* All chip — always first */}
        {STATUS_FILTER_OPTIONS.filter(o => o.key === 'all').map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            isSelected={selectedStatuses.has(option.key)}
            onPress={() => handleStatusChipPress(option.key)}
          />
        ))}

        {/* Walk-In chip — always second */}
        <FilterChip
          label={t('common.walkIn')}
          isSelected={isWalkInFilter}
          color={theme.warning}
          icon="user-plus"
          onPress={handleWalkInToggle}
        />

        {/* Remaining status chips (hidden when Walk-In is active) */}
        {!isWalkInFilter ? STATUS_FILTER_OPTIONS.filter(o => o.key !== 'all').map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            isSelected={selectedStatuses.has(option.key)}
            color={getStatusChipColor(option.key)}
            onPress={() => handleStatusChipPress(option.key)}
          />
        )) : null}

        <FilterChip
          label={t('time.today')}
          icon="calendar"
          color={theme.primary}
          isSelected={dateFilter === 'today'}
          onPress={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
          onClear={dateFilter === 'today' ? () => setDateFilter('all') : undefined}
          clearAccessibilityLabel={t('common.clear')}
        />

        <FilterChip
          label={t('visitor.date')}
          icon="calendar"
          color={theme.primary}
          isSelected={dateFilter === 'custom'}
          onPress={() => setShowCustomDatePicker(true)}
          onClear={() => {
            setCustomDateRange({ startDate: null, endDate: null });
            setDateFilter('all');
          }}
          clearAccessibilityLabel={t('common.clear')}
        />
      </RTLHorizontalScrollView>

      <Spacer height={Spacing.md} />
    </View>
  ), [t, theme, totalCount, isFetching, isFetchingNextPage, searchQuery, isWalkInFilter, selectedStatuses, dateFilter, getSelectedDateLabel, getStatusChipColor, STATUS_FILTER_OPTIONS, isRTL, handleWalkInToggle, handleStatusChipPress, viewMode, setViewMode]);

  if (isLoading && !displayedData) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg, backgroundColor: theme.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (isError && !displayedData) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
        <Spacer height={Spacing.md} />
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('common.retry')}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {viewMode === 'list' ? <FlatList
          key="flatlist-table"
          data={[]}
          extraData={expirationTick}
          renderItem={() => null}
          keyExtractor={() => '_'}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          }}
          ListHeaderComponent={
            <View>
              {ListHeader}
              {retainedQuery.isRetained ? (
                <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.primary, '10') }]}>
                  <DDIcon name="info" size={16} color={theme.primary} />
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, flex: 1 }]}>
                  {t('requests.showingPreviousDataFrom').replace('{{source}}', displayedQuerySourceLabel)}
                  </ThemedText>
                  {isError ? (
                    <Pressable onPress={() => refetch()} hitSlop={8}>
                      <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                        {t('common.retry')}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </DirectionalRow>
              ) : isError && !isFetchNextPageError ? (
                <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.error, '10') }]}>
                  <DDIcon name="alert-circle" size={16} color={theme.error} />
                  <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
                    {t('common.loadError')}
                  </ThemedText>
                  <Pressable onPress={() => refetch()} hitSlop={8}>
                    <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                      {t('common.retry')}
                    </ThemedText>
                  </Pressable>
                </DirectionalRow>
              ) : isFetching && !isFetchingNextPage ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : null}
              <Spacer height={Spacing.md} />
              {groupedVisitors.map((group, index) => (
                <View key={group.date}>
                  {renderDateGroupHeader(group.date, group.visits.length)}
                  <Spacer height={Spacing.md} />
                  <VisitorMatrixTable
                    variant="matrix"
                    visitors={group.visits.map(toMatrixItem)}
                    showExpiredState={true}
                    onPressRow={(id) => {
                      const visitor = group.visits.find((item) => item.id === id);
                      if (visitor) handleVisitorPress(visitor);
                    }}
                    emptyMessage={t('common.noResults')}
                  />
                  {index < groupedVisitors.length - 1 ? (
                    <Spacer height={Spacing.xl} />
                  ) : null}
                </View>
              ))}
            </View>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={groupedVisitors.length === 0 ? renderEmpty : null}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={refetch} tintColor={theme.primary} />}
        /> : <FlatList
          key={`flatlist-${numColumns}`}
          data={groupedVisitors}
          extraData={expirationTick}
          renderItem={({ item: group }) => (
            <View style={styles.dateGroupSection}>
              {renderDateGroupHeader(group.date, group.visits.length)}
              <Spacer height={Spacing.md} />
              <View style={styles.groupedVisitorGrid}>
                {group.visits.map((visitor) => (
                  <View
                    key={visitor.id}
                    style={numColumns === 3 ? styles.gridItem3 : numColumns === 2 ? styles.gridItem2 : styles.singleColumnItem}
                  >
                    {renderVisitorCard({ item: visitor })}
                  </View>
                ))}
              </View>
            </View>
          )}
          keyExtractor={(group) => group.date}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          }}
          ListHeaderComponent={
            <View>
              {ListHeader}
              {retainedQuery.isRetained ? (
                <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.primary, '10') }]}>
                  <DDIcon name="info" size={16} color={theme.primary} />
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, flex: 1 }]}>
                    {t('requests.showingPreviousDataFrom').replace('{{source}}', displayedQuerySourceLabel)}
                  </ThemedText>
                  {isError ? (
                    <Pressable onPress={() => refetch()} hitSlop={8}>
                      <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                        {t('common.retry')}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </DirectionalRow>
              ) : isError && !isFetchNextPageError ? (
                <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.error, '10') }]}>
                  <DDIcon name="alert-circle" size={16} color={theme.error} />
                  <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>
                    {t('common.loadError')}
                  </ThemedText>
                  <Pressable onPress={() => refetch()} hitSlop={8}>
                    <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                      {t('common.retry')}
                    </ThemedText>
                  </Pressable>
                </DirectionalRow>
              ) : isFetching && !isFetchingNextPage ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : null}
            </View>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={refetch} tintColor={theme.primary} />}
        />}

      {renderPickerModal(
        showQuickDatePicker,
        () => setShowQuickDatePicker(false),
        DATE_FILTER_OPTIONS,
        dateFilter,
        (key) => setDateFilter(key as DateFilter),
        t('time.selectDate')
      )}
      <CalendarDatePicker
        visible={showCustomDatePicker}
        onClose={() => setShowCustomDatePicker(false)}
        mode="range"
        dateRange={customDateRange}
        allowPastDates
        onDateSelect={(date) => {
          setCustomDateRange({ startDate: date, endDate: date });
          setDateFilter('custom');
          setShowCustomDatePicker(false);
        }}
        onRangeSelect={(range) => {
          setCustomDateRange(range);
          setDateFilter('custom');
          setShowCustomDatePicker(false);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridItem3: {
    flexBasis: '32%',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '32%',
    minWidth: 0,
  },
  gridItem2: {
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '48%',
    minWidth: 0,
  },
  singleColumnItem: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  dateGroupSection: {
    marginBottom: Spacing.xl,
  },
  groupedVisitorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  dateGroupHeader: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 42,
    overflow: 'hidden',
    paddingEnd: Spacing.md,
  },
  dateGroupAccent: {
    alignSelf: 'stretch',
    width: 4,
    marginEnd: Spacing.sm,
  },
  dateGroupLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  dateGroupCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  filtersRow: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterDropdown: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterDropdownText: {
    flex: 1,
    fontSize: 13,
  },
  filterChip: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  visitorCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  statusBorderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    borderTopStartRadius: BorderRadius.lg,
    borderBottomStartRadius: BorderRadius.lg,
  },
  cardContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingStart: Spacing.lg,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  nameSection: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  nameRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  visitorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  companyText: {
    fontSize: 11,
    marginTop: 1,
  },
  separator: {
    fontSize: 12,
  },
  detailsRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  servicesStatusRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  servicesRow: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  statusArea: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  servicePill: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedSection: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  expandedDetailRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandedDetailText: {
    fontSize: 13,
    flex: 1,
  },
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardFooter: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
    minHeight: 28,
  },
  actionButtons: {
    gap: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  loadingContainer: {
    flex: 1,
  },
  footerLoader: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  inlineFeedback: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  pickerModal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 120,
  },
  datePickerLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusChipsContainer: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusChipText: {
    fontSize: 12,
    lineHeight: 22,
    fontWeight: '500',
  },
  viewToggle: {
    flexShrink: 0,
  },
  viewToggleBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  viewToggleBtnLeft: {
    borderTopStartRadius: BorderRadius.sm,
    borderBottomStartRadius: BorderRadius.sm,
    borderEndWidth: 0,
  },
  viewToggleBtnRight: {
    borderTopEndRadius: BorderRadius.sm,
    borderBottomEndRadius: BorderRadius.sm,
  },
});
