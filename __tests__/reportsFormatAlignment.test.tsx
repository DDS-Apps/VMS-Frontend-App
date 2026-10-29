import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet, Text } from 'react-native';
import ReportsScreen from '@/screens/Reports/ReportsScreen';
import { Colors, FontFamily, Spacing, Typography } from '@/constants/theme';
import { ArabicFontScaling, ArabicLineHeightScaling } from '@/utils/rtlStyles';

let mockRTL = false;
let mockDark = false;
jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  return new Proxy(native, {
    get: (target, property) => property === 'Pressable' ? 'Pressable' : Reflect.get(target, property),
  });
});
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: mockRTL }),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: require('@/constants/theme').Colors[mockDark ? 'dark' : 'light'] }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/ScreenScrollView', () => ({
  ScreenScrollView: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('@/components/ThemedView', () => ({
  ThemedView: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/components/CalendarDatePicker', () => ({ CalendarDatePicker: () => null }));
jest.mock('@/components/shared/ActiveDateRangeLabel', () => ({ ActiveDateRangeLabel: () => null }));
jest.mock('@/components/shared/LoadingButton', () => ({ LoadingButton: () => null }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(), isAvailableAsync: jest.fn() }));
jest.mock('@/api/httpClient', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/api/config', () => ({ apiConfig: { baseURL: 'https://example.invalid' } }));

describe('report format button alignment', () => {
  let tree: ReactTestRenderer | undefined;
  const originalOS = Platform.OS;
  afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
    Platform.OS = originalOS;
  });

  it.each([
    ['ios', true, false], ['ios', true, true], ['ios', false, false], ['ios', false, true],
    ['android', true, false], ['android', true, true], ['android', false, false],
    ['web', true, false], ['web', true, true], ['web', false, false], ['web', false, true],
  ] as const)('centers Latin format labels without resizing buttons (%s, RTL=%s, dark=%s)', (os, rtl, dark) => {
    Platform.OS = os;
    mockRTL = rtl;
    mockDark = dark;
    act(() => { tree = create(<ReportsScreen />); });
    const theme = Colors[dark ? 'dark' : 'light'];
    const labels = tree!.root.findAllByType(Text).filter(node =>
      node.props.children === 'CSV (.csv)' || node.props.children === 'Excel (.xlsx)',
    );
    expect(labels).toHaveLength(2);
    for (const text of labels) {
      expect(StyleSheet.flatten(text.props.style)).toMatchObject({
        fontFamily: FontFamily.latinRegular,
        fontSize: rtl ? Math.round(Typography.bodySmall.fontSize * ArabicFontScaling.body) : Typography.bodySmall.fontSize,
        lineHeight: rtl ? Math.round(Typography.bodySmall.lineHeight * ArabicLineHeightScaling.body) : Typography.bodySmall.lineHeight,
        writingDirection: 'ltr',
        textAlignVertical: 'center',
      });
      const button = tree!.root.findAllByType('Pressable' as any).find(node =>
        node.findAllByType(Text).includes(text),
      )!;
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md,
        borderWidth: 1,
      });
      expect(button.findByType('DDIcon' as any).props.size).toBe(14);
    }
    const excel = tree!.root.findAllByType('Pressable' as any).find(node =>
      node.findAllByType(Text).some(text => text.props.children === 'Excel (.xlsx)'),
    )!;
    expect(StyleSheet.flatten(excel.props.style).backgroundColor).not.toBe(theme.primary);
    act(() => excel.props.onPress());
    expect(StyleSheet.flatten(excel.props.style).backgroundColor).toBe(theme.primary);
  });
});
