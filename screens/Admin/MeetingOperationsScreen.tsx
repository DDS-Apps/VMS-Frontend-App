import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, FlatList, Switch } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { MeetingRoomDetail, MeetingBooking } from "@/types/vms.types";
import {
  getMeetingRooms,
  getMeetingBookings,
  updateMeetingRoom,
} from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

interface RoomStatus {
  room: MeetingRoomDetail;
  currentBooking: MeetingBooking | null;
  nextBooking: MeetingBooking | null;
  affectedBookingsCount: number;
}

export default function MeetingOperationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [roomStatuses, setRoomStatuses] = useState<RoomStatus[]>([]);
  const [selectedView, setSelectedView] = useState<"grid" | "list">("grid");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    const rooms = getMeetingRooms();
    const bookings = getMeetingBookings();
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5);

    const statuses: RoomStatus[] = rooms.map((room) => {
      const roomBookings = bookings
        .filter((b) => b.roomId === room.id && b.date === today && b.status === "scheduled")
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const currentBooking = roomBookings.find(
        (b) => b.startTime <= currentTime && b.endTime > currentTime
      ) || null;

      const nextBooking = roomBookings.find((b) => b.startTime > currentTime) || null;

      const affectedBookingsCount = bookings.filter(
        (b) => b.roomId === room.id && 
        b.status === "scheduled" &&
        (b.date > today || (b.date === today && b.startTime >= currentTime))
      ).length;

      return { room, currentBooking, nextBooking, affectedBookingsCount };
    });

    setRoomStatuses(statuses);
  };

  const handleRoomPress = (roomId: string) => {
    navigation.navigate("MeetingRoomDetail", { roomId });
  };

  const handleToggleRoomStatus = (room: MeetingRoomDetail) => {
    const newStatus = room.status === "active" ? "inactive" : "active";
    updateMeetingRoom(room.id, { status: newStatus });
    loadData();
  };

  const getRoomStatusColor = (status: RoomStatus) => {
    if (status.room.status === "maintenance") return theme.warning;
    if (status.room.status === "inactive") return theme.textSecondary;
    if (status.currentBooking) return theme.error;
    return theme.success;
  };

  const getRoomStatusLabel = (status: RoomStatus) => {
    if (status.room.status === "maintenance") return t("status.maintenance");
    if (status.room.status === "inactive") return t("status.inactive");
    if (status.currentBooking) return t("status.inUse");
    return t("status.available");
  };

  const getTimeUntilNext = (booking: MeetingBooking | null) => {
    if (!booking) return null;
    const now = new Date();
    const [hours, mins] = booking.startTime.split(":").map(Number);
    const bookingTime = new Date();
    bookingTime.setHours(hours, mins, 0, 0);
    const diffMins = Math.round((bookingTime.getTime() - now.getTime()) / 60000);
    if (diffMins <= 0) return null;
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  const renderGridCard = ({ item: status }: { item: RoomStatus }) => {
    const showWarningBadge = status.room.status === "maintenance" && status.affectedBookingsCount > 0;
    
    return (
      <Pressable
        style={[
          styles.gridCard,
          {
            backgroundColor: theme.surface,
            borderColor: getRoomStatusColor(status),
            borderWidth: 2,
          },
        ]}
        onPress={() => handleRoomPress(status.room.id)}
      >
        <View style={styles.gridHeader}>
          <View style={[styles.statusDot, { backgroundColor: getRoomStatusColor(status) }]} />
          <ThemedText style={[Typography.caption, { color: getRoomStatusColor(status), fontWeight: "500" }]}>
            {getRoomStatusLabel(status)}
          </ThemedText>
          {showWarningBadge ? (
            <View style={[styles.warningBadge, { backgroundColor: theme.warning }]}>
              <DDIcon name="alert-triangle" size={10} color="#fff" />
              <ThemedText style={[Typography.caption, { color: "#fff", fontSize: 10, marginStart: 2 }]}>
                {status.affectedBookingsCount}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={[Typography.subtitle, { fontWeight: "600", marginTop: Spacing.sm }]} numberOfLines={1}>
          {status.room.name}
        </ThemedText>
        <View style={styles.gridMeta}>
          <DDIcon name="users" size={12} color={theme.textSecondary} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4 }]}>
            {status.room.capacity}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: Spacing.sm }]}>
            {status.room.floor}
          </ThemedText>
          <View style={{ flex: 1 }} />
          <DDIcon name="chevron-right" size={14} color={theme.textSecondary} />
        </View>

        {status.currentBooking ? (
          <View style={[styles.currentBooking, { backgroundColor: theme.error + "10" }]}>
            <ThemedText style={[Typography.caption, { fontWeight: "500" }]} numberOfLines={1}>
              {status.currentBooking.title}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 10 }]}>
              until {status.currentBooking.endTime}
            </ThemedText>
          </View>
        ) : status.nextBooking ? (
          <View style={[styles.nextBooking, { backgroundColor: theme.info + "10" }]}>
            <ThemedText style={[Typography.caption, { color: theme.info }]}>
              Next in {getTimeUntilNext(status.nextBooking)}
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.availableInfo, { backgroundColor: theme.success + "10" }]}>
            <ThemedText style={[Typography.caption, { color: theme.success }]}>{t("admin.noBookings")}</ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  const renderListCard = ({ item: status }: { item: RoomStatus }) => {
    const showWarningBadge = status.room.status === "maintenance" && status.affectedBookingsCount > 0;
    
    return (
      <Pressable
        style={[styles.listCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => handleRoomPress(status.room.id)}
      >
        <View style={[styles.listStatusIndicator, { backgroundColor: getRoomStatusColor(status) }]} />
        <View style={styles.listCardContent}>
          <View style={styles.listHeader}>
            <View style={styles.listInfo}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>{status.room.name}</ThemedText>
                {showWarningBadge ? (
                  <View style={[styles.warningBadge, { backgroundColor: theme.warning, marginStart: Spacing.xs }]}>
                    <DDIcon name="alert-triangle" size={10} color="#fff" />
                    <ThemedText style={[Typography.caption, { color: "#fff", fontSize: 10, marginStart: 2 }]}>
                      {status.affectedBookingsCount} {t("admin.needsReassignment")}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <View style={styles.listMeta}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {status.room.building} - {status.room.floor}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {" "}
                  | {status.room.capacity} seats
                </ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Switch
                value={status.room.status === "active"}
                onValueChange={() => handleToggleRoomStatus(status.room)}
                trackColor={{ false: theme.border, true: theme.success + "80" }}
                thumbColor={status.room.status === "active" ? theme.success : theme.textSecondary}
              />
              <View style={{ marginStart: Spacing.xs }}>
                <DDIcon name="chevron-right" size={18} color={theme.textSecondary} />
              </View>
            </View>
          </View>

          <View style={styles.listBookingInfo}>
            {status.currentBooking ? (
              <View style={[styles.listBookingBadge, { backgroundColor: theme.error + "15" }]}>
                <DDIcon name="clock" size={12} color={theme.error} />
                <ThemedText style={[Typography.caption, { color: theme.error, marginStart: 4 }]}>
                  {t("status.inUse")}: {status.currentBooking.title} (until {status.currentBooking.endTime})
                </ThemedText>
              </View>
            ) : null}
            {status.nextBooking ? (
              <View style={[styles.listBookingBadge, { backgroundColor: theme.info + "15" }]}>
                <DDIcon name="calendar" size={12} color={theme.info} />
                <ThemedText style={[Typography.caption, { color: theme.info, marginStart: 4 }]}>
                  {t("admin.nextBooking")}: {status.nextBooking.startTime} - {status.nextBooking.title}
                </ThemedText>
              </View>
            ) : null}
            {!status.currentBooking && !status.nextBooking && status.room.status === "active" ? (
              <View style={[styles.listBookingBadge, { backgroundColor: theme.success + "15" }]}>
                <DDIcon name="check-circle" size={12} color={theme.success} />
                <ThemedText style={[Typography.caption, { color: theme.success, marginStart: 4 }]}>
                  {t("admin.availableAllDay")}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const availableCount = roomStatuses.filter(
    (s) => s.room.status === "active" && !s.currentBooking
  ).length;
  const inUseCount = roomStatuses.filter((s) => s.currentBooking).length;
  const offlineCount = roomStatuses.filter(
    (s) => s.room.status === "inactive" || s.room.status === "maintenance"
  ).length;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
              {t("admin.meetingOperations")}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
              {t("admin.liveRoomStatus")}
            </ThemedText>
          </View>
          <View style={styles.viewToggle}>
            <Pressable
              style={[
                styles.viewButton,
                { backgroundColor: selectedView === "grid" ? theme.primary : theme.surface },
              ]}
              onPress={() => setSelectedView("grid")}
            >
              <DDIcon name="grid" size={18} color={selectedView === "grid" ? theme.buttonText : theme.text} />
            </Pressable>
            <Pressable
              style={[
                styles.viewButton,
                { backgroundColor: selectedView === "list" ? theme.primary : theme.surface },
              ]}
              onPress={() => setSelectedView("list")}
            >
              <DDIcon name="list" size={18} color={selectedView === "list" ? theme.buttonText : theme.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={[styles.statItem, { backgroundColor: theme.success + "15" }]}>
          <ThemedText style={[Typography.h3, { color: theme.success, fontWeight: "700" }]}>
            {availableCount}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.success }]}>{t("status.available")}</ThemedText>
        </View>
        <View style={[styles.statItem, { backgroundColor: theme.error + "15" }]}>
          <ThemedText style={[Typography.h3, { color: theme.error, fontWeight: "700" }]}>{inUseCount}</ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.error }]}>{t("status.inUse")}</ThemedText>
        </View>
        <View style={[styles.statItem, { backgroundColor: theme.textSecondary + "15" }]}>
          <ThemedText style={[Typography.h3, { color: theme.textSecondary, fontWeight: "700" }]}>
            {offlineCount}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{t("status.offline")}</ThemedText>
        </View>
      </View>

      <FlatList
        data={roomStatuses}
        renderItem={selectedView === "grid" ? renderGridCard : renderListCard}
        keyExtractor={(item) => item.room.id}
        numColumns={selectedView === "grid" ? 2 : 1}
        key={selectedView}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={selectedView === "grid" ? styles.gridRow : undefined}
        showsVerticalScrollIndicator={false}
      />
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  viewToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  viewButton: {
    padding: Spacing.sm,
  },
  statsBar: {
    flexDirection: "row",
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  statItem: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 120,
  },
  gridRow: {
    gap: Spacing.sm,
  },
  gridCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    maxWidth: "49%",
  },
  gridHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 6,
  },
  gridMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  currentBooking: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  nextBooking: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  availableInfo: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  listCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  listStatusIndicator: {
    width: 4,
  },
  listCardContent: {
    flex: 1,
    padding: Spacing.md,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  listInfo: {
    flex: 1,
  },
  listMeta: {
    flexDirection: "row",
    marginTop: 2,
  },
  listBookingInfo: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  listBookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginStart: Spacing.xs,
  },
});
