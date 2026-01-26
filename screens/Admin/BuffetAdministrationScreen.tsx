import React, { useState } from "react";
import { View, StyleSheet, Pressable, Dimensions, Modal, TextInput, Alert, Platform, ScrollView } from "react-native";
import { DDIcon } from "@/components/DDIcon";
import { KeyboardAwareScrollView } from "@/components/NativeKeyboardAwareScrollView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { createModalOverlayStyle } from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { KPICard, KPICardRow } from '@/components/shared/KPICard';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

interface BuffetLocation {
  id: string;
  name: string;
  floor: string;
  hours: string;
  capacity: number;
  active: boolean;
}

interface BuffetStaff {
  id: string;
  name: string;
  role: string;
  assignedLocation: string;
  status: 'on_duty' | 'active' | 'inactive';
  shift: string;
  phone: string;
}

const INITIAL_LOCATIONS: BuffetLocation[] = [
  { id: '1', name: 'Main Cafeteria', floor: 'Ground Floor', hours: '7:00 AM - 6:00 PM', capacity: 150, active: true },
  { id: '2', name: 'Executive Dining', floor: '5th Floor', hours: '12:00 PM - 3:00 PM', capacity: 40, active: true },
  { id: '3', name: 'Break Room - Building B', floor: '3rd Floor', hours: '8:00 AM - 5:00 PM', capacity: 20, active: true },
  { id: '4', name: 'Rooftop Terrace', floor: 'Top Floor', hours: '11:00 AM - 4:00 PM', capacity: 60, active: false },
  { id: '5', name: 'Garden Pavilion', floor: 'Ground Floor', hours: '9:00 AM - 5:00 PM', capacity: 80, active: true },
  { id: '6', name: 'VIP Lounge', floor: '10th Floor', hours: '10:00 AM - 8:00 PM', capacity: 25, active: true },
];

const MOCK_STAFF: BuffetStaff[] = [
  { id: '1', name: 'Ahmed Hassan', role: 'Head Chef', assignedLocation: 'Main Cafeteria', status: 'on_duty', shift: '7:00 AM - 3:00 PM', phone: '+966-50-123-4567' },
  { id: '2', name: 'Fatima Ali', role: 'Supervisor', assignedLocation: 'Main Cafeteria', status: 'on_duty', shift: '7:00 AM - 3:00 PM', phone: '+966-50-234-5678' },
  { id: '3', name: 'Mohammed Ibrahim', role: 'Chef', assignedLocation: 'Executive Dining', status: 'on_duty', shift: '11:00 AM - 7:00 PM', phone: '+966-50-345-6789' },
  { id: '4', name: 'Sarah Abdullah', role: 'Server', assignedLocation: 'Main Cafeteria', status: 'active', shift: '12:00 PM - 8:00 PM', phone: '+966-50-456-7890' },
  { id: '5', name: 'Omar Khalid', role: 'Chef', assignedLocation: 'VIP Lounge', status: 'on_duty', shift: '10:00 AM - 6:00 PM', phone: '+966-50-567-8901' },
  { id: '6', name: 'Layla Mohammed', role: 'Server', assignedLocation: 'Executive Dining', status: 'active', shift: '11:00 AM - 7:00 PM', phone: '+966-50-678-9012' },
  { id: '7', name: 'Khalid Yousef', role: 'Server', assignedLocation: 'Garden Pavilion', status: 'on_duty', shift: '9:00 AM - 5:00 PM', phone: '+966-50-789-0123' },
  { id: '8', name: 'Aisha Salem', role: 'Supervisor', assignedLocation: 'VIP Lounge', status: 'inactive', shift: '10:00 AM - 6:00 PM', phone: '+966-50-890-1234' },
  { id: '9', name: 'Hassan Ahmed', role: 'Chef', assignedLocation: 'Garden Pavilion', status: 'active', shift: '8:00 AM - 4:00 PM', phone: '+966-50-901-2345' },
  { id: '10', name: 'Nora Abdullah', role: 'Server', assignedLocation: 'Break Room - Building B', status: 'inactive', shift: '8:00 AM - 4:00 PM', phone: '+966-50-012-3456' },
  { id: '11', name: 'Youssef Ibrahim', role: 'Server', assignedLocation: 'Main Cafeteria', status: 'active', shift: '2:00 PM - 10:00 PM', phone: '+966-50-123-4568' },
  { id: '12', name: 'Mariam Ali', role: 'Chef', assignedLocation: 'Break Room - Building B', status: 'inactive', shift: '7:00 AM - 3:00 PM', phone: '+966-50-234-5679' },
];

type TabType = 'locations' | 'staff';

interface LocationFormData {
  name: string;
  floor: string;
  hours: string;
  capacity: string;
  active: boolean;
}

export default function BuffetAdministrationScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();  const [activeTab, setActiveTab] = useState<TabType>('locations');
  const [locations, setLocations] = useState<BuffetLocation[]>(INITIAL_LOCATIONS);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<BuffetLocation | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    floor: '',
    hours: '',
    capacity: '',
    active: true,
  });

  const getStatusColor = (status: 'on_duty' | 'active' | 'inactive') => {
    switch (status) {
      case 'on_duty':
        return theme.success;
      case 'active':
        return theme.info;
      case 'inactive':
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: 'on_duty' | 'active' | 'inactive') => {
    switch (status) {
      case 'on_duty':
        return t('dashboard.onDuty');
      case 'active':
        return t('status.active');
      case 'inactive':
        return t('status.inactive');
    }
  };

  const stats = {
    locations: {
      total: locations.length,
      active: locations.filter(l => l.active).length,
    },
    staff: {
      total: MOCK_STAFF.length,
      onDuty: MOCK_STAFF.filter(s => s.status === 'on_duty').length,
      active: MOCK_STAFF.filter(s => s.status === 'active').length,
      inactive: MOCK_STAFF.filter(s => s.status === 'inactive').length,
    },
  };

  const openAddLocationModal = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      floor: '',
      hours: '',
      capacity: '',
      active: true,
    });
    setShowLocationModal(true);
  };

  const openEditLocationModal = (location: BuffetLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      floor: location.floor,
      hours: location.hours,
      capacity: location.capacity.toString(),
      active: location.active,
    });
    setShowLocationModal(true);
  };

  const closeLocationModal = () => {
    setShowLocationModal(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      floor: '',
      hours: '',
      capacity: '',
      active: true,
    });
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return t('form.fieldRequired');
    }
    if (!formData.floor.trim()) {
      return t('form.fieldRequired');
    }
    if (!formData.hours.trim()) {
      return t('form.fieldRequired');
    }
    if (!formData.capacity.trim()) {
      return t('form.fieldRequired');
    }
    const capacityNum = parseInt(formData.capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      return t('form.fieldRequired');
    }
    return null;
  };

  const handleSaveLocation = () => {
    const error = validateForm();
    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }

    const capacityNum = parseInt(formData.capacity);

    if (editingLocation) {
      setLocations(locations.map(loc =>
        loc.id === editingLocation.id
          ? { ...loc, ...formData, capacity: capacityNum }
          : loc
      ));
      Alert.alert(t('common.success'), t('common.save'));
    } else {
      const newLocation: BuffetLocation = {
        id: Date.now().toString(),
        name: formData.name,
        floor: formData.floor,
        hours: formData.hours,
        capacity: capacityNum,
        active: formData.active,
      };
      setLocations([...locations, newLocation]);
      Alert.alert(t('common.success'), t('common.save'));
    }

    closeLocationModal();
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <ThemedText style={[Typography.title]}>
        {t('navigation.buffetOversight')}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {t('navigation.locations')} & {t('navigation.staffManagement')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <DirectionalRow style={[styles.tabContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'locations' && { backgroundColor: theme.primary },
          ]}
          onPress={() => setActiveTab('locations')}
        >
          <DDIcon 
            name="map" 
            size={18} 
            color={activeTab === 'locations' ? theme.buttonText : theme.textSecondary} 
          />
          <Spacer width={Spacing.xs} />
          <ThemedText
            style={[
              Typography.bodySmall,
              { color: activeTab === 'locations' ? theme.buttonText : theme.textSecondary },
            ]}
          >
            {t('navigation.locations')} ({stats.locations.active}/{stats.locations.total})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'staff' && { backgroundColor: theme.primary },
          ]}
          onPress={() => setActiveTab('staff')}
        >
          <DDIcon 
            name="users" 
            size={18} 
            color={activeTab === 'staff' ? theme.buttonText : theme.textSecondary} 
          />
          <Spacer width={Spacing.xs} />
          <ThemedText
            style={[
              Typography.bodySmall,
              { color: activeTab === 'staff' ? theme.buttonText : theme.textSecondary },
            ]}
          >
            {t('dashboard.buffetStaff')} ({stats.staff.onDuty}/{stats.staff.total})
          </ThemedText>
        </Pressable>
      </DirectionalRow>

      <Spacer height={Spacing.xl} />

      {activeTab === 'locations' ? (
        <>
          <KPICardRow>
            <KPICard
              title={t('navigation.locations')}
              value={stats.locations.total}
              icon="map"
              color={theme.primary}
            />
            <KPICard
              title={t('status.active')}
              value={stats.locations.active}
              icon="check-circle"
              color={theme.success}
            />
          </KPICardRow>

          <Spacer height={Spacing.xl} />

          <ThemedView style={[styles.locationsCard, { backgroundColor: theme.surface }]}>
            <DirectionalRow style={styles.locationsHeader}>
              <ThemedText style={[Typography.subtitle]}>
                {t('navigation.buffetLocations')}
              </ThemedText>
              <Pressable
                style={[styles.addButton, { backgroundColor: theme.primary, flexDirection: getFlexDirection(isRTL) }]}
                onPress={openAddLocationModal}
              >
                <DDIcon name="plus" size={18} color={theme.buttonText} />
                <Spacer width={Spacing.xs} />
                <ThemedText style={[Typography.bodySmall, { color: theme.buttonText, fontWeight: '600' }]}>
                  {t('common.save')}
                </ThemedText>
              </Pressable>
            </DirectionalRow>

            <Spacer height={Spacing.lg} />

            <DirectionalRow style={[styles.tableHeaderRow, { borderBottomColor: theme.border }]}>
              <ThemedText style={[styles.tableHeaderText, { flex: isLargeScreen ? 2 : 1.5 }]}>{t('invitation.location')}</ThemedText>
              <ThemedText style={[styles.tableHeaderText, { flex: 1 }]}>{t('parking.floor')}</ThemedText>
              <ThemedText style={[styles.tableHeaderText, { flex: isLargeScreen ? 1.5 : 1.2 }]}>{t('form.time')}</ThemedText>
              <ThemedText style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>{t('buffet.numberOfGuests')}</ThemedText>
              <ThemedText style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>{t('status.active')}</ThemedText>
              {isLargeScreen && <View style={{ width: 40 }} />}
            </DirectionalRow>

            {locations.map((location) => (
              <DirectionalRow
                key={location.id}
                style={[styles.tableRow, { borderBottomColor: theme.border }]}
              >
                <ThemedText style={[styles.tableCellText, { flex: isLargeScreen ? 2 : 1.5 }]} numberOfLines={2}>
                  {location.name}
                </ThemedText>
                <ThemedText style={[styles.tableCellText, { flex: 1, color: theme.textSecondary }]} numberOfLines={1}>
                  {location.floor}
                </ThemedText>
                <ThemedText style={[styles.tableCellText, { flex: isLargeScreen ? 1.5 : 1.2, color: theme.textSecondary, fontSize: 12 }]} numberOfLines={2}>
                  {location.hours}
                </ThemedText>
                <ThemedText style={[styles.tableCellText, { flex: 0.8, color: theme.textSecondary, textAlign: 'center' }]}>
                  {location.capacity}
                </ThemedText>
                <View style={{ flex: 0.8, alignItems: 'center', justifyContent: 'center' }}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: location.active ? theme.success + '20' : theme.textSecondary + '20' },
                    ]}
                  >
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: location.active ? theme.success : theme.textSecondary, fontSize: 11 },
                      ]}
                    >
                      {location.active ? t('status.active') : t('status.inactive')}
                    </ThemedText>
                  </View>
                </View>
                {isLargeScreen && (
                  <Pressable
                    style={styles.editButton}
                    onPress={() => openEditLocationModal(location)}
                  >
                    <DDIcon name="edit-2" size={16} variant="primary" />
                  </Pressable>
                )}
                {!isLargeScreen && (
                  <Pressable
                    style={styles.editButtonMobile}
                    onPress={() => openEditLocationModal(location)}
                  >
                    <DDIcon name="edit-2" size={14} variant="primary" />
                  </Pressable>
                )}
              </DirectionalRow>
            ))}
          </ThemedView>
        </>
      ) : (
        <>
          <KPICardRow>
            <KPICard
              title={t('dashboard.totalStaff')}
              value={stats.staff.total}
              icon="users"
              color={theme.primary}
            />
            <KPICard
              title={t('dashboard.onDuty')}
              value={stats.staff.onDuty}
              icon="check-circle"
              color={theme.success}
            />
            <KPICard
              title={t('status.active')}
              value={stats.staff.active}
              icon="users"
              color={theme.info}
            />
          </KPICardRow>

          <Spacer height={Spacing.xl} />

          {MOCK_STAFF.map((staff, index) => (
            <View key={staff.id}>
              <ThemedView style={[styles.staffCard, { backgroundColor: theme.surface }]}>
                <DirectionalRow style={styles.staffHeader}>
                  <View style={[styles.staffAvatar, { backgroundColor: theme.primary + '20' }]}>
                    <ThemedText style={[Typography.subtitle, { color: theme.primary }]}>
                      {staff.name.split(' ').map(n => n[0]).join('')}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[Typography.subtitle]}>
                      {staff.name}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                      {staff.role}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(staff.status) + '20' },
                    ]}
                  >
                    <DDIcon
                      name={staff.status === 'on_duty' ? 'check-circle' : staff.status === 'active' ? 'circle' : 'x-circle'}
                      size={12}
                      color={getStatusColor(staff.status)}
                    />
                    <Spacer width={Spacing.xs / 2} />
                    <ThemedText
                      style={[Typography.caption, { color: getStatusColor(staff.status) }]}
                    >
                      {getStatusLabel(staff.status)}
                    </ThemedText>
                  </View>
                </DirectionalRow>

                <Spacer height={Spacing.md} />

                <View style={styles.staffDetails}>
                  <DirectionalRow style={styles.staffDetailRow}>
                    <DDIcon name="map-pin" size={16} variant="muted" />
                    <Spacer width={Spacing.xs} />
                    <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                      {staff.assignedLocation}
                    </ThemedText>
                  </DirectionalRow>
                  <DirectionalRow style={styles.staffDetailRow}>
                    <DDIcon name="clock" size={16} variant="muted" />
                    <Spacer width={Spacing.xs} />
                    <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                      {staff.shift}
                    </ThemedText>
                  </DirectionalRow>
                  <DirectionalRow style={styles.staffDetailRow}>
                    <DDIcon name="phone" size={16} variant="muted" />
                    <Spacer width={Spacing.xs} />
                    <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                      {staff.phone}
                    </ThemedText>
                  </DirectionalRow>
                </View>
              </ThemedView>
              {index < MOCK_STAFF.length - 1 && <Spacer height={Spacing.md} />}
            </View>
          ))}
        </>
      )}

      <Spacer height={Spacing.xl} />

      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeLocationModal}
      >
        <View style={[styles.modalOverlay, createModalOverlayStyle(theme, '50')]}>
          <ThemedView style={[styles.modalContent, { backgroundColor: theme.background }]}>
            {Platform.OS === 'web' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <DirectionalRow style={styles.modalHeader}>
                  <ThemedText style={[Typography.subtitle]}>
                    {editingLocation ? t('common.edit') : t('common.save')}
                  </ThemedText>
                  <Pressable onPress={closeLocationModal}>
                    <DDIcon name="x" size={24} />
                  </Pressable>
                </DirectionalRow>

                <Spacer height={Spacing.lg} />

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('form.fullName')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('form.enterFullName')}
                  placeholderTextColor={theme.textSecondary}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('parking.floor')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('parking.floor')}
                  placeholderTextColor={theme.textSecondary}
                  value={formData.floor}
                  onChangeText={(text) => setFormData({ ...formData, floor: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('form.time')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder="7:00 AM - 6:00 PM"
                  placeholderTextColor={theme.textSecondary}
                  value={formData.hours}
                  onChangeText={(text) => setFormData({ ...formData, hours: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('buffet.numberOfGuests')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder="150"
                  placeholderTextColor={theme.textSecondary}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('status.active')}
                </ThemedText>
                <DirectionalRow style={styles.statusToggleContainer}>
                  <Pressable
                    style={[
                      styles.statusToggleButton,
                      { 
                        backgroundColor: formData.active ? theme.success : theme.surface,
                        borderColor: formData.active ? theme.success : theme.border,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, active: true })}
                  >
                    <ThemedText style={[Typography.bodySmall, { color: formData.active ? theme.buttonText : theme.text }]}>
                      {t('status.active')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.statusToggleButton,
                      { 
                        backgroundColor: !formData.active ? theme.textSecondary : theme.surface,
                        borderColor: !formData.active ? theme.textSecondary : theme.border,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, active: false })}
                  >
                    <ThemedText style={[Typography.bodySmall, { color: !formData.active ? theme.buttonText : theme.text }]}>
                      {t('status.inactive')}
                    </ThemedText>
                  </Pressable>
                </DirectionalRow>
              </View>

              <Spacer height={Spacing.lg} />

              <DirectionalRow style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={closeLocationModal}
                >
                  <ThemedText style={[Typography.body, { color: theme.text }]}>
                    {t('common.cancel')}
                  </ThemedText>
                </Pressable>
                <Spacer width={Spacing.md} />
                <Pressable
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={handleSaveLocation}
                >
                  <ThemedText style={[Typography.body, { color: theme.buttonText, fontWeight: '600' }]}>
                    {t('common.save')}
                  </ThemedText>
                </Pressable>
              </DirectionalRow>
              </ScrollView>
            ) : (
              <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
                <DirectionalRow style={styles.modalHeader}>
                  <ThemedText style={[Typography.subtitle]}>
                    {editingLocation ? t('common.edit') : t('common.save')}
                  </ThemedText>
                  <Pressable onPress={closeLocationModal}>
                    <DDIcon name="x" size={24} />
                  </Pressable>
                </DirectionalRow>

                <Spacer height={Spacing.lg} />

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('form.fullName')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('form.enterFullName')}
                  placeholderTextColor={theme.textSecondary}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('parking.floor')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('parking.floor')}
                  placeholderTextColor={theme.textSecondary}
                  value={formData.floor}
                  onChangeText={(text) => setFormData({ ...formData, floor: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('form.time')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder="7:00 AM - 6:00 PM"
                  placeholderTextColor={theme.textSecondary}
                  value={formData.hours}
                  onChangeText={(text) => setFormData({ ...formData, hours: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('buffet.numberOfGuests')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder="150"
                  placeholderTextColor={theme.textSecondary}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('status.active')}
                </ThemedText>
                <DirectionalRow style={styles.statusToggleContainer}>
                  <Pressable
                    style={[
                      styles.statusToggleButton,
                      { 
                        backgroundColor: formData.active ? theme.success : theme.surface,
                        borderColor: formData.active ? theme.success : theme.border,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, active: true })}
                  >
                    <ThemedText style={[Typography.bodySmall, { color: formData.active ? theme.buttonText : theme.text }]}>
                      {t('status.active')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.statusToggleButton,
                      { 
                        backgroundColor: !formData.active ? theme.textSecondary : theme.surface,
                        borderColor: !formData.active ? theme.textSecondary : theme.border,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, active: false })}
                  >
                    <ThemedText style={[Typography.bodySmall, { color: !formData.active ? theme.buttonText : theme.text }]}>
                      {t('status.inactive')}
                    </ThemedText>
                  </Pressable>
                </DirectionalRow>
              </View>

              <Spacer height={Spacing.lg} />

              <DirectionalRow style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={closeLocationModal}
                >
                  <ThemedText style={[Typography.body, { color: theme.text }]}>
                    {t('common.cancel')}
                  </ThemedText>
                </Pressable>
                <Spacer width={Spacing.md} />
                <Pressable
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={handleSaveLocation}
                >
                  <ThemedText style={[Typography.body, { color: theme.buttonText, fontWeight: '600' }]}>
                    {t('common.save')}
                  </ThemedText>
                </Pressable>
              </DirectionalRow>
              </KeyboardAwareScrollView>
            )}
          </ThemedView>
        </View>
      </Modal>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  locationsCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  locationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableHeaderText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableCellText: {
    ...Typography.bodySmall,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  editButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonMobile: {
    position: 'absolute',
    end: 0,
    top: Spacing.md,
    padding: Spacing.xs,
  },
  staffCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: Spacing.md,
  },
  staffDetails: {
    gap: Spacing.sm,
  },
  staffDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  statusToggleContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statusToggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
});
