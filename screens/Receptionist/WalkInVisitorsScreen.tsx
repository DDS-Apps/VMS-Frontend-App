import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, useWindowDimensions, ActivityIndicator, RefreshControl } from "react-native";
import type { WalkInVisitorsScreenProps } from "@/types/receptionistNavigation.types";
import { ROUTES } from "@/constants";
import { SkeletonList } from "@/components/shared/Skeleton";
import { RTLHorizontalScrollView, FilterChip, VisitorMatrixTable } from "@/components/shared";
import type { VisitorMatrixItem } from "@/components/shared";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from "@/components/ScreenScrollView";
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
import { applyOpacity } from "@/utils/statusStyles";
import { useTodayVisitorsQuery } from "@/hooks/queries/useReceptionQueries";
import type { TodayVisitorDto } from "@/types";
import { DirectionalRow } from '@/components/DirectionalRow';
import { PURPOSE_VALUE_TO_KEY, normalizePurposeValue } from "@/constants/requestConstants";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsPendingHostWalkInExpired,
  getPendingApprovalWalkInScheduledEndMs,
} from "@/utils/visitExpiredGuard";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";
import { getInitials } from "@/utils/formatters";

type StatusFilter = 'all' | 'pending' | 'checked_in' | 'completed';

export default function WalkInVisitorsScreen({ navigation }: WalkInVisitorsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();
  const numColumns = screenWidth >= 900 ? 3 : screenWidth >= 600 ? 2 : 1;
  const cardWidth = numColumns === 1
    ? undefined
    : (screenWidth - Spacing.lg * 2 - Spacing.md * (numColumns - 1)) / numColumns;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };


  const { data: todayResponse, isLoading, isFetching, isError, error, refetch } = useTodayVisitorsQuery();

  const todaysVisitors = todayResponse?.data ?? [];
  const expirationBoundaries = useMemo(
    () =>
      todaysVisitors.map((visitor) =>
        getPendingApprovalWalkInScheduledEndMs({
          isWalkIn: visitor.isWalkIn,
          status: visitor.status,
          visitDate: visitor.visitDate,
          visitTime: visitor.visitTime,
          endTime: visitor.endTime ?? visitor.scheduledEndTime,
          duration: (visitor as any).duration,
        }),
      ),
    [todaysVisitors],
  );
  const expirationTick = useTimeBoundaryTick(expirationBoundaries);

  const toMatrixItem = useCallback((v: TodayVisitorDto): VisitorMatrixItem => {
    const isExpired = computeIsPendingHostWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
    }) || computeIsPendingApprovalWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
      visitTime: v.visitTime,
      endTime: v.endTime ?? v.scheduledEndTime,
      duration: (v as any).duration,
    });

    return {
      id: v.id,
      visitorName: v.visitor.fullName,
      company: v.visitor.company ?? undefined,
      visitDate: v.visitDate ?? undefined,
      plannedInTime: v.visitTime,
      plannedOutTime: v.endTime ?? v.scheduledEndTime ?? undefined,
      // Keep the raw status and show expiration as a separate notice.
      status: v.status,
      actualInTime: v.checkedInAt ?? undefined,
      actualOutTime: v.checkedOutAt ?? undefined,
      hasParking: resolveParkingDisplayDecision({
        parkingDecision: (v as any).parkingDecision,
        visitorNeedsParking: v.visitorNeedsParking,
        isVisitorNeedsParking: v.isVisitorNeedsParking,
        hasParking: v.hasParking,
      }) === 'required',
      hasBuffet: !!(v.isBuffet || v.hasBuffet),
      hasValet: !!v.hasValet,
      hasMeetingRoom: !!(v.isMeetingRoom || v.hasMeetingRoom || v.meetingRoom),
      hostName: v.hostName ?? undefined,
      hostDepartment: v.hostDepartment ?? undefined,
      purpose: v.purpose ?? undefined,
      isExpired,
    };
  }, [expirationTick, riyadhBusinessDateKey]);

  const hasShownError = useRef(false);

  useEffect(() => {
    if (isError && error && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(t('common.error'), error?.message || t('common.loadError'));
    }
    if (!isError) {
      hasShownError.current = false;
    }
  }, [isError, error, t]);

  const walkInVisitors = useMemo(() => {
    return todaysVisitors.filter(visitor => (visitor as any).isWalkIn === true);
  }, [todaysVisitors]);

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'pending', label: t('visitor.expectedVisitors') },
    { key: 'checked_in', label: t('status.checkedIn') },
    { key: 'completed', label: t('status.checkedOut') },
  ];

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const filteredVisitors = useMemo(() => {
    return walkInVisitors
      .filter(visitor => {
        const name = visitor.visitor.fullName.toLowerCase();
        const phone = visitor.visitor.phone ?? '';
        const company = (visitor.visitor.company ?? '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || phone.includes(searchQuery) || company.includes(query);
      })
      .filter(visitor => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return visitor.status === 'pending' || visitor.status === 'expected';
        return visitor.status === statusFilter;
      });
  }, [walkInVisitors, searchQuery, statusFilter]);

  if (isLoading && !todayResponse) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (isError && !todayResponse) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
        <Spacer height={Spacing.md} />
        <Pressable onPress={() => refetch()}>
          <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>{t('common.retry')}</ThemedText>
        </Pressable>
      </View>
    );
  }


  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      case 'completed':
        return { label: t('timeline.visitCompleted'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      default:
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    }
  };

  const handleVisitorPress = (visitor: TodayVisitorDto) => {
    const today = new Date().toISOString().split('T')[0];
    const legacyVisitor = {
      id: visitor.id,
      name: visitor.visitor.fullName,
      company: visitor.visitor.company ?? '',
      time: visitor.visitTime,
      host: visitor.hostName,
      status: (visitor.status === 'expected' ? 'pending' : visitor.status) as 'pending' | 'checked_in' | 'completed',
      isWalkIn: true,
      phone: visitor.visitor.phone ?? '',
      origin: 'walk_in' as const,
      scheduledFor: today,
      createdAt: today,
    };
    navigation.navigate(ROUTES.VISITOR_DETAIL as any, { visitor: legacyVisitor } as any);
  };

  const renderVisitorCard = (item: TodayVisitorDto) => {
    const statusConfig = getStatusConfig(item.status);
    const isExpired = computeIsPendingHostWalkInExpired({
      isWalkIn: item.isWalkIn,
      status: item.status,
      visitDate: item.visitDate,
    }) || computeIsPendingApprovalWalkInExpired({
      isWalkIn: item.isWalkIn,
      status: item.status,
      visitDate: item.visitDate,
      visitTime: item.visitTime,
      endTime: item.endTime ?? item.scheduledEndTime,
      duration: (item as any).duration,
    });
    const visitorName = item.visitor.fullName;
    const initials = getInitials(visitorName);
    const isExpanded = expandedCards.has(item.id);
    const hasDetails = (item as any).purpose || item.visitor.email || item.visitor.phone;
    
    return (
      <Pressable 
        key={item.id} 
        onPress={() => handleVisitorPress(item)}
        style={({ pressed }) => [pressed && { opacity: 0.95 }]}
      >
        <ThemedView style={[styles.visitorCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.border }]} />
          
          <View style={styles.cardContent}>
            <DirectionalRow style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                <ThemedText
                  style={[styles.avatarText, { color: theme.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {initials}
                </ThemedText>
              </View>
              
              <View style={[styles.nameSection, { flex: 1 }]}>
                <DirectionalRow style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <ThemedText style={[styles.visitorName, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                    {visitorName}
                  </ThemedText>
                  <RequestStatusBadge status={item.status} />
                </DirectionalRow>
                <ThemedText style={[styles.companyText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.visitor.company ?? ''}
                </ThemedText>
              </View>
            </DirectionalRow>

            <DirectionalRow style={styles.detailsRow}>
              <DirectionalRow style={styles.detailItem}>
                <DDIcon name="clock" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary, marginEnd: 4 }]}>
                  {formatTimeFromString(item.visitTime)}
                </ThemedText>
                {(item.endTime || item.scheduledEndTime) ? (
                  <>
                    <DDIcon name="arrow-right" size={11} color={theme.textSecondary} />
                    <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                      {formatTimeFromString(item.endTime ?? item.scheduledEndTime ?? '')}
                    </ThemedText>
                  </>
                ) : null}
              </DirectionalRow>
            </DirectionalRow>

            {item.hostName ? (
              <DirectionalRow style={[styles.detailsRow, { marginBottom: Spacing.sm }]}>
                <DirectionalRow style={[styles.detailItem, { flexShrink: 1 }]}>
                  <DDIcon name="user" size={12} color={theme.textSecondary} />
                  <ThemedText style={[styles.detailText, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                    {item.hostName}
                  </ThemedText>
                  {item.hostDepartment ? (
                    <>
                      <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                        {' - '}
                      </ThemedText>
                      <ThemedText style={[styles.detailText, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                        {item.hostDepartment}
                      </ThemedText>
                    </>
                  ) : null}
                </DirectionalRow>
              </DirectionalRow>
            ) : null}

            <DirectionalRow style={styles.servicesStatusRow}>
              <DirectionalRow style={styles.servicesRowContainer}>
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '15') }]}>
                  <DDIcon name="user-plus" size={12} color={theme.secondary} />
                </View>
                {resolveParkingDisplayDecision({
                  parkingDecision: (item as any).parkingDecision,
                  visitorNeedsParking: item.visitorNeedsParking,
                  isVisitorNeedsParking: item.isVisitorNeedsParking,
                  hasParking: item.hasParking,
                }) === 'required' ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                    <DDIcon name="map-pin" size={12} color={theme.info} />
                  </View>
                ) : null}
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {resolveParkingDisplayDecision({
                    parkingDecision: (item as any).parkingDecision,
                    visitorNeedsParking: item.visitorNeedsParking,
                    isVisitorNeedsParking: item.isVisitorNeedsParking,
                    hasParking: item.hasParking,
                  }) === 'required' ? t('parking.needsParking') : t('parking.noParking')}
                </ThemedText>
              </DirectionalRow>
            </DirectionalRow>

            {isExpired ? (
              <DirectionalRow style={[styles.expiredNotice, { backgroundColor: applyOpacity(theme.error, '10'), borderColor: theme.border }]}>
                <DDIcon name="clock" size={14} color={theme.textSecondary} />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {t('visitor.visitExpired')}
                </ThemedText>
              </DirectionalRow>
            ) : null}

            {isExpanded && hasDetails ? (
              <View style={styles.expandedSection}>
                {(item as any).purpose ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="briefcase" size={14} color={theme.textSecondary} />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: 'right', marginEnd: 8 }]} numberOfLines={2}>
                      {(() => { const pv = normalizePurposeValue((item as any).purpose || ''); return PURPOSE_VALUE_TO_KEY[pv] ? t(PURPOSE_VALUE_TO_KEY[pv] as any) : ((item as any).purpose || '-'); })()}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
                {item.visitor.email ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="mail" size={14} color={theme.textSecondary} />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: 'right', marginEnd: 8 }]} numberOfLines={1}>
                      {item.visitor.email}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
                {item.visitor.phone ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="phone" size={14} color={theme.textSecondary} />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: 'right', marginEnd: 8, writingDirection: 'ltr' }]} numberOfLines={1}>
                      {item.visitor.phone}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
              </View>
            ) : null}

          </View>
        </ThemedView>
      </Pressable>
    );
  };

  return (
    <>
    <ScreenScrollView
      contentContainerStyle={scrollContentStyle}
      refreshControl={<RefreshControl refreshing={isFetching && !!todayResponse} onRefresh={refetch} tintColor={theme.primary} />}
    >
      <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '700' }]}>
        {t('navigation.walkInVisitors')}
      </ThemedText>
      
      <Spacer height={Spacing.lg} />

      <DirectionalRow style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
          {filteredVisitors.length} {filteredVisitors.length === 1 ? t('reception.visitorsFound') : t('reception.visitorsFoundPlural')}
        </ThemedText>
      </DirectionalRow>

      {isError ? (
        <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.error, '10') }]}>
          <DDIcon name="alert-circle" size={16} color={theme.error} />
          <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>{t('common.loadError')}</ThemedText>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>{t('common.retry')}</ThemedText>
          </Pressable>
        </DirectionalRow>
      ) : isFetching && todayResponse ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : null}

      {(isError || (isFetching && todayResponse)) ? <Spacer height={Spacing.md} /> : null}

      <SearchInput
        placeholder={t('reception.searchVisitor')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.md} />

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        nestedScrollEnabled={true}
      >
        {FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            isSelected={statusFilter === option.key}
            onPress={() => setStatusFilter(option.key)}
          />
        ))}
      </RTLHorizontalScrollView>

      <Spacer height={Spacing.lg} />

      {filteredVisitors.length > 0 ? (
        <VisitorMatrixTable
          variant="matrix"
          visitors={filteredVisitors.map(toMatrixItem)}
          showExpiredState={true}
          onPressRow={(id) => {
            const v = filteredVisitors.find(x => x.id === id);
            if (v) handleVisitorPress(v);
          }}
        />
      ) : (
        <View style={styles.emptyState}>
          <DDIcon name="user-plus" size={40} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {t('common.noResults')}
          </ThemedText>
        </View>
      )}

      <Spacer height={80} />
    </ScreenScrollView>

    <Pressable
      style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + Spacing.xl }]}
      onPress={() => navigation.navigate(ROUTES.WALK_IN_REGISTRATION as any)}
    >
      <DDIcon name="user-plus" size={24} color="#FFFFFF" />
    </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  filterScrollContent: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cardList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
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
  servicesRowContainer: {
    gap: Spacing.sm,
    alignItems: 'center',
    flex: 1,
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
    alignItems: 'flex-start',
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
  inlineFeedback: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  expiredNotice: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  viewToggle: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  viewToggleBtn: {
    padding: Spacing.sm,
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  viewToggleBtnLeft: {
    borderTopStartRadius: BorderRadius.sm,
    borderBottomStartRadius: BorderRadius.sm,
    borderTopEndRadius: 0,
    borderBottomEndRadius: 0,
    borderEndWidth: 0,
  },
  viewToggleBtnRight: {
    borderTopEndRadius: BorderRadius.sm,
    borderBottomEndRadius: BorderRadius.sm,
    borderTopStartRadius: 0,
    borderBottomStartRadius: 0,
  },
});
