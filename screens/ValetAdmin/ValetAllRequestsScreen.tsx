import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView, GestureResponderEvent } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ScreenFlatList } from "@/components/ScreenFlatList";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getValetRequests,
  updateValetRequestStatus,
  ValetRequest,
} from "@/services/mock/valetAdminState";
import type { ValetAllRequestsScreenProps } from "@/types/valetAdminNavigation.types";
import type { Theme } from "@/types/theme.types";

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  sectionSpacing: Spacing.xxl,
  contentGap: Spacing.md,
  statCardRadius: BorderRadius.md,
  statusBorderWidth: 3,
  tableRowHeight: 110,
  tableFixedColumnWidth: 160,
  tableScrollColumnWidth: 200,
};

const StatusAccent = ({ color }: { color: string }) => (
  <View style={[styles.statusAccent, { backgroundColor: color }]} />
);

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

const DateTimeDisplay = ({ time, theme }: { time: string; theme: Theme }) => {
  return (
    <View style={styles.dateTimeRow}>
      <DDIcon name="clock" size={14} variant="muted" />
      <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
        {time}
      </ThemedText>
    </View>
  );
};

const StatusBadge = ({ status, statusColor, statusLabel, compact = false }: { status: string; statusColor: string; statusLabel: string; compact?: boolean }) => (
  <View style={[
    styles.statusBadge, 
    { 
      backgroundColor: applyOpacity(statusColor, '15'), 
      borderColor: applyOpacity(statusColor, '30'),
      paddingHorizontal: compact ? Spacing.sm : Spacing.md,
      paddingVertical: compact ? 6 : 8,
    }
  ]}>
    <ThemedText style={[styles.statusText, { color: statusColor, fontSize: compact ? 11 : 12 }]}>
      {statusLabel}
    </ThemedText>
  </View>
);

const StatsCards = ({ stats, theme, t }: { stats: { total: number; pending: number; assigned: number; completed: number }; theme: Theme; t: (key: string) => string }) => (
  <View style={styles.statsGrid}>
    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
        <DDIcon name="navigation" size={24} variant="primary" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {stats.total}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('dashboard.totalRequests')}
      </ThemedText>
    </ThemedView>

    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
        <DDIcon name="clock" size={24} variant="warning" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {stats.pending + stats.assigned}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('status.inProgress')}
      </ThemedText>
    </ThemedView>

    <ThemedView style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIconContainer, { backgroundColor: applyOpacity(theme.success, '20') }]}>
        <DDIcon name="check-circle" size={24} variant="success" />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[Typography.title, { fontSize: 32, lineHeight: 40 }]}>
        {stats.completed}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}>
        {t('status.completed')}
      </ThemedText>
    </ThemedView>
  </View>
);

function getStatusColor(status: string, theme: Theme) {
  switch (status) {
    case 'pending':
      return theme.primary;
    case 'assigned':
      return theme.warning;
    case 'parked':
      return theme.info;
    case 'ready_for_pickup':
      return theme.success;
    case 'completed':
      return theme.secondary;
    case 'cancelled':
      return theme.error;
    default:
      return theme.textSecondary;
  }
}

function getStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case 'pending':
      return t('status.pending');
    case 'assigned':
      return t('status.assigned');
    case 'parked':
      return t('parking.parked');
    case 'ready_for_pickup':
      return t('valet.readyForPickup');
    case 'completed':
      return t('status.completed');
    case 'cancelled':
      return t('status.cancelled');
    default:
      return status;
  }
}

const ValetRequestCard = React.memo(({ 
  request, 
  isExpanded,
  onPress,
  onToggleExpand,
  onComplete,
  theme 
}: { 
  request: ValetRequest; 
  isExpanded: boolean;
  onPress: () => void;
  onToggleExpand: () => void;
  onComplete: (e: GestureResponderEvent) => void;
  theme: Theme;
}) => {
  const { t } = useTranslation();
  const statusColor = getStatusColor(request.status, theme);
  const statusLabel = getStatusLabel(request.status, t);

  return (
    <ThemedView style={[styles.requestCard, { backgroundColor: theme.surface }]}>
      <StatusAccent color={statusColor} />

      <Pressable onPress={onPress}>
        <View style={styles.cardMainSection}>
          <View style={styles.cardHeaderRow}>
            <VisitorAvatar name={request.visitorName} theme={theme} />
            
            <View style={styles.cardNameSection}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 16 }]}>
                {request.visitorName}
              </ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
                {t('reception.hostName')}: {request.hostName}
              </ThemedText>
            </View>

            <StatusBadge status={request.status} statusColor={statusColor} statusLabel={statusLabel} compact />
          </View>

          <Spacer height={LAYOUT.contentGap} />

          {request.vehicleInfo ? (
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <DDIcon name="truck" size={14} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {request.vehicleInfo.make} {request.vehicleInfo.model} - {request.vehicleInfo.color}
                </ThemedText>
              </View>
            </View>
          ) : null}

          <Spacer height={Spacing.sm} />

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <DDIcon name="clock" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {request.pickupTime} - {request.returnTime}
              </ThemedText>
            </View>
            {request.parkingSlot ? (
              <View style={[styles.detailItem, { marginStart: Spacing.md }]}>
                <DDIcon name="map-pin" size={14} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                  {t('parking.slot')} {request.parkingSlot}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {request.assignedDriver ? (
            <>
              <Spacer height={Spacing.sm} />
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <DDIcon name="user" size={14} variant="muted" />
                  <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                    {t('valet.driver')}: {request.assignedDriver.name}
                  </ThemedText>
                </View>
              </View>
            </>
          ) : null}

          {request.status !== 'completed' && request.status !== 'cancelled' ? (
            <>
              <Spacer height={LAYOUT.contentGap} />
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: applyOpacity(theme.primary, '12') }]}
                  onPress={onPress}
                >
                  <DDIcon name="eye" size={14} color={theme.primary} />
                  <ThemedText style={[styles.actionButtonText, { color: theme.primary }]}>
                    {t('common.viewDetails')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: applyOpacity(theme.success, '12') }]}
                  onPress={(e) => onComplete(e)}
                >
                  <DDIcon name="check" size={14} color={theme.success} />
                  <ThemedText style={[styles.actionButtonText, { color: theme.success }]}>
                    {t('actions.markAsComplete')}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </Pressable>

      {isExpanded && request.vehicleInfo ? (
        <>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <View style={styles.expandedContentInside}>
            <View style={styles.secondaryDetail}>
              <DDIcon name="tag" size={14} variant="muted" />
              <ThemedText style={[Typography.caption, { marginStart: 6, color: theme.textSecondary, fontSize: 12 }]}>
                {t('valet.plateNumber')}: {request.vehicleInfo.plateNumber}
              </ThemedText>
            </View>
            {request.notes ? (
              <>
                <Spacer height={Spacing.sm} />
                <View style={styles.secondaryDetail}>
                  <DDIcon name="file-text" size={14} variant="muted" />
                  <ThemedText style={[Typography.caption, { marginStart: 6, color: theme.textSecondary, flex: 1, fontSize: 12 }]}>
                    {t('form.notes')}: {request.notes}
                  </ThemedText>
                </View>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      <Pressable
        style={styles.moreDetailsButton}
        onPress={onToggleExpand}
      >
        <ThemedText style={[styles.moreDetailsText, { color: theme.primary }]}>
          {isExpanded ? t('common.lessDetails') : t('common.moreDetails')}
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

const EmptyState = ({ theme, t }: { theme: Theme; t: (key: string) => string }) => (
  <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
    <DDIcon name="inbox" size={48} variant="muted" />
    <Spacer height={Spacing.md} />
    <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
      {t('common.noData')}
    </ThemedText>
  </ThemedView>
);

const ValetRequestTableRow = React.memo(({ 
  request, 
  onPress,
  onComplete,
  theme 
}: { 
  request: ValetRequest; 
  onPress: () => void;
  onComplete: (e: GestureResponderEvent) => void;
  theme: Theme;
}) => {
  const { t } = useTranslation();
  const statusColor = getStatusColor(request.status, theme);
  const statusLabel = getStatusLabel(request.status, t);

  return (
    <Pressable onPress={onPress}>
      <ThemedView style={[styles.tableRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <StatusAccent color={statusColor} />
        
        <View style={[styles.fixedColumn, { width: LAYOUT.tableFixedColumnWidth }]}>
          <View style={styles.fixedColumnContent}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]} numberOfLines={2}>
                {request.visitorName}
              </ThemedText>
              <Spacer height={4} />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
                {t('reception.hostName')}: {request.hostName}
              </ThemedText>
              <Spacer height={6} />
              <View style={styles.dateTimeRow}>
                <DDIcon name="clock" size={13} variant="muted" />
                <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary, fontSize: 12 }]}>
                  {request.pickupTime} - {request.returnTime}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.scrollableColumns}
          contentContainerStyle={styles.scrollableContent}
          persistentScrollbar={true}
          nestedScrollEnabled={true}
        >
          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('valet.vehicle').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            {request.vehicleInfo ? (
              <ThemedText style={[styles.columnValue, { fontSize: 14 }]} numberOfLines={2}>
                {request.vehicleInfo.make} {request.vehicleInfo.model}
              </ThemedText>
            ) : (
              <ThemedText style={[styles.columnValue, { fontSize: 14, color: theme.textSecondary }]}>
                {t('valet.noVehicleInfo')}
              </ThemedText>
            )}
          </View>

          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('valet.driver').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            {request.assignedDriver ? (
              <ThemedText style={[styles.columnValue, { fontSize: 14, color: theme.success }]} numberOfLines={1}>
                {request.assignedDriver.name}
              </ThemedText>
            ) : (
              <ThemedText style={[styles.columnValue, { fontSize: 14, color: theme.textSecondary }]}>
                {t('valet.unassigned')}
              </ThemedText>
            )}
          </View>

          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth * 0.8 }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('parking.slot').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            {request.parkingSlot ? (
              <ThemedText style={[styles.columnValue, { fontSize: 14 }]} numberOfLines={1}>
                {request.parkingSlot}
              </ThemedText>
            ) : (
              <ThemedText style={[styles.columnValue, { fontSize: 14, color: theme.textSecondary }]}>
                --
              </ThemedText>
            )}
          </View>

          <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth * 0.8 }]}>
            <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
              {t('common.status').toUpperCase()}
            </ThemedText>
            <Spacer height={10} />
            <StatusBadge status={request.status} statusColor={statusColor} statusLabel={statusLabel} compact />
          </View>

          {request.status !== 'completed' && request.status !== 'cancelled' ? (
            <View style={[styles.tableColumn, { width: LAYOUT.tableScrollColumnWidth }]}>
              <ThemedText style={[styles.columnHeader, { color: theme.textSecondary }]}>
                {t('valet.actions').toUpperCase()}
              </ThemedText>
              <Spacer height={10} />
              <View style={styles.tableActionsRow}>
                <Pressable
                  style={[styles.tableActionButton, { backgroundColor: applyOpacity(theme.primary, '12') }]}
                  onPress={onPress}
                >
                  <DDIcon name="eye" size={14} color={theme.primary} />
                  <ThemedText style={[styles.tableActionText, { color: theme.primary }]}>
                    {t('common.view')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.tableActionButton, { backgroundColor: applyOpacity(theme.success, '12') }]}
                  onPress={onComplete}
                >
                  <DDIcon name="check" size={14} color={theme.success} />
                  <ThemedText style={[styles.tableActionText, { color: theme.success }]}>
                    {t('common.done')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </ThemedView>
    </Pressable>
  );
});

export default function ValetAllRequestsScreen({ navigation }: ValetAllRequestsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<ValetRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const sortByTime = (reqs: ValetRequest[]): ValetRequest[] => {
    return [...reqs].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return parseTime(a.pickupTime) - parseTime(b.pickupTime);
    });
  };

  useFocusEffect(
    useCallback(() => {
      setRequests(sortByTime(getValetRequests()));
    }, [])
  );

  const handleViewDetails = (request: ValetRequest) => {
    navigation.navigate('ValetRequestDetails', { request });
  };

  const handleMarkComplete = (request: ValetRequest, event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    updateValetRequestStatus(request.id, 'completed');
    setRequests(sortByTime(getValetRequests()));
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    assigned: requests.filter(r => r.status === 'assigned').length,
    parked: requests.filter(r => r.status === 'parked').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  const filterOptions = [
    { key: 'all', label: t('common.all') },
    { key: 'pending', label: t('status.pending') },
    { key: 'assigned', label: t('status.assigned') },
    { key: 'parked', label: t('parking.parked') },
    { key: 'ready_for_pickup', label: t('valet.readyForPickup') },
    { key: 'completed', label: t('status.completed') },
  ];

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.xl} />

      <View style={styles.paddedContent}>
        <StatsCards stats={stats} theme={theme} t={t} />
      </View>

      <Spacer height={LAYOUT.sectionSpacing} />

      <View style={[styles.sectionTitleRow, styles.paddedContent]}>
        <ThemedText style={[Typography.subtitle]}>
          {t('navigation.valetRequests')}
        </ThemedText>
        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'card' ? theme.primary : theme.surface },
            ]}
            onPress={() => setViewMode('card')}
          >
            <DDIcon 
              name="grid" 
              size={18} 
              color={viewMode === 'card' ? theme.buttonText : theme.textSecondary} 
            />
          </Pressable>
          <Pressable
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'list' ? theme.primary : theme.surface },
            ]}
            onPress={() => setViewMode('list')}
          >
            <DDIcon 
              name="list" 
              size={18} 
              color={viewMode === 'list' ? theme.buttonText : theme.textSecondary} 
            />
          </Pressable>
        </View>
      </View>

      <Spacer height={Spacing.md} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        nestedScrollEnabled={true}
      >
        {filterOptions.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterChip,
              { 
                backgroundColor: filterStatus === filter.key 
                  ? applyOpacity(theme.primary, '15') 
                  : theme.surface,
                borderColor: filterStatus === filter.key ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setFilterStatus(filter.key)}
          >
            <ThemedText
              style={[
                Typography.body,
                { 
                  color: filterStatus === filter.key ? theme.primary : theme.textSecondary, 
                  fontWeight: '500',
                  fontSize: 13,
                },
              ]}
            >
              {filter.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <Spacer height={Spacing.lg} />

      <View style={styles.paddedContent}>
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <View key={request.id}>
              {viewMode === 'card' ? (
                <ValetRequestCard
                  request={request}
                  isExpanded={expandedCard === request.id}
                  onPress={() => handleViewDetails(request)}
                  onToggleExpand={() => setExpandedCard(expandedCard === request.id ? null : request.id)}
                  onComplete={(e) => handleMarkComplete(request, e)}
                  theme={theme}
                />
              ) : (
                <ValetRequestTableRow
                  request={request}
                  onPress={() => handleViewDetails(request)}
                  onComplete={(e) => handleMarkComplete(request, e)}
                  theme={theme}
                />
              )}
              <Spacer height={LAYOUT.contentGap} />
            </View>
          ))
        ) : (
          <EmptyState theme={theme} t={t} />
        )}
      </View>

      <Spacer height={LAYOUT.sectionSpacing} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: LAYOUT.contentGap,
  },
  statCard: {
    flex: 1,
    padding: LAYOUT.cardPadding,
    borderRadius: LAYOUT.statCardRadius,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  requestCard: {
    borderRadius: LAYOUT.cardRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusAccent: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.statusBorderWidth,
    borderTopStartRadius: LAYOUT.cardRadius,
    borderBottomStartRadius: LAYOUT.cardRadius,
  },
  cardMainSection: {
    padding: LAYOUT.cardPadding,
    paddingStart: LAYOUT.cardPadding + LAYOUT.statusBorderWidth,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '600',
  },
  cardNameSection: {
    flex: 1,
    marginStart: Spacing.md,
  },
  statusBadge: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    marginStart: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 13,
    marginStart: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dividerLine: {
    height: 1,
    marginHorizontal: LAYOUT.cardPadding,
  },
  expandedContentInside: {
    padding: LAYOUT.cardPadding,
    paddingTop: Spacing.md,
  },
  secondaryDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 4,
  },
  moreDetailsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    padding: Spacing.xl * 2,
    borderRadius: LAYOUT.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingHorizontal: Spacing.lg,
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
    fontSize: 14,
    lineHeight: 20,
  },
  tableActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tableActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  tableActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
