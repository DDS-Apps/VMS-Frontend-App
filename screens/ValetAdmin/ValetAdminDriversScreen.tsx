import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SearchInput } from "@/components/SearchInput";
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
  getValetDrivers,
  toggleDriverStatus,
  getDriverStats,
  ValetDriverExtended,
} from "@/services/state/valetAdminState";

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  cardBgColor: string;
}

function KPICard({ title, value, icon, iconBgColor, iconColor, cardBgColor }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: applyOpacity(iconColor, '15') }]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon as IconName} size={24} color={iconColor} />
      </View>

      <Spacer height={Spacing.md} />

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

type StatusFilter = 'all' | 'available' | 'busy' | 'off_duty';

const getFilterOptions = (t: (key: string) => string): { key: StatusFilter; label: string }[] => [
  { key: 'all', label: t('common.all') },
  { key: 'available', label: t('status.available') },
  { key: 'busy', label: t('status.busy') },
  { key: 'off_duty', label: t('valet.offDuty') },
];

export default function ValetAdminDriversScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [drivers, setDrivers] = useState<ValetDriverExtended[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, busy: 0, offDuty: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const refreshState = React.useCallback(() => {
    const allDrivers = getValetDrivers();
    setDrivers(allDrivers);
    setStats(getDriverStats());
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshState();
    }, [refreshState])
  );

  const handleToggleStatus = (driverId: string) => {
    toggleDriverStatus(driverId);
    refreshState();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return theme.success;
      case 'busy':
        return theme.warning;
      case 'off_duty':
        return theme.textSecondary;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return t('status.available');
      case 'busy':
        return t('status.busy');
      case 'off_duty':
        return t('valet.offDuty');
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return 'check-circle';
      case 'busy':
        return 'loader';
      case 'off_duty':
        return 'moon';
      default:
        return 'user';
    }
  };

  const filteredDrivers = drivers
    .filter(driver => 
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.includes(searchQuery)
    )
    .filter(driver => {
      if (statusFilter === 'all') return true;
      return driver.status === statusFilter;
    });

  const getFilterPillColors = (filterKey: StatusFilter, isActive: boolean) => {
    if (!isActive) {
      return {
        bg: theme.surfaceSecondary,
        text: theme.textSecondary,
      };
    }
    
    switch (filterKey) {
      case 'available':
        return {
          bg: applyOpacity(theme.success, '15'),
          text: theme.success,
        };
      case 'busy':
        return {
          bg: applyOpacity(theme.warning, '15'),
          text: theme.warning,
        };
      case 'off_duty':
        return {
          bg: applyOpacity(theme.textSecondary, '15'),
          text: theme.textSecondary,
        };
      default:
        return {
          bg: applyOpacity(theme.primary, '15'),
          text: theme.primary,
        };
    }
  };

  const renderDriverCard = (driver: ValetDriverExtended) => {
    const isOnDuty = driver.status !== 'off_duty';
    const initials = driver.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const statusColor = getStatusColor(driver.status);
    
    return (
      <View 
        key={driver.id}
        style={[
          styles.driverCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: statusColor,
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
            <ThemedText style={[styles.driverName, { color: theme.text }]} numberOfLines={1}>
              {driver.name}
            </ThemedText>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '15') }]}>
                <DDIcon name={getStatusIcon(driver.status) as IconName} size={12} color={statusColor} />
                <ThemedText style={[styles.statusText, { color: statusColor }]}>
                  {getStatusLabel(driver.status)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.metaRow}>
          <DDIcon name="phone" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {driver.phone}
          </ThemedText>
        </View>

        <Spacer height={Spacing.xs} />

        <View style={styles.metaRow}>
          <DDIcon name="clock" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {t('valet.shift')}: {driver.shift}
          </ThemedText>
        </View>

        <Spacer height={Spacing.xs} />

        <View style={styles.metaRow}>
          <DDIcon name="list" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {driver.assignedTasks} {t('valet.assignedTasks')}
          </ThemedText>
          <View style={styles.metaDot} />
          <DDIcon name="check-circle" size={14} color={theme.success} />
          <ThemedText style={[styles.metaText, { color: theme.success }]}>
            {driver.completedToday} {t('valet.completedToday')}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.cardFooter}>
          <View style={styles.statusContainer}>
            <View 
              style={[
                styles.statusIndicator, 
                { backgroundColor: statusColor }
              ]} 
            />
            <ThemedText style={[styles.statusLabel, { color: statusColor }]}>
              {getStatusLabel(driver.status)}
            </ThemedText>
          </View>

          {driver.status !== 'busy' ? (
            <View style={styles.toggleContainer}>
              <ThemedText style={[styles.toggleLabel, { color: theme.textSecondary }]}>
                {isOnDuty ? t('valet.onDuty') : t('valet.offDuty')}
              </ThemedText>
              <Switch
                value={isOnDuty}
                onValueChange={() => handleToggleStatus(driver.id)}
                trackColor={{ false: theme.border, true: applyOpacity(theme.success, '40') }}
                thumbColor={isOnDuty ? theme.success : theme.textSecondary}
                ios_backgroundColor={theme.border}
              />
            </View>
          ) : (
            <View style={[styles.busyBadge, { backgroundColor: applyOpacity(theme.warning, '15') }]}>
              <DDIcon name="loader" size={14} color={theme.warning} />
              <ThemedText style={[styles.busyText, { color: theme.warning }]}>
                {t('valet.currentlyBusy')}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.kpiRow}>
        <KPICard 
          title={t('valet.totalDrivers')} 
          value={String(stats.total)} 
          icon="users" 
          iconBgColor={applyOpacity(theme.primary, '20')}
          iconColor={theme.primary}
          cardBgColor={applyOpacity(theme.primary, '06')}
        />
        <KPICard 
          title={t('status.available')} 
          value={String(stats.available)} 
          icon="user-check" 
          iconBgColor={applyOpacity(theme.success, '20')}
          iconColor={theme.success}
          cardBgColor={applyOpacity(theme.success, '06')}
        />
        <KPICard 
          title={t('status.busy')} 
          value={String(stats.busy)} 
          icon="loader" 
          iconBgColor={applyOpacity(theme.warning, '20')}
          iconColor={theme.warning}
          cardBgColor={applyOpacity(theme.warning, '06')}
        />
      </View>

      <Spacer height={Spacing.xl} />

      <SearchInput
        placeholder={t('common.search')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.lg} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        nestedScrollEnabled={true}
      >
        {getFilterOptions(t).map((option) => {
          const isActive = statusFilter === option.key;
          const colors = getFilterPillColors(option.key, isActive);
          
          return (
            <Pressable
              key={option.key}
              style={[
                styles.filterPill,
                { backgroundColor: colors.bg }
              ]}
              onPress={() => setStatusFilter(option.key)}
            >
              <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <Spacer height={Spacing.xl} />

      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        {t('valet.driverDirectory')} ({filteredDrivers.length})
      </ThemedText>

      <Spacer height={Spacing.md} />

      {filteredDrivers.length > 0 ? (
        <View style={styles.driversList}>
          {filteredDrivers.map((driver) => renderDriverCard(driver))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="users" size={32} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {searchQuery ? t('common.noResults') : t('common.noData')}
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingEnd: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  driversList: {
    gap: Spacing.md,
  },
  driverCard: {
    borderRadius: 12,
    borderStartWidth: 4,
    padding: Spacing.lg,
    backgroundColor: '#FFF',
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
  driverName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
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
    marginStart: 6,
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
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 6,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    marginEnd: 8,
  },
  busyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  busyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
