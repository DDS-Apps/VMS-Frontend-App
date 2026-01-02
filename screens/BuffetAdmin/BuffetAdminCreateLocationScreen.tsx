import React, { useState } from "react";
import { View, StyleSheet, TextInput, Alert } from "react-native";
import { CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { LoadingButton } from "@/components/shared/LoadingButton";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateBuffetAdminLocationMutation } from "@/hooks/queries/useBuffetQueries";
import type { BuffetAdminCreateLocationScreenProps } from "@/types/buffetAdminNavigation.types";

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

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 100
  };

  const isFormValid = name.trim().length > 0;

  const handleSubmit = () => {
    if (!isFormValid) {
      Alert.alert(t('common.error'), t('buffet.locationNameRequired'));
      return;
    }

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
          Alert.alert(t('common.success'), t('buffet.locationCreated'), [
            {
              text: t('common.ok'),
              onPress: () => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'BuffetLocations' }],
                  })
                );
              },
            },
          ]);
        },
      }
    );
  };

  return (
    <ScreenKeyboardAwareScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[styles.title, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('buffet.createLocation')}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
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
              textAlign: isRTL ? 'right' : 'left',
            }
          ]}
          value={name}
          onChangeText={setName}
          placeholder={t('buffet.locationNamePlaceholder')}
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
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
              textAlign: isRTL ? 'right' : 'left',
            }
          ]}
          value={building}
          onChangeText={setBuilding}
          placeholder={t('buffet.buildingPlaceholder')}
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
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
              textAlign: isRTL ? 'right' : 'left',
            }
          ]}
          value={floor}
          onChangeText={setFloor}
          placeholder={t('buffet.floorPlaceholder')}
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
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
              textAlign: isRTL ? 'right' : 'left',
            }
          ]}
          value={capacity}
          onChangeText={setCapacity}
          placeholder={t('buffet.capacityPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
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
              textAlign: isRTL ? 'right' : 'left',
            }
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('buffet.descriptionPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <Spacer height={Spacing.xl} />

      <LoadingButton
        onPress={handleSubmit}
        loading={createLocationMutation.isPending}
        disabled={!isFormValid || createLocationMutation.isPending}
        variant="primary"
        size="large"
        fullWidth
      >
        {t('common.create')}
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
});
