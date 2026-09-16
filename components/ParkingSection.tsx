import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import DirectionalRow from "@/components/DirectionalRow";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ParkingType, ParkingSlot, ValetService } from "@/types/vms.types";
import { applyOpacity } from "@/utils/statusStyles";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";
import { useTranslation } from "@/hooks/useTranslation";

interface ParkingSectionProps {
  parkingType: ParkingType;
  parkingSlot?: ParkingSlot;
  valet?: ValetService;
  parkingDecision?: unknown;
  visitorNeedsParking?: boolean | null;
  isVisitorNeedsParking?: boolean | null;
  variant?: 'detailed' | 'compact';
}

export function ParkingSection({ 
  parkingType, 
  parkingSlot, 
  valet,
  parkingDecision,
  visitorNeedsParking,
  isVisitorNeedsParking,
}: ParkingSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const decision = resolveParkingDisplayDecision({
    parkingDecision,
    visitorNeedsParking,
    isVisitorNeedsParking,
    hasParkingAllocation: parkingType !== 'none' || !!parkingSlot || !!valet,
  });
  const isRequired = decision === 'required';
  const renderIconBadge = (iconName: string, variant: string, color?: string) => (
    <View style={[styles.iconBadge, { backgroundColor: applyOpacity(color || theme.textSecondary, '15') }]}>
      <DDIcon name={iconName as any} size={20} variant={variant as any} color={color} />
    </View>
  );

  return (
    <ThemedView style={[styles.parkingCard, { backgroundColor: theme.surface, borderColor: isRequired ? theme.info : theme.border }]}>
      <DirectionalRow style={styles.parkingHeader}>
        {renderIconBadge(isRequired ? 'map-pin' : 'slash', isRequired ? 'info' : 'muted', isRequired ? theme.info : undefined)}
        <ThemedText style={[Typography.body, { flex: 1, marginStart: Spacing.md, fontWeight: '600', fontSize: 15, color: theme.text }]}>
          {isRequired ? t('parking.needsParking') : t('parking.noParking')}
        </ThemedText>
      </DirectionalRow>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  parkingCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  parkingHeader: {
    alignItems: 'flex-start',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
