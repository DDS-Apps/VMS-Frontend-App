import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, Platform, ActivityIndicator } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { DDIcon } from "@/components/DDIcon";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { LoadingButton } from "@/components/shared/LoadingButton";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { UserRole } from "@/types/vms.types";
import { applyOpacity } from "@/utils/statusStyles";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/api/authService";
import { useToast } from "@/contexts/ToastContext";
import { ApiException } from "@/api/errors";
import { shouldSwapChildrenForRTL } from "@/utils/rtlInitializer";

interface EditProfileScreenProps {
  userRole?: UserRole;
  userName?: string;
  userId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export default function EditProfileScreen({ 
  onSave,
  onCancel
}: EditProfileScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const shouldSwap = shouldSwapChildrenForRTL(isRTL);
  const { formatDate: fmtDate } = useFormatters();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(user?.department || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  // Refresh user data when screen gains focus and update form fields
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  // Update form fields when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phoneNumber ? formatSaudiPhone(user.phoneNumber) : '');
      setDepartment(user.department || '');
    }
  }, [user]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const formatSaudiPhone = (input: string): string => {
    let digits = input.replace(/\D/g, '');
    
    if (digits.startsWith('00966')) {
      digits = digits.substring(2);
    }
    
    if (digits.length > 0 && !digits.startsWith('966')) {
      if (digits.startsWith('0')) {
        digits = digits.substring(1);
      }
      digits = '966' + digits;
    }
    
    digits = digits.substring(0, 12);
    
    if (digits.length === 0) return '';
    if (digits.length <= 3) return '+' + digits;
    if (digits.length <= 5) return '+' + digits.substring(0, 3) + ' ' + digits.substring(3);
    if (digits.length <= 8) return '+' + digits.substring(0, 3) + ' ' + digits.substring(3, 5) + ' ' + digits.substring(5);
    return '+' + digits.substring(0, 3) + ' ' + digits.substring(3, 5) + ' ' + digits.substring(5, 8) + ' ' + digits.substring(8);
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatSaudiPhone(text));
  };

  const getRoleLabel = (role: string) => {
    const roleKeys: Record<string, string> = {
      employee: 'roles.employee',
      manager: 'roles.manager',
      building_admin: 'roles.buildingAdmin',
      buffet_admin: 'roles.buffetAdmin',
      buffet_staff: 'roles.buffetStaff',
      valet_admin: 'roles.valetAdmin',
      valet_driver: 'roles.valetDriver',
      visitor: 'roles.visitor',
      receptionist: 'roles.receptionist',
      security: 'roles.security',
    };
    return t(roleKeys[role] || 'roles.employee');
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; phone?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = t('form.fieldRequired');
    }
    
    if (phone.trim() && !/^[\d\s\-+()]+$/.test(phone)) {
      newErrors.phone = t('form.invalidPhone');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      await authService.updateProfile({
        name: name.trim(),
        phoneNumber: normalizedPhone || undefined,
        department: department.trim() || undefined,
      });
      
      await refreshUser();
      showSuccess(t('settings.profileUpdated'), t('common.success'));
      
      if (onSave) {
        onSave();
      }
    } catch (err) {
      const errorMessage = err instanceof ApiException 
        ? err.message 
        : t('common.errorOccurred');
      showError(errorMessage, t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        if (Platform.OS === 'web') {
          alert(t('permissions.photoLibraryRequired'));
        } else {
          Alert.alert(t('common.error'), t('permissions.photoLibraryRequired'));
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (err) {
      showError(t('common.errorOccurred'), t('common.error'));
    }
  };

  const uploadPhoto = async (uri: string) => {
    setIsUploadingPhoto(true);
    
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // On web, fetch the blob from the URI and use its MIME type for proper extension
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Determine file extension from blob's MIME type
        const mimeType = blob.type || 'image/jpeg';
        const extensionMap: Record<string, string> = {
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp',
        };
        const extension = extensionMap[mimeType] || '.jpg';
        const filename = `photo${extension}`;
        
        // Create a new File object with proper name and type
        // Field name must be 'photo' to match backend's FileInterceptor('photo')
        const file = new File([blob], filename, { type: mimeType });
        formData.append('photo', file);
      } else {
        // On native, extract filename from URI or use default
        const uriFilename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(uriFilename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        const filename = match ? uriFilename : 'photo.jpg';
        
        // Use the React Native-specific format
        // Field name must be 'photo' to match backend's FileInterceptor('photo')
        formData.append('photo', {
          uri,
          name: filename,
          type,
        } as any);
      }
      
      await authService.uploadPhoto(formData);
      await refreshUser();
      showSuccess(t('settings.photoUpdated'), t('common.success'));
    } catch (err) {
      const errorMessage = err instanceof ApiException 
        ? err.message 
        : t('common.errorOccurred');
      showError(errorMessage, t('common.error'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    const confirmDelete = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          resolve(confirm(t('settings.deletePhotoConfirm')));
        } else {
          Alert.alert(
            t('settings.deletePhoto'),
            t('settings.deletePhotoConfirm'),
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('common.delete'), style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        }
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    setIsDeletingPhoto(true);
    
    try {
      await authService.deletePhoto();
      await refreshUser();
      showSuccess(t('settings.photoDeleted'), t('common.success'));
    } catch (err) {
      const errorMessage = err instanceof ApiException 
        ? err.message 
        : t('common.errorOccurred');
      showError(errorMessage, t('common.error'));
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    error?: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default',
    editable: boolean = true
  ) => (
    <View style={styles.inputContainer}>
      <View style={[styles.labelRow, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <ThemedText style={[styles.inputLabel, { color: theme.text, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}>
          {label}
        </ThemedText>
        {!editable ? (
          <View style={[styles.readOnlyBadge, { backgroundColor: applyOpacity(theme.textSecondary, '15'), flexDirection: 'row', gap: 4 }]}>
            <DDIcon name="lock" size={10} color={theme.textSecondary} />
            <ThemedText style={[styles.readOnlyText, { color: theme.textSecondary }]}>
              {t('form.readOnly')}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: editable ? theme.surface : applyOpacity(theme.surfaceSecondary, '60'),
            borderColor: error ? theme.error : theme.border,
            color: editable ? theme.text : theme.textSecondary,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
      {error ? (
        <ThemedText style={[styles.errorText, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );

  const formatDate = (dateString: string) => {
    return fmtDate(new Date(dateString), 'medium');
  };

  const getInitials = () => {
    return (name || user?.name || '')
      .split(' ')
      .map(n => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasPhoto = user?.photoUrl || user?.thumbnailUrl;
  const photoUrl = user?.thumbnailUrl || user?.photoUrl;

  return (
    <ScreenKeyboardAwareScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title]}>
        {t('settings.editProfile')}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {t('settings.editProfileSubtitle')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {hasPhoto ? (
              <Image
                source={{ uri: photoUrl || undefined }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
                <ThemedText style={[Typography.title, { color: theme.primary, fontWeight: '700' }]}>
                  {getInitials()}
                </ThemedText>
              </View>
            )}
            {(isUploadingPhoto || isDeletingPhoto) ? (
              <View style={[styles.avatarOverlay, { backgroundColor: applyOpacity(theme.background, '70') }]}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : null}
          </View>
          <View style={[styles.photoButtons, { flexDirection: 'row' }]}>
            <LoadingButton
              onPress={handlePickPhoto}
              loading={isUploadingPhoto}
              disabled={isUploadingPhoto || isDeletingPhoto}
              variant="ghost"
              size="small"
              icon="camera"
              iconPosition="left"
            >
              {hasPhoto ? t('settings.changePhoto') : t('settings.addPhoto')}
            </LoadingButton>
            {hasPhoto ? (
              <LoadingButton
                onPress={handleDeletePhoto}
                loading={isDeletingPhoto}
                disabled={isUploadingPhoto || isDeletingPhoto}
                variant="danger"
                size="small"
                icon="trash-2"
                iconPosition="left"
              >
                {t('settings.deletePhoto')}
              </LoadingButton>
            ) : null}
          </View>
          <View style={styles.avatarInfo}>
            <ThemedText style={[styles.roleBadge, { color: theme.primary, backgroundColor: applyOpacity(theme.primary, '10') }]}>
              {getRoleLabel(user?.role || 'employee')}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.basicInfo')}
        </ThemedText>

        <Spacer height={Spacing.lg} />

        <View style={[styles.infoRow, { flexDirection: 'row' }]}>
          <View style={styles.infoItem}>
            <ThemedText style={[styles.infoLabel, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.status')}
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {user?.status === 'active' ? t('status.active') : t('status.inactive')}
            </ThemedText>
          </View>
          {user?.lastLogin ? (
            <View style={styles.infoItem}>
              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.lastLogin')}
              </ThemedText>
              <ThemedText style={[styles.infoValue, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {formatDate(user.lastLogin)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.personalInfo')}
        </ThemedText>

        <Spacer height={Spacing.lg} />

        {renderInput(
          t('form.fullName'),
          name,
          setName,
          t('form.enterFullName'),
          errors.name
        )}

        <Spacer height={Spacing.md} />

        {renderInput(
          t('form.email'),
          user?.email || '',
          () => {},
          '',
          undefined,
          'email-address',
          false
        )}

        <Spacer height={Spacing.md} />

        {renderInput(
          t('form.phone'),
          phone,
          handlePhoneChange,
          t('form.enterPhone'),
          errors.phone,
          'phone-pad'
        )}
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: theme.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.workInfo')}
        </ThemedText>

        <Spacer height={Spacing.lg} />

        {renderInput(
          t('settings.department'),
          department,
          setDepartment,
          t('settings.enterDepartment'),
          undefined,
          'default',
          true
        )}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <View style={[styles.buttonRow, { direction: 'ltr' }]}>
        <LoadingButton
          onPress={handleCancel}
          variant="outline"
          size="large"
          style={styles.button}
        >
          {t('common.cancel')}
        </LoadingButton>

        <LoadingButton
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          variant="primary"
          size="large"
          icon="check"
          style={styles.button}
        >
          {t('common.save')}
        </LoadingButton>
      </View>

      <Spacer height={Spacing.xl} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md - 2,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.md - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtons: {
    gap: Spacing.sm,
  },
  avatarInfo: {
    alignItems: 'center',
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  infoRow: {
    gap: Spacing.lg,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  labelRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  readOnlyBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  readOnlyText: {
    fontSize: 10,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
});
