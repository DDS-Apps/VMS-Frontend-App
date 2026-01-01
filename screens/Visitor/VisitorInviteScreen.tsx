import React, { useState, useCallback, useRef, memo, useEffect } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from "@/components/ThemedText";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography, BrandColors, NeutralColors, FontFamily } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { DDIcon } from "@/components/DDIcon";
import { usePublicInviteQuery, useAcceptInviteMutation, useRejectInviteMutation } from "@/hooks/queries";
import type { PublicInviteDto, VisitorParkingOption } from "@/types/api.types";

// DALLAH DIGITAL Theme Colors for this page
const PageColors = {
  background: BrandColors.brandNavy,
  cardBackground: 'rgba(255, 255, 255, 0.08)',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  accent: BrandColors.brandTeal,
  accentLight: BrandColors.softTeal,
  success: '#1BBE7A',
  error: '#E53935',
  warning: '#FFA000',
  buttonPrimary: BrandColors.brandBlue,
};

// Reject Modal Component - manages its own local state to prevent cursor issues
interface RejectModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
  translations: {
    title: string;
    subtitle: string;
    placeholder: string;
    cancel: string;
    confirm: string;
  };
}

const RejectModal = memo(function RejectModal({
  visible,
  onCancel,
  onConfirm,
  isLoading,
  translations,
}: RejectModalProps) {
  const [localReason, setLocalReason] = useState('');
  const wasLoadingRef = React.useRef(false);

  // Only reset localReason when modal closes AND we're not in loading state
  // This prevents clearing the input during submission
  useEffect(() => {
    if (!visible && !isLoading && !wasLoadingRef.current) {
      setLocalReason('');
    }
    wasLoadingRef.current = isLoading;
  }, [visible, isLoading]);

  const handleConfirm = useCallback(() => {
    if (isLoading) return; // Prevent multiple submissions
    onConfirm(localReason);
  }, [onConfirm, localReason, isLoading]);

  const handleCancel = useCallback(() => {
    if (isLoading) return; // Prevent cancel during loading
    setLocalReason('');
    onCancel();
  }, [onCancel, isLoading]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isLoading ? undefined : handleCancel}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <ThemedText style={modalStyles.title}>
            {translations.title}
          </ThemedText>
          <ThemedText style={modalStyles.subtitle}>
            {translations.subtitle}
          </ThemedText>
          <TextInput
            style={[modalStyles.input, isLoading && { opacity: 0.6 }]}
            placeholder={translations.placeholder}
            placeholderTextColor={PageColors.textMuted}
            value={localReason}
            onChangeText={setLocalReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isLoading}
          />
          <View style={modalStyles.buttons}>
            <Pressable
              style={[modalStyles.button, modalStyles.cancelButton, isLoading && { opacity: 0.6 }]}
              onPress={handleCancel}
              disabled={isLoading}
            >
              <ThemedText style={modalStyles.cancelText}>{translations.cancel}</ThemedText>
            </Pressable>
            <Pressable
              style={[modalStyles.button, modalStyles.confirmButton, isLoading && { opacity: 0.8 }]}
              onPress={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <DDIcon name="loader" size={16} color="#FFFFFF" />
                  <ThemedText style={modalStyles.confirmText}>{translations.confirm}</ThemedText>
                </View>
              ) : (
                <ThemedText style={modalStyles.confirmText}>{translations.confirm}</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: PageColors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: PageColors.textPrimary,
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.latinSemiBold,
  },
  subtitle: {
    fontSize: 14,
    color: PageColors.textSecondary,
    marginBottom: Spacing.lg,
    fontFamily: FontFamily.latinRegular,
  },
  input: {
    backgroundColor: PageColors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    padding: Spacing.md,
    color: PageColors.textPrimary,
    fontSize: 15,
    minHeight: 100,
    marginBottom: Spacing.lg,
    fontFamily: FontFamily.latinRegular,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: PageColors.cardBackground,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
  },
  confirmButton: {
    backgroundColor: PageColors.error,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: PageColors.textPrimary,
    fontFamily: FontFamily.latinSemiBold,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FontFamily.latinSemiBold,
  },
});

interface ParkingSelectionModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (data: {
    parkingOption: VisitorParkingOption;
    licensePlate?: string;
    carModel?: string;
    carColor?: string;
  }) => void;
  isLoading: boolean;
  translations: {
    title: string;
    noParking: string;
    needsParking: string;
    needsParkingInfoLater: string;
    licensePlate: string;
    carModel: string;
    carColor: string;
    confirm: string;
    cancel: string;
  };
}

const ParkingSelectionModal = memo(function ParkingSelectionModal({
  visible,
  onCancel,
  onConfirm,
  isLoading,
  translations,
}: ParkingSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<VisitorParkingOption | null>(null);
  const [licensePlate, setLicensePlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carColor, setCarColor] = useState('');
  const wasLoadingRef = React.useRef(false);

  useEffect(() => {
    if (!visible && !isLoading && !wasLoadingRef.current) {
      setSelectedOption(null);
      setLicensePlate('');
      setCarModel('');
      setCarColor('');
    }
    wasLoadingRef.current = isLoading;
  }, [visible, isLoading]);

  const handleConfirm = useCallback(() => {
    if (isLoading || !selectedOption) return;
    onConfirm({
      parkingOption: selectedOption,
      licensePlate: selectedOption === 'parking_with_car_info' ? licensePlate : undefined,
      carModel: selectedOption === 'parking_with_car_info' ? carModel : undefined,
      carColor: selectedOption === 'parking_with_car_info' ? carColor : undefined,
    });
  }, [onConfirm, selectedOption, licensePlate, carModel, carColor, isLoading]);

  const handleCancel = useCallback(() => {
    if (isLoading) return;
    setSelectedOption(null);
    setLicensePlate('');
    setCarModel('');
    setCarColor('');
    onCancel();
  }, [onCancel, isLoading]);

  const renderOptionCard = (
    option: VisitorParkingOption,
    label: string,
    icon: 'slash' | 'truck' | 'clock'
  ) => {
    const isSelected = selectedOption === option;
    return (
      <Pressable
        style={[
          parkingModalStyles.optionCard,
          isSelected && parkingModalStyles.optionCardSelected,
          isLoading && { opacity: 0.6 },
        ]}
        onPress={() => !isLoading && setSelectedOption(option)}
        disabled={isLoading}
      >
        <View style={[
          parkingModalStyles.optionIconContainer,
          isSelected && { backgroundColor: PageColors.accent + '30' }
        ]}>
          <DDIcon name={icon} size={20} color={isSelected ? PageColors.accent : PageColors.textSecondary} />
        </View>
        <ThemedText style={[
          parkingModalStyles.optionLabel,
          isSelected && { color: PageColors.accent }
        ]}>
          {label}
        </ThemedText>
        {isSelected ? (
          <DDIcon name="check-circle" size={20} color={PageColors.accent} />
        ) : (
          <View style={parkingModalStyles.optionPlaceholder} />
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isLoading ? undefined : handleCancel}
    >
      <View style={modalStyles.overlay}>
        <ScrollView 
          style={{ maxHeight: '90%' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <View style={modalStyles.content}>
            <ThemedText style={modalStyles.title}>
              {translations.title}
            </ThemedText>

            <View style={parkingModalStyles.optionsContainer}>
              {renderOptionCard('no_parking', translations.noParking, 'slash')}
              {renderOptionCard('parking_with_car_info', translations.needsParking, 'truck')}
              {renderOptionCard('parking_without_car_info', translations.needsParkingInfoLater, 'clock')}
            </View>

            {selectedOption === 'parking_with_car_info' ? (
              <View style={parkingModalStyles.carInfoContainer}>
                <TextInput
                  style={parkingModalStyles.carInfoInput}
                  placeholder={translations.licensePlate}
                  placeholderTextColor={PageColors.textMuted}
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  editable={!isLoading}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={parkingModalStyles.carInfoInput}
                  placeholder={translations.carModel}
                  placeholderTextColor={PageColors.textMuted}
                  value={carModel}
                  onChangeText={setCarModel}
                  editable={!isLoading}
                />
                <TextInput
                  style={parkingModalStyles.carInfoInput}
                  placeholder={translations.carColor}
                  placeholderTextColor={PageColors.textMuted}
                  value={carColor}
                  onChangeText={setCarColor}
                  editable={!isLoading}
                />
              </View>
            ) : null}

            <View style={modalStyles.buttons}>
              <Pressable
                style={[modalStyles.button, modalStyles.cancelButton, isLoading && { opacity: 0.6 }]}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <ThemedText style={modalStyles.cancelText}>{translations.cancel}</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  modalStyles.button,
                  parkingModalStyles.confirmButton,
                  (!selectedOption || isLoading) && { opacity: 0.6 }
                ]}
                onPress={handleConfirm}
                disabled={!selectedOption || isLoading}
              >
                {isLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <DDIcon name="loader" size={16} color="#FFFFFF" />
                    <ThemedText style={modalStyles.confirmText}>{translations.confirm}</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={modalStyles.confirmText}>{translations.confirm}</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
});

const parkingModalStyles = StyleSheet.create({
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: PageColors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    gap: Spacing.md,
  },
  optionCardSelected: {
    borderColor: PageColors.accent,
    backgroundColor: PageColors.accent + '10',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: PageColors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    color: PageColors.textPrimary,
    fontFamily: FontFamily.latinMedium,
  },
  optionPlaceholder: {
    width: 20,
  },
  carInfoContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  carInfoInput: {
    backgroundColor: PageColors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    padding: Spacing.md,
    color: PageColors.textPrimary,
    fontSize: 15,
    fontFamily: FontFamily.latinRegular,
  },
  confirmButton: {
    backgroundColor: PageColors.success,
  },
});

interface VisitorInviteScreenProps {
  route?: {
    params?: {
      visitId?: string;
      token?: string;
    };
  };
}

export default function VisitorInviteScreen({ route }: VisitorInviteScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate: fmtDate, formatDateShort, formatTimeFromString, formatDateTime } = useFormatters();
  const insets = useSafeAreaInsets();
  const token = route?.params?.token || route?.params?.visitId;
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionCompleted, setActionCompleted] = useState<'accepted' | 'rejected' | null>(null);
  const [responseQrCode, setResponseQrCode] = useState<string | null>(null);
  const [apiResponseMessage, setApiResponseMessage] = useState<string | null>(null);
  const inviteSnapshotRef = React.useRef<PublicInviteDto | null>(null);
  
  // Inline parking selection state
  const [selectedParkingOption, setSelectedParkingOption] = useState<VisitorParkingOption>('no_parking');
  const [licensePlate, setLicensePlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carColor, setCarColor] = useState('');

  const { data: invite, isLoading, isFetching, error, isError } = usePublicInviteQuery(token);
  const acceptMutation = useAcceptInviteMutation(token || '');
  const rejectMutation = useRejectInviteMutation(token || '');

  // Always keep invite snapshot updated so we have data during refetch
  React.useEffect(() => {
    if (invite) {
      inviteSnapshotRef.current = invite;
    }
  }, [invite]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl * 2,
    flexGrow: 1,
  };

  const handleAccept = useCallback(async () => {
    if (acceptMutation.isPending || !selectedParkingOption) return;
    
    if (invite) inviteSnapshotRef.current = invite;
    try {
      const response = await acceptMutation.mutateAsync({
        parkingOption: selectedParkingOption,
        licensePlate: selectedParkingOption === 'parking_with_car_info' ? licensePlate : undefined,
        carModel: selectedParkingOption === 'parking_with_car_info' ? carModel : undefined,
        carColor: selectedParkingOption === 'parking_with_car_info' ? carColor : undefined,
      });
      setResponseQrCode(response.qrCode || null);
      setActionCompleted('accepted');
    } catch (err) {
      console.error('Accept failed:', err);
    }
  }, [acceptMutation, invite, selectedParkingOption, licensePlate, carModel, carColor]);

  const handleReject = useCallback(async (reason: string) => {
    // Prevent multiple submissions
    if (rejectMutation.isPending) return;
    
    // Store snapshot before action
    if (invite) inviteSnapshotRef.current = invite;
    try {
      const response = await rejectMutation.mutateAsync(
        reason ? { reason } : undefined
      );
      // Store API response message for display - prefer data.message over root message
      const responseMessage = response?.data?.message || response?.message || null;
      setApiResponseMessage(responseMessage);
      setActionCompleted('rejected');
      setShowRejectModal(false);
    } catch (err) {
      console.error('Reject failed:', err);
    }
  }, [rejectMutation, invite]);

  const handleCancelReject = useCallback(() => {
    setShowRejectModal(false);
  }, []);

  const rejectModalTranslations = React.useMemo(() => ({
    title: t('visitor.declineInvitation'),
    subtitle: t('visitor.optionalReason'),
    placeholder: t('visitor.reasonPlaceholder'),
    cancel: t('actions.cancel'),
    confirm: t('actions.confirm'),
  }), [t]);

  const formatVisitDate = (dateString: string) => {
    return formatDateShort(new Date(dateString));
  };

  const formatVisitTime = (timeString: string) => {
    if (!timeString) return '';
    let timeStr = String(timeString).trim();
    
    // If already has AM/PM, use formatter directly
    if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(timeStr)) {
      return formatTimeFromString(timeStr);
    }
    
    // Handle full ISO timestamp (e.g., "2025-12-22T13:25:00Z" or "2025-12-22T13:25:00+03:00")
    if (timeStr.includes('T')) {
      try {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          let hours = date.getHours();
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const period = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          return `${hours}:${minutes} ${period}`;
        }
      } catch {
        // Fall through to other parsing
      }
    }
    
    // Strip timezone offset if present (e.g., "13:25:00+03:00" or "13:25:00Z")
    timeStr = timeStr.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, '');
    
    // Strip fractional seconds if present (e.g., "13:25:00.000" -> "13:25:00")
    timeStr = timeStr.replace(/\.\d+$/, '');
    
    // Strip seconds if present (convert HH:MM:SS to HH:MM)
    const matchWithSeconds = timeStr.match(/^(\d{1,2}):(\d{2}):\d{2}$/);
    if (matchWithSeconds) {
      timeStr = `${matchWithSeconds[1]}:${matchWithSeconds[2]}`;
    }
    
    // If 24-hour format like "13:25" or "14:25"
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = match24[2];
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes} ${period}`;
    }
    
    return formatTimeFromString(timeStr);
  };

  // Format ISO 8601 duration (PT1H, PT30M, PT1H30M) to readable format
  const formatDuration = (duration: string): string => {
    if (!duration) return '';
    
    // Handle ISO 8601 duration format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      
      if (hours && minutes) {
        return `${hours}h ${minutes}m`;
      } else if (hours) {
        return `${hours} ${hours === 1 ? t('visitorInvite.hour') : t('visitorInvite.hours')}`;
      } else if (minutes) {
        return `${minutes} ${minutes === 1 ? t('visitorInvite.minute') : t('visitorInvite.minutes')}`;
      }
    }
    
    // Return as-is if not ISO format
    return duration;
  };

  const formatDecisionDate = (dateString: string): string => {
    const date = new Date(dateString);
    return formatDateTime(date);
  };

  const getParkingExpectationText = (invite: PublicInviteDto): string => {
    const parkingInfo = invite.parkingInfo || invite.parking;
    if (!parkingInfo) {
      return t('visitorInvite.parkingNotAvailable');
    }
    if (parkingInfo.type === 'valet' || invite.valetInfo || invite.hasValet) {
      return t('visitorInvite.valetServiceAvailable');
    }
    if (parkingInfo.type === 'auto') {
      const parts = [];
      if (parkingInfo.location) parts.push(parkingInfo.location);
      if (parkingInfo.slotNumber) parts.push(`${t('visitorInvite.slot')} ${parkingInfo.slotNumber}`);
      return parts.length > 0 ? parts.join(' - ') : t('visitorInvite.parkingAvailableBasement');
    }
    return t('visitorInvite.parkingNotAvailable');
  };

  const getParkingType = (invite: PublicInviteDto): 'valet' | 'auto' | 'none' => {
    const parkingInfo = invite.parkingInfo || invite.parking;
    if (invite.valetInfo || invite.hasValet || parkingInfo?.type === 'valet') {
      return 'valet';
    }
    if (parkingInfo?.type === 'auto') {
      return 'auto';
    }
    return 'none';
  };

  const getVisitorFullName = (invite: PublicInviteDto): string => {
    if (invite.visitorFirstName && invite.visitorLastName) {
      return `${invite.visitorFirstName} ${invite.visitorLastName}`;
    }
    if (invite.visitorFirstName) {
      return invite.visitorFirstName;
    }
    // Fallback to email prefix if no name available
    if (invite.visitorEmail) {
      const emailPrefix = invite.visitorEmail.split('@')[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return t('visitor.guest');
  };

  const getHostFullName = (invite: PublicInviteDto): string => {
    if (invite.hostName) {
      return invite.hostName;
    }
    if (invite.host?.firstName && invite.host?.lastName) {
      return `${invite.host.firstName} ${invite.host.lastName}`;
    }
    return '';
  };
  
  const getHostDepartment = (invite: PublicInviteDto): string => {
    return invite.hostDepartment || invite.host?.department || '';
  };

  const getVisitTime = (invite: PublicInviteDto): string => {
    return invite.visitTime || invite.startTime || '';
  };

  const getBuildingName = (invite: PublicInviteDto): string => {
    return invite.location?.building || invite.building?.name || '';
  };

  const getBuildingAddress = (invite: PublicInviteDto): string => {
    return invite.location?.address || invite.building?.address || '';
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim() === '') return '?';
    const parts = name.trim().split(' ').filter(n => n.length > 0);
    if (parts.length === 0) return '?';
    return parts.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Branding Header Component
  const BrandingHeader = () => (
    <View style={styles.brandingHeader}>
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <DDIcon name="shield" size={24} color={PageColors.accent} />
        </View>
        <View>
          <ThemedText style={styles.brandName}>DALLAH DIGITAL</ThemedText>
          <ThemedText style={styles.brandTagline}>Visitor Management System</ThemedText>
        </View>
      </View>
    </View>
  );

  // Glass Card Component
  const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );

  // Content Wrapper Component (max-width 600px for desktop)
  const ContentWrapper = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.contentWrapper}>
      {children}
    </View>
  );

  // Info Row Component
  const InfoRow = ({ icon, label, value, subValue }: { icon: string; label: string; value: string; subValue?: string }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconContainer}>
        <DDIcon name={icon as any} size={18} color={PageColors.accent} />
      </View>
      <View style={styles.infoContent}>
        <ThemedText style={styles.infoLabel}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
        {subValue ? (
          <ThemedText style={styles.infoSubValue}>{subValue}</ThemedText>
        ) : null}
      </View>
    </View>
  );

  // If action was completed (accept/reject), show success immediately without waiting for refetch
  // Use the snapshot to ensure we have data even if refetch causes invite to be undefined
  const displayInvite = invite || inviteSnapshotRef.current;
  if (actionCompleted && displayInvite) {
    const qrCodeValue = responseQrCode || displayInvite.qrCode;
    
    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={scrollContentStyle}>
        <ContentWrapper>
          <BrandingHeader />
          
          <View style={styles.resultContainer}>
            <View style={[
              styles.statusIconContainer,
              { backgroundColor: actionCompleted === 'accepted' ? PageColors.success + '20' : PageColors.error + '20' }
            ]}>
              <DDIcon 
                name={actionCompleted === 'accepted' ? 'check-circle' : 'x-circle'} 
                size={64} 
                color={actionCompleted === 'accepted' ? PageColors.success : PageColors.error}
              />
            </View>
            <Spacer height={Spacing.xl} />
            <ThemedText style={styles.statusTitle}>
              {actionCompleted === 'accepted' ? t('visitor.invitationAccepted') : t('visitor.invitationDeclined')}
            </ThemedText>
            <Spacer height={Spacing.sm} />
            <ThemedText style={styles.statusDescription}>
              {actionCompleted === 'accepted'
                ? `${t('invitation.scheduledFor')} ${formatVisitDate(displayInvite.visitDate)}`
                : apiResponseMessage || t('visitorInvite.hostNotified')
              }
            </ThemedText>
          </View>

          {actionCompleted === 'accepted' && qrCodeValue ? (
            <>
              <GlassCard style={styles.qrCardContainer}>
                <ThemedText style={styles.qrCardTitle}>{t('invitation.accessCode')}</ThemedText>
                <Spacer height={Spacing.lg} />
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={qrCodeValue}
                    size={180}
                    backgroundColor="#FFFFFF"
                    color="#000000"
                  />
                </View>
                <Spacer height={Spacing.lg} />
                <ThemedText style={styles.qrCardSubtitle}>{t('invitation.showAtReception')}</ThemedText>
              </GlassCard>
              <Spacer height={Spacing.xl} />
            </>
          ) : null}

          <GlassCard>
            <InfoRow 
              icon="user" 
              label={t('reception.hostName')} 
              value={getHostFullName(displayInvite)}
              subValue={getHostDepartment(displayInvite) || undefined}
            />
            <View style={styles.infoDivider} />
            <InfoRow 
              icon="calendar" 
              label={t('form.date')} 
              value={formatVisitDate(displayInvite.visitDate)}
              subValue={formatVisitTime(getVisitTime(displayInvite))}
            />
          </GlassCard>
        </ContentWrapper>
      </ScrollView>
    );
  }

  // Don't show loading screen when modal is open or mutation is pending
  // This prevents the modal from unmounting and losing its state
  const shouldShowLoadingScreen = (isLoading || isFetching) && !showRejectModal && !rejectMutation.isPending && !acceptMutation.isPending;
  
  if (shouldShowLoadingScreen) {
    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={scrollContentStyle}>
        <ContentWrapper>
          <BrandingHeader />
          <View style={styles.centerContainer}>
          <View style={styles.loadingIndicator}>
            <DDIcon name="loader" size={48} color={PageColors.accent} />
          </View>
          <Spacer height={Spacing.lg} />
          <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
          </View>
        </ContentWrapper>
      </ScrollView>
    );
  }

  if (isError || !token) {
    const is404 = (error as any)?.status === 404;
    const is410 = (error as any)?.status === 410;
    
    if (is410) {
      return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={scrollContentStyle}>
          <ContentWrapper>
            <BrandingHeader />
            <View style={styles.centerContainer}>
              <View style={[styles.statusIconContainer, { backgroundColor: PageColors.error + '20' }]}>
                <DDIcon name="clock" size={64} color={PageColors.error} />
              </View>
              <Spacer height={Spacing.xl} />
              <ThemedText style={styles.statusTitle}>{t('visitorInvite.invitationExpired')}</ThemedText>
              <Spacer height={Spacing.md} />
              <ThemedText style={styles.statusDescription}>
                {t('visitorInvite.invitationExpiredDescription')}
              </ThemedText>
            </View>
          </ContentWrapper>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={scrollContentStyle}>
        <ContentWrapper>
          <BrandingHeader />
          <View style={styles.centerContainer}>
            <View style={[styles.statusIconContainer, { backgroundColor: PageColors.warning + '20' }]}>
              <DDIcon name="alert-circle" size={64} color={PageColors.warning} />
            </View>
            <Spacer height={Spacing.xl} />
            <ThemedText style={styles.statusTitle}>{t('visitorInvite.invitationNotFound')}</ThemedText>
            <Spacer height={Spacing.md} />
            <ThemedText style={styles.statusDescription}>
              {t('visitorInvite.invitationNotFoundDescription')}
            </ThemedText>
            <Spacer height={Spacing.xl * 2} />
            <GlassCard>
              <View style={styles.suggestionRow}>
                <DDIcon name="info" size={20} color={PageColors.accent} />
                <Spacer width={Spacing.md} />
                <ThemedText style={styles.suggestionText}>
                  {t('visitorInvite.contactSuggestion')}
                </ThemedText>
              </View>
            </GlassCard>
          </View>
        </ContentWrapper>
      </ScrollView>
    );
  }

  if (!invite) {
    return null;
  }

  const isExpiredOrCancelled = invite.status === 'expired' || invite.status === 'cancelled';
  const hasVisitorDecision = invite.visitorDecision?.decidedAt !== undefined && invite.visitorDecision?.decidedAt !== null;
  const isAlreadyResponded = hasVisitorDecision || invite.status === 'visitor_accepted' || invite.status === 'visitor_rejected' || actionCompleted !== null;
  const isAccepted = actionCompleted === 'accepted' || invite.visitorDecision?.accepted === true || invite.status === 'visitor_accepted';
  const finalStatus = actionCompleted || (isAccepted ? 'accepted' : (hasVisitorDecision && !invite.visitorDecision?.accepted) ? 'rejected' : invite.status === 'visitor_rejected' ? 'rejected' : null);

  if (isExpiredOrCancelled) {
    const isCancelled = invite.status === 'cancelled';
    
    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={scrollContentStyle}>
        <ContentWrapper>
          <BrandingHeader />
          <View style={styles.centerContainer}>
            <View style={[styles.statusIconContainer, { backgroundColor: PageColors.error + '20' }]}>
              <DDIcon name={isCancelled ? 'x-circle' : 'clock'} size={64} color={PageColors.error} />
            </View>
            <Spacer height={Spacing.xl} />
            <ThemedText style={styles.statusTitle}>
              {isCancelled ? t('visitorInvite.invitationCancelled') : t('visitorInvite.invitationExpired')}
            </ThemedText>
            <Spacer height={Spacing.md} />
            <ThemedText style={styles.statusDescription}>
              {isCancelled 
                ? t('visitorInvite.invitationCancelledDescription')
                : t('visitorInvite.invitationExpiredDescription')
              }
            </ThemedText>
            <Spacer height={Spacing.xl * 2} />
            <GlassCard>
              <InfoRow 
                icon="user" 
                label={t('reception.hostName')} 
                value={getHostFullName(invite)}
                subValue={getHostDepartment(invite) || undefined}
              />
              <View style={styles.infoDivider} />
              <InfoRow 
                icon="calendar" 
                label={t('form.date')} 
                value={formatVisitDate(invite.visitDate)}
                subValue={formatVisitTime(getVisitTime(invite))}
              />
            </GlassCard>
            <Spacer height={Spacing.xl} />
            <GlassCard>
              <View style={styles.suggestionRow}>
                <DDIcon name="phone" size={20} color={PageColors.accent} />
                <Spacer width={Spacing.md} />
                <ThemedText style={styles.suggestionText}>
                  {t('visitorInvite.contactHostToReschedule')}
                </ThemedText>
              </View>
            </GlassCard>
          </View>
        </ContentWrapper>
      </ScrollView>
    );
  }

  // Already responded - show confirmation with details
  if (isAlreadyResponded && finalStatus) {
    const qrCodeValue = responseQrCode || invite.qrCode;
    const decisionDate = invite.visitorDecision?.decidedAt;
    const decisionReason = invite.visitorDecision?.reason;
    
    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={scrollContentStyle}>
        <ContentWrapper>
          <BrandingHeader />
          
          <View style={styles.resultContainer}>
          <View style={[
            styles.statusIconContainer,
            { backgroundColor: finalStatus === 'accepted' ? PageColors.success + '20' : PageColors.error + '20' }
          ]}>
            <DDIcon 
              name={finalStatus === 'accepted' ? 'check-circle' : 'x-circle'} 
              size={64} 
              color={finalStatus === 'accepted' ? PageColors.success : PageColors.error}
            />
          </View>
          <Spacer height={Spacing.xl} />
          <ThemedText style={styles.statusTitle}>
            {finalStatus === 'accepted' ? t('visitor.invitationAccepted') : t('visitor.invitationDeclined')}
          </ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText style={styles.statusDescription}>
            {finalStatus === 'accepted'
              ? `${t('invitation.scheduledFor')} ${formatVisitDate(invite.visitDate)}`
              : decisionReason ? decisionReason : t('visitor.invitationDeclined')
            }
          </ThemedText>
          
          {decisionDate && !actionCompleted ? (
            <>
              <Spacer height={Spacing.sm} />
              <ThemedText style={styles.decisionDate}>
                {t('visitorInvite.respondedOn')} {formatDecisionDate(decisionDate)}
              </ThemedText>
            </>
          ) : null}
        </View>

        {finalStatus === 'accepted' ? (
          <>
            {/* QR Code Section */}
            <GlassCard style={styles.qrCardContainer}>
              <ThemedText style={styles.qrCardTitle}>{t('invitation.accessCode')}</ThemedText>
              <Spacer height={Spacing.lg} />
              {qrCodeValue ? (
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={qrCodeValue}
                    size={180}
                    backgroundColor="#FFFFFF"
                    color="#000000"
                  />
                </View>
              ) : (
                <View style={styles.qrPlaceholder}>
                  <DDIcon name="maximize" size={100} color={PageColors.textMuted} />
                </View>
              )}
              <Spacer height={Spacing.lg} />
              <ThemedText style={styles.qrCardSubtitle}>{t('invitation.showAtReception')}</ThemedText>
            </GlassCard>

            <Spacer height={Spacing.xl} />

            {/* Visit Details */}
            <GlassCard>
              <ThemedText style={styles.sectionTitle}>{t('visitorInvite.visitDetails')}</ThemedText>
              <Spacer height={Spacing.lg} />
              
              <InfoRow 
                icon="user" 
                label={t('reception.hostName')} 
                value={getHostFullName(invite)}
                subValue={getHostDepartment(invite) || undefined}
              />
              <View style={styles.infoDivider} />
              <InfoRow 
                icon="calendar" 
                label={t('form.date')} 
                value={formatVisitDate(invite.visitDate)}
                subValue={`${formatVisitTime(getVisitTime(invite))}${invite.duration ? ` (${formatDuration(invite.duration)})` : ''}`}
              />
              
              {invite.meetingRoom ? (
                <>
                  <View style={styles.infoDivider} />
                  <InfoRow 
                    icon="map-pin" 
                    label={t('visitorInvite.meetingRoom')} 
                    value={invite.meetingRoom.name || ''}
                    subValue={invite.meetingRoom.floor || undefined}
                  />
                </>
              ) : null}
              
              <View style={styles.infoDivider} />
              <InfoRow 
                icon="home" 
                label={t('form.building')} 
                value={getBuildingName(invite)}
                subValue={getBuildingAddress(invite) || undefined}
              />
            </GlassCard>

            <Spacer height={Spacing.xl} />

            {/* Parking Section */}
            <GlassCard style={[
              styles.parkingCard,
              { 
                borderColor: getParkingType(invite) === 'none' 
                  ? PageColors.warning + '40' 
                  : PageColors.success + '40' 
              }
            ]}>
              <View style={styles.parkingHeader}>
                <View style={[
                  styles.parkingIconContainer,
                  { backgroundColor: getParkingType(invite) === 'none' ? PageColors.warning + '20' : PageColors.success + '20' }
                ]}>
                  <DDIcon 
                    name={getParkingType(invite) === 'valet' ? 'truck' : getParkingType(invite) === 'auto' ? 'navigation' : 'alert-circle'} 
                    size={24} 
                    color={getParkingType(invite) === 'none' ? PageColors.warning : PageColors.success}
                  />
                </View>
                <View style={styles.parkingContent}>
                  <ThemedText style={styles.parkingTitle}>{t('services.parking')}</ThemedText>
                  <ThemedText style={styles.parkingDescription}>
                    {getParkingExpectationText(invite)}
                  </ThemedText>
                </View>
              </View>
            </GlassCard>
          </>
        ) : null}
        </ContentWrapper>
      </ScrollView>
    );
  }

  // Main invitation view - pending response
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={scrollContentStyle}>
      <ContentWrapper>
        <BrandingHeader />
        
        {/* Hero Section */}
      <View style={styles.heroSection}>
        <ThemedText style={styles.heroTitle}>{t('invitation.title')}</ThemedText>
        <ThemedText style={styles.heroSubtitle}>
          {t('invitation.youAreInvited')} {getBuildingName(invite)}
        </ThemedText>
      </View>

      <Spacer height={Spacing.xl} />

      {/* Visitor Card */}
      <GlassCard>
        <View style={styles.visitorHeader}>
          <View style={styles.avatarContainer}>
            <ThemedText style={styles.avatarText}>
              {getInitials(getVisitorFullName(invite))}
            </ThemedText>
          </View>
          <Spacer height={Spacing.md} />
          <ThemedText style={styles.visitorName}>{getVisitorFullName(invite)}</ThemedText>
        </View>

        <View style={styles.cardDivider} />

        <InfoRow 
          icon="user" 
          label={t('reception.hostName')} 
          value={getHostFullName(invite)}
          subValue={getHostDepartment(invite) || undefined}
        />
        
        <View style={styles.infoDivider} />
        
        <InfoRow 
          icon="calendar" 
          label={`${t('form.date')} & ${t('form.time')}`} 
          value={formatVisitDate(invite.visitDate)}
          subValue={`${formatVisitTime(getVisitTime(invite))}${invite.duration ? ` (${formatDuration(invite.duration)})` : ''}`}
        />
        
        <View style={styles.infoDivider} />
        
        <InfoRow 
          icon="briefcase" 
          label={t('form.purpose')} 
          value={invite.purpose}
        />

        <View style={styles.infoDivider} />

        {invite.meetingRoom ? (
          <>
            <InfoRow 
              icon="map-pin" 
              label={t('visitorInvite.meetingRoom')} 
              value={invite.meetingRoom.name || ''}
              subValue={invite.meetingRoom.floor || undefined}
            />
            <View style={styles.infoDivider} />
          </>
        ) : null}
        
        <InfoRow 
          icon="home" 
          label={t('form.building')} 
          value={getBuildingName(invite)}
          subValue={getBuildingAddress(invite) || undefined}
        />
      </GlassCard>

      <Spacer height={Spacing.xl} />

      {/* Parking Selection Section */}
      <GlassCard>
        <ThemedText style={styles.parkingSectionTitle}>{t('visitorInvite.parkingPreference')}</ThemedText>
        <Spacer height={Spacing.md} />
        
        {/* Option 1: No Parking */}
        <Pressable
          style={[
            styles.parkingOptionCard,
            selectedParkingOption === 'no_parking' && styles.parkingOptionCardSelected,
          ]}
          onPress={() => setSelectedParkingOption('no_parking')}
        >
          <View style={[
            styles.parkingOptionIcon,
            selectedParkingOption === 'no_parking' && { backgroundColor: PageColors.accent + '30' }
          ]}>
            <DDIcon name="slash" size={20} color={selectedParkingOption === 'no_parking' ? PageColors.accent : PageColors.textSecondary} />
          </View>
          <ThemedText style={[
            styles.parkingOptionLabel,
            selectedParkingOption === 'no_parking' && { color: PageColors.accent }
          ]}>
            {t('visitorInvite.noParking')}
          </ThemedText>
          {selectedParkingOption === 'no_parking' ? (
            <DDIcon name="check-circle" size={20} color={PageColors.accent} />
          ) : (
            <View style={styles.parkingOptionPlaceholder} />
          )}
        </Pressable>
        
        {/* Option 2: Parking with Car Info */}
        <Pressable
          style={[
            styles.parkingOptionCard,
            selectedParkingOption === 'parking_with_car_info' && styles.parkingOptionCardSelected,
          ]}
          onPress={() => setSelectedParkingOption('parking_with_car_info')}
        >
          <View style={[
            styles.parkingOptionIcon,
            selectedParkingOption === 'parking_with_car_info' && { backgroundColor: PageColors.accent + '30' }
          ]}>
            <DDIcon name="truck" size={20} color={selectedParkingOption === 'parking_with_car_info' ? PageColors.accent : PageColors.textSecondary} />
          </View>
          <ThemedText style={[
            styles.parkingOptionLabel,
            selectedParkingOption === 'parking_with_car_info' && { color: PageColors.accent }
          ]}>
            {t('visitorInvite.needsParking')}
          </ThemedText>
          {selectedParkingOption === 'parking_with_car_info' ? (
            <DDIcon name="check-circle" size={20} color={PageColors.accent} />
          ) : (
            <View style={styles.parkingOptionPlaceholder} />
          )}
        </Pressable>
        
        {/* Car Info Fields - shown when parking_with_car_info is selected */}
        {selectedParkingOption === 'parking_with_car_info' ? (
          <View style={styles.carInfoContainer}>
            <TextInput
              style={styles.carInfoInput}
              placeholder={t('visitorInvite.licensePlate')}
              placeholderTextColor={PageColors.textMuted}
              value={licensePlate}
              onChangeText={setLicensePlate}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.carInfoInput}
              placeholder={t('visitorInvite.carModel')}
              placeholderTextColor={PageColors.textMuted}
              value={carModel}
              onChangeText={setCarModel}
            />
            <TextInput
              style={styles.carInfoInput}
              placeholder={t('visitorInvite.carColor')}
              placeholderTextColor={PageColors.textMuted}
              value={carColor}
              onChangeText={setCarColor}
            />
          </View>
        ) : null}
        
        {/* Option 3: Parking without Car Info */}
        <Pressable
          style={[
            styles.parkingOptionCard,
            selectedParkingOption === 'parking_without_car_info' && styles.parkingOptionCardSelected,
          ]}
          onPress={() => setSelectedParkingOption('parking_without_car_info')}
        >
          <View style={[
            styles.parkingOptionIcon,
            selectedParkingOption === 'parking_without_car_info' && { backgroundColor: PageColors.accent + '30' }
          ]}>
            <DDIcon name="clock" size={20} color={selectedParkingOption === 'parking_without_car_info' ? PageColors.accent : PageColors.textSecondary} />
          </View>
          <ThemedText style={[
            styles.parkingOptionLabel,
            selectedParkingOption === 'parking_without_car_info' && { color: PageColors.accent }
          ]}>
            {t('visitorInvite.needsParkingInfoLater')}
          </ThemedText>
          {selectedParkingOption === 'parking_without_car_info' ? (
            <DDIcon name="check-circle" size={20} color={PageColors.accent} />
          ) : (
            <View style={styles.parkingOptionPlaceholder} />
          )}
        </Pressable>
      </GlassCard>

      <Spacer height={Spacing.xl * 1.5} />

      {/* Action Buttons - Accept on left (teal), Reject on right (red outline) */}
      <View style={styles.actionButtons}>
        <LoadingButton
          onPress={handleAccept}
          loading={acceptMutation.isPending}
          disabled={acceptMutation.isPending || rejectMutation.isPending || (selectedParkingOption === 'parking_with_car_info' && (!licensePlate.trim() || !carModel.trim() || !carColor.trim()))}
          variant="success"
          size="large"
          icon="check"
          iconPosition="left"
          loadingText={t('common.loading')}
          style={styles.actionButton}
        >
          {t('actions.accept')}
        </LoadingButton>
        
        <View style={styles.buttonSpacer} />
        
        <LoadingButton
          onPress={() => setShowRejectModal(true)}
          loading={rejectMutation.isPending}
          disabled={acceptMutation.isPending || rejectMutation.isPending}
          variant="danger-outline"
          size="large"
          icon="x"
          iconPosition="left"
          loadingText={t('common.loading')}
          style={styles.actionButton}
        >
          {t('actions.reject')}
        </LoadingButton>
      </View>

      {/* Reject Modal */}
      <RejectModal
        visible={showRejectModal}
        onCancel={handleCancelReject}
        onConfirm={handleReject}
        isLoading={rejectMutation.isPending}
        translations={rejectModalTranslations}
      />
      </ContentWrapper>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: PageColors.background,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 3,
  },
  
  // Branding Header
  brandingHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: PageColors.cardBackground,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: PageColors.textPrimary,
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 12,
    color: PageColors.textSecondary,
    marginTop: 2,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: PageColors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: PageColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  
  // Glass Card
  glassCard: {
    backgroundColor: PageColors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    padding: Spacing.xl,
  },
  
  // Visitor Header
  visitorHeader: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PageColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: PageColors.background,
  },
  visitorName: {
    fontSize: 20,
    fontWeight: '600',
    color: PageColors.accent,
  },
  cardDivider: {
    height: 1,
    backgroundColor: PageColors.cardBorder,
    marginBottom: Spacing.lg,
  },
  
  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PageColors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoLabel: {
    fontSize: 12,
    color: PageColors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: PageColors.textPrimary,
  },
  infoSubValue: {
    fontSize: 13,
    color: PageColors.textSecondary,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: PageColors.cardBorder,
    marginVertical: Spacing.md,
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PageColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  
  // Parking Card
  parkingCard: {
    borderWidth: 1,
  },
  parkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parkingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parkingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  parkingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: PageColors.textPrimary,
  },
  parkingDescription: {
    fontSize: 14,
    color: PageColors.textSecondary,
    marginTop: 2,
  },
  
  // Inline Parking Selection
  parkingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PageColors.textPrimary,
  },
  parkingOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: PageColors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  parkingOptionCardSelected: {
    borderColor: PageColors.accent,
    backgroundColor: PageColors.accent + '10',
  },
  parkingOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: PageColors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parkingOptionLabel: {
    flex: 1,
    fontSize: 14,
    color: PageColors.textSecondary,
  },
  parkingOptionPlaceholder: {
    width: 20,
    height: 20,
  },
  carInfoContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingLeft: Spacing.xl + Spacing.md,
  },
  carInfoInput: {
    backgroundColor: PageColors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    padding: Spacing.md,
    color: PageColors.textPrimary,
    fontSize: 15,
    fontFamily: FontFamily.latinRegular,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  buttonSpacer: {
    width: Spacing.md,
  },
  
  // Status Screens
  statusIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: PageColors.textPrimary,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 16,
    color: PageColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  decisionDate: {
    fontSize: 13,
    color: PageColors.textMuted,
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  
  // QR Card
  qrCardContainer: {
    alignItems: 'center',
  },
  qrCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PageColors.textPrimary,
  },
  qrCodeWrapper: {
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    borderColor: PageColors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCardSubtitle: {
    fontSize: 14,
    color: PageColors.textSecondary,
    textAlign: 'center',
  },
  
  // Suggestion
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: PageColors.textSecondary,
  },
  
  // Loading
  loadingIndicator: {
    opacity: 0.8,
  },
  loadingText: {
    fontSize: 16,
    color: PageColors.textSecondary,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: PageColors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PageColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    fontSize: 14,
    color: PageColors.textSecondary,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: PageColors.cardBackground,
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    marginBottom: Spacing.lg,
    color: PageColors.textPrimary,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: PageColors.cardBorder,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: PageColors.textPrimary,
  },
  modalConfirmButton: {
    backgroundColor: PageColors.error,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
