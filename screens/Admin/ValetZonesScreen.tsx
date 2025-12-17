import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { StyledInput } from "@/components/StyledInput";
import { SearchInput } from "@/components/SearchInput";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { ValetZone, ValetZoneType } from "@/types/vms.types";
import {
  getValetZones,
  addValetZone,
  updateValetZone,
  deleteValetZone,
} from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

const ZONE_TYPES: { id: ValetZoneType; icon: string }[] = [
  { id: "basement", icon: "layers" },
  { id: "outdoor", icon: "sun" },
  { id: "covered", icon: "home" },
  { id: "vip", icon: "star" },
];

export default function ValetZonesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [zones, setZones] = useState<ValetZone[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ValetZone | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "basement" as ValetZoneType,
    location: "",
    capacity: "",
    priorityOrder: "",
    description: "",
    linkedEntrances: "",
    status: "active" as "active" | "inactive" | "full",
  });

  useFocusEffect(
    useCallback(() => {
      loadZones();
    }, [])
  );

  const loadZones = () => {
    setZones(getValetZones());
  };

  const filteredZones = zones.filter((zone) => {
    const matchesSearch =
      zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      zone.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleAddZone = () => {
    setEditingZone(null);
    setFormData({
      name: "",
      type: "basement",
      location: "",
      capacity: "",
      priorityOrder: "",
      description: "",
      linkedEntrances: "",
      status: "active",
    });
    setShowModal(true);
  };

  const handleEditZone = (zone: ValetZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      type: zone.type,
      location: zone.location,
      capacity: zone.capacity.toString(),
      priorityOrder: zone.priorityOrder.toString(),
      description: zone.description || "",
      linkedEntrances: zone.linkedEntrances?.join(", ") || "",
      status: zone.status,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.location || !formData.capacity) {
      return;
    }

    const entrances = formData.linkedEntrances
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);

    if (editingZone) {
      updateValetZone(editingZone.id, {
        name: formData.name,
        type: formData.type,
        location: formData.location,
        capacity: parseInt(formData.capacity),
        priorityOrder: parseInt(formData.priorityOrder) || 0,
        description: formData.description,
        linkedEntrances: entrances,
        status: formData.status,
      });
    } else {
      addValetZone({
        name: formData.name,
        type: formData.type,
        location: formData.location,
        capacity: parseInt(formData.capacity),
        currentOccupancy: 0,
        priorityOrder: parseInt(formData.priorityOrder) || zones.length + 1,
        description: formData.description,
        linkedEntrances: entrances,
        status: formData.status,
      });
    }

    loadZones();
    setShowModal(false);
  };

  const getZoneTypeLabel = (type: ValetZoneType) => {
    switch (type) {
      case "basement":
        return t("admin.basement");
      case "outdoor":
        return t("admin.outdoor");
      case "covered":
        return t("admin.covered");
      case "vip":
        return t("admin.vip");
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return theme.success;
      case "inactive":
        return theme.textSecondary;
      case "full":
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  const getOccupancyColor = (zone: ValetZone) => {
    const percentage = (zone.currentOccupancy / zone.capacity) * 100;
    if (percentage >= 90) return theme.error;
    if (percentage >= 70) return theme.warning;
    return theme.success;
  };

  const renderZoneCard = ({ item: zone }: { item: ValetZone }) => (
    <Pressable
      style={[styles.zoneCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => handleEditZone(zone)}
    >
      <View style={styles.zoneHeader}>
        <View style={styles.zoneIconContainer}>
          <View style={[styles.zoneIcon, { backgroundColor: theme.primary + "15" }]}>
            <DDIcon
              name={ZONE_TYPES.find((z) => z.id === zone.type)?.icon as any || "map-pin"}
              size={20}
              color={theme.primary}
            />
          </View>
        </View>
        <View style={styles.zoneInfo}>
          <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>{zone.name}</ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
            {zone.location}
          </ThemedText>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: theme.info + "20" }]}>
          <ThemedText style={[Typography.caption, { color: theme.info, fontWeight: "600" }]}>
            #{zone.priorityOrder}
          </ThemedText>
        </View>
      </View>

      <View style={styles.zoneStats}>
        <View style={styles.statItem}>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t("admin.zoneType")}
          </ThemedText>
          <ThemedText style={[Typography.body, { fontWeight: "500", marginTop: 2 }]}>
            {getZoneTypeLabel(zone.type)}
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t("admin.capacity")}
          </ThemedText>
          <ThemedText style={[Typography.body, { fontWeight: "500", marginTop: 2 }]}>
            {zone.capacity}
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t("admin.currentOccupancy")}
          </ThemedText>
          <ThemedText
            style={[Typography.body, { fontWeight: "500", marginTop: 2, color: getOccupancyColor(zone) }]}
          >
            {zone.currentOccupancy}/{zone.capacity}
          </ThemedText>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: getOccupancyColor(zone),
                width: `${Math.min((zone.currentOccupancy / zone.capacity) * 100, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {zone.linkedEntrances && zone.linkedEntrances.length > 0 ? (
        <View style={styles.entrancesContainer}>
          <DDIcon name="log-in" size={14} color={theme.textSecondary} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
            {zone.linkedEntrances.join(", ")}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.zoneActions}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.primary + "15" }]}
          onPress={() => handleEditZone(zone)}
        >
          <DDIcon name="edit-2" size={16} color={theme.primary} />
          <ThemedText style={[Typography.caption, { color: theme.primary, marginStart: 6 }]}>
            {t("common.edit")}
          </ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <DDIcon name="map-pin" size={48} color={theme.textSecondary} />
      <View style={{ height: Spacing.md }} />
      <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: "center" }]}>
        {t("admin.noZonesFound")}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
          {t("admin.valetZones")}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
          {zones.length} {t("admin.valetZones").toLowerCase()}
        </ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("common.search")}
        />
      </View>

      <FlatList
        data={filteredZones}
        renderItem={renderZoneCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 80 + Spacing.lg }]}
        onPress={handleAddZone}
      >
        <DDIcon name="plus" size={24} color={theme.buttonText} />
      </Pressable>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.xl },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                {editingZone ? t("admin.editZone") : t("admin.addZone")}
              </ThemedText>
              <Pressable onPress={() => setShowModal(false)}>
                <DDIcon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <StyledInput
                label={t("admin.zoneName")}
                value={formData.name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                placeholder={t("admin.zoneName")}
              />
              <View style={{ height: Spacing.md }} />

              <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                {t("admin.zoneType")}
              </ThemedText>
              <View style={styles.typeOptions}>
                {ZONE_TYPES.map((type) => (
                  <Pressable
                    key={type.id}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: formData.type === type.id ? theme.primary + "20" : theme.surface,
                        borderColor: formData.type === type.id ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setFormData((prev) => ({ ...prev, type: type.id }))}
                  >
                    <DDIcon
                      name={type.icon as any}
                      size={20}
                      color={formData.type === type.id ? theme.primary : theme.textSecondary}
                    />
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: formData.type === type.id ? theme.primary : theme.text,
                          marginTop: 4,
                        },
                      ]}
                    >
                      {getZoneTypeLabel(type.id)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <View style={{ height: Spacing.md }} />

              <StyledInput
                label={t("admin.location")}
                value={formData.location}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
                placeholder={t("admin.location")}
              />
              <View style={{ height: Spacing.md }} />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <StyledInput
                    label={t("admin.capacity")}
                    value={formData.capacity}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, capacity: text }))}
                    placeholder="0"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <StyledInput
                    label={t("admin.priorityOrder")}
                    value={formData.priorityOrder}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, priorityOrder: text }))}
                    placeholder="1"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={{ height: Spacing.md }} />

              <StyledInput
                label={t("admin.linkedEntrances")}
                value={formData.linkedEntrances}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, linkedEntrances: text }))}
                placeholder="Main Lobby, Side Entrance"
              />
              <View style={{ height: Spacing.xl }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <LoadingButton
                onPress={() => setShowModal(false)}
                variant="secondary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t("common.cancel")}
              </LoadingButton>
              <View style={{ width: Spacing.md }} />
              <LoadingButton
                onPress={handleSave}
                variant="primary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t("common.save")}
              </LoadingButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: Spacing.md,
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 120,
  },
  zoneCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  zoneHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  zoneIconContainer: {
    marginEnd: Spacing.md,
  },
  zoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  zoneInfo: {
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  zoneStats: {
    flexDirection: "row",
    marginTop: Spacing.md,
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
  },
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  entrancesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  zoneActions: {
    flexDirection: "row",
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  fab: {
    position: "absolute",
    end: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: HORIZONTAL_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalBody: {
    padding: HORIZONTAL_PADDING,
  },
  typeOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeOption: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: "row",
    padding: HORIZONTAL_PADDING,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
