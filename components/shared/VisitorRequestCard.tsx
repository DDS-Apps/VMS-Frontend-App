import React from "react";
import { View, StyleSheet, Pressable, ViewStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon } from "@/components/DDIcon";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitorRequest } from "@/types/vms.types";
import { getStatusConfig as getStatusStyle, applyOpacity } from "@/utils/statusStyles";

interface VisitorRequestCardProps {
  request: VisitorRequest;
  onPress: () => void;
  width?: number;
  accentColor?: string;
  showRequestedBy?: boolean;
  style?: ViewStyle;
}

export function VisitorRequestCard({
  request,
  onPress,
  width,
  accentColor,
  showRequestedBy = false,
  style,
}: VisitorRequestCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDateShort, formatTimeFromString, toLocalNumerals } = useFormatters();
  const { isRTL } = useLanguage();

  const statusConfig = getStatusStyle(theme, request.status, t);
  const borderColor = accentColor || statusConfig.borderColor;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return formatDateShort(date);
  };

  const formatTime = (timeString: string): string => {
    return formatTimeFromString(timeString);
  };

  const formatDuration = (durationStr: string): string => {
    const isoMatch = durationStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
    if (isoMatch) {
      const hours = isoMatch[1] ? parseInt(isoMatch[1], 10) : 0;
      const minutes = isoMatch[2] ? parseInt(isoMatch[2], 10) : 0;
      const parts: string[] = [];
      if (hours > 0) {
        const localHours = toLocalNumerals(hours.toString());
        parts.push(`${localHours} ${hours === 1 ? t('time.hour') : t('time.hours')}`);
      }
      if (minutes > 0) {
        const localMinutes = toLocalNumerals(minutes.toString());
        parts.push(`${localMinutes} ${minutes === 1 ? t('time.minute') : t('time.minutes')}`);
      }
      return parts.length > 0 ? parts.join(' ') : toLocalNumerals(durationStr);
    }
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

  const initials = request.visitor.fullName
    .split(' ')
    .map(n => n[0])
    .join('');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          width: width,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
      onPress={onPress}
    >
      <View style={[styles.statusBorderLine, { backgroundColor: borderColor }]} />

      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
          <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
            {initials}
          </ThemedText>
        </View>
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <ThemedText style={[styles.visitorName, { color: theme.text }]} numberOfLines={1}>
              {request.visitor.fullName}
            </ThemedText>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 },
              ]}
            >
              <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                {statusConfig.label}
              </ThemedText>
            </View>
          </View>
          {request.visitor.company ? (
            <ThemedText style={[styles.companyText, { color: theme.textSecondary }]}>
              {request.visitor.company}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {showRequestedBy && request.employeeName ? (
        <>
          <Spacer height={Spacing.sm} />
          <View style={[styles.employeeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ThemedText style={[styles.employeeLabel, { color: theme.textSecondary }]}>
              {t('dashboard.requestedBy')}:
            </ThemedText>
            <ThemedText style={[styles.employeeName, { color: theme.text }]}>
              {request.employeeName}
            </ThemedText>
            {request.employeeDepartment ? (
              <ThemedText style={[styles.employeeLabel, { color: theme.textSecondary }]}>
                ({request.employeeDepartment})
              </ThemedText>
            ) : null}
          </View>
        </>
      ) : null}

      <Spacer height={Spacing.md} />

      <View style={styles.dateTimeRow}>
        <View style={[styles.dateTimeLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <DDIcon name="calendar" size={13} color={theme.textSecondary} />
          <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
            {formatDate(request.visitDate)}
          </ThemedText>
        </View>
        <View style={[styles.dateTimeRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <DDIcon name="clock" size={13} color={theme.textSecondary} />
          <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
            {formatTime(request.visitTime)}
          </ThemedText>
          {request.duration ? (
            <>
              <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
              <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
                {formatDuration(request.duration)}
              </ThemedText>
            </>
          ) : null}
        </View>
      </View>

      <Spacer height={Spacing.md} />

      <View style={styles.servicesRow}>
        {request.parkingSlot ? (
          <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
            <DDIcon name="map-pin" size={14} color={theme.info} />
          </View>
        ) : null}
        {request.meetingRoom ? (
          <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
            <DDIcon name="briefcase" size={14} color={theme.secondary} />
          </View>
        ) : null}
        {request.buffet ? (
          <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
            <DDIcon name="coffee" size={14} color={theme.warning} />
          </View>
        ) : null}
        {request.valet ? (
          <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
            <DDIcon name="truck" size={14} color={theme.primary} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingEnd: Spacing.lg,
    paddingStart: Spacing.lg + 4,
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
    start: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopStartRadius: 10,
    borderBottomStartRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  nameSection: {
    flex: 1,
    marginStart: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  companyText: {
    fontSize: 12,
    marginTop: 2,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeLabel: {
    fontSize: 11,
  },
  employeeName: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
  },
  separator: {
    fontSize: 13,
  },
  servicesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  servicePill: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
