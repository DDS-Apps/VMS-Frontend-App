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
import { getPlatformFlexDirection } from '@/utils/rtlInitializer';

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

  // State: No Parking
  if (parkingType === 'none') {
    return (
      <ThemedView style={[styles.parkingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.parkingHeader, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <View style={[styles.iconBadge, { backgroundColor: applyOpacity(theme.textSecondary, '15') }]}>
            <DDIcon name="slash" size={20} variant="muted" />
          </View>
          <View style={{ flex: 1, marginStart: Spacing.md }}>
            <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 15, color: theme.text }]}>
              No Parking
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}>
              Visitor will arrange own parking
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  }

  // State: Valet Parking
  if (parkingType === 'valet') {
    const hasDriver = valet?.driver;
    const isPending = !hasDriver;

    return (
      <ThemedView style={[styles.parkingCard, { 
        backgroundColor: theme.surface, 
        borderColor: isPending ? theme.warning : theme.primary,
        borderWidth: 1.5,
      }]}>
        <View style={[styles.parkingHeader, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <View style={[styles.iconBadge, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
            <DDIcon name="truck" size={20} variant="primary" />
          </View>
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
        </View>

        {hasDriver && variant === 'detailed' && (
          <>
            <Spacer height={Spacing.lg} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Spacer height={Spacing.lg} />

            <View style={[styles.detailRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
              <DDIcon name="user" size={16} variant="muted" />
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                  Driver Name
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text, marginTop: 2 }]}>
                  {valet?.driver?.name}
                </ThemedText>
              </View>
            </View>

            <Spacer height={Spacing.md} />

            <View style={[styles.detailRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
              <DDIcon name="phone" size={16} variant="muted" />
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                  Contact
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text, marginTop: 2 }]}>
                  {valet?.driver?.phone}
                </ThemedText>
              </View>
            </View>
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

    return (
      <ThemedView style={[styles.parkingCard, { 
        backgroundColor: theme.surface, 
        borderColor: isPending ? theme.warning : theme.info,
        borderWidth: 1.5,
      }]}>
        <View style={[styles.parkingHeader, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
          <View style={[styles.iconBadge, { backgroundColor: applyOpacity(theme.info, '15') }]}>
            <DDIcon name="map-pin" size={20} color={theme.info} />
          </View>
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
        </View>

        {hasSlot && variant === 'detailed' && (
          <>
            <Spacer height={Spacing.lg} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Spacer height={Spacing.lg} />

            <View style={[styles.detailRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
              <DDIcon name="map" size={16} variant="muted" />
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                  Location
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text, marginTop: 2 }]}>
                  {formatLocation(parkingSlot.location)}
                </ThemedText>
              </View>
            </View>

            <Spacer height={Spacing.md} />

            <View style={[styles.detailRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
              <DDIcon name="hash" size={16} variant="muted" />
              <View style={{ flex: 1, marginStart: Spacing.md }}>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                  Slot Number
                </ThemedText>
                <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text, marginTop: 2 }]}>
                  {parkingSlot.slotNumber}
                </ThemedText>
              </View>
            </View>

            {parkingSlot.floor && (
              <>
                <Spacer height={Spacing.md} />
                <View style={[styles.detailRow, { flexDirection: getPlatformFlexDirection(isRTL) }]}>
                  <DDIcon name="layers" size={16} variant="muted" />
                  <View style={{ flex: 1, marginStart: Spacing.md }}>
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontSize: 12 }]}>
                      Floor
                    </ThemedText>
                    <ThemedText style={[Typography.body, { fontWeight: '600', fontSize: 14, color: theme.text, marginTop: 2 }]}>
                      {parkingSlot.floor}
                    </ThemedText>
                  </View>
                </View>
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
