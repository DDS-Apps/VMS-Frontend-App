import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { SearchInput } from '@/components/SearchInput';
import { StyledInput } from '@/components/StyledInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LoadingButton } from '@/components/shared/LoadingButton';
import Spacer from '@/components/Spacer';
import { DDIcon, IconName } from '@/components/DDIcon';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { applyOpacity } from '@/utils/statusStyles';
import {
  useParkingSpotsQuery,
  useCreateParkingSpotMutation,
  useUpdateParkingSpotMutation,
  useDeleteParkingSpotMutation,
} from '@/hooks/queries/useParkingSpotsQueries';
import type {
  ParkingSpotDto,
  ParkingSpotType,
  ParkingSpotStatus,
  ParkingLocation,
} from '@/types/parkingSpots.types';

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

type LocationFilter = ParkingLocation | 'all';
type TypeFilter = ParkingSpotType | 'all';
type StatusFilter = 'all' | 'active' | 'inactive';

const LOCATIONS: ParkingLocation[] = ['skbc_basement', 'red_sea_mall', 'valet_zone'];
const SPOT_TYPES: ParkingSpotType[] = ['visitor', 'employee', 'valet', 'reserved'];

function getLocationLabel(location: ParkingLocation): string {
  switch (location) {
    case 'skbc_basement': return 'SKBC Basement';
    case 'red_sea_mall': return 'Red Sea Mall';
    case 'valet_zone': return 'Valet Zone';
    default: return location;
  }
}

function getSpotTypeLabel(type: ParkingSpotType): string {
  switch (type) {
    case 'visitor': return 'Visitor';
    case 'employee': return 'Employee';
    case 'valet': return 'Valet';
    case 'reserved': return 'Reserved';
    default: return type;
  }
}

export default function ParkingSpotsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<ParkingSpotDto | null>(null);
  const [formData, setFormData] = useState({
    spotNumber: '',
    location: 'skbc_basement' as ParkingLocation,
    level: '',
    spotType: 'visitor' as ParkingSpotType,
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (locationFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    return count;
  }, [locationFilter, typeFilter, statusFilter]);

  const handleResetFilters = useCallback(() => {
    setLocationFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
  }, []);

  const { data: spotsResponse, isLoading, refetch } = useParkingSpotsQuery({
    limit: 100,
    page: 1,
  });

  const createMutation = useCreateParkingSpotMutation();
  const updateMutation = useUpdateParkingSpotMutation();
  const deleteMutation = useDeleteParkingSpotMutation();

  const spots = spotsResponse?.data ?? [];

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const stats = useMemo(() => {
    const total = spots.length;
    const active = spots.filter(s => s.isActive).length;
    const occupied = spots.filter(s => s.status === 'occupied').length;
    return { total, active, occupied };
  }, [spots]);

  const filteredSpots = useMemo(() => {
    return spots
      .filter(spot => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return spot.spotNumber.toLowerCase().includes(query) ||
                 spot.vehiclePlate?.toLowerCase().includes(query) ||
                 spot.id.toLowerCase().includes(query);
        }
        return true;
      })
      .filter(spot => {
        if (locationFilter !== 'all' && spot.location !== locationFilter) return false;
        if (typeFilter !== 'all' && spot.spotType !== typeFilter) return false;
        if (statusFilter === 'active' && !spot.isActive) return false;
        if (statusFilter === 'inactive' && spot.isActive) return false;
        return true;
      });
  }, [spots, searchQuery, locationFilter, typeFilter, statusFilter]);

  const handleAddSpot = () => {
    setEditingSpot(null);
    setFormData({
      spotNumber: '',
      location: 'skbc_basement',
      level: '',
      spotType: 'visitor',
    });
    setShowModal(true);
  };

  const handleEditSpot = (spot: ParkingSpotDto) => {
    setEditingSpot(spot);
    setFormData({
      spotNumber: spot.spotNumber,
      location: spot.location,
      level: spot.level,
      spotType: spot.spotType,
    });
    setShowModal(true);
  };

  const handleSaveSpot = useCallback(async () => {
    if (!formData.spotNumber || !formData.level) {
      Alert.alert(t('common.error'), t('form.fieldRequired'));
      return;
    }

    try {
      if (editingSpot) {
        await updateMutation.mutateAsync({
          id: editingSpot.id,
          data: {
            spotNumber: formData.spotNumber,
            location: formData.location,
            level: formData.level,
            spotType: formData.spotType,
          },
        });
      } else {
        await createMutation.mutateAsync({
          spotNumber: formData.spotNumber,
          location: formData.location,
          level: formData.level,
          spotType: formData.spotType,
          isActive: true,
        });
      }
      setShowModal(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      Alert.alert(t('common.error'), errorMessage);
    }
  }, [formData, editingSpot, createMutation, updateMutation, t]);

  const handleToggleActive = useCallback(async (spot: ParkingSpotDto) => {
    try {
      await updateMutation.mutateAsync({
        id: spot.id,
        data: { isActive: !spot.isActive },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      Alert.alert(t('common.error'), errorMessage);
    }
  }, [updateMutation, t]);

  const handleDeleteSpot = useCallback((spot: ParkingSpotDto) => {
    if (spot.status === 'occupied') {
      Alert.alert(t('common.error'), t('parking.cannotDeleteOccupied'));
      return;
    }

    Alert.alert(
      t('common.delete'),
      `${t('common.confirm')} ${spot.spotNumber}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(spot.id);
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : t('common.error');
              Alert.alert(t('common.error'), errorMessage);
            }
          },
        },
      ]
    );
  }, [deleteMutation, t]);

  const getTypeColor = (type: ParkingSpotType) => {
    switch (type) {
      case 'visitor': return theme.primary;
      case 'employee': return theme.success;
      case 'valet': return theme.chartPurple;
      case 'reserved': return theme.warning;
      default: return theme.textSecondary;
    }
  };

  const getStatusColor = (status: ParkingSpotStatus) => {
    switch (status) {
      case 'available': return theme.success;
      case 'occupied': return theme.warning;
      case 'reserved': return theme.primary;
      case 'maintenance': return theme.error;
      default: return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: ParkingSpotStatus) => {
    switch (status) {
      case 'available': return t('status.available');
      case 'occupied': return t('status.occupied');
      case 'reserved': return t('status.reserved');
      case 'maintenance': return t('status.maintenance');
      default: return status;
    }
  };

  const getFilterPillColors = (isActive: boolean, color?: string) => {
    if (!isActive) {
      return {
        bg: theme.surfaceSecondary,
        text: theme.textSecondary,
      };
    }
    return {
      bg: applyOpacity(color || theme.primary, '15'),
      text: color || theme.primary,
    };
  };

  const renderSpotCard = (spot: ParkingSpotDto) => {
    const typeColor = getTypeColor(spot.spotType);
    const statusColor = getStatusColor(spot.status);
    
    return (
      <View 
        key={spot.id}
        style={[
          styles.spotCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: spot.isActive ? typeColor : theme.textSecondary,
            opacity: spot.isActive ? 1 : 0.7,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.spotIcon, { backgroundColor: applyOpacity(typeColor, '15') }]}>
            <DDIcon name="map-pin" size={20} color={typeColor} />
          </View>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.spotNumber, { color: theme.text }]} numberOfLines={1}>
              {spot.spotNumber}
            </ThemedText>
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: applyOpacity(typeColor, '15') }]}>
                <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
                  {getSpotTypeLabel(spot.spotType)}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '15') }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <ThemedText style={[styles.statusBadgeText, { color: statusColor }]}>
                  {getStatusLabel(spot.status)}
                </ThemedText>
              </View>
            </View>
          </View>
          {!spot.isActive ? (
            <View style={[styles.inactiveBadge, { backgroundColor: applyOpacity(theme.error, '15') }]}>
              <ThemedText style={[styles.inactiveBadgeText, { color: theme.error }]}>
                {t('common.inactive')}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.metaRow}>
          <DDIcon name="home" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {getLocationLabel(spot.location)}
          </ThemedText>
        </View>

        <Spacer height={Spacing.xs} />

        <View style={styles.metaRow}>
          <DDIcon name="layers" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {t('parking.level')}: {spot.level}
          </ThemedText>
        </View>

        {spot.assignedEmployeeName ? (
          <>
            <Spacer height={Spacing.xs} />
            <View style={styles.metaRow}>
              <DDIcon name="user" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {spot.assignedEmployeeName}
              </ThemedText>
            </View>
          </>
        ) : null}

        {spot.vehiclePlate ? (
          <>
            <Spacer height={Spacing.xs} />
            <View style={styles.metaRow}>
              <DDIcon name="truck" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {spot.vehiclePlate}
              </ThemedText>
            </View>
          </>
        ) : null}

        <Spacer height={Spacing.md} />

        <View style={styles.cardFooter}>
          <View style={styles.toggleContainer}>
            <ThemedText style={[styles.toggleLabel, { color: theme.textSecondary }]}>
              {spot.isActive ? t('common.active') : t('common.inactive')}
            </ThemedText>
            <Switch
              value={spot.isActive}
              onValueChange={() => handleToggleActive(spot)}
              trackColor={{ false: theme.border, true: applyOpacity(theme.success, '40') }}
              thumbColor={spot.isActive ? theme.success : theme.textSecondary}
              ios_backgroundColor={theme.border}
            />
          </View>

          <View style={styles.cardActions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: applyOpacity(theme.primary, '15') }]}
              onPress={() => handleEditSpot(spot)}
            >
              <DDIcon name="edit-2" size={16} color={theme.primary} />
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: applyOpacity(theme.error, '15') }]}
              onPress={() => handleDeleteSpot(spot)}
            >
              <DDIcon name="trash-2" size={16} color={theme.error} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderLocationOption = (loc: ParkingLocation) => {
    const isSelected = formData.location === loc;
    return (
      <Pressable
        key={loc}
        style={[
          styles.optionButton,
          { 
            backgroundColor: isSelected ? applyOpacity(theme.primary, '15') : theme.surfaceSecondary,
            borderColor: isSelected ? theme.primary : theme.border,
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => setFormData(prev => ({ ...prev, location: loc }))}
      >
        <ThemedText style={[styles.optionText, { color: isSelected ? theme.primary : theme.text }]}>
          {getLocationLabel(loc)}
        </ThemedText>
      </Pressable>
    );
  };

  const renderTypeOption = (type: ParkingSpotType) => {
    const isSelected = formData.spotType === type;
    const typeColor = getTypeColor(type);
    return (
      <Pressable
        key={type}
        style={[
          styles.optionButton,
          { 
            backgroundColor: isSelected ? applyOpacity(typeColor, '15') : theme.surfaceSecondary,
            borderColor: isSelected ? typeColor : theme.border,
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => setFormData(prev => ({ ...prev, spotType: type }))}
      >
        <ThemedText style={[styles.optionText, { color: isSelected ? typeColor : theme.text }]}>
          {getSpotTypeLabel(type)}
        </ThemedText>
      </Pressable>
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Spacer height={Spacing.md} />
        <ThemedText style={{ color: theme.textSecondary }}>{t('common.loading')}</ThemedText>
      </View>
    );
  }

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <View style={styles.kpiRow}>
          <KPICard 
            title={t('parking.totalSpots')} 
            value={String(stats.total)} 
            icon="grid" 
            iconBgColor={applyOpacity(theme.primary, '20')}
            iconColor={theme.primary}
            cardBgColor={applyOpacity(theme.primary, '06')}
          />
          <KPICard 
            title={t('common.active')} 
            value={String(stats.active)} 
            icon="check-circle" 
            iconBgColor={applyOpacity(theme.success, '20')}
            iconColor={theme.success}
            cardBgColor={applyOpacity(theme.success, '06')}
          />
          <KPICard 
            title={t('status.occupied')} 
            value={String(stats.occupied)} 
            icon="truck" 
            iconBgColor={applyOpacity(theme.warning, '20')}
            iconColor={theme.warning}
            cardBgColor={applyOpacity(theme.warning, '06')}
          />
        </View>

        <Spacer height={Spacing.xl} />

        <View style={styles.searchFilterRow}>
          <View style={styles.searchInputWrapper}>
            <SearchInput
              placeholder={t('parking.searchSpots')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            style={[
              styles.filterButton,
              { 
                backgroundColor: activeFilterCount > 0 ? applyOpacity(theme.primary, '15') : theme.surface,
                borderColor: activeFilterCount > 0 ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <DDIcon 
              name="sliders" 
              size={20} 
              color={activeFilterCount > 0 ? theme.primary : theme.textSecondary} 
            />
            {activeFilterCount > 0 ? (
              <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
              </View>
            ) : null}
          </Pressable>
        </View>

        {activeFilterCount > 0 ? (
          <>
            <Spacer height={Spacing.sm} />
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeFiltersRow}
            >
              {locationFilter !== 'all' ? (
                <Pressable
                  style={[styles.activeFilterChip, { backgroundColor: applyOpacity(theme.primary, '15') }]}
                  onPress={() => setLocationFilter('all')}
                >
                  <ThemedText style={[styles.activeFilterChipText, { color: theme.primary }]}>
                    {getLocationLabel(locationFilter)}
                  </ThemedText>
                  <DDIcon name="x" size={14} color={theme.primary} />
                </Pressable>
              ) : null}
              {typeFilter !== 'all' ? (
                <Pressable
                  style={[styles.activeFilterChip, { backgroundColor: applyOpacity(getTypeColor(typeFilter), '15') }]}
                  onPress={() => setTypeFilter('all')}
                >
                  <ThemedText style={[styles.activeFilterChipText, { color: getTypeColor(typeFilter) }]}>
                    {getSpotTypeLabel(typeFilter)}
                  </ThemedText>
                  <DDIcon name="x" size={14} color={getTypeColor(typeFilter)} />
                </Pressable>
              ) : null}
              {statusFilter !== 'all' ? (
                <Pressable
                  style={[styles.activeFilterChip, { backgroundColor: applyOpacity(statusFilter === 'active' ? theme.success : theme.error, '15') }]}
                  onPress={() => setStatusFilter('all')}
                >
                  <ThemedText style={[styles.activeFilterChipText, { color: statusFilter === 'active' ? theme.success : theme.error }]}>
                    {statusFilter === 'active' ? t('common.active') : t('common.inactive')}
                  </ThemedText>
                  <DDIcon name="x" size={14} color={statusFilter === 'active' ? theme.success : theme.error} />
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.clearFiltersChip, { borderColor: theme.border }]}
                onPress={handleResetFilters}
              >
                <ThemedText style={[styles.clearFiltersText, { color: theme.textSecondary }]}>
                  {t('common.clear')}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </>
        ) : null}

        <Spacer height={Spacing.lg} />

        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('parking.spotsDirectory')} ({filteredSpots.length})
        </ThemedText>

        <Spacer height={Spacing.md} />

        {filteredSpots.length > 0 ? (
          <View style={styles.spotsList}>
            {filteredSpots.map(spot => renderSpotCard(spot))}
          </View>
        ) : (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <DDIcon name="map-pin" size={32} variant="muted" />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {searchQuery ? t('common.noResults') : t('common.noData')}
            </ThemedText>
          </ThemedView>
        )}

        <Spacer height={Spacing.xl} />
      </ScreenScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + Spacing.xl }]}
        onPress={handleAddSpot}
      >
        <DDIcon name="plus" size={24} color={theme.buttonText} />
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.h3, { fontWeight: '600' }]}>
                {editingSpot ? t('parking.editSpot') : t('parking.addSpot')}
              </ThemedText>
              <Pressable onPress={() => setShowModal(false)}>
                <DDIcon name="x" size={24} variant="muted" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <StyledInput
                label={t('parking.spotNumber')}
                placeholder="B1-001"
                value={formData.spotNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, spotNumber: text }))}
                leftIcon="hash"
              />

              <Spacer height={Spacing.lg} />

              <StyledInput
                label={t('parking.level')}
                placeholder="B1"
                value={formData.level}
                onChangeText={(text) => setFormData(prev => ({ ...prev, level: text }))}
                leftIcon="layers"
              />

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
                {t('parking.location').toUpperCase()}
              </ThemedText>
              <View style={styles.optionsGrid}>
                {LOCATIONS.map(loc => renderLocationOption(loc))}
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
                {t('parking.type').toUpperCase()}
              </ThemedText>
              <View style={styles.optionsGrid}>
                {SPOT_TYPES.map(type => renderTypeOption(type))}
              </View>

              <Spacer height={Spacing.xl} />
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
              <LoadingButton
                onPress={() => setShowModal(false)}
                variant="secondary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </LoadingButton>
              <View style={{ width: Spacing.md }} />
              <LoadingButton
                onPress={handleSaveSpot}
                variant="primary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
                loading={isSaving}
              >
                {editingSpot ? t('common.save') : t('common.add')}
              </LoadingButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowFilterModal(false)}>
          <Pressable 
            style={[styles.filterModalContent, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.h3, { fontWeight: '600' }]}>
                {t('common.filters')}
              </ThemedText>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <DDIcon name="x" size={24} variant="muted" />
              </Pressable>
            </View>

            <View style={styles.filterModalBody}>
              <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
                {t('parking.location')}
              </ThemedText>
              <View style={styles.filterOptionsGrid}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: locationFilter === 'all' ? applyOpacity(theme.primary, '15') : theme.surfaceSecondary,
                      borderColor: locationFilter === 'all' ? theme.primary : theme.border,
                      borderWidth: locationFilter === 'all' ? 2 : 1,
                    }
                  ]}
                  onPress={() => setLocationFilter('all')}
                >
                  <ThemedText style={[styles.filterOptionText, { color: locationFilter === 'all' ? theme.primary : theme.text }]}>
                    {t('common.all')}
                  </ThemedText>
                </Pressable>
                {LOCATIONS.map(loc => (
                  <Pressable
                    key={loc}
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: locationFilter === loc ? applyOpacity(theme.primary, '15') : theme.surfaceSecondary,
                        borderColor: locationFilter === loc ? theme.primary : theme.border,
                        borderWidth: locationFilter === loc ? 2 : 1,
                      }
                    ]}
                    onPress={() => setLocationFilter(loc)}
                  >
                    <ThemedText style={[styles.filterOptionText, { color: locationFilter === loc ? theme.primary : theme.text }]}>
                      {getLocationLabel(loc)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
                {t('parking.type')}
              </ThemedText>
              <View style={styles.filterOptionsGrid}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: typeFilter === 'all' ? applyOpacity(theme.primary, '15') : theme.surfaceSecondary,
                      borderColor: typeFilter === 'all' ? theme.primary : theme.border,
                      borderWidth: typeFilter === 'all' ? 2 : 1,
                    }
                  ]}
                  onPress={() => setTypeFilter('all')}
                >
                  <ThemedText style={[styles.filterOptionText, { color: typeFilter === 'all' ? theme.primary : theme.text }]}>
                    {t('common.all')}
                  </ThemedText>
                </Pressable>
                {SPOT_TYPES.map(type => {
                  const typeColor = getTypeColor(type);
                  return (
                    <Pressable
                      key={type}
                      style={[
                        styles.filterOption,
                        { 
                          backgroundColor: typeFilter === type ? applyOpacity(typeColor, '15') : theme.surfaceSecondary,
                          borderColor: typeFilter === type ? typeColor : theme.border,
                          borderWidth: typeFilter === type ? 2 : 1,
                        }
                      ]}
                      onPress={() => setTypeFilter(type)}
                    >
                      <ThemedText style={[styles.filterOptionText, { color: typeFilter === type ? typeColor : theme.text }]}>
                        {getSpotTypeLabel(type)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
                {t('common.status')}
              </ThemedText>
              <View style={styles.filterOptionsGrid}>
                {(['all', 'active', 'inactive'] as StatusFilter[]).map(status => {
                  const isActive = statusFilter === status;
                  const color = status === 'active' ? theme.success : status === 'inactive' ? theme.error : theme.primary;
                  return (
                    <Pressable
                      key={status}
                      style={[
                        styles.filterOption,
                        { 
                          backgroundColor: isActive ? applyOpacity(color, '15') : theme.surfaceSecondary,
                          borderColor: isActive ? color : theme.border,
                          borderWidth: isActive ? 2 : 1,
                        }
                      ]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <ThemedText style={[styles.filterOptionText, { color: isActive ? color : theme.text }]}>
                        {status === 'all' ? t('common.all') : status === 'active' ? t('common.active') : t('common.inactive')}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.filterModalFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
              <LoadingButton
                onPress={() => {
                  handleResetFilters();
                }}
                variant="secondary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t('common.reset')}
              </LoadingButton>
              <View style={{ width: Spacing.md }} />
              <LoadingButton
                onPress={() => setShowFilterModal(false)}
                variant="primary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t('common.apply')}
              </LoadingButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingEnd: Spacing.sm,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  spotsList: {
    gap: Spacing.md,
  },
  spotCard: {
    borderRadius: 12,
    borderStartWidth: 4,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotIcon: {
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
  spotNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    marginStart: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    marginEnd: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    end: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 100,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    end: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingEnd: Spacing.sm,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: Spacing.md,
    paddingEnd: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  activeFilterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearFiltersChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterModalContent: {
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    maxHeight: '70%',
  },
  filterModalBody: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterModalFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
});
