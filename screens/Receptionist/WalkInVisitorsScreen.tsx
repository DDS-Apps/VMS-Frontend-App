import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, Alert } from "react-native";
import type { WalkInVisitorsScreenProps } from "@/types/receptionistNavigation.types";
import { ROUTES } from "@/constants";
import { SkeletonList } from "@/components/shared/Skeleton";
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
import { VisitorActionButton } from "@/components/VisitorActionButton";
import { applyOpacity } from "@/utils/statusStyles";
import { useTodayVisitorsQuery, useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import type { TodayVisitorDto } from "@/types";
import { DirectionalRow } from '@/components/DirectionalRow';

type StatusFilter = 'all' | 'pending' | 'checked_in' | 'completed';

export default function WalkInVisitorsScreen({ navigation }: WalkInVisitorsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
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

  const { data: todayResponse, isLoading, isFetching, isError, error } = useTodayVisitorsQuery();
  const checkInMutation = useReceptionCheckInMutation();
  const checkOutMutation = useReceptionCheckOutMutation();

  const todaysVisitors = todayResponse?.data ?? [];

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

  if (isLoading || isFetching) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
      </View>
    );
  }

  const handleCheckIn = (visitorId: string, visitorName: string, event: GestureResponderEvent) => {
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
        onError: (error) => {
          Alert.alert(t('common.error'), error.message || t('errors.checkInFailed'));
        }
      }
    );
  };

  const handleCheckOut = (visitorId: string, visitorName: string, event: GestureResponderEvent) => {
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
        onError: (error) => {
          Alert.alert(t('common.error'), error.message || t('errors.checkOutFailed'));
        }
      }
    );
  };

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
      parking: visitor.parkingSlot?.slotNumber,
      origin: 'walk_in' as const,
      scheduledFor: today,
      createdAt: today,
    };
    navigation.navigate(ROUTES.VISITOR_DETAIL as never, { visitor: legacyVisitor } as never);
  };

  const renderVisitorCard = (item: TodayVisitorDto) => {
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = visitorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const showCheckIn = item.status === 'pending' || item.status === 'expected';
    const showCheckOut = item.status === 'checked_in';
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
                <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                  {initials}
                </ThemedText>
              </View>
              
              <View style={styles.nameSection}>
                <ThemedText style={[styles.visitorName, { color: theme.text }]} numberOfLines={1}>
                  {visitorName}
                </ThemedText>
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
              </DirectionalRow>
            </DirectionalRow>

            <DirectionalRow style={styles.servicesStatusRow} justifyContent="space-between">
              <DirectionalRow style={styles.servicesRowContainer}>
                <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '15') }]}>
                  <DDIcon name="user-plus" size={12} color={theme.secondary} />
                </View>
                {item.parkingSlot ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                    <DDIcon name="map-pin" size={12} color={theme.info} />
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
                {(item as any).purpose ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="briefcase" size={14} color={theme.textSecondary} />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: 'right', marginEnd: 8 }]} numberOfLines={2}>
                      {(item as any).purpose}
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

            <DirectionalRow style={styles.cardFooter} justifyContent="flex-end">
              <DirectionalRow style={styles.actionButtons}>
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
              </DirectionalRow>
            </DirectionalRow>
          </View>
        </ThemedView>
      </Pressable>
    );
  };

  return (
    <>
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '700' }]}>
        {t('navigation.walkInVisitors')}
      </ThemedText>
      
      <Spacer height={4} />
      
      <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
        {filteredVisitors.length} {t('reception.walkInVisitor').toLowerCase()}{filteredVisitors.length === 1 ? '' : 's'} found
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <SearchInput
        placeholder={t('reception.searchVisitor')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.md} />

      <View style={[styles.segmentedControl, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {FILTER_OPTIONS.map((option, index) => {
          const isActive = statusFilter === option.key;
          const isFirst = index === 0;
          const isLast = index === FILTER_OPTIONS.length - 1;
          
          return (
            <Pressable
              key={option.key}
              style={[
                styles.segmentButton,
                isActive && { backgroundColor: theme.primary },
                isFirst && styles.segmentFirst,
                isLast && styles.segmentLast,
              ]}
              onPress={() => setStatusFilter(option.key)}
            >
              <ThemedText style={[
                styles.segmentText,
                { color: isActive ? '#FFFFFF' : theme.text }
              ]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Spacer height={Spacing.lg} />

      {filteredVisitors.length > 0 ? (
        <View style={styles.cardList}>
          {filteredVisitors.map((visitor) => renderVisitorCard(visitor))}
        </View>
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
      onPress={() => navigation.navigate(ROUTES.WALK_IN_REGISTRATION as never)}
    >
      <DDIcon name="user-plus" size={24} color="#FFFFFF" />
    </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  segmentedControl: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    height: 36,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  segmentFirst: {
    borderTopStartRadius: BorderRadius.lg - 1,
    borderBottomStartRadius: BorderRadius.lg - 1,
  },
  segmentLast: {
    borderTopEndRadius: BorderRadius.lg - 1,
    borderBottomEndRadius: BorderRadius.lg - 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardList: {
    gap: Spacing.sm,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
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
});
