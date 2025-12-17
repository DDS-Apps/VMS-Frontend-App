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
import { MeetingRoomDetail, MeetingRoomFeature } from "@/types/vms.types";
import {
  getMeetingRooms,
  addMeetingRoom,
  updateMeetingRoom,
  deleteMeetingRoom,
} from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

export default function MeetingRoomCatalogScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [rooms, setRooms] = useState<MeetingRoomDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "maintenance">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoomDetail | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    floor: "",
    building: "",
    capacity: "",
    description: "",
    features: [] as MeetingRoomFeature[],
    status: "active" as "active" | "inactive" | "maintenance",
  });

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [])
  );

  const loadRooms = () => {
    setRooms(getMeetingRooms());
  };

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.floor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.building.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || room.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddRoom = () => {
    setEditingRoom(null);
    setFormData({
      name: "",
      floor: "",
      building: "",
      capacity: "",
      description: "",
      features: [],
      status: "active",
    });
    setShowModal(true);
  };

  const handleEditRoom = (room: MeetingRoomDetail) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      floor: room.floor,
      building: room.building,
      capacity: room.capacity.toString(),
      description: room.description || "",
      features: room.features,
      status: room.status,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.floor || !formData.building || !formData.capacity) {
      return;
    }

    if (editingRoom) {
      updateMeetingRoom(editingRoom.id, {
        name: formData.name,
        floor: formData.floor,
        building: formData.building,
        capacity: parseInt(formData.capacity),
        description: formData.description,
        features: formData.features,
        status: formData.status,
      });
    } else {
      addMeetingRoom({
        name: formData.name,
        floor: formData.floor,
        building: formData.building,
        capacity: parseInt(formData.capacity),
        description: formData.description,
        features: formData.features,
        status: formData.status,
      });
    }

    loadRooms();
    setShowModal(false);
  };

  const handleToggleStatus = (room: MeetingRoomDetail) => {
    const newStatus = room.status === "active" ? "inactive" : "active";
    updateMeetingRoom(room.id, { status: newStatus });
    loadRooms();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return theme.success;
      case "inactive":
        return theme.textSecondary;
      case "maintenance":
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return t("status.active");
      case "inactive":
        return t("status.inactive");
      case "maintenance":
        return t("parking.maintenance");
      default:
        return status;
    }
  };

  const renderRoomCard = ({ item: room }: { item: MeetingRoomDetail }) => (
    <Pressable
      style={[styles.roomCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => handleEditRoom(room)}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomInfo}>
          <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>{room.name}</ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
            {room.building} - {t("admin.floor")} {room.floor}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(room.status) + "20" },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: getStatusColor(room.status) }]}
          />
          <ThemedText
            style={[Typography.caption, { color: getStatusColor(room.status), fontWeight: "500" }]}
          >
            {getStatusLabel(room.status)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.roomDetails}>
        <View style={styles.detailItem}>
          <DDIcon name="users" size={16} color={theme.textSecondary} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
            {t("admin.capacity")}: {room.capacity}
          </ThemedText>
        </View>
      </View>


      <View style={styles.roomActions}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.primary + "15" }]}
          onPress={() => handleEditRoom(room)}
        >
          <DDIcon name="edit-2" size={16} color={theme.primary} />
          <ThemedText style={[Typography.caption, { color: theme.primary, marginStart: 6 }]}>
            {t("common.edit")}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor:
                room.status === "active" ? theme.warning + "15" : theme.success + "15",
            },
          ]}
          onPress={() => handleToggleStatus(room)}
        >
          <DDIcon
            name={room.status === "active" ? "eye-off" : "eye"}
            size={16}
            color={room.status === "active" ? theme.warning : theme.success}
          />
          <ThemedText
            style={[
              Typography.caption,
              {
                color: room.status === "active" ? theme.warning : theme.success,
                marginStart: 6,
              },
            ]}
          >
            {room.status === "active" ? t("admin.deactivateRoom") : t("admin.activateRoom")}
          </ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );

  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
    >
      {(["all", "active", "inactive", "maintenance"] as const).map((status) => (
        <Pressable
          key={status}
          style={[
            styles.tab,
            filterStatus === status && { borderBottomWidth: 2, borderBottomColor: theme.primary },
          ]}
          onPress={() => setFilterStatus(status)}
        >
          <ThemedText
            style={[
              Typography.body,
              {
                color: filterStatus === status ? theme.primary : theme.textSecondary,
                fontWeight: "600",
              },
            ]}
            numberOfLines={1}
          >
            {status === "all" ? t("common.all") : getStatusLabel(status)}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <DDIcon name="home" size={48} color={theme.textSecondary} />
      <View style={{ height: Spacing.md }} />
      <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: "center" }]}>
        {t("admin.noRoomsFound")}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
          {t("admin.meetingRoomCatalog")}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
          {rooms.length} {t("admin.meetingRooms").toLowerCase()}
        </ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("common.search")}
        />
      </View>

      {renderFilterTabs()}

      <FlatList
        data={filteredRooms}
        renderItem={renderRoomCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 80 + Spacing.lg }]}
        onPress={handleAddRoom}
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
                {editingRoom ? t("admin.editRoom") : t("admin.addRoom")}
              </ThemedText>
              <Pressable onPress={() => setShowModal(false)}>
                <DDIcon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <StyledInput
                label={t("admin.roomName")}
                value={formData.name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                placeholder={t("admin.roomName")}
              />
              <View style={{ height: Spacing.md }} />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <StyledInput
                    label={t("admin.building")}
                    value={formData.building}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, building: text }))}
                    placeholder={t("admin.building")}
                  />
                </View>
                <View style={styles.halfField}>
                  <StyledInput
                    label={t("admin.floor")}
                    value={formData.floor}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, floor: text }))}
                    placeholder={t("admin.floor")}
                  />
                </View>
              </View>
              <View style={{ height: Spacing.md }} />

              <StyledInput
                label={t("admin.capacity")}
                value={formData.capacity}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, capacity: text }))}
                placeholder="0"
                keyboardType="number-pad"
              />
              <View style={{ height: Spacing.md }} />


              <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                {t("common.status")}
              </ThemedText>
              <View style={styles.statusOptions}>
                {(["active", "inactive", "maintenance"] as const).map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: formData.status === status ? theme.primary + "20" : theme.surface,
                        borderColor: formData.status === status ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setFormData((prev) => ({ ...prev, status }))}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(status) },
                      ]}
                    />
                    <ThemedText
                      style={[
                        Typography.caption,
                        {
                          color: formData.status === status ? theme.primary : theme.text,
                          marginStart: 6,
                        },
                      ]}
                    >
                      {getStatusLabel(status)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
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
    marginBottom: Spacing.sm,
  },
  tabsContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: Spacing.lg,
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 120,
  },
  roomCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  roomInfo: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginEnd: 6,
  },
  roomDetails: {
    flexDirection: "row",
    marginTop: Spacing.sm,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomActions: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.sm,
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
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  statusOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
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
