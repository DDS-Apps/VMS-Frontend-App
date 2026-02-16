import React, { useState } from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { capitalizeFirst } from "@/utils/formatters";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import Spacer from "@/components/Spacer";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { DirectionalIconLabel } from "@/components/DirectionalIconLabel";
import { DirectionalRow } from "@/components/DirectionalRow";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitorRequest } from "@/types/vms.types";
import { getStatusConfig as getStatusStyle, applyOpacity } from "@/utils/statusStyles";

type CardVariant = 'default' | 'compact' | 'actions' | 'selectable';

interface VisitorRequestCardProps {
  request: VisitorRequest;
  onPress: () => void;
  width?: number;
  accentColor?: string;
  showRequestedBy?: boolean;
  hostName?: string;
  location?: string;
  style?: ViewStyle;
  variant?: CardVariant;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
  approveLoading?: boolean;
  rejectLoading?: boolean;
  isExpired?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  onLongPress?: () => void;
}

const LAYOUT = {
  cardRadius: BorderRadius.md,
  avatarSize: 44,
  accentWidth: 4,
};

const ServiceIconsRow = ({ request, size = 14, showWalkIn = false }: { request: VisitorRequest; size?: number; showWalkIn?: boolean }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  
  const showParking = request.isVisitorNeedsParking === true || request.visitorNeedsParking === true || !!request.parkingSlot;
  const showMeetingRoom = request.isMeetingRoom === true || !!request.meetingRoom;
  const showBuffet = request.isBuffet === true || !!request.buffet;
  const showValet = !!request.valet;
  
  const hasServices = showParking || showMeetingRoom || showBuffet || showValet || (showWalkIn && request.isWalkIn);
  
  if (!hasServices) {
    return null;
  }

  const serviceItems: React.ReactNode[] = [];
  
  if (showWalkIn && request.isWalkIn) {
    serviceItems.push(
      <View key="walkin" style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '15') }]}>
        <DDIcon name="user-plus" size={size} color={theme.secondary} />
      </View>
    );
  }
  if (showParking) {
    serviceItems.push(
      <View key="parking" style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
        <DDIcon name="map-pin" size={size} color={theme.info} />
      </View>
    );
  }
  if (showMeetingRoom) {
    serviceItems.push(
      <View key="meeting" style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
        <DDIcon name="briefcase" size={size} color={theme.secondary} />
      </View>
    );
  }
  if (showBuffet) {
    serviceItems.push(
      <View key="buffet" style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
        <DDIcon name="cloche" size={size} color={theme.warning} />
      </View>
    );
  }
  if (showValet) {
    serviceItems.push(
      <View key="valet" style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
        <DDIcon name="truck" size={size} color={theme.primary} />
      </View>
    );
  }

  return (
    <DirectionalRow style={styles.servicesRow} gap={Spacing.sm}>
      {serviceItems}
    </DirectionalRow>
  );
};

export function VisitorRequestCard({
  request,
  onPress,
  width,
  accentColor,
  showRequestedBy = false,
  hostName,
  location,
  style,
  variant = 'default',
  showActions = false,
  onApprove,
  onReject,
  isProcessing = false,
  approveLoading = false,
  rejectLoading = false,
  isExpired = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  onLongPress,
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
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handlePress = () => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection();
    } else {
      onPress();
    }
  };

  const renderAvatar = () => (
    <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
      <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
        {initials}
      </ThemedText>
    </View>
  );

  const renderStatusBadge = () => (
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
  );

  const renderHeader = () => {

    return (
      <DirectionalRow style={styles.cardHeader} gap={Spacing.md}>
        {renderAvatar()}
        <View style={styles.nameSection}>
          <ThemedText style={[styles.visitorName, { color: theme.text, width: '100%' }]} align="start" numberOfLines={1}>
            {capitalizeFirst(request.visitor.fullName)}
          </ThemedText>
          {request.visitor.company ? (
            <ThemedText style={[styles.companyText, { color: theme.textSecondary, width: '100%' }]} align="start">
              {request.visitor.company}
            </ThemedText>
          ) : null}
        </View>
      </DirectionalRow>
    );
  };

  const renderIconText = (icon: string, text: string, iconSize: number = 13) => {
    return (
      <DirectionalIconLabel 
        icon={icon} 
        iconSize={iconSize}
        iconColor={theme.textSecondary}
        style={styles.dateTimeItem}
        gap={4}
      >
        <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
          {text}
        </ThemedText>
      </DirectionalIconLabel>
    );
  };

  const renderDateTime = () => {
    return (
      <DirectionalRow 
        style={styles.dateTimeRow}
      >
        {renderIconText('calendar', formatDate(request.visitDate))}
        <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
        {renderIconText('clock', formatTime(request.visitTime))}
        {request.duration ? (
          <>
            <ThemedText style={[styles.separator, { color: theme.border }]}>•</ThemedText>
            <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
              {formatDuration(request.duration)}
            </ThemedText>
          </>
        ) : null}
      </DirectionalRow>
    );
  };

  const renderServicesAndStatus = () => {
    return (
      <DirectionalRow style={styles.servicesStatusRow}>
        <DirectionalRow style={styles.servicesContainer}>
          <ServiceIconsRow request={request} showWalkIn={true} />
        </DirectionalRow>
        {renderStatusBadge()}
      </DirectionalRow>
    );
  };

  const renderDetailRow = (iconName: string, text: string, numberOfLines: number = 1) => {
    return (
      <DirectionalIconLabel 
        icon={iconName} 
        iconSize={14}
        iconColor={theme.textSecondary}
        style={styles.detailRow}
        gap={Spacing.sm}
      >
        <ThemedText style={[styles.detailText, { color: theme.text }]} numberOfLines={numberOfLines}>
          {text}
        </ThemedText>
      </DirectionalIconLabel>
    );
  };

  const renderRequestedBy = () => {
    if (!showRequestedBy || !request.employeeName) return null;
    
    return (
      <>
        <Spacer height={Spacing.sm} />
        <DirectionalRow style={styles.infoRow} gap={Spacing.xs}>
          <DDIcon name="user" size={12} variant="muted" />
          <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
            {t('dashboard.requestedBy')}
          </ThemedText>
          <ThemedText style={[styles.infoValue, { color: theme.text }]}>
            {request.employeeName}
          </ThemedText>
          {request.employeeDepartment ? (
            <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
              ({request.employeeDepartment})
            </ThemedText>
          ) : null}
        </DirectionalRow>
      </>
    );
  };

  const renderHost = () => {
    if (!hostName || hostName.toLowerCase() === 'unknown host' || hostName.trim() === '') return null;
    
    return (
      <>
        <Spacer height={Spacing.xs} />
        <DirectionalRow style={styles.infoRow} gap={Spacing.xs}>
          <DDIcon name="user" size={12} variant="muted" />
          <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
            {t('reception.hostName')}:
          </ThemedText>
          <ThemedText style={[styles.infoValue, { color: theme.text }]}>
            {hostName}
          </ThemedText>
        </DirectionalRow>
      </>
    );
  };

  const renderActions = () => {
    if (!showActions || isSelectionMode) return null;
    
    if (isExpired) {
      return (
        <>
          <Spacer height={Spacing.md} />
          <View style={[styles.expiredBanner, { backgroundColor: applyOpacity(theme.textSecondary, '10'), borderColor: theme.border }]}>
            <DDIcon name="clock" size={14} color={theme.textSecondary} />
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: Spacing.xs }]}>
              {t('visitor.visitExpired')}
            </ThemedText>
          </View>
        </>
      );
    }
    
    return (
      <>
        <Spacer height={Spacing.md} />
        <ApprovalActionGroup
          onApprove={() => { if (onApprove) onApprove(); }}
          onReject={() => { if (onReject) onReject(); }}
          disabled={isProcessing}
          approveLoading={approveLoading}
          rejectLoading={rejectLoading}
          size="medium"
        />
      </>
    );
  };

  const renderSelectionCheckbox = () => {
    if (!isSelectionMode) return null;
    return (
      <View style={styles.checkboxContainer}>
        <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelection || (() => {})} />
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.9}
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          width: width,
        },
        style,
      ]}
    >
      <ThemedView style={[styles.cardInner, { backgroundColor: theme.surface }]}>
        <View style={[styles.accentLine, { backgroundColor: borderColor }]} />
        
        {renderSelectionCheckbox()}

        <View style={styles.mainContent}>
          {renderHeader()}
          {renderRequestedBy()}
          {renderHost()}
          
          <Spacer height={Spacing.sm} />
          
          {renderDateTime()}
          
          <Spacer height={Spacing.sm} />
          
          {renderServicesAndStatus()}
          
          {renderActions()}
        </View>

      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.cardRadius,
    overflow: 'hidden',
  },
  cardInner: {
    borderRadius: LAYOUT.cardRadius,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.accentWidth,
    borderTopStartRadius: LAYOUT.cardRadius,
    borderBottomStartRadius: LAYOUT.cardRadius,
  },
  mainContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingEnd: Spacing.lg,
    paddingStart: Spacing.lg + LAYOUT.accentWidth,
  },
  cardHeader: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: LAYOUT.avatarSize,
    height: LAYOUT.avatarSize,
    borderRadius: LAYOUT.avatarSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  companyText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  infoRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoLabel: {
    fontSize: 11,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateTimeRow: {
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: Spacing.xs,
  },
  dateTimeItem: {
    alignItems: 'center',
    gap: 4,
  },
  dateTimeText: {
    fontSize: 13,
  },
  separator: {
    fontSize: 13,
  },
  servicesStatusRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  servicesContainer: {
    flex: 1,
  },
  servicesRow: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  servicePill: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  checkboxContainer: {
    position: 'absolute',
    top: Spacing.md,
    end: Spacing.md,
    zIndex: 1,
  },
  expiredBanner: {
    flexDirection: 'row', // Static - doesn't need RTL flip (centered icon + text)
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
