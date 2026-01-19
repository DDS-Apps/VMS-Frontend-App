import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon, IconName } from "@/components/DDIcon";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyOpacity } from "@/utils/statusStyles";
import { Spacing, BorderRadius } from "@/constants/theme";
import { shouldSwapChildrenForRTL } from '@/utils/rtlInitializer';

interface StatusBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'muted' | 'primary';
  icon?: IconName;
  size?: 'sm' | 'md';
}

export const StatusBadge = ({ 
  label, 
  variant = 'muted', 
  icon,
  size = 'md' 
}: StatusBadgeProps) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const shouldSwap = shouldSwapChildrenForRTL(isRTL);
  
  const getColor = () => {
    switch (variant) {
      case 'success': return theme.success;
      case 'warning': return theme.warning;
      case 'error': return theme.error;
      case 'info': return theme.info;
      case 'primary': return theme.primary;
      default: return theme.textSecondary;
    }
  };
  
  const color = getColor();
  const isSmall = size === 'sm';
  
  const iconEl = icon ? (
    <DDIcon 
      name={icon} 
      size={isSmall ? 12 : 14} 
      color={color} 
    />
  ) : null;
  
  const textEl = (
    <ThemedText style={[
      styles.text, 
      { 
        color,
        fontSize: isSmall ? 11 : 12,
        marginStart: icon ? Spacing.xs : 0,
      }
    ]}>
      {label}
    </ThemedText>
  );

  return (
    <View style={[
      styles.badge,
      { 
        backgroundColor: applyOpacity(color, '15'),
        paddingHorizontal: isSmall ? Spacing.sm : Spacing.md,
        paddingVertical: isSmall ? Spacing.xs / 2 : Spacing.xs,
        flexDirection: 'row',
      }
    ]}>
      {shouldSwap ? (
        <>{textEl}{iconEl}</>
      ) : (
        <>{iconEl}{textEl}</>
      )}
    </View>
  );
};

interface WalkInBadgeProps {
  size?: 'sm' | 'md';
  label?: string;
}

export const WalkInBadge = ({ size = 'md' }: WalkInBadgeProps) => {
  const { theme } = useTheme();
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 12 : 16;
  const containerSize = isSmall ? 20 : 24;
  
  return (
    <View style={[
      styles.walkInIconBadge, 
      { 
        backgroundColor: applyOpacity(theme.warning, '20'),
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 2,
      }
    ]}>
      <DDIcon name="user-plus" size={iconSize} color={theme.warning} />
    </View>
  );
};

interface StatusAccentProps {
  color: string;
  width?: number;
}

export const StatusAccent = ({ color, width = 4 }: StatusAccentProps) => {
  const { isRTL } = useLanguage();
  return (
    <View style={[
      styles.accent, 
      { 
        backgroundColor: color, 
        width,
        ...(isRTL ? { left: 'auto', right: 0 } : { left: 0, right: 'auto' }),
      }
    ]} />
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  text: {
    fontWeight: '600' as const,
  },
  walkInBadge: {
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  walkInText: {
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walkInIconBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  accent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderTopStartRadius: BorderRadius.md,
    borderBottomStartRadius: BorderRadius.md,
  },
});
