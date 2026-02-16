import React from 'react';
import { ScrollView, ScrollViewProps, View, ViewStyle, Platform, StyleSheet, I18nManager } from 'react-native';
import { useLanguage } from '@/contexts';

const needsRTLFix = (isRTL: boolean) =>
  isRTL && Platform.OS === 'ios' && !I18nManager.isRTL;

interface RTLHorizontalScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
}

export function RTLHorizontalScrollView({ children, contentContainerStyle, style, ...props }: RTLHorizontalScrollViewProps) {
  const { isRTL } = useLanguage();
  const applyFix = needsRTLFix(isRTL);

  return (
    <ScrollView
      horizontal
      delaysContentTouches={false}
      canCancelContentTouches={false}
      {...props}
      style={[style, applyFix && fixStyles.flipped]}
      contentContainerStyle={[
        contentContainerStyle,
        applyFix && fixStyles.flippedContent,
      ]}
    >
      {applyFix
        ? React.Children.map(children, (child) =>
            child ? <View style={fixStyles.flippedChild}>{child}</View> : null,
          )
        : children}
    </ScrollView>
  );
}

export function RTLScrollChild({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { isRTL } = useLanguage();
  const applyFix = needsRTLFix(isRTL);

  return (
    <View style={[style, applyFix && fixStyles.flippedChild]}>
      {children}
    </View>
  );
}

const fixStyles = StyleSheet.create({
  flipped: {
    transform: [{ scaleX: -1 }],
  },
  flippedContent: {
    flexDirection: 'row',
  },
  flippedChild: {
    transform: [{ scaleX: -1 }],
  },
});
