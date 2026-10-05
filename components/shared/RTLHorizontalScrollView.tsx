import React from 'react';
import { ScrollView, ScrollViewProps, View, ViewStyle, Platform, StyleSheet, I18nManager } from 'react-native';
import { useLanguage } from '@/contexts';

type ExtendedScrollViewProps = ScrollViewProps & {
  delaysContentTouches?: boolean;
  canCancelContentTouches?: boolean;
};
const ExtendedScrollView = ScrollView as React.ComponentType<ExtendedScrollViewProps>;

const needsRTLFix = (isRTL: boolean) =>
  isRTL && Platform.OS === 'ios' && !I18nManager.isRTL;

interface RTLHorizontalScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Filter controls can wrap on iOS instead of nesting a horizontal gesture
   * recognizer inside a vertical list header. Other scroll rows are unchanged. */
  wrapOnIOS?: boolean;
}

export function RTLHorizontalScrollView({ children, contentContainerStyle, style, wrapOnIOS = false, ...props }: RTLHorizontalScrollViewProps) {
  const { isRTL } = useLanguage();
  const applyFix = needsRTLFix(isRTL);

  if (wrapOnIOS && Platform.OS === 'ios') {
    return (
      <View
        testID={props.testID}
        style={[
          style,
          contentContainerStyle,
          {
            direction: isRTL ? 'rtl' : 'ltr',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
          },
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ExtendedScrollView
      horizontal
      delaysContentTouches={false}
      canCancelContentTouches={true}
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
    </ExtendedScrollView>
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
