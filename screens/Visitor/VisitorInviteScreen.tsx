import React, { useState, useCallback, memo } from "react";
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
import type { PublicInviteDto } from "@/types/api.types";

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

// Reject Modal Component - extracted to prevent re-renders during typing
interface RejectModalProps {
  visible: boolean;
  reason: string;
  onReasonChange: (text: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
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
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  isLoading,
  translations,
}: RejectModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
            style={modalStyles.input}
            placeholder={translations.placeholder}
            placeholderTextColor={PageColors.textMuted}
            value={reason}
            onChangeText={onReasonChange}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={modalStyles.buttons}>
            <Pressable
              style={[modalStyles.button, modalStyles.cancelButton]}
              onPress={onCancel}
            >
              <ThemedText style={modalStyles.cancelText}>{translations.cancel}</ThemedText>
            </Pressable>
            <Pressable
              style={[modalStyles.button, modalStyles.confirmButton]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <DDIcon name="loader" size={18} color="#FFFFFF" />
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
  const { formatDate: fmtDate, formatTimeFromString, formatDateTime } = useFormatters();
  const insets = useSafeAreaInsets();
  const token = route?.params?.token || route?.params?.visitId;
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionCompleted, setActionCompleted] = useState<'accepted' | 'rejected' | null>(null);
  const [responseQrCode, setResponseQrCode] = useState<string | null>(null);

  const { data: invite, isLoading, isFetching, error, isError } = usePublicInviteQuery(token);
  const acceptMutation = useAcceptInviteMutation(token || '');
  const rejectMutation = useRejectInviteMutation(token || '');

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl * 2,
    flexGrow: 1,
  };

  const handleAccept = async () => {
    try {
      const response = await acceptMutation.mutateAsync(undefined);
      setResponseQrCode(response.qrCode || null);
      setActionCompleted('accepted');
    } catch (err) {
      console.error('Accept failed:', err);
    }
  };

  const handleReject = useCallback(async () => {
    try {
      await rejectMutation.mutateAsync(
        rejectReason ? { reason: rejectReason } : undefined
      );
      setActionCompleted('rejected');
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err) {
      console.error('Reject failed:', err);
    }
  }, [rejectReason, rejectMutation]);

  const handleCancelReject = useCallback(() => {
    setShowRejectModal(false);
    setRejectReason('');
  }, []);

  const rejectModalTranslations = {
    title: t('visitor.declineInvitation'),
    subtitle: t('visitor.optionalReason'),
    placeholder: t('visitor.reasonPlaceholder'),
    cancel: t('actions.cancel'),
    confirm: t('actions.confirm'),
  };

  const formatDate = (dateString: string) => {
    return fmtDate(new Date(dateString), 'long');
  };

  const formatTime = (timeString: string) => {
    return formatTimeFromString(timeString);
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

  if (isLoading || isFetching) {
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
                value={formatDate(invite.visitDate)}
                subValue={formatTime(getVisitTime(invite))}
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
              ? `${t('invitation.scheduledFor')} ${formatDate(invite.visitDate)}`
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
                value={formatDate(invite.visitDate)}
                subValue={`${formatTime(getVisitTime(invite))}${invite.duration ? ` (${formatDuration(invite.duration)})` : ''}`}
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
          value={formatDate(invite.visitDate)}
          subValue={`${formatTime(getVisitTime(invite))}${invite.duration ? ` (${formatDuration(invite.duration)})` : ''}`}
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

      <Spacer height={Spacing.xl * 1.5} />

      {/* Action Buttons - Accept on left (teal), Reject on right (red outline) */}
      <View style={styles.actionButtons}>
        <LoadingButton
          onPress={handleAccept}
          loading={acceptMutation.isPending}
          disabled={acceptMutation.isPending || rejectMutation.isPending}
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
        reason={rejectReason}
        onReasonChange={setRejectReason}
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
