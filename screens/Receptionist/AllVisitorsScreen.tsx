import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, Alert, Switch, FlatList, ActivityIndicator, Modal, Platform } from "react-native";
import type { AllVisitorsScreenProps } from "@/types/receptionistNavigation.types";
import { ROUTES } from "@/constants";
import { SkeletonList, WalkInBadge } from "@/components/shared";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchInput } from "@/components/SearchInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { VisitorActionButton } from "@/components/VisitorActionButton";
import { applyOpacity } from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { useInfiniteVisitsQuery } from "@/hooks/queries/useApprovalQueries";
import { useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import type { VisitListParams, VisitListItemDto } from "@/types";

type DateFilter = 'all' | 'today' | 'this_week' | 'this_month';
type StatusFilter = 'all' | 'pending_approval' | 'approved' | 'checked_in' | 'auto_cancelled' | 'rejected' | 'cancelled' | 'completed';

function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Use local timezone formatting instead of UTC (toISOString converts to UTC)
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  switch (filter) {
    case 'today':
      const todayStr = formatDate(today);
      return { startDate: todayStr, endDate: todayStr };
    case 'this_week': {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { startDate: formatDate(startOfWeek), endDate: formatDate(endOfWeek) };
    }
    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: formatDate(startOfMonth), endDate: formatDate(endOfMonth) };
    }
    default:
      return {};
  }
}

function mapStatusToApi(status: StatusFilter): string | undefined {
  switch (status) {
    case 'all':
      return undefined;
    case 'completed':
      return 'completed,checked_out';
    default:
      return status;
  }
}

const PAGE_SIZE = 20;

export default function AllVisitorsScreen({ navigation }: AllVisitorsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString, formatDateShort } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeQuickFilter, setActiveQuickFilter] = useState<'walk_in' | 'awaiting_visitor' | 'pending_approval' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpanded = useCallback((id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const queryParams: Omit<VisitListParams, 'page'> = useMemo(() => ({
    ...getDateRange(dateFilter),
    status: mapStatusToApi(statusFilter),
    search: debouncedSearch || undefined,
    isWalkIn: activeQuickFilter === 'walk_in' || undefined,
    awaitingVisitor: activeQuickFilter === 'awaiting_visitor' || undefined,
    pendingApproval: activeQuickFilter === 'pending_approval' || undefined,
    myRequestsOnly: false,
    limit: PAGE_SIZE,
  }), [dateFilter, statusFilter, debouncedSearch, activeQuickFilter]);

  const { 
    data, 
    isLoading, 
    isFetching,
    isFetchingNextPage,
    isError, 
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteVisitsQuery(queryParams);

  const checkInMutation = useReceptionCheckInMutation();
  const checkOutMutation = useReceptionCheckOutMutation();

  const DATE_FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'today', label: t('time.today') },
    { key: 'this_week', label: t('time.thisWeek') },
    { key: 'this_month', label: t('time.thisMonth') },
  ];

  const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'pending_approval', label: t('status.pendingApproval') },
    { key: 'approved', label: t('status.approved') },
    { key: 'checked_in', label: t('status.checkedIn') },
    { key: 'auto_cancelled', label: t('status.autoCancelled') },
    { key: 'rejected', label: t('status.rejected') },
    { key: 'cancelled', label: t('status.cancelled') },
    { key: 'completed', label: t('status.completed') },
  ];

  const visitors = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  const totalCount = data?.pages?.[0]?.pagination?.total ?? visitors.length;

  const hasShownError = useRef(false);

  useEffect(() => {
    if (isError && error && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(t('common.error'), (error as Error)?.message || t('common.loadError'));
    }
    if (!isError) {
      hasShownError.current = false;
    }
  }, [isError, error, t]);

  const handleCheckIn = useCallback((visitorId: string, visitorName: string, event: GestureResponderEvent) => {
    event.stopPropagation();
    
    checkInMutation.mutate(
      { visitId: visitorId },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate(ROUTES.CHECK_IN_OUT_CONFIRMATION as never, {
            action: 'check_in',
            visitorName,
            time: currentTime
          });
        },
        onError: (err) => {
          Alert.alert(t('common.error'), err.message || t('errors.checkInFailed'));
        }
      }
    );
  }, [checkInMutation, formatTime, navigation, t]);

  const handleCheckOut = useCallback((visitorId: string, visitorName: string, event: GestureResponderEvent) => {
    event.stopPropagation();
    
    checkOutMutation.mutate(
      { visitId: visitorId },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate(ROUTES.CHECK_IN_OUT_CONFIRMATION as never, {
            action: 'check_out',
            visitorName,
            time: currentTime
          });
        },
        onError: (err) => {
          Alert.alert(t('common.error'), err.message || t('errors.checkOutFailed'));
        }
      }
    );
  }, [checkOutMutation, formatTime, navigation, t]);

  const getStatusConfig = useCallback((status: string) => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      case 'completed':
        return { label: t('timeline.visitCompleted'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      case 'checked_out':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      case 'pending_approval':
        return { label: t('status.pendingApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
      case 'pending_host_approval':
        return { label: t('status.pendingHostApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
      case 'approved':
      case 'visitor_accepted':
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.info, '15'), text: theme.info, border: theme.info };
      case 'rejected':
        return { label: t('status.rejected'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
      case 'cancelled':
        return { label: t('status.cancelled'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      default:
        return { label: t('status.pending'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    }
  }, [t, theme]);

  const handleVisitorPress = useCallback((visitor: VisitListItemDto) => {
    navigation.navigate(ROUTES.VISITOR_DETAIL as never, { visitId: visitor.id } as never);
  }, [navigation]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getSelectedDateLabel = () => {
    const option = DATE_FILTER_OPTIONS.find(o => o.key === dateFilter);
    return option?.label || t('common.all');
  };

  const getSelectedStatusLabel = () => {
    const option = STATUS_FILTER_OPTIONS.find(o => o.key === statusFilter);
    return option?.label || t('common.all');
  };

  const renderVisitorCard = useCallback(({ item }: { item: VisitListItemDto }) => {
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = visitorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const showCheckIn = item.status === 'approved' || item.status === 'visitor_accepted';
    const showCheckOut = item.status === 'checked_in';
    const isExpanded = expandedCards.has(item.id);
    const hasDetails = item.purpose || item.visitor.email || item.visitor.phone;
    
    return (
      <Pressable 
        onPress={() => handleVisitorPress(item)}
        style={({ pressed }) => [pressed && { opacity: 0.95 }]}
      >
        <ThemedView style={[styles.visitorCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.border }]} />
          
          <View style={styles.cardContent}>
            <DirectionalRow style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                  {initials}
                </ThemedText>
              </View>
              
              <View style={[styles.nameSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <DirectionalRow style={[styles.nameRow, { width: '100%' }]}>
                  <ThemedText style={[styles.visitorName, { color: theme.text, width: '100%' }]} numberOfLines={1}>
                    {visitorName}
                  </ThemedText>
                </DirectionalRow>
                <ThemedText style={[styles.companyText, { color: theme.textSecondary, width: '100%' }]} numberOfLines={1}>
                  {item.visitor.company ?? ''}
                </ThemedText>
              </View>
            </DirectionalRow>

            <DirectionalRow style={styles.detailsRow}>
              <DirectionalRow style={styles.detailItem}>
                <DDIcon name="calendar" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {formatDateShort(item.visitDate)}
                </ThemedText>
              </DirectionalRow>
              <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
              <DirectionalRow style={styles.detailItem}>
                <DDIcon name="clock" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {formatTimeFromString(item.visitTime)}
                </ThemedText>
              </DirectionalRow>
              <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
              <DirectionalRow style={styles.detailItem}>
                <DDIcon name="user" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.employeeName}
                </ThemedText>
              </DirectionalRow>
            </DirectionalRow>

            <DirectionalRow style={styles.servicesStatusRow} justifyContent="space-between">
              <DirectionalRow style={styles.servicesRow}>
                {item.isWalkIn ? <WalkInBadge size="sm" /> : null}
                {item.hasParking ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                    <DDIcon name="map-pin" size={12} color={theme.info} />
                  </View>
                ) : null}
                {item.hasMeetingRoom ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
                    <DDIcon name="briefcase" size={12} color={theme.secondary} />
                  </View>
                ) : null}
                {item.hasBuffet ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
                    <DDIcon name="cloche" size={12} color={theme.warning} />
                  </View>
                ) : null}
              </DirectionalRow>

              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </DirectionalRow>

            {isExpanded && hasDetails ? (
              <View style={styles.expandedSection}>
                {item.purpose ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="briefcase" size={14} color={theme.textSecondary} />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.text }]} numberOfLines={2}>
                      {item.purpose}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
                {item.visitor.email ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="mail" size={14} color={theme.textSecondary} />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.text }]} numberOfLines={1}>
                      {item.visitor.email}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
                {item.visitor.phone ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="phone" size={14} color={theme.textSecondary} />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.text }]} numberOfLines={1}>
                      {item.visitor.phone}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
              </View>
            ) : null}

            {hasDetails ? (
              <Pressable 
                onPress={(e) => { e.stopPropagation(); toggleCardExpanded(item.id); }} 
                style={styles.toggleContainer}
              >
                <DirectionalRow>
                  <ThemedText style={[styles.toggleText, { color: theme.primary }]}>
                    {isExpanded ? t('common.lessDetails') : t('common.moreDetails')}
                  </ThemedText>
                  <DDIcon 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color={theme.primary} 
                  />
                </DirectionalRow>
              </Pressable>
            ) : null}

            <DirectionalRow style={styles.cardFooter} justifyContent="flex-end">
              <View style={styles.actionButtons}>
                {showCheckIn ? (
                  <VisitorActionButton 
                    type="check_in" 
                    onPress={(e) => handleCheckIn(item.id, visitorName, e)} 
                  />
                ) : showCheckOut ? (
                  <VisitorActionButton 
                    type="check_out" 
                    onPress={(e) => handleCheckOut(item.id, visitorName, e)} 
                  />
                ) : null}
              </View>
            </DirectionalRow>
          </View>
        </ThemedView>
      </Pressable>
    );
  }, [getStatusConfig, handleVisitorPress, handleCheckIn, handleCheckOut, theme, formatTimeFromString, isRTL, expandedCards, toggleCardExpanded, t]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: Spacing.sm }]}>
          {t('common.loading')}...
        </ThemedText>
      </View>
    );
  }, [isFetchingNextPage, theme, t]);

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

  const ListHeader = useMemo(() => (
    <View>
      <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '700' }]}>
        {t('navigation.allVisitors')}
      </ThemedText>
      
      <Spacer height={4} />
      
      <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
        {totalCount} {totalCount === 1 ? 'visitor' : 'visitors'} found
        {isFetching && !isFetchingNextPage ? ' ...' : ''}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <SearchInput
        placeholder={t('reception.searchVisitor')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.md} />

      <DirectionalRow style={styles.filtersRow}>
        <Pressable
          style={[styles.filterDropdown, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: getFlexDirection(isRTL) }]}
          onPress={() => setShowDatePicker(true)}
        >
          <DDIcon name="calendar" size={14} variant="muted" />
          <ThemedText style={[styles.filterDropdownText, { color: theme.text }]} numberOfLines={1}>
            {getSelectedDateLabel()}
          </ThemedText>
          <DDIcon name="chevron-down" size={14} variant="muted" />
        </Pressable>

        <Pressable
          style={[styles.filterDropdown, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: getFlexDirection(isRTL) }]}
          onPress={() => setShowStatusPicker(true)}
        >
          <DDIcon name="filter" size={14} variant="muted" />
          <ThemedText style={[styles.filterDropdownText, { color: theme.text }]} numberOfLines={1}>
            {getSelectedStatusLabel()}
          </ThemedText>
          <DDIcon name="chevron-down" size={14} variant="muted" />
        </Pressable>

      </DirectionalRow>

      <Spacer height={Spacing.sm} />

      <DirectionalRow style={styles.filtersRow}>
        <Pressable
          style={[
            styles.filterChip,
            { 
              backgroundColor: activeQuickFilter === 'walk_in' ? applyOpacity(theme.warning, '15') : theme.surface,
              borderColor: activeQuickFilter === 'walk_in' ? theme.warning : theme.border,
              flexDirection: getFlexDirection(isRTL)
            }
          ]}
          onPress={() => setActiveQuickFilter(activeQuickFilter === 'walk_in' ? null : 'walk_in')}
          accessibilityLabel={t('common.walkIn')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeQuickFilter === 'walk_in' }}
        >
          <DDIcon name="user-plus" size={12} color={activeQuickFilter === 'walk_in' ? theme.warning : theme.textSecondary} />
          <ThemedText style={[styles.filterChipText, { color: activeQuickFilter === 'walk_in' ? theme.warning : theme.textSecondary }]}>
            {t('common.walkIn')}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            { 
              backgroundColor: activeQuickFilter === 'awaiting_visitor' ? applyOpacity(theme.info, '15') : theme.surface,
              borderColor: activeQuickFilter === 'awaiting_visitor' ? theme.info : theme.border,
              flexDirection: getFlexDirection(isRTL)
            }
          ]}
          onPress={() => setActiveQuickFilter(activeQuickFilter === 'awaiting_visitor' ? null : 'awaiting_visitor')}
          accessibilityLabel={t('filters.awaitingVisitor')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeQuickFilter === 'awaiting_visitor' }}
        >
          <DDIcon name="clock" size={12} color={activeQuickFilter === 'awaiting_visitor' ? theme.info : theme.textSecondary} />
          <ThemedText style={[styles.filterChipText, { color: activeQuickFilter === 'awaiting_visitor' ? theme.info : theme.textSecondary }]}>
            {t('filters.awaitingVisitor')}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            { 
              backgroundColor: activeQuickFilter === 'pending_approval' ? applyOpacity(theme.primary, '15') : theme.surface,
              borderColor: activeQuickFilter === 'pending_approval' ? theme.primary : theme.border,
              flexDirection: getFlexDirection(isRTL)
            }
          ]}
          onPress={() => setActiveQuickFilter(activeQuickFilter === 'pending_approval' ? null : 'pending_approval')}
          accessibilityLabel={t('filters.pendingApproval')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeQuickFilter === 'pending_approval' }}
        >
          <DDIcon name="check-circle" size={12} color={activeQuickFilter === 'pending_approval' ? theme.primary : theme.textSecondary} />
          <ThemedText style={[styles.filterChipText, { color: activeQuickFilter === 'pending_approval' ? theme.primary : theme.textSecondary }]}>
            {t('filters.pendingApproval')}
          </ThemedText>
        </Pressable>
      </DirectionalRow>

      <Spacer height={Spacing.md} />
    </View>
  ), [t, theme, totalCount, isFetching, isFetchingNextPage, searchQuery, activeQuickFilter, getSelectedDateLabel, getSelectedStatusLabel]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg, backgroundColor: theme.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (isError) {
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
      <FlatList
        data={visitors}
        renderItem={renderVisitorCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        ItemSeparatorComponent={() => <Spacer height={Spacing.sm} />}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />

      {renderPickerModal(
        showDatePicker,
        () => setShowDatePicker(false),
        DATE_FILTER_OPTIONS,
        dateFilter,
        (key) => setDateFilter(key as DateFilter),
        t('time.selectDate')
      )}

      {renderPickerModal(
        showStatusPicker,
        () => setShowStatusPicker(false),
        STATUS_FILTER_OPTIONS,
        statusFilter,
        (key) => setStatusFilter(key as StatusFilter),
        t('status.selectStatus')
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
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
});
