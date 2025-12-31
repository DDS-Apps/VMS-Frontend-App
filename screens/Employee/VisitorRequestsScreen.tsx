import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { DDIcon } from "@/components/DDIcon";
import { SkeletonList } from "@/components/shared/Skeleton";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenFlatList } from "@/components/ScreenFlatList";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { REQUEST_STATUS, UPCOMING_STATUSES, CANCELLED_STATUSES } from "@/constants/requestConstants";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitorRequest } from "@/types/vms.types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteVisitsQuery, usePendingHostWalkInsQuery } from "@/hooks/queries/useApprovalQueries";
import { ListLoadingFooter } from "@/components/shared";
import type { VisitListItemDto } from "@/types/api.types";
import { getStatusConfig as getStatusStyle, applyOpacity, StatusConfig } from "@/utils/statusStyles";
import type { Theme } from "@/types/theme.types";
import type { EmployeeStackParamList } from "@/types/employeeNavigation.types";
import type { ManagerStackParamList } from "@/types/managerNavigation.types";
import { mapVisitListItemToVisitorRequest, mapPendingHostWalkInToVisitorRequest } from "@/utils/requestMappers";


// Unified Layout Tokens
const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.xxl,
  contentGap: Spacing.md,
  statCardRadius: BorderRadius.md,
  statusBorderWidth: 3,
  // Table-specific
  tableRowHeight: 110,
  tableFixedColumnWidth: 160,
  tableScrollColumnWidth: 240,
};

type EmployeeTab = 'upcoming' | 'waiting' | 'past' | 'all' | 'walkin';
type ManagerTab = 'all' | 'pending' | 'awaiting' | 'walkin';
type TabType = EmployeeTab | ManagerTab;

interface VisitorRequestsScreenProps {
  navigation?: NativeStackNavigationProp<EmployeeStackParamList>;
  userRole?: 'employee' | 'manager';
}

// Shared: Status Accent Bar Component
const StatusAccent = ({ color }: { color: string }) => (
  <View style={[styles.statusAccent, { backgroundColor: color }]} />
);

// Shared: Service Icons Component
const ServiceIcons = ({ request, theme, size = 16 }: { request: VisitorRequest; theme: Theme; size?: number }) => (
  <View style={styles.servicesRow}>
    {request.parkingSlot && (
      <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20'), width: size * 2, height: size * 2, borderRadius: size }]}>
        <DDIcon name="map-pin" size={size} color={theme.info} />
      </View>
    )}
    {request.meetingRoom && (
      <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20'), width: size * 2, height: size * 2, borderRadius: size }]}>
        <DDIcon name="briefcase" size={size} color={theme.secondary} />
      </View>
    )}
    {request.buffet && (
      <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20'), width: size * 2, height: size * 2, borderRadius: size }]}>
        <DDIcon name="cloche" size={size} variant="warning" />
      </View>
    )}
    {request.valet && (
      <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, '20'), width: size * 2, height: size * 2, borderRadius: size }]}>
        <DDIcon name="truck" size={size} variant="primary" />
      </View>
    )}
  </View>
);

// Shared: Status Badge Component - matches shared VisitorRequestCard styling
const StatusBadge = ({ statusConfig, compact = false }: { statusConfig: StatusConfig; compact?: boolean }) => (
  <View style={[
    styles.statusBadge, 
    { 
      backgroundColor: statusConfig.bg, 
      borderColor: statusConfig.border,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    }
  ]}>
    <ThemedText style={[styles.statusText, { color: statusConfig.text, fontSize: compact ? 10 : 10 }]}>
      {statusConfig.label}
    </ThemedText>
  </View>
);

// Shared: Visitor Avatar Component
const VisitorAvatar = ({ name, theme, size = 44 }: { name: string; theme: Theme; size?: number }) => {
  const initials = name.split(' ').map(n => n[0]).join('');
  return (
    <View style={[
      styles.avatar, 
      { 
        backgroundColor: applyOpacity(theme.primary, '15'),
        width: size,
        height: size,
        borderRadius: LAYOUT.cardRadius - 2,
      }
    ]}>
      <ThemedText style={[styles.avatarText, { color: theme.primary, fontSize: size * 0.36 }]}>
        {initials}
      </ThemedText>
    </View>
  );
};

// Shared: Date/Time Display Component
const DateTimeDisplay = ({ date, time, duration, theme, compact = false }: { date: string; time: string; duration?: string; theme: Theme; compact?: boolean }) => {
  const { formatDateShort, toLocalNumerals, formatTimeFromString } = useFormatters();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const formatVisitDate = (dateString: string) => {
    const d = new Date(dateString);
    return formatDateShort(d);
  };

  const formatDuration = (durationStr: string): string => {
    const match = durationStr.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|minute|minutes|min|mins)/i);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      const localNum = toLocalNumerals(num.toString());
      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        return `${localNum} ${num === 1 ? t('time.hour') : t('time.hours')}`;
      } else {
        return `${localNum} ${num === 1 ? t('time.minute') : t('time.minutes')}`;
      }
    }
    return toLocalNumerals(durationStr);
  };

  return (
    <View style={styles.dateTimeRowSplit}>
      <View style={[styles.dateTimeLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <DDIcon name="calendar" size={compact ? 13 : 14} variant="muted" />
        <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: compact ? 12 : 13 }]}>
          {formatVisitDate(date)}
        </ThemedText>
      </View>
      <View style={[styles.dateTimeRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <DDIcon name="clock" size={compact ? 13 : 14} variant="muted" />
        <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: compact ? 12 : 13 }]}>
          {formatTimeFromString(time)}
        </ThemedText>
        {duration ? (
          <>
            <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
            <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: compact ? 12 : 13 }]}>
              {formatDuration(duration)}
            </ThemedText>
          </>
        ) : null}
      </View>
    </View>
  );
};

// Table View: Horizontal Scrolling Row Component
const VisitorRequestTableRow = React.memo(({ 
  request, 
  onPress,
  theme,
  t 
}: { 
  request: VisitorRequest; 
  onPress: () => void;
  theme: Theme;
  t: (key: string) => string;
}) => {
  const statusConfig = getStatusStyle(theme, request.status, t);

  return (
    <Pressable 
      onPress={onPress}
      android_ripple={{ color: applyOpacity(theme.primary, '10') }}
    >
      <ThemedView style={[styles.tableRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <StatusAccent color={statusConfig.borderColor} />
        
        {/* Fixed Column - Always Visible: Name & Time Only */}
        <View style={[styles.fixedColumn, { width: LAYOUT.tableFixedColumnWidth }]}>
          <View style={styles.fixedColumnContent}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, flexShrink: 1 }]} numberOfLines={2}>
                  {request.visitor.fullName}
                </ThemedText>
                {request.isWalkIn ? (
                  <DDIcon name="user-check" size={14} color={theme.warning} />
                ) : null}
              </View>
              <Spacer height={6} />
              <DateTimeDisplay 
                date={request.visitDate} 
                time={request.visitTime} 
                theme={theme} 
                compact 
              />
            </View>
          </View>
        </View>

        {/* Scrollable Columns - All Details */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.scrollableColumns}
          contentContainerStyle={styles.scrollableContent}
          persistentScrollbar={true}
          nestedScrollEnabled={true}
        >
          {/* Company Column */}
          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('form.company').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ThemedText style={[styles.columnValue, { fontSize: 15 }]} numberOfLines={2}>
              {request.visitor.company || '-'}
            </ThemedText>
          </View>

          {/* Purpose Column */}
          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('form.purpose').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ThemedText style={[styles.columnValue, { fontSize: 15 }]} numberOfLines={3}>
              {request.purpose}
            </ThemedText>
          </View>

          {/* Status Column */}
          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('status.pending').toUpperCase().replace('PENDING', t('common.filter').toUpperCase())}
            </ThemedText>
            <Spacer height={10} />
            <StatusBadge statusConfig={statusConfig} />
          </View>

          {/* Services Column */}
          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('services.additionalServices').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <ServiceIcons request={request} theme={theme} size={16} />
          </View>

          {/* Contact Column */}
          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('security.manualEntry').toUpperCase().split(' ')[0]}</ThemedText>
            <Spacer height={10} />
            <View style={styles.contactColumn}>
              {request.visitor.email ? (
                <View style={styles.contactRow}>
                  <DDIcon name="mail" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { fontSize: 14, marginStart: 8, color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>
                    {request.visitor.email}
                  </ThemedText>
                </View>
              ) : null}
              {request.visitor.email && request.visitor.phone ? <Spacer height={6} /> : null}
              {request.visitor.phone ? (
                <View style={styles.contactRow}>
                  <DDIcon name="phone" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { fontSize: 14, marginStart: 8, color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>
                    {request.visitor.phone}
                  </ThemedText>
                </View>
              ) : null}
              {!request.visitor.email && !request.visitor.phone ? (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>-</ThemedText>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </Pressable>
  );
});

// Card View: Request Card Component
const VisitorRequestCard = React.memo(({ 
  request, 
  isExpanded,
  onPress,
  onToggleExpand,
  theme,
  t 
}: { 
  request: VisitorRequest; 
  isExpanded: boolean;
  onPress: () => void;
  onToggleExpand: () => void;
  theme: Theme;
  t: (key: string) => string;
}) => {
  const statusConfig = getStatusStyle(theme, request.status, t);

  return (
    <ThemedView style={[styles.requestCard, { backgroundColor: theme.surface }]}>
      <StatusAccent color={statusConfig.borderColor} />

      {/* Main Card Content - Clickable to navigate */}
      <Pressable
        onPress={onPress}
        android_ripple={{ color: applyOpacity(theme.primary, '10') }}
      >
        <View style={styles.cardMainSection}>
          {/* Header: Avatar + Name + Status Badge */}
          <View style={styles.cardHeaderRow}>
            <VisitorAvatar name={request.visitor.fullName} theme={theme} />
            
            <View style={styles.cardNameSection}>
              <View style={styles.nameWithBadgeRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 16, flexShrink: 1 }]} numberOfLines={1}>
                    {request.visitor.fullName}
                  </ThemedText>
                  {request.isWalkIn ? (
                    <DDIcon name="user-check" size={14} color={theme.warning} />
                  ) : null}
                </View>
                <StatusBadge statusConfig={statusConfig} />
              </View>
              {request.visitor.company ? (
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
                  {request.visitor.company}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <Spacer height={LAYOUT.contentGap} />

          {/* Date and Time Row */}
          <DateTimeDisplay 
            date={request.visitDate} 
            time={request.visitTime} 
            duration={request.duration}
            theme={theme} 
          />

          <Spacer height={LAYOUT.contentGap} />

          {/* Bottom Row: Services Icons only */}
          <ServiceIcons request={request} theme={theme} />
        </View>
      </Pressable>

      {/* Expandable Secondary Details - Inside Same Card */}
      {isExpanded && (
        <>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <View style={styles.expandedContentInside}>
            <View style={styles.secondaryDetail}>
              <DDIcon name="briefcase" size={14} variant="muted" />
              <ThemedText style={[Typography.caption, { marginStart: 6, color: theme.textSecondary, flex: 1, fontSize: 12 }]}>
                {request.purpose}
              </ThemedText>
            </View>

            <Spacer height={Spacing.sm} />

            <View style={styles.contactSection}>
              {request.visitor.email ? (
                <View style={styles.secondaryDetail}>
                  <DDIcon name="mail" size={13} variant="muted" />
                  <ThemedText style={[Typography.caption, { marginStart: 6, color: theme.textSecondary, fontSize: 11 }]}>
                    {request.visitor.email}
                  </ThemedText>
                </View>
              ) : null}

              {request.visitor.email && request.visitor.phone ? (
                <Spacer height={Spacing.xs} />
              ) : null}

              {request.visitor.phone ? (
                <View style={styles.secondaryDetail}>
                  <DDIcon name="phone" size={13} variant="muted" />
                  <ThemedText style={[Typography.caption, { marginStart: 6, color: theme.textSecondary, fontSize: 11 }]}>
                    {request.visitor.phone}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </>
      )}

      {/* More Details Button - Inside Same Card */}
      <Pressable
        style={styles.moreDetailsButton}
        onPress={onToggleExpand}
        android_ripple={{ color: applyOpacity(theme.primary, '10') }}
      >
        <ThemedText style={[styles.moreDetailsText, { color: theme.primary }]}>
          {isExpanded ? t('common.close') : t('actions.viewDetails')}
        </ThemedText>
        <DDIcon 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={16} 
          variant="primary" 
        />
      </Pressable>
    </ThemedView>
  );
});

// Shared: Stats Cards Component
const StatsCards = ({ totalVisitors, todaysVisitors, theme, t }: { totalVisitors: number; todaysVisitors: number; theme: Theme; t: (key: string) => string }) => (
  <View style={styles.statsGrid}>
    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.info, '15') }]}>
        <DDIcon name="users" size={24} color={theme.info} />
      </View>
      <Spacer height={Spacing.md} />
      <ThemedText style={[Typography.title, { fontSize: 28, lineHeight: 36, fontWeight: '700' }]}>
        {totalVisitors}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center', marginTop: 4 }]}>
        {t('dashboard.totalVisitors')}
      </ThemedText>
    </ThemedView>

    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.success, '15') }]}>
        <DDIcon name="calendar" size={24} color={theme.success} />
      </View>
      <Spacer height={Spacing.md} />
      <ThemedText style={[Typography.title, { fontSize: 28, lineHeight: 36, fontWeight: '700' }]}>
        {todaysVisitors}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center', marginTop: 4 }]}>
        {t('dashboard.todaysVisitors')}
      </ThemedText>
    </ThemedView>
  </View>
);

// Shared: Header with Tabs and View Toggle
const SectionHeader = ({ 
  selectedTab, 
  onTabChange, 
  viewMode, 
  onViewModeChange, 
  theme,
  t,
  userRole = 'employee'
}: { 
  selectedTab: TabType; 
  onTabChange: (tab: TabType) => void;
  viewMode: 'card' | 'list';
  onViewModeChange: (mode: 'card' | 'list') => void;
  theme: Theme;
  t: (key: string) => string;
  userRole?: 'employee' | 'manager';
}) => {
  const getEmployeeTabLabel = (tab: EmployeeTab) => {
    switch (tab) {
      case 'upcoming': return t('visitor.upcomingVisitors');
      case 'waiting': return t('status.waitingOnVisitor');
      case 'past': return t('status.completed');
      case 'all': return t('common.all');
      case 'walkin': return t('navigation.walkInVisitors');
    }
  };

  const getManagerTabLabel = (tab: ManagerTab) => {
    switch (tab) {
      case 'all': return t('common.all');
      case 'pending': return t('navigation.pendingApprovals');
      case 'awaiting': return t('navigation.awaitingVisitor');
      case 'walkin': return t('navigation.walkInVisitors');
    }
  };

  const getTabLabel = (tab: TabType) => {
    if (userRole === 'manager') {
      return getManagerTabLabel(tab as ManagerTab);
    }
    return getEmployeeTabLabel(tab as EmployeeTab);
  };

  const tabs: TabType[] = userRole === 'manager' 
    ? ['all', 'pending', 'awaiting', 'walkin']
    : ['all', 'upcoming', 'waiting', 'past', 'walkin'];

  return (
  <>
    <View style={[styles.sectionTitleRow, styles.paddedContent]}>
      <ThemedText style={[Typography.subtitle]}>
        {t('navigation.myRequests')}
      </ThemedText>
      <View style={styles.viewToggle}>
        <Pressable
          style={[
            styles.viewToggleButton,
            styles.viewToggleButtonLeft,
            { 
              backgroundColor: viewMode === 'card' ? theme.primary : theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={() => onViewModeChange('card')}
          android_ripple={{ color: applyOpacity(theme.primary, '10') }}
        >
          <DDIcon 
            name="grid" 
            size={16} 
            color={viewMode === 'card' ? theme.buttonText : theme.textSecondary} 
          />
        </Pressable>
        <Pressable
          style={[
            styles.viewToggleButton,
            styles.viewToggleButtonRight,
            { 
              backgroundColor: viewMode === 'list' ? theme.primary : theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={() => onViewModeChange('list')}
          android_ripple={{ color: applyOpacity(theme.primary, '10') }}
        >
          <DDIcon 
            name="menu" 
            size={16} 
            color={viewMode === 'list' ? theme.buttonText : theme.textSecondary} 
          />
        </Pressable>
      </View>
    </View>

    <Spacer height={LAYOUT.contentGap} />

    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
      nestedScrollEnabled={true}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          style={[
            styles.tab,
            selectedTab === tab && { borderBottomWidth: 2, borderBottomColor: theme.primary },
          ]}
          onPress={() => onTabChange(tab)}
          android_ripple={{ color: applyOpacity(theme.primary, '10') }}
        >
          <ThemedText
            style={[
              Typography.body,
              { color: selectedTab === tab ? theme.primary : theme.textSecondary, fontWeight: '600' },
            ]}
            numberOfLines={1}
          >
            {getTabLabel(tab)}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  </>
  );
};

// Shared: Empty State
const EmptyState = ({ theme, t }: { theme: Theme; t: (key: string) => string }) => (
  <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
    <DDIcon name="inbox" size={48} variant="muted" />
    <Spacer height={Spacing.md} />
    <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
      {t('common.noResults')}
    </ThemedText>
  </ThemedView>
);

// Route params type that works for both stacks
type VisitorRequestsRouteParams = {
  initialTab?: string;
};

// Main Screen Component
export default function VisitorRequestsScreen({ navigation: navProp, userRole = 'employee' }: VisitorRequestsScreenProps = {}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigationHook = useNavigation<NativeStackNavigationProp<EmployeeStackParamList>>();
  const navigation = navProp || navigationHook;
  const route = useRoute();
  const routeParams = (route.params as VisitorRequestsRouteParams | undefined);
  const { user } = useAuth();
  const isManager = userRole === 'manager';
  
  const validManagerTabs: ManagerTab[] = ['all', 'pending', 'awaiting', 'walkin'];
  const validEmployeeTabs: EmployeeTab[] = ['all', 'upcoming', 'waiting', 'past', 'walkin'];
  const isValidManagerTab = (tab: string): tab is ManagerTab => validManagerTabs.includes(tab as ManagerTab);
  const isValidEmployeeTab = (tab: string): tab is EmployeeTab => validEmployeeTabs.includes(tab as EmployeeTab);
  
  const defaultTab: TabType = isManager ? 'all' : 'all';
  const getInitialTab = (): TabType | undefined => {
    const paramTab = routeParams?.initialTab;
    if (!paramTab) return undefined;
    if (isManager && isValidManagerTab(paramTab)) return paramTab;
    if (!isManager && isValidEmployeeTab(paramTab)) return paramTab;
    return undefined;
  };
  const initialTabFromParams = getInitialTab();
  
  const [selectedTab, setSelectedTab] = useState<TabType>(initialTabFromParams || defaultTab);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [lastInitialTab, setLastInitialTab] = useState<string | undefined>(initialTabFromParams);

  useEffect(() => {
    const paramTab = routeParams?.initialTab;
    if (!paramTab || paramTab === lastInitialTab) return;
    
    if (isManager && isValidManagerTab(paramTab)) {
      setSelectedTab(paramTab);
      setLastInitialTab(paramTab);
    } else if (!isManager && isValidEmployeeTab(paramTab)) {
      setSelectedTab(paramTab);
      setLastInitialTab(paramTab);
    }
  }, [isManager, routeParams?.initialTab, lastInitialTab]);

  const isWalkInTab = selectedTab === 'walkin';

  const visitsParams = useMemo(() => {
    if (isManager) {
      switch (selectedTab) {
        case 'pending': return { pendingApproval: true };
        case 'awaiting': return { awaitingVisitor: true };
        case 'walkin': return {}; // Use separate pending host walk-ins query
        default: return {};
      }
    }
    // Employee: use myRequestsOnly to fetch only their own requests
    return { myRequestsOnly: true };
  }, [isManager, selectedTab]);

  const { 
    data: visitsData, 
    isLoading: isVisitsLoading, 
    isFetching: isVisitsFetching,
    error: visitsError, 
    refetch: refetchVisits,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteVisitsQuery(visitsParams, !isWalkInTab);

  // Query for pending host walk-ins (used when walkin tab is selected)
  const {
    data: pendingHostWalkInsData,
    isLoading: isPendingHostWalkInsLoading,
    isFetching: isPendingHostWalkInsFetching,
    error: pendingHostWalkInsError,
    refetch: refetchPendingHostWalkIns,
  } = usePendingHostWalkInsQuery({ limit: 100 }, isWalkInTab);

  const isLoading = isWalkInTab ? isPendingHostWalkInsLoading : isVisitsLoading;
  const isFetching = isWalkInTab ? isPendingHostWalkInsFetching : isVisitsFetching;
  const error = isWalkInTab ? pendingHostWalkInsError : visitsError;
  const refetch = isWalkInTab ? refetchPendingHostWalkIns : refetchVisits;

  // Refetch data when screen gains focus to show latest status
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const requests = useMemo(() => {
    if (isWalkInTab) {
      if (!pendingHostWalkInsData?.data) return [];
      return pendingHostWalkInsData.data.map(mapPendingHostWalkInToVisitorRequest);
    }
    if (!visitsData?.pages) return [];
    return visitsData.pages.flatMap(page => page.data.map(mapVisitListItemToVisitorRequest));
  }, [isWalkInTab, visitsData?.pages, pendingHostWalkInsData?.data]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading || isFetching) {
    return (
      <View style={{ flex: 1, paddingHorizontal: Spacing.xl, paddingTop: insets.top + Spacing.xl }}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, paddingHorizontal: Spacing.xl, paddingTop: insets.top + Spacing.xl, justifyContent: 'center', alignItems: 'center' }}>
        <DDIcon name="alert-circle" size={48} color={theme.error} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('errors.loadFailed')}
        </ThemedText>
        <Spacer height={Spacing.lg} />
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const totalVisitors = requests.length;
  const todaysVisitors = requests.filter((request) => {
    const visitDate = new Date(request.visitDate);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;

  const getFilteredRequests = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = requests;

    switch (selectedTab) {
      case 'upcoming':
        filtered = requests.filter(request => {
          const visitDate = new Date(request.visitDate);
          return visitDate >= today && (UPCOMING_STATUSES as readonly string[]).includes(request.status);
        });
        break;
      case 'waiting':
        filtered = requests.filter(request => {
          return request.status === REQUEST_STATUS.VISITOR_PENDING;
        });
        break;
      case 'past':
        filtered = requests.filter(request => {
          const visitDate = new Date(request.visitDate);
          return visitDate < today || request.status === REQUEST_STATUS.COMPLETED || (CANCELLED_STATUSES as readonly string[]).includes(request.status);
        });
        break;
      case 'walkin':
        // For walkin tab, the data already comes from the pending-host API
        // Just return all requests as they are already filtered
        filtered = requests;
        break;
      case 'all':
      default:
        filtered = requests;
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  // List View Layout - CRITICAL: ScreenFlatList as ROOT element
  if (viewMode === 'list') {
    return (
      <>
        <ScreenFlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.paddedContent}>
              <VisitorRequestTableRow 
                request={item} 
                onPress={() => navigation.navigate('RequestDetails', { requestId: item.id })}
                theme={theme}
                t={t}
              />
            </View>
          )}
          ListHeaderComponent={
            <>
              {/* Stats Cards - needs padding */}
              <View style={styles.paddedContent}>
                <StatsCards totalVisitors={totalVisitors} todaysVisitors={todaysVisitors} theme={theme} t={t} />
              </View>

              <Spacer height={LAYOUT.sectionSpacing} />

              {/* Header Controls - SectionHeader handles its own padding */}
              <SectionHeader 
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                theme={theme}
                t={t}
                userRole={userRole}
              />

              <Spacer height={Spacing.lg} />
            </>
          }
          ListEmptyComponent={<View style={styles.paddedContent}><EmptyState theme={theme} t={t} /></View>}
          ListFooterComponent={<ListLoadingFooter isLoading={isFetchingNextPage && !isWalkInTab} />}
          ItemSeparatorComponent={() => <Spacer height={Spacing.md} />}
          onEndReached={isWalkInTab ? undefined : handleLoadMore}
          onEndReachedThreshold={0.5}
        />

        <Pressable
          style={[
            styles.fab,
            { 
              backgroundColor: theme.primary,
              bottom: insets.bottom + 80 + Spacing.lg,
            },
          ]}
          onPress={() => navigation.navigate('VisitTypeSelection')}
        >
          <DDIcon name="user-plus" size={24} color={theme.buttonText} />
        </Pressable>
      </>
    );
  }

  // Card View Layout - CRITICAL: ScreenFlatList as ROOT element for infinite scroll
  return (
    <>
      <ScreenFlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.paddedContent}>
            <VisitorRequestCard
              request={item}
              isExpanded={expandedCard === item.id}
              onPress={() => navigation.navigate('RequestDetails', { requestId: item.id })}
              onToggleExpand={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
              theme={theme}
              t={t}
            />
          </View>
        )}
        ListHeaderComponent={
          <>
            <Spacer height={Spacing.md} />

            {/* Stats Cards - needs padding */}
            <View style={styles.paddedContent}>
              <StatsCards totalVisitors={totalVisitors} todaysVisitors={todaysVisitors} theme={theme} t={t} />
            </View>

            <Spacer height={LAYOUT.sectionSpacing} />

            {/* Section Header - handles its own padding for horizontal scrolls */}
            <SectionHeader 
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              theme={theme}
              t={t}
              userRole={userRole}
            />

            <Spacer height={Spacing.lg} />
          </>
        }
        ListEmptyComponent={<View style={styles.paddedContent}><EmptyState theme={theme} t={t} /></View>}
        ListFooterComponent={<ListLoadingFooter isLoading={isFetchingNextPage && !isWalkInTab} />}
        ItemSeparatorComponent={() => <Spacer height={LAYOUT.contentGap} />}
        onEndReached={isWalkInTab ? undefined : handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      <Pressable
        style={[
          styles.fab,
          { 
            backgroundColor: theme.primary,
            bottom: insets.bottom + 80 + Spacing.lg,
          },
        ]}
        onPress={() => navigation.navigate('VisitTypeSelection')}
      >
        <DDIcon name="user-plus" size={24} color={theme.buttonText} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  // Content wrapper - ScreenScrollView/ScreenFlatList already provides paddingHorizontal: Spacing.xl
  paddedContent: {
    // No additional horizontal padding needed
  },
  // Shared: Layout
  statsGrid: {
    flexDirection: 'row',
    gap: LAYOUT.contentGap,
  },
  statCard: {
    flex: 1,
    padding: LAYOUT.cardPadding,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  viewToggleButton: {
    padding: Spacing.sm,
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  viewToggleButtonLeft: {
    borderTopStartRadius: BorderRadius.sm,
    borderBottomStartRadius: BorderRadius.sm,
    borderTopEndRadius: 0,
    borderBottomEndRadius: 0,
    borderEndWidth: 0,
  },
  viewToggleButtonRight: {
    borderTopEndRadius: BorderRadius.sm,
    borderBottomEndRadius: BorderRadius.sm,
    borderTopStartRadius: 0,
    borderBottomStartRadius: 0,
  },

  // Shared: Status Accent
  statusAccent: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.statusBorderWidth,
    borderTopStartRadius: LAYOUT.cardRadius,
    borderBottomStartRadius: LAYOUT.cardRadius,
  },

  // Shared: Components
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  servicesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  servicePill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: '600',
  },
  nameWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dateTimeRowSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
  },
  separator: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  emptyState: {
    padding: Spacing.xxl,
    borderRadius: LAYOUT.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  // Card View Styles
  requestCard: {
    borderRadius: LAYOUT.cardRadius,
    padding: LAYOUT.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMainSection: {
    // Container for main card content
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardNameSection: {
    flex: 1,
    marginStart: LAYOUT.contentGap,
  },
  dividerLine: {
    height: 1,
    marginVertical: LAYOUT.contentGap,
  },
  expandedContentInside: {
    paddingBottom: Spacing.xs,
  },
  secondaryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactSection: {
    // Container for contact details
  },
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: LAYOUT.contentGap,
    gap: 4,
  },
  moreDetailsText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Table View Styles
  tableRow: {
    flexDirection: 'row',
    minHeight: LAYOUT.tableRowHeight,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  fixedColumn: {
    justifyContent: 'center',
    borderEndWidth: 1,
    borderEndColor: 'rgba(0,0,0,0.06)',
  },
  fixedColumnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  scrollableColumns: {
    flex: 1,
  },
  scrollableContent: {
    paddingEnd: Spacing.xl,
  },
  tableColumn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  columnValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactColumn: {
    // Container for contact info
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    end: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
