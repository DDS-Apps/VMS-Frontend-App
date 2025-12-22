import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormatters } from '@/hooks/useFormatters';
import { useLanguage } from '@/contexts/LanguageContext';
import { VisitorRequest } from '@/types/vms.types';
import { getStatusConfig as getStatusStyle } from '@/utils/statusStyles';

interface UpcomingVisitorsSectionProps {
  visitors: VisitorRequest[];
  onViewDetails: (requestId: string) => void;
}

interface UpcomingVisitorCardProps {
  request: VisitorRequest;
  onPress: () => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const UpcomingVisitorCard: React.FC<UpcomingVisitorCardProps> = ({ request, onPress }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate, toLocalNumerals, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const initials = getInitials(request.visitor.fullName);
  const statusConfig = getStatusStyle(theme, request.status, t);

  const formatVisitDate = (dateString: string): string => {
    const date = new Date(dateString);
    return formatDate(date);
  };

  const formatDuration = (durationStr: string): string => {
    const match = durationStr.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|minute|minutes|min|mins)/i);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      const localNum = toLocalNumerals(num.toString());
      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        return `${localNum} ${num === 1 ? t('time.hour') : t('time.hours')}`;
      } else {
        return `${localNum} ${num === 1 ? t('time.minute') : t('time.minutes')}`;
      }
    }
    return toLocalNumerals(durationStr);
  };

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView
          style={[
            styles.cardNew,
            { backgroundColor: theme.surface },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.borderColor }]} />
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.avatarNew, { backgroundColor: theme.primary + '15' }]}>
              <ThemedText style={[styles.avatarTextNew, { color: theme.primary }]}>{initials}</ThemedText>
            </View>
            <View style={[styles.nameSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <ThemedText style={[styles.visitorNameNew, { textAlign: isRTL ? 'right' : 'left' }]}>{request.visitor.fullName}</ThemedText>
              {request.visitor.company ? (
                <ThemedText style={[styles.companyText, { textAlign: isRTL ? 'right' : 'left' }]}>{request.visitor.company}</ThemedText>
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: Spacing.md }}>
            <View style={[styles.dateTimeRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="calendar" size={13} variant="muted" />
              <ThemedText style={styles.dateTimeText}>
                {formatVisitDate(request.visitDate)}
              </ThemedText>
              <ThemedText style={styles.separator}>•</ThemedText>
              <DDIcon name="clock" size={13} variant="muted" />
              <ThemedText style={styles.dateTimeText}>
                {formatTimeFromString(request.visitTime)}
              </ThemedText>
              <ThemedText style={styles.separator}>•</ThemedText>
              <ThemedText style={styles.dateTimeText}>
                {formatDuration(request.duration)}
              </ThemedText>
            </View>
          </View>

          <View style={{ marginTop: Spacing.md }}>
            <View style={[styles.bottomRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.servicesRowNew, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {request.meetingRoom && (
                <View style={[styles.servicePillNew, { backgroundColor: theme.secondary + '20' }]}>
                  <DDIcon name="briefcase" size={14} color={theme.secondary} />
                </View>
              )}
              {(request.parkingSlot || request.parkingType !== 'none') && (
                <View style={[styles.servicePillNew, { backgroundColor: theme.info + '20' }]}>
                  <DDIcon name="map-pin" size={14} color={theme.info} />
                </View>
              )}
              {request.valet && (
                <View style={[styles.servicePillNew, { backgroundColor: theme.primary + '20' }]}>
                  <DDIcon name="truck" size={14} color={theme.primary} />
                </View>
              )}
              {request.buffet && (
                <View style={[styles.servicePillNew, { backgroundColor: theme.warning + '20' }]}>
                  <DDIcon name="cloche" size={14} color={theme.warning} />
                </View>
              )}
              </View>
              <View style={[styles.statusBadgeNew, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 }]}>
                <ThemedText style={[styles.statusTextNew, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      )}
    </Pressable>
  );
};

export const UpcomingVisitorsSection: React.FC<UpcomingVisitorsSectionProps> = ({
  visitors,
  onViewDetails,
}) => {
  const { t } = useTranslation();
  
  if (visitors.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{t('dashboard.upcomingVisitors')}</ThemedText>
      {visitors.map((request) => (
        <UpcomingVisitorCard
          key={request.id}
          request={request}
          onPress={() => onViewDetails(request.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md,
    color: '#1A1A1A',
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  cardNew: {
    padding: Spacing.lg,
    borderRadius: 10,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  statusBorderLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarNew: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextNew: {
    fontSize: 16,
    fontWeight: '700',
  },
  nameSection: {
    flex: 1,
    marginStart: Spacing.md,
  },
  visitorNameNew: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  companyText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadgeNew: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusTextNew: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateTimeRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  separator: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  servicesRowNew: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  servicePillNew: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRowNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: Typography.subtitle.fontWeight,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visitorName: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: Typography.subtitle.fontWeight,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.label.fontWeight,
    textTransform: 'capitalize',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.bodySmall.fontSize,
    marginStart: Spacing.sm,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  purposeSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  purposeLabel: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: Typography.subtitle.fontWeight,
    marginBottom: Spacing.xs,
  },
  purposeText: {
    fontSize: Typography.bodySmall.fontSize,
  },
  servicesSection: {
    marginTop: Spacing.md,
  },
  servicesLabel: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: Typography.subtitle.fontWeight,
    marginBottom: Spacing.sm,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  serviceText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.label.fontWeight,
  },
  detailsButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: Typography.subtitle.fontWeight,
  },
});
