import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
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
  
  // Platform-aware RTL handling:
  // - On WEB: Browser's document.dir='rtl' reverses flex layouts automatically,
  //   so only reverse if forceReverse=true (for containers with border/overflow bugs)
  // - On MOBILE: I18nManager doesn't flip flexDirection, so always reverse in RTL
  const isWeb = Platform.OS === 'web';
  const shouldReverse = isRTL && (!isWeb || forceReverse);
  
  const flattenedStyle = StyleSheet.flatten([style]);
  const containerStyle: ViewStyle = {
    ...flattenedStyle,
    flexDirection: 'row',
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
