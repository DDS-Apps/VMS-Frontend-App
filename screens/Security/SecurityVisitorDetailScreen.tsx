import React from "react";
import { View, StyleSheet, ActivityIndicator, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography, FontFamily } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { applyOpacity } from "@/utils/statusStyles";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { RequestTimeline, type TimelineStep } from "@/components/shared/RequestTimeline";
import { formatPhoneNumber, formatPhoneForDisplay, getInitials } from "@/utils/formatters";
import { useSecurityVisitorQuery } from "@/hooks/queries/useSecurityQueries";
import type { SecurityVisitorDetailScreenProps } from "@/types/securityNavigation.types";
import { DirectionalRow } from '@/components/DirectionalRow';
import { PURPOSE_VALUE_TO_KEY, normalizePurposeValue } from "@/constants/requestConstants";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import { getSecurityTimelineTimestamps } from "@/utils/securityTimeline";

export default function SecurityVisitorDetailScreen({ route }: SecurityVisitorDetailScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const { formatDate, formatTimeFromString } = useFormatters();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { visitorId } = route.params;
  
  const isWebLayout = screenWidth >= 768;
  const gridItemWidth = screenWidth > 900 ? '32%' : '48%';

  const {
    data: visitorData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useSecurityVisitorQuery(visitorId);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  
  if (isLoading && !visitorData) {
    return (
      <ScreenScrollView contentContainerStyle={[scrollContentStyle, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
          {t('common.loading')}
        </ThemedText>
      </ScreenScrollView>
    );
  }

  if (!visitorData) {
    return (
      <ScreenScrollView contentContainerStyle={[scrollContentStyle, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-circle" size={48} color={theme.error} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.error, textAlign: 'center' }]}>
          {t('errors.failedToLoadData')}
        </ThemedText>
        <Spacer height={Spacing.lg} />
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <ThemedText style={[Typography.body, { color: theme.buttonText, fontWeight: '600' }]}>
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      </ScreenScrollView>
    );
  }

  const initials = getInitials(visitorData.visitorName);
  const parkingDecision = resolveParkingDisplayDecision({
    parkingDecision: (visitorData as any).parkingDecision,
    visitorNeedsParking: visitorData.visitorNeedsParking,
    isVisitorNeedsParking: visitorData.isVisitorNeedsParking,
    hasParking: (visitorData as any).hasParking,
    hasParkingAllocation: visitorData.parkingAssigned,
  });

  const getTimelineSteps = (): TimelineStep[] => {
    const status = visitorData.status;
    const isCheckedIn = status === 'checked_in';
    const isCheckedOut = status === 'checked_out' || status === 'completed';
    const timestamps = getSecurityTimelineTimestamps(visitorData);
    
    return [
      {
        id: 'arrived',
        label: t('timeline.visitorArrived'),
        icon: 'user-check' as IconName,
        status: isCheckedIn || isCheckedOut ? 'completed' : 'pending',
        timestamp: timestamps.arrivedAt,
      },
      {
        id: 'checked-in',
        label: t('timeline.visitorCheckedIn'),
        icon: 'log-in' as IconName,
        status: isCheckedIn || isCheckedOut ? 'completed' : 'pending',
        timestamp: timestamps.checkedInAt,
      },
      {
        id: 'checked-out',
        label: t('timeline.visitorCheckedOut'),
        icon: 'log-out' as IconName,
        status: isCheckedOut ? 'completed' : 'pending',
        timestamp: timestamps.checkedOutAt,
      }
    ];
  };

  const timelineSteps = getTimelineSteps();

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      {isFetching || isError ? (
        <DirectionalRow
          style={[
            styles.inlineQueryState,
            {
              backgroundColor: applyOpacity(
                isError && !isFetching ? theme.error : theme.primary,
                '10',
              ),
            },
          ]}
        >
          {isError && !isFetching ? (
            <DDIcon name="alert-circle" size={16} color={theme.error} />
          ) : (
            <ActivityIndicator size="small" color={theme.primary} />
          )}
          <ThemedText
            style={[
              Typography.caption,
              {
                color:
                  isError && !isFetching
                    ? theme.error
                    : theme.textSecondary,
                flex: 1,
              },
            ]}
          >
            {t(
              isError && !isFetching
                ? 'errors.failedToLoadData'
                : 'common.loading',
            )}
          </ThemedText>
          {isError && !isFetching ? (
            <Pressable onPress={() => refetch()} hitSlop={8}>
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.primary, fontWeight: '600' },
                ]}
              >
                {t('common.retry')}
              </ThemedText>
            </Pressable>
          ) : null}
        </DirectionalRow>
      ) : null}

      {isFetching || isError ? <Spacer height={Spacing.md} /> : null}

      {/* Header Card */}
      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        {isWebLayout ? (
          <DirectionalRow style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.md }}>
            {/* Left group: Avatar + Name + Badge */}
            <DirectionalRow style={{ alignItems: 'center', gap: Spacing.md, flex: 1, minWidth: 200 }}>
              {/* Avatar */}
              <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                <ThemedText
                  style={[styles.avatarText, { color: theme.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {initials}
                </ThemedText>
              </View>

              {/* Name and Company */}
              <View style={{ minWidth: 100, flexShrink: 1 }}>
                <ThemedText style={[Typography.title, { fontWeight: '600', fontSize: 18, color: theme.text }]} numberOfLines={1}>
                  {visitorData.visitorName}
                </ThemedText>
                {visitorData.visitorCompany && (
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 13, marginTop: 2 }]} numberOfLines={1}>
                    {visitorData.visitorCompany}
                  </ThemedText>
                )}
              </View>

              {/* Status Badge */}
              <RequestStatusBadge status={visitorData.status} />
            </DirectionalRow>

            {/* Right group: Contact info */}
            <DirectionalRow style={{ alignItems: 'center', gap: Spacing.lg, flexShrink: 0 }}>
              {/* Email */}
              {!!visitorData.visitorEmail && (
                <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                  <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15'), width: 32, height: 32 }]}>
                    <DDIcon name="mail" size={16} color={theme.text} />
                  </View>
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14 }]}>
                    {visitorData.visitorEmail}
                  </ThemedText>
                </DirectionalRow>
              )}

              {/* Phone */}
              {!!visitorData.visitorPhone && (
                <DirectionalRow style={{ alignItems: 'center', gap: Spacing.sm }}>
                  <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15'), width: 32, height: 32 }]}>
                    <DDIcon name="phone" size={16} color={theme.text} />
                  </View>
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, writingDirection: 'ltr' }]}>
                    {formatPhoneNumber(visitorData.visitorPhone)}
                  </ThemedText>
                </DirectionalRow>
              )}
            </DirectionalRow>
          </DirectionalRow>
        ) : (
          <>
            {/* Mobile layout - centered stack */}
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                <ThemedText
                  style={[styles.avatarText, { color: theme.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {initials}
                </ThemedText>
              </View>

              <Spacer height={Spacing.lg} />

              <ThemedText style={[Typography.title, { fontWeight: '600', fontSize: 22, color: theme.text }]}>
                {visitorData.visitorName}
              </ThemedText>
              <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, marginTop: 4 }]}>
                {visitorData.visitorCompany || ''}
              </ThemedText>

              <Spacer height={Spacing.sm} />

              <RequestStatusBadge status={visitorData.status} />
            </View>

            <Spacer height={Spacing.xl} />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Spacer height={Spacing.lg} />

            {!!visitorData.visitorEmail && (
              <>
                <DirectionalRow style={[styles.infoRowNew, { justifyContent: 'flex-start', gap: Spacing.md }]}>
                  <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                    <DDIcon name="mail" size={18} color={theme.text} />
                  </View>
                  <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14 }]}>
                    {visitorData.visitorEmail}
                  </ThemedText>
                </DirectionalRow>

                <Spacer height={Spacing.md} />
              </>
            )}

            {!!visitorData.visitorPhone && (
              <DirectionalRow style={[styles.infoRowNew, { justifyContent: 'flex-start', gap: Spacing.md }]}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                  <DDIcon name="phone" size={18} color={theme.text} />
                </View>
                <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, writingDirection: 'ltr' }]}>
                  {formatPhoneNumber(visitorData.visitorPhone)}
                </ThemedText>
              </DirectionalRow>
            )}
          </>
        )}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      {/* Visit Details Section */}
      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
          {t('visitor.visitDetails')}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={isWebLayout ? styles.responsiveGrid : undefined}>
          {/* Visit Time */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="clock" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('visitor.visitTime')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {formatTimeFromString(visitorData.scheduledTime)}{visitorData.endTime ? ` - ${formatTimeFromString(visitorData.endTime)}` : ''}
                </ThemedText>
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.lg} />}
          </View>

          {/* Host Name */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="user" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('reception.hostName')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {visitorData.hostName}{visitorData.hostDepartment ? ` - ${visitorData.hostDepartment}` : ''}
                </ThemedText>
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.lg} />}
          </View>

          {/* Purpose */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="target" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('form.purpose')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {(() => { const pv = normalizePurposeValue(visitorData.purpose || ''); return PURPOSE_VALUE_TO_KEY[pv] ? t(PURPOSE_VALUE_TO_KEY[pv] as any) : (visitorData.purpose || '-'); })()}
                </ThemedText>
              </View>
            </DirectionalRow>
          </View>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      {/* Host Details Section */}
      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
          {t('visitor.hostDetails')}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={isWebLayout ? styles.responsiveGrid : undefined}>
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="user" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('reception.hostName')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {visitorData.hostName}{visitorData.hostDepartment ? ` (${visitorData.hostDepartment})` : ''}
                </ThemedText>
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.lg} />}
          </View>

          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="phone" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('form.phone')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, writingDirection: 'ltr' }]}>
                  {visitorData.hostPhoneNumber ? formatPhoneNumber(visitorData.hostPhoneNumber) : '-'}
                </ThemedText>
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.lg} />}
          </View>

          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="phone" size={18} color={theme.text} />
              </View>
              <View>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('form.landline')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, writingDirection: 'ltr' }]}>
                  {visitorData.hostBusinessPhone ? formatPhoneForDisplay(visitorData.hostBusinessPhone) : '-'}
                </ThemedText>
              </View>
            </DirectionalRow>
          </View>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      {/* Additional Services Section — hidden for walk-in visitors */}
      {!visitorData.isWalkIn && <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
          {t('services.additionalServices')}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={isWebLayout ? styles.responsiveGrid : undefined}>
          {/* Meeting Room */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow
              style={[
                styles.serviceItemNew,
                { backgroundColor: theme.surfaceSecondary },
              ]}
            >
              <View
                style={[
                  styles.serviceIcon,
                  {
                    backgroundColor: applyOpacity(
                      visitorData.isMeetingRoom || visitorData.meetingRoom
                        ? theme.secondary
                        : theme.textSecondary,
                      '15',
                    ),
                  },
                ]}
              >
                <DDIcon
                  name="briefcase"
                  size={18}
                  color={
                    visitorData.isMeetingRoom || visitorData.meetingRoom
                      ? theme.secondary
                      : theme.textSecondary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[
                    Typography.body,
                    { fontWeight: '600', fontSize: 14, color: theme.text },
                  ]}
                >
                  {t('services.meetingRoom')}
                </ThemedText>
                {visitorData.isMeetingRoom || visitorData.meetingRoom ? (
                  visitorData.status === 'cancelled' || visitorData.status === 'rejected' ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.error, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {t('status.cancelled')}
                    </ThemedText>
                  ) : visitorData.meetingRoom?.name ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {visitorData.meetingRoom.name}{visitorData.meetingRoom.floor ? ` - ${visitorData.meetingRoom.floor}` : ''}
                    </ThemedText>
                  ) : (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.warning, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {t('status.scheduled')}
                    </ThemedText>
                  )
                ) : visitorData.status === 'cancelled' ? (
                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.error, fontSize: 12, marginTop: 2 },
                    ]}
                  >
                    {t('status.cancelled')}
                  </ThemedText>
                ) : (
                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
                    ]}
                  >
                    {t('common.notRequested')}
                  </ThemedText>
                )}
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.md} />}
          </View>

          {/* Buffet Service */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow
              style={[
                styles.serviceItemNew,
                { backgroundColor: theme.surfaceSecondary },
              ]}
            >
              <View
                style={[
                  styles.serviceIcon,
                  {
                    backgroundColor: applyOpacity(
                      visitorData.isBuffet || visitorData.buffet
                        ? theme.secondary
                        : theme.textSecondary,
                      '15',
                    ),
                  },
                ]}
              >
                <DDIcon
                  name="cloche"
                  size={18}
                  color={
                    visitorData.isBuffet || visitorData.buffet
                      ? theme.secondary
                      : theme.textSecondary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[
                    Typography.body,
                    { fontWeight: '600', fontSize: 14, color: theme.text },
                  ]}
                >
                  {t('buffet.buffetService')}
                </ThemedText>
                {visitorData.isBuffet || visitorData.buffet ? (
                  visitorData.status === 'cancelled' || visitorData.status === 'rejected' ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.error, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {t('status.cancelled')}
                    </ThemedText>
                  ) : visitorData.buffet?.location ? (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {visitorData.meetingRoom?.name ? `${visitorData.meetingRoom.name} - ${visitorData.meetingRoom.floor}` : visitorData.buffet.location}
                    </ThemedText>
                  ) : (
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: theme.warning, fontSize: 12, marginTop: 2 },
                      ]}
                    >
                      {t('status.pending')}
                    </ThemedText>
                  )
                ) : visitorData.status === 'cancelled' ? (
                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.error, fontSize: 12, marginTop: 2 },
                    ]}
                  >
                    {t('status.cancelled')}
                  </ThemedText>
                ) : (
                  <ThemedText
                    style={[
                      Typography.caption,
                      { color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
                    ]}
                  >
                    {t('common.notRequested')}
                  </ThemedText>
                )}
              </View>
            </DirectionalRow>
            {!isWebLayout && <Spacer height={Spacing.md} />}
          </View>

          {/* Parking */}
          <View style={isWebLayout ? { width: gridItemWidth } : undefined}>
            <DirectionalRow
              style={[
                styles.serviceItemNew,
                { backgroundColor: theme.surfaceSecondary },
              ]}
            >
              <View
                style={[
                  styles.serviceIcon,
                  {
                    backgroundColor: applyOpacity(
                      parkingDecision === 'required'
                        ? theme.secondary
                        : theme.textSecondary,
                      '15',
                    ),
                  },
                ]}
              >
                <DDIcon
                  name="truck"
                  size={18}
                  color={
                    parkingDecision === 'required'
                      ? theme.secondary
                      : theme.textSecondary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[
                    Typography.body,
                    { fontWeight: '600', fontSize: 14, color: theme.text },
                  ]}
                >
                  {t('services.parking')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12, marginTop: 2 }]}>
                  {parkingDecision === 'required' ? t('parking.needsParking') : t('parking.noParking')}
                </ThemedText>
              </View>
            </DirectionalRow>
          </View>
        </View>
      </ThemedView>}

      <Spacer height={Spacing.lg} />

      <RequestTimeline
        steps={timelineSteps}
        title={t('timeline.requestTimeline')}
        timezone={visitorData.timezone}
      />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  inlineQueryState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cardNew: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarNew: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FontFamily.latinSemiBold,
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
  },
  serviceRowNew: {
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceItemNew: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  timelineItemNew: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIconContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  timelineDotNew: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLineNew: {
    position: 'absolute',
    top: 32,
    width: 2,
    height: 36,
  },
});
