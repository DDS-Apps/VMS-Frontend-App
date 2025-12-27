import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { SearchInput } from "@/components/SearchInput";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { EmployeeParkingAssignment, ParkingBay } from "@/types/vms.types";
import { getUsers, User } from "@/services/mock/userMockData";
import {
  getParkingAssignments,
  getParkingBays,
  getAvailableParkingBays,
  assignParkingBay,
  unassignParkingBay,
} from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

export default function EmployeeParkingAssignmentScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [assignments, setAssignments] = useState<EmployeeParkingAssignment[]>([]);
  const [availableBays, setAvailableBays] = useState<ParkingBay[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedBay, setSelectedBay] = useState<ParkingBay | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    setAssignments(getParkingAssignments().filter((a) => a.status === "active"));
    setAvailableBays(getAvailableParkingBays());
    const allUsers = getUsers().filter((u) => u.role !== "visitor" && u.status === "active");
    setEmployees(allUsers);
  };

  const filteredAssignments = assignments.filter((assignment) =>
    assignment.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.bayNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unassignedEmployees = employees.filter(
    (emp) => !assignments.some((a) => a.employeeId === emp.id && a.status === "active")
  );

  const handleStartAssign = () => {
    setSelectedEmployee(null);
    setSelectedBay(null);
    setShowAssignModal(true);
  };

  const handleAssign = () => {
    if (!selectedEmployee || !selectedBay) return;

    assignParkingBay(
      selectedEmployee.id,
      selectedEmployee.name,
      selectedEmployee.department,
      selectedBay.id
    );

    loadData();
    setShowAssignModal(false);
  };

  const handleUnassign = (assignment: EmployeeParkingAssignment) => {
    unassignParkingBay(assignment.id);
    loadData();
  };

  const getBayTypeColor = (type: string) => {
    switch (type) {
      case "vip":
        return theme.warning;
      case "handicap":
        return theme.info;
      case "electric":
        return theme.success;
      default:
        return theme.primary;
    }
  };

  const renderAssignmentCard = ({ item }: { item: EmployeeParkingAssignment }) => (
    <View style={[styles.assignmentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.assignmentHeader}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.primary + "20" }]}>
          <ThemedText style={[Typography.subtitle, { color: theme.primary, fontWeight: "600" }]}>
            {item.employeeName.split(" ").map((n) => n[0]).join("").substring(0, 2)}
          </ThemedText>
        </View>
        <View style={styles.assignmentInfo}>
          <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
            {item.employeeName}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {item.employeeDepartment}
          </ThemedText>
        </View>
        <Pressable
          style={[styles.unassignButton, { backgroundColor: theme.error + "15" }]}
          onPress={() => handleUnassign(item)}
        >
          <DDIcon name="x" size={16} color={theme.error} />
        </Pressable>
      </View>

      <View style={styles.bayInfo}>
        <View style={[styles.bayBadge, { backgroundColor: theme.info + "15" }]}>
          <DDIcon name="map-pin" size={14} color={theme.info} />
          <ThemedText style={[Typography.body, { color: theme.info, fontWeight: "600", marginStart: 6 }]}>
            {item.bayNumber}
          </ThemedText>
        </View>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
          {item.zone}
        </ThemedText>
      </View>

      <View style={styles.dateInfo}>
        <DDIcon name="calendar" size={14} color={theme.textSecondary} />
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
          {t("admin.effectiveFrom")}: {item.effectiveFrom}
        </ThemedText>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <DDIcon name="truck" size={48} color={theme.textSecondary} />
      <View style={{ height: Spacing.md }} />
      <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: "center" }]}>
        {t("admin.noAssignmentsFound")}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
          {t("admin.employeeParkingAssignment")}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
          {assignments.length} {t("status.assigned").toLowerCase()} | {availableBays.length} {t("status.available").toLowerCase()}
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
        data={filteredAssignments}
        renderItem={renderAssignmentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 80 + Spacing.lg }]}
        onPress={handleStartAssign}
      >
        <DDIcon name="plus" size={24} color={theme.buttonText} />
      </Pressable>

      <Modal
        visible={showAssignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAssignModal(false)} />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          <View style={styles.modalHeader}>
            <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
              {t("admin.assignBay")}
            </ThemedText>
            <Pressable onPress={() => setShowAssignModal(false)}>
              <DDIcon name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
              {t("admin.selectEmployee")}
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionScroll} nestedScrollEnabled={true}>
              {unassignedEmployees.slice(0, 10).map((emp) => (
                <Pressable
                  key={emp.id}
                  style={[
                    styles.selectionCard,
                    {
                      backgroundColor: selectedEmployee?.id === emp.id ? theme.primary + "20" : theme.surface,
                      borderColor: selectedEmployee?.id === emp.id ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedEmployee(emp)}
                >
                  <View style={[styles.selectionAvatar, { backgroundColor: theme.primary + "20" }]}>
                    <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: "600" }]}>
                      {emp.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                    </ThemedText>
                  </View>
                  <ThemedText style={[Typography.caption, { fontWeight: "500", marginTop: 4 }]} numberOfLines={1}>
                    {emp.name.split(" ")[0]}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 10 }]} numberOfLines={1}>
                    {emp.department}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ height: Spacing.lg }} />

            <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
              {t("admin.selectBay")}
            </ThemedText>
            <View style={styles.baysGrid}>
              {availableBays.map((bay) => (
                <Pressable
                  key={bay.id}
                  style={[
                    styles.bayCard,
                    {
                      backgroundColor: selectedBay?.id === bay.id ? theme.primary + "20" : theme.surface,
                      borderColor: selectedBay?.id === bay.id ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedBay(bay)}
                >
                  <View style={[styles.bayType, { backgroundColor: getBayTypeColor(bay.type) + "20" }]}>
                    <DDIcon name="map-pin" size={14} color={getBayTypeColor(bay.type)} />
                  </View>
                  <ThemedText style={[Typography.body, { fontWeight: "600" }]}>{bay.bayNumber}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{bay.zone}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 10 }]}>
                    {bay.floor}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={{ height: Spacing.xl }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <LoadingButton
              onPress={() => setShowAssignModal(false)}
              variant="secondary"
              size="medium"
              fullWidth={false}
              style={{ flex: 1 }}
            >
              {t("common.cancel")}
            </LoadingButton>
            <View style={{ width: Spacing.md }} />
            <LoadingButton
              onPress={handleAssign}
              disabled={!selectedEmployee || !selectedBay}
              variant="primary"
              size="medium"
              fullWidth={false}
              style={{ flex: 1 }}
            >
              {t("admin.assignBay")}
            </LoadingButton>
          </View>
        </View>
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
  assignmentCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  assignmentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginEnd: Spacing.md,
  },
  assignmentInfo: {
    flex: 1,
  },
  unassignButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  bayInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  bayBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    maxHeight: "85%",
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
  selectionScroll: {
    marginHorizontal: -HORIZONTAL_PADDING,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  selectionCard: {
    width: 80,
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginEnd: Spacing.sm,
  },
  selectionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  baysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  bayCard: {
    width: "31%",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  bayType: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
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
