import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ts from 'typescript';
import { toArabicNumerals } from '@/utils/formatters';

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
    'TouchableOpacity', 'ActivityIndicator', 'ThemedText', {},
    (color: string) => color,
  );
}

describe('Admin overview card numerals', () => {
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
    expect(tree.root.findAllByType('ThemedText' as any)[0].props.children).toBe(expected);
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
      expect(tree.root.findAllByType('ThemedText' as any)[0].props.children).toBe(expected);
    }
    act(() => tree.root.findByType('TouchableOpacity' as any).props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });
});
