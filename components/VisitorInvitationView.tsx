import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { DDIcon } from './DDIcon';
import Spacer from './Spacer';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useFormatters } from '../hooks/useFormatters';
import { VisitorRequest } from '../types/vms.types';

interface VisitorInvitationViewProps {
  request: VisitorRequest;
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
}

export function VisitorInvitationView({
  request,
  onAccept,
  onReject,
}: VisitorInvitationViewProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate: fmtDate, formatTime: fmtTime } = useFormatters();
  const insets = useSafeAreaInsets();
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null);

  const handleAccept = () => {
    setDecision('accepted');
    onAccept?.(request.id);
  };

  const handleReject = () => {
    setDecision('rejected');
    onReject?.(request.id);
  };

  const formatDate = (dateString: string) => {
    return fmtDate(new Date(dateString), 'long');
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return fmtTime(date);
  };

  if (decision) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
            backgroundColor: theme.background,
          },
        ]}
      >
        <View style={styles.successContainer}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  decision === 'accepted' ? theme.success + '15' : theme.error + '15',
              },
            ]}
          >
            <DDIcon
              name={decision === 'accepted' ? 'check-circle' : 'x-circle'}
              variant={decision === 'accepted' ? 'success' : 'danger'}
              size={64}
            />
          </View>
          <Spacer height={Spacing.xl} />
          <ThemedText
            style={[
              Typography.title,
              { fontWeight: '700', textAlign: 'center', fontSize: 28, lineHeight: 36 },
            ]}
          >
            {decision === 'accepted' ? t('visitor.invitationAccepted') : t('visitor.invitationDeclined')}
          </ThemedText>
          <Spacer height={Spacing.md} />
          <ThemedText
            style={[
              Typography.body,
              { color: theme.textSecondary, textAlign: 'center' },
            ]}
          >
            {decision === 'accepted'
              ? `${t('invitation.scheduledFor')} ${formatDate(request.visitDate)}`
              : t('visitor.invitationDeclined')}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          backgroundColor: theme.background,
        },
      ]}
    >
      <View style={styles.content}>
        <ThemedView
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ThemedText style={[Typography.title, { fontWeight: '700', fontSize: 28, lineHeight: 36 }]}>
            {t('invitation.title')}
          </ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
            {t('invitation.youAreInvited')}
          </ThemedText>
        </ThemedView>

        <Spacer height={Spacing.xl} />

        <ThemedView
          style={[
            styles.qrPlaceholder,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <DDIcon name="maximize" variant="muted" size={48} />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t('invitation.scanQrCode')}
          </ThemedText>
        </ThemedView>

        <Spacer height={Spacing.xl} />

        <ThemedView
          style={[
            styles.detailsCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ThemedText
            style={[
              Typography.subtitle,
              { fontWeight: '600', marginBottom: Spacing.lg },
            ]}
          >
            {t('invitation.visitDetails')}
          </ThemedText>

          <View style={styles.detailRow}>
            <DDIcon name="user" variant="primary" size={20} />
            <View style={styles.detailContent}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('reception.hostName')}
              </ThemedText>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {request.employeeName}
              </ThemedText>
              {request.employeeDepartment ? (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                  {request.employeeDepartment}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.detailRow}>
            <DDIcon name="calendar" variant="primary" size={20} />
            <View style={styles.detailContent}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('form.date')} & {t('form.time')}
              </ThemedText>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {formatDate(request.visitDate)}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {formatTime(request.visitTime)}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.detailRow}>
            <DDIcon name="map-pin" variant="primary" size={20} />
            <View style={styles.detailContent}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('invitation.location')}
              </ThemedText>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {request.meetingRoom?.name || 'Main Office'}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.md} />
          <View style={styles.detailRow}>
            <DDIcon name="file-text" variant="primary" size={20} />
            <View style={styles.detailContent}>
              <ThemedText
                style={[Typography.caption, { color: theme.textSecondary }]}
              >
                {t('reception.purposeOfVisit')}
              </ThemedText>
              <ThemedText style={[Typography.body]}>
                {request.purpose}
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        <Spacer height={Spacing.xl} />

        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleReject}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.surface,
                borderColor: theme.error,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <DDIcon name="x" variant="danger" size={20} />
            <ThemedText
              style={[
                Typography.body,
                { color: theme.error, fontWeight: '600', marginStart: Spacing.sm },
              ]}
            >
              {t('actions.reject')}
            </ThemedText>
          </Pressable>

          <Spacer width={Spacing.md} />

          <Pressable
            onPress={handleAccept}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.success,
                borderColor: theme.success,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <DDIcon name="check" color={theme.buttonText} size={20} />
            <ThemedText
              style={[
                Typography.body,
                { color: theme.buttonText, fontWeight: '600', marginStart: Spacing.sm },
              ]}
            >
              {t('actions.approve')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    flex: 1,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  qrPlaceholder: {
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  detailsCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailContent: {
    flex: 1,
    marginStart: Spacing.md,
  },
  notesSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 500,
    alignSelf: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
