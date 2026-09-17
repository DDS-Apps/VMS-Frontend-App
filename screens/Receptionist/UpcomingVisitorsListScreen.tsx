import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Alert, useWindowDimensions, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonList, StatusIcon, VisitorMatrixTable } from "@/components/shared";
import type { VisitorMatrixItem } from "@/components/shared";
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
import { applyOpacity, getStatusIcon } from "@/utils/statusStyles";
import { useInfiniteVisitsQuery } from "@/hooks/queries/useApprovalQueries";
import { formatVisitDateLabel } from "@/utils/groupVisitsByDate";
import type { VisitListItemDto } from "@/types/api.types";
import { DirectionalRow } from '@/components/DirectionalRow';
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import { useRetainedDatedData } from "@/hooks/useRetainedDatedData";
import {
  computeIsPendingApprovalWalkInExpired,
  computeIsPendingHostWalkInExpired,
  getPendingApprovalWalkInScheduledEndMs,
} from "@/utils/visitExpiredGuard";
import { useTimeBoundaryTick } from "@/hooks/useTimeBoundaryTick";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";
import { getInitials } from "@/utils/formatters";
import { getLocalizedApiErrorMessage } from "@/utils/apiErrorMessage";

// ─── constants ────────────────────────────────────────────────────────────────

const UPCOMING_STATUSES = new Set([
  'pending_approval',
  'approved',
  'visitor_accepted',
  'expected',
  'pending',
]);
const PAGE_SIZE = 50;

// ─── date-grouping helpers ────────────────────────────────────────────────────

interface DateGroup {
  key: string;
  dateKey: string; // always YYYY-MM-DD, used for chronological sorting
  label: string;
  visits: VisitListItemDto[];
}

function buildGroups(
  visits: VisitListItemDto[],
  labels: { today: string; tomorrow: string },
  localeCode: 'en-US' | 'ar-SA',
): DateGroup[] {
  const groupMap = new Map<string, DateGroup>();

  const ensureGroup = (key: string, dateKey: string, label: string) => {
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, dateKey, label, visits: [] });
    }
  };

  for (const visit of visits) {
    const dk = visit.visitDate; // YYYY-MM-DD from API
    if (!dk) continue;

    const label = formatVisitDateLabel(dk, localeCode, labels);
    ensureGroup(dk, dk, label);
    groupMap.get(dk)!.visits.push(visit);
  }

  // Sort visits within each group: latest time first
  for (const group of groupMap.values()) {
    group.visits.sort((a, b) => {
      const ta = a.visitTime ?? '';
      const tb = b.visitTime ?? '';
      return tb < ta ? -1 : tb > ta ? 1 : 0;
    });
  }

  // Sort every date section chronologically.
  return Array.from(groupMap.values()).sort((a, b) =>
    a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0,
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function UpcomingVisitorsListScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString } = useFormatters();
  const { localeCode, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const riyadhBusinessDateKey = useRiyadhBusinessDateKey();

  const numColumns = screenWidth >= 900 ? 3 : screenWidth >= 600 ? 2 : 1;
  const cardWidthPercent: `${number}%` | undefined =
    numColumns === 3 ? '33.33%' : numColumns === 2 ? '50%' : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVisitors, setExpandedVisitors] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((visitorId: string) => {
    setExpandedVisitors(prev => {
      const next = new Set(prev);
      next.has(visitorId) ? next.delete(visitorId) : next.add(visitorId);
      return next;
    });
  }, []);

  // ── query ──
  const todayKey = riyadhBusinessDateKey;

  const {
    data: infiniteData,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = useInfiniteVisitsQuery(
    { startDate: todayKey, limit: PAGE_SIZE },
  );
  const retainedInput = useMemo(
    () => (infiniteData ? { response: infiniteData, todayKey, limit: PAGE_SIZE } : undefined),
    [infiniteData, todayKey],
  );
  const retainedQuery = useRetainedDatedData(
    JSON.stringify({ todayKey, limit: PAGE_SIZE }),
    retainedInput,
  );
  const displayedInfiniteData = retainedQuery.data?.response;
  const displayedTodayKey = retainedQuery.data?.todayKey ?? todayKey;

  // ── error alert ──
  const hasShownError = useRef(false);
  useEffect(() => {
    if (isError && !isFetchNextPageError && error && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(
        t('common.error'),
        getLocalizedApiErrorMessage(error, t) || t('common.loadError'),
      );
    }
    if (!isError || isFetchNextPageError) hasShownError.current = false;
  }, [isError, isFetchNextPageError, error, t]);

  // ── flatten + filter ──
  const allVisits = useMemo<VisitListItemDto[]>(() => {
    const pages = displayedInfiniteData?.pages ?? [];
    return pages.flatMap(p => p.data ?? []).filter(v => UPCOMING_STATUSES.has(v.status));
  }, [displayedInfiniteData]);
  const expirationBoundaries = useMemo(
    () =>
      allVisits.map((visit) =>
        getPendingApprovalWalkInScheduledEndMs({
          isWalkIn: visit.isWalkIn,
          status: visit.status,
          visitDate: visit.visitDate,
          visitTime: visit.visitTime,
          endTime: visit.endTime,
          duration: visit.duration,
        }),
      ),
    [allVisits],
  );
  const expirationTick = useTimeBoundaryTick(expirationBoundaries);

  // ── search filter ──
  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return allVisits;
    const q = searchQuery.toLowerCase();
    return allVisits.filter(v => {
      const name = v.visitor.fullName.toLowerCase();
      const phone = v.visitor.phone ?? '';
      const company = (v.visitor.company ?? '').toLowerCase();
      return name.includes(q) || phone.includes(searchQuery) || company.includes(q);
    });
  }, [allVisits, searchQuery]);

  // ── group by date ──
  const groups = useMemo(() =>
    buildGroups(
      filteredVisits,
      {
        today: t('common.today'),
        tomorrow: t('time.tomorrow'),
      },
      localeCode,
    ),
  [filteredVisits, t, localeCode]);

  const totalCount = filteredVisits.length;
  const toMatrixItem = useCallback((v: VisitListItemDto): VisitorMatrixItem => {
    // Keep manager-pending expiration on the existing scheduled-end rule.
    const isExpired = computeIsPendingApprovalWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
      visitTime: v.visitTime,
      endTime: v.endTime,
      duration: v.duration,
    });
    const isPendingHostWalkInExpired = computeIsPendingHostWalkInExpired({
      isWalkIn: v.isWalkIn,
      status: v.status,
      visitDate: v.visitDate,
    });
    return {
      id: v.id,
      visitorName: v.visitor.fullName,
      company: v.visitor.company ?? undefined,
      visitDate: v.visitDate ?? undefined,
      plannedInTime: v.visitTime,
      plannedOutTime: v.endTime ?? undefined,
      // Keep Pending Approval as the raw status; expiration is a separate
      // display/action signal.
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
      purpose: v.purpose ?? undefined,
      isExpired: isExpired || isPendingHostWalkInExpired,
    };
  }, [expirationTick, riyadhBusinessDateKey]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl,
  };

  // ── loading skeleton ──
  if (isLoading && !displayedInfiniteData) {
    return (
      <View style={[styles.loadingContainer, {
        paddingTop: insets.top + Spacing.xl,
        paddingHorizontal: Spacing.xl,
      }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  // ── error state ──
  if (isError && !displayedInfiniteData) {
    return (
      <View style={[styles.loadingContainer, {
        paddingTop: insets.top + Spacing.xl,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
        alignItems: 'center',
      }]}>
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

  // ─── helpers ──────────────────────────────────────────────────────────────

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      case 'completed':
        return { label: t('status.completed'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      default:
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    }
  };

  const renderVisitorCard = (item: VisitListItemDto) => {
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = getInitials(visitorName);
    const parkingDecision = resolveParkingDisplayDecision({
      parkingDecision: (item as any).parkingDecision,
      visitorNeedsParking: item.visitorNeedsParking,
      isVisitorNeedsParking: item.isVisitorNeedsParking,
      hasParking: item.hasParking,
    });

    return (
      <ThemedView key={item.id} style={[styles.visitorCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.border }]} />

        <View style={styles.cardMainSection}>
          <DirectionalRow style={styles.cardHeaderRow}>
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

            <View style={styles.cardNameSection}>
              <ThemedText style={[styles.visitorName, { color: theme.text, width: '100%' }]} numberOfLines={1}>
                {visitorName}
              </ThemedText>
              <ThemedText style={[styles.companyText, { color: theme.textSecondary }]}>
                {item.visitor.company ?? ''}
              </ThemedText>
            </View>
            <StatusIcon icon={getStatusIcon(item.status)} color={statusConfig.text} />
          </DirectionalRow>

          <Spacer height={Spacing.md} />

          <DirectionalRow style={styles.dateTimeRow}>
            <DDIcon name="clock" size={13} variant="muted" />
            <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
              {t('reception.hostName')}: {item.employeeName}
            </ThemedText>
            <DDIcon name="user" size={13} variant="muted" />
            <ThemedText style={[styles.separator, { color: theme.border }]}>-</ThemedText>
            <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
              {formatTimeFromString(item.visitTime)}
            </ThemedText>
          </DirectionalRow>

          <Spacer height={Spacing.md} />

          {parkingDecision === 'required' ? (
            <DirectionalRow style={styles.servicesRow}>
              <View style={[styles.servicePillRounded, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                <DDIcon name="map-pin" size={14} color={theme.info} />
              </View>
            </DirectionalRow>
          ) : null}

          {expandedVisitors.has(item.id) && (item.visitor.phone || item.visitor.email) ? (
            <>
              <Spacer height={Spacing.md} />
              <View style={[styles.expandedSection, { backgroundColor: applyOpacity(theme.border, '30') }]}>
                {item.visitor.phone ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="phone" size={14} variant="muted" />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.textSecondary, marginEnd: 8, writingDirection: 'ltr' }]}>
                      {item.visitor.phone}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
                {item.visitor.email ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="mail" size={14} variant="muted" />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.textSecondary, marginEnd: 8 }]}>
                      {item.visitor.email}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </ThemedView>
    );
  };

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <ScreenScrollView
      contentContainerStyle={scrollContentStyle}
      refreshControl={<RefreshControl refreshing={isFetching && !isFetchingNextPage && !!infiniteData} onRefresh={refetch} tintColor={theme.primary} />}
    >
      <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '700' }]}>
        {t('visitor.upcomingVisitors')}
      </ThemedText>

      <Spacer height={Spacing.sm} />

      <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
        {totalCount} {t('visitor.expectedVisitors').toLowerCase()}
      </ThemedText>

      {retainedQuery.isRetained ? (
        <>
          <Spacer height={Spacing.md} />
          <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.primary, '10') }]}>
            <DDIcon name="info" size={16} color={theme.primary} />
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, flex: 1 }]}>
              {t('requests.showingPreviousDataFrom').replace('{{source}}', displayedTodayKey)}
            </ThemedText>
            {isError ? (
              <Pressable onPress={() => refetch()} hitSlop={8}>
                <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                  {t('common.retry')}
                </ThemedText>
              </Pressable>
            ) : null}
          </DirectionalRow>
        </>
      ) : isError && !isFetchNextPageError ? (
        <>
          <Spacer height={Spacing.md} />
          <DirectionalRow style={[styles.inlineFeedback, { backgroundColor: applyOpacity(theme.error, '10') }]}>
            <DDIcon name="alert-circle" size={16} color={theme.error} />
            <ThemedText style={[Typography.caption, { color: theme.error, flex: 1 }]}>{t('common.loadError')}</ThemedText>
            <Pressable onPress={() => refetch()} hitSlop={8}>
              <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>{t('common.retry')}</ThemedText>
            </Pressable>
          </DirectionalRow>
        </>
      ) : isFetching && !isFetchingNextPage && displayedInfiniteData ? (
        <>
          <Spacer height={Spacing.md} />
          <ActivityIndicator size="small" color={theme.primary} />
        </>
      ) : null}

      <Spacer height={Spacing.xl} />

      <SearchInput
        placeholder={t('reception.searchVisitor')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.lg} />

      {groups.length > 0 ? (
        <>
          {groups.map((group) => (
            <View key={group.key} style={styles.groupSection}>
              {/* ── Date header ── */}
              <DirectionalRow style={[styles.dateHeader, { borderColor: theme.border }]}>
                <View style={[styles.dateHeaderAccent, { backgroundColor: theme.primary }]} />
                <ThemedText style={[styles.dateHeaderLabel, { color: theme.text }]}>
                  {group.label}
                </ThemedText>
                <ThemedText style={[styles.dateHeaderCount, { color: theme.textSecondary }]}>
                  {group.visits.length}
                </ThemedText>
              </DirectionalRow>

              <Spacer height={Spacing.md} />

              <VisitorMatrixTable
                variant="matrix"
                visitors={group.visits.map(toMatrixItem)}
                showExpiredState={true}
              />

              <Spacer height={Spacing.xl} />
            </View>
          ))}

        </>
      ) : (
        <View style={styles.emptyState}>
          <DDIcon name="users" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {t('common.noResults')}
          </ThemedText>
        </View>
      )}

      {/* ── Load more ── */}
      {hasNextPage ? (
        <Pressable
          onPress={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={[styles.loadMoreBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <ThemedText style={[styles.loadMoreText, { color: theme.primary }]}>
              {isFetchNextPageError ? t('common.retry') : t('common.seeMore')}
            </ThemedText>
          )}
        </Pressable>
      ) : null}
    </ScreenScrollView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  inlineFeedback: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  // ── date group ──
  groupSection: {},
  dateHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateHeaderAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  dateHeaderLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dateHeaderCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  // ── card grid ──
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapperFull: {
    width: '100%',
  },
  // ── visitor card ──
  visitorCard: {
    borderRadius: 10,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  statusBorderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    borderTopStartRadius: 10,
    borderBottomStartRadius: 10,
  },
  cardMainSection: {},
  cardHeaderRow: {
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md - 2,
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
  cardNameSection: {
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
  servicesRow: {
    gap: Spacing.sm,
  },
  servicePillRounded: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  expandedDetailRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandedDetailText: {
    fontSize: 13,
  },
  // ── empty / load more ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  loadMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
