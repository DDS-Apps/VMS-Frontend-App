import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet, Text } from 'react-native';
import { KPICard, KPICardRow } from '../KPICard';
import { Colors } from '@/constants/theme';

let mockRTL = false;
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

describe('KPI native number typography', () => {
  const originalOS = Platform.OS;
  let tree: ReactTestRenderer | undefined;
  afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
    Platform.OS = originalOS;
    mockRTL = false;
    mockDark = false;
  });

  it.each([
    [false, false], [false, true], [true, false], [true, true],
  ])('uses natural iOS number height for Arabic=%s dark=%s', (rtl, dark) => {
    Platform.OS = 'ios';
    mockRTL = rtl;
    mockDark = dark;
    const value = rtl ? '١٢٣' : '123';
    act(() => {
      tree = create(<KPICard title={rtl ? 'إجمالي الزوار' : 'Total Visitors'} value={value} icon="users" color="#007AFF" />);
    });
    // Use the real ThemedText so Arabic font scaling is included.
    const number = tree!.root.findAllByType(Text).find(node => node.props.children === value)!;
    const style = StyleSheet.flatten(number.props.style);
    expect(style.lineHeight).toBeUndefined();
    expect(style.fontSize).toBeGreaterThanOrEqual(20);
    expect(style.color).toBe(Colors[dark ? 'dark' : 'light'].text);
    expect(number.props.numberOfLines).toBeUndefined();
  });

  it.each(['web', 'android'] as const)('uses natural %s number height without changing font size', os => {
    Platform.OS = os;
    act(() => {
      tree = create(<KPICard title="Total Visitors" value="123" icon="users" color="#007AFF" />);
    });
    const number = tree!.root.findAllByType(Text).find(node => node.props.children === '123')!;
    expect(StyleSheet.flatten(number.props.style)).toMatchObject({ fontSize: 20 });
    expect(StyleSheet.flatten(number.props.style).lineHeight).toBeUndefined();
  });

  it('preserves two KPI cards per phone row', () => {
    Platform.OS = 'ios';
    mockRTL = true;
    act(() => {
      tree = create(
        <KPICardRow>
          {[1, 2, 3, 4].map(value => (
            <KPICard key={value} title="الزوار" value={value} icon="users" color="#007AFF" />
          ))}
        </KPICardRow>,
      );
    });
    const rows = tree!.root.findAll(node => node.props.testID === 'kpi-mobile-row' && node.type === 'View');
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.findAllByType(KPICard)).toHaveLength(2);
  });

  it.each([
    ['web', true, 'right'], ['web', false, 'left'],
    ['ios', true, 'left'], ['android', true, 'left'],
  ] as const)('uses language-aware alignment on %s (Arabic=%s)', (os, rtl, alignment) => {
    Platform.OS = os;
    mockRTL = rtl;
    const value = rtl ? '١٤' : '14';
    const title = rtl ? 'مسجل الدخول (أكتوبر)' : 'Checked In (Oct)';
    const subtitle = rtl ? 'هذا الشهر' : 'This month';
    act(() => {
      tree = create(<KPICard title={title} value={value} subtitle={subtitle} icon="users" color="#007AFF" />);
    });
    // Native RTL mirrors "left"; web needs an explicit physical "right".
    const texts = tree!.root.findAllByType(Text);
    for (const text of texts) {
      expect(StyleSheet.flatten(text.props.style).textAlign).toBe(alignment);
    }
    const label = texts.find(node => node.props.children === title)!;
    expect(label.props.numberOfLines).toBeUndefined();
    const container = tree!.root.findAll(node =>
      node.type === 'View' && StyleSheet.flatten(node.props.style)?.alignItems === 'stretch',
    );
    expect(container).toHaveLength(1);
    expect(texts.map(node => node.props.children)).toEqual([value, title, subtitle]);
  });

  it.each([false, true])('keeps Arabic zero rendered on web with automatic line height (dark=%s)', dark => {
    Platform.OS = 'web';
    mockRTL = true;
    mockDark = dark;
    const value = (0).toLocaleString('ar-SA');
    act(() => {
      tree = create(<KPICard title="زوار اليوم" value={value} icon="users" color="#007AFF" />);
    });
    const number = tree!.root.findAllByType(Text).find(node => node.props.children === value)!;
    expect(value).toBe('٠');
    const style = StyleSheet.flatten(number.props.style);
    expect(style.lineHeight).toBeUndefined();
    expect(style.textAlign).toBe('right');
    expect(style.fontSize).toBeGreaterThanOrEqual(20);
    expect(style.color).toBe(Colors[dark ? 'dark' : 'light'].text);
    expect(number.props.numberOfLines).toBeUndefined();
  });
});
