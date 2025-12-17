import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  FlatList,
  I18nManager,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { MeetingRoomDetail, MeetingBooking, RoomChangeLog } from "@/types/vms.types";
import { MeetingRoomDetailScreenProps } from "@/types/buildingAdminNavigation.types";
import {
  getMeetingRoomById,
  getMeetingRooms,
  getMeetingBookings,
  updateMeetingRoom,
  updateMeetingBooking,
  addRoomChangeLog,
  getRoomChangeLogsByBookingId,
  MEETING_ROOM_FEATURES,
} from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;
const isRTL = I18nManager.isRTL;

export default function MeetingRoomDetailScreen({ route, navigation }: MeetingRoomDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate: fmtDate, isRTL: rtl } = useFormatters();
  const insets = useSafeAreaInsets();
  const { roomId } = route.params;

  const [room, setRoom] = useState<MeetingRoomDetail | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<MeetingBooking[]>([]);
  const [showMaintenanceWarning, setShowMaintenanceWarning] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<MeetingBooking | null>(null);
  const [availableRooms, setAvailableRooms] = useState<MeetingRoomDetail[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [roomId])
  );

  const loadData = () => {
    const roomData = getMeetingRoomById(roomId);
    setRoom(roomData || null);

    if (roomData) {
      const allBookings = getMeetingBookings();
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const todayStr = today.toISOString().split("T")[0];
      const nextWeekStr = nextWeek.toISOString().split("T")[0];

      const filtered = allBookings
        .filter(
          (b) =>
            b.roomId === roomId &&
            b.date >= todayStr &&
            b.date <= nextWeekStr &&
            (b.status === "scheduled" || b.status === "in_progress")
        )
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });

      setUpcomingBookings(filtered);
    }
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
        return t("status.maintenance");
      default:
        return status;
    }
  };

  const handleToggleMaintenance = () => {
    if (!room) return;

    if (room.status !== "maintenance" && upcomingBookings.length > 0) {
      setShowMaintenanceWarning(true);
    } else {
      performMaintenanceToggle();
    }
  };

  const performMaintenanceToggle = () => {
    if (!room) return;

    const newStatus = room.status === "maintenance" ? "active" : "maintenance";
    updateMeetingRoom(room.id, { status: newStatus });
    loadData();
    setShowMaintenanceWarning(false);
  };

  const handleReassignBooking = (booking: MeetingBooking) => {
    setSelectedBooking(booking);

    const allRooms = getMeetingRooms();
    const available = allRooms.filter(
      (r) =>
        r.id !== roomId &&
        r.status === "active" &&
        r.capacity >= (booking.attendeesCount || 1)
    );
    setAvailableRooms(available);
    setShowReassignModal(true);
  };

  const performReassignment = (newRoom: MeetingRoomDetail) => {
    if (!selectedBooking || !room) return;

    addRoomChangeLog(
      selectedBooking.id,
      room.id,
      room.name,
      newRoom.id,
      newRoom.name,
      "Building Admin"
    );

    updateMeetingBooking(selectedBooking.id, {
      roomId: newRoom.id,
      roomName: newRoom.name,
    });

    setShowReassignModal(false);
    setSelectedBooking(null);
    loadData();

    Alert.alert(t("common.success"), t("admin.bookingReassigned"));
  };

  const formatDate = (dateStr: string) => {
    return fmtDate(new Date(dateStr), 'short');
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return theme.warning;
      case "scheduled":
        return theme.info;
      default:
        return theme.textSecondary;
    }
  };

  if (!room) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyContainer}>
          <DDIcon name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.md }]}>
            {t("admin.noRoomsFound")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const renderBookingCard = ({ item: booking }: { item: MeetingBooking }) => {
    const isAffected = room?.status === "maintenance" || showMaintenanceWarning;

    return (
      <View
        style={[
          styles.bookingCard,
          {
            backgroundColor: theme.surface,
            borderColor: isAffected ? theme.warning : theme.border,
            borderWidth: isAffected ? 2 : 1,
          },
        ]}
      >
        {isAffected ? (
          <View style={[styles.warningBanner, { backgroundColor: theme.warning + "20" }]}>
            <DDIcon name="alert-triangle" size={14} color={theme.warning} />
            <ThemedText style={[Typography.caption, { color: theme.warning, marginStart: 6 }]}>
              {t("admin.affectedBookings")}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]} numberOfLines={1}>
              {booking.title}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
              {formatDate(booking.date)} | {booking.startTime} - {booking.endTime}
            </ThemedText>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getBookingStatusColor(booking.status) + "20" },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: getBookingStatusColor(booking.status) }]}
            />
            <ThemedText
              style={[Typography.caption, { color: getBookingStatusColor(booking.status), fontWeight: "500" }]}
            >
              {booking.status === "in_progress" ? t("admin.inProgress") : t("admin.scheduled")}
            </ThemedText>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailItem}>
            <DDIcon name="user" size={14} color={theme.textSecondary} />
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
              {booking.hostName}
            </ThemedText>
          </View>
          <View style={styles.detailItem}>
            <DDIcon name="users" size={14} color={theme.textSecondary} />
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
              {booking.attendeesCount} {t("admin.attendees")}
            </ThemedText>
          </View>
        </View>

        {booking.visitors && booking.visitors.length > 0 ? (
          <View style={[styles.visitorsSection, { backgroundColor: theme.info + "10" }]}>
            <DDIcon name="globe" size={12} color={theme.info} />
            <ThemedText style={[Typography.caption, { color: theme.info, marginStart: 6 }]}>
              {booking.visitors.length} {t("admin.visitors")}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.bookingActions}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.primary + "15" }]}
            onPress={() => handleReassignBooking(booking)}
          >
            <DDIcon name="shuffle" size={16} color={theme.primary} />
            <ThemedText style={[Typography.caption, { color: theme.primary, marginStart: 6 }]}>
              {t("admin.reassignRoom")}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.header}>
          <Pressable
            style={[styles.backButton, { backgroundColor: theme.surface }]}
            onPress={() => navigation.goBack()}
          >
            <DDIcon name={isRTL ? "chevron-right" : "chevron-left"} size={24} color={theme.text} />
          </Pressable>
          <ThemedText style={[Typography.h2, { fontWeight: "700", flex: 1, marginStart: Spacing.md }]}>
            {t("admin.roomDetails")}
          </ThemedText>
        </View>

        <View style={[styles.roomCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.roomIconContainer}>
            <View style={[styles.roomIcon, { backgroundColor: theme.primary + "15" }]}>
              <DDIcon name="home" size={32} color={theme.primary} />
            </View>
          </View>

          <View style={styles.roomMainInfo}>
            <ThemedText style={[Typography.h3, { fontWeight: "700" }]}>{room.name}</ThemedText>
            <ThemedText style={[Typography.body, { color: theme.textSecondary, marginTop: 4 }]}>
              {room.building} - {t("admin.floor")} {room.floor}
            </ThemedText>
          </View>

          <View
            style={[
              styles.roomStatusBadge,
              { backgroundColor: getStatusColor(room.status) + "20" },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(room.status) }]} />
            <ThemedText
              style={[Typography.body, { color: getStatusColor(room.status), fontWeight: "600" }]}
            >
              {getStatusLabel(room.status)}
            </ThemedText>
          </View>

          <View style={styles.roomMetaRow}>
            <View style={[styles.metaItem, { backgroundColor: theme.background }]}>
              <DDIcon name="users" size={18} color={theme.primary} />
              <ThemedText style={[Typography.body, { marginStart: 8 }]}>
                {room.capacity} {t("admin.capacity")}
              </ThemedText>
            </View>
          </View>

          {room.features.length > 0 ? (
            <View style={styles.featuresSection}>
              <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                {t("admin.features")}
              </ThemedText>
              <View style={styles.featuresGrid}>
                {room.features.map((feature) => {
                  const featureInfo = MEETING_ROOM_FEATURES.find((f) => f.id === feature);
                  return (
                    <View
                      key={feature}
                      style={[styles.featureChip, { backgroundColor: theme.primary + "15" }]}
                    >
                      <DDIcon name={featureInfo?.icon as any || "check"} size={14} color={theme.primary} />
                      <ThemedText style={[Typography.caption, { color: theme.primary, marginStart: 6 }]}>
                        {featureInfo?.name || feature}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {room.description ? (
            <View style={styles.descriptionSection}>
              <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
                {room.description}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.maintenanceSection}>
          <Pressable
            style={[
              styles.maintenanceButton,
              {
                backgroundColor: room.status === "maintenance" ? theme.success : theme.warning,
              },
            ]}
            onPress={handleToggleMaintenance}
          >
            <DDIcon
              name={room.status === "maintenance" ? "check-circle" : "tool"}
              size={20}
              color="#FFFFFF"
            />
            <ThemedText style={[Typography.body, { color: "#FFFFFF", fontWeight: "600", marginStart: 8 }]}>
              {room.status === "maintenance" ? t("admin.markActive") : t("admin.markOutOfService")}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
            {t("admin.upcomingBookings")}
          </ThemedText>
          <View style={[styles.countBadge, { backgroundColor: theme.primary + "15" }]}>
            <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: "600" }]}>
              {upcomingBookings.length}
            </ThemedText>
          </View>
        </View>

        {upcomingBookings.length > 0 ? (
          <View style={styles.bookingsList}>
            {upcomingBookings.map((booking) => (
              <React.Fragment key={booking.id}>
                {renderBookingCard({ item: booking })}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyBookings, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <DDIcon name="calendar" size={32} color={theme.textSecondary} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
              {t("admin.noUpcomingBookings")}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showMaintenanceWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMaintenanceWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.warningModal, { backgroundColor: theme.background }]}>
            <View style={[styles.warningIconContainer, { backgroundColor: theme.warning + "20" }]}>
              <DDIcon name="alert-triangle" size={32} color={theme.warning} />
            </View>
            <ThemedText style={[Typography.subtitle, { fontWeight: "600", marginTop: Spacing.md, textAlign: "center" }]}>
              {t("admin.markOutOfService")}
            </ThemedText>
            <ThemedText
              style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }]}
            >
              {t("admin.outOfServiceWarning")}
            </ThemedText>
            <View style={[styles.affectedCount, { backgroundColor: theme.warning + "15" }]}>
              <ThemedText style={[Typography.body, { color: theme.warning, fontWeight: "600" }]}>
                {upcomingBookings.length} {t("admin.affectedBookings")}
              </ThemedText>
            </View>
            <View style={styles.modalActions}>
              <LoadingButton
                onPress={() => setShowMaintenanceWarning(false)}
                variant="secondary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t("common.cancel")}
              </LoadingButton>
              <View style={{ width: Spacing.md }} />
              <LoadingButton
                onPress={performMaintenanceToggle}
                variant="danger"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t("common.confirm")}
              </LoadingButton>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReassignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReassignModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReassignModal(false)}>
          <View
            style={[
              styles.reassignModal,
              { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.xl },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                {t("admin.selectAlternativeRoom")}
              </ThemedText>
              <Pressable onPress={() => setShowReassignModal(false)}>
                <DDIcon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {selectedBooking ? (
              <View style={[styles.selectedBookingInfo, { backgroundColor: theme.surface }]}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {t("admin.reassignRoom")}:
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: "600" }]}>{selectedBooking.title}</ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {formatDate(selectedBooking.date)} | {selectedBooking.startTime} - {selectedBooking.endTime}
                </ThemedText>
              </View>
            ) : null}

            {availableRooms.length > 0 ? (
              <FlatList
                data={availableRooms}
                keyExtractor={(item) => item.id}
                style={styles.roomsList}
                renderItem={({ item: roomOption }) => (
                  <Pressable
                    style={[
                      styles.roomOption,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                    onPress={() => performReassignment(roomOption)}
                  >
                    <View style={styles.roomOptionInfo}>
                      <ThemedText style={[Typography.body, { fontWeight: "600" }]}>{roomOption.name}</ThemedText>
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                        {roomOption.building} - {t("admin.floor")} {roomOption.floor}
                      </ThemedText>
                    </View>
                    <View style={styles.roomOptionMeta}>
                      <DDIcon name="users" size={14} color={theme.textSecondary} />
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4 }]}>
                        {roomOption.capacity}
                      </ThemedText>
                      <DDIcon name="chevron-right" size={18} color={theme.primary} style={{ marginStart: Spacing.sm }} />
                    </View>
                  </Pressable>
                )}
              />
            ) : (
              <View style={styles.noRoomsContainer}>
                <DDIcon name="alert-circle" size={32} color={theme.textSecondary} />
                <ThemedText style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }]}>
                  {t("admin.noAvailableRooms")}
                </ThemedText>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  roomCard: {
    marginHorizontal: HORIZONTAL_PADDING,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  roomIconContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  roomIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  roomMainInfo: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  roomStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 8,
  },
  roomMetaRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  featuresSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  descriptionSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  maintenanceSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: Spacing.lg,
  },
  maintenanceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  bookingsList: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  bookingCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bookingInfo: {
    flex: 1,
    marginEnd: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  bookingDetails: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  visitorsSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
  },
  bookingActions: {
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
  emptyBookings: {
    marginHorizontal: HORIZONTAL_PADDING,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  warningModal: {
    width: "85%",
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  affectedCount: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  reassignModal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: HORIZONTAL_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  selectedBookingInfo: {
    margin: HORIZONTAL_PADDING,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  roomsList: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  roomOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  roomOptionInfo: {
    flex: 1,
  },
  roomOptionMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  noRoomsContainer: {
    padding: Spacing.xl,
    alignItems: "center",
  },
});
