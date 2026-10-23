import React from 'react';
import { act, create } from 'react-test-renderer';
import { I18nManager, Platform, StyleSheet, Text, View } from 'react-native';
import { DirectionalRow } from '@/components/DirectionalRow';

const originalOS = Platform.OS;
const originalRTL = I18nManager.isRTL;

describe.each(['ios', 'android', 'web'] as const)('Walk-in header row on %s', platform => {
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: originalRTL });
  });

  it.each([false, true])('preserves semantic order and delegates physical mirroring (RTL=%s)', rtl => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: rtl });
    let tree!: ReturnType<typeof create>;
    try {
      act(() => {
        tree = create(
          <DirectionalRow testID="header-direction" style={{ justifyContent: 'space-between' }}>
            <Text testID="heading" style={{ flex: 1 }}>Visit Details</Text>
            <Text testID="chip">Walk-in</Text>
          </DirectionalRow>,
        );
      });
      const row = tree.root.findAllByType(View).find(node => node.props.testID === 'header-direction')!;
      const style = StyleSheet.flatten(row.props.style);
      expect(style.flexDirection).toBe('row');
      expect(style.justifyContent).toBe('space-between');
      expect(style.direction).toBe(platform === 'web' && rtl ? 'rtl' : undefined);
      expect(row.findAllByType(Text).map(node => node.props.testID)).toEqual(['heading', 'chip']);
    } finally {
      if (tree) act(() => tree.unmount());
    }
  });
});
