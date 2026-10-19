import React from 'react';
import { Pressable } from 'react-native';
import type { TimeFieldProps } from './TimeField.types';

/** Mobile retains the existing field and opens the shared native picker. */
export function TimeField({ onPress, style, disabled, children, label, android_ripple, hitSlop }: TimeFieldProps) {
  return (
    <Pressable onPress={onPress} style={style} disabled={disabled} accessibilityLabel={label} android_ripple={android_ripple} hitSlop={hitSlop}>
      {children}
    </Pressable>
  );
}
