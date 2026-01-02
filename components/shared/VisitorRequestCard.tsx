import React, { useState } from "react";
import { View, StyleSheet, Pressable, ViewStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import Spacer from "@/components/Spacer";
import { WalkInBadge } from "@/components/shared/StatusBadge";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
import { ApprovalActionGroup } from "@/components/shared/ApprovalActionGroup";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitorRequest } from "@/types/vms.types";
import { getStatusConfig as getStatusStyle, applyOpacity } from "@/utils/statusStyles";

type CardVariant = 'default' | 'compact' | 'expandable' | 'actions' | 'selectable';

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
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
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

const ServiceIconsRow = ({ request, size = 14 }: { request: VisitorRequest; size?: number }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  const hasServices = request.parkingSlot || request.meetingRoom || request.buffet || request.valet;
  if (!hasServices) return null;

  return (
    <View style={[styles.servicesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {request.parkingSlot ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
          <DDIcon name="map-pin" size={size} color={theme.info} />
        </View>
      ) : null}
      {request.meetingRoom ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
          <DDIcon name="briefcase" size={size} color={theme.secondary} />
        </View>
      ) : null}
      {request.buffet ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
          <DDIcon name="cloche" size={size} color={theme.warning} />
        </View>
      ) : null}
      {request.valet ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.primary, '20') }]}>
          <DDIcon name="truck" size={size} color={theme.primary} />
        </View>
      ) : null}
    </View>
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
  isExpanded: controlledExpanded,
  onToggleExpand,
  showActions = false,
  onApprove,
  onReject,
  isProcessing = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  onLongPress,
}: VisitorRequestCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDateShort, formatTimeFromString, toLocalNumerals } = useFormatters();
  const { isRTL } = useLanguage();

  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const handleToggleExpand = onToggleExpand || (() => setInternalExpanded(!internalExpanded));

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

  const renderHeader = () => (
    <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {renderAvatar()}
      <View style={styles.nameSection}>
        <View style={[styles.nameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1, gap: Spacing.xs }}>
            <ThemedText style={[styles.visitorName, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {request.visitor.fullName}
            </ThemedText>
            {request.isWalkIn ? (
              <WalkInBadge size="sm" />
            ) : null}
          </View>
          {renderStatusBadge()}
        </View>
        {request.visitor.company ? (
          <ThemedText style={[styles.companyText, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {request.visitor.company}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );

  const renderRequestedBy = () => {
    if (!showRequestedBy || !request.employeeName) return null;
    return (
      <>
        <Spacer height={Spacing.sm} />
        <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
        </View>
      </>
    );
  };

  const renderHost = () => {
    if (!hostName) return null;
    return (
      <>
        <Spacer height={Spacing.xs} />
        <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <DDIcon name="user" size={12} variant="muted" />
          <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
            {t('reception.hostName')}:
          </ThemedText>
          <ThemedText style={[styles.infoValue, { color: theme.text }]}>
            {hostName}
          </ThemedText>
        </View>
      </>
    );
  };

  const renderDateTime = () => (
    <View style={[styles.dateTimeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.dateTimeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <DDIcon name="calendar" size={13} color={theme.textSecondary} />
        <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
          {formatDate(request.visitDate)}
        </ThemedText>
      </View>
      <View style={[styles.dateTimeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
  );

  const renderLocation = () => {
    if (!location) return null;
    return (
      <>
        <Spacer height={Spacing.xs} />
        <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <DDIcon name="map-pin" size={13} variant="muted" />
          <ThemedText style={[styles.infoValue, { color: theme.textSecondary, flex: 1, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {location}
          </ThemedText>
        </View>
      </>
    );
  };

  const renderExpandedContent = () => {
    if (variant !== 'expandable' || !isExpanded) return null;
    return (
      <>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <View style={styles.expandedContent}>
          {request.purpose ? (
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="briefcase" size={14} variant="muted" />
              <ThemedText style={[styles.expandedText, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {request.purpose}
              </ThemedText>
            </View>
          ) : null}
          
          {(request.visitor.email || request.visitor.phone) ? (
            <>
              <Spacer height={Spacing.sm} />
              {request.visitor.email ? (
                <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="mail" size={13} variant="muted" />
                  <ThemedText style={[styles.expandedTextSmall, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.visitor.email}
                  </ThemedText>
                </View>
              ) : null}
              {request.visitor.email && request.visitor.phone ? <Spacer height={Spacing.xs} /> : null}
              {request.visitor.phone ? (
                <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <DDIcon name="phone" size={13} variant="muted" />
                  <ThemedText style={[styles.expandedTextSmall, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.visitor.phone}
                  </ThemedText>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </>
    );
  };

  const renderExpandToggle = () => {
    if (variant !== 'expandable') return null;
    return (
      <Pressable
        style={[styles.expandToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={handleToggleExpand}
        android_ripple={{ color: applyOpacity(theme.primary, '10') }}
      >
        <ThemedText style={[styles.expandToggleText, { color: theme.primary }]}>
          {isExpanded ? t('common.close') : t('actions.viewDetails')}
        </ThemedText>
        <DDIcon 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={16} 
          variant="primary" 
        />
      </Pressable>
    );
  };

  const renderActions = () => {
    if (!showActions || isSelectionMode) return null;
    return (
      <>
        <Spacer height={Spacing.md} />
        <ApprovalActionGroup
          onApprove={onApprove || (() => {})}
          onReject={onReject || (() => {})}
          disabled={isProcessing}
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
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          width: width,
          opacity: pressed ? 0.9 : 1,
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
          
          <Spacer height={Spacing.md} />
          
          {renderDateTime()}
          {renderLocation()}
          
          <Spacer height={Spacing.md} />
          
          <ServiceIconsRow request={request} />
          
          {renderActions()}
        </View>

        {renderExpandedContent()}
        {renderExpandToggle()}
      </ThemedView>
    </Pressable>
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
  },
  avatar: {
    width: LAYOUT.avatarSize,
    height: LAYOUT.avatarSize,
    borderRadius: LAYOUT.cardRadius - 2,
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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
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
    justifyContent: 'space-between',
  },
  dateTimeItem: {
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
    gap: Spacing.sm,
  },
  servicePill: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerLine: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  expandedContent: {
    paddingHorizontal: Spacing.lg + LAYOUT.accentWidth,
    paddingVertical: Spacing.md,
  },
  expandedText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  expandedTextSmall: {
    fontSize: 11,
  },
  expandToggle: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  expandToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  checkboxContainer: {
    position: 'absolute',
    top: Spacing.md,
    end: Spacing.md,
    zIndex: 1,
  },
});
