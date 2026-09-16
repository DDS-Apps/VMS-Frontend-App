import React from "react";
import { View, StyleSheet } from "react-native";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyOpacity } from "@/utils/statusStyles";
import { Spacing } from "@/constants/theme";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";

interface ServiceIconsProps {
  parkingSlot?: unknown;
  meetingRoom?: unknown;
  buffet?: unknown;
  valet?: unknown;
  parkingDecision?: unknown;
  visitorNeedsParking?: boolean | null;
  isVisitorNeedsParking?: boolean | null;
  size?: number;
}

export const ServiceIcons = ({ 
  parkingSlot, 
  meetingRoom, 
  buffet, 
  valet, 
  parkingDecision,
  visitorNeedsParking,
  isVisitorNeedsParking,
  size = 16 
}: ServiceIconsProps) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();  const iconContainerSize = size * 2;
  
  const items: React.ReactNode[] = [];
  
  if (resolveParkingDisplayDecision({
    parkingDecision,
    visitorNeedsParking,
    isVisitorNeedsParking,
    hasParkingAllocation: !!parkingSlot,
  }) === 'required') {
    items.push(
      <View key="parking" style={[
        styles.pill, 
        { 
          backgroundColor: applyOpacity(theme.info, '20'), 
          width: iconContainerSize, 
          height: iconContainerSize, 
          borderRadius: size 
        }
      ]}>
        <DDIcon name="map-pin" size={size} color={theme.info} />
      </View>
    );
  }
  if (meetingRoom) {
    items.push(
      <View key="meeting" style={[
        styles.pill, 
        { 
          backgroundColor: applyOpacity(theme.secondary, '20'), 
          width: iconContainerSize, 
          height: iconContainerSize, 
          borderRadius: size 
        }
      ]}>
        <DDIcon name="briefcase" size={size} color={theme.secondary} />
      </View>
    );
  }
  if (buffet) {
    items.push(
      <View key="buffet" style={[
        styles.pill, 
        { 
          backgroundColor: applyOpacity(theme.secondary, '20'), 
          width: iconContainerSize, 
          height: iconContainerSize, 
          borderRadius: size 
        }
      ]}>
        <DDIcon name="cloche" size={size} color={theme.secondary} />
      </View>
    );
  }
  if (valet) {
    items.push(
      <View key="valet" style={[
        styles.pill, 
        { 
          backgroundColor: applyOpacity(theme.primary, '20'), 
          width: iconContainerSize, 
          height: iconContainerSize, 
          borderRadius: size 
        }
      ]}>
        <DDIcon name="truck" size={size} variant="primary" />
      </View>
    );
  }
  
  return (
    <DirectionalRow style={styles.container}>
      {items}
    </DirectionalRow>
  );
};

const styles = StyleSheet.create({
  container: {
    // flexDirection handled by DirectionalRow
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
