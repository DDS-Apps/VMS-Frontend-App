import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SearchInput } from "@/components/SearchInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { DDIcon, IconName } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getParkingSlots,
  getParkingStats,
  releaseParkingSlot,
  ValetParkingSlot,
} from "@/services/mock/valetAdminState";

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  cardBgColor: string;
}

function KPICard({ title, value, icon, iconBgColor, iconColor, cardBgColor }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: applyOpacity(iconColor, '15') }]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon as IconName} size={22} color={iconColor} />
      </View>

      <Spacer height={Spacing.sm} />

      <ThemedText style={[styles.kpiValue, { color: theme.text }]}>
        {value}
      </ThemedText>

      <Spacer height={2} />

      <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

type StatusFilter = 'all' | 'available' | 'occupied' | 'reserved' | 'maintenance';

const getFilterOptions = (t: (key: string) => string): { key: StatusFilter; label: string }[] => [
  { key: 'all', label: t('common.all') },
  { key: 'available', label: t('status.available') },
  { key: 'occupied', label: t('parking.occupied') },
  { key: 'reserved', label: t('status.reserved') },
  { key: 'maintenance', label: t('parking.maintenance') },
];

export default function ValetAdminParkingScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<ValetParkingSlot[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const scrollContentStyle = {
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };
  
  const paddedContentStyle = {
    paddingHorizontal: Spacing.lg,
  };

  const refreshState = React.useCallback(() => {
    const allSlots = getParkingSlots();
    setSlots(allSlots);
    setStats(getParkingStats());
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshState();
    }, [refreshState])
  );

  const handleReleaseSlot = (slotId: string, slotNumber: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (slot && slot.status === 'reserved') {
      Alert.alert(
        t('errors.error'),
        t('parking.reservedSlotError'),
        [{ text: t('common.ok'), style: 'default' }]
      );
      return;
    }

    Alert.alert(
      t('parking.releaseSlot'),
      `${t('parking.releaseSlotConfirm')} ${slotNumber}?`,
      [
        { 
          text: t('parking.release'), 
          style: 'destructive',
          onPress: () => {
            releaseParkingSlot(slotId);
            refreshState();
          }
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return theme.success;
      case 'occupied':
        return theme.primary;
      case 'reserved':
        return theme.warning;
      case 'maintenance':
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return t('status.available');
      case 'occupied':
        return t('parking.occupied');
      case 'reserved':
        return t('status.reserved');
      case 'maintenance':
        return t('parking.maintenance');
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return 'check-circle';
      case 'occupied':
        return 'truck';
      case 'reserved':
        return 'clock';
      case 'maintenance':
        return 'tool';
      default:
        return 'map-pin';
    }
  };

  const filteredSlots = slots
    .filter(slot => 
      slot.slotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (slot.vehiclePlate && slot.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .filter(slot => {
      if (statusFilter === 'all') return true;
      return slot.status === statusFilter;
    });

  const groupedSlots = filteredSlots.reduce((acc, slot) => {
    if (!acc[slot.zone]) {
      acc[slot.zone] = [];
    }
    acc[slot.zone].push(slot);
    return acc;
  }, {} as Record<string, ValetParkingSlot[]>);

  const getFilterPillColors = (filterKey: StatusFilter, isActive: boolean) => {
    if (!isActive) {
      return {
        bg: theme.surfaceSecondary,
        text: theme.textSecondary,
      };
    }
    
    switch (filterKey) {
      case 'available':
        return { bg: applyOpacity(theme.success, '15'), text: theme.success };
      case 'occupied':
        return { bg: applyOpacity(theme.primary, '15'), text: theme.primary };
      case 'reserved':
        return { bg: applyOpacity(theme.warning, '15'), text: theme.warning };
      case 'maintenance':
        return { bg: applyOpacity(theme.error, '15'), text: theme.error };
      default:
        return { bg: applyOpacity(theme.primary, '15'), text: theme.primary };
    }
  };

  const renderSlotCard = (slot: ValetParkingSlot) => {
    const statusColor = getStatusColor(slot.status);
    const canRelease = slot.status === 'occupied' || slot.status === 'reserved';
    
    return (
      <View 
        key={slot.id}
        style={[
          styles.slotCard,
          { 
            backgroundColor: theme.surface,
            borderColor: applyOpacity(statusColor, '30'),
          },
        ]}
      >
        <View style={[styles.slotHeader, { borderBottomColor: theme.border }]}>
          <View style={[styles.slotNumber, { backgroundColor: applyOpacity(statusColor, '15') }]}>
            <ThemedText style={[styles.slotNumberText, { color: statusColor }]}>
              {slot.slotNumber}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '15') }]}>
            <DDIcon name={getStatusIcon(slot.status) as IconName} size={12} color={statusColor} />
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(slot.status)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.slotBody}>
          <ThemedText style={[styles.zoneText, { color: theme.textSecondary }]}>
            {slot.zone}
          </ThemedText>
          
          {slot.vehiclePlate ? (
            <>
              <Spacer height={Spacing.xs} />
              <View style={styles.vehicleRow}>
                <DDIcon name="tag" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.vehiclePlate, { color: theme.text }]}>
                  {slot.vehiclePlate}
                </ThemedText>
              </View>
            </>
          ) : null}

          {canRelease ? (
            <>
              <Spacer height={Spacing.sm} />
              <Pressable
                style={[styles.releaseButton, { backgroundColor: applyOpacity(theme.error, '12') }]}
                onPress={() => handleReleaseSlot(slot.id, slot.slotNumber)}
              >
                <DDIcon name="x-circle" size={14} color={theme.error} />
                <ThemedText style={[styles.releaseButtonText, { color: theme.error }]}>
                  {t('parking.release')}
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  const renderSlotListItem = (slot: ValetParkingSlot) => {
    const statusColor = getStatusColor(slot.status);
    const canRelease = slot.status === 'occupied' || slot.status === 'reserved';
    
    return (
      <View 
        key={slot.id}
        style={[
          styles.slotListItem,
          { 
            backgroundColor: theme.surface,
            borderStartColor: statusColor,
          },
        ]}
      >
        <View style={styles.listItemContent}>
          <View style={[styles.slotNumberList, { backgroundColor: applyOpacity(statusColor, '15') }]}>
            <ThemedText style={[styles.slotNumberTextList, { color: statusColor }]}>
              {slot.slotNumber}
            </ThemedText>
          </View>
          
          <View style={styles.listItemInfo}>
            <ThemedText style={[styles.zoneTextList, { color: theme.text }]}>
              {slot.zone}
            </ThemedText>
            {slot.vehiclePlate ? (
              <View style={styles.vehicleRowList}>
                <DDIcon name="tag" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.vehiclePlateList, { color: theme.textSecondary }]}>
                  {slot.vehiclePlate}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.listItemRight}>
            <View style={[styles.statusBadgeList, { backgroundColor: applyOpacity(statusColor, '15') }]}>
              <DDIcon name={getStatusIcon(slot.status) as IconName} size={12} color={statusColor} />
              <ThemedText style={[styles.statusTextList, { color: statusColor }]}>
                {getStatusLabel(slot.status)}
              </ThemedText>
            </View>
            
            {canRelease ? (
              <Pressable
                style={[styles.releaseButtonList, { backgroundColor: applyOpacity(theme.error, '12') }]}
                onPress={() => handleReleaseSlot(slot.id, slot.slotNumber)}
              >
                <DDIcon name="x-circle" size={14} color={theme.error} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={paddedContentStyle}>
        <View style={styles.kpiRow}>
          <KPICard 
            title={t('common.total')} 
            value={String(stats.total)} 
            icon="map-pin" 
            iconBgColor={applyOpacity(theme.primary, '20')}
            iconColor={theme.primary}
            cardBgColor={applyOpacity(theme.primary, '06')}
          />
          <KPICard 
            title={t('status.available')} 
            value={String(stats.available)} 
            icon="check-circle" 
            iconBgColor={applyOpacity(theme.success, '20')}
            iconColor={theme.success}
            cardBgColor={applyOpacity(theme.success, '06')}
          />
          <KPICard 
            title={t('parking.occupied')} 
            value={String(stats.occupied)} 
            icon="truck" 
            iconBgColor={applyOpacity(theme.primary, '20')}
            iconColor={theme.primary}
            cardBgColor={applyOpacity(theme.primary, '06')}
          />
          <KPICard 
            title={t('status.reserved')} 
            value={String(stats.reserved)} 
            icon="clock" 
            iconBgColor={applyOpacity(theme.warning, '20')}
            iconColor={theme.warning}
            cardBgColor={applyOpacity(theme.warning, '06')}
          />
        </View>

        <Spacer height={Spacing.xl} />

        <SearchInput
          placeholder={t('common.search')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <Spacer height={Spacing.lg} />

      <View style={[styles.sectionTitleRow, paddedContentStyle]}>
        <ThemedText style={[Typography.subtitle]}>
          {t('navigation.valetParking')}
        </ThemedText>
        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'grid' ? theme.primary : theme.surface }
            ]}
            onPress={() => setViewMode('grid')}
          >
            <DDIcon 
              name="grid" 
              size={16} 
              color={viewMode === 'grid' ? theme.buttonText : theme.textSecondary} 
            />
          </Pressable>
          <Pressable
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'list' ? theme.primary : theme.surface }
            ]}
            onPress={() => setViewMode('list')}
          >
            <DDIcon 
              name="list" 
              size={16} 
              color={viewMode === 'list' ? theme.buttonText : theme.textSecondary} 
            />
          </Pressable>
        </View>
      </View>

      <Spacer height={Spacing.md} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        nestedScrollEnabled={true}
      >
        {getFilterOptions(t).map((option) => {
          const isActive = statusFilter === option.key;
          const colors = getFilterPillColors(option.key, isActive);
          
          return (
            <Pressable
              key={option.key}
              style={[
                styles.filterPill,
                { backgroundColor: colors.bg }
              ]}
              onPress={() => setStatusFilter(option.key)}
            >
              <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <Spacer height={Spacing.xl} />

      <View style={paddedContentStyle}>
        {viewMode === 'grid' ? (
          Object.entries(groupedSlots).map(([zone, zoneSlots]) => (
            <View key={zone}>
              <ThemedText style={[styles.zoneSectionTitle, { color: theme.text }]}>
                {zone}
              </ThemedText>
              <Spacer height={Spacing.md} />
              <View style={styles.slotsGrid}>
                {zoneSlots.map(renderSlotCard)}
              </View>
              <Spacer height={Spacing.xl} />
            </View>
          ))
        ) : (
          filteredSlots.length > 0 ? (
            <View style={styles.slotsList}>
              {filteredSlots.map(renderSlotListItem)}
            </View>
          ) : null
        )}

        {filteredSlots.length === 0 ? (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <DDIcon name="map-pin" size={32} variant="muted" />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {searchQuery ? t('common.noResults') : t('common.noData')}
            </ThemedText>
          </ThemedView>
        ) : null}
      </View>

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  zoneSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slotCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: 1,
  },
  slotNumber: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  slotBody: {
    padding: Spacing.sm,
  },
  zoneText: {
    fontSize: 11,
    fontWeight: '500',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehiclePlate: {
    fontSize: 12,
    fontWeight: '600',
  },
  releaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  releaseButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slotsList: {
    gap: Spacing.sm,
  },
  slotListItem: {
    borderRadius: 12,
    borderStartWidth: 4,
    padding: Spacing.md,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotNumberList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  slotNumberTextList: {
    fontSize: 16,
    fontWeight: '700',
  },
  listItemInfo: {
    flex: 1,
    marginStart: Spacing.md,
  },
  zoneTextList: {
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleRowList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  vehiclePlateList: {
    fontSize: 12,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadgeList: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusTextList: {
    fontSize: 11,
    fontWeight: '600',
  },
  releaseButtonList: {
    padding: 8,
    borderRadius: 8,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
