import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { DDIcon, IconName } from "@/components/DDIcon";
import { getIsRTL } from "@/components/DirectionalRow";
import { useTheme } from "@/hooks/useTheme";
import { applyOpacity } from "@/utils/statusStyles";
import { BorderRadius } from "@/constants/theme";
import { StatusLabelBadge } from "@/components/shared/StatusLabelBadge";

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
  // Kept for call-site compatibility; textual statuses have one size.
  size: _size,
}: StatusBadgeProps) => {
  const { theme } = useTheme();
  
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
  return <StatusLabelBadge label={label} color={color} icon={icon} />;
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
  const isRTL = getIsRTL();
  
  // On web, we don't set document.dir='rtl', so logical properties (start/end) don't work
  // Use explicit left/right positioning based on RTL state
  // IMPORTANT: Set both left and right explicitly to prevent CSS conflicts on web
  const positionStyle = Platform.OS === 'web'
    ? (isRTL 
        ? { right: 0, left: 'auto' as const } 
        : { left: 0, right: 'auto' as const })
    : { start: 0 }; // Mobile: native handles RTL with 'start'
  
  const borderRadiusStyle = Platform.OS === 'web'
    ? (isRTL 
        ? { borderTopRightRadius: BorderRadius.md, borderBottomRightRadius: BorderRadius.md }
        : { borderTopLeftRadius: BorderRadius.md, borderBottomLeftRadius: BorderRadius.md })
    : { borderTopStartRadius: BorderRadius.md, borderBottomStartRadius: BorderRadius.md };
  
  return (
    <View style={[
      styles.accentBase, 
      positionStyle,
      borderRadiusStyle,
      { 
        backgroundColor: color, 
        width,
      }
    ]} />
  );
};

const styles = StyleSheet.create({
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
  accentBase: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});
