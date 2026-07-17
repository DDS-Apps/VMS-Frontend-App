import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, Alert, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import type { VisitorDetailScreenProps } from "@/types/receptionistNavigation.types";
import { ROUTES } from "@/constants";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, type IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import {
  RequestTimeline,
  useTimelineSteps,
  type TimelineData,
  type TimelineActionCallbacks,
} from "@/components/shared/RequestTimeline";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { applyOpacity } from "@/utils/statusStyles";
import { formatPhoneNumber, formatPhoneForDisplay } from "@/utils/formatters";
import { VisitorActionButton } from "@/components/VisitorActionButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import { useVisitDetailsQuery } from "@/hooks/queries/useApprovalQueries";

interface LegacyVisitor {
  id: string;
  name: string;
  company: string;
  time: string;
  endTime?: string | null;
  visitDate?: string;
  host: string;
  hostDepartment?: string;
  hostPhone?: string;
  hostLandline?: string;
  status: string;
  isWalkIn: boolean;
  email: string;
  phone: string;
  parking?: string;
  valet?: string;
  meetingRoom?: { name: string; floor?: string };
  isMeetingRoom?: boolean;
  isBuffet?: boolean;
  buffet?: { status?: string; location?: string };
  isParking?: boolean;
  licensePlate?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  origin: 'scheduled' | 'walk_in';
  scheduledFor: string;
  createdAt: string;
  rejectedAt?: string;
  rejectionReason?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  completedAt?: string;
}

export default function VisitorDetailScreen({ navigation, route }: VisitorDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString, toLocalNumerals, formatDateShort } = useFormatters();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { visitor: legacyVisitor, visitId } = route.params as { visitor?: LegacyVisitor; visitId?: string };
  
  // Responsive layout: use grid on web (>768px), single column on mobile
  const isWebLayout = screenWidth >= 768;
  const gridItemWidth = screenWidth > 1024 ? '32%' : '48%';
  
  // Always fetch from server - use visitor.id from passed object or visitId param
  const effectiveVisitId = visitId ?? legacyVisitor?.id ?? '';
  const { data: visitDetails, isLoading, isError } = useVisitDetailsQuery(effectiveVisitId, !!effectiveVisitId);
  
  const mapVisitStatus = (status: string): string => {
    if (status === 'rejected') return 'rejected';
    if (status === 'visitor_rejected') return 'visitor_rejected';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'auto_cancelled') return 'auto_cancelled';
    if (status === 'pending_approval') return 'pending_approval';
    if (status === 'pending_host_approval') return 'pending_host_approval';
    if (status === 'visitor_pending') return 'visitor_pending';
    if (status === 'approved') return 'approved';
    if (status === 'visitor_accepted') return 'visitor_accepted';
    if (status === 'checked_in') return 'checked_in';
    if (status === 'checked_out') return 'checked_out';
    if (status === 'completed') return 'completed';
    return status || 'pending';
  };
  
  // Always prefer server data (visitDetails) over passed legacyVisitor for complete information
  const visitor: LegacyVisitor | null = visitDetails ? {
    id: visitDetails.id,
    name: visitDetails.visitor.fullName,
    company: visitDetails.visitor.company ?? '',
    time: visitDetails.visitTime,
    endTime: visitDetails.endTime,
    visitDate: visitDetails.visitDate,
    host: visitDetails.employeeName,
    hostDepartment: visitDetails.employeeDepartment,
    hostPhone: visitDetails.employeePhoneNumber,
    hostLandline: visitDetails.employeeBusinessPhone,
    status: mapVisitStatus(visitDetails.status),
    isWalkIn: visitDetails.isWalkIn ?? false,
    email: visitDetails.visitor.email ?? '',
    phone: visitDetails.visitor.phone ?? '',
    parking: visitDetails.parkingSlot?.slotNumber,
    valet: visitDetails.parkingAllocation?.status,
    meetingRoom: (visitDetails.meetingRoom && visitDetails.meetingRoom.name) ? { name: visitDetails.meetingRoom.name, floor: visitDetails.meetingRoom.floor } : undefined,
    isMeetingRoom: visitDetails.isMeetingRoom ?? !!visitDetails.meetingRoom,
    isBuffet: visitDetails.isBuffet ?? !!visitDetails.buffet,
    buffet: visitDetails.buffet ? { status: 'confirmed', location: visitDetails.buffet.location } : undefined,
    isParking: visitDetails.visitorNeedsParking ?? !!visitDetails.parkingSlot,
    licensePlate: visitDetails.licensePlate,
    carModel: visitDetails.carModel,
    carColor: visitDetails.carColor,
    origin: visitDetails.isWalkIn ? 'walk_in' : 'scheduled',
    scheduledFor: visitDetails.visitDate,
    createdAt: visitDetails.createdAt,
    rejectedAt: visitDetails.rejection?.rejectedAt,
    rejectionReason: visitDetails.rejection?.reason,
    checkedInAt: visitDetails.checkedInAt,
    checkedOutAt: visitDetails.checkedOutAt,
    completedAt: visitDetails.completedAt,
  } : null;
  
  const checkInMutation = useReceptionCheckInMutation();
  const checkOutMutation = useReceptionCheckOutMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const isCancelledVisit = visitor && [
    'cancelled', 'auto_cancelled', 'rejected', 'visitor_rejected',
  ].includes(visitor.status);

  const showStickyFooter = visitor && (
    visitor.status === 'approved' || 
    visitor.status === 'visitor_accepted' || 
    visitor.status === 'checked_in'
  );

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: showStickyFooter ? insets.bottom + 140 : insets.bottom + Spacing.xl
  };

  const handleCheckIn = () => {
    if (!visitor) return;
    checkInMutation.mutate(
      { visitId: visitor.id },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate(ROUTES.CHECK_IN_OUT_CONFIRMATION as any, {
            action: 'check_in',
            visitorName: visitor.name,
            time: currentTime
          });
        },
        onError: (error) => {
          Alert.alert(t('common.error'), error.message || t('errors.checkInFailed'));
        }
      }
    );
  };

  const handleCheckOut = () => {
    if (!visitor) return;
    checkOutMutation.mutate(
      { visitId: visitor.id },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate(ROUTES.CHECK_IN_OUT_CONFIRMATION as any, {
            action: 'check_out',
            visitorName: visitor.name,
            time: currentTime
          });
        },
        onError: (error) => {
          Alert.alert(t('common.error'), error.message || t('errors.checkOutFailed'));
        }
      }
    );
  };

  const timelineData: TimelineData = useMemo(() => ({
    createdAt: visitor?.createdAt ?? '',
    status: visitor?.status ?? 'pending',
    isWalkIn: visitor?.isWalkIn ?? false,
    checkedInAt: visitor?.checkedInAt,
    checkedOutAt: visitor?.checkedOutAt,
    completedAt: visitor?.completedAt,
    hostApproval: visitor?.rejectedAt ? {
      required: true,
      rejectedAt: visitor.rejectedAt,
    } : undefined,
    approval: visitor?.rejectedAt ? {
      requiresApproval: true,
      rejectedAt: visitor.rejectedAt,
      rejectionReason: visitor.rejectionReason,
    } : undefined,
  }), [visitor]);

  const timelineActions: TimelineActionCallbacks | undefined = useMemo(() => {
    if (!visitor) return undefined;
    if (visitor.status === 'approved' || visitor.status === 'visitor_accepted') {
      return {
        onCheckIn: handleCheckIn,
        isCheckInLoading: checkInMutation.isPending,
      };
    }
    if (visitor.status === 'checked_in') {
      return {
        onCheckOut: handleCheckOut,
        isCheckOutLoading: checkOutMutation.isPending,
      };
    }
    return undefined;
  }, [visitor?.status, checkInMutation.isPending, checkOutMutation.isPending]);

  const timelineSteps = useTimelineSteps({
    data: timelineData,
    role: 'receptionist',
    flowType: 'receptionist_checkin',
    actions: timelineActions,
    showActions: false,
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
          {t('common.loading')}
        </ThemedText>
      </View>
    );
  }

  if (isError || !visitor) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
      </View>
    );
  }

  const getStatusConfig = (status: string): { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'muted' | 'primary'; icon: IconName } => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), variant: 'success', icon: 'check-circle' };
      case 'checked_out':
        return { label: t('status.checkedOut'), variant: 'success', icon: 'check-circle' };
      case 'completed':
        return { label: t('timeline.visitCompleted'), variant: 'success', icon: 'check-circle' };
      case 'rejected':
        return { label: t('status.rejected'), variant: 'error', icon: 'x-circle' };
      case 'visitor_rejected':
        return { label: t('status.visitorRejected'), variant: 'error', icon: 'x-circle' };
      case 'cancelled':
        return { label: t('status.cancelled'), variant: 'error', icon: 'x-circle' };
      case 'auto_cancelled':
        return { label: t('status.autoCancelled'), variant: 'error', icon: 'x-circle' };
      case 'pending_approval':
        return { label: t('status.pendingApproval'), variant: 'warning', icon: 'clock' };
      case 'pending_host_approval':
        return { label: t('status.pendingHostApproval'), variant: 'warning', icon: 'clock' };
      case 'visitor_pending':
        return { label: t('status.visitorPending'), variant: 'warning', icon: 'clock' };
      case 'approved':
        return { label: t('status.approved'), variant: 'info', icon: 'check-circle' };
      case 'visitor_accepted':
        return { label: t('status.visitorAccepted'), variant: 'info', icon: 'check-circle' };
      default:
        return { label: t('status.pending'), variant: 'warning', icon: 'clock' };
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('common.comingSoon'),
      t('reception.cancelNotAvailable'),
      [{ text: t('common.ok'), onPress: () => setShowCancelModal(false) }]
    );
  };

  const statusConfig = getStatusConfig(visitor.status);

  return (
    <>
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        {/* Responsive visitor header - compact row on web, centered stack on mobile */}
        {isWebLayout ? (
          <DirectionalRow style={{ alignItems: 'center', justifyContent: 'space-between', gap: Spacing.lg }}>
            {/* Left group: Avatar, Name, Status */}
            <DirectionalRow style={{ alignItems: 'center', gap: Spacing.lg, flexShrink: 1 }}>
              {/* Avatar */}
              <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15'), width: 56, height: 56 }]}>
                <ThemedText style={[styles.avatarText, { color: theme.primary, fontSize: 20 }]}>
                  {visitor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </ThemedText>
              </View>

              {/* Name and Company */}
              <View style={{ minWidth: 100, flexShrink: 1 }}>
                <ThemedText style={[Typography.title, { fontWeight: '600', fontSize: 18, color: theme.text }]} numberOfLines={1}>
                  {visitor.name}
                </ThemedText>
                {visitor.company && (
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 13, marginTop: 2 }]} numberOfLines={1}>
                    {visitor.company}
                  </ThemedText>
                )}
              </View>

              {/* Status Badge */}
              <StatusBadge
                label={statusConfig.label}
                variant={statusConfig.variant}
                icon={statusConfig.icon}
              />
            </DirectionalRow>

            {/* Right group: Contact info */}
            <DirectionalRow style={{ alignItems: 'center', gap: Spacing.lg, flexShrink: 0 }}>
              {/* Email */}
              <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15'), width: 32, height: 32 }]}>
                  <DDIcon name="mail" size={16} color={theme.text} />
                </View>
                <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14 }]}>
                  {visitor.email || '-'}
                </ThemedText>
              </DirectionalRow>

              {/* Phone */}
              <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15'), width: 32, height: 32 }]}>
                  <DDIcon name="phone" size={16} color={theme.text} />
                </View>
                <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, writingDirection: 'ltr' }]}>
                  {visitor.phone ? formatPhoneNumber(visitor.phone) : '-'}
                </ThemedText>
              </DirectionalRow>
            </DirectionalRow>
          </DirectionalRow>
        ) : (
          <>
            {/* Mobile layout - centered stack */}
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                  {visitor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </ThemedText>
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.title, { fontWeight: '600', fontSize: 22, color: theme.text }]}>
                {visitor.name}
              </ThemedText>
              <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginTop: 4 }]}>
                {visitor.company}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <StatusBadge
                label={statusConfig.label}
                variant={statusConfig.variant}
                icon={statusConfig.icon}
              />
            </View>

            <Spacer height={Spacing.xl} />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Spacer height={Spacing.lg} />

            <DirectionalRow style={styles.infoRowNew} gap={Spacing.md}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="mail" size={16} color={theme.text} />
              </View>
              <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14 }]}>
                {visitor.email || '-'}
              </ThemedText>
            </DirectionalRow>

            <Spacer height={Spacing.md} />

            <DirectionalRow style={styles.infoRowNew} gap={Spacing.md}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="phone" size={16} color={theme.text} />
              </View>
              <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, writingDirection: 'ltr' }]}>
                {visitor.phone ? formatPhoneNumber(visitor.phone) : '-'}
              </ThemedText>
            </DirectionalRow>
          </>
        )}
      </ThemedView>

      {visitor.status === 'rejected' && visitor.rejectionReason ? (
        <>
          <Spacer height={Spacing.lg} />
          <ThemedView style={[styles.cardNew, { backgroundColor: applyOpacity(theme.error, '08') }]}>
            <DirectionalRow alignItems="flex-start" gap={Spacing.sm}>
              <View style={{ marginTop: 2 }}>
                <DDIcon name="message-circle" size={18} color={theme.error} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.bodySmall, { color: theme.error, fontWeight: '600', marginBottom: 4 }]}>
                  {t('form.reason')}
                </ThemedText>
                <ThemedText style={[Typography.body, { color: theme.text, lineHeight: 22 }]}>
                  {visitor.rejectionReason}
                </ThemedText>
              </View>
            </DirectionalRow>
          </ThemedView>
        </>
      ) : null}

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <DirectionalRow justifyContent="space-between">
          <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
            {t('visitor.visitorDetails')}
          </ThemedText>
          {visitor.isWalkIn ? (
            <DirectionalRow style={{ backgroundColor: applyOpacity(theme.warning, '15'), paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm }} gap={Spacing.xs}>
              <DDIcon name="user-check" size={14} color={theme.warning} />
              <ThemedText style={[Typography.caption, { color: theme.warning, fontWeight: '600', fontSize: 11 }]}>
                {t('reception.walkInVisitor')}
              </ThemedText>
            </DirectionalRow>
          ) : null}
        </DirectionalRow>
        <Spacer height={Spacing.xl} />

        <View style={isWebLayout ? styles.responsiveGrid : undefined}>
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew} alignItems="center">
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="clock" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('visitor.visitTime')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {visitor.visitDate ? formatDateShort(visitor.visitDate) : ''}{visitor.visitDate && visitor.time ? ' • ' : ''}{visitor.time ? formatTimeFromString(visitor.time) : ''}{visitor.endTime ? ` - ${formatTimeFromString(visitor.endTime)}` : ''}
                </ThemedText>
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.lg} />}
          </View>

          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew} alignItems="center">
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="user" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('reception.hostName')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {visitor.host}{visitor.hostDepartment ? ` - ${visitor.hostDepartment}` : ''}
                </ThemedText>
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.lg} />}
          </View>

          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew} alignItems="center">
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="home" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('visitor.meetingRoom')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {visitor.meetingRoom ? `${visitor.meetingRoom.name}${visitor.meetingRoom.floor ? ` (${visitor.meetingRoom.floor})` : ''}` : '-'}
                </ThemedText>
              </View>
            </DirectionalRow>
          </View>
        </View>
      </ThemedView>

      {/* Additional Services Section */}
      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
          {t('services.additionalServices')}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={isWebLayout ? styles.responsiveGrid : undefined}>
          {/* Meeting Room */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]} alignItems="center">
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(isCancelledVisit ? theme.textSecondary : (visitor.isMeetingRoom || visitor.meetingRoom) ? theme.secondary : theme.textSecondary, '15') }]}>
                <DDIcon name="briefcase" size={18} color={isCancelledVisit ? theme.textSecondary : (visitor.isMeetingRoom || visitor.meetingRoom) ? theme.secondary : theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text }]}>
                  {t('services.meetingRoom')}
                </ThemedText>
                {isCancelledVisit && (visitor.meetingRoom || visitor.isMeetingRoom) ? (
                  <ThemedText style={[Typography.caption, { color: theme.error, fontSize: 12, marginTop: 2 }]}>
                    {t('status.cancelled')}
                  </ThemedText>
                ) : isCancelledVisit ? (
                  <ThemedText style={[Typography.caption, { color: theme.error, fontSize: 12, marginTop: 2 }]}>
                    {t('status.cancelled')}
                  </ThemedText>
                ) : visitor.meetingRoom ? (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                    {visitor.meetingRoom.name}{visitor.meetingRoom.floor ? ` (${visitor.meetingRoom.floor})` : ''}
                  </ThemedText>
                ) : (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }]}>
                    {t('common.notRequested')}
                  </ThemedText>
                )}
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.md} />}
          </View>

          {/* Buffet Service */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]} alignItems="center">
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(isCancelledVisit ? theme.textSecondary : (visitor.isBuffet || visitor.buffet) ? theme.secondary : theme.textSecondary, '15') }]}>
                <DDIcon name="cloche" size={18} color={isCancelledVisit ? theme.textSecondary : (visitor.isBuffet || visitor.buffet) ? theme.secondary : theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text }]}>
                  {t('buffet.buffetService')}
                </ThemedText>
                {isCancelledVisit && (visitor.isBuffet || visitor.buffet) ? (
                  <ThemedText style={[Typography.caption, { color: theme.error, fontSize: 12, marginTop: 2 }]}>
                    {t('status.cancelled')}
                  </ThemedText>
                ) : isCancelledVisit ? (
                  <ThemedText style={[Typography.caption, { color: theme.error, fontSize: 12, marginTop: 2 }]}>
                    {t('status.cancelled')}
                  </ThemedText>
                ) : visitor.isBuffet || visitor.buffet ? (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                    {visitor.meetingRoom?.name ? `${visitor.meetingRoom.name} - ${visitor.meetingRoom.floor}` : (visitor.buffet?.location || t('status.pending'))}
                  </ThemedText>
                ) : (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }]}>
                    {t('common.notRequested')}
                  </ThemedText>
                )}
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.md} />}
          </View>

          {/* Parking */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={[styles.serviceItemNew, { backgroundColor: theme.surfaceSecondary }]} alignItems="center">
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(isCancelledVisit ? theme.textSecondary : (visitor.isParking || visitor.parking) ? theme.secondary : theme.textSecondary, '15') }]}>
                <DDIcon name="truck" size={18} color={isCancelledVisit ? theme.textSecondary : (visitor.isParking || visitor.parking) ? theme.secondary : theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text }]}>
                  {t('parking.parking')}
                </ThemedText>
                {isCancelledVisit && (visitor.isParking || visitor.parking) ? (
                  <ThemedText style={[Typography.caption, { color: theme.error, fontSize: 12, marginTop: 2 }]}>
                    {t('status.cancelled')}
                  </ThemedText>
                ) : isCancelledVisit ? (
                  <ThemedText style={[Typography.caption, { color: theme.error, fontSize: 12, marginTop: 2 }]}>
                    {t('status.cancelled')}
                  </ThemedText>
                ) : visitor.parking ? (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                    {visitor.parking}
                  </ThemedText>
                ) : visitor.isParking ? (
                  visitor.licensePlate || visitor.carModel || visitor.carColor ? (
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                      {[visitor.licensePlate, visitor.carModel, visitor.carColor].filter(Boolean).join(' • ')}
                    </ThemedText>
                  ) : (
                    <ThemedText style={[Typography.caption, { color: theme.secondary, fontSize: 12, marginTop: 2 }]}>
                      {t('common.requested')}
                    </ThemedText>
                  )
                ) : (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }]}>
                    {t('common.notRequested')}
                  </ThemedText>
                )}
              </View>
            </DirectionalRow>
          </View>
        </View>
      </ThemedView>

      {/* Host Details Section - only show if we have host phone info */}
      {(visitor.hostPhone || visitor.hostLandline) && (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
            <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
              {t('visitor.hostDetails')}
            </ThemedText>
            <Spacer height={Spacing.xl} />

            {/* Responsive grid for Host Details items */}
            <View style={isWebLayout ? styles.responsiveGrid : undefined}>
              {/* Host Name */}
              <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
                <DirectionalRow style={styles.serviceRowNew} alignItems="center">
                  <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                    <DDIcon name="user" size={18} color={theme.text} />
                  </View>
                  <View>
                    <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                      {t('visitor.hostName')}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                      {visitor.host}
                      {visitor.hostDepartment ? ` (${visitor.hostDepartment})` : ''}
                    </ThemedText>
                  </View>
                </DirectionalRow>
                {!isWebLayout && <Spacer height={Spacing.md} />}
              </View>

              {/* Host Phone */}
              {visitor.hostPhone && (
                <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
                  <DirectionalRow style={styles.serviceRowNew} alignItems="center">
                    <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                      <DDIcon name="phone" size={18} color={theme.text} />
                    </View>
                    <View>
                      <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                        {t('form.phone')}
                      </ThemedText>
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, writingDirection: 'ltr' }]}>
                        {formatPhoneNumber(visitor.hostPhone || '')}
                      </ThemedText>
                    </View>
                  </DirectionalRow>
                  {!isWebLayout && <Spacer height={Spacing.md} />}
                </View>
              )}

              {/* Host Landline */}
              {visitor.hostLandline && (
                <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
                  <DirectionalRow style={styles.serviceRowNew} alignItems="center">
                    <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                      <DDIcon name="phone" size={18} color={theme.text} />
                    </View>
                    <View>
                      <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                        {t('form.landline')}
                      </ThemedText>
                      <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, writingDirection: 'ltr' }]}>
                        {formatPhoneForDisplay(visitor.hostLandline || '')}
                      </ThemedText>
                    </View>
                  </DirectionalRow>
                </View>
              )}
            </View>
          </ThemedView>
        </>
      )}


      <Spacer height={Spacing.lg} />

      <RequestTimeline steps={timelineSteps} />

      <Spacer height={Spacing.lg} />

      {visitor.status === 'pending_approval' && (
        <ThemedView style={[styles.pendingApprovalBanner, { backgroundColor: applyOpacity(theme.warning, '10'), borderColor: theme.warning }]}>
          <DirectionalRow gap={Spacing.sm}>
            <DDIcon name="clock" size={20} color={theme.warning} />
            <ThemedText style={[Typography.body, { color: theme.warning, fontWeight: '600', flex: 1 }]}>
              {t('status.pendingApproval')}
            </ThemedText>
          </DirectionalRow>
        </ThemedView>
      )}

      {visitor.status === 'completed' && (
        <VisitorActionButton 
          type="completed" 
          fullWidth 
        />
      )}

      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable 
            style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
            onPress={() => setShowCancelModal(false)}
          />
          <View style={styles.modalContainer}>
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <DirectionalRow style={styles.modalHeader} justifyContent="space-between">
                <ThemedText style={[Typography.subtitle, { fontSize: 18, fontWeight: '600', color: theme.text }]}>
                  {t('actions.cancelRequest')}
                </ThemedText>
                <Pressable onPress={() => setShowCancelModal(false)}>
                  <DDIcon name="x" size={22} variant="muted" />
                </Pressable>
              </DirectionalRow>

              <Spacer height={20} />

              <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20 }]}>
                {t('common.confirm')}
              </ThemedText>

              <Spacer height={24} />

              <DirectionalRow style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelButton,
                    { opacity: pressed ? 0.7 : 1, backgroundColor: theme.surfaceSecondary, borderColor: theme.border }
                  ]}
                  onPress={() => setShowCancelModal(false)}
                >
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontWeight: '600', fontSize: 14 }]}>
                    {t('common.back')}
                  </ThemedText>
                </Pressable>

                <Spacer width={12} />

                <Pressable
                  style={({ pressed }) => [
                    styles.modalSubmitButton,
                    { opacity: pressed ? 0.8 : 1, backgroundColor: theme.error }
                  ]}
                  onPress={handleCancel}
                >
                  <ThemedText style={[Typography.body, { color: theme.buttonTextOnError, fontWeight: '600', fontSize: 14 }]}>
                    {t('actions.cancelRequest')}
                  </ThemedText>
                </Pressable>
              </DirectionalRow>
            </ThemedView>
          </View>
        </View>
      </Modal>
    </ScreenScrollView>

    {/* Sticky Footer for Actions */}
    {(visitor.status === 'approved' || visitor.status === 'visitor_accepted') && (
      <View style={[styles.stickyFooter, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
        <DirectionalRow style={styles.buttonRow}>
          {/* Only show Cancel button if current user is the host of this visit */}
          {visitDetails?.employeeId === user?.id && (
            <>
              <LoadingButton
                onPress={() => setShowCancelModal(true)}
                variant="danger-outline"
                size="large"
                icon="x-circle"
                iconPosition="left"
                style={{ flex: 1 }}
              >
                {t('actions.cancelRequest')}
              </LoadingButton>
              <View style={{ width: Spacing.md }} />
            </>
          )}
          <LoadingButton
            onPress={handleCheckIn}
            variant="success"
            size="large"
            icon="log-in"
            iconPosition="left"
            loading={checkInMutation.isPending}
            style={{ flex: 1 }}
          >
            {t('visitor.checkIn')}
          </LoadingButton>
        </DirectionalRow>
      </View>
    )}

    {visitor.status === 'checked_in' && (
      <View style={[styles.stickyFooter, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
        <LoadingButton
          onPress={handleCheckOut}
          variant="primary"
          size="large"
          icon="log-out"
          iconPosition="left"
          loading={checkOutMutation.isPending}
          fullWidth
        >
          {t('visitor.checkOut')}
        </LoadingButton>
      </View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  cardNew: {
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarNew: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  infoRowNew: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  serviceRowNew: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  serviceItemNew: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    alignItems: 'center',
  },
  pendingApprovalBanner: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    zIndex: 10,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    alignItems: 'center',
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modalSubmitButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
