import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  SectionList,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { useNavigation } from "@react-navigation/native";
import { ROUTES } from "@/constants";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyledInput } from "@/components/StyledInput";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DDIcon, IconName } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { RTLHorizontalScrollView } from "@/components/shared";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/contexts/ToastContext";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "@/hooks/queries/useUserQueries";
import type {
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  UserRole as ApiUserRole,
} from "@/types/api.types";
import { UserRole, USER_ROLES } from "@/types/vms.types";
import {
  formatPhoneInput,
  formatPhoneNumber,
  formatPhoneForDisplay,
  normalizePhoneNumber,
} from "@/utils/formatters";
import { applyOpacity } from "@/utils/statusStyles";
import { PhoneInputWithCountry } from "@/components/PhoneInputWithCountry";

type UserSource = "microsoft_ad" | "app_created";

interface DisplayUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  businessPhone?: string;
  landline?: string;
  status: "active" | "inactive";
  createdAt: string;
  source: UserSource;
  autoApproval: boolean;
  managerId?: string;
}

function mapUserDtoToDisplayUser(dto: UserDto): DisplayUser {
  const dtoAny = dto as unknown as Record<string, unknown>;
  const firstName = (dto.firstName || dtoAny["first_name"] || "") as string;
  const lastName = (dto.lastName || dtoAny["last_name"] || "") as string;
  const nameFromDto = (dtoAny["name"] || "") as string;
  const email = dto.email || "";
  const fullName =
    nameFromDto ||
    `${firstName} ${lastName}`.trim() ||
    (email ? email.split("@")[0] : "Unknown User");
  const phoneNumber = (dtoAny["phoneNumber"] || dto.phone || "") as string;
  const businessPhone = (dtoAny["businessPhone"] || "") as string;
  const landline = (dtoAny["landline"] || "") as string;
  const status =
    (dtoAny["status"] as "active" | "inactive") ||
    (dto.isActive ? "active" : "inactive");
  const autoApproval =
    (dtoAny["autoApproval"] as boolean) ?? dto.canBypassApproval ?? false;
  const source =
    (dtoAny["source"] as string) ||
    (dto.azureAdId ? "microsoft_ad" : "app_created");

  return {
    id: dto.id,
    name: fullName,
    email: email,
    role: dto.role.toLowerCase() as UserRole,
    department: dto.department,
    phoneNumber: phoneNumber || undefined,
    businessPhone: businessPhone || undefined,
    landline: landline || undefined,
    status: status,
    createdAt: dto.createdAt,
    source: source === "azure_ad" ? "microsoft_ad" : (source as UserSource),
    autoApproval: autoApproval,
    managerId: dto.managerId,
  };
}

const ALL_ROLES: UserRole[] = USER_ROLES.filter(
  (role) => role !== "visitor" && role !== "buffet_staff",
);

const HIDDEN_ROLES_IN_CREATE: UserRole[] = [
  "valet_driver",
  "visitor",
  "buffet_staff",
];
const DISABLED_ROLES_IN_CREATE: UserRole[] = ["employee", "manager"];
const CREATABLE_ROLES: UserRole[] = ALL_ROLES.filter(
  (role) => !HIDDEN_ROLES_IN_CREATE.includes(role),
);

type SortOption = "createdAt" | "name" | "role" | "department";
type ViewMode = "list" | "grid" | "table";
type GroupMode = "none" | "role";

type RootStackParamList = {
  UsersRoles: undefined;
  UserDetail: { userId: string };
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "UsersRoles"
>;

const HORIZONTAL_PADDING = Spacing.lg;
const ITEMS_PER_PAGE = 20;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function UsersRolesScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useToast();
  const navigation = useNavigation<NavigationProp>();
  const { width: screenWidth } = useWindowDimensions();

  // Responsive columns: 1 on mobile (<768), 2 on tablet (768-1024), 3 on desktop (>1024)
  const numColumns = screenWidth > 1024 ? 3 : screenWidth >= 768 ? 2 : 1;

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<DisplayUser | null>(null);
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("createdAt");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [groupBy, setGroupBy] = useState<GroupMode>("none");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "receptionist" as UserRole,
    department: "",
    phoneNumber: "",
    businessPhone: "",
    businessPhoneExt: "",
    status: "active" as "active" | "inactive",
    autoApproval: false,
    managerId: "" as string | undefined,
  });

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
  }>({});

  const debouncedSearch = useDebounce(searchQuery, 300);

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      role: filterRole !== "all" ? (filterRole as ApiUserRole) : undefined,
      search: debouncedSearch || undefined,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    }),
    [currentPage, filterRole, debouncedSearch],
  );

  const {
    data: usersResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useUsersQuery(queryParams);

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();

  const users: DisplayUser[] = useMemo(() => {
    if (!usersResponse?.data) return [];
    return usersResponse.data.map(mapUserDtoToDisplayUser);
  }, [usersResponse?.data]);

  // Filter managers from existing users list instead of separate API call
  const managers: UserDto[] = useMemo(() => {
    if (!usersResponse?.data) return [];
    return usersResponse.data.filter(
      (user) => user.role.toLowerCase() === "manager",
    );
  }, [usersResponse?.data]);

  const totalPages = useMemo(() => {
    if (!usersResponse || !usersResponse.total) return 1;
    return Math.ceil(usersResponse.total / ITEMS_PER_PAGE) || 1;
  }, [usersResponse]);

  const totalUsers = usersResponse?.total ?? 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole, debouncedSearch]);

  useEffect(() => {
    if (isError && error) {
      showError(
        t("toast.errorTitle"),
        error.message || t("toast.unknownError"),
      );
    }
  }, [isError, error]);

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "receptionist",
      department: "",
      phoneNumber: "",
      businessPhone: "",
      businessPhoneExt: "",
      status: "active",
      autoApproval: false,
      managerId: undefined,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleViewUserDetail = (userId: string) => {
    if (bulkMode) return;
    navigation.navigate(ROUTES.USER_DETAIL as never, { userId } as never);
  };

  const handleEditUser = (user: DisplayUser) => {
    if (bulkMode) return;
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      department: user.department || "",
      phoneNumber: user.phoneNumber || "",
      businessPhone: parseBusinessPhoneBase(user.businessPhone || ""),
      businessPhoneExt: parseBusinessPhoneExt(user.businessPhone || ""),
      status: user.status,
      autoApproval: user.autoApproval,
      managerId: user.managerId,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validatePhone = (phone: string): boolean => {
    const digitsOnly = normalizePhoneNumber(phone);
    // Valid international phone: 7-15 digits (E.164 standard)
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  };

  const handlePhoneChange = (text: string) => {
    setFormData({ ...formData, phoneNumber: text });
    if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
  };

  const handleBusinessPhoneChange = (text: string) => {
    setFormData({ ...formData, businessPhone: text });
  };

  const handleBusinessPhoneExtChange = (text: string) => {
    // Only allow digits for extension
    const digitsOnly = text.replace(/\D/g, "");
    setFormData({ ...formData, businessPhoneExt: digitsOnly });
  };

  // Parse business phone to extract base number (before ext.)
  const parseBusinessPhoneBase = (phone: string): string => {
    if (!phone) return "";
    // Match patterns like "ext.", "ext", "x", "Ext."
    const extMatch = phone.match(/(.+?)\s*(?:ext\.?|x)\s*\d+$/i);
    return extMatch ? extMatch[1].trim() : phone;
  };

  // Parse business phone to extract extension
  const parseBusinessPhoneExt = (phone: string): string => {
    if (!phone) return "";
    const extMatch = phone.match(/(?:ext\.?|x)\s*(\d+)$/i);
    return extMatch ? extMatch[1] : "";
  };

  // Format business phone with extension for API
  const formatBusinessPhoneForApi = (phone: string, ext: string): string => {
    if (!phone) return "";
    const formatted = formatPhoneNumber(phone);
    if (ext) {
      return `${formatted} ext. ${ext}`;
    }
    return formatted;
  };

  const handleSaveUser = async () => {
    const errors: typeof formErrors = {};

    if (!formData.name.trim()) {
      errors.name = t("form.fieldRequired");
    }
    if (!formData.email.trim()) {
      errors.email = t("form.fieldRequired");
    }
    if (!editingUser && !formData.password) {
      errors.password = t("form.passwordRequired");
    }
    if (!formData.phoneNumber) {
      errors.phone = t("errors.phoneRequired");
    } else if (!validatePhone(formData.phoneNumber)) {
      errors.phone = t("errors.invalidPhone");
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    try {
      if (editingUser) {
        const updateData: UpdateUserDto = {
          name: formData.name,
          role: formData.role,
          department: formData.department || undefined,
          phoneNumber: formData.phoneNumber
            ? formatPhoneNumber(formData.phoneNumber)
            : undefined,
          businessPhone: formData.businessPhone
            ? formatBusinessPhoneForApi(
                formData.businessPhone,
                formData.businessPhoneExt,
              )
            : undefined,
          status: formData.status,
          autoApproval: formData.autoApproval,
          managerId: formData.managerId || undefined,
        };
        await updateMutation.mutateAsync({
          id: editingUser.id,
          data: updateData,
        });
        showSuccess(t("toast.successTitle"), t("toast.userUpdated"));
      } else {
        const createData: CreateUserDto = {
          email: formData.email,
          name: formData.name,
          password: formData.password || undefined,
          role: formData.role,
          department: formData.department || undefined,
          phoneNumber: formData.phoneNumber
            ? formatPhoneNumber(formData.phoneNumber)
            : undefined,
          businessPhone: formData.businessPhone
            ? formatBusinessPhoneForApi(
                formData.businessPhone,
                formData.businessPhoneExt,
              )
            : undefined,
          status: formData.status,
          autoApproval: formData.autoApproval,
          managerId: formData.managerId || undefined,
        };
        await createMutation.mutateAsync(createData);
        showSuccess(t("toast.successTitle"), t("toast.userCreated"));
      }
      setShowModal(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("toast.unknownError");
      showError(t("toast.errorTitle"), errorMessage);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (bulkMode) return;
    setUserToDelete(userId);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    await deleteMutation.mutateAsync(userToDelete);
  };

  const handleDeleteSuccess = () => {
    setDeleteModalVisible(false);
    setUserToDelete(null);
    showSuccess(t("toast.successTitle"), t("toast.userDeleted"));
    refetch();
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setUserToDelete(null);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredAndSortedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredAndSortedUsers.map((u) => u.id)));
    }
  };

  const toggleSelectGroup = (groupUsers: DisplayUser[]) => {
    const groupIds = groupUsers.map((u) => u.id);
    const allSelected = groupIds.every((id) => selectedUserIds.has(id));

    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => newSet.delete(id));
      } else {
        groupIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  const handleBulkAutoApprove = async (enable: boolean) => {
    try {
      const updatePromises = Array.from(selectedUserIds).map((userId) =>
        updateMutation.mutateAsync({
          id: userId,
          data: { autoApproval: enable },
        }),
      );
      await Promise.all(updatePromises);
      showSuccess(t("toast.successTitle"), t("toast.bulkUpdateSuccess"));
      setSelectedUserIds(new Set());
      setBulkMode(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("toast.unknownError");
      showError(t("toast.errorTitle"), errorMessage);
    }
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedUserIds(new Set());
  };

  const getRoleLabel = (role: UserRole) => {
    const roleLabels: Record<UserRole, string> = {
      employee: t("roles.employee"),
      manager: t("roles.manager"),
      receptionist: t("roles.receptionist"),
      security: t("roles.security"),
      building_admin: t("roles.buildingAdmin"),
      buffet_admin: t("roles.buffetAdmin"),
      buffet_staff: t("roles.buffetStaff"),
      valet_admin: t("roles.valetAdmin"),
      valet_driver: t("roles.valetDriver"),
      visitor: t("roles.visitor"),
    };
    return roleLabels[role] || role;
  };

  const getSortLabel = (sort: SortOption) => {
    const labels: Record<SortOption, string> = {
      createdAt: t("common.newest"),
      name: t("form.fullName"),
      role: t("common.userSource"),
      department: t("form.company"),
    };
    return labels[sort];
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    if (sortBy !== "createdAt") {
      result = result.sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "role":
            return a.role.localeCompare(b.role);
          case "department":
            return (a.department || "").localeCompare(b.department || "");
          default:
            return 0;
        }
      });
    }

    return result;
  }, [users, sortBy]);

  const groupedUsers = useMemo(() => {
    if (groupBy === "none") return null;

    const groups: { [key: string]: DisplayUser[] } = {};
    filteredAndSortedUsers.forEach((user) => {
      const key = user.role;
      if (!groups[key]) groups[key] = [];
      groups[key].push(user);
    });

    return Object.entries(groups).map(([role, data]) => ({
      title: getRoleLabel(role as UserRole),
      role: role as UserRole,
      data,
    }));
  }, [filteredAndSortedUsers, groupBy]);

  const renderCheckbox = (userId: string) => {
    const isSelected = selectedUserIds.has(userId);
    return (
      <Pressable
        style={[
          styles.checkbox,
          {
            borderColor: isSelected ? theme.primary : theme.border,
            backgroundColor: isSelected ? theme.primary : "transparent",
          },
        ]}
        onPress={() => toggleUserSelection(userId)}
      >
        {isSelected ? (
          <DDIcon name="check" size={14} color={theme.buttonText} />
        ) : null}
      </Pressable>
    );
  };

  const getRoleAccentColor = (role: UserRole): string => {
    switch (role.toLowerCase()) {
      case "admin":
      case "building_admin":
        return theme.error;
      case "manager":
        return theme.warning;
      case "employee":
        return theme.primary;
      case "security":
        return theme.info;
      case "receptionist":
        return theme.secondary;
      case "buffet_admin":
        return theme.warning;
      case "valet_admin":
      case "valet_driver":
        return theme.info;
      default:
        return theme.primary;
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const renderUserCard = ({ item }: { item: DisplayUser }) => {
    const isSelected = selectedUserIds.has(item.id);
    const roleColor = getRoleAccentColor(item.role);
    const accentColor =
      item.status === "active" ? theme.success : theme.textSecondary;
    const initials = getInitials(item.name);

    return (
      <Pressable
        onPress={() =>
          bulkMode
            ? toggleUserSelection(item.id)
            : handleViewUserDetail(item.id)
        }
        style={({ pressed }) => [
          styles.userCardContainer,
          {
            backgroundColor: theme.surface,
            opacity: pressed ? 0.9 : 1,
            borderWidth: isSelected && bulkMode ? 2 : 0,
            borderColor: isSelected && bulkMode ? theme.primary : "transparent",
          },
        ]}
      >
        <View
          style={[styles.userCardInner, { backgroundColor: theme.surface }]}
        >
          <View
            style={[styles.cardAccentLine, { backgroundColor: accentColor }]}
          />

          {bulkMode && (
            <View style={styles.cardCheckboxContainer}>
              {renderCheckbox(item.id)}
            </View>
          )}

          <View style={styles.cardMainContent}>
            <DirectionalRow style={styles.cardHeader} gap={Spacing.md}>
              <View
                style={[
                  styles.cardAvatar,
                  { backgroundColor: applyOpacity(roleColor, "15") },
                ]}
              >
                <ThemedText
                  style={[styles.cardAvatarText, { color: roleColor }]}
                >
                  {initials}
                </ThemedText>
              </View>
              <View style={styles.cardNameSection}>
                <DirectionalRow style={styles.cardNameRow} gap={Spacing.sm}>
                  <ThemedText
                    style={[
                      styles.cardUserName,
                      { color: theme.text, flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </ThemedText>
                  <View
                    style={[
                      styles.cardRoleBadge,
                      {
                        backgroundColor: applyOpacity(roleColor, "15"),
                        borderColor: applyOpacity(roleColor, "30"),
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.cardBadgeText, { color: roleColor }]}
                    >
                      {getRoleLabel(item.role)}
                    </ThemedText>
                  </View>
                </DirectionalRow>
                <ThemedText
                  style={[styles.cardEmail, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.email}
                </ThemedText>
              </View>
            </DirectionalRow>

            <Spacer height={Spacing.sm} />

            {item.department && (
              <DirectionalRow style={styles.cardInfoRow} gap={Spacing.sm}>
                <DDIcon name="briefcase" variant="muted" size={13} />
                <ThemedText
                  style={[styles.cardInfoText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.department}
                </ThemedText>
              </DirectionalRow>
            )}

            {(item.phoneNumber || item.businessPhone) && (
              <>
                <Spacer height={Spacing.xs} />
                <DirectionalRow style={styles.cardInfoRow} gap={Spacing.sm}>
                  <DDIcon name="phone" variant="muted" size={13} />
                  <ThemedText
                    style={[
                      styles.cardInfoText,
                      { color: theme.textSecondary, writingDirection: 'ltr' },
                    ]}
                    numberOfLines={2}
                  >
                    {[
                      item.phoneNumber
                        ? formatPhoneNumber(item.phoneNumber)
                        : null,
                      item.businessPhone
                        ? formatPhoneForDisplay(item.businessPhone)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </ThemedText>
                </DirectionalRow>
              </>
            )}

            <Spacer height={Spacing.sm} />

            <DirectionalRow style={styles.cardFooter}>
              <DirectionalRow style={styles.cardBadgesRow} gap={Spacing.xs}>
                {item.autoApproval && (
                  <DirectionalRow
                    style={[
                      styles.cardAutoApprovalBadge,
                      { backgroundColor: applyOpacity(theme.success, "15") },
                    ]}
                    gap={Spacing.xs}
                  >
                    <DDIcon
                      name="check-circle"
                      size={10}
                      color={theme.success}
                    />
                    <ThemedText
                      style={[
                        styles.cardBadgeText,
                        { color: theme.success },
                      ]}
                    >
                      {t("common.auto")}
                    </ThemedText>
                  </DirectionalRow>
                )}
              </DirectionalRow>

              {!bulkMode && (
                <DirectionalRow style={styles.cardActions} gap={Spacing.sm}>
                  <Pressable
                    style={[
                      styles.cardActionButton,
                      { backgroundColor: applyOpacity(theme.primary, "15") },
                    ]}
                    onPress={() => handleEditUser(item)}
                  >
                    <DDIcon name="edit-2" size={14} variant="primary" />
                  </Pressable>
                  {item.source !== "microsoft_ad" && (
                    <Pressable
                      style={[
                        styles.cardActionButton,
                        { backgroundColor: applyOpacity(theme.error, "15") },
                      ]}
                      onPress={() => handleDeleteUser(item.id)}
                    >
                      <DDIcon name="trash-2" size={14} variant="danger" />
                    </Pressable>
                  )}
                </DirectionalRow>
              )}
            </DirectionalRow>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderTableRow = ({
    item,
    index,
  }: {
    item: DisplayUser;
    index: number;
  }) => {
    const isSelected = selectedUserIds.has(item.id);
    const isEven = index % 2 === 0;

    return (
      <Pressable
        onPress={() =>
          bulkMode
            ? toggleUserSelection(item.id)
            : handleViewUserDetail(item.id)
        }
        style={[
          styles.tableRow,
          {
            backgroundColor: isEven
              ? theme.backgroundSecondary
              : theme.background,
            borderColor: isSelected && bulkMode ? theme.primary : "transparent",
            borderWidth: isSelected && bulkMode ? 2 : 0,
          },
        ]}
      >
        {bulkMode ? (
          <View style={[styles.tableCell, { width: 50 }]}>
            {renderCheckbox(item.id)}
          </View>
        ) : null}
        <View style={[styles.tableCell, { flex: 3 }]}>
          <ThemedText
            style={[Typography.bodySmall, { fontWeight: "600" }]}
            numberOfLines={1}
          >
            {item.name}
          </ThemedText>
          <ThemedText
            style={[Typography.caption, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {item.email}
          </ThemedText>
        </View>
        <View style={[styles.tableCell, { flex: 1.5 }]}>
          <View
            style={[
              styles.cardRoleBadge,
              { backgroundColor: applyOpacity(theme.primary, "20") },
            ]}
          >
            <ThemedText
              style={[styles.cardBadgeText, { color: theme.primary }]}
              numberOfLines={1}
            >
              {getRoleLabel(item.role)}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.tableCell, { flex: 2 }]}>
          <ThemedText
            style={[Typography.caption, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {item.department || "-"}
          </ThemedText>
        </View>
        <View style={[styles.tableCell, { flex: 1, alignItems: "center" }]}>
          {item.autoApproval ? (
            <DDIcon name="check-circle" size={18} color={theme.success} />
          ) : (
            <DDIcon name="x-circle" size={18} variant="muted" />
          )}
        </View>
        {!bulkMode ? (
          <DirectionalRow
            style={[
              styles.tableCell,
              { flex: 1.5, justifyContent: "center", gap: Spacing.xs },
            ]}
          >
            <Pressable
              style={[
                styles.tableActionButton,
                { backgroundColor: theme.primary + "15" },
              ]}
              onPress={() => handleEditUser(item)}
            >
              <DDIcon name="edit-2" size={14} variant="primary" />
            </Pressable>
            {item.source !== "microsoft_ad" && (
              <Pressable
                style={[
                  styles.tableActionButton,
                  { backgroundColor: theme.error + "15" },
                ]}
                onPress={() => handleDeleteUser(item.id)}
              >
                <DDIcon name="trash-2" size={14} variant="danger" />
              </Pressable>
            )}
          </DirectionalRow>
        ) : null}
      </Pressable>
    );
  };

  const renderTableHeader = () => (
    <DirectionalRow
      style={[
        styles.tableHeaderRow,
        { backgroundColor: theme.surface, borderBottomColor: theme.border },
      ]}
    >
      {bulkMode ? (
        <View style={[styles.tableHeaderCell, { width: 50 }]}>
          <Pressable
            style={[
              styles.checkbox,
              {
                borderColor:
                  selectedUserIds.size === filteredAndSortedUsers.length &&
                  filteredAndSortedUsers.length > 0
                    ? theme.primary
                    : theme.border,
                backgroundColor:
                  selectedUserIds.size === filteredAndSortedUsers.length &&
                  filteredAndSortedUsers.length > 0
                    ? theme.primary
                    : "transparent",
              },
            ]}
            onPress={toggleSelectAll}
          >
            {selectedUserIds.size === filteredAndSortedUsers.length &&
            filteredAndSortedUsers.length > 0 ? (
              <DDIcon name="check" size={14} color={theme.buttonText} />
            ) : null}
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.tableHeaderCell, { flex: 3 }]}>
        <ThemedText
          style={[
            Typography.caption,
            { fontWeight: "600", color: theme.textSecondary },
          ]}
        >
          {t("form.fullName").toUpperCase()}
        </ThemedText>
      </View>
      <View style={[styles.tableHeaderCell, { flex: 1.5 }]}>
        <ThemedText
          style={[
            Typography.caption,
            { fontWeight: "600", color: theme.textSecondary },
          ]}
        >
          {t("common.role").toUpperCase()}
        </ThemedText>
      </View>
      <View style={[styles.tableHeaderCell, { flex: 2 }]}>
        <ThemedText
          style={[
            Typography.caption,
            { fontWeight: "600", color: theme.textSecondary },
          ]}
        >
          {t("form.company").toUpperCase()}
        </ThemedText>
      </View>
      <View style={[styles.tableHeaderCell, { flex: 1, alignItems: "center" }]}>
        <ThemedText
          style={[
            Typography.caption,
            { fontWeight: "600", color: theme.textSecondary },
          ]}
        >
          {t("common.auto").toUpperCase()}
        </ThemedText>
      </View>
      {!bulkMode ? (
        <View
          style={[styles.tableHeaderCell, { flex: 1.5, alignItems: "center" }]}
        >
          <ThemedText
            style={[
              Typography.caption,
              { fontWeight: "600", color: theme.textSecondary },
            ]}
          >
            {t("common.actions").toUpperCase()}
          </ThemedText>
        </View>
      ) : null}
    </DirectionalRow>
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string; role: UserRole; data: DisplayUser[] };
  }) => {
    const allSelected = section.data.every((u) => selectedUserIds.has(u.id));
    const someSelected = section.data.some((u) => selectedUserIds.has(u.id));

    return (
      <DirectionalRow
        style={[styles.sectionHeader, { backgroundColor: theme.background }]}
      >
        {bulkMode ? (
          <Pressable
            style={[
              styles.checkbox,
              {
                borderColor: allSelected ? theme.primary : theme.border,
                backgroundColor: allSelected ? theme.primary : "transparent",
                marginEnd: Spacing.sm,
              },
            ]}
            onPress={() => toggleSelectGroup(section.data)}
          >
            {allSelected ? (
              <DDIcon name="check" size={14} color={theme.buttonText} />
            ) : someSelected ? (
              <DDIcon name="minus" size={14} color={theme.primary} />
            ) : null}
          </Pressable>
        ) : null}
        <View
          style={[styles.sectionHeaderDot, { backgroundColor: theme.primary }]}
        />
        <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
          {section.title}
        </ThemedText>
        <View
          style={[
            styles.sectionCount,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <ThemedText
            style={[
              Typography.caption,
              { color: theme.primary, fontWeight: "600" },
            ]}
          >
            {section.data.length}
          </ThemedText>
        </View>
      </DirectionalRow>
    );
  };

  const renderBulkActionBar = () => {
    if (!bulkMode) return null;

    return (
      <DirectionalRow
        style={[
          styles.bulkActionBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        <DirectionalRow style={styles.bulkActionInfo}>
          <Pressable
            style={[
              styles.checkbox,
              {
                borderColor:
                  selectedUserIds.size === filteredAndSortedUsers.length &&
                  filteredAndSortedUsers.length > 0
                    ? theme.primary
                    : theme.border,
                backgroundColor:
                  selectedUserIds.size === filteredAndSortedUsers.length &&
                  filteredAndSortedUsers.length > 0
                    ? theme.primary
                    : "transparent",
              },
            ]}
            onPress={toggleSelectAll}
          >
            {selectedUserIds.size === filteredAndSortedUsers.length &&
            filteredAndSortedUsers.length > 0 ? (
              <DDIcon name="check" size={14} color={theme.buttonText} />
            ) : selectedUserIds.size > 0 ? (
              <DDIcon name="minus" size={14} color={theme.primary} />
            ) : null}
          </Pressable>
          <ThemedText
            style={[
              Typography.bodySmall,
              { color: theme.text, marginStart: Spacing.sm },
            ]}
          >
            {selectedUserIds.size} {t("common.selected")}
          </ThemedText>
        </DirectionalRow>

        <DirectionalRow style={styles.bulkActions}>
          <Pressable
            style={[
              styles.bulkActionButton,
              {
                backgroundColor: theme.success + "20",
                opacity: selectedUserIds.size === 0 ? 0.5 : 1,
                flexDirection: getFlexDirection(isRTL),
              },
            ]}
            onPress={() => handleBulkAutoApprove(true)}
            disabled={selectedUserIds.size === 0}
          >
            <DDIcon name="check-circle" size={16} color={theme.success} />
            <ThemedText
              style={[
                Typography.caption,
                {
                  color: theme.success,
                  marginStart: Spacing.xs,
                  fontWeight: "600",
                },
              ]}
            >
              {t("common.enableAuto")}
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.bulkActionButton,
              {
                backgroundColor: theme.error + "20",
                opacity: selectedUserIds.size === 0 ? 0.5 : 1,
                flexDirection: getFlexDirection(isRTL),
              },
            ]}
            onPress={() => handleBulkAutoApprove(false)}
            disabled={selectedUserIds.size === 0}
          >
            <DDIcon name="x-circle" size={16} color={theme.error} />
            <ThemedText
              style={[
                Typography.caption,
                {
                  color: theme.error,
                  marginStart: Spacing.xs,
                  fontWeight: "600",
                },
              ]}
            >
              {t("common.disableAuto")}
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.bulkActionButton, { backgroundColor: theme.border }]}
            onPress={clearSelection}
          >
            <DDIcon name="x" size={16} variant="muted" />
          </Pressable>
        </DirectionalRow>
      </DirectionalRow>
    );
  };

  const renderSortMenu = () => (
    <Modal
      visible={showSortMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortMenu(false)}
    >
      <Pressable
        style={styles.sortMenuBackdrop}
        onPress={() => setShowSortMenu(false)}
      >
        <View
          style={[
            styles.sortMenuContent,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {(["name", "role", "department"] as SortOption[]).map((option) => (
            <Pressable
              key={option}
              style={[
                styles.sortMenuItem,
                {
                  backgroundColor:
                    sortBy === option ? theme.primary + "10" : "transparent",
                  flexDirection: getFlexDirection(isRTL),
                },
              ]}
              onPress={() => {
                setSortBy(option);
                setShowSortMenu(false);
              }}
            >
              <ThemedText
                style={[
                  Typography.body,
                  { color: sortBy === option ? theme.primary : theme.text },
                ]}
              >
                {getSortLabel(option)}
              </ThemedText>
              {sortBy === option ? (
                <DDIcon name="check" size={16} variant="primary" />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <DirectionalRow
        style={[
          styles.paginationContainer,
          { backgroundColor: theme.surface, borderTopColor: theme.border },
        ]}
      >
        <Pressable
          style={[
            styles.paginationButton,
            { opacity: currentPage === 1 ? 0.5 : 1 },
          ]}
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <DDIcon
            name="chevron-left"
            size={20}
            variant={currentPage === 1 ? "muted" : "primary"}
          />
        </Pressable>

        <ThemedText
          style={[Typography.bodySmall, { color: theme.textSecondary }]}
        >
          {t("common.page")} {currentPage} / {totalPages}
        </ThemedText>

        <Pressable
          style={[
            styles.paginationButton,
            { opacity: currentPage === totalPages ? 0.5 : 1 },
          ]}
          onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          <DDIcon
            name="chevron-right"
            size={20}
            variant={currentPage === totalPages ? "muted" : "primary"}
          />
        </Pressable>
      </DirectionalRow>
    );
  };

  const renderListHeader = () => (
    <>
      <DirectionalRow style={styles.header}>
        <View>
          <ThemedText style={[Typography.title, { fontWeight: "700" }]}>
            {t("navigation.manageUsers")}
          </ThemedText>
          <ThemedText
            style={[
              Typography.bodySmall,
              { color: theme.textSecondary, marginTop: Spacing.xs },
            ]}
          >
            {totalUsers} {t("roles.employee").toLowerCase()}
          </ThemedText>
        </View>
        <View style={[styles.viewToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            style={[
              styles.viewToggleButton,
              {
                borderTopLeftRadius: BorderRadius.sm,
                borderBottomLeftRadius: BorderRadius.sm,
                borderRightWidth: 0,
                backgroundColor:
                  viewMode === "list" ? theme.primary : theme.surface,
                borderColor: viewMode === "list" ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setViewMode("list")}
          >
            <DDIcon
              name="list"
              size={16}
              color={
                viewMode === "list" ? theme.buttonText : theme.textSecondary
              }
            />
          </Pressable>
          <Pressable
            style={[
              styles.viewToggleButton,
              {
                borderRightWidth: 0,
                backgroundColor:
                  viewMode === "table" ? theme.primary : theme.surface,
                borderColor: viewMode === "table" ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setViewMode("table")}
          >
            <DDIcon
              name="menu"
              size={16}
              color={
                viewMode === "table" ? theme.buttonText : theme.textSecondary
              }
            />
          </Pressable>
          <Pressable
            style={[
              styles.viewToggleButton,
              {
                borderTopRightRadius: BorderRadius.sm,
                borderBottomRightRadius: BorderRadius.sm,
                backgroundColor:
                  viewMode === "grid" ? theme.primary : theme.surface,
                borderColor: viewMode === "grid" ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setViewMode("grid")}
          >
            <DDIcon
              name="grid"
              size={16}
              color={
                viewMode === "grid" ? theme.buttonText : theme.textSecondary
              }
            />
          </Pressable>
        </View>
      </DirectionalRow>

      <View style={styles.searchContainer}>
        <StyledInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("common.searchPlaceholder")}
          leftIcon="search"
          containerStyle={{ marginHorizontal: HORIZONTAL_PADDING }}
        />
      </View>

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        style={[styles.filterContainer, { borderBottomColor: theme.border }]}
        contentContainerStyle={styles.filterContent}
        nestedScrollEnabled={true}
      >
        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor:
                filterRole === "all" ? theme.primary : theme.surface,
              borderColor: filterRole === "all" ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setFilterRole("all")}
        >
          <ThemedText
            style={[
              Typography.bodySmall,
              {
                color: filterRole === "all" ? theme.buttonText : theme.text,
                fontWeight: filterRole === "all" ? "600" : "400",
              },
            ]}
          >
            {t("common.all")}
          </ThemedText>
        </Pressable>
        {ALL_ROLES.map((role) => (
          <Pressable
            key={role}
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  filterRole === role ? theme.primary : theme.surface,
                borderColor: filterRole === role ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setFilterRole(role)}
          >
            <ThemedText
              style={[
                Typography.bodySmall,
                {
                  color: filterRole === role ? theme.buttonText : theme.text,
                  fontWeight: filterRole === role ? "600" : "400",
                },
              ]}
            >
              {getRoleLabel(role)}
            </ThemedText>
          </Pressable>
        ))}
      </RTLHorizontalScrollView>

      <RTLHorizontalScrollView
        showsHorizontalScrollIndicator={false}
        style={[styles.toolbar, { borderBottomColor: theme.border }]}
        contentContainerStyle={styles.toolbarContent}
        nestedScrollEnabled={true}
      >
        <Pressable
          style={[
            styles.sortButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              flexDirection: getFlexDirection(isRTL),
            },
          ]}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <DDIcon name="sliders" size={16} variant="muted" />
          <ThemedText
            style={[
              Typography.bodySmall,
              { color: theme.text, marginHorizontal: Spacing.xs },
            ]}
          >
            {getSortLabel(sortBy)}
          </ThemedText>
          <DDIcon name="chevron-down" size={14} variant="muted" />
        </Pressable>

        <Pressable
          style={[
            styles.groupButton,
            {
              backgroundColor:
                groupBy === "role" ? theme.primary : theme.surface,
              borderColor: groupBy === "role" ? theme.primary : theme.border,
              flexDirection: getFlexDirection(isRTL),
            },
          ]}
          onPress={() => setGroupBy(groupBy === "none" ? "role" : "none")}
        >
          <DDIcon
            name="layers"
            size={16}
            color={groupBy === "role" ? theme.buttonText : theme.textSecondary}
          />
          <ThemedText
            style={[
              Typography.bodySmall,
              {
                color: groupBy === "role" ? theme.buttonText : theme.text,
                marginStart: Spacing.xs,
              },
            ]}
          >
            {t("common.group")}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.bulkButton,
            {
              backgroundColor: bulkMode ? theme.warning : theme.surface,
              borderColor: bulkMode ? theme.warning : theme.border,
            },
          ]}
          onPress={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
        >
          <DDIcon
            name="check-square"
            size={16}
            color={bulkMode ? theme.buttonText : theme.textSecondary}
          />
        </Pressable>
      </RTLHorizontalScrollView>

      {isFetching && !isLoading ? (
        <View style={styles.fetchingIndicator}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : null}
    </>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <DDIcon name="users" variant="muted" size={48} />
      <Spacer height={Spacing.md} />
      <ThemedText
        style={[
          Typography.body,
          { color: theme.textSecondary, textAlign: "center" },
        ]}
      >
        {t("common.noResults")}
      </ThemedText>
    </View>
  );

  const renderLoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Spacer height={Spacing.md} />
      <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
        {t("common.loading")}
      </ThemedText>
    </View>
  );

  const renderContent = () => {
    if (isLoading || isFetching) {
      return renderLoadingComponent();
    }

    const listFooter = (
      <View
        style={{
          paddingBottom: insets.bottom + (bulkMode ? 120 : 100) + Spacing.xl,
        }}
      >
        {renderPagination()}
      </View>
    );

    if (viewMode === "table") {
      const tableListHeader = () => (
        <View style={{ width: "100%" }}>{renderTableHeader()}</View>
      );

      const tableListItem = ({
        item,
        index,
      }: {
        item: DisplayUser;
        index: number;
      }) => (
        <View style={{ width: "100%" }}>{renderTableRow({ item, index })}</View>
      );

      const renderTableSectionHeader = ({
        section,
      }: {
        section: { title: string; data: DisplayUser[] };
      }) => {
        const allSelected = section.data.every((user) =>
          selectedUserIds.has(user.id),
        );
        const someSelected = section.data.some((user) =>
          selectedUserIds.has(user.id),
        );

        return (
          <DirectionalRow
            style={[
              styles.tableSectionHeader,
              { backgroundColor: theme.background, width: "100%" },
            ]}
          >
            {bulkMode ? (
              <Pressable
                style={[
                  styles.checkbox,
                  {
                    borderColor: allSelected ? theme.primary : theme.border,
                    backgroundColor: allSelected
                      ? theme.primary
                      : "transparent",
                    marginEnd: Spacing.sm,
                  },
                ]}
                onPress={() => toggleSelectGroup(section.data)}
              >
                {allSelected ? (
                  <DDIcon name="check" size={14} color={theme.buttonText} />
                ) : someSelected ? (
                  <DDIcon name="minus" size={14} color={theme.primary} />
                ) : null}
              </Pressable>
            ) : null}
            <View
              style={[
                styles.sectionHeaderDot,
                { backgroundColor: theme.primary },
              ]}
            />
            <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
              {section.title}
            </ThemedText>
            <View
              style={[
                styles.sectionCount,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.primary, fontWeight: "600" },
                ]}
              >
                {section.data.length}
              </ThemedText>
            </View>
          </DirectionalRow>
        );
      };

      if (groupBy === "role" && groupedUsers && groupedUsers.length > 0) {
        return (
          <SectionList
            sections={groupedUsers}
            renderItem={tableListItem}
            renderSectionHeader={renderTableSectionHeader}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={tableListHeader}
            ListFooterComponent={listFooter}
            ListEmptyComponent={renderEmptyComponent}
            stickySectionHeadersEnabled={false}
            style={{ flex: 1, width: "100%" }}
            nestedScrollEnabled={true}
          />
        );
      }

      return (
        <FlatList
          data={filteredAndSortedUsers}
          renderItem={tableListItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={tableListHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={renderEmptyComponent}
          style={{ flex: 1, width: "100%" }}
          nestedScrollEnabled={true}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      );
    }

    if (groupBy === "role" && groupedUsers && groupedUsers.length > 0) {
      return (
        <SectionList
          sections={groupedUsers}
          renderItem={renderUserCard}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          ListFooterComponent={listFooter}
          ListEmptyComponent={renderEmptyComponent}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContainer}
          style={{ flex: 1, backgroundColor: theme.background }}
        />
      );
    }

    if (viewMode === "grid") {
      const getItemStyle = () => {
        if (numColumns === 1)
          return {
            width: "100%" as const,
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingBottom: Spacing.md,
          };
        // Use percentage-based widths with flexGrow: 0 to prevent stretching
        const widthPercent =
          numColumns === 3
            ? ("33.33%" as const)
            : numColumns === 2
              ? ("50%" as const)
              : ("100%" as const);
        return {
          width: widthPercent,
          flexGrow: 0,
          paddingBottom: Spacing.md,
          paddingEnd: Spacing.sm,
        };
      };

      return (
        <FlatList
          key={`flatlist-${numColumns}`}
          data={filteredAndSortedUsers}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={[
            styles.gridContainer,
            { paddingHorizontal: HORIZONTAL_PADDING },
          ]}
          renderItem={({ item }) => (
            <View style={getItemStyle()}>{renderUserCard({ item })}</View>
          )}
          ListFooterComponent={listFooter}
          ListEmptyComponent={renderEmptyComponent}
          style={{ flex: 1, backgroundColor: theme.background }}
        />
      );
    }

    return (
      <FlatList
        data={filteredAndSortedUsers}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id}
        ListFooterComponent={listFooter}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContainer}
        style={{ flex: 1, backgroundColor: theme.background }}
      />
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {renderListHeader()}
      {renderContent()}

      {!bulkMode ? (
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              bottom: insets.bottom + 80 + Spacing.lg,
            },
          ]}
          onPress={handleAddUser}
        >
          <DDIcon name="user-plus" size={24} color={theme.buttonText} />
        </Pressable>
      ) : null}

      {renderBulkActionBar()}
      {renderSortMenu()}

      {/* Helper: SSO users can only edit Auto Approval */}
      {(() => {
        const isSsoUser = editingUser?.source === "microsoft_ad";
        return (
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
              <Pressable
                style={styles.modalBackdrop}
                onPress={() => setShowModal(false)}
              />
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: theme.background,
                    paddingBottom: insets.bottom + Spacing.xl,
                  },
                ]}
              >
                <DirectionalRow style={styles.modalHeader}>
                  <ThemedText
                    style={[Typography.subtitle, { fontWeight: "600" }]}
                  >
                    {editingUser
                      ? isSsoUser
                        ? t("common.editAutoApproval")
                        : t("common.edit")
                      : t("common.addUser")}
                  </ThemedText>
                  <Pressable onPress={() => setShowModal(false)}>
                    <DDIcon name="x" size={24} variant="muted" />
                  </Pressable>
                </DirectionalRow>

                <ScrollView
                  contentContainerStyle={styles.formContainer}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <StyledInput
                    label={`${t("form.fullName")} *`}
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      if (formErrors.name)
                        setFormErrors({ ...formErrors, name: undefined });
                    }}
                    placeholder={t("form.enterFullName")}
                    error={formErrors.name}
                    returnKeyType="next"
                    editable={!isSsoUser}
                  />

                  <Spacer height={Spacing.md} />

                  <StyledInput
                    label={`${t("auth.email")} *`}
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email: text });
                      if (formErrors.email)
                        setFormErrors({ ...formErrors, email: undefined });
                    }}
                    placeholder={t("auth.emailPlaceholder")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!editingUser}
                    error={formErrors.email}
                    returnKeyType="next"
                  />

                  {!editingUser ? (
                    <>
                      <Spacer height={Spacing.md} />
                      <StyledInput
                        label={`${t("auth.password")} *`}
                        value={formData.password}
                        onChangeText={(text) => {
                          setFormData({ ...formData, password: text });
                          if (formErrors.password)
                            setFormErrors({
                              ...formErrors,
                              password: undefined,
                            });
                        }}
                        placeholder={t("auth.passwordPlaceholder")}
                        secureTextEntry={true}
                        autoCapitalize="none"
                        error={formErrors.password}
                        returnKeyType="next"
                      />
                    </>
                  ) : null}

                  <Spacer height={Spacing.md} />

                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.textSecondary, marginBottom: Spacing.xs },
                    ]}
                  >
                    {t("common.selectRole").toUpperCase()} *
                  </ThemedText>
                  <View
                    style={{
                      marginBottom: Spacing.md,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: Spacing.sm,
                      direction: isRTL ? 'rtl' : 'ltr',
                    }}
                  >
                    {CREATABLE_ROLES.map((role) => {
                      const isDisabled =
                        DISABLED_ROLES_IN_CREATE.includes(role);
                      const isSelected = formData.role === role;
                      return (
                        <Pressable
                          key={role}
                          style={[
                            styles.roleOption,
                            {
                              backgroundColor: isDisabled
                                ? theme.surfaceSecondary
                                : isSelected
                                  ? theme.primary
                                  : theme.surface,
                              borderColor: isDisabled
                                ? theme.border
                                : isSelected
                                  ? theme.primary
                                  : theme.border,
                              opacity: isDisabled ? 0.5 : 1,
                            },
                          ]}
                          onPress={() =>
                            !isDisabled &&
                            !isSsoUser &&
                            setFormData({ ...formData, role })
                          }
                          disabled={isDisabled || isSsoUser}
                        >
                          <ThemedText
                            style={[
                              styles.roleOptionText,
                              {
                                color: isDisabled
                                  ? theme.textSecondary
                                  : isSelected
                                    ? theme.buttonText
                                    : theme.text,
                                fontWeight: isSelected ? "600" : "400",
                              },
                            ]}
                          >
                            {getRoleLabel(role)}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>

                  <StyledInput
                    label={t("form.company")}
                    value={formData.department}
                    onChangeText={(text) =>
                      setFormData({ ...formData, department: text })
                    }
                    placeholder={t("form.enterCompany")}
                    returnKeyType="next"
                    editable={!isSsoUser}
                  />

                  <Spacer height={Spacing.md} />

                  <PhoneInputWithCountry
                    value={formData.phoneNumber}
                    onChangeText={handlePhoneChange}
                    label={t("form.phoneNumber")}
                    required
                    error={formErrors.phone}
                    testID="input-phone"
                    editable={!isSsoUser}
                  />

                  <Spacer height={Spacing.md} />

                  <PhoneInputWithCountry
                    value={formData.businessPhone}
                    onChangeText={handleBusinessPhoneChange}
                    label={t("form.businessPhone")}
                    testID="input-business-phone"
                    editable={!isSsoUser}
                  />

                  <Spacer height={Spacing.md} />

                  <StyledInput
                    label={t("form.extension")}
                    value={formData.businessPhoneExt}
                    onChangeText={handleBusinessPhoneExtChange}
                    placeholder="123"
                    keyboardType="number-pad"
                    testID="input-business-phone-ext"
                    maxLength={6}
                    editable={!isSsoUser}
                  />

                  <Spacer height={Spacing.md} />

                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.textSecondary, marginBottom: Spacing.xs },
                    ]}
                  >
                    {t("common.manager").toUpperCase()}
                  </ThemedText>
                  <View
                    style={{
                      marginBottom: Spacing.md,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: Spacing.sm,
                      direction: isRTL ? 'rtl' : 'ltr',
                    }}
                  >
                    <Pressable
                      style={[
                        styles.roleOption,
                        {
                          backgroundColor: !formData.managerId
                            ? theme.primary
                            : theme.surface,
                          borderColor: !formData.managerId
                            ? theme.primary
                            : theme.border,
                          opacity: isSsoUser ? 0.5 : 1,
                        },
                      ]}
                      onPress={() =>
                        !isSsoUser &&
                        setFormData({ ...formData, managerId: undefined })
                      }
                      disabled={isSsoUser}
                    >
                      <ThemedText
                        style={[
                          styles.roleOptionText,
                          {
                            color: !formData.managerId
                              ? theme.buttonText
                              : theme.text,
                            fontWeight: !formData.managerId ? "600" : "400",
                          },
                        ]}
                      >
                        {t("common.none")}
                      </ThemedText>
                    </Pressable>
                    {managers.map((manager) => {
                      const managerName =
                        `${manager.firstName || ""} ${manager.lastName || ""}`.trim() ||
                        manager.email;
                      return (
                        <Pressable
                          key={manager.id}
                          style={[
                            styles.roleOption,
                            {
                              backgroundColor:
                                formData.managerId === manager.id
                                  ? theme.primary
                                  : theme.surface,
                              borderColor:
                                formData.managerId === manager.id
                                  ? theme.primary
                                  : theme.border,
                              opacity: isSsoUser ? 0.5 : 1,
                            },
                          ]}
                          onPress={() =>
                            !isSsoUser &&
                            setFormData({ ...formData, managerId: manager.id })
                          }
                          disabled={isSsoUser}
                        >
                          <ThemedText
                            style={[
                              styles.roleOptionText,
                              {
                                color:
                                  formData.managerId === manager.id
                                    ? theme.buttonText
                                    : theme.text,
                                fontWeight:
                                  formData.managerId === manager.id
                                    ? "600"
                                    : "400",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {managerName}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View
                    style={[
                      styles.autoApprovalRow,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={[Typography.body, { fontWeight: "500" }]}
                      >
                        {t("common.autoApproval")}
                      </ThemedText>
                      <ThemedText
                        style={[
                          Typography.caption,
                          { color: theme.textSecondary, marginTop: 2 },
                        ]}
                      >
                        {t("common.autoApprovalDescription")}
                      </ThemedText>
                    </View>
                    <View style={{ direction: 'ltr' } as any}>
                      <Switch
                        value={formData.autoApproval}
                        onValueChange={(value) =>
                          setFormData({ ...formData, autoApproval: value })
                        }
                        trackColor={{
                          false: theme.border,
                          true: theme.success + "80",
                        }}
                        thumbColor={
                          formData.autoApproval
                            ? theme.success
                            : theme.textSecondary
                        }
                        accessibilityLabel={t("common.autoApproval")}
                      />
                    </View>
                  </View>

                  <Spacer height={Spacing.lg} />

                  <LoadingButton
                    onPress={handleSaveUser}
                    loading={
                      createMutation.isPending || updateMutation.isPending
                    }
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    variant="primary"
                    size="medium"
                    loadingText={t("common.loading")}
                    fullWidth
                  >
                    {t("common.save")}
                  </LoadingButton>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        );
      })()}

      <ConfirmationModal
        visible={deleteModalVisible}
        title={t("common.delete")}
        description={t("common.confirm")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        onSuccess={handleDeleteSuccess}
        successMessage={t("toast.userDeleted")}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchContainer: {
    marginBottom: Spacing.sm,
  },
  filterContainer: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
  },
  filterContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingStart: HORIZONTAL_PADDING,
    paddingEnd: Spacing.lg,
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginVertical: Spacing.sm,
  },
  toolbar: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
  },
  toolbarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingStart: HORIZONTAL_PADDING,
    paddingEnd: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  groupButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  bulkButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  viewToggle: {
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  listContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  gridContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  webGridRow: {
    gap: Spacing.md,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  userCardContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  userCardInner: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  cardAccentLine: {
    position: "absolute",
    start: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopStartRadius: BorderRadius.md,
    borderBottomStartRadius: BorderRadius.md,
  },
  cardCheckboxContainer: {
    position: "absolute",
    top: Spacing.md,
    end: Spacing.md,
    zIndex: 1,
  },
  cardMainContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingEnd: Spacing.lg,
    paddingStart: Spacing.lg + 4,
  },
  cardHeader: {
    alignItems: "center",
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cardAvatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardNameSection: {
    flex: 1,
  },
  cardNameRow: {
    alignItems: "center",
  },
  cardUserName: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  cardInfoRow: {
    alignItems: "center",
  },
  cardInfoText: {
    fontSize: 13,
    flex: 1,
  },
  cardFooter: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardBadgesRow: {
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  },
  cardRoleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  cardAutoApprovalBadge: {
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardActions: {
    alignItems: "center",
  },
  cardActionButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tableSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  sectionHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginStart: "auto",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  fetchingIndicator: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  fab: {
    position: "absolute",
    right: HORIZONTAL_PADDING,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    width: "100%",
  },
  tableHeaderCell: {
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: Spacing.lg,
    width: "100%",
  },
  tableCell: {
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
  tableActionButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  bulkActionInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  bulkActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  bulkActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
    borderTopWidth: 1,
    marginTop: Spacing.md,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  sortMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-start",
    paddingTop: 200,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  sortMenuContent: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  formContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  roleOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  autoApprovalRow: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  saveButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
});
