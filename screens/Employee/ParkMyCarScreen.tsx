import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Modal, Animated, ScrollView } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon } from "@/components/DDIcon";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useServerTimezone } from "@/hooks/useServerTimezone";
import { toServerTimeString } from "@/services/utils/dateTimeUtils";
import { useCreateSelfValetRequestMutation } from "@/hooks/queries/useValetSelfServiceQueries";
import { applyOpacity, createModalOverlayStyle } from "@/utils/statusStyles";
import { TimePicker } from "@/components/TimePicker";
import type { ParkMyCarScreenProps } from "@/types/employeeNavigation.types";
import type { Theme } from "@/types/theme.types";

const COLOR_OPTIONS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown'];
const DROP_OFF_LOCATIONS = ['SKBC Main Entrance', 'SKBC Side Entrance', 'Tower A Lobby', 'Tower B Lobby'];

const ColorChip = ({ 
  color, 
  isSelected, 
  onPress, 
  theme 
}: { 
  color: string; 
  isSelected: boolean; 
  onPress: () => void;
  theme: Theme;
}) => {
  const getColorValue = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      'White': '#FFFFFF',
      'Black': '#1A1A1A',
      'Silver': '#C0C0C0',
      'Gray': '#808080',
      'Red': '#E53935',
      'Blue': '#307BF2',
      'Green': '#1BBE7A',
      'Brown': '#8B4513',
    };
    return colorMap[colorName] || theme.textSecondary;
  };

  const colorValue = getColorValue(color);
  const needsBorder = color === 'White' || color === 'Silver';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.colorChip,
        { 
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
          backgroundColor: theme.surface,
        }
      ]}
    >
      <View 
        style={[
          styles.colorCircle, 
          { 
            backgroundColor: colorValue,
            borderWidth: needsBorder ? 1 : 0,
            borderColor: theme.border,
          }
        ]} 
      />
      <ThemedText style={[
        Typography.caption, 
        { 
          color: isSelected ? theme.primary : theme.textSecondary,
          fontWeight: isSelected ? '600' : '400',
          marginTop: 4,
        }
      ]}>
        {color}
      </ThemedText>
    </Pressable>
  );
};

export default function ParkMyCarScreen({ navigation }: ParkMyCarScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime } = useFormatters();
  const insets = useSafeAreaInsets();
  const serverTimezone = useServerTimezone();
  const createMutation = useCreateSelfValetRequestMutation();

  const scrollContentStyle = {
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [dropOffLocation, setDropOffLocation] = useState('SKBC Main Entrance');
  const [returnTime, setReturnTime] = useState<Date>(() => {
    const time = new Date();
    time.setHours(17, 0, 0, 0);
    return time;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (showSuccessModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleCloseSuccessModal();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const handleCloseSuccessModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessModal(false);
      navigation.goBack();
    });
  };


  const handleTimeSelect = (time: Date) => {
    setReturnTime(time);
    if (errors.returnTime) {
      setErrors({ ...errors, returnTime: '' });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!plateNumber.trim()) {
      newErrors.plateNumber = 'Plate number is required';
    }

    if (!make.trim()) {
      newErrors.make = 'Brand/Make is required';
    }

    if (!model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (!selectedColor) {
      newErrors.color = 'Please select a color';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearForm = () => {
    setPlateNumber('');
    setMake('');
    setModel('');
    setSelectedColor('');
    setDropOffLocation('SKBC Main Entrance');
    setReturnTime(() => {
      const time = new Date();
      time.setHours(17, 0, 0, 0);
      return time;
    });
    setNotes('');
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        'Validation Error',
        'Please fill in all required fields',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await createMutation.mutateAsync({
        vehicleInfo: {
          make: make.trim(),
          model: model.trim(),
          color: selectedColor,
          plateNumber: plateNumber.trim().toUpperCase(),
        },
        dropOffLocation,
        requestedReturnTime: toServerTimeString(returnTime, serverTimezone),
        notes: notes.trim() || undefined,
      });

      setSuccessMessage('Your valet request has been submitted successfully!');
      setShowSuccessModal(true);
      clearForm();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to submit valet request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <>
      <ScreenKeyboardAwareScrollView contentContainerStyle={scrollContentStyle}>
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: theme.primary + '20' }]}>
                <DDIcon name="truck" size={20} variant="primary" />
              </View>
              <View style={{ marginStart: Spacing.md }}>
                <ThemedText style={[Typography.subtitle]}>Request Valet Service</ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  Park your car with our valet team
                </ThemedText>
              </View>
            </View>

            <Spacer height={Spacing.xl} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
              PLATE NUMBER *
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: errors.plateNumber ? theme.error : theme.border,
                  color: theme.text
                }
              ]}
              placeholder="e.g., ABC 1234"
              placeholderTextColor={theme.textSecondary}
              value={plateNumber}
              onChangeText={(text) => {
                setPlateNumber(text.toUpperCase());
                if (errors.plateNumber) {
                  setErrors({ ...errors, plateNumber: '' });
                }
              }}
              autoCapitalize="characters"
            />
            {errors.plateNumber ? (
              <>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: theme.error }]}>
                  {errors.plateNumber}
                </ThemedText>
              </>
            ) : null}

            <Spacer height={Spacing.lg} />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
                  BRAND/MAKE *
                </ThemedText>
                <Spacer height={Spacing.xs} />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.background,
                      borderColor: errors.make ? theme.error : theme.border,
                      color: theme.text
                    }
                  ]}
                  placeholder="e.g., Toyota"
                  placeholderTextColor={theme.textSecondary}
                  value={make}
                  onChangeText={(text) => {
                    setMake(text);
                    if (errors.make) {
                      setErrors({ ...errors, make: '' });
                    }
                  }}
                />
                {errors.make ? (
                  <>
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[Typography.caption, { color: theme.error }]}>
                      {errors.make}
                    </ThemedText>
                  </>
                ) : null}
              </View>

              <View style={styles.halfInput}>
                <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
                  MODEL *
                </ThemedText>
                <Spacer height={Spacing.xs} />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.background,
                      borderColor: errors.model ? theme.error : theme.border,
                      color: theme.text
                    }
                  ]}
                  placeholder="e.g., Camry"
                  placeholderTextColor={theme.textSecondary}
                  value={model}
                  onChangeText={(text) => {
                    setModel(text);
                    if (errors.model) {
                      setErrors({ ...errors, model: '' });
                    }
                  }}
                />
                {errors.model ? (
                  <>
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[Typography.caption, { color: theme.error }]}>
                      {errors.model}
                    </ThemedText>
                  </>
                ) : null}
              </View>
            </View>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
              COLOR *
            </ThemedText>
            <Spacer height={Spacing.sm} />
            <View style={styles.colorChipsContainer}>
              {COLOR_OPTIONS.map((color) => (
                <ColorChip
                  key={color}
                  color={color}
                  isSelected={selectedColor === color}
                  onPress={() => {
                    setSelectedColor(color);
                    if (errors.color) {
                      setErrors({ ...errors, color: '' });
                    }
                  }}
                  theme={theme}
                />
              ))}
            </View>
            {errors.color ? (
              <>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: theme.error }]}>
                  {errors.color}
                </ThemedText>
              </>
            ) : null}

            <Spacer height={Spacing.xl} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
              DROP-OFF LOCATION
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <Pressable
              style={[
                styles.iconInputButton,
                { backgroundColor: theme.background, borderColor: theme.border }
              ]}
              onPress={() => setShowLocationPicker(true)}
            >
              <DDIcon name="map-pin" size={20} variant="muted" />
              <ThemedText style={[Typography.body, { flex: 1, marginStart: Spacing.sm }]}>
                {dropOffLocation}
              </ThemedText>
              <DDIcon name="chevron-down" size={20} variant="muted" />
            </Pressable>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
              REQUESTED RETURN TIME
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <Pressable
              style={[
                styles.iconInputButton,
                { backgroundColor: theme.background, borderColor: theme.border }
              ]}
              onPress={() => setShowTimePicker(true)}
            >
              <DDIcon name="clock" size={20} variant="muted" />
              <ThemedText style={[Typography.body, { flex: 1, marginStart: Spacing.sm }]}>
                {formatTime(returnTime)}
              </ThemedText>
              <DDIcon name="chevron-down" size={20} variant="muted" />
            </Pressable>

            <Spacer height={Spacing.lg} />

            <ThemedText style={[Typography.label, { color: theme.textSecondary }]}>
              NOTES (OPTIONAL)
            </ThemedText>
            <Spacer height={Spacing.xs} />
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                  textAlignVertical: 'top',
                }
              ]}
              placeholder="Any special instructions..."
              placeholderTextColor={theme.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <Spacer height={Spacing.xl} />

            <LoadingButton
              onPress={handleSubmit}
              loading={createMutation.isPending}
            >
              Submit Request
            </LoadingButton>
          </ThemedView>
        </View>
      </ScreenKeyboardAwareScrollView>

      <TimePicker
        visible={showTimePicker}
        selectedTime={returnTime}
        onTimeSelect={handleTimeSelect}
        onClose={() => setShowTimePicker(false)}
      />

      <Modal
        visible={showLocationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <Pressable
          style={[styles.modalOverlay, createModalOverlayStyle(theme, '50')]}
          onPress={() => setShowLocationPicker(false)}
        >
          <View style={[styles.locationPickerContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.locationPickerHeader, { borderBottomColor: theme.border }]}>
              <DDIcon name="map-pin" size={20} variant="primary" />
              <ThemedText style={[Typography.subtitle, { flex: 1, marginStart: Spacing.sm }]}>
                Select Location
              </ThemedText>
              <Pressable onPress={() => setShowLocationPicker(false)}>
                <DDIcon name="x" size={24} variant="muted" />
              </Pressable>
            </View>
            <ScrollView>
              {DROP_OFF_LOCATIONS.map((location) => (
                <Pressable
                  key={location}
                  style={[
                    styles.locationOption,
                    { borderBottomColor: theme.border },
                    dropOffLocation === location && { backgroundColor: applyOpacity(theme.primary, '10') }
                  ]}
                  onPress={() => {
                    setDropOffLocation(location);
                    setShowLocationPicker(false);
                  }}
                >
                  <ThemedText style={[Typography.body, dropOffLocation === location && { color: theme.primary, fontWeight: '600' }]}>
                    {location}
                  </ThemedText>
                  {dropOffLocation === location ? (
                    <DDIcon name="check" size={20} variant="primary" />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="none"
        onRequestClose={handleCloseSuccessModal}
      >
        <Pressable
          style={[styles.modalOverlay, createModalOverlayStyle(theme, '50')]}
          onPress={handleCloseSuccessModal}
        >
          <Animated.View
            style={[
              styles.successModal,
              { backgroundColor: theme.surface },
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}
          >
            <View style={[styles.successIconContainer, { backgroundColor: applyOpacity(theme.success, '15') }]}>
              <DDIcon name="check-circle" size={48} color={theme.success} />
            </View>
            <Spacer height={Spacing.lg} />
            <ThemedText style={[Typography.subtitle, { textAlign: 'center' }]}>
              Request Submitted!
            </ThemedText>
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
              {successMessage}
            </ThemedText>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 80,
  },
  iconInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  colorChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorChip: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 64,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  locationPickerContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  locationPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  successModal: {
    width: '100%',
    maxWidth: 320,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
