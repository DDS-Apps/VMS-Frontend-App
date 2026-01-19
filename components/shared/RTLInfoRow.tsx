import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Spacing } from '@/constants/theme';
import { getPlatformFlexDirection } from '@/utils/rtlInitializer';

interface RTLInfoRowProps {
  icon: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  alignItems?: 'flex-start' | 'center' | 'flex-end';
}

export function RTLInfoRow({ 
  icon, 
  children, 
  style, 
  gap = Spacing.md,
  alignItems = 'flex-start'
}: RTLInfoRowProps) {
  const { isRTL } = useLanguage();
  
  return (
    <View style={[
      { 
        flexDirection: getPlatformFlexDirection(isRTL), 
        alignItems,
        gap,
      }, 
      style
    ]}>
      {icon}
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>{children}</View>
    </View>
  );
}

interface RTLSimpleRowProps {
  icon: ReactNode;
  text: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}

export function RTLSimpleRow({ 
  icon, 
  text, 
  style, 
  gap = Spacing.md 
}: RTLSimpleRowProps) {
  const { isRTL } = useLanguage();
  
  return (
    <View style={[
      { 
        flexDirection: getPlatformFlexDirection(isRTL), 
        alignItems: 'center',
        gap,
      }, 
      style
    ]}>
      {icon}
      <View style={{ flex: 1 }}>{text}</View>
    </View>
  );
}
