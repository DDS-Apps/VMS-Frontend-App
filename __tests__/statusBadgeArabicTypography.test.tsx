import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { StatusLabelBadge, STATUS_BADGE_CONTAINER } from '@/components/shared/StatusLabelBadge';
import { Colors } from '@/constants/theme';
import { ArabicLineHeightScaling } from '@/utils/rtlStyles';

let mockRTL = true;
let mockDark = false;
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: require('@/constants/theme').Colors[mockDark ? 'dark' : 'light'],
    isDark: mockDark,
  }),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: mockRTL }),
}));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));

describe('Arabic badge caption metrics', () => {
  const originalOS = Platform.OS;
  let tree: ReactTestRenderer | undefined;
  afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
    Platform.OS = originalOS;
    mockRTL = true;
    mockDark = false;
  });

  it.each([
    ['web', false], ['web', true],
    ['ios', false], ['ios', true],
    ['android', false], ['android', true],
  ] as const)('keeps Arabic labels compact and centered on %s (dark=%s)', (os, dark) => {
    Platform.OS = os;
    mockDark = dark;
    const label = 'انتهت صلاحية الزيارة';
    const color = Colors[dark ? 'dark' : 'light'].error;
    act(() => { tree = create(<StatusLabelBadge label={label} color={color} icon="alert-circle" />); });
    // Exercise the real ThemedText rather than only asserting badge props.
    const text = tree!.root.findByType(Text);
    expect(text.props.children).toBe(label);
    expect(StyleSheet.flatten(text.props.style)).toMatchObject({
      fontSize: 9, lineHeight: Math.round(12 * ArabicLineHeightScaling.caption),
      color, textAlignVertical: 'center',
      transform: [{ translateY: 1 }],
    });
    expect(text.props.numberOfLines).toBeUndefined();
    const views = tree!.root.findAllByType(View);
    expect(StyleSheet.flatten(views[0].props.style)).toMatchObject(STATUS_BADGE_CONTAINER);
    expect(StyleSheet.flatten(views[1].props.style)).toMatchObject({
      width: 12, height: 12, alignItems: 'center', justifyContent: 'center',
    });
  });

  it('leaves English label metrics unchanged', () => {
    mockRTL = false;
    act(() => { tree = create(<StatusLabelBadge label="Visit Expired" color="#AA0000" icon="alert-circle" />); });
    expect(StyleSheet.flatten(tree!.root.findByType(Text).props.style)).toMatchObject({
      fontSize: 9, lineHeight: 12,
    });
    expect(StyleSheet.flatten(tree!.root.findByType(Text).props.style).transform).toBeUndefined();
    expect(tree!.root.findAllByType(View)).toHaveLength(1);
  });
});
