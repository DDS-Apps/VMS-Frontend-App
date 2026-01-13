import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Spacing } from '@/constants/theme';

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
  
  const contentStyle: ViewStyle = isRTL 
    ? { flex: 1, marginEnd: gap, alignItems: 'flex-end' }
    : { flex: 1, marginStart: gap };
  
  return (
    <View style={[
      { 
        flexDirection: 'row', 
        alignItems,
        justifyContent: isRTL ? 'flex-end' : 'flex-start' 
      }, 
      style
    ]}>
      {isRTL ? (
        <>
          <View style={contentStyle}>{children}</View>
          {icon}
        </>
      ) : (
        <>
          {icon}
          <View style={contentStyle}>{children}</View>
        </>
      )}
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
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: isRTL ? 'flex-end' : 'flex-start' 
      }, 
      style
    ]}>
      {isRTL ? (
        <>
          <View style={{ marginEnd: gap }}>{text}</View>
          {icon}
        </>
      ) : (
        <>
          {icon}
          <View style={{ marginStart: gap, flex: 1 }}>{text}</View>
        </>
      )}
    </View>
  );
}
