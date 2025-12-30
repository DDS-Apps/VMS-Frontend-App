import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
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
import { useSecurityVisitorQuery } from "@/hooks/queries/useSecurityQueries";
import type { SecurityVisitorDetailScreenProps } from "@/types/securityNavigation.types";

export default function SecurityVisitorDetailScreen({ route }: SecurityVisitorDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate, formatTimeFromString } = useFormatters();
  const insets = useSafeAreaInsets();
  const { visitorId } = route.params;

  const { data: visitorData, isLoading, isError } = useSecurityVisitorQuery(visitorId);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const getStatusConfig = (status: string): { label: string; bg: string; text: string; icon: IconName } => {
    switch (status) {
      case 'checked_in':
      case 'on_site':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, icon: 'check-circle' };
      case 'checked_out':
      case 'completed':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, icon: 'log-out' };
      case 'cancelled':
        return { label: t('status.cancelled'), bg: applyOpacity(theme.error, '15'), text: theme.error, icon: 'x-circle' };
      default:
        return { label: t('visitor.expectedVisitors').split(' ')[0], bg: applyOpacity(theme.warning, '15'), text: theme.warning, icon: 'clock' };
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
  const hasParking = visitorData.parkingAssigned || false;

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.header}>
        <View style={[styles.largeAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
          <ThemedText style={[styles.largeAvatarText, { color: theme.primary }]}>
            {visitorData.visitorName.split(' ').map(n => n[0]).join('')}
          </ThemedText>
        </View>
        <Spacer height={Spacing.lg} />
        <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '600', textAlign: 'center' }]}>
          {visitorData.visitorName}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {visitorData.visitorCompany || ''}
        </ThemedText>
        <Spacer height={Spacing.md} />
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <DDIcon name={statusConfig.icon} size={14} color={statusConfig.text} />
          <ThemedText style={[Typography.caption, { color: statusConfig.text, fontWeight: '600', marginStart: Spacing.xs }]}>
            {statusConfig.label}
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing.xxl} />

      <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
          {t('visitor.visitorDetails')}
        </ThemedText>

        <View style={styles.infoRow}>
          <DDIcon name="clock" size={18} variant="muted" />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('visitor.visitTime')}
            </ThemedText>
            <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
              {formatTimeFromString(visitorData.scheduledTime)}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <DDIcon name="calendar" size={18} variant="muted" />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('visitor.visitDate')}
            </ThemedText>
            <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
              {formatDate(new Date(visitorData.scheduledDate), 'long')}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <DDIcon name="user" size={18} variant="muted" />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('reception.hostName')}
            </ThemedText>
            <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
              {visitorData.hostName}
            </ThemedText>
            {visitorData.hostDepartment ? (
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {visitorData.hostDepartment}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {visitorData.purpose ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <DDIcon name="briefcase" size={18} variant="muted" />
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                  {t('form.purpose')}
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                  {visitorData.purpose}
                </ThemedText>
              </View>
            </View>
          </>
        ) : null}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
        <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
          {t('security.parkingAndValet')}
        </ThemedText>

        <View style={styles.infoRow}>
          <DDIcon 
            name="map-pin" 
            size={18} 
            color={hasParking ? theme.primary : theme.textSecondary} 
          />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('security.parkingStatus')}
            </ThemedText>
            {hasParking ? (
              <ThemedText style={[Typography.body, { fontWeight: '500', color: theme.primary }]}>
                {visitorData.parkingSpot || t('security.parkingAssigned')}
              </ThemedText>
            ) : (
              <View style={[styles.noBadge, { backgroundColor: applyOpacity(theme.textSecondary, '12') }]}>
                <DDIcon name="x-circle" size={12} color={theme.textSecondary} />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontWeight: '500' }]}>
                  {t('security.noParking')}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <DDIcon 
            name="truck" 
            size={18} 
            color={theme.textSecondary} 
          />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('security.valetStatus')}
            </ThemedText>
            <View style={[styles.noBadge, { backgroundColor: applyOpacity(theme.textSecondary, '12') }]}>
              <DDIcon name="x-circle" size={12} color={theme.textSecondary} />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontWeight: '500' }]}>
                {t('security.noValet')}
              </ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>

      {(visitorData.checkInTime || visitorData.checkOutTime) ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
              {t('actions.checkIn')} / {t('actions.checkOut')}
            </ThemedText>

            {visitorData.checkInTime ? (
              <View style={styles.infoRow}>
                <DDIcon name="log-in" size={18} color={theme.success} />
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                    {t('actions.checkIn')} {t('visitor.visitTime')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, { fontWeight: '500', color: theme.success }]}>
                    {formatTimeFromString(visitorData.checkInTime)}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {visitorData.checkInTime && visitorData.checkOutTime ? (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            ) : null}

            {visitorData.checkOutTime ? (
              <View style={styles.infoRow}>
                <DDIcon name="log-out" size={18} variant="muted" />
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                    {t('actions.checkOut')} {t('visitor.visitTime')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, { fontWeight: '500', color: theme.textSecondary }]}>
                    {formatTimeFromString(visitorData.checkOutTime)}
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </ThemedView>
        </>
      ) : null}

      {visitorData.notes ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.notesHeader}>
              <DDIcon name="file-text" size={18} variant="muted" />
              <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginStart: Spacing.sm }]}>
                {t('form.notes')}
              </ThemedText>
            </View>
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
              {visitorData.notes}
            </ThemedText>
          </ThemedView>
        </>
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  noBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
    marginTop: 2,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
