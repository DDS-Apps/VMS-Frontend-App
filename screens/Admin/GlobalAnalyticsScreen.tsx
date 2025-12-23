import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useServerTimezone } from "@/hooks/useServerTimezone";
import {
  AdminKPIMetric,
  VisitsAnalytics,
  ValetAnalytics,
  BuffetAnalytics,
} from "@/types/vms.types";
import {
  getAdminKPIs,
  getVisitsAnalytics,
  getValetAnalytics,
  getBuffetAnalytics,
} from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

export default function GlobalAnalyticsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { localeCode } = useFormatters();
  const serverTimezone = useServerTimezone();
  const insets = useSafeAreaInsets();

  const [kpis, setKpis] = useState<AdminKPIMetric[]>([]);
  const [visitsAnalytics, setVisitsAnalytics] = useState<VisitsAnalytics | null>(null);
  const [valetAnalytics, setValetAnalytics] = useState<ValetAnalytics | null>(null);
  const [buffetAnalytics, setBuffetAnalytics] = useState<BuffetAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"7" | "30">("7");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    setKpis(getAdminKPIs());
    setVisitsAnalytics(getVisitsAnalytics());
    setValetAnalytics(getValetAnalytics());
    setBuffetAnalytics(getBuffetAnalytics());
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "trending-up";
      case "down":
        return "trending-down";
      default:
        return "minus";
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable", isPositive = true) => {
    if (trend === "stable") return theme.textSecondary;
    if (trend === "up") return isPositive ? theme.success : theme.error;
    return isPositive ? theme.error : theme.success;
  };

  const maxVisits = visitsAnalytics ? Math.max(...visitsAnalytics.dailyVisits.map((d) => d.count)) : 1;
  const maxValetTasks = valetAnalytics ? Math.max(...valetAnalytics.dailyTasks.map((d) => d.count)) : 1;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
            {t("admin.globalAnalytics")}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            {t("admin.kpiDashboard")}
          </ThemedText>
        </View>

        <View style={styles.periodSelector}>
          <Pressable
            style={[
              styles.periodButton,
              {
                backgroundColor: selectedPeriod === "7" ? theme.primary : theme.surface,
                borderColor: selectedPeriod === "7" ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setSelectedPeriod("7")}
          >
            <ThemedText
              style={[
                Typography.caption,
                { color: selectedPeriod === "7" ? theme.buttonText : theme.text, fontWeight: "500" },
              ]}
            >
              {t("admin.last7Days")}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.periodButton,
              {
                backgroundColor: selectedPeriod === "30" ? theme.primary : theme.surface,
                borderColor: selectedPeriod === "30" ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setSelectedPeriod("30")}
          >
            <ThemedText
              style={[
                Typography.caption,
                { color: selectedPeriod === "30" ? theme.buttonText : theme.text, fontWeight: "500" },
              ]}
            >
              {t("admin.last30Days")}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <View
              key={kpi.id}
              style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: kpi.color + "15" }]}>
                  <DDIcon name={kpi.icon as any} size={20} color={kpi.color} />
                </View>
                {kpi.trendValue ? (
                  <View style={styles.trendBadge}>
                    <DDIcon
                      name={getTrendIcon(kpi.trend) as any}
                      size={12}
                      color={getTrendColor(kpi.trend, kpi.id !== "kpi_006")}
                    />
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: getTrendColor(kpi.trend, kpi.id !== "kpi_006"),
                          marginStart: 2,
                          fontWeight: "500",
                        },
                      ]}
                    >
                      {kpi.trendValue > 0 ? "+" : ""}
                      {kpi.trendValue}
                      {kpi.unit || ""}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText style={[Typography.h2, { fontWeight: "700", marginTop: Spacing.sm }]}>
                {kpi.value}
                {kpi.unit ? (
                  <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>{kpi.unit}</ThemedText>
                ) : null}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                {kpi.name}
              </ThemedText>
              {kpi.comparisonPeriod ? (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 10 }]}>
                  {kpi.comparisonPeriod}
                </ThemedText>
              ) : null}
            </View>
          ))}
        </View>

        {visitsAnalytics ? (
          <View style={[styles.chartSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.chartHeader}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                {t("admin.visitsPerDay")}
              </ThemedText>
              <View style={styles.chartStats}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  Check-in: {Math.round((visitsAnalytics.totalCheckedIn / visitsAnalytics.totalInvited) * 100)}%
                </ThemedText>
              </View>
            </View>
            <View style={styles.chartContainer}>
              {visitsAnalytics.dailyVisits.slice(-7).map((day, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: theme.primary,
                          height: `${(day.count / maxVisits) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4, fontSize: 10 }]}>
                    {new Date(day.date).toLocaleDateString(localeCode, { weekday: "short", timeZone: serverTimezone }).substring(0, 2)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {valetAnalytics ? (
          <View style={[styles.chartSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.chartHeader}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                {t("admin.valetTasksPerDay")}
              </ThemedText>
              <View style={styles.chartStats}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  Avg wait: {valetAnalytics.averageWaitTime}min
                </ThemedText>
              </View>
            </View>
            <View style={styles.chartContainer}>
              {valetAnalytics.dailyTasks.slice(-7).map((day, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: theme.warning,
                          height: `${(day.count / maxValetTasks) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4, fontSize: 10 }]}>
                    {new Date(day.date).toLocaleDateString(localeCode, { weekday: "short", timeZone: serverTimezone }).substring(0, 2)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {buffetAnalytics ? (
          <View style={[styles.chartSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.chartHeader}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                {t("admin.buffetEventsPerDay")}
              </ThemedText>
              <View style={styles.chartStats}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  Avg guests: {buffetAnalytics.averageGuestsPerEvent}
                </ThemedText>
              </View>
            </View>
            <View style={styles.mealTypes}>
              {buffetAnalytics.popularMealTypes.map((meal) => (
                <View key={meal.type} style={styles.mealType}>
                  <View style={styles.mealBar}>
                    <View
                      style={[
                        styles.mealFill,
                        {
                          backgroundColor: theme.success,
                          width: `${(meal.count / Math.max(...buffetAnalytics.popularMealTypes.map((m) => m.count))) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.mealLabel}>
                    <ThemedText style={[Typography.caption, { fontWeight: "500" }]}>{meal.type}</ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{meal.count}</ThemedText>
                  </View>
                </View>
              ))}
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
  header: {
    marginBottom: Spacing.md,
  },
  periodSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  periodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  kpiCard: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  chartSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  chartStats: {},
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
  },
  barContainer: {
    width: 24,
    height: 80,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  mealTypes: {
    gap: Spacing.sm,
  },
  mealType: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mealBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  mealFill: {
    height: "100%",
    borderRadius: 4,
  },
  mealLabel: {
    width: 80,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
