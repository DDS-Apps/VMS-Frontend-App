import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { getFlexDirection } from '@/utils/rtlInitializer';
import { Spacing } from '@/constants/theme';

interface DirectionalIconLabelProps {
  icon: string;
  iconSize?: number;
  iconColor?: string;
  iconVariant?: 'default' | 'muted' | 'primary';
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<any>;
  gap?: number;
  forceReverse?: boolean;
}

export function DirectionalIconLabel({ 
  icon, 
  iconSize = 14, 
  iconColor,
  iconVariant = 'muted',
  children, 
  style,
  textStyle,
  gap = Spacing.xs,
  forceReverse = false
}: DirectionalIconLabelProps) {
  const { isRTL } = useLanguage();
  const { theme } = useTheme();
  
  // On web RTL, use row-reverse. On mobile RTL, swap children (I18nManager doesn't flip flexDirection).
  const flexDirection = Platform.OS === 'web' ? getFlexDirection(isRTL) : 'row';
  
  // On mobile RTL, always swap children since I18nManager doesn't flip flexDirection: 'row'
  const shouldReverse = Platform.OS !== 'web' && isRTL;
  
  const flattenedStyle = StyleSheet.flatten([style]);
  const containerStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection,
    alignItems: flattenedStyle?.alignItems ?? 'center',
    gap,
  };
  
  const iconElement = (
    <DDIcon 
      key="icon"
      name={icon} 
      size={iconSize} 
      color={iconColor}
      variant={iconVariant}
    />
  );
  
  const textElement = (
    <View key="text" style={{ flex: textStyle ? undefined : 1 }}>
      {typeof children === 'string' ? (
        <ThemedText style={[{ textAlign: isRTL ? 'right' : 'left' }, textStyle]}>
          {children}
        </ThemedText>
      ) : children}
    </View>
  );
  
  return (
    <View style={containerStyle}>
      {shouldReverse ? [textElement, iconElement] : [iconElement, textElement]}
    </View>
  );
}
