import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, Alert, ScrollView, LayoutAnimation, Platform, UIManager, useWindowDimensions } from "react-native";
import type { AllVisitorsTodayScreenProps } from "@/types/receptionistNavigation.types";
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
import { formatPhoneNumber } from "@/utils/formatters";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { useTodayVisitorsQuery, useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import type { TodayVisitorDto, ListReceptionTodayParams } from "@/types";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LAYOUT = {
  contentGap: Spacing.md,
};

type StatusFilter = 'all' | 'expected' | 'checked_in' | 'completed';

const ServiceIconsRow = ({ visitor, size = 14 }: { visitor: TodayVisitorDto; size?: number }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  const showParking = visitor.isVisitorNeedsParking === true || visitor.visitorNeedsParking === true || visitor.hasParking === true || !!visitor.parkingSlot;
  const showMeetingRoom = visitor.isMeetingRoom === true || visitor.hasMeetingRoom === true || !!visitor.meetingRoom;
  const showBuffet = visitor.isBuffet === true || visitor.hasBuffet === true;

  const hasServices = showParking || showMeetingRoom || showBuffet;

  if (!hasServices) {
    return <View />;
  }

  return (
    <DirectionalRow style={styles.servicesIconsRow}>
      {showBuffet ? (
        <View style={[styles.serviceIconPill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
          <DDIcon name="coffee" size={size} color={theme.warning} />
        </View>
      ) : null}
      {showMeetingRoom ? (
        <View style={[styles.serviceIconPill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
          <DDIcon name="briefcase" size={size} color={theme.secondary} />
        </View>
      ) : null}
      {showParking ? (
        <View style={[styles.serviceIconPill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
          <DDIcon name="map-pin" size={size} color={theme.info} />
        </View>
      ) : null}
    </DirectionalRow>
  );
};

export default function AllVisitorsTodayScreen({ navigation }: AllVisitorsTodayScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  
  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth > 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedVisitors, setExpandedVisitors] = useState<Set<string>>(new Set());

  const queryParams: ListReceptionTodayParams | undefined = statusFilter !== 'all'
    ? { status: statusFilter }
    : undefined;

  const { data: todayResponse, isLoading, isFetching, isError, error } = useTodayVisitorsQuery(queryParams);
  const checkInMutation = useReceptionCheckInMutation();
  const checkOutMutation = useReceptionCheckOutMutation();

  const todaysVisitors = todayResponse?.data ?? [];
  const summary = todayResponse?.summary ?? { expected: 0, checkedIn: 0, completed: 0, pending: 0 };

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

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'expected', label: t('visitor.expectedVisitors') },
    { key: 'checked_in', label: t('status.checkedIn') },
    { key: 'completed', label: t('timeline.visitCompleted') },
  ];

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const filteredVisitors = useMemo(() => {
    if (!searchQuery.trim()) return todaysVisitors;

    return todaysVisitors.filter(visitor => {
      const name = visitor.visitor.fullName.toLowerCase();
      const phone = visitor.visitor.phone ?? '';
      const company = (visitor.visitor.company ?? '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || phone.includes(searchQuery) || company.includes(query);
    });
  }, [todaysVisitors, searchQuery]);

  const toggleVisitorExpanded = (visitorId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedVisitors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitorId)) {
        newSet.delete(visitorId);
      } else {
        newSet.add(visitorId);
      }
      return newSet;
    });
  };

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
      case 'checked_out':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      case 'pending_approval':
        return { label: t('status.pendingApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
      case 'pending_host_approval':
        return { label: t('status.pendingHostApproval'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
      case 'approved':
      case 'visitor_accepted':
      case 'expected':
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.info, '15'), text: theme.info, border: theme.info };
      case 'rejected':
        return { label: t('status.rejected'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: theme.error };
      case 'cancelled':
        return { label: t('status.cancelled'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      default:
        return { label: t('status.pending'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
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
      hostDepartment: visitor.hostDepartment,
      status: (visitor.status === 'expected' ? 'pending' : visitor.status) as 'pending' | 'checked_in' | 'completed',
      isWalkIn: false,
      phone: visitor.visitor.phone ?? '',
      parking: visitor.parkingSlot?.slotNumber,
      meetingRoom: visitor.meetingRoom ? { name: visitor.meetingRoom.name, floor: visitor.meetingRoom.floor } : undefined,
      origin: 'scheduled' as const,
      scheduledFor: today,
      createdAt: today,
    };
    navigation.navigate(ROUTES.VISITOR_DETAIL as never, { visitor: legacyVisitor } as never);
  };

  const renderVisitorCard = (item: TodayVisitorDto) => {
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = visitorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const showCheckIn = item.status === 'approved' || item.status === 'visitor_accepted' || item.status === 'expected';
    const showCheckOut = item.status === 'checked_in';
    const isExpanded = expandedVisitors.has(item.id);
    const hasDetails = item.visitor.phone;

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

              <View style={[styles.nameSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
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
                <DDIcon name="clock" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {formatTimeFromString(item.visitTime)}
                </ThemedText>
              </DirectionalRow>
              <DirectionalRow style={styles.detailItem}>
                <DDIcon name="user" size={12} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.hostName}{item.hostDepartment ? ` - ${item.hostDepartment}` : ''}
                </ThemedText>
              </DirectionalRow>
            </DirectionalRow>

            <DirectionalRow style={styles.servicesStatusRow} justifyContent="space-between">
              <ServiceIconsRow visitor={item} />
              <DirectionalRow alignItems="center">
                {showCheckIn ? (
                  <View style={{ marginEnd: Spacing.sm }}>
                    <VisitorActionButton
                      type="check_in"
                      onPress={(e) => handleCheckIn(item.id, visitorName, e)}
                    />
                  </View>
                ) : showCheckOut ? (
                  <View style={{ marginEnd: Spacing.sm }}>
                    <VisitorActionButton
                      type="check_out"
                      onPress={(e) => handleCheckOut(item.id, visitorName, e)}
                    />
                  </View>
                ) : null}
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 }]}>
                  <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                    {statusConfig.label}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </DirectionalRow>

            {isExpanded && hasDetails ? (
              <View style={styles.expandedSection}>
                {item.visitor.phone ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="phone" size={14} color={theme.textSecondary} />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.text }]} numberOfLines={1}>
                      {formatPhoneNumber(item.visitor.phone)}
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

  const renderSummaryCard = (label: string, count: number, color: string, icon: string) => (
    <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.summaryIconContainer, { backgroundColor: applyOpacity(color, '15') }]}>
        <DDIcon name={icon as any} size={16} color={color} />
      </View>
      <ThemedText style={[styles.summaryCount, { color: theme.text }]}>{count}</ThemedText>
      <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]} numberOfLines={1}>{label}</ThemedText>
    </View>
  );

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title, { fontSize: 22, fontWeight: '700' }]}>
        {t('navigation.todaysVisitors')}
      </ThemedText>

      <Spacer height={4} />

      <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
        {todaysVisitors.length} {t('dashboard.expectedToday').toLowerCase()}
      </ThemedText>

      <Spacer height={Spacing.md} />

      <DirectionalRow style={styles.summaryRow}>
        {renderSummaryCard(t('visitor.expectedVisitors'), summary.expected, theme.warning, 'clock')}
        {renderSummaryCard(t('status.checkedIn'), summary.checkedIn, theme.success, 'log-in')}
        {renderSummaryCard(t('status.checkedOut'), summary.completed, theme.textSecondary, 'log-out')}
      </DirectionalRow>

      <Spacer height={Spacing.lg} />

      <SearchInput
        placeholder={t('reception.searchVisitor')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.md} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        nestedScrollEnabled={true}
      >
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
                <ThemedText
                  style={[
                    styles.segmentText,
                    { color: isActive ? '#FFFFFF' : theme.text }
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Spacer height={Spacing.lg} />

      {filteredVisitors.length > 0 ? (
        <View style={styles.cardList}>
          {filteredVisitors.map((visitor) => (
            <View 
              key={visitor.id} 
              style={numColumns === 3 ? styles.gridItem3 : numColumns === 2 ? styles.gridItem2 : styles.gridItem1}
            >
              {renderVisitorCard(visitor)}
            </View>
          ))}
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
  summaryRow: {
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  filterScrollContent: {
    alignItems: 'flex-start',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    height: 36,
  },
  segmentButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
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
  gridItem1: {
    width: '100%',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  nameSection: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  companyText: {
    fontSize: 12,
    marginTop: 2,
  },
  detailsRow: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
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
  servicesIconsRow: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  serviceIconPill: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
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
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardFooter: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  servicesRow: {
    gap: Spacing.xs,
  },
  servicePill: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  servicePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    gap: Spacing.xs,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: 4,
    minWidth: 90,
    height: 28,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
