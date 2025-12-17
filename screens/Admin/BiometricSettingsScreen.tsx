import React, { useState, useCallback } from "react";
import { View, StyleSheet, Switch, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { BiometricSettings, UserRole } from "@/types/vms.types";
import { getBiometricSettings, updateBiometricSettings } from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

const ROLES: { id: UserRole; icon: string }[] = [
  { id: "building_admin", icon: "settings" },
  { id: "manager", icon: "briefcase" },
  { id: "employee", icon: "user" },
  { id: "security", icon: "shield" },
  { id: "receptionist", icon: "clipboard" },
  { id: "buffet_admin", icon: "coffee" },
  { id: "valet_admin", icon: "truck" },
];

export default function BiometricSettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<BiometricSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = () => {
    setSettings(getBiometricSettings());
  };

  const handleToggleGlobal = (value: boolean) => {
    const updated = updateBiometricSettings({ globalEnabled: value });
    setSettings(updated);
  };

  const handleToggleFallback = (value: boolean) => {
    const updated = updateBiometricSettings({ fallbackToPassword: value });
    setSettings(updated);
  };

  const handleToggleRole = (role: UserRole) => {
    if (!settings) return;
    const newRoles = settings.allowedRoles.includes(role)
      ? settings.allowedRoles.filter((r) => r !== role)
      : [...settings.allowedRoles, role];
    const updated = updateBiometricSettings({ allowedRoles: newRoles });
    setSettings(updated);
  };

  const getRoleName = (role: UserRole) => {
    const roleKey = role.replace(/_/g, "") as keyof typeof t;
    switch (role) {
      case "building_admin":
        return t("roles.buildingAdmin");
      case "buffet_admin":
        return t("roles.buffetAdmin");
      case "valet_admin":
        return t("roles.valetAdmin");
      case "manager":
        return t("roles.manager");
      case "employee":
        return t("roles.employee");
      case "security":
        return t("roles.security");
      case "receptionist":
        return t("roles.receptionist");
      default:
        return role;
    }
  };

  const getBiometricTypeLabel = (type?: string) => {
    switch (type) {
      case "fingerprint":
        return t("admin.fingerprint");
      case "face_id":
        return t("admin.faceId");
      default:
        return t("admin.unknown");
    }
  };

  if (!settings) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>{t("common.loading")}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
            {t("admin.biometricSettings")}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            {t("admin.biometricAuth")}
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
              <DDIcon name="lock" size={24} color={theme.primary} />
            </View>
            <View style={styles.sectionInfo}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                {t("admin.globalEnabled")}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                {t("admin.biometricAuth")}
              </ThemedText>
            </View>
            <Switch
              value={settings.globalEnabled}
              onValueChange={handleToggleGlobal}
              trackColor={{ false: theme.border, true: theme.primary + "80" }}
              thumbColor={settings.globalEnabled ? theme.primary : theme.textSecondary}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.warning + "15" }]}>
              <DDIcon name="key" size={24} color={theme.warning} />
            </View>
            <View style={styles.sectionInfo}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                {t("admin.fallbackToPassword")}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                Allow password login if biometric fails
              </ThemedText>
            </View>
            <Switch
              value={settings.fallbackToPassword}
              onValueChange={handleToggleFallback}
              trackColor={{ false: theme.border, true: theme.primary + "80" }}
              thumbColor={settings.fallbackToPassword ? theme.primary : theme.textSecondary}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
              {t("admin.deviceSupport")}
            </ThemedText>
          </View>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceRow}>
              <ThemedText style={Typography.body}>{t("admin.biometricType")}</ThemedText>
              <View style={[styles.badge, { backgroundColor: theme.success + "20" }]}>
                <DDIcon
                  name={settings.biometricType === "fingerprint" ? "smartphone" : "user"}
                  size={14}
                  color={theme.success}
                />
                <ThemedText style={[Typography.caption, { color: theme.success, marginStart: 4, fontWeight: "500" }]}>
                  {getBiometricTypeLabel(settings.biometricType)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.deviceRow}>
              <ThemedText style={Typography.body}>Device Support</ThemedText>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: settings.deviceSupported ? theme.success + "20" : theme.error + "20" },
                ]}
              >
                <DDIcon
                  name={settings.deviceSupported ? "check" : "x"}
                  size={14}
                  color={settings.deviceSupported ? theme.success : theme.error}
                />
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: settings.deviceSupported ? theme.success : theme.error,
                      marginStart: 4,
                      fontWeight: "500",
                    },
                  ]}
                >
                  {settings.deviceSupported ? "Supported" : "Not Supported"}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
              {t("admin.allowedRoles")}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
              Select roles that can use biometric login
            </ThemedText>
          </View>
          <View style={styles.rolesList}>
            {ROLES.map((role) => (
              <View key={role.id} style={[styles.roleRow, { borderColor: theme.border }]}>
                <View style={styles.roleInfo}>
                  <DDIcon name={role.icon as any} size={20} color={theme.text} />
                  <ThemedText style={[Typography.body, { marginStart: Spacing.sm }]}>
                    {getRoleName(role.id)}
                  </ThemedText>
                </View>
                <Switch
                  value={settings.allowedRoles.includes(role.id)}
                  onValueChange={() => handleToggleRole(role.id)}
                  trackColor={{ false: theme.border, true: theme.primary + "80" }}
                  thumbColor={settings.allowedRoles.includes(role.id) ? theme.primary : theme.textSecondary}
                  disabled={!settings.globalEnabled}
                />
              </View>
            ))}
          </View>
        </View>
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
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  sectionHeader: {
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
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  deviceInfo: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  rolesList: {
    padding: Spacing.sm,
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  roleInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
});
