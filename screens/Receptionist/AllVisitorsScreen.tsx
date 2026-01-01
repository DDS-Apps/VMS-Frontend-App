import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, Alert, Switch, FlatList, ActivityIndicator, Modal, Platform } from "react-native";
import type { AllVisitorsScreenProps } from "@/types/receptionistNavigation.types";
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
import { useInfiniteReceptionRequestsQuery } from "@/hooks/queries/useApprovalQueries";
import { useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import type { VisitListParams, VisitListItemDto } from "@/types";

type DateFilter = 'all' | 'today' | 'this_week' | 'this_month';
type StatusFilter = 'all' | 'pending_approval' | 'approved' | 'checked_in' | 'auto_cancelled' | 'rejected' | 'cancelled' | 'completed';

function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
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
  const { formatTime, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [walkInOnly, setWalkInOnly] = useState(false);
  const [awaitingVisitorOnly, setAwaitingVisitorOnly] = useState(false);
  const [pendingApprovalOnly, setPendingApprovalOnly] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

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
    isWalkIn: walkInOnly || undefined,
    awaitingVisitor: awaitingVisitorOnly || undefined,
    pendingApproval: pendingApprovalOnly || undefined,
    myRequestsOnly: false,
    limit: PAGE_SIZE,
  }), [dateFilter, statusFilter, debouncedSearch, walkInOnly, awaitingVisitorOnly, pendingApprovalOnly]);

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
  } = useInfiniteReceptionRequestsQuery(queryParams);

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
          navigation.navigate('CheckInOutConfirmation', {
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
          navigation.navigate('CheckInOutConfirmation', {
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
      case 'checked_out':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      case 'pending_approval':
        return { label: t('status.pendingApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
      case 'approved':
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.info, '15'), text: theme.info, border: theme.info };
      case 'rejected':
        return { label: t('status.rejected'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
      case 'cancelled':
        return { label: t('status.cancelled'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      default:
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    }
  }, [t, theme]);

  const handleVisitorPress = useCallback((visitor: VisitListItemDto) => {
    navigation.navigate('VisitorDetail', { visitId: visitor.id });
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
    const initials = visitorName.split(' ').map(n => n[0]).join('').substring(0, 2);
    const showCheckIn = item.status === 'approved';
    const showCheckOut = item.status === 'checked_in';
    
    return (
      <Pressable 
        onPress={() => handleVisitorPress(item)}
        style={({ pressed }) => [pressed && { opacity: 0.95 }]}
      >
        <ThemedView style={[styles.visitorCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.border }]} />
          
          <View style={styles.cardContent}>
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                  {initials}
                </ThemedText>
              </View>
              
              <View style={styles.nameSection}>
                <ThemedText style={[styles.visitorName, { color: theme.text }]} numberOfLines={1}>
                  {visitorName}
                </ThemedText>
                <View style={[styles.companyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <ThemedText style={[styles.companyText, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                    {item.visitor.company ?? ''}
                  </ThemedText>
                  {item.isWalkIn ? <WalkInBadge size="sm" /> : null}
                </View>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.detailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <DDIcon name="calendar" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {item.visitDate}
                </ThemedText>
              </View>
              <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <DDIcon name="clock" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {formatTimeFromString(item.visitTime)}
                </ThemedText>
              </View>
              <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <DDIcon name="user" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.employeeName}
                </ThemedText>
              </View>
              {item.purpose ? (
                <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="briefcase" size={12} variant="muted" />
                  <ThemedText style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.purpose}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <View style={[styles.cardFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.servicesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {item.hasParking ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '15'), flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <DDIcon name="map-pin" size={12} color={theme.info} />
                  </View>
                ) : null}
                {item.hasMeetingRoom ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                    <DDIcon name="home" size={12} color={theme.primary} />
                  </View>
                ) : null}
                {item.hasBuffet ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                    <DDIcon name="cloche" size={12} color={theme.success} />
                  </View>
                ) : null}
              </View>

              <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                ) : (
                  <VisitorActionButton type="completed" />
                )}
              </View>
            </View>
          </View>
        </ThemedView>
      </Pressable>
    );
  }, [getStatusConfig, handleVisitorPress, handleCheckIn, handleCheckOut, theme, formatTimeFromString]);

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

      <View style={[styles.filtersRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          style={[styles.filterDropdown, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setShowDatePicker(true)}
        >
          <DDIcon name="calendar" size={14} variant="muted" />
          <ThemedText style={[styles.filterDropdownText, { color: theme.text }]} numberOfLines={1}>
            {getSelectedDateLabel()}
          </ThemedText>
          <DDIcon name="chevron-down" size={14} variant="muted" />
        </Pressable>

        <Pressable
          style={[styles.filterDropdown, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setShowStatusPicker(true)}
        >
          <DDIcon name="filter" size={14} variant="muted" />
          <ThemedText style={[styles.filterDropdownText, { color: theme.text }]} numberOfLines={1}>
            {getSelectedStatusLabel()}
          </ThemedText>
          <DDIcon name="chevron-down" size={14} variant="muted" />
        </Pressable>

      </View>

      <Spacer height={Spacing.sm} />

      <View style={[styles.filtersRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          style={[
            styles.filterChip,
            { 
              backgroundColor: walkInOnly ? applyOpacity(theme.warning, '15') : theme.surface,
              borderColor: walkInOnly ? theme.warning : theme.border,
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }
          ]}
          onPress={() => setWalkInOnly(!walkInOnly)}
          accessibilityLabel={t('common.walkIn')}
          accessibilityRole="button"
          accessibilityState={{ selected: walkInOnly }}
        >
          <DDIcon name="user-plus" size={12} color={walkInOnly ? theme.warning : theme.textSecondary} />
          <ThemedText style={[styles.filterChipText, { color: walkInOnly ? theme.warning : theme.textSecondary }]}>
            {t('common.walkIn')}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            { 
              backgroundColor: awaitingVisitorOnly ? applyOpacity(theme.info, '15') : theme.surface,
              borderColor: awaitingVisitorOnly ? theme.info : theme.border,
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }
          ]}
          onPress={() => setAwaitingVisitorOnly(!awaitingVisitorOnly)}
          accessibilityLabel={t('filters.awaitingVisitor')}
          accessibilityRole="button"
          accessibilityState={{ selected: awaitingVisitorOnly }}
        >
          <DDIcon name="clock" size={12} color={awaitingVisitorOnly ? theme.info : theme.textSecondary} />
          <ThemedText style={[styles.filterChipText, { color: awaitingVisitorOnly ? theme.info : theme.textSecondary }]}>
            {t('filters.awaitingVisitor')}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            { 
              backgroundColor: pendingApprovalOnly ? applyOpacity(theme.primary, '15') : theme.surface,
              borderColor: pendingApprovalOnly ? theme.primary : theme.border,
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }
          ]}
          onPress={() => setPendingApprovalOnly(!pendingApprovalOnly)}
          accessibilityLabel={t('filters.pendingApproval')}
          accessibilityRole="button"
          accessibilityState={{ selected: pendingApprovalOnly }}
        >
          <DDIcon name="check-circle" size={12} color={pendingApprovalOnly ? theme.primary : theme.textSecondary} />
          <ThemedText style={[styles.filterChipText, { color: pendingApprovalOnly ? theme.primary : theme.textSecondary }]}>
            {t('filters.pendingApproval')}
          </ThemedText>
        </Pressable>
      </View>

      <Spacer height={Spacing.md} />
    </View>
  ), [t, theme, totalCount, isFetching, isFetchingNextPage, searchQuery, walkInOnly, awaitingVisitorOnly, pendingApprovalOnly, getSelectedDateLabel, getSelectedStatusLabel]);

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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  visitorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  companyText: {
    fontSize: 11,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  servicesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  servicePill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
