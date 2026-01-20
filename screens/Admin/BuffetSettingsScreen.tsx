import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { DDIcon } from '@/components/DDIcon';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { ThemedText } from '@/components/ThemedText';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';

interface BuffetLocation {
  id: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  amenities: string[];
  status: 'active' | 'inactive';
}

const MOCK_BUFFET_LOCATIONS: BuffetLocation[] = [
  {
    id: 'b1',
    name: 'Executive Dining Room',
    building: 'Main Building',
    floor: 'Ground Floor',
    capacity: 20,
    amenities: ['WiFi', 'Projector', 'Whiteboard'],
    status: 'active',
  },
  {
    id: 'b2',
    name: 'Conference Hall Buffet',
    building: 'Conference Hall',
    floor: '1st Floor',
    capacity: 50,
    amenities: ['WiFi', 'Sound System', 'Large Screen'],
    status: 'active',
  },
  {
    id: 'b3',
    name: 'Meeting Room A Catering',
    building: 'Building 2',
    floor: '2nd Floor',
    capacity: 15,
    amenities: ['WiFi', 'Projector'],
    status: 'active',
  },
  {
    id: 'b4',
    name: 'Boardroom Dining',
    building: 'Executive Tower',
    floor: 'Top Floor',
    capacity: 12,
    amenities: ['WiFi', 'Projector', 'Video Conference'],
    status: 'inactive',
  },
  {
    id: 'b5',
    name: 'VIP Lounge Catering',
    building: 'Main Building',
    floor: '5th Floor',
    capacity: 30,
    amenities: ['WiFi', 'Mini Bar', 'Sound System'],
    status: 'active',
  },
  {
    id: 'b6',
    name: 'Garden Terrace Dining',
    building: 'Building 3',
    floor: 'Rooftop',
    capacity: 40,
    amenities: ['WiFi', 'Outdoor Seating', 'Projector'],
    status: 'active',
  },
];

export default function BuffetSettingsScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation(); const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<BuffetLocation[]>(MOCK_BUFFET_LOCATIONS);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<BuffetLocation | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: '',
    capacity: '',
    status: 'active' as 'active' | 'inactive',
  });

  const handleAddLocation = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      building: '',
      floor: '',
      capacity: '',
      status: 'active',
    });
    setShowModal(true);
  };

  const handleEditLocation = (location: BuffetLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      building: location.building,
      floor: location.floor,
      capacity: location.capacity.toString(),
      status: location.status,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.building || !formData.floor || !formData.capacity) {
      Alert.alert(t('common.error'), t('form.fieldRequired'));
      return;
    }
    Alert.alert(t('common.success'), t('common.save'));
    setShowModal(false);
  };

  return (
    <>
      <ScreenScrollView>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <ThemedText style={[Typography.title, { fontWeight: '700' }]}>{t('navigation.buffetLocations')}</ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
            {locations.length} {t('navigation.locations').toLowerCase()}
          </ThemedText>
        </View>

        <View style={styles.container}>
          {locations.map((location) => (
            <Pressable
              key={location.id}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => handleEditLocation(location)}
            >
              <DirectionalRow style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[Typography.subtitle, { fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>{location.name}</ThemedText>
                  <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
                    {location.building} • {location.floor}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: location.status === 'active' ? theme.success + '20' : theme.textSecondary + '20',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: location.status === 'active' ? theme.success : theme.textSecondary,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      },
                    ]}
                  >
                    {location.status === 'active' ? t('status.active') : t('status.inactive')}
                  </ThemedText>
                </View>
              </DirectionalRow>

              <View style={styles.cardContent}>
                <DirectionalRow style={styles.infoRow}>
                  <DDIcon name="users" variant="muted" size={16} />
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, marginEnd: Spacing.sm, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('buffet.numberOfGuests')}: {location.capacity}
                  </ThemedText>
                </DirectionalRow>

                {location.amenities.length > 0 ? (
                  <DirectionalRow style={[styles.infoRow, { marginTop: Spacing.sm }]}>
                    <DDIcon name="check-circle" variant="muted" size={16} />
                    <View style={{ flex: 1, marginStart: Spacing.sm }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true}>
                        <View style={styles.amenitiesContainer}>
                          {location.amenities.map((amenity, idx) => (
                            <View
                              key={idx}
                              style={[styles.amenityTag, { backgroundColor: theme.background, borderColor: theme.border }]}
                            >
                              <ThemedText style={[Typography.caption, { fontSize: 11 }]}>{amenity}</ThemedText>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  </DirectionalRow>
                ) : null}
              </View>

              <DirectionalRow style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                <Pressable style={[styles.actionButton, { flexDirection: getFlexDirection(isRTL) }]}>
                  <DDIcon name="edit-2" size={16} variant="primary" />
                  <ThemedText style={[Typography.body, { color: theme.primary, marginEnd: Spacing.xs }]}>
                    {t('common.edit')}
                  </ThemedText>
                </Pressable>
              </DirectionalRow>
            </Pressable>
          ))}

          {locations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <DDIcon name="cloche" variant="muted" size={48} />
              <Spacer height={Spacing.md} />
              <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
                {t('common.noResults')}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </ScreenScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + Spacing.xl }]}
        onPress={handleAddLocation}
      >
        <DDIcon name="plus" size={24} color={theme.buttonText} />
      </Pressable>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <ScrollView
              style={[styles.modalContent, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.xl }]}
              showsVerticalScrollIndicator={false}
            >
              <DirectionalRow style={styles.modalHeader}>
                <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
                  {editingLocation ? t('common.edit') : t('common.save')}
                </ThemedText>
                <Pressable onPress={() => setShowModal(false)}>
                  <DDIcon name="x" size={24} variant="muted" />
                </Pressable>
              </DirectionalRow>

              <View style={styles.formContainer}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('form.fullName')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder={t('form.enterFullName')}
                  placeholderTextColor={theme.textSecondary}
                />

                <Spacer height={Spacing.md} />

                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('invitation.location')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={formData.building}
                  onChangeText={(text) => setFormData({ ...formData, building: text })}
                  placeholder={t('invitation.location')}
                  placeholderTextColor={theme.textSecondary}
                />

                <Spacer height={Spacing.md} />

                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>{t('parking.floor')} *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={formData.floor}
                  onChangeText={(text) => setFormData({ ...formData, floor: text })}
                  placeholder={t('parking.floor')}
                  placeholderTextColor={theme.textSecondary}
                />

                <Spacer height={Spacing.md} />

                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
                  {t('buffet.numberOfGuests')} *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                  placeholder="20"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                />

                <Spacer height={Spacing.md} />

                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>{t('status.active')}</ThemedText>
                <DirectionalRow style={styles.statusOptions}>
                  <Pressable
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: formData.status === 'active' ? theme.success : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, status: 'active' })}
                  >
                    <ThemedText style={[Typography.body, { color: formData.status === 'active' ? theme.buttonText : theme.text }]}>
                      {t('status.active')}
                    </ThemedText>
                  </Pressable>
                  <View style={{ width: Spacing.md }} />
                  <Pressable
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: formData.status === 'inactive' ? theme.textSecondary : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, status: 'inactive' })}
                  >
                    <ThemedText style={[Typography.body, { color: formData.status === 'inactive' ? theme.buttonText : theme.text }]}>
                      {t('status.inactive')}
                    </ThemedText>
                  </Pressable>
                </DirectionalRow>

                <Spacer height={Spacing.lg} />

                <LoadingButton
                  onPress={handleSave}
                  variant="primary"
                  size="medium"
                  fullWidth
                >
                  {t('common.save')}
                </LoadingButton>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    alignItems: 'flex-start',
    padding: Spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  cardContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  infoRow: {
    alignItems: 'center',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  amenityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
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
  statusOptions: {
  },
  statusOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
});
