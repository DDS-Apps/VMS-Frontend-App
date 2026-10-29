import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ts from 'typescript';
import { toArabicNumerals } from '@/utils/formatters';
import { Platform, StyleSheet, Text } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

let mockRTL = false;
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: require('@/constants/theme').Colors.light,
    isDark: false,
  }),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: mockRTL }),
}));

const source = fs.readFileSync(
  path.resolve(__dirname, '../screens/BuildingAdmin/AllRequestsScreen.tsx'),
  'utf8',
);
const statCardSource = source.slice(
  source.indexOf('function StatCard('),
  source.indexOf('interface RequestCardProps'),
);

// Render the screen's real private card without loading unrelated API/navigation code.
function loadCard(isRTL: boolean) {
  mockRTL = isRTL;
  const statValue = new Function(
    `return ({${source.match(/statValue:\s*\{([^}]+)\}/)![1]}});`,
  )();
  const compiled = ts.transpileModule(statCardSource, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(
    'React', 'useFormatters', 'TouchableOpacity', 'ActivityIndicator',
    'ThemedText', 'styles', 'applyOpacity',
    `${compiled}\nreturn StatCard;`,
  )(
    React,
    () => ({ toLocalNumerals: (value: string) => isRTL ? toArabicNumerals(value) : value }),
    'TouchableOpacity', 'ActivityIndicator', ThemedText, { statValue },
    (color: string) => color,
  );
}

describe('Admin overview card numerals', () => {
  const originalOS = Platform.OS;
  afterEach(() => { Platform.OS = originalOS; });

  it.each([
    ['ios', true], ['ios', false],
    ['android', true], ['android', false],
    ['web', true], ['web', false],
  ] as const)('uses natural number height on %s (Arabic=%s)', (os, isRTL) => {
    Platform.OS = os;
    const Card = loadCard(isRTL);
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<Card value={139} label="All" color="#f80"
        theme={{ textSecondary: '#777' }} onPress={jest.fn()} />);
    });
    const number = tree.root.findAllByType(Text)[0];
    const style = StyleSheet.flatten(number.props.style);
    expect(style.lineHeight).toBeUndefined();
    expect(style.height).toBeUndefined();
    expect(style.maxHeight).toBeUndefined();
    expect(number.props.numberOfLines).toBeUndefined();
    expect(style.fontSize).toBeGreaterThanOrEqual(22);
    expect(source.slice(source.indexOf('statCard: {'), source.indexOf('statLabel: {')))
      .not.toMatch(/(?:^|\n)\s*(?:height|maxHeight):/);
    act(() => tree.unmount());
  });
  it.each([
    [true, 0, '٠'],
    [true, 1, '١'],
    [true, 139, '١٣٩'],
    [true, 1234, '١٢٣٤'],
    [false, 0, '0'],
    [false, 139, '139'],
    [false, 1234, '1234'],
  ])('formats Arabic=%s count=%s as %s', (isRTL, value, expected) => {
    const Card = loadCard(isRTL);
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<Card value={value} label="All" color="#f80"
        theme={{ textSecondary: '#777' }} onPress={jest.fn()} />);
    });
    expect(tree.root.findAllByType(Text)[0].props.children).toBe(expected);
    act(() => tree.unmount());
  });

  it.each([
    [true, false, '!'],
    [false, false, '—'],
    [false, true, null],
  ])('preserves error=%s loading=%s state', (error, loading, expected) => {
    const Card = loadCard(true);
    const onPress = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<Card value={null} label="All" color="#f80"
        theme={{ textSecondary: '#777' }} error={error} loading={loading} onPress={onPress} />);
    });
    if (loading) {
      expect(tree.root.findAllByType('ActivityIndicator' as any)).toHaveLength(1);
    } else {
      expect(tree.root.findAllByType(Text)[0].props.children).toBe(expected);
    }
    act(() => tree.root.findByType('TouchableOpacity' as any).props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });
});
