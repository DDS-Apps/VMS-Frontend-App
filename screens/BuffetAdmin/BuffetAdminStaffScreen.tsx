import React, { useMemo, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon, IconName } from "@/components/DDIcon";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBuffetAdminStaffQuery, useUpdateStaffDutyMutation } from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminStaffDto } from "@/types/api.types";

import { KPICard, KPICardRow } from '@/components/shared/KPICard';

export default function BuffetAdminStaffScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
  const [togglingStaffId, setTogglingStaffId] = useState<string | null>(null);
  
  const { data: staffResponse, isLoading, isFetching } = useBuffetAdminStaffQuery();
  const updateDutyMutation = useUpdateStaffDutyMutation();

  const handleToggleDuty = (staffId: string, currentStatus: 'on_duty' | 'off_duty') => {
    const newStatus = currentStatus === 'on_duty' ? 'off_duty' : 'on_duty';
    setTogglingStaffId(staffId);
    updateDutyMutation.mutate(
      { id: staffId, data: { dutyStatus: newStatus } },
      {
        onSettled: () => {
          setTogglingStaffId(null);
        },
      }
    );
  };

  const staff = useMemo(() => {
    const responseData = staffResponse?.data as { data?: BuffetAdminStaffDto[] } | BuffetAdminStaffDto[] | undefined;
    return Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminStaffDto[] })?.data) ? (responseData as { data: BuffetAdminStaffDto[] }).data : []);
  }, [staffResponse]);

  const stats = useMemo(() => {
    const onDuty = staff.filter(s => s.dutyStatus === 'on_duty').length;
    const offDuty = staff.filter(s => s.dutyStatus === 'off_duty').length;
    return {
      total: staff.length,
      onDuty,
      offDuty,
    };
  }, [staff]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Chef':
        return theme.primary;
      case 'Coordinator':
        return theme.info;
      case 'Server':
        return theme.success;
      case 'Kitchen Staff':
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Chef':
        return 'award';
      case 'Coordinator':
        return 'clipboard';
      case 'Server':
        return 'disc';
      case 'Kitchen Staff':
        return 'tool';
      default:
        return 'user';
    }
  };

  const renderStaffCard = (item: BuffetAdminStaffDto) => {
    const isOnDuty = item.dutyStatus === 'on_duty';
    const initials = item.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const roleColor = getRoleColor(item.role);
    
    return (
      <View 
        key={item.id}
        style={[
          styles.staffCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: isOnDuty ? theme.success : theme.textSecondary,
          },
        ]}
      >
        <DirectionalRow style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(roleColor, '12') }]}>
            <ThemedText style={[styles.avatarText, { color: roleColor }]}>
              {initials}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.staffName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </ThemedText>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: applyOpacity(roleColor, '15') }]}>
                <DDIcon name={getRoleIcon(item.role) as IconName} size={12} color={roleColor} />
                <ThemedText style={[styles.roleText, { color: roleColor }]}>
                  {item.role}
                </ThemedText>
              </View>
            </View>
          </View>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.metaRow}>
          <DDIcon name="briefcase" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {item.currentTasks} {t('dashboard.activeTasks')}
          </ThemedText>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.cardFooter}>
          <DirectionalRow style={styles.statusContainer}>
            <View 
              style={[
                styles.statusIndicator, 
                { backgroundColor: isOnDuty ? theme.success : theme.textSecondary }
              ]} 
            />
            <ThemedText style={[styles.statusLabel, { color: isOnDuty ? theme.success : theme.textSecondary }]}>
              {isOnDuty ? t('dashboard.onDuty') : t('status.inactive')}
            </ThemedText>
          </DirectionalRow>

          <Pressable
            style={[
              styles.toggleButton,
              { 
                backgroundColor: isOnDuty ? applyOpacity(theme.textSecondary, '12') : applyOpacity(theme.success, '12'),
                opacity: togglingStaffId === item.id ? 0.6 : 1,
              }
            ]}
            onPress={() => handleToggleDuty(item.id, item.dutyStatus)}
            disabled={togglingStaffId === item.id}
          >
            {togglingStaffId === item.id ? (
              <ActivityIndicator size="small" color={isOnDuty ? theme.textSecondary : theme.success} />
            ) : (
              <>
                <DDIcon 
                  name={isOnDuty ? "user-x" : "user-check"} 
                  size={14} 
                  color={isOnDuty ? theme.textSecondary : theme.success} 
                />
                <ThemedText style={[styles.toggleButtonText, { color: isOnDuty ? theme.textSecondary : theme.success }]}>
                  {isOnDuty ? t('buffet.markOffDuty') : t('buffet.markOnDuty')}
                </ThemedText>
              </>
            )}
          </Pressable>
        </DirectionalRow>
      </View>
    );
  };

  if (isLoading || isFetching) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <KPICardRow>
        <KPICard 
          title={t('dashboard.totalStaff')} 
          value={String(stats.total)} 
          icon="users" 
          color={theme.primary}
        />
        <KPICard 
          title={t('dashboard.onDuty')} 
          value={String(stats.onDuty)} 
          icon="user-check" 
          color={theme.success}
        />
        <KPICard 
          title={t('status.inactive')} 
          value={String(stats.offDuty)} 
          icon="user-x" 
          color={theme.textSecondary}
        />
      </KPICardRow>

      <Spacer height={Spacing.xl} />

      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        {t('navigation.staffManagement')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      {staff.length > 0 ? (
        <View style={styles.staffList}>
          {staff.map((member) => renderStaffCard(member))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="users" size={32} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {t('common.noData')}
          </ThemedText>
        </ThemedView>
      )}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  staffList: {
    gap: Spacing.md,
  },
  staffCard: {
    borderRadius: 12,
    borderStartWidth: 4,
    padding: Spacing.lg,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
  headerInfo: {
    marginStart: Spacing.md,
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    marginStart: 6,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 6,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
