import React from "react";
import { View, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { applyOpacity } from "@/utils/statusStyles";
import { formatPhoneNumber } from "@/utils/formatters";
import { useSecurityVisitorQuery } from "@/hooks/queries/useSecurityQueries";
import type { SecurityVisitorDetailScreenProps } from "@/types/securityNavigation.types";
import { DirectionalRow } from '@/components/DirectionalRow';

export default function SecurityVisitorDetailScreen({ route }: SecurityVisitorDetailScreenProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const { formatDate, formatTimeFromString } = useFormatters();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { visitorId } = route.params;
  
  // Responsive layout: use grid on web (>768px), single column on mobile
  const isWebLayout = screenWidth >= 768;
  const gridItemWidth = screenWidth > 1024 ? '32%' : '48%';

  const { data: visitorData, isLoading, isError } = useSecurityVisitorQuery(visitorId);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const getStatusConfig = (status: string): { label: string; bg: string; text: string; border: string; icon: IconName } => {
    switch (status) {
      case 'checked_in':
      case 'on_site':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: applyOpacity(theme.success, '30'), icon: 'check-circle' };
      case 'checked_out':
      case 'completed':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: applyOpacity(theme.textSecondary, '30'), icon: 'log-out' };
      case 'cancelled':
        return { label: t('status.cancelled'), bg: applyOpacity(theme.error, '15'), text: theme.error, border: applyOpacity(theme.error, '30'), icon: 'x-circle' };
      default:
        return { label: t('visitor.expectedVisitors').split(' ')[0], bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: applyOpacity(theme.warning, '30'), icon: 'clock' };
    }
  };

  if (isLoading) {
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

  if (isError || !visitorData) {
    return (
      <ScreenScrollView contentContainerStyle={[scrollContentStyle, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-circle" size={48} color={theme.error} />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.error, textAlign: 'center' }]}>
          {t('errors.failedToLoadData')}
        </ThemedText>
      </ScreenScrollView>
    );
  }

  const statusConfig = getStatusConfig(visitorData.status);
  const needsParking = visitorData.isVisitorNeedsParking ?? visitorData.visitorNeedsParking;
  const hasParking = needsParking === true || visitorData.parkingAssigned || false;
  
  // Build parking display info
  const getParkingDisplayInfo = () => {
    if (needsParking === false) {
      return { text: t('security.noParking'), showDetails: false };
    } else if (needsParking === true) {
      const carDetails: string[] = [];
      if (visitorData.licensePlate) carDetails.push(visitorData.licensePlate);
      if (visitorData.carModel) carDetails.push(visitorData.carModel);
      if (visitorData.carColor) carDetails.push(visitorData.carColor);
      
      if (carDetails.length > 0) {
        return { text: `${t('security.needsParking')}: ${carDetails.join(' - ')}`, showDetails: true };
      } else {
        return { text: `${t('security.needsParking')} (${t('security.parkingDetailsPending')})`, showDetails: true };
      }
    } else if (visitorData.parkingSpot) {
      return { text: visitorData.parkingSpot, showDetails: true };
    } else if (visitorData.parkingAssigned) {
      return { text: t('security.parkingAssigned'), showDetails: true };
    }
    return { text: t('security.noParking'), showDetails: false };
  };
  
  const parkingInfo = getParkingDisplayInfo();

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.avatarNew, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {visitorData.visitorName.split(' ').map(n => n[0]).join('')}
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

          <View
            style={{
              alignSelf: 'center',
              backgroundColor: statusConfig.bg,
              borderColor: statusConfig.border,
              borderWidth: StyleSheet.hairlineWidth,
              paddingHorizontal: Spacing.md,
              paddingVertical: 6,
              borderRadius: BorderRadius.full,
            }}
          >
            <ThemedText style={[Typography.caption, { color: statusConfig.text, fontWeight: '600', fontSize: 12 }]}>
              {statusConfig.label}
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.xl} />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Spacer height={Spacing.lg} />

        <DirectionalRow style={[styles.infoRowNew, { gap: Spacing.md, justifyContent: 'space-between' }]}>
          <DDIcon name="mail" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14 }]}>
            {visitorData.visitorEmail || '-'}
          </ThemedText>
        </DirectionalRow>

        <Spacer height={Spacing.md} />

        <DirectionalRow style={[styles.infoRowNew, { gap: Spacing.md }]}>
          <DDIcon name="phone" size={16} variant="muted" />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, textAlign: 'right' }]}>
            {visitorData.visitorPhone ? formatPhoneNumber(visitorData.visitorPhone) : '-'}
          </ThemedText>
        </DirectionalRow>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
          {t('visitor.visitDetails')}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        {isWebLayout ? (
          <View style={styles.responsiveGrid}>
            <View style={{ width: gridItemWidth }}>
              <DirectionalRow style={styles.serviceRowNew}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                  <DDIcon name="clock" size={18} color={theme.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                    {t('visitor.visitTime')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                    {formatTimeFromString(visitorData.scheduledTime)}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </View>

            <View style={{ width: gridItemWidth }}>
              <DirectionalRow style={styles.serviceRowNew}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                  <DDIcon name="calendar" size={18} color={theme.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                    {t('visitor.visitDate')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                    {formatDate(new Date(visitorData.scheduledDate), 'long')}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </View>

            <View style={{ width: gridItemWidth }}>
              <DirectionalRow style={styles.serviceRowNew}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                  <DDIcon name="user" size={18} color={theme.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                    {t('reception.hostName')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                    {visitorData.hostName}{visitorData.hostDepartment ? ` - ${visitorData.hostDepartment}` : ''}
                  </ThemedText>
                </View>
              </DirectionalRow>
            </View>
          </View>
        ) : (
          <>
            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="calendar" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('visitor.visitDate')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {formatDate(new Date(visitorData.scheduledDate), 'long')}
                </ThemedText>
              </View>
            </DirectionalRow>

            <Spacer height={Spacing.lg} />

            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="clock" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('visitor.visitTime')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {formatTimeFromString(visitorData.scheduledTime)}
                </ThemedText>
              </View>
            </DirectionalRow>

            <Spacer height={Spacing.lg} />

            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="user" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('reception.hostName')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13 }]}>
                  {visitorData.hostName}{visitorData.hostDepartment ? ` - ${visitorData.hostDepartment}` : ''}
                </ThemedText>
              </View>
            </DirectionalRow>
          </>
        )}

        {visitorData.purpose ? (
          <>
            <Spacer height={Spacing.lg} />

            <DirectionalRow style={styles.serviceRowNew}>
              <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                <DDIcon name="briefcase" size={18} color={theme.text} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                  {t('form.purpose')}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, lineHeight: 20 }]}>
                  {visitorData.purpose}
                </ThemedText>
              </View>
            </DirectionalRow>
          </>
        ) : null}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
          {t('services.parking')}
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <DirectionalRow style={styles.serviceRowNew}>
          <View style={[styles.serviceIcon, { backgroundColor: hasParking ? applyOpacity(theme.primary, '15') : applyOpacity(theme.textSecondary, '15') }]}>
            <DDIcon name="map-pin" size={18} color={hasParking ? theme.primary : theme.text} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
              {t('services.parking')}
            </ThemedText>
            {parkingInfo.showDetails ? (
              <ThemedText style={[Typography.caption, { color: theme.primary, marginTop: 2, fontSize: 13, fontWeight: '500' }]}>
                {parkingInfo.text}
              </ThemedText>
            ) : (
              <DirectionalRow style={[styles.noBadge, { backgroundColor: applyOpacity(theme.textSecondary, '12') }]}>
                <DDIcon name="x-circle" size={12} color={theme.textSecondary} />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontWeight: '500', marginStart: 4, fontSize: 12 }]}>
                  {parkingInfo.text}
                </ThemedText>
              </DirectionalRow>
            )}
          </View>
        </DirectionalRow>

      </ThemedView>

      {(visitorData.checkInTime || visitorData.checkOutTime) ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
            <ThemedText style={[Typography.subtitle, { fontSize: 16, fontWeight: '600', color: theme.text }]}>
              {t('actions.checkIn')} / {t('actions.checkOut')}
            </ThemedText>
            <Spacer height={Spacing.xl} />

            {visitorData.checkInTime ? (
              <DirectionalRow style={styles.serviceRowNew}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                  <DDIcon name="log-in" size={18} color={theme.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                    {t('actions.checkIn')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.success, marginTop: 2, fontSize: 13, fontWeight: '500' }]}>
                    {formatTimeFromString(visitorData.checkInTime)}
                  </ThemedText>
                </View>
              </DirectionalRow>
            ) : null}

            {visitorData.checkInTime && visitorData.checkOutTime ? (
              <Spacer height={Spacing.lg} />
            ) : null}

            {visitorData.checkOutTime ? (
              <DirectionalRow style={styles.serviceRowNew}>
                <View style={[styles.serviceIcon, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
                  <DDIcon name="log-out" size={18} color={theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15 }]}>
                    {t('actions.checkOut')}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, fontSize: 13, fontWeight: '500' }]}>
                    {formatTimeFromString(visitorData.checkOutTime)}
                  </ThemedText>
                </View>
              </DirectionalRow>
            ) : null}
          </ThemedView>
        </>
      ) : null}

      {visitorData.notes ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.cardNew, { backgroundColor: theme.surface }]}>
            <DirectionalRow style={styles.notesHeader}>
              <DDIcon name="file-text" size={16} color={theme.info} />
              <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginEnd: Spacing.sm, fontSize: 14, color: theme.text }]}>
                {t('form.notes')}
              </ThemedText>
            </DirectionalRow>
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, fontSize: 14, lineHeight: 20 }]}>
              {visitorData.notes}
            </ThemedText>
          </ThemedView>
        </>
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  cardNew: {
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
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
    lineHeight: 40,
    fontWeight: '700',
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
  noBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    marginTop: 2,
  },
  notesHeader: {
    alignItems: 'center',
  },
});
