import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { DDIcon, IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { UserRole, AdminDashboardKPI } from "@/types/vms.types";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { KPICard, KPICardRow } from '@/components/shared/KPICard';

interface AdminDashboardScreenProps {
  role: UserRole;
}

const getDashboardData = (
  role: UserRole,
  theme: ReturnType<typeof useTheme>['theme'],
  t: (key: string) => string
): { title: string; kpis: AdminDashboardKPI[] } => {
  switch (role) {
    case "building_admin":
      return {
        title: t('roles.buildingAdmin'),
        kpis: [
          {
            label: t('parking.totalSlots'),
            value: "150",
            icon: "map-pin",
            color: theme.info,
            trend: "+5",
          },
          {
            label: t('status.occupied'),
            value: "87",
            icon: "check-circle",
            color: theme.success,
            trend: "58%",
          },
          {
            label: t('status.reserved'),
            value: "23",
            icon: "clock",
            color: theme.warning,
            trend: "15%",
          },
          {
            label: t('status.available'),
            value: "40",
            icon: "circle",
            color: theme.textSecondary,
            trend: "27%",
          },
        ],
      };
    case "buffet_admin":
      return {
        title: t('roles.buffetAdmin'),
        kpis: [
          {
            label: t('dashboard.todaysSummary'),
            value: "24",
            icon: "disc",
            color: theme.warning,
            trend: "+3",
          },
          {
            label: t('dashboard.buffetStaff'),
            value: "8",
            icon: "users",
            color: theme.success,
            trend: "100%",
          },
          {
            label: t('navigation.locations'),
            value: "3",
            icon: "map",
            color: theme.info,
            trend: t('status.active'),
          },
          {
            label: t('dashboard.pendingRequests'),
            value: "5",
            icon: "alert-circle",
            color: theme.error,
            trend: t('status.pending'),
          },
        ],
      };
    case "valet_admin":
      return {
        title: t('roles.valetAdmin'),
        kpis: [
          {
            label: t('dashboard.activeDrivers'),
            value: "12",
            icon: "truck",
            color: theme.primary,
            trend: "75%",
          },
          {
            label: t('dashboard.pendingTasks'),
            value: "7",
            icon: "list",
            color: theme.warning,
            trend: t('status.inProgress'),
          },
          {
            label: t('dashboard.completedToday'),
            value: "23",
            icon: "check-square",
            color: theme.success,
            trend: "+12%",
          },
          {
            label: t('dashboard.avgWait'),
            value: "8m",
            icon: "clock",
            color: theme.info,
            trend: "-2m",
          },
        ],
      };
    case "security":
      return {
        title: t('roles.security'),
        kpis: [
          {
            label: t('dashboard.expectedToday'),
            value: "45",
            icon: "users",
            color: theme.info,
            trend: "12",
          },
          {
            label: t('dashboard.checkedIn'),
            value: "18",
            icon: "user-check",
            color: theme.success,
            trend: t('status.active'),
          },
          {
            label: t('status.pending'),
            value: "27",
            icon: "user-plus",
            color: theme.warning,
            trend: t('dashboard.awaitingArrival'),
          },
          {
            label: t('dashboard.walkIns'),
            value: "3",
            icon: "alert-circle",
            color: theme.primary,
            trend: t('dashboard.registeredToday'),
          },
        ],
      };
    default:
      return {
        title: t('navigation.dashboard'),
        kpis: [],
      };
  }
};

export default function AdminDashboardScreen({
  role,
}: AdminDashboardScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation(); const { title, kpis } = getDashboardData(role, theme, t);

  const recentActivity = [
    {
      id: "1",
      icon: "user-plus",
      title: t('visitor.visitorRequest'),
      subtitle: "Sarah Johnson - TechCorp Inc.",
      time: "5m",
    },
    {
      id: "2",
      icon: "check-circle",
      title: t('status.checkedIn'),
      subtitle: "Michael Chen",
      time: "12m",
    },
    {
      id: "3",
      icon: "truck",
      title: t('valet.valetService'),
      subtitle: "Ahmed Ali",
      time: "23m",
    },
    {
      id: "4",
      icon: "map-pin",
      title: t('services.parking'),
      subtitle: "B1-45",
      time: "35m",
    },
  ];

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <ThemedText style={[Typography.title]}>{title}</ThemedText>
      <ThemedText
        style={[Typography.bodySmall, { color: theme.textSecondary }]}
      >
        {t('dashboard.overview')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <KPICardRow>
        {kpis.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.label}
            value={kpi.value}
            icon={kpi.icon as IconName}
            color={kpi.color}
          />
        ))}
      </KPICardRow>

      <Spacer height={Spacing.xl} />

      <DirectionalRow style={styles.sectionHeader}>
        <ThemedText style={[Typography.subtitle, {}]}>{t('dashboard.recentActivity')}</ThemedText>
        <Pressable>
          <ThemedText style={[Typography.bodySmall, { color: theme.primary }]}>
            {t('common.viewAll')}
          </ThemedText>
        </Pressable>
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      {recentActivity.map((activity) => (
        <View key={activity.id}>
          <DirectionalRow
            style={[styles.activityCard, { backgroundColor: theme.surface }]}
          >
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <DDIcon
                name={activity.icon as IconName}
                size={20}
                variant="primary"
              />
            </View>
            <View style={{ flex: 1, marginStart: Spacing.md }}>
              <ThemedText style={[Typography.body, { fontWeight: "600" }]}>
                {activity.title}
              </ThemedText>
              <ThemedText
                style={[Typography.caption, { color: theme.textSecondary }]}
              >
                {activity.subtitle}
              </ThemedText>
            </View>
            <ThemedText
              style={[Typography.caption, { color: theme.textSecondary }]}
            >
              {activity.time}
            </ThemedText>
          </DirectionalRow>
          <Spacer height={Spacing.sm} />
        </View>
      ))}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityCard: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
