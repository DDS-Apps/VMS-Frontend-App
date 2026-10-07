import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

/** A separate bidi paragraph keeps the period suffix away from adjacent Arabic host text. */
export function VisitTimeText({ value, style }: { value: string; style?: StyleProp<TextStyle> }) {
  return (
    <ThemedText
      testID="visit-time-text"
      numberOfLines={1}
      style={[style, styles.time]}
    >
      {value.replace(/ /g, '\u00a0')}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  time: { writingDirection: 'ltr', textAlign: 'left', flexShrink: 0 },
});
