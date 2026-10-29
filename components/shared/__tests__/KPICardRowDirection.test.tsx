import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet, View } from 'react-native';
import { KPICardRow } from '../KPICard';

let mockRTL = false;
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: mockRTL }),
}));
jest.mock('@/hooks/useTheme', () => ({ useTheme: jest.fn() }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));

describe('KPI row starting edge', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it.each([
    [390, true, 1], [390, false, 1],
    [390, true, 4], [390, false, 4],
    [1280, true, 1], [1280, false, 1],
    [1280, true, 4], [1280, false, 4],
  ])('uses one web direction at width %s Arabic=%s count=%s', (width, rtl, count) => {
    Platform.OS = 'web';
    mockRTL = rtl;
    jest.spyOn(require('react-native'), 'useWindowDimensions')
      .mockReturnValue({ width, height: 844, scale: 1, fontScale: 1 });
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <KPICardRow singleCardWidth={240}>
          {Array.from({ length: count }, (_, i) => <View key={i} testID={`card-${i}`} />)}
        </KPICardRow>,
      );
    });
    const rows = tree.root.findAllByType(View).filter(node =>
      ['kpi-mobile-row', 'kpi-desktop-row'].includes(node.props.testID),
    );
    expect(rows).toHaveLength(width < 768 ? Math.ceil(count / 2) : 1);
    for (const row of rows) {
      expect(StyleSheet.flatten(row.props.style)).toMatchObject({
        direction: rtl ? 'rtl' : 'ltr',
        flexDirection: 'row',
      });
    }
    if (width >= 768 && count === 1) {
      expect(StyleSheet.flatten(rows[0].findAllByType(View)[1].props.style))
        .toMatchObject({ flexBasis: 240, flexGrow: 0 });
    }
    act(() => tree.unmount());
  });
});
