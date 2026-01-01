import React, { useCallback } from "react";
import { View, StyleSheet, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { DDIcon, IconName } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useParkingDashboardQuery } from "@/hooks/queries/useValetQueries";
import type { ParkingDashboardVisitorDto, VisitorParkingOption } from "@/types/api.types";
import type { ValetAdminDashboardScreenProps } from "@/types/valetAdminNavigation.types";

interface KPICardProps {
  title: string;
  value: string;
  icon: IconName;
  iconBgColor: string;
  iconColor: string;
  cardBgColor: string;
}

function KPICard({ title, value, icon, iconBgColor, iconColor, cardBgColor }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: cardBgColor, borderWidth: StyleSheet.hairlineWidth, borderColor: applyOpacity(iconColor, '15') }]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon} size={28} color={iconColor} />
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={[styles.kpiValue, { color: theme.text }]}>
        {value}
      </ThemedText>

      <Spacer height={Spacing.xs} />

      <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

export default function ValetAdminDashboardScreen({ navigation }: ValetAdminDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const { data, isLoading, isError, isRefetching, refetch } = useParkingDashboardQuery();

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStatusColor = (status: 'expected' | 'checked_in' | 'checked_out') => {
    switch (status) {
      case 'expected':
        return theme.primary;
      case 'checked_in':
        return theme.success;
      case 'checked_out':
        return theme.textSecondary;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: 'expected' | 'checked_in' | 'checked_out') => {
    switch (status) {
      case 'expected':
        return t('status.expected');
      case 'checked_in':
        return t('status.checkedIn');
      case 'checked_out':
        return t('status.checkedOut');
      default:
        return status;
    }
  };

  const getParkingOptionIcon = (option: VisitorParkingOption): IconName => {
    switch (option) {
      case 'no_parking':
        return 'slash';
      case 'parking_with_car_info':
        return 'truck';
      case 'parking_without_car_info':
        return 'clock';
      default:
        return 'help-circle';
    }
  };

  const getParkingOptionColor = (option: VisitorParkingOption) => {
    switch (option) {
      case 'no_parking':
        return theme.textSecondary;
      case 'parking_with_car_info':
        return theme.success;
      case 'parking_without_car_info':
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  const getParkingOptionLabel = (option: VisitorParkingOption) => {
    switch (option) {
      case 'no_parking':
        return t('parking.noParking');
      case 'parking_with_car_info':
        return t('parking.withCarInfo');
      case 'parking_without_car_info':
        return t('parking.parkingPending');
      default:
        return '';
    }
  };

  const renderVisitorCard = (visitor: ParkingDashboardVisitorDto) => {
    const initials = visitor.visitorName.split(' ').map(n => n[0]).join('').substring(0, 2);
    const parkingColor = getParkingOptionColor(visitor.parkingOption);
    const statusColor = getStatusColor(visitor.status);
    
    return (
      <View 
        key={visitor.id}
        style={[
          styles.visitorCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: parkingColor,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {initials}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.visitorName, { color: theme.text }]} numberOfLines={1}>
              {visitor.visitorName}
            </ThemedText>
            <ThemedText style={[styles.hostName, { color: theme.textSecondary }]} numberOfLines={1}>
              {t('reception.hostName')}: {visitor.hostName}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '15') }]}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(visitor.status)}
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.metaRow}>
          <DDIcon name="clock" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {visitor.visitTime}
          </ThemedText>
        </View>

        <Spacer height={Spacing.sm} />

        <View style={styles.metaRow}>
          <DDIcon name={getParkingOptionIcon(visitor.parkingOption)} size={14} color={parkingColor} />
          <ThemedText style={[styles.metaText, { color: parkingColor }]}>
            {getParkingOptionLabel(visitor.parkingOption)}
          </ThemedText>
        </View>

        {visitor.parkingOption === 'parking_with_car_info' && (visitor.licensePlate || visitor.carModel) ? (
          <>
            <Spacer height={Spacing.xs} />
            <View style={styles.metaRow}>
              <DDIcon name="truck" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                {[visitor.carModel, visitor.carColor, visitor.licensePlate].filter(Boolean).join(' - ')}
              </ThemedText>
            </View>
          </>
        ) : null}
      </View>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
          {t('common.loading')}
        </ThemedText>
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={styles.centered}>
        <DDIcon name="alert-circle" size={48} color={theme.error} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.text }]}>
          {t('common.error')}
        </ThemedText>
        <Spacer height={Spacing.lg} />
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <DDIcon name="refresh-cw" size={16} color="#FFFFFF" />
          <ThemedText style={styles.retryButtonText}>
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const visitors = data?.visitors ?? [];
  const totalExpected = data?.totalExpected ?? 0;
  const totalWithParking = data?.totalWithParking ?? 0;
  const totalWithCarInfo = data?.totalWithCarInfo ?? 0;
  const checkedIn = data?.checkedIn ?? 0;

  return (
    <ScreenScrollView 
      contentContainerStyle={scrollContentStyle}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      <View style={[styles.infoBanner, { backgroundColor: applyOpacity(theme.info, '10'), borderColor: applyOpacity(theme.info, '20') }]}>
        <DDIcon name="info" size={16} color={theme.info} />
        <ThemedText style={[styles.infoBannerText, { color: theme.info }]}>
          {t('parking.readOnlyNote')}
        </ThemedText>
      </View>

      <Spacer height={Spacing.lg} />

      <View style={styles.kpiRow}>
        <KPICard 
          title={t('parking.expectedVisitors')} 
          value={String(totalExpected)} 
          icon="users" 
          iconBgColor={applyOpacity(theme.primary, '20')}
          iconColor={theme.primary}
          cardBgColor={applyOpacity(theme.primary, '06')}
        />
        <KPICard 
          title={t('parking.needsParking')} 
          value={String(totalWithParking)} 
          icon="navigation" 
          iconBgColor={applyOpacity(theme.warning, '20')}
          iconColor={theme.warning}
          cardBgColor={applyOpacity(theme.warning, '06')}
        />
      </View>

      <Spacer height={Spacing.sm} />

      <View style={styles.kpiRow}>
        <KPICard 
          title={t('parking.withCarInfo')} 
          value={String(totalWithCarInfo)} 
          icon="truck" 
          iconBgColor={applyOpacity(theme.success, '20')}
          iconColor={theme.success}
          cardBgColor={applyOpacity(theme.success, '06')}
        />
        <KPICard 
          title={t('parking.checkedIn')} 
          value={String(checkedIn)} 
          icon="check-circle" 
          iconBgColor={applyOpacity(theme.info, '20')}
          iconColor={theme.info}
          cardBgColor={applyOpacity(theme.info, '06')}
        />
      </View>

      <Spacer height={Spacing.xl} />

      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        {t('parking.expectedVisitors')}
      </ThemedText>

      <Spacer height={Spacing.md} />

      {visitors.length > 0 ? (
        <View style={styles.visitorsList}>
          {visitors.map((visitor) => renderVisitorCard(visitor))}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  infoBannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  visitorsList: {
    gap: Spacing.md,
  },
  visitorCard: {
    borderRadius: 12,
    borderStartWidth: 4,
    padding: Spacing.lg,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    marginStart: Spacing.md,
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  hostName: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    marginStart: 4,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
