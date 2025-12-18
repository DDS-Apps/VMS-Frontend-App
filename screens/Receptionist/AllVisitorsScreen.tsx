import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, Alert } from "react-native";
import type { AllVisitorsScreenProps } from "@/types/receptionistNavigation.types";
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
import { DDIcon } from "@/components/DDIcon";
import { VisitorActionButton } from "@/components/VisitorActionButton";
import { applyOpacity } from "@/utils/statusStyles";
import { useSearchVisitorsQuery, useTodayVisitorsQuery, useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import type { TodayVisitorDto, SearchVisitorDto } from "@/types";

type DateFilter = 'all' | 'today' | 'this_week';

export default function AllVisitorsScreen({ navigation }: AllVisitorsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString } = useFormatters();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const { data: todayResponse, isLoading: isTodayLoading, isFetching: isTodayFetching, isError: isTodayError, error: todayError } = useTodayVisitorsQuery();
  const { data: searchResponse, isLoading: isSearchLoading, isFetching: isSearchFetching, isError: isSearchError, error: searchError } = useSearchVisitorsQuery(
    { q: searchQuery, limit: 50 },
    { enabled: searchQuery.length >= 2 }
  );
  const checkInMutation = useReceptionCheckInMutation();
  const checkOutMutation = useReceptionCheckOutMutation();

  const isLoading = searchQuery.length >= 2 ? isSearchLoading : isTodayLoading;
  const isFetching = searchQuery.length >= 2 ? isSearchFetching : isTodayFetching;

  const FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'today', label: t('time.today') },
    { key: 'this_week', label: t('time.thisWeek') },
  ];

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const todaysVisitors = todayResponse?.data ?? [];

  const queryError = searchQuery.length >= 2 ? searchError : todayError;
  const hasError = searchQuery.length >= 2 ? isSearchError : isTodayError;

  const hasShownError = useRef(false);

  useEffect(() => {
    if (hasError && queryError && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(t('common.error'), queryError?.message || t('common.loadError'));
    }
    if (!hasError) {
      hasShownError.current = false;
    }
  }, [hasError, queryError, t]);

  const filteredVisitors = useMemo(() => {
    if (searchQuery.length >= 2 && searchResponse?.data) {
      return searchResponse.data;
    }
    
    return todaysVisitors
      .filter(visitor => {
        const name = visitor.visitor.fullName.toLowerCase();
        const phone = visitor.visitor.phone ?? '';
        const company = (visitor.visitor.company ?? '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || phone.includes(searchQuery) || company.includes(query);
      })
      .filter((visitor) => {
        if (dateFilter === 'all') return true;
        if (dateFilter === 'today') return true;
        return true;
      });
  }, [todaysVisitors, searchResponse, searchQuery, dateFilter]);

  if (isLoading || isFetching) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (hasError) {
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
          navigation.navigate('CheckInOutConfirmation', {
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
          navigation.navigate('CheckInOutConfirmation', {
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
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      default:
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    }
  };

  const handleVisitorPress = (visitor: TodayVisitorDto | SearchVisitorDto) => {
    const today = new Date().toISOString().split('T')[0];
    const legacyVisitor = {
      id: visitor.id,
      name: visitor.visitor.fullName,
      company: visitor.visitor.company ?? '',
      time: visitor.visitTime,
      host: visitor.hostName,
      status: (visitor.status === 'expected' ? 'pending' : visitor.status) as 'pending' | 'checked_in' | 'completed',
      isWalkIn: false,
      phone: '',
      origin: 'scheduled' as const,
      scheduledFor: 'visitDate' in visitor ? visitor.visitDate : today,
      createdAt: today,
    };
    navigation.navigate('VisitorDetail', { visitor: legacyVisitor });
  };

  const renderTodayVisitorCard = (item: TodayVisitorDto) => {
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = visitorName.split(' ').map(n => n[0]).join('');
    const showCheckIn = item.status === 'pending' || item.status === 'expected';
    const showCheckOut = item.status === 'checked_in';
    
    return (
      <Pressable 
        key={item.id} 
        onPress={() => handleVisitorPress(item)}
        style={({ pressed }) => [pressed && { opacity: 0.95 }]}
      >
        <ThemedView style={[styles.visitorCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.border }]} />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
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

              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <DDIcon name="clock" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {formatTimeFromString(item.visitTime)}
                </ThemedText>
              </View>
              <View style={styles.detailItem}>
                <DDIcon name="user" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {t('reception.hostName')}: {item.hostName}
                </ThemedText>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.servicesRow}>
                {item.parkingSlot ? (
                  <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '15') }]}>
                    <DDIcon name="map-pin" size={12} color={theme.info} />
                  </View>
                ) : null}
                </View>

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
                ) : (
                  <VisitorActionButton type="completed" />
                )}
              </View>
            </View>
          </View>
        </ThemedView>
      </Pressable>
    );
  };

  const renderSearchResultCard = (item: SearchVisitorDto) => {
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = visitorName.split(' ').map(n => n[0]).join('');
    
    return (
      <Pressable 
        key={item.id} 
        onPress={() => handleVisitorPress(item)}
        style={({ pressed }) => [pressed && { opacity: 0.95 }]}
      >
        <ThemedView style={[styles.visitorCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.border }]} />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
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

              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <DDIcon name="calendar" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {item.visitDate}
                </ThemedText>
              </View>
              <View style={styles.detailItem}>
                <DDIcon name="clock" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {formatTimeFromString(item.visitTime)}
                </ThemedText>
              </View>
              <View style={styles.detailItem}>
                <DDIcon name="user" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {item.hostName}
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      </Pressable>
    );
  };

  const isSearchResult = searchQuery.length >= 2 && searchResponse?.data;

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '700' }]}>
        {t('navigation.allVisitors')}
      </ThemedText>
      
      <Spacer height={4} />
      
      <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
        {filteredVisitors.length} {filteredVisitors.length === 1 ? 'visitor' : 'visitors'} found
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <SearchInput
        placeholder={t('reception.searchVisitor')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.md} />

      {!isSearchResult ? (
        <View style={[styles.segmentedControl, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {FILTER_OPTIONS.map((option, index) => {
            const isActive = dateFilter === option.key;
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
                onPress={() => setDateFilter(option.key)}
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
      ) : null}

      <Spacer height={Spacing.lg} />

      {filteredVisitors.length > 0 ? (
        <View style={styles.cardList}>
          {isSearchResult
            ? (filteredVisitors as SearchVisitorDto[]).map((visitor) => renderSearchResultCard(visitor))
            : (filteredVisitors as TodayVisitorDto[]).map((visitor) => renderTodayVisitorCard(visitor))
          }
        </View>
      ) : (
        <View style={styles.emptyState}>
          <DDIcon name="users" size={40} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {t('common.noResults')}
          </ThemedText>
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: 'row',
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
    marginTop: 1,
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
});
