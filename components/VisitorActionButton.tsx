import React from "react";
import { View, StyleSheet, Pressable, GestureResponderEvent, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon, IconName } from "@/components/DDIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { applyOpacity } from "@/utils/statusStyles";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getFlexDirection } from "@/components/DirectionalRow";

type ActionType = 'check_in' | 'check_out' | 'completed';

interface VisitorActionButtonProps {
  type: ActionType;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  flex?: number;
}

export function VisitorActionButton({ type, onPress, disabled = false, fullWidth = false, loading = false, flex }: VisitorActionButtonProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const getConfig = (): { label: string; icon: IconName; bgColor: string; textColor: string; isButton: boolean } => {
    switch (type) {
      case 'check_in':
        return {
          label: fullWidth ? t('visitor.checkInVisitor') : t('visitor.checkIn'),
          icon: 'log-in',
          bgColor: theme.success,
          textColor: '#FFFFFF',
          isButton: true,
        };
      case 'check_out':
        return {
          label: fullWidth ? t('visitor.checkOutVisitor') : t('visitor.checkOut'),
          icon: 'log-out',
          bgColor: theme.textSecondary,
          textColor: '#FFFFFF',
          isButton: true,
        };
      case 'completed':
        return {
          label: t('status.completed'),
          icon: 'check',
          bgColor: applyOpacity(theme.textSecondary, '12'),
          textColor: theme.textSecondary,
          isButton: false,
        };
    }
  };

  const config = getConfig();

  const buttonStyle = fullWidth ? styles.fullWidthButton : styles.button;
  const isDisabled = disabled || loading;

  const iconEl = (
    <DDIcon 
      name={config.icon} 
      size={fullWidth ? 18 : 14} 
      color={config.textColor} 
      directionAware={config.icon === 'log-in' || config.icon === 'log-out'}
    />
  );

  const textEl = (
    <ThemedText style={[fullWidth ? styles.fullWidthButtonText : styles.buttonText, { color: config.textColor }]}>
      {config.label}
    </ThemedText>
  );

  if (!config.isButton || disabled) {
    return (
      <View style={[
        buttonStyle, 
        { 
          backgroundColor: config.bgColor,
          borderWidth: type === 'completed' ? 1 : 0,
          borderColor: theme.border,
          flex: flex,
          flexDirection: getFlexDirection(isRTL),
        }
      ]}>
        {iconEl}
        {textEl}
      </View>
    );
  }

  const loadingOrIconEl = loading ? (
    <ActivityIndicator size="small" color={config.textColor} />
  ) : iconEl;

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        { 
          backgroundColor: config.bgColor, 
          opacity: isDisabled ? 0.6 : pressed ? 0.8 : 1,
          flex: flex,
          flexDirection: getFlexDirection(isRTL),
        }
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loadingOrIconEl}
      {textEl}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    minWidth: 100,
    height: 34,
    gap: 6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fullWidthButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  fullWidthButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
