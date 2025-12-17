import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { MeetingBooking } from "@/types/vms.types";
import { getMeetingBookings, getMeetingRooms } from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

const getWeekdays = (t: (key: string) => string) => [
  t('calendar.daysShort.sun'),
  t('calendar.daysShort.mon'),
  t('calendar.daysShort.tue'),
  t('calendar.daysShort.wed'),
  t('calendar.daysShort.thu'),
  t('calendar.daysShort.fri'),
  t('calendar.daysShort.sat'),
];

export default function MeetingCalendarScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate: fmtDate } = useFormatters();
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<MeetingBooking[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    setBookings(getMeetingBookings());
  };

  const getWeekDates = () => {
    const dates: Date[] = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return bookings.filter((b) => b.date === dateStr);
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return theme.success;
      case "pending":
        return theme.warning;
      case "cancelled":
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const weekDates = getWeekDates();
  const today = formatDate(new Date());

  const renderBookingCard = ({ item }: { item: MeetingBooking }) => (
    <View style={[styles.bookingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.bookingTime}>
        <ThemedText style={[Typography.caption, { fontWeight: "600" }]}>{item.startTime}</ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>-</ThemedText>
        <ThemedText style={[Typography.caption, { fontWeight: "600" }]}>{item.endTime}</ThemedText>
      </View>
      <View style={[styles.bookingDivider, { backgroundColor: getStatusColor(item.status) }]} />
      <View style={styles.bookingDetails}>
        <ThemedText style={[Typography.body, { fontWeight: "600" }]}>{item.title}</ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{item.roomName}</ThemedText>
        <View style={styles.bookingMeta}>
          <DDIcon name="user" size={12} color={theme.textSecondary} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4 }]}>
            {item.hostName}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: Spacing.sm }]}>
            ({item.attendeesCount})
          </ThemedText>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
        <ThemedText style={[Typography.caption, { color: getStatusColor(item.status), fontWeight: "500" }]}>
          {item.status}
        </ThemedText>
      </View>
    </View>
  );

  const selectedDateBookings = getBookingsForDate(selectedDate);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
          {t("admin.meetingCalendar")}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
          {t("admin.weekView")}
        </ThemedText>
      </View>

      <View style={styles.navigation}>
        <Pressable
          style={[styles.navButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={goToPreviousWeek}
        >
          <DDIcon name="chevron-left" size={20} color={theme.text} />
        </Pressable>
        <Pressable style={[styles.todayButton, { backgroundColor: theme.primary + "15" }]} onPress={goToToday}>
          <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: "500" }]}>{t('time.today')}</ThemedText>
        </Pressable>
        <ThemedText style={[Typography.subtitle, { fontWeight: "600", flex: 1, textAlign: "center" }]}>
          {fmtDate(selectedDate, 'long')}
        </ThemedText>
        <Pressable
          style={[styles.navButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={goToNextWeek}
        >
          <DDIcon name="chevron-right" size={20} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.weekView}>
        {weekDates.map((date, index) => {
          const dateStr = formatDate(date);
          const isSelected = dateStr === formatDate(selectedDate);
          const isToday = dateStr === today;
          const dayBookings = getBookingsForDate(date);

          return (
            <Pressable
              key={index}
              style={[
                styles.dayColumn,
                {
                  backgroundColor: isSelected ? theme.primary : "transparent",
                  borderColor: isToday && !isSelected ? theme.primary : "transparent",
                },
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: isSelected ? theme.buttonText : theme.textSecondary,
                  },
                ]}
              >
                {getWeekdays(t)[index]}
              </ThemedText>
              <ThemedText
                style={[
                  Typography.subtitle,
                  {
                    fontWeight: "600",
                    color: isSelected ? theme.buttonText : theme.text,
                  },
                ]}
              >
                {date.getDate()}
              </ThemedText>
              {dayBookings.length > 0 ? (
                <View style={styles.bookingDots}>
                  {dayBookings.slice(0, 3).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { backgroundColor: isSelected ? theme.buttonText : theme.primary },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectedDateHeader}>
        <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
          {selectedDate.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
          {selectedDateBookings.length} {t("admin.bookings").toLowerCase()}
        </ThemedText>
      </View>

      <FlatList
        data={selectedDateBookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.bookingsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <DDIcon name="calendar" size={48} color={theme.textSecondary} />
            <View style={{ height: Spacing.md }} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: "center" }]}>
              {t("admin.noBookingsForDate")}
            </ThemedText>
          </View>
        }
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
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  todayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  weekView: {
    flexDirection: "row",
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: Spacing.md,
    gap: 4,
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  bookingDots: {
    flexDirection: "row",
    marginTop: 4,
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  selectedDateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: Spacing.sm,
  },
  bookingsList: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 120,
  },
  bookingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  bookingTime: {
    width: 50,
    alignItems: "center",
  },
  bookingDivider: {
    width: 3,
    height: "100%",
    borderRadius: 2,
    marginHorizontal: Spacing.md,
  },
  bookingDetails: {
    flex: 1,
  },
  bookingMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
});
