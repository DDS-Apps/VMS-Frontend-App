import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { LoadingButton } from "@/components/shared/LoadingButton";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateBuffetAdminLocationMutation } from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminCreateLocationScreenProps } from "@/types/buffetAdminNavigation.types";

type StatusType = 'idle' | 'success' | 'error';

export default function BuffetAdminCreateLocationScreen({ navigation }: BuffetAdminCreateLocationScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  
  const createLocationMutation = useCreateBuffetAdminLocationMutation();

  const [name, setName] = useState('');
  const [floor, setFloor] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<StatusType>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'BuffetLocations' }],
          })
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, navigation]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 100
  };

  const isFormValid = name.trim().length > 0;

  const handleSubmit = () => {
    if (!isFormValid) {
      setStatus('error');
      setErrorMessage(t('buffet.locationNameRequired'));
      return;
    }

    setStatus('idle');
    setErrorMessage('');

    createLocationMutation.mutate(
      {
        name: name.trim(),
        floor: floor.trim() || undefined,
        building: building.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setStatus('success');
        },
        onError: (error: Error) => {
          setStatus('error');
          setErrorMessage(error.message || t('common.errorOccurred'));
        },
      }
    );
  };

  const renderStatusBanner = () => {
    if (status === 'idle') return null;

    const isSuccess = status === 'success';
    const backgroundColor = isSuccess ? Colors.brand.brandGreen : Colors.status.error;
    const message = isSuccess ? t('buffet.locationCreated') : errorMessage;
    const iconName = isSuccess ? 'check-circle' : 'alert-circle';

    return (
      <View style={[styles.statusBanner, { backgroundColor }]}>
        <Feather name={iconName} size={20} color="#FFFFFF" />
        <ThemedText style={styles.statusText}>{message}</ThemedText>
      </View>
    );
  };

  return (
    <ScreenKeyboardAwareScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[styles.title, { color: theme.text }]}>
        {t('buffet.createLocation')}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      {renderStatusBanner()}
      {status !== 'idle' && <Spacer height={Spacing.md} />}

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text }]}>
          {t('buffet.locationName')} *
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
              
            }
          ]}
          value={name}
          onChangeText={setName}
          placeholder={t('buffet.locationNamePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          editable={status !== 'success'}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text }]}>
          {t('buffet.building')}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
              
            }
          ]}
          value={building}
          onChangeText={setBuilding}
          placeholder={t('buffet.buildingPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          editable={status !== 'success'}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text }]}>
          {t('buffet.floor')}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
              
            }
          ]}
          value={floor}
          onChangeText={setFloor}
          placeholder={t('buffet.floorPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          editable={status !== 'success'}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text }]}>
          {t('buffet.capacity')}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
              
            }
          ]}
          value={capacity}
          onChangeText={setCapacity}
          placeholder={t('buffet.capacityPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          editable={status !== 'success'}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text }]}>
          {t('buffet.description')}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
              
            }
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('buffet.descriptionPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={status !== 'success'}
        />
      </View>

      <Spacer height={Spacing.xl} />

      <LoadingButton
        onPress={handleSubmit}
        loading={createLocationMutation.isPending}
        disabled={!isFormValid || createLocationMutation.isPending || status === 'success'}
        variant="primary"
        size="large"
        fullWidth
      >
        {status === 'success' ? t('common.success') : t('common.create')}
      </LoadingButton>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  formGroup: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.sm,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
