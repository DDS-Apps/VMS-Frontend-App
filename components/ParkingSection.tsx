import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { ParkingType, ParkingSlot, ValetService } from "@/types/vms.types";
import { applyOpacity } from "@/utils/statusStyles";
import { shouldSwapChildrenForRTL } from '@/utils/rtlInitializer';

interface ParkingSectionProps {
  parkingType: ParkingType;
  parkingSlot?: ParkingSlot;
  valet?: ValetService;
  variant?: 'detailed' | 'compact';
}

export function ParkingSection({ 
  parkingType, 
  parkingSlot, 
  valet,
  variant = 'detailed' 
}: ParkingSectionProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const shouldSwap = shouldSwapChildrenForRTL(isRTL);

  const renderIconBadge = (iconName: string, variant: string, color?: string) => (
    <View style={[styles.iconBadge, { backgroundColor: applyOpacity(color || theme.textSecondary, '15') }]}>
      <DDIcon name={iconName as any} size={20} variant={variant as any} color={color} />
    </View>
  );

  // State: No Parking
  if (parkingType === 'none') {
    const iconEl = renderIconBadge('slash', 'muted');
    const contentEl = (
      <View style={{ flex: 1, marginStart: Spacing.md }}>
        <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, color: theme.text }]}>
          No Parking
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}>
          Visitor will arrange own parking
        </ThemedText>
      </View>
    );

    return (
      <ThemedView style={[styles.parkingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.parkingHeader, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>{contentEl}{iconEl}</>
          ) : (
            <>{iconEl}{contentEl}</>
          )}
        </View>
      </ThemedView>
    );
  }

  // State: Valet Parking
  if (parkingType === 'valet') {
    const hasDriver = valet?.driver;
    const isPending = !hasDriver;

    const valetIconEl = (
      <View style={[styles.iconBadge, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
        <DDIcon name="truck" size={20} variant="primary" />
      </View>
    );
    const valetContentEl = (
      <View style={{ flex: 1, marginStart: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, color: theme.text }]}>
            Valet Service
          </ThemedText>
          <View style={[styles.statusBadge, { 
            backgroundColor: isPending ? applyOpacity(theme.warning, '15') : applyOpacity(theme.success, '15') 
          }]}>
            <ThemedText style={[Typography.caption, { 
              color: isPending ? theme.warning : theme.success, 
              fontSize: 11, 
              fontWeight: '600' 
            }]}>
              {isPending ? 'PENDING' : 'ASSIGNED'}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}>
          {isPending ? 'Driver will be assigned shortly' : 'Driver assigned and ready'}
        </ThemedText>
      </View>
    );

    const renderDetailRow = (iconName: string, label: string, value: string | undefined) => {
      const detailIconEl = <DDIcon name={iconName as any} size={16} variant="muted" />;
      const detailContentEl = (
        <View style={{ flex: 1, marginStart: Spacing.md }}>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
            {label}
          </ThemedText>
          <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text, marginTop: 2 }]}>
            {value}
          </ThemedText>
        </View>
      );
      return (
        <View style={[styles.detailRow, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>{detailContentEl}{detailIconEl}</>
          ) : (
            <>{detailIconEl}{detailContentEl}</>
          )}
        </View>
      );
    };

    return (
      <ThemedView style={[styles.parkingCard, { 
        backgroundColor: theme.surface, 
        borderColor: isPending ? theme.warning : theme.primary,
        borderWidth: 1.5,
      }]}>
        <View style={[styles.parkingHeader, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>{valetContentEl}{valetIconEl}</>
          ) : (
            <>{valetIconEl}{valetContentEl}</>
          )}
        </View>

        {hasDriver && variant === 'detailed' && (
          <>
            <Spacer height={Spacing.lg} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Spacer height={Spacing.lg} />

            {renderDetailRow('user', 'Driver Name', valet?.driver?.name)}

            <Spacer height={Spacing.md} />

            {renderDetailRow('phone', 'Contact', valet?.driver?.phone)}
          </>
        )}
      </ThemedView>
    );
  }

  // State: Auto Parking
  if (parkingType === 'auto') {
    const hasSlot = parkingSlot && parkingSlot.slotNumber;
    const isAssigned = hasSlot && (parkingSlot.status === 'active' || parkingSlot.status === 'assigned' || !parkingSlot.status);
    const isPending = !hasSlot;

    const formatLocation = (location: string) => {
      const lowerLocation = location.toLowerCase();
      switch (lowerLocation) {
        case 'skbc_basement': return 'SKBC Basement';
        case 'red_sea_mall': return 'Red Sea Mall';
        case 'valet': return 'Valet Area';
        default: return location;
      }
    };

    const autoIconEl = (
      <View style={[styles.iconBadge, { backgroundColor: applyOpacity(theme.info, '15') }]}>
        <DDIcon name="map-pin" size={20} color={theme.info} />
      </View>
    );
    const autoContentEl = (
      <View style={{ flex: 1, marginStart: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, color: theme.text }]}>
            Auto Parking
          </ThemedText>
          <View style={[styles.statusBadge, { 
            backgroundColor: isPending ? applyOpacity(theme.warning, '15') : applyOpacity(theme.success, '15') 
          }]}>
            <ThemedText style={[Typography.caption, { 
              color: isPending ? theme.warning : theme.success, 
              fontSize: 11, 
              fontWeight: '600' 
            }]}>
              {isPending ? 'PENDING' : 'ASSIGNED'}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}>
          {isPending ? 'Slot will be assigned soon' : `${parkingSlot?.slotNumber ? parkingSlot.slotNumber : 'Parking slot confirmed'}`}
        </ThemedText>
      </View>
    );

    const renderAutoDetailRow = (iconName: string, label: string, value: string | undefined) => {
      const detailIconEl = <DDIcon name={iconName as any} size={16} variant="muted" />;
      const detailContentEl = (
        <View style={{ flex: 1, marginStart: Spacing.md }}>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
            {label}
          </ThemedText>
          <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text, marginTop: 2 }]}>
            {value}
          </ThemedText>
        </View>
      );
      return (
        <View style={[styles.detailRow, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>{detailContentEl}{detailIconEl}</>
          ) : (
            <>{detailIconEl}{detailContentEl}</>
          )}
        </View>
      );
    };

    return (
      <ThemedView style={[styles.parkingCard, { 
        backgroundColor: theme.surface, 
        borderColor: isPending ? theme.warning : theme.info,
        borderWidth: 1.5,
      }]}>
        <View style={[styles.parkingHeader, { flexDirection: 'row' }]}>
          {shouldSwap ? (
            <>{autoContentEl}{autoIconEl}</>
          ) : (
            <>{autoIconEl}{autoContentEl}</>
          )}
        </View>

        {hasSlot && variant === 'detailed' && (
          <>
            <Spacer height={Spacing.lg} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Spacer height={Spacing.lg} />

            {renderAutoDetailRow('map', 'Location', formatLocation(parkingSlot.location))}

            <Spacer height={Spacing.md} />

            {renderAutoDetailRow('hash', 'Slot Number', parkingSlot.slotNumber)}

            {parkingSlot.floor && (
              <>
                <Spacer height={Spacing.md} />
                {renderAutoDetailRow('layers', 'Floor', parkingSlot.floor)}
              </>
            )}
          </>
        )}
      </ThemedView>
    );
  }

  return null;
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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  detailRow: {
    alignItems: 'flex-start',
  },
});
