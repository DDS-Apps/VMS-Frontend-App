import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, Alert, GestureResponderEvent, ActivityIndicator } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon, IconName } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useBuffetAdminLocationsQuery,
  useBuffetLoadSummaryQuery,
} from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminLocationDto, BuffetLocationLoadDto } from "@/types/api.types";

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
        <DDIcon name={icon as IconName} size={24} color={iconColor} />
      </View>

      <Spacer height={Spacing.md} />

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

interface LocationDisplayItem {
  id: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  status: 'active' | 'inactive' | 'maintenance';
  activeStaff: number;
  currentRequests: number;
}

export default function BuffetAdminLocationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  
  const { data: locationsResponse, isLoading: isLoadingLocations } = useBuffetAdminLocationsQuery();
  const { data: loadSummary, isLoading: isLoadingLoadSummary } = useBuffetLoadSummaryQuery();
  
  const isLoading = isLoadingLocations || isLoadingLoadSummary;
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationDisplayItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    building: '',
    floor: '',
  });

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const locations = useMemo((): LocationDisplayItem[] => {
    const responseData = locationsResponse?.data as { data?: BuffetAdminLocationDto[] } | BuffetAdminLocationDto[] | undefined;
    const locData = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminLocationDto[] })?.data) ? (responseData as { data: BuffetAdminLocationDto[] }).data : []);
    if (locData.length === 0) return [];
    
    const loadMap = new Map(
      Array.isArray(loadSummary?.locations) ? loadSummary.locations.map(l => [l.locationId, l]) : []
    );

    return locData.map(loc => {
      const loadData = loadMap.get(loc.id);
      return {
        id: loc.id,
        name: loc.name,
        building: 'Building',
        floor: loc.floor || '-',
        capacity: loc.capacity || 0,
        status: loc.status,
        activeStaff: 0,
        currentRequests: loadData?.tasksToday || 0,
      };
    });
  }, [locationsResponse, loadSummary]);

  const stats = useMemo(() => {
    const responseData = locationsResponse?.data as { data?: BuffetAdminLocationDto[] } | BuffetAdminLocationDto[] | undefined;
    const locData = Array.isArray(responseData) ? responseData : (Array.isArray((responseData as { data?: BuffetAdminLocationDto[] })?.data) ? (responseData as { data: BuffetAdminLocationDto[] }).data : []);
    if (locData.length === 0) {
      return { active: 0, inactive: 0, totalCapacity: 0 };
    }

    const active = locData.filter(l => l.status === 'active').length;
    const inactive = locData.filter(l => l.status !== 'active').length;
    const totalCapacity = locData.reduce((sum, l) => sum + (l.capacity || 0), 0);

    return { active, inactive, totalCapacity };
  }, [locationsResponse]);

  const handleEditLocation = (location: LocationDisplayItem, event: GestureResponderEvent) => {
    event.stopPropagation();
    setEditingLocation(location);
    setFormData({
      name: location.name,
      capacity: String(location.capacity),
      building: location.building,
      floor: location.floor,
    });
    setShowEditModal(true);
  };

  const handleSaveLocation = () => {
    if (!editingLocation) return;
    
    if (!formData.name || !formData.capacity) {
      Alert.alert(t('common.error'), t('form.fillRequiredFields'));
      return;
    }

    Alert.alert(t('common.info'), 'Location editing requires API mutation (not implemented)');
    setShowEditModal(false);
    setEditingLocation(null);
  };

  const renderLocationCard = (item: LocationDisplayItem) => {
    const isActive = item.status === 'active';
    
    return (
      <View 
        key={item.id}
        style={[
          styles.locationCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: isActive ? theme.success : theme.textSecondary,
          },
        ]}
      >
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.iconContainer, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <DDIcon name="map-pin" size={20} color={theme.primary} />
          </View>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.locationName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </ThemedText>
            <ThemedText style={[styles.locationMeta, { color: theme.textSecondary }]}>
              {item.building} - {item.floor}
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.statusBadge, { backgroundColor: applyOpacity(isActive ? theme.success : theme.textSecondary, '15') }]}>
              <ThemedText style={[styles.statusText, { color: isActive ? theme.success : theme.textSecondary }]}>
                {isActive ? t('status.active') : t('status.inactive')}
              </ThemedText>
            </View>
            <Pressable
              style={styles.editIconButton}
              onPress={(e) => handleEditLocation(item, e)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <DDIcon name="edit-2" size={18} color={theme.primary} />
            </Pressable>
          </View>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.statItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.statIconBg, { backgroundColor: applyOpacity(theme.info, '12') }]}>
              <DDIcon name="users" size={16} color={theme.info} />
            </View>
            <View style={styles.statInfo}>
              <ThemedText style={[styles.statValue, { color: theme.text }]}>
                {item.capacity}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                {t('buffet.numberOfGuests')}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.statItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.statIconBg, { backgroundColor: applyOpacity(theme.success, '12') }]}>
              <DDIcon name="user-check" size={16} color={theme.success} />
            </View>
            <View style={styles.statInfo}>
              <ThemedText style={[styles.statValue, { color: theme.text }]}>
                {item.activeStaff}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                {t('dashboard.active')}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.statItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.statIconBg, { backgroundColor: applyOpacity(theme.warning, '12') }]}>
              <DDIcon name="cloche" size={16} color={theme.warning} />
            </View>
            <View style={styles.statInfo}>
              <ThemedText style={[styles.statValue, { color: theme.text }]}>
                {item.currentRequests}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                {t('navigation.allRequests')}
              </ThemedText>
            </View>
          </View>
        </View>

      </View>
    );
  };

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <View style={[styles.kpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <KPICard 
            title={t('status.active')} 
            value={String(stats.active)} 
            icon="check-circle" 
            iconBgColor={applyOpacity(theme.success, '20')}
            iconColor={theme.success}
            cardBgColor={applyOpacity(theme.success, '06')}
          />
          <KPICard 
            title={t('status.inactive')} 
            value={String(stats.inactive)} 
            icon="x-circle" 
            iconBgColor={applyOpacity(theme.textSecondary, '20')}
            iconColor={theme.textSecondary}
            cardBgColor={applyOpacity(theme.textSecondary, '06')}
          />
          <KPICard 
            title={t('buffet.numberOfGuests')} 
            value={String(stats.totalCapacity)} 
            icon="users" 
            iconBgColor={applyOpacity(theme.primary, '20')}
            iconColor={theme.primary}
            cardBgColor={applyOpacity(theme.primary, '06')}
          />
        </View>

        <Spacer height={Spacing.xl} />

        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('navigation.buffetLocations')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        {isLoading ? (
          <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('common.loading')}
            </ThemedText>
          </View>
        ) : locations.length > 0 ? (
          <View style={styles.locationsList}>
            {locations.map((location) => renderLocationCard(location))}
          </View>
        ) : (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <DDIcon name="map-pin" size={32} variant="muted" />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('common.noData')}
            </ThemedText>
          </ThemedView>
        )}

        <Spacer height={Spacing.xl} />
      </ScreenScrollView>

      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
                {t('common.edit')}
              </ThemedText>
              <Pressable onPress={() => setShowEditModal(false)}>
                <DDIcon name="x" size={24} variant="muted" />
              </Pressable>
            </View>

            <Spacer height={Spacing.lg} />

            <View style={styles.formGroup}>
              <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                {t('invitation.location')}
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder={t('invitation.location')}
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <Spacer height={Spacing.md} />

            <View style={styles.formGroup}>
              <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                {t('buffet.numberOfGuests')}
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={formData.capacity}
                onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                placeholder={t('buffet.numberOfGuests')}
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
              />
            </View>

            <Spacer height={Spacing.md} />

            <View style={styles.formGroup}>
              <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                {t('parking.floor')}
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={formData.building}
                onChangeText={(text) => setFormData({ ...formData, building: text })}
                placeholder={t('parking.floor')}
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <Spacer height={Spacing.md} />

            <View style={styles.formGroup}>
              <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                {t('parking.floor')}
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={formData.floor}
                onChangeText={(text) => setFormData({ ...formData, floor: text })}
                placeholder={t('parking.floor')}
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <Spacer height={Spacing.xl} />

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <LoadingButton
                onPress={() => setShowEditModal(false)}
                variant="secondary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t('common.cancel')}
              </LoadingButton>
              <View style={{ width: Spacing.md }} />
              <LoadingButton
                onPress={handleSaveLocation}
                variant="primary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t('common.save')}
              </LoadingButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  locationsList: {
    gap: Spacing.md,
  },
  locationCard: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editIconButton: {
    padding: Spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    marginStart: Spacing.md,
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationMeta: {
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    marginStart: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
