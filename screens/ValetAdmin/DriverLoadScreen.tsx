import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
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
  getValetDrivers,
  getValetRequests,
  ValetDriverExtended,
  ValetRequest,
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

type LoadLevel = 'low' | 'medium' | 'high';

interface DriverLoadData extends ValetDriverExtended {
  tasksToday: number;
  tasksThisWeek: number;
  loadLevel: LoadLevel;
}

function getLoadLevel(currentTasks: number): LoadLevel {
  if (currentTasks <= 1) return 'low';
  if (currentTasks <= 3) return 'medium';
  return 'high';
}

function calculateFairnessScore(drivers: DriverLoadData[]): { isBalanced: boolean; variance: number; avgTasks: number } {
  const activeDrivers = drivers.filter(d => d.status !== 'off_duty');
  if (activeDrivers.length === 0) return { isBalanced: true, variance: 0, avgTasks: 0 };
  
  const taskCounts = activeDrivers.map(d => d.tasksToday);
  const avgTasks = taskCounts.reduce((sum, count) => sum + count, 0) / taskCounts.length;
  
  const variance = taskCounts.reduce((sum, count) => sum + Math.pow(count - avgTasks, 2), 0) / taskCounts.length;
  const stdDev = Math.sqrt(variance);
  
  const isBalanced = stdDev <= 2;
  
  return { isBalanced, variance: stdDev, avgTasks };
}

function getDriverFairnessStatus(driver: DriverLoadData, avgTasks: number): 'normal' | 'overloaded' | 'underutilized' {
  if (driver.status === 'off_duty') return 'normal';
  
  const diff = driver.tasksToday - avgTasks;
  if (diff > 3) return 'overloaded';
  if (diff < -3 && driver.tasksToday < 2) return 'underutilized';
  return 'normal';
}

export default function DriverLoadScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [drivers, setDrivers] = useState<ValetDriverExtended[]>([]);
  const [requests, setRequests] = useState<ValetRequest[]>([]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  useFocusEffect(
    React.useCallback(() => {
      setDrivers(getValetDrivers());
      setRequests(getValetRequests());
    }, [])
  );

  const driverLoadData: DriverLoadData[] = useMemo(() => {
    return drivers.map(driver => {
      const tasksToday = driver.completedToday + driver.currentTasks;
      const weeklyMultiplier = 3 + Math.floor(Math.random() * 3);
      const tasksThisWeek = tasksToday * weeklyMultiplier;
      const loadLevel = getLoadLevel(driver.currentTasks);
      
      return {
        ...driver,
        tasksToday,
        tasksThisWeek,
        loadLevel,
      };
    });
  }, [drivers]);

  const fairnessData = useMemo(() => {
    return calculateFairnessScore(driverLoadData);
  }, [driverLoadData]);

  const stats = useMemo(() => {
    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter(d => d.status !== 'off_duty').length;
    const totalTasksToday = driverLoadData.reduce((sum, d) => sum + d.tasksToday, 0);
    const totalTasksWeek = driverLoadData.reduce((sum, d) => sum + d.tasksThisWeek, 0);
    
    return {
      totalDrivers,
      activeDrivers,
      totalTasksToday,
      totalTasksWeek,
    };
  }, [drivers, driverLoadData]);

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

  const getStatusIcon = (status: string): IconName => {
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

  const getLoadLevelColor = (level: LoadLevel) => {
    switch (level) {
      case 'low':
        return theme.success;
      case 'medium':
        return theme.warning;
      case 'high':
        return theme.error;
    }
  };

  const getLoadLevelLabel = (level: LoadLevel) => {
    switch (level) {
      case 'low':
        return t('valet.loadLow');
      case 'medium':
        return t('valet.loadMedium');
      case 'high':
        return t('valet.loadHigh');
    }
  };

  const getLoadLevelIcon = (level: LoadLevel): IconName => {
    switch (level) {
      case 'low':
        return 'trending-down';
      case 'medium':
        return 'minus';
      case 'high':
        return 'trending-up';
    }
  };

  const renderFairnessIndicator = () => {
    const isBalanced = fairnessData.isBalanced;
    const bgColor = isBalanced ? applyOpacity(theme.success, '10') : applyOpacity(theme.warning, '10');
    const borderColor = isBalanced ? applyOpacity(theme.success, '30') : applyOpacity(theme.warning, '30');
    const iconColor = isBalanced ? theme.success : theme.warning;
    const textColor = isBalanced ? theme.success : theme.warning;
    
    return (
      <View style={[styles.fairnessCard, { backgroundColor: bgColor, borderColor }]}>
        <View style={styles.fairnessHeader}>
          <DDIcon 
            name={isBalanced ? 'check-circle' : 'alert-triangle'} 
            size={20} 
            color={iconColor} 
          />
          <ThemedText style={[styles.fairnessTitle, { color: textColor }]}>
            {isBalanced ? t('valet.loadBalanced') : t('valet.loadUnbalanced')}
          </ThemedText>
        </View>
        <ThemedText style={[styles.fairnessDescription, { color: theme.textSecondary }]}>
          {isBalanced 
            ? t('valet.loadBalancedDesc')
            : t('valet.loadUnbalancedDesc')
          }
        </ThemedText>
        <View style={styles.fairnessStats}>
          <View style={styles.fairnessStat}>
            <ThemedText style={[styles.fairnessStatValue, { color: theme.text }]}>
              {fairnessData.avgTasks.toFixed(1)}
            </ThemedText>
            <ThemedText style={[styles.fairnessStatLabel, { color: theme.textSecondary }]}>
              {t('valet.avgTasksPerDriver')}
            </ThemedText>
          </View>
          <View style={[styles.fairnessStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.fairnessStat}>
            <ThemedText style={[styles.fairnessStatValue, { color: theme.text }]}>
              {fairnessData.variance.toFixed(1)}
            </ThemedText>
            <ThemedText style={[styles.fairnessStatLabel, { color: theme.textSecondary }]}>
              {t('valet.loadVariance')}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderDriverCard = (driver: DriverLoadData) => {
    const initials = driver.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const statusColor = getStatusColor(driver.status);
    const loadColor = getLoadLevelColor(driver.loadLevel);
    const fairnessStatus = getDriverFairnessStatus(driver, fairnessData.avgTasks);
    
    const showFairnessFlag = fairnessStatus !== 'normal';
    const flagColor = fairnessStatus === 'overloaded' ? theme.error : theme.info;
    const flagLabel = fairnessStatus === 'overloaded' 
      ? t('valet.overloaded') 
      : t('valet.underutilized');
    
    return (
      <View 
        key={driver.id}
        style={[
          styles.driverCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: loadColor,
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
            <View style={styles.nameRow}>
              <ThemedText style={[styles.driverName, { color: theme.text }]} numberOfLines={1}>
                {driver.name}
              </ThemedText>
              {showFairnessFlag ? (
                <View style={[styles.fairnessFlag, { backgroundColor: applyOpacity(flagColor, '15') }]}>
                  <DDIcon 
                    name={fairnessStatus === 'overloaded' ? 'alert-circle' : 'info'} 
                    size={10} 
                    color={flagColor} 
                  />
                  <ThemedText style={[styles.fairnessFlagText, { color: flagColor }]}>
                    {flagLabel}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '15') }]}>
                <DDIcon name={getStatusIcon(driver.status)} size={12} color={statusColor} />
                <ThemedText style={[styles.statusText, { color: statusColor }]}>
                  {getStatusLabel(driver.status)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <View style={styles.metricHeader}>
              <DDIcon name="calendar" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {t('valet.tasksToday')}
              </ThemedText>
            </View>
            <ThemedText style={[styles.metricValue, { color: theme.text }]}>
              {driver.tasksToday}
            </ThemedText>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricHeader}>
              <DDIcon name="bar-chart-2" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {t('valet.tasksThisWeek')}
              </ThemedText>
            </View>
            <ThemedText style={[styles.metricValue, { color: theme.text }]}>
              {driver.tasksThisWeek}
            </ThemedText>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricHeader}>
              <DDIcon name="activity" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {t('valet.currentLoad')}
              </ThemedText>
            </View>
            <View style={[styles.loadBadge, { backgroundColor: applyOpacity(loadColor, '15') }]}>
              <DDIcon name={getLoadLevelIcon(driver.loadLevel)} size={12} color={loadColor} />
              <ThemedText style={[styles.loadBadgeText, { color: loadColor }]}>
                {getLoadLevelLabel(driver.loadLevel)}
              </ThemedText>
            </View>
          </View>
        </View>

        <Spacer height={Spacing.sm} />

        <View style={styles.loadBar}>
          <View 
            style={[
              styles.loadBarFill, 
              { 
                backgroundColor: loadColor,
                width: `${Math.min(driver.currentTasks * 20, 100)}%`,
              }
            ]} 
          />
        </View>
      </View>
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.kpiRow}>
        <KPICard 
          title={t('valet.totalDrivers')} 
          value={String(stats.totalDrivers)} 
          icon="users" 
          iconBgColor={applyOpacity(theme.primary, '20')}
          iconColor={theme.primary}
          cardBgColor={applyOpacity(theme.primary, '06')}
        />
        <KPICard 
          title={t('valet.activeDrivers')} 
          value={String(stats.activeDrivers)} 
          icon="user-check" 
          iconBgColor={applyOpacity(theme.success, '20')}
          iconColor={theme.success}
          cardBgColor={applyOpacity(theme.success, '06')}
        />
      </View>

      <Spacer height={Spacing.sm} />

      <View style={styles.kpiRow}>
        <KPICard 
          title={t('valet.tasksToday')} 
          value={String(stats.totalTasksToday)} 
          icon="clipboard" 
          iconBgColor={applyOpacity(theme.info, '20')}
          iconColor={theme.info}
          cardBgColor={applyOpacity(theme.info, '06')}
        />
        <KPICard 
          title={t('valet.tasksThisWeek')} 
          value={String(stats.totalTasksWeek)} 
          icon="calendar" 
          iconBgColor={applyOpacity(theme.warning, '20')}
          iconColor={theme.warning}
          cardBgColor={applyOpacity(theme.warning, '06')}
        />
      </View>

      <Spacer height={Spacing.xl} />

      {renderFairnessIndicator()}

      <Spacer height={Spacing.xl} />

      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        {t('valet.driverLoadDistribution')} ({driverLoadData.length})
      </ThemedText>

      <Spacer height={Spacing.md} />

      {driverLoadData.length > 0 ? (
        <View style={styles.driversList}>
          {driverLoadData.map((driver) => renderDriverCard(driver))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="users" size={32} variant="muted" />
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
  fairnessCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  fairnessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fairnessTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  fairnessDescription: {
    fontSize: 13,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  fairnessStats: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  fairnessStat: {
    flex: 1,
    alignItems: 'center',
  },
  fairnessStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  fairnessStatLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  fairnessStatDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: Spacing.md,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
  },
  fairnessFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  fairnessFlagText: {
    fontSize: 9,
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
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  loadBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
