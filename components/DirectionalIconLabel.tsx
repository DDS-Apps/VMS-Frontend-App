import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/contexts/LanguageContext';
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
}: DirectionalIconLabelProps) {
  const { isRTL } = useLanguage();
  
  const flattenedStyle = StyleSheet.flatten([style]);
  const containerStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection: 'row',
    alignItems: flattenedStyle?.alignItems ?? 'center',
    gap,
  };
  
  return (
    <View style={containerStyle}>
      <DDIcon 
        name={icon} 
        size={iconSize} 
        color={iconColor}
        variant={iconVariant}
      />
      <View style={{ flex: textStyle ? undefined : 1 }}>
        {typeof children === 'string' ? (
          <ThemedText style={[{ textAlign: isRTL ? 'right' : 'left' }, textStyle]}>
            {children}
          </ThemedText>
        ) : children}
      </View>
    </View>
  );
}
