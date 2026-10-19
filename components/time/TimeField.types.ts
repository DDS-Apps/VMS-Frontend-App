import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

export interface TimeFieldProps {
  value: Date;
  onTimeSelect: (time: Date) => Date | void;
  onPress: () => void;
  label: string;
  onValidityChange?: (valid: boolean) => void;
  minuteInterval?: 5 | 10 | 15 | 30;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  android_ripple?: PressableProps['android_ripple'];
  hitSlop?: PressableProps['hitSlop'];
  children: ReactNode;
}
