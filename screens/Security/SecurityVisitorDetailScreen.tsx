import React from "react";
import { View, StyleSheet } from "react-native";
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
import { SecurityVisitor } from "@/services/mock/securityVisitorState";
import type { SecurityVisitorDetailScreenProps } from "@/types/securityNavigation.types";

export default function SecurityVisitorDetailScreen({ route }: SecurityVisitorDetailScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate, formatTime, toLocalNumerals } = useFormatters();
  const insets = useSafeAreaInsets();
  const { visitor }: { visitor: SecurityVisitor } = route.params;

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const getStatusConfig = (status: string): { label: string; bg: string; text: string; icon: IconName } => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, icon: 'check-circle' };
      case 'checked_out':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, icon: 'log-out' };
      case 'cancelled':
        return { label: t('status.cancelled'), bg: applyOpacity(theme.error, '15'), text: theme.error, icon: 'x-circle' };
      default:
        return { label: t('visitor.expectedVisitors').split(' ')[0], bg: applyOpacity(theme.warning, '15'), text: theme.warning, icon: 'clock' };
    }
  };

  const statusConfig = getStatusConfig(visitor.status);

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.header}>
        <View style={[styles.largeAvatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
          <ThemedText style={[styles.largeAvatarText, { color: theme.primary }]}>
            {visitor.name.split(' ').map(n => n[0]).join('')}
          </ThemedText>
        </View>
        <Spacer height={Spacing.lg} />
        <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '600', textAlign: 'center' }]}>
          {visitor.name}
        </ThemedText>
        <Spacer height={Spacing.xs} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {visitor.company}
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
              {visitor.visitTime}
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
              {formatDate(new Date(visitor.visitDate), 'long')}
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
              {visitor.host}
            </ThemedText>
          </View>
        </View>

        {visitor.meetingRoom ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <DDIcon name="home" size={18} variant="muted" />
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                  {t('admin.meetingRooms')}
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: '500' }]}>
                  {visitor.meetingRoom.roomName}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {visitor.meetingRoom.floor} - {visitor.meetingRoom.timeSlot}
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
            color={visitor.parking.hasParking ? theme.primary : theme.textSecondary} 
          />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('security.parkingStatus')}
            </ThemedText>
            {visitor.parking.hasParking ? (
              <>
                <ThemedText style={[Typography.body, { fontWeight: '500', color: theme.primary }]}>
                  {visitor.parking.slotNumber}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {visitor.parking.location} - {visitor.parking.floor}
                </ThemedText>
              </>
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
            color={visitor.valet.hasValet ? theme.accent : theme.textSecondary} 
          />
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
              {t('security.valetStatus')}
            </ThemedText>
            {visitor.valet.hasValet ? (
              <>
                <ThemedText style={[Typography.body, { fontWeight: '500', color: theme.accent }]}>
                  {t('security.valetService')}
                </ThemedText>
                {visitor.valet.driverName ? (
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('valet.driver')}: {visitor.valet.driverName}
                  </ThemedText>
                ) : null}
                {visitor.valet.status ? (
                  <View style={[styles.valetStatusBadge, { backgroundColor: applyOpacity(theme.accent, '12') }]}>
                    <ThemedText style={[Typography.caption, { color: theme.accent, fontWeight: '500' }]}>
                      {visitor.valet.status.replace('_', ' ').toUpperCase()}
                    </ThemedText>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={[styles.noBadge, { backgroundColor: applyOpacity(theme.textSecondary, '12') }]}>
                <DDIcon name="x-circle" size={12} color={theme.textSecondary} />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontWeight: '500' }]}>
                  {t('security.noValet')}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ThemedView>

      {(visitor.checkInTime || visitor.checkOutTime) ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
            <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
              {t('actions.checkIn')} / {t('actions.checkOut')}
            </ThemedText>

            {visitor.checkInTime ? (
              <View style={styles.infoRow}>
                <DDIcon name="log-in" size={18} color={theme.success} />
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                    {t('actions.checkIn')} {t('visitor.visitTime')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, { fontWeight: '500', color: theme.success }]}>
                    {visitor.checkInTime}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {visitor.checkInTime && visitor.checkOutTime ? (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            ) : null}

            {visitor.checkOutTime ? (
              <View style={styles.infoRow}>
                <DDIcon name="log-out" size={18} variant="muted" />
                <View style={{ flex: 1, marginStart: Spacing.md }}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 11 }]}>
                    {t('actions.checkOut')} {t('visitor.visitTime')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, { fontWeight: '500', color: theme.textSecondary }]}>
                    {visitor.checkOutTime}
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </ThemedView>
        </>
      ) : null}

      {visitor.status === 'cancelled' && visitor.cancelReason ? (
        <>
          <Spacer height={Spacing.lg} />

          <ThemedView style={[styles.card, { backgroundColor: applyOpacity(theme.error, '08') }]}>
            <View style={styles.cancelledHeader}>
              <DDIcon name="x-circle" size={18} color={theme.error} />
              <ThemedText style={[Typography.subtitle, { fontWeight: '600', color: theme.error, marginStart: Spacing.sm }]}>
                {t('status.cancelled')}
              </ThemedText>
            </View>
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.body, { color: theme.error }]}>
              {visitor.cancelReason}
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
  valetStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  cancelledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
