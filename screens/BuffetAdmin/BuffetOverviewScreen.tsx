import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
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
  useBuffetLoadSummaryQuery,
  useBuffetAdminLocationsQuery,
} from "@/hooks/queries/useBuffetQueries";
import type { BuffetLocationLoadDto, BuffetAdminLocationDto } from "@/types/api.types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BuffetAdminStackParamList } from "@/types/buffetAdminNavigation.types";

type BuffetOverviewScreenProps = NativeStackScreenProps<
  BuffetAdminStackParamList,
  "BuffetOverview"
>;

interface OverviewStats {
  totalEvents: number;
  totalGuests: number;
  activeLocations: number;
  statusCounts: {
    pending: number;
    preparing: number;
    ready: number;
    served: number;
    completed: number;
  };
}

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

interface StatusBarProps {
  pending: number;
  preparing: number;
  ready: number;
  served: number;
  completed: number;
  total: number;
}

function StatusBreakdownBar({ pending, preparing, ready, served, completed, total }: StatusBarProps) {
  const { theme } = useTheme();
  
  if (total === 0) return null;
  
  const getWidth = (count: number) => `${(count / total) * 100}%` as const;
  
  return (
    <View style={styles.statusBar}>
      {pending > 0 ? (
        <View style={[styles.statusBarSegment, { flex: pending, backgroundColor: theme.primary }]} />
      ) : null}
      {preparing > 0 ? (
        <View style={[styles.statusBarSegment, { flex: preparing, backgroundColor: theme.warning }]} />
      ) : null}
      {ready > 0 ? (
        <View style={[styles.statusBarSegment, { flex: ready, backgroundColor: theme.info }]} />
      ) : null}
      {served > 0 ? (
        <View style={[styles.statusBarSegment, { flex: served, backgroundColor: theme.success }]} />
      ) : null}
      {completed > 0 ? (
        <View style={[styles.statusBarSegment, { flex: completed, backgroundColor: applyOpacity(theme.success, '60') }]} />
      ) : null}
    </View>
  );
}

export default function BuffetOverviewScreen({ navigation }: BuffetOverviewScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const { data: loadSummary, isLoading: isLoadingLoadSummary } = useBuffetLoadSummaryQuery();
  const { data: locationsResponse, isLoading: isLoadingLocations } = useBuffetAdminLocationsQuery();

  const isLoading = isLoadingLoadSummary || isLoadingLocations;

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const stats = useMemo((): OverviewStats => {
    const locationLoads = Array.isArray(loadSummary?.locations) ? loadSummary.locations : [];
    if (locationLoads.length === 0) {
      return {
        totalEvents: 0,
        totalGuests: 0,
        activeLocations: 0,
        statusCounts: { pending: 0, preparing: 0, ready: 0, served: 0, completed: 0 },
      };
    }
    const totalEvents = locationLoads.reduce((sum, loc) => sum + loc.tasksToday, 0);
    const pendingCount = locationLoads.reduce((sum, loc) => sum + loc.pendingTasks, 0);
    const activeCount = locationLoads.reduce((sum, loc) => sum + loc.activeTasks, 0);
    const completedCount = locationLoads.reduce((sum, loc) => sum + loc.completedTasks, 0);
    const activeLocations = locationLoads.filter(loc => loc.tasksToday > 0).length;

    return {
      totalEvents,
      totalGuests: 0,
      activeLocations,
      statusCounts: {
        pending: pendingCount,
        preparing: 0,
        ready: 0,
        served: activeCount,
        completed: completedCount,
      },
    };
  }, [loadSummary]);

  const locations = useMemo(() => {
    const loadLocations = Array.isArray(loadSummary?.locations) ? loadSummary.locations : [];
    const locData = Array.isArray(locationsResponse?.data) ? locationsResponse.data : [];
    if (loadLocations.length === 0) {
      return [];
    }

    const locationMap = new Map(locData.map(loc => [loc.id, loc]));

    return loadLocations.map(loadData => {
      const locationDetails = locationMap.get(loadData.locationId);
      return {
        locationId: loadData.locationId,
        locationName: loadData.locationName,
        building: 'Building',
        floor: locationDetails?.floor || '-',
        eventsToday: loadData.tasksToday,
        totalGuests: 0,
        statusBreakdown: {
          pending: loadData.pendingTasks,
          preparing: 0,
          ready: 0,
          served: loadData.activeTasks,
          completed: loadData.completedTasks,
        },
      };
    });
  }, [loadSummary, locationsResponse]);

  type LocationOverviewItem = typeof locations[number];

  const renderLocationCard = (location: LocationOverviewItem) => {
    const hasEvents = location.eventsToday > 0;
    const totalActive = location.statusBreakdown.pending + 
                       location.statusBreakdown.preparing + 
                       location.statusBreakdown.ready + 
                       location.statusBreakdown.served;
    
    return (
      <View 
        key={location.locationId}
        style={[
          styles.locationCard, 
          { 
            backgroundColor: theme.surface,
            borderStartColor: hasEvents ? theme.primary : theme.border,
          }
        ]}
      >
        <View style={styles.locationHeader}>
          <View style={styles.locationInfo}>
            <ThemedText style={[styles.locationName, { color: theme.text }]}>
              {location.locationName}
            </ThemedText>
            <ThemedText style={[styles.locationMeta, { color: theme.textSecondary }]}>
              {location.building} - {location.floor}
            </ThemedText>
          </View>
          {hasEvents ? (
            <View style={[styles.eventsBadge, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
              <DDIcon name="calendar" size={14} color={theme.primary} />
              <ThemedText style={[styles.eventsText, { color: theme.primary }]}>
                {location.eventsToday} {t('buffet.eventsToday')}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.noEventsBadge, { backgroundColor: theme.surfaceSecondary }]}>
              <ThemedText style={[styles.noEventsText, { color: theme.textSecondary }]}>
                {t('buffet.noEvents')}
              </ThemedText>
            </View>
          )}
        </View>

        {hasEvents ? (
          <>
            <Spacer height={Spacing.md} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <DDIcon name="users" size={16} variant="muted" />
                <ThemedText style={[styles.statValue, { color: theme.text }]}>
                  {location.totalGuests}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t('buffet.totalGuests')}
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <DDIcon name="activity" size={16} variant="muted" />
                <ThemedText style={[styles.statValue, { color: theme.text }]}>
                  {totalActive}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t('buffet.activeOrders')}
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <DDIcon name="check-circle" size={16} color={theme.success} />
                <ThemedText style={[styles.statValue, { color: theme.text }]}>
                  {location.statusBreakdown.completed}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t('status.completed')}
                </ThemedText>
              </View>
            </View>

            <Spacer height={Spacing.md} />

            <StatusBreakdownBar
              pending={location.statusBreakdown.pending}
              preparing={location.statusBreakdown.preparing}
              ready={location.statusBreakdown.ready}
              served={location.statusBreakdown.served}
              completed={location.statusBreakdown.completed}
              total={location.eventsToday}
            />

            <Spacer height={Spacing.sm} />

            <View style={styles.legendRow}>
              {location.statusBreakdown.pending > 0 ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                  <ThemedText style={[styles.legendText, { color: theme.textSecondary }]}>
                    {t('status.pending')} ({location.statusBreakdown.pending})
                  </ThemedText>
                </View>
              ) : null}
              {location.statusBreakdown.preparing > 0 ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
                  <ThemedText style={[styles.legendText, { color: theme.textSecondary }]}>
                    {t('buffet.preparing')} ({location.statusBreakdown.preparing})
                  </ThemedText>
                </View>
              ) : null}
              {location.statusBreakdown.ready > 0 ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.info }]} />
                  <ThemedText style={[styles.legendText, { color: theme.textSecondary }]}>
                    {t('buffet.ready')} ({location.statusBreakdown.ready})
                  </ThemedText>
                </View>
              ) : null}
              {location.statusBreakdown.served > 0 ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                  <ThemedText style={[styles.legendText, { color: theme.textSecondary }]}>
                    {t('buffet.served')} ({location.statusBreakdown.served})
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.kpiRow}>
        <KPICard 
          title={t('buffet.eventsToday')} 
          value={String(stats.totalEvents)} 
          icon="calendar" 
          iconBgColor={applyOpacity(theme.primary, '20')}
          iconColor={theme.primary}
          cardBgColor={applyOpacity(theme.primary, '06')}
        />
        <KPICard 
          title={t('buffet.totalGuests')} 
          value={String(stats.totalGuests)} 
          icon="users" 
          iconBgColor={applyOpacity(theme.success, '20')}
          iconColor={theme.success}
          cardBgColor={applyOpacity(theme.success, '06')}
        />
        <KPICard 
          title={t('buffet.activeLocations')} 
          value={String(stats.activeLocations)} 
          icon="map-pin" 
          iconBgColor={applyOpacity(theme.warning, '20')}
          iconColor={theme.warning}
          cardBgColor={applyOpacity(theme.warning, '06')}
        />
      </View>

      <Spacer height={Spacing.xl} />

      <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('buffet.statusOverview')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStatItem}>
            <View style={[styles.summaryStatDot, { backgroundColor: theme.primary }]} />
            <ThemedText style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>
              {t('status.pending')}
            </ThemedText>
            <ThemedText style={[styles.summaryStatValue, { color: theme.text }]}>
              {stats.statusCounts.pending}
            </ThemedText>
          </View>
          <View style={styles.summaryStatItem}>
            <View style={[styles.summaryStatDot, { backgroundColor: theme.warning }]} />
            <ThemedText style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>
              {t('buffet.preparing')}
            </ThemedText>
            <ThemedText style={[styles.summaryStatValue, { color: theme.text }]}>
              {stats.statusCounts.preparing}
            </ThemedText>
          </View>
          <View style={styles.summaryStatItem}>
            <View style={[styles.summaryStatDot, { backgroundColor: theme.info }]} />
            <ThemedText style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>
              {t('buffet.ready')}
            </ThemedText>
            <ThemedText style={[styles.summaryStatValue, { color: theme.text }]}>
              {stats.statusCounts.ready}
            </ThemedText>
          </View>
          <View style={styles.summaryStatItem}>
            <View style={[styles.summaryStatDot, { backgroundColor: theme.success }]} />
            <ThemedText style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>
              {t('buffet.served')}
            </ThemedText>
            <ThemedText style={[styles.summaryStatValue, { color: theme.text }]}>
              {stats.statusCounts.served}
            </ThemedText>
          </View>
          <View style={styles.summaryStatItem}>
            <View style={[styles.summaryStatDot, { backgroundColor: applyOpacity(theme.success, '60') }]} />
            <ThemedText style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>
              {t('status.completed')}
            </ThemedText>
            <ThemedText style={[styles.summaryStatValue, { color: theme.text }]}>
              {stats.statusCounts.completed}
            </ThemedText>
          </View>
        </View>
      </View>

      <Spacer height={Spacing.xl} />

      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        {t('buffet.locationBreakdown')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      {isLoading ? (
        <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {t('common.loading')}
          </ThemedText>
        </View>
      ) : locations.length > 0 ? (
        <View style={styles.locationsList}>
          {locations.map(renderLocationCard)}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="map-pin" size={32} variant="muted" />
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  summaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
  },
  summaryStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationsList: {
    gap: Spacing.md,
  },
  locationCard: {
    borderRadius: BorderRadius.lg,
    borderStartWidth: 4,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  eventsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  eventsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noEventsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  noEventsText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statusBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBarSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
