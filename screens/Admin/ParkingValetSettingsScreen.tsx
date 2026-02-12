import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenFlatList } from '@/components/ScreenFlatList';
import { DDIcon } from '@/components/DDIcon';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography, getInputFontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { DirectionalRow } from '@/components/DirectionalRow';

interface ParkingArea {
  id: string;
  name: string;
  location: string;
  totalSpots: number;
  availableSpots: number;
  type: 'visitor' | 'vip' | 'staff' | 'general';
}

interface ValetZone {
  id: string;
  name: string;
  location: string;
  capacity: number;
  activeDrivers: number;
}

const MOCK_PARKING_AREAS: ParkingArea[] = [
  { id: 'p1', name: 'Visitor Parking A', location: 'Main Building - Level 1', totalSpots: 50, availableSpots: 12, type: 'visitor' },
  { id: 'p2', name: 'VIP Parking', location: 'Main Building - Ground Floor', totalSpots: 20, availableSpots: 5, type: 'vip' },
  { id: 'p3', name: 'Staff Parking B', location: 'Building 2 - Level 2', totalSpots: 100, availableSpots: 45, type: 'staff' },
  { id: 'p4', name: 'General Parking C', location: 'Building 3 - Outdoor', totalSpots: 80, availableSpots: 60, type: 'general' },
];

const MOCK_VALET_ZONES: ValetZone[] = [
  { id: 'v1', name: 'Main Entrance Valet', location: 'SKBC Main Entrance', capacity: 30, activeDrivers: 4 },
  { id: 'v2', name: 'Executive Tower Valet', location: 'Executive Tower Lobby', capacity: 20, activeDrivers: 2 },
  { id: 'v3', name: 'Conference Hall Valet', location: 'Conference Hall Entrance', capacity: 15, activeDrivers: 3 },
];

export default function ParkingValetSettingsScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'parking' | 'valet'>('parking');
  const [parkingAreas, setParkingAreas] = useState<ParkingArea[]>(MOCK_PARKING_AREAS);
  const [valetZones, setValetZones] = useState<ValetZone[]>(MOCK_VALET_ZONES);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ParkingArea | ValetZone | null>(null);
  const [modalType, setModalType] = useState<'parking' | 'valet'>('parking');

  const [parkingForm, setParkingForm] = useState({
    name: '',
    location: '',
    totalSpots: '',
    type: 'general' as ParkingArea['type'],
  });

  const [valetForm, setValetForm] = useState({
    name: '',
    location: '',
    capacity: '',
  });

  const handleAddParking = () => {
    setEditingItem(null);
    setModalType('parking');
    setParkingForm({ name: '', location: '', totalSpots: '', type: 'general' });
    setShowModal(true);
  };

  const handleAddValet = () => {
    setEditingItem(null);
    setModalType('valet');
    setValetForm({ name: '', location: '', capacity: '' });
    setShowModal(true);
  };

  const handleSaveParking = () => {
    if (!parkingForm.name || !parkingForm.location || !parkingForm.totalSpots) {
      Alert.alert(t('common.error'), t('form.fieldRequired'));
      return;
    }
    Alert.alert(t('common.success'), t('common.save'));
    setShowModal(false);
  };

  const handleSaveValet = () => {
    if (!valetForm.name || !valetForm.location || !valetForm.capacity) {
      Alert.alert(t('common.error'), t('form.fieldRequired'));
      return;
    }
    Alert.alert(t('common.success'), t('common.save'));
    setShowModal(false);
  };

  const getParkingTypeColor = (type: ParkingArea['type']) => {
    switch (type) {
      case 'visitor': return theme.primary;
      case 'vip': return theme.chartPurple;
      case 'staff': return theme.secondary;
      case 'general': return theme.textSecondary;
      default: return theme.textSecondary;
    }
  };

  const getParkingTypeLabel = (type: ParkingArea['type']) => {
    switch (type) {
      case 'visitor': return t('roles.visitor');
      case 'vip': return t('visitor.vip');
      case 'staff': return t('roles.employee');
      case 'general': return t('common.all');
      default: return type;
    }
  };

  const renderParkingArea = ({ item }: { item: ParkingArea }) => (
    <ThemedView style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      <DirectionalRow style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.xs }]}>
            {item.name}
          </ThemedText>
          <View style={[styles.badge, { backgroundColor: getParkingTypeColor(item.type) + '20' }]}>
            <ThemedText style={[Typography.caption, { color: getParkingTypeColor(item.type), fontWeight: '600', textTransform: 'uppercase' }]}>
              {getParkingTypeLabel(item.type)}
            </ThemedText>
          </View>
        </View>
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      <DirectionalRow style={styles.infoRow}>
        <DDIcon name="map-pin" variant="muted" size={16} />
        <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginEnd: Spacing.xs }]}>
          {item.location}
        </ThemedText>
      </DirectionalRow>

      <Spacer height={Spacing.sm} />

      <DirectionalRow style={[styles.statsRow, { borderTopColor: theme.border }]}>
        <View style={styles.stat}>
          <ThemedText style={[Typography.title, { fontWeight: '700', color: theme.text }]}>
            {item.totalSpots}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t('parking.totalSlots')}
          </ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText style={[Typography.title, { fontWeight: '700', color: theme.success }]}>
            {item.availableSpots}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t('status.available')}
          </ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText style={[Typography.title, { fontWeight: '700', color: theme.primary }]}>
            {item.totalSpots - item.availableSpots}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t('status.occupied')}
          </ThemedText>
        </View>
      </DirectionalRow>
    </ThemedView>
  );

  const renderValetZone = ({ item }: { item: ValetZone }) => (
    <ThemedView style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      <DirectionalRow style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.xs }]}>
            {item.name}
          </ThemedText>
        </View>
      </DirectionalRow>

      <Spacer height={Spacing.md} />

      <DirectionalRow style={styles.infoRow}>
        <DDIcon name="map-pin" variant="muted" size={16} />
        <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginEnd: Spacing.xs }]}>
          {item.location}
        </ThemedText>
      </DirectionalRow>

      <Spacer height={Spacing.sm} />

      <DirectionalRow style={[styles.statsRow, { borderTopColor: theme.border }]}>
        <View style={styles.stat}>
          <ThemedText style={[Typography.title, { fontWeight: '700', color: theme.text }]}>
            {item.capacity}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t('buffet.numberOfGuests')}
          </ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText style={[Typography.title, { fontWeight: '700', color: theme.success }]}>
            {item.activeDrivers}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t('dashboard.activeDrivers')}
          </ThemedText>
        </View>
      </DirectionalRow>
    </ThemedView>
  );

  const renderListHeader = () => (
    <>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <ThemedText style={[Typography.title, { fontWeight: '700' }]}>
          {t('navigation.parkingManagement')} & {t('navigation.valetService')}
        </ThemedText>
      </View>

      <DirectionalRow style={[styles.tabContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable
          style={[styles.tab, tab === 'parking' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('parking')}
        >
          <ThemedText style={[Typography.body, { color: tab === 'parking' ? theme.primary : theme.textSecondary, fontWeight: tab === 'parking' ? '600' : '400' }]}>
            {t('navigation.parkingSlots')}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'valet' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('valet')}
        >
          <ThemedText style={[Typography.body, { color: tab === 'valet' ? theme.primary : theme.textSecondary, fontWeight: tab === 'valet' ? '600' : '400' }]}>
            {t('navigation.valetService')}
          </ThemedText>
        </Pressable>
      </DirectionalRow>
    </>
  );

  return (
    <>
      {tab === 'parking' ? (
        <ScreenFlatList
          data={parkingAreas}
          renderItem={renderParkingArea}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={<View style={{ height: insets.bottom + 100 + Spacing.xl }} />}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md }}
        />
      ) : (
        <ScreenFlatList
          data={valetZones}
          renderItem={renderValetZone}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={<View style={{ height: insets.bottom + 100 + Spacing.xl }} />}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md }}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 80 + Spacing.lg }]}
        onPress={tab === 'parking' ? handleAddParking : handleAddValet}
      >
        <DDIcon name="plus" size={24} color={theme.buttonText} />
      </Pressable>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.xl }]}>
              <DirectionalRow style={styles.modalHeader}>
                <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
                  {modalType === 'parking' ? t('navigation.parkingSlots') : t('navigation.valetService')}
                </ThemedText>
                <Pressable onPress={() => setShowModal(false)}>
                  <DDIcon name="x" size={24} variant="muted" />
                </Pressable>
              </DirectionalRow>

              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {modalType === 'parking' ? (
                <>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                    {t('form.fullName')} *
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: getInputFontFamily(parkingForm.name, isRTL) }]}
                    value={parkingForm.name}
                    onChangeText={(text) => setParkingForm({ ...parkingForm, name: text })}
                    placeholder={t('form.enterFullName')}
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Spacer height={Spacing.md} />

                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                    {t('invitation.location')} *
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: getInputFontFamily(parkingForm.location, isRTL) }]}
                    value={parkingForm.location}
                    onChangeText={(text) => setParkingForm({ ...parkingForm, location: text })}
                    placeholder={t('invitation.location')}
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Spacer height={Spacing.md} />

                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                    {t('parking.totalSlots')} *
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: getInputFontFamily(parkingForm.totalSpots, isRTL) }]}
                    value={parkingForm.totalSpots}
                    onChangeText={(text) => setParkingForm({ ...parkingForm, totalSpots: text })}
                    placeholder="50"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                  />

                  <Spacer height={Spacing.lg} />

                  <LoadingButton
                    onPress={handleSaveParking}
                    variant="primary"
                    size="medium"
                    fullWidth
                  >
                    {t('common.save')}
                  </LoadingButton>
                </>
              ) : (
                <>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                    {t('form.fullName')} *
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: getInputFontFamily(valetForm.name, isRTL) }]}
                    value={valetForm.name}
                    onChangeText={(text) => setValetForm({ ...valetForm, name: text })}
                    placeholder={t('form.enterFullName')}
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Spacer height={Spacing.md} />

                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                    {t('invitation.location')} *
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: getInputFontFamily(valetForm.location, isRTL) }]}
                    value={valetForm.location}
                    onChangeText={(text) => setValetForm({ ...valetForm, location: text })}
                    placeholder={t('invitation.location')}
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Spacer height={Spacing.md} />

                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                    {t('buffet.numberOfGuests')} *
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: getInputFontFamily(valetForm.capacity, isRTL) }]}
                    value={valetForm.capacity}
                    onChangeText={(text) => setValetForm({ ...valetForm, capacity: text })}
                    placeholder="30"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                  />

                  <Spacer height={Spacing.lg} />

                  <LoadingButton
                    onPress={handleSaveValet}
                    variant="primary"
                    size="medium"
                    fullWidth
                  >
                    {t('common.save')}
                  </LoadingButton>
                </>
              )}
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  tabContainer: {
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  infoRow: {
    alignItems: 'center',
  },
  statsRow: {
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  stat: {
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    end: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    maxHeight: '75%',
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  formContainer: {
    paddingHorizontal: Spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
});
