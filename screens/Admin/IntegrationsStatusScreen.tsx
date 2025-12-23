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
import { useServerTimezone } from "@/hooks/useServerTimezone";
import { IntegrationHealth, IntegrationStatus } from "@/types/vms.types";
import { getIntegrations } from "@/services/mock/systemAdminState";
import { formatTimestamp as formatTimestampUtil } from "@/services/utils/dateTimeUtils";

const HORIZONTAL_PADDING = Spacing.md;

const INTEGRATION_ICONS: Record<string, string> = {
  outlook: "mail",
  oracle_hcm: "database",
  speed_gate: "lock",
  whatsapp: "message-circle",
  sms: "message-square",
  email: "send",
};

export default function IntegrationsStatusScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const { serverTimezone } = useServerTimezone();
  const insets = useSafeAreaInsets();

  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadIntegrations();
    }, [])
  );

  const loadIntegrations = () => {
    setIntegrations(getIntegrations());
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadIntegrations();
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: IntegrationStatus) => {
    switch (status) {
      case "ok":
        return theme.success;
      case "degraded":
        return theme.warning;
      case "down":
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: IntegrationStatus) => {
    switch (status) {
      case "ok":
        return t("admin.ok");
      case "degraded":
        return t("admin.degraded");
      case "down":
        return t("admin.down");
      default:
        return t("admin.unknown");
    }
  };

  const getStatusIcon = (status: IntegrationStatus) => {
    switch (status) {
      case "ok":
        return "check-circle";
      case "degraded":
        return "alert-triangle";
      case "down":
        return "x-circle";
      default:
        return "help-circle";
    }
  };

  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return t('common.none');
    const result = formatTimestampUtil(isoString, isRTL, serverTimezone);
    
    if (result.diffMins < 1) return t('time.justNow');
    if (result.diffMins < 60) return t('time.minutesAgo', { count: result.diffMins });
    if (result.diffHours < 24) return t('time.hoursAgo', { count: result.diffHours });
    if (result.diffDays < 7) return t('time.daysAgo', { count: result.diffDays });
    return result.date;
  };

  const getOverallStatus = () => {
    const hasDown = integrations.some((i) => i.status === "down");
    const hasDegraded = integrations.some((i) => i.status === "degraded");
    if (hasDown) return { status: "down" as IntegrationStatus, label: "Issues Detected" };
    if (hasDegraded) return { status: "degraded" as IntegrationStatus, label: "Some Degradation" };
    return { status: "ok" as IntegrationStatus, label: "All Systems Operational" };
  };

  const overallStatus = getOverallStatus();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
                {t("admin.integrationsHealth")}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {t("admin.integrationStatus")}
              </ThemedText>
            </View>
            <Pressable
              style={[styles.refreshButton, { backgroundColor: theme.primary + "15" }]}
              onPress={handleRefresh}
            >
              <DDIcon name={refreshing ? "loader" : "refresh-cw"} size={20} color={theme.primary} />
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.overallCard,
            {
              backgroundColor: getStatusColor(overallStatus.status) + "15",
              borderColor: getStatusColor(overallStatus.status),
            },
          ]}
        >
          <DDIcon
            name={getStatusIcon(overallStatus.status) as any}
            size={32}
            color={getStatusColor(overallStatus.status)}
          />
          <View style={styles.overallInfo}>
            <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
              {overallStatus.label}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
              {integrations.filter((i) => i.status === "ok").length} of {integrations.length} integrations healthy
            </ThemedText>
          </View>
        </View>

        {integrations.map((integration) => (
          <View
            key={integration.id}
            style={[styles.integrationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.integrationHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
                <DDIcon
                  name={INTEGRATION_ICONS[integration.type] as any || "link"}
                  size={24}
                  color={theme.primary}
                />
              </View>
              <View style={styles.integrationInfo}>
                <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                  {integration.name}
                </ThemedText>
                <View style={styles.configBadge}>
                  <DDIcon
                    name={integration.isConfigured ? "check" : "x"}
                    size={12}
                    color={integration.isConfigured ? theme.success : theme.textSecondary}
                  />
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: integration.isConfigured ? theme.success : theme.textSecondary,
                        marginStart: 4,
                      },
                    ]}
                  >
                    {integration.isConfigured ? t("admin.configured") : t("admin.notConfigured")}
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(integration.status) + "20" },
                ]}
              >
                <DDIcon
                  name={getStatusIcon(integration.status) as any}
                  size={16}
                  color={getStatusColor(integration.status)}
                />
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: getStatusColor(integration.status), fontWeight: "500", marginStart: 4 },
                  ]}
                >
                  {getStatusLabel(integration.status)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.integrationDetails}>
              <View style={styles.detailRow}>
                <DDIcon name="clock" size={14} color={theme.textSecondary} />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                  {t("admin.lastSync")}: {formatTimestamp(integration.lastSyncTime)}
                </ThemedText>
              </View>

              {integration.lastErrorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: theme.error + "10", borderColor: theme.error + "30" }]}>
                  <DDIcon name="alert-circle" size={14} color={theme.error} />
                  <View style={styles.errorContent}>
                    <ThemedText style={[Typography.caption, { color: theme.error, fontWeight: "500" }]}>
                      {t("admin.lastError")}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.error, marginTop: 2 }]}>
                      {integration.lastErrorMessage}
                    </ThemedText>
                    {integration.lastErrorTime ? (
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                        {formatTimestamp(integration.lastErrorTime)}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ))}
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
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  overallCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  overallInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  integrationCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  integrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginEnd: Spacing.md,
  },
  integrationInfo: {
    flex: 1,
  },
  configBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  integrationDetails: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorBox: {
    flexDirection: "row",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  errorContent: {
    flex: 1,
    marginStart: Spacing.sm,
  },
});
