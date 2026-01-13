import React from "react";
import { View, StyleSheet } from "react-native";
import { DDIcon } from "@/components/DDIcon";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyOpacity } from "@/utils/statusStyles";
import { Spacing } from "@/constants/theme";

interface ServiceIconsProps {
  parkingSlot?: unknown;
  meetingRoom?: unknown;
  buffet?: unknown;
  valet?: unknown;
  size?: number;
}

export const ServiceIcons = ({ 
  parkingSlot, 
  meetingRoom, 
  buffet, 
  valet, 
  size = 16 
}: ServiceIconsProps) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const iconContainerSize = size * 2;
  
  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {!!parkingSlot ? (
        <View style={[
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
      ) : null}
      {!!meetingRoom ? (
        <View style={[
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
      ) : null}
      {!!buffet ? (
        <View style={[
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
      ) : null}
      {!!valet ? (
        <View style={[
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
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
