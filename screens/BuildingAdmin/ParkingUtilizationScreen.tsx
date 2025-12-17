import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { DDIcon, IconName } from '@/components/DDIcon';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormatters } from '@/hooks/useFormatters';
import { applyOpacity } from '@/utils/statusStyles';
import {
  getCurrentUtilization,
  getUtilizationLogs,
  getLocationLabel,
  getSpotTypeLabel,
  ParkingUtilizationLog,
  ParkingLocationId,
  ParkingSpotType,
} from '@/services/mock/parkingManagementState';

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

interface LocationCardProps {
  label: string;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  color: string;
}

function LocationCard({ label, total, available, occupied, reserved, maintenance, color }: LocationCardProps) {
  const { theme } = useTheme();
  const utilizationPercent = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;
  
  return (
    <View style={[styles.locationCard, { backgroundColor: theme.surface }]}>
      <View style={styles.locationHeader}>
        <View style={[styles.locationIcon, { backgroundColor: applyOpacity(color, '15') }]}>
          <DDIcon name="map-pin" size={18} color={color} />
        </View>
        <View style={styles.locationInfo}>
          <ThemedText style={[styles.locationName, { color: theme.text }]}>{label}</ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {total} {total === 1 ? 'spot' : 'spots'}
          </ThemedText>
        </View>
        <View style={[styles.percentBadge, { backgroundColor: applyOpacity(color, '15') }]}>
          <ThemedText style={[styles.percentText, { color: color }]}>
            {utilizationPercent}%
          </ThemedText>
        </View>
      </View>
      
      <Spacer height={Spacing.md} />
      
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { backgroundColor: applyOpacity(theme.textSecondary, '10') }]}>
          {occupied > 0 ? (
            <View 
              style={[
                styles.progressSegment, 
                { 
                  backgroundColor: theme.warning,
                  width: `${(occupied / total) * 100}%`,
                }
              ]} 
            />
          ) : null}
          {reserved > 0 ? (
            <View 
              style={[
                styles.progressSegment, 
                { 
                  backgroundColor: theme.primary,
                  width: `${(reserved / total) * 100}%`,
                }
              ]} 
            />
          ) : null}
          {maintenance > 0 ? (
            <View 
              style={[
                styles.progressSegment, 
                { 
                  backgroundColor: theme.error,
                  width: `${(maintenance / total) * 100}%`,
                }
              ]} 
            />
          ) : null}
        </View>
      </View>
      
      <Spacer height={Spacing.md} />
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: theme.success }]} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            Available: {available}
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: theme.warning }]} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            Occupied: {occupied}
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: theme.primary }]} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            Reserved: {reserved}
          </ThemedText>
        </View>
        {maintenance > 0 ? (
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: theme.error }]} />
            <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
              Maint.: {maintenance}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

interface TypeCardProps {
  type: ParkingSpotType;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
}

function TypeCard({ type, total, available, occupied, reserved }: TypeCardProps) {
  const { theme } = useTheme();
  
  const getTypeColor = (t: ParkingSpotType) => {
    switch (t) {
      case 'visitor': return theme.primary;
      case 'employee': return theme.success;
      case 'valet': return theme.chartPurple;
      case 'reserved': return theme.warning;
      default: return theme.textSecondary;
    }
  };

  const getTypeIcon = (t: ParkingSpotType): IconName => {
    switch (t) {
      case 'visitor': return 'users';
      case 'employee': return 'briefcase';
      case 'valet': return 'key';
      case 'reserved': return 'lock';
      default: return 'circle';
    }
  };

  const color = getTypeColor(type);
  
  return (
    <View style={[styles.typeCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.typeIcon, { backgroundColor: applyOpacity(color, '15') }]}>
        <DDIcon name={getTypeIcon(type)} size={20} color={color} />
      </View>
      <View style={styles.typeInfo}>
        <ThemedText style={[styles.typeName, { color: theme.text }]}>
          {getSpotTypeLabel(type)}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
          {available} available
        </ThemedText>
      </View>
      <View style={styles.typeStats}>
        <ThemedText style={[styles.typeTotal, { color }]}>{total}</ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>total</ThemedText>
      </View>
    </View>
  );
}

interface HistoryRowProps {
  log: ParkingUtilizationLog;
  isFirst: boolean;
  fmtDate: (date: Date | string, format?: 'short' | 'medium' | 'long') => string;
  t: (key: string) => string;
}

function HistoryRow({ log, isFirst, fmtDate, t }: HistoryRowProps) {
  const { theme } = useTheme();
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const logDate = new Date(dateStr);
    logDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('time.today');
    if (diffDays === 1) return t('time.yesterday');
    
    return fmtDate(date, 'short');
  };
  
  const utilizationPercent = log.totalSpots > 0 
    ? Math.round(((log.occupiedSpots + log.reservedSpots) / log.totalSpots) * 100) 
    : 0;
  
  return (
    <View style={[
      styles.historyRow, 
      { 
        backgroundColor: theme.surface,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: theme.border,
      }
    ]}>
      <View style={styles.historyDateCol}>
        <ThemedText style={[Typography.bodySmall, { color: theme.text, fontWeight: '600' }]}>
          {formatDate(log.date)}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
          {getLocationLabel(log.location)}
        </ThemedText>
      </View>
      
      <View style={styles.historyStatsCol}>
        <View style={styles.historyStatItem}>
          <DDIcon name="layers" size={12} color={theme.textSecondary} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4 }]}>
            {log.occupiedSpots}/{log.totalSpots}
          </ThemedText>
        </View>
        <View style={styles.historyStatItem}>
          <DDIcon name="trending-up" size={12} color={theme.warning} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4 }]}>
            Peak: {log.peakOccupancy}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.historyPeakCol}>
        <View style={[styles.peakBadge, { backgroundColor: applyOpacity(theme.info, '15') }]}>
          <DDIcon name="clock" size={12} color={theme.info} />
          <ThemedText style={[Typography.caption, { color: theme.info, marginStart: 4 }]}>
            {log.peakHour}
          </ThemedText>
        </View>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
          {utilizationPercent}% util.
        </ThemedText>
      </View>
    </View>
  );
}

export default function ParkingUtilizationScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  
  const [utilization, setUtilization] = useState<ReturnType<typeof getCurrentUtilization> | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ParkingUtilizationLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      setUtilization(getCurrentUtilization());
      setHistoryLogs(getUtilizationLogs());
    }, [])
  );

  const groupedHistory = useMemo(() => {
    const grouped: Record<string, ParkingUtilizationLog[]> = {};
    historyLogs.forEach(log => {
      if (!grouped[log.date]) {
        grouped[log.date] = [];
      }
      grouped[log.date].push(log);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 7);
  }, [historyLogs]);

  const getLocationColor = (location: ParkingLocationId) => {
    switch (location) {
      case 'skbc_basement': return theme.primary;
      case 'red_sea_mall': return theme.chartTeal;
      case 'valet_zone': return theme.chartPurple;
      default: return theme.textSecondary;
    }
  };

  if (!utilization) {
    return null;
  }

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <ThemedText style={Typography.title}>{t('admin.parkingUtilization')}</ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {t('time.today')}'s snapshot and history
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <View style={styles.kpiRow}>
        <KPICard 
          title={t('parking.totalSpots')} 
          value={String(utilization.total)} 
          icon="grid" 
          iconBgColor={applyOpacity(theme.primary, '20')}
          iconColor={theme.primary}
          cardBgColor={applyOpacity(theme.primary, '06')}
        />
        <KPICard 
          title={t('status.available')} 
          value={String(utilization.available)} 
          icon="check-circle" 
          iconBgColor={applyOpacity(theme.success, '20')}
          iconColor={theme.success}
          cardBgColor={applyOpacity(theme.success, '06')}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.kpiRow}>
        <KPICard 
          title={t('status.occupied')} 
          value={String(utilization.occupied)} 
          icon="truck" 
          iconBgColor={applyOpacity(theme.warning, '20')}
          iconColor={theme.warning}
          cardBgColor={applyOpacity(theme.warning, '06')}
        />
        <KPICard 
          title={t('status.reserved')} 
          value={String(utilization.reserved)} 
          icon="bookmark" 
          iconBgColor={applyOpacity(theme.info, '20')}
          iconColor={theme.info}
          cardBgColor={applyOpacity(theme.info, '06')}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.kpiRowSingle}>
        <KPICard 
          title={t('status.maintenance')} 
          value={String(utilization.maintenance)} 
          icon="tool" 
          iconBgColor={applyOpacity(theme.error, '20')}
          iconColor={theme.error}
          cardBgColor={applyOpacity(theme.error, '06')}
        />
      </View>

      <Spacer height={Spacing.xxl} />

      <View style={styles.sectionHeader}>
        <DDIcon name="map" size={18} color={theme.primary} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          By Location
        </ThemedText>
      </View>

      <Spacer height={Spacing.md} />

      {utilization.byLocation.map(loc => (
        <View key={loc.location}>
          <LocationCard
            label={getLocationLabel(loc.location)}
            total={loc.total}
            available={loc.available}
            occupied={loc.occupied}
            reserved={loc.reserved}
            maintenance={loc.maintenance}
            color={getLocationColor(loc.location)}
          />
          <Spacer height={Spacing.md} />
        </View>
      ))}

      <Spacer height={Spacing.lg} />

      <View style={styles.sectionHeader}>
        <DDIcon name="layers" size={18} color={theme.primary} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          By Type
        </ThemedText>
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.typeGrid}>
        {utilization.byType.map(typeData => (
          <TypeCard
            key={typeData.type}
            type={typeData.type}
            total={typeData.total}
            available={typeData.available}
            occupied={typeData.occupied}
            reserved={typeData.reserved}
          />
        ))}
      </View>

      <Spacer height={Spacing.xxl} />

      <View style={styles.sectionHeader}>
        <DDIcon name="calendar" size={18} color={theme.primary} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          History (Last 7 Days)
        </ThemedText>
      </View>

      <Spacer height={Spacing.md} />

      <View style={[styles.historyContainer, { backgroundColor: theme.surface, borderRadius: BorderRadius.md }]}>
        {groupedHistory.length > 0 ? (
          groupedHistory.flatMap(([date, logs], groupIndex) => 
            logs.map((log, logIndex) => (
              <HistoryRow 
                key={log.id} 
                log={log} 
                isFirst={groupIndex === 0 && logIndex === 0}
                fmtDate={formatDate}
                t={t}
              />
            ))
          )
        ) : (
          <View style={styles.emptyHistory}>
            <DDIcon name="inbox" size={32} variant="muted" />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('common.noData')}
            </ThemedText>
          </View>
        )}
      </View>

      <Spacer height={Spacing.xxl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  kpiRowSingle: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '50%',
    paddingEnd: Spacing.xs,
  },
  kpiCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    fontWeight: '700',
    lineHeight: 34,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
  },
  percentBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  percentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 4,
  },
  progressSegment: {
    height: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeGrid: {
    gap: Spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeStats: {
    alignItems: 'flex-end',
  },
  typeTotal: {
    fontSize: 20,
    fontWeight: '700',
  },
  historyContainer: {
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  historyDateCol: {
    flex: 1.2,
  },
  historyStatsCol: {
    flex: 1,
    gap: 4,
  },
  historyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyPeakCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  emptyHistory: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
