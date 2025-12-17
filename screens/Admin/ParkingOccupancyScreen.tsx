import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { ParkingOccupancyMetrics } from "@/types/vms.types";
import { getParkingOccupancyMetrics, getParkingAnalytics } from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

export default function ParkingOccupancyScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [metrics, setMetrics] = useState<ParkingOccupancyMetrics | null>(null);
  const [analytics, setAnalytics] = useState<{ peakHours: { hour: number; occupancy: number }[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    setMetrics(getParkingOccupancyMetrics());
    setAnalytics(getParkingAnalytics());
  };

  if (!metrics) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>{t("common.loading")}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const metricCards = [
    {
      id: "total",
      label: t("admin.totalBays"),
      value: metrics.totalBays,
      icon: "grid",
      color: theme.primary,
    },
    {
      id: "assigned",
      label: t("admin.assignedToEmployees"),
      value: metrics.assignedToEmployees,
      icon: "user-check",
      color: theme.info,
    },
    {
      id: "freed",
      label: t("admin.freedDueToAbsence"),
      value: metrics.freedDueToAbsence,
      icon: "user-x",
      color: theme.warning,
    },
    {
      id: "visitors",
      label: t("admin.usedByVisitors"),
      value: metrics.usedByVisitors,
      icon: "users",
      color: theme.success,
    },
    {
      id: "available",
      label: t("admin.availableBays"),
      value: metrics.available,
      icon: "check-circle",
      color: theme.success,
    },
    {
      id: "maintenance",
      label: t("admin.maintenanceBays"),
      value: metrics.maintenanceBays,
      icon: "tool",
      color: theme.textSecondary,
    },
  ];

  const maxOccupancy = analytics ? Math.max(...analytics.peakHours.map((h) => h.occupancy)) : 100;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
            {t("admin.parkingOccupancy")}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            {t("admin.parkingDashboard")}
          </ThemedText>
        </View>

        <View style={[styles.utilizationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.utilizationHeader}>
            <View>
              <ThemedText style={[Typography.h1, { fontWeight: "700", color: theme.primary }]}>
                {metrics.utilizationRate}%
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t("admin.utilizationRate")}
              </ThemedText>
            </View>
            <View style={[styles.utilizationIcon, { backgroundColor: theme.primary + "15" }]}>
              <DDIcon name="pie-chart" size={32} color={theme.primary} />
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.primary, width: `${metrics.utilizationRate}%` },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {metricCards.map((card) => (
            <View
              key={card.id}
              style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.metricIcon, { backgroundColor: card.color + "15" }]}>
                <DDIcon name={card.icon as any} size={20} color={card.color} />
              </View>
              <ThemedText style={[Typography.h3, { fontWeight: "700", marginTop: Spacing.sm }]}>
                {card.value}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                {card.label}
              </ThemedText>
            </View>
          ))}
        </View>

        {analytics ? (
          <View style={[styles.chartSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText style={[Typography.subtitle, { fontWeight: "600", marginBottom: Spacing.md }]}>
              Peak Hours Occupancy
            </ThemedText>
            <View style={styles.chartContainer}>
              {analytics.peakHours.map((hour) => (
                <View key={hour.hour} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor:
                            hour.occupancy >= 80
                              ? theme.error
                              : hour.occupancy >= 60
                              ? theme.warning
                              : theme.success,
                          height: `${(hour.occupancy / maxOccupancy) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                    {hour.hour}:00
                  </ThemedText>
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{"<60%"}</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>60-80%</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.error }]} />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{">80%"}</ThemedText>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: Spacing.lg,
  },
  utilizationCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  utilizationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  utilizationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  chartSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
  },
  barContainer: {
    width: 20,
    height: 100,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
