import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ROUTES } from "@/constants";
import { DDIcon, IconName } from '@/components/DDIcon';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyOpacity } from '@/utils/statusStyles';
import { getPlatformFlexDirection } from '@/utils/rtlInitializer';
import { 
  getSystemStats, 
  getStaffOverview, 
  getRecentActivity,
  SystemStats,
  StaffOverview,
  RecentActivity,
} from '@/services/state/buildingAdminState';
import type { BuildingAdminDashboardScreenProps } from '@/types/buildingAdminNavigation.types';

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  cardBgColor: string;
  subtitle?: string;
}

function KPICard({ title, value, icon, iconBgColor, iconColor, cardBgColor, subtitle }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: cardBgColor, borderWidth: StyleSheet.hairlineWidth, borderColor: applyOpacity(iconColor, '15') }]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon as IconName} size={28} color={iconColor} />
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={[styles.kpiValue, { color: theme.text }]}>
        {value}
      </ThemedText>

      <Spacer height={Spacing.xs} />

      <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
      
      {subtitle ? (
        <>
          <Spacer height={2} />
          <ThemedText style={[styles.kpiSubtitle, { color: theme.info }]}>
            {subtitle}
          </ThemedText>
        </>
      ) : null}
    </View>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
  badge?: number;
}

function QuickActionButton({ icon, label, iconBgColor, iconColor, onPress, badge }: QuickActionProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon as IconName} size={24} color={iconColor} />
        {badge && badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.badgeText}>{badge > 99 ? '99+' : badge}</ThemedText>
          </View>
        ) : null}
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[styles.quickActionLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface StaffCardProps {
  title: string;
  icon: string;
  total: number;
  details: { label: string; value: number; color: string }[];
  onPress?: () => void;
}

function StaffCard({ title, icon, total, details, onPress }: StaffCardProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[styles.staffCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <View style={styles.staffCardHeader}>
        <DDIcon name={icon as IconName} size={20} color={theme.primary} />
        <ThemedText style={[styles.staffCardTitle, { color: theme.text }]}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.staffCardTotal, { color: theme.primary }]}>
          {total}
        </ThemedText>
      </View>
      <Spacer height={Spacing.md} />
      <View style={styles.staffCardDetails}>
        {details.map((detail, index) => (
          <View key={index} style={styles.staffDetail}>
            <View style={[styles.staffDetailDot, { backgroundColor: detail.color }]} />
            <ThemedText style={[styles.staffDetailLabel, { color: theme.textSecondary }]}>
              {detail.label}
            </ThemedText>
            <ThemedText style={[styles.staffDetailValue, { color: theme.text }]}>
              {detail.value}
            </ThemedText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export default function BuildingAdminDashboardScreen({ navigation }: BuildingAdminDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [staffOverview, setStaffOverview] = useState<StaffOverview | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useFocusEffect(
    useCallback(() => {
      setStats(getSystemStats());
      setStaffOverview(getStaffOverview());
      setActivities(getRecentActivity());
    }, [])
  );

  if (!stats || !staffOverview) {
    return null;
  }

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <ThemedText style={Typography.title}>{t('navigation.controlCenter')}</ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {t('dashboard.overview')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <View style={[styles.kpiRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
        <KPICard 
          title={t('dashboard.totalVisitors')} 
          value={String(stats.totalVisitors)} 
          icon="users" 
          iconBgColor={applyOpacity(theme.primary, '20')}
          iconColor={theme.primary}
          cardBgColor={applyOpacity(theme.primary, '06')}
          subtitle={t('time.today')}
        />
        <KPICard 
          title={t('dashboard.pendingRequests')} 
          value={String(stats.activeRequests)} 
          icon="file-text" 
          iconBgColor={applyOpacity(theme.info, '20')}
          iconColor={theme.info}
          cardBgColor={applyOpacity(theme.info, '06')}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={[styles.kpiRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
        <KPICard 
          title={t('status.approved')} 
          value={String(stats.approvedRequests)} 
          icon="check-circle" 
          iconBgColor={applyOpacity(theme.success, '20')}
          iconColor={theme.success}
          cardBgColor={applyOpacity(theme.success, '06')}
        />
        <KPICard 
          title={t('status.pending')} 
          value={String(stats.pendingRequests)} 
          icon="clock" 
          iconBgColor={applyOpacity(theme.warning, '20')}
          iconColor={theme.warning}
          cardBgColor={applyOpacity(theme.warning, '06')}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={[styles.kpiRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
        <KPICard 
          title={t('buffet.buffetService')} 
          value={String(stats.ongoingBuffets)} 
          icon="disc" 
          iconBgColor={applyOpacity('#FF6B35', '20')}
          iconColor="#FF6B35"
          cardBgColor={applyOpacity('#FF6B35', '06')}
        />
        <KPICard 
          title={t('valet.valetService')} 
          value={String(stats.activeValetOperations)} 
          icon="navigation" 
          iconBgColor={applyOpacity('#6366F1', '20')}
          iconColor="#6366F1"
          cardBgColor={applyOpacity('#6366F1', '06')}
        />
      </View>

      <Spacer height={Spacing.xxl} />

      <ThemedText style={[Typography.subtitle, { color: theme.text }]}>
        {t('dashboard.quickActions')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      <View style={[styles.quickActionsRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
        <QuickActionButton
          icon="users"
          label={t('navigation.manageUsers')}
          iconBgColor={applyOpacity(theme.primary, '12')}
          iconColor={theme.primary}
          onPress={() => navigation.navigate(ROUTES.USERS_ROLES as never)}
          badge={stats.totalUsers}
        />
        <QuickActionButton
          icon="list"
          label={t('navigation.allRequests')}
          iconBgColor={applyOpacity(theme.warning, '12')}
          iconColor={theme.warning}
          onPress={() => navigation.navigate(ROUTES.ALL_REQUESTS as never)}
          badge={stats.pendingRequests}
        />
        <QuickActionButton
          icon="map-pin"
          label={t('navigation.locations')}
          iconBgColor={applyOpacity(theme.success, '12')}
          iconColor={theme.success}
          onPress={() => navigation.navigate(ROUTES.ALL_LOCATIONS as never)}
        />
        <QuickActionButton
          icon="activity"
          label={t('navigation.reportsAndLogs')}
          iconBgColor={applyOpacity(theme.info, '12')}
          iconColor={theme.info}
          onPress={() => navigation.navigate(ROUTES.REPORTS as never)}
        />
      </View>

      <Spacer height={Spacing.xxl} />

      <ThemedText style={[Typography.subtitle, { color: theme.text }]}>
        {t('dashboard.staffOverview')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.staffScrollContent}
        nestedScrollEnabled={true}
      >
        <StaffCard
          title={t('dashboard.buffetStaff')}
          icon="disc"
          total={staffOverview.buffetStaff.total}
          details={[
            { label: t('dashboard.onDuty'), value: staffOverview.buffetStaff.onDuty, color: theme.success },
            { label: t('status.inactive'), value: staffOverview.buffetStaff.offDuty, color: theme.textSecondary },
          ]}
          onPress={() => navigation.navigate(ROUTES.BUFFET_OVERSIGHT as never)}
        />
        <Spacer width={Spacing.md} />
        <StaffCard
          title={t('navigation.drivers')}
          icon="navigation"
          total={staffOverview.valetDrivers.total}
          details={[
            { label: t('status.available'), value: staffOverview.valetDrivers.available, color: theme.success },
            { label: t('status.occupied'), value: staffOverview.valetDrivers.busy, color: theme.warning },
            { label: t('status.inactive'), value: staffOverview.valetDrivers.offDuty, color: theme.textSecondary },
          ]}
          onPress={() => navigation.navigate(ROUTES.VALET_OVERSIGHT as never)}
        />
        <Spacer width={Spacing.md} />
        <StaffCard
          title={t('roles.security')}
          icon="shield"
          total={staffOverview.security.total}
          details={[
            { label: t('dashboard.active'), value: staffOverview.security.active, color: theme.success },
          ]}
        />
        <Spacer width={Spacing.md} />
        <StaffCard
          title={t('roles.receptionist')}
          icon="user-check"
          total={staffOverview.receptionists.total}
          details={[
            { label: t('dashboard.active'), value: staffOverview.receptionists.active, color: theme.success },
          ]}
        />
      </ScrollView>

      <Spacer height={Spacing.xxl} />

      <View style={[styles.sectionHeader, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
        <ThemedText style={[Typography.subtitle, { color: theme.text }]}>
          {t('dashboard.recentActivity')}
        </ThemedText>
        <Pressable 
          onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS as never)}
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
      </View>

      <Spacer height={Spacing.md} />

      {activities.length > 0 ? (
        <View style={styles.activitiesList}>
          {activities.slice(0, 5).map((activity) => (
            <View key={activity.id}>
              <ThemedView style={[styles.activityCard, { backgroundColor: theme.surface, flexDirection: getPlatformFlexDirection(isRTL) }]}>
                <View style={[
                  styles.activityIconContainer, 
                  { backgroundColor: applyOpacity(
                    activity.type === 'visitor' ? theme.primary : 
                    activity.type === 'buffet' ? '#FF6B35' : 
                    activity.type === 'valet' ? '#6366F1' : theme.info, 
                    '12'
                  )}
                ]}>
                  <DDIcon 
                    name={activity.icon as IconName} 
                    size={18} 
                    color={
                      activity.type === 'visitor' ? theme.primary : 
                      activity.type === 'buffet' ? '#FF6B35' : 
                      activity.type === 'valet' ? '#6366F1' : theme.info
                    } 
                  />
                </View>
                <View style={styles.activityContent}>
                  <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                    {activity.action}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {activity.description}
                  </ThemedText>
                </View>
                <View style={styles.activityMeta}>
                  <View style={[
                    styles.activityTypeBadge, 
                    { backgroundColor: applyOpacity(theme.textSecondary, '10') }
                  ]}>
                    <ThemedText style={[styles.activityTypeText, { color: theme.textSecondary }]}>
                      {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    </ThemedText>
                  </View>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {activity.time}
                  </ThemedText>
                </View>
              </ThemedView>
              <Spacer height={Spacing.sm} />
            </View>
          ))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="activity" size={32} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {t('common.noData')}
          </ThemedText>
        </ThemedView>
      )}

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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  kpiSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickActionCard: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  staffScrollContent: {
    paddingEnd: Spacing.lg,
  },
  staffCard: {
    width: 180,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  staffCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  staffCardTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  staffCardDetails: {
    gap: Spacing.xs,
  },
  staffDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  staffDetailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  staffDetailLabel: {
    flex: 1,
    fontSize: 12,
  },
  staffDetailValue: {
    fontSize: 12,
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
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activitiesList: {},
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityTypeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  activityTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
