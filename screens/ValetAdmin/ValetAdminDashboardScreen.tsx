import React, { useState } from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { DDIcon, IconName } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getTodayValetRequests,
  getValetRequestStats,
  updateValetRequestStatus,
  ValetRequest,
} from "@/services/mock/valetAdminState";
import type { ValetAdminDashboardScreenProps } from "@/types/valetAdminNavigation.types";

interface KPICardProps {
  title: string;
  value: string;
  icon: IconName;
  iconBgColor: string;
  iconColor: string;
  cardBgColor: string;
}

function KPICard({ title, value, icon, iconBgColor, iconColor, cardBgColor }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: applyOpacity(iconColor, '15') }]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon} size={28} color={iconColor} />
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={[styles.kpiValue, { color: theme.text }]}>
        {value}
      </ThemedText>

      <Spacer height={Spacing.xs} />

      <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

interface QuickActionProps {
  icon: IconName;
  label: string;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, iconBgColor, iconColor, onPress }: QuickActionProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon} size={24} color={iconColor} />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[styles.quickActionLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function ValetAdminDashboardScreen({ navigation }: ValetAdminDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<ValetRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, assigned: 0, parked: 0, readyForPickup: 0, completed: 0 });

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

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
    React.useCallback(() => {
      const todayRequests = getTodayValetRequests();
      setRequests(sortByTime(todayRequests));
      setStats(getValetRequestStats());
    }, [])
  );

  const handleMarkComplete = (requestId: string, event: GestureResponderEvent) => {
    event?.stopPropagation?.();
    updateValetRequestStatus(requestId, 'completed');
    const todayRequests = getTodayValetRequests();
    setRequests(sortByTime(todayRequests));
    setStats(getValetRequestStats());
  };

  const handleViewDetails = (request: ValetRequest, event: GestureResponderEvent) => {
    event?.stopPropagation?.();
    navigation.navigate('ValetRequestDetails', { request });
  };

  const getStatusBorderColor = (status: string) => {
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
  };

  const getStatusLabel = (status: string) => {
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
  };

  const getStatusColor = (status: string) => {
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
  };

  const renderRequestCard = (item: ValetRequest) => {
    const borderColor = getStatusBorderColor(item.status);
    const initials = item.visitorName.split(' ').map(n => n[0]).join('');
    const showComplete = item.status !== 'completed' && item.status !== 'cancelled';
    
    return (
      <Pressable 
        key={item.id}
        onPress={(e) => handleViewDetails(item, e)}
        style={({ pressed }) => [
          styles.requestCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: borderColor,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {initials}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.visitorName, { color: theme.text }]} numberOfLines={1}>
              {item.visitorName}
            </ThemedText>
            <ThemedText style={[styles.hostName, { color: theme.textSecondary }]} numberOfLines={1}>
              {t('reception.hostName')}: {item.hostName}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: applyOpacity(getStatusColor(item.status), '15') }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.md} />

        {item.vehicleInfo ? (
          <>
            <View style={styles.metaRow}>
              <DDIcon name="truck" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.vehicleInfo.make} {item.vehicleInfo.model} - {item.vehicleInfo.color}
              </ThemedText>
            </View>
            <Spacer height={Spacing.xs} />
          </>
        ) : null}

        <View style={styles.metaRow}>
          <DDIcon name="clock" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {item.pickupTime} - {item.returnTime}
          </ThemedText>
          {item.parkingSlot ? (
            <>
              <View style={styles.metaDot} />
              <DDIcon name="map-pin" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {t('parking.slot')} {item.parkingSlot}
              </ThemedText>
            </>
          ) : null}
        </View>

        {item.assignedDriver ? (
          <>
            <Spacer height={Spacing.xs} />
            <View style={styles.metaRow}>
              <DDIcon name="user" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {t('valet.driver')}: {item.assignedDriver.name}
              </ThemedText>
            </View>
          </>
        ) : null}

        <Spacer height={Spacing.md} />

        <View style={styles.cardFooter}>
          <Pressable
            style={[styles.viewDetailsButton, { borderColor: theme.primary }]}
            onPress={(e) => handleViewDetails(item, e)}
          >
            <DDIcon name="eye" size={14} color={theme.primary} />
            <ThemedText style={[styles.viewDetailsText, { color: theme.primary }]}>
              {t('common.viewDetails')}
            </ThemedText>
          </Pressable>

          {showComplete ? (
            <Pressable
              style={[styles.completeButton, { backgroundColor: theme.success }]}
              onPress={(e) => handleMarkComplete(item.id, e)}
            >
              <DDIcon name="check" size={14} color="#FFFFFF" />
              <ThemedText style={styles.completeButtonText}>
                {t('actions.markAsComplete')}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={[styles.completedBadge, { backgroundColor: applyOpacity(theme.success, '15') }]}>
              <DDIcon name="check-circle" size={14} color={theme.success} />
              <ThemedText style={[styles.completedText, { color: theme.success }]}>
                {t('status.completed')}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.kpiRow}>
        <KPICard 
          title={t('dashboard.totalToday')} 
          value={String(stats.total)} 
          icon="navigation" 
          iconBgColor={applyOpacity(theme.primary, '20')}
          iconColor={theme.primary}
          cardBgColor={applyOpacity(theme.primary, '06')}
        />
        <KPICard 
          title={t('status.pending')} 
          value={String(stats.pending)} 
          icon="clock" 
          iconBgColor={applyOpacity(theme.warning, '20')}
          iconColor={theme.warning}
          cardBgColor={applyOpacity(theme.warning, '06')}
        />
        <KPICard 
          title={t('status.completed')} 
          value={String(stats.completed)} 
          icon="check-circle" 
          iconBgColor={applyOpacity(theme.success, '20')}
          iconColor={theme.success}
          cardBgColor={applyOpacity(theme.success, '06')}
        />
      </View>

      <Spacer height={Spacing.xl} />

      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        {t('dashboard.quickActions')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      <View style={styles.quickActionsRow}>
        <QuickActionButton
          icon="users"
          label={t('valet.manageDrivers')}
          iconBgColor={applyOpacity(theme.primary, '12')}
          iconColor={theme.primary}
          onPress={() => navigation.navigate('ValetDrivers')}
        />
        <QuickActionButton
          icon="map-pin"
          label={t('parking.parkingSlots')}
          iconBgColor={applyOpacity(theme.success, '12')}
          iconColor={theme.success}
          onPress={() => navigation.navigate('ValetParking')}
        />
        <QuickActionButton
          icon="list"
          label={t('navigation.allRequests')}
          iconBgColor={applyOpacity(theme.warning, '12')}
          iconColor={theme.warning}
          onPress={() => navigation.navigate('ValetAllRequests')}
        />
      </View>

      <Spacer height={Spacing.xl} />

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('valet.todaysValetRequests')}
        </ThemedText>
        {requests.length > 3 ? (
          <Pressable 
            onPress={() => navigation.navigate('ValetAllRequests')}
            style={({ pressed }) => [
              styles.viewAllButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <ThemedText style={[styles.viewAllText, { color: theme.primary }]}>
              {t('common.viewAll')}
            </ThemedText>
            <DDIcon name="chevron-right" size={16} variant="primary" directionAware />
          </Pressable>
        ) : null}
      </View>

      <Spacer height={Spacing.md} />

      {requests.length > 0 ? (
        <View style={styles.requestsList}>
          {requests.slice(0, 5).map((request) => renderRequestCard(request))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="navigation" size={32} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {t('common.noData')}
          </ThemedText>
        </ThemedView>
      )}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  requestsList: {
    gap: Spacing.md,
  },
  requestCard: {
    borderRadius: 12,
    borderStartWidth: 4,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
  },
  headerInfo: {
    marginStart: Spacing.md,
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  hostName: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    marginStart: 4,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
