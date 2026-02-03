import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, Alert, Switch, FlatList, ActivityIndicator, Modal, Platform, useWindowDimensions, ScrollView } from "react-native";
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
import { toServerDateString } from "@/utils/dateTimeUtils";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { useInfiniteVisitsQuery } from "@/hooks/queries/useApprovalQueries";
import { useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import type { VisitListParams, VisitListItemDto } from "@/types";

type DateFilter = 'all' | 'today' | 'this_week' | 'this_month';
type StatusFilter = 
  | 'all'
  | 'pending_approval'
  | 'pending_host_approval'
  | 'approved'
  | 'rejected'
  | 'visitor_rejected'
  | 'cancelled'
  | 'auto_cancelled'
  | 'waiting_acceptance'
  | 'accepted'
  | 'visitor_accepted'
  | 'checked_in'
  | 'checked_out'
  | 'completed';

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

function mapStatusesToApi(statuses: Set<StatusFilter>): string | undefined {
  if (statuses.has('all') || statuses.size === 0) return undefined;
  const statusArray = Array.from(statuses).filter(s => s !== 'all');
  return statusArray.length > 0 ? statusArray.join(',') : undefined;
}

const PAGE_SIZE = 20;

export default function AllVisitorsScreen({ navigation, route }: AllVisitorsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString, formatDateShort } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth > 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  
  const initialFilter = route.params?.initialFilter ?? null;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_week');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<StatusFilter>>(new Set(['all']));
  const [isWalkInFilter, setIsWalkInFilter] = useState(initialFilter === 'walk_in');
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    status: mapStatusesToApi(selectedStatuses),
    search: debouncedSearch || undefined,
    isWalkIn: isWalkInFilter || undefined,
    myRequestsOnly: false,
    limit: PAGE_SIZE,
  }), [dateFilter, selectedStatuses, debouncedSearch, isWalkInFilter]);

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
    { key: 'pending_host_approval', label: t('status.pendingHostApproval') },
    { key: 'approved', label: t('status.approved') },
    { key: 'waiting_acceptance', label: t('status.waitingAcceptance') },
    { key: 'accepted', label: t('status.accepted') },
    { key: 'visitor_accepted', label: t('status.visitorAccepted') },
    { key: 'checked_in', label: t('status.checkedIn') },
    { key: 'checked_out', label: t('status.checkedOut') },
    { key: 'completed', label: t('timeline.visitCompleted') },
    { key: 'rejected', label: t('status.rejected') },
    { key: 'visitor_rejected', label: t('status.visitorRejected') },
    { key: 'cancelled', label: t('status.cancelled') },
    { key: 'auto_cancelled', label: t('status.autoCancelled') },
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
      case 'checked_out':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      case 'completed':
        return { label: t('timeline.visitCompleted'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      case 'pending_approval':
        return { label: t('status.pendingApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
      case 'pending_host_approval':
        return { label: t('status.pendingHostApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
      case 'waiting_acceptance':
        return { label: t('status.waitingAcceptance'), bg: applyOpacity(theme.info, '15'), text: theme.info, border: theme.info };
      case 'approved':
      case 'accepted':
        return { label: t('status.approved'), bg: applyOpacity(theme.info, '15'), text: theme.info, border: theme.info };
      case 'visitor_accepted':
        return { label: t('status.visitorAccepted'), bg: applyOpacity(theme.info, '15'), text: theme.info, border: theme.info };
      case 'rejected':
        return { label: t('status.rejected'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
      case 'visitor_rejected':
        return { label: t('status.visitorRejected'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
      case 'cancelled':
        return { label: t('status.cancelled'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
      case 'auto_cancelled':
        return { label: t('status.autoCancelled'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
      case 'no_show':
        return { label: t('status.noShow'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
      case 'expired':
        return { label: t('status.expired'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
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
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = visitorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Only show check-in for today's visitors with eligible status
    // Compare visitDate (YYYY-MM-DD from server) with today's date in server timezone
    const todayServerDate = toServerDateString(new Date());
    const isVisitToday = item.visitDate === todayServerDate;
    const hasCheckInStatus = item.status === 'approved' || item.status === 'accepted' || item.status === 'visitor_accepted';
    const showCheckIn = hasCheckInStatus && isVisitToday;
    const showCheckOut = item.status === 'checked_in';
    
    const isMutating = checkInMutation.isPending || checkOutMutation.isPending;
    const activeVisitorId = checkInMutation.variables?.visitId || checkOutMutation.variables?.visitId;
    const isThisVisitorLoading = activeVisitorId === item.id;
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

            {(showCheckIn || showCheckOut) && (
              <DirectionalRow style={styles.cardFooter} justifyContent="flex-end">
                <View style={styles.actionButtons}>
                  {showCheckIn ? (
                    <VisitorActionButton 
                      type="check_in" 
                      onPress={(e) => handleCheckIn(item.id, visitorName, e)}
                      loading={isThisVisitorLoading}
                      disabled={isMutating && !isThisVisitorLoading}
                    />
                  ) : showCheckOut ? (
                    <VisitorActionButton 
                      type="check_out" 
                      onPress={(e) => handleCheckOut(item.id, visitorName, e)}
                      loading={isThisVisitorLoading}
                      disabled={isMutating && !isThisVisitorLoading}
                    />
                  ) : null}
                </View>
              </DirectionalRow>
            )}
          </View>
        </ThemedView>
      </Pressable>
    );
  }, [getStatusConfig, handleVisitorPress, handleCheckIn, handleCheckOut, theme, formatTimeFromString, isRTL, expandedCards, toggleCardExpanded, t, checkInMutation.isPending, checkOutMutation.isPending, checkInMutation.variables, checkOutMutation.variables]);

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

  const getStatusChipColor = useCallback((status: StatusFilter) => {
    switch (status) {
      case 'all':
        return theme.primary;
      case 'pending_approval':
      case 'pending_host_approval':
        return theme.warning;
      case 'approved':
      case 'accepted':
      case 'waiting_acceptance':
        return theme.info;
      case 'checked_in':
      case 'checked_out':
      case 'completed':
        return theme.success;
      case 'rejected':
      case 'visitor_rejected':
      case 'cancelled':
      case 'auto_cancelled':
        return theme.error;
      default:
        return theme.textSecondary;
    }
  }, [theme]);

  const ListHeader = useMemo(() => (
    <View>
      {/* Title row with count on the right */}
      <DirectionalRow style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.md, flexWrap: 'wrap' }}>
        <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '700' }]}>
          {t('navigation.allVisitors')}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
          {totalCount} {totalCount === 1 ? 'visitor' : 'visitors'} found
          {isFetching && !isFetchingNextPage ? ' ...' : ''}
        </ThemedText>
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
          style={[styles.datePickerButton, { backgroundColor: theme.surface, borderColor: theme.border, height: 56 }]}
          onPress={() => setShowDatePicker(true)}
        >
          <DDIcon name="calendar" size={18} color={theme.primary} />
          <ThemedText style={[styles.datePickerLabel, { color: theme.text }]} numberOfLines={1}>
            {getSelectedDateLabel()}
          </ThemedText>
          <DDIcon name="chevron-down" size={14} variant="muted" />
        </Pressable>
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      {/* Horizontal scrollable status chips with Walk-In toggle */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusChipsContainer}
      >
        {/* Walk-In toggle chip */}
        <Pressable
          style={[
            styles.statusChip,
            { 
              backgroundColor: isWalkInFilter ? applyOpacity(theme.warning, '15') : theme.surface,
              borderColor: isWalkInFilter ? theme.warning : theme.border,
              flexDirection: getFlexDirection(isRTL),
              gap: Spacing.xs,
            }
          ]}
          onPress={handleWalkInToggle}
          accessibilityLabel={t('common.walkIn')}
          accessibilityRole="button"
          accessibilityState={{ selected: isWalkInFilter }}
        >
          <DDIcon name="user-plus" size={12} color={isWalkInFilter ? theme.warning : theme.textSecondary} />
          <ThemedText style={[styles.statusChipText, { color: isWalkInFilter ? theme.warning : theme.textSecondary }]}>
            {t('common.walkIn')}
          </ThemedText>
        </Pressable>
        
        {/* Status filter chips */}
        {STATUS_FILTER_OPTIONS.map((option) => {
          const isSelected = selectedStatuses.has(option.key);
          const chipColor = getStatusChipColor(option.key);
          return (
            <Pressable
              key={option.key}
              style={[
                styles.statusChip,
                { 
                  backgroundColor: isSelected ? applyOpacity(chipColor, '15') : theme.surface,
                  borderColor: isSelected ? chipColor : theme.border,
                }
              ]}
              onPress={() => handleStatusChipPress(option.key)}
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <ThemedText style={[
                styles.statusChipText, 
                { color: isSelected ? chipColor : theme.textSecondary }
              ]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <Spacer height={Spacing.md} />
    </View>
  ), [t, theme, totalCount, isFetching, isFetchingNextPage, searchQuery, isWalkInFilter, selectedStatuses, getSelectedDateLabel, getStatusChipColor, STATUS_FILTER_OPTIONS, isRTL, handleWalkInToggle, handleStatusChipPress]);

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
        key={`flatlist-${numColumns}`}
        data={visitors}
        renderItem={({ item }) => (
          <View style={numColumns === 3 ? styles.gridItem3 : numColumns === 2 ? styles.gridItem2 : styles.singleColumnItem}>
            {renderVisitorCard({ item })}
          </View>
        )}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridRow: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
    fontWeight: '500',
  },
});
