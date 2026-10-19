import React from 'react';
import { act, create } from 'react-test-renderer';
import { Platform, StyleSheet, View } from 'react-native';
import { KPICard, KPICardRow } from '../KPICard';
import { VisitTimeText } from '../VisitTimeText';

let mockRTL = false;
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: mockRTL }) }));
jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ theme: { surface: '#fff', text: '#222' } }) }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));

describe.each(['web', 'ios', 'android'] as const)('mobile dashboard layout on %s', os => {
  const originalOS = Platform.OS;
  afterEach(() => { Platform.OS = originalOS; jest.restoreAllMocks(); });

  it.each([320, 375, 390, 393, 402, 414, 428, 430, 440, 600, 767, 768, 1280].flatMap(width =>
    [1, 1.6].flatMap(fontScale => [false, true].flatMap(rtl =>
      [1, 2, 3, 4].map(count => ({ width, fontScale, rtl, count })),
    )),
  ))('sizes $count KPIs at $width, font scale $fontScale, RTL=$rtl', ({ width, fontScale, rtl, count }) => {
    Platform.OS = os;
    mockRTL = rtl;
    jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width, height: 844, scale: 1, fontScale });
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<KPICardRow>{Array.from({ length: count }, (_, i) =>
        <KPICard key={i} title={rtl ? 'إجمالي عدد الزوار لهذا اليوم' : 'Total visitors expected today'}
          value="12,345" icon="users" color="#ff8800" />,
      )}</KPICardRow>);
    });
    const mobile = width < 768;
    const wrappers = tree.root.findAllByType(View).filter(node => mobile
      ? node.props.testID === 'kpi-mobile-cell'
      : node.props.style?.flexBasis);
    expect(wrappers).toHaveLength(count);
    for (const wrapper of wrappers) {
      const style = StyleSheet.flatten(wrapper.props.style);
      if (mobile) {
        expect(style).toMatchObject({ flex: 1, minWidth: 0 });
        expect(style.flexBasis).toBeUndefined();
      } else {
        expect(style.maxWidth).toBe(count === 2 ? '49%' : count === 3 ? '32%' : '24%');
        expect(style.flexBasis).toBe(count === 2 ? '46%' : count === 3 ? '30%' : '22%');
      }
      expect(style.alignSelf).toBe('stretch');
      expect(style.height).toBeUndefined();
      expect(style.minHeight).toBeUndefined();
    }
    const rows = tree.root.findAllByType(View).filter(node =>
      node.props.testID === (mobile ? 'kpi-mobile-row' : 'kpi-desktop-row'));
    expect(rows).toHaveLength(mobile ? Math.ceil(count / 2) : 1);
    for (const row of rows) {
      expect(StyleSheet.flatten(row.props.style)).toMatchObject({
        flexDirection: rtl ? 'row-reverse' : 'row',
        alignItems: 'stretch',
        flexWrap: mobile ? 'nowrap' : 'wrap',
      });
      if (mobile) {
        const cells = row.findAllByType(View).filter(node =>
          ['kpi-mobile-cell', 'kpi-empty-cell'].includes(node.props.testID));
        expect(cells).toHaveLength(count === 1 ? 1 : 2);
      }
    }
    for (const card of tree.root.findAllByType('ThemedView' as any)) {
      const style = StyleSheet.flatten(card.props.style);
      expect(style).toMatchObject({ alignItems: 'flex-start', alignSelf: 'stretch', flexGrow: 1 });
      expect(style.height).toBeUndefined();
      expect(style.minHeight).toBeUndefined();
      expect(style.maxHeight).toBeUndefined();
    }
    for (const text of tree.root.findAllByType('ThemedText' as any).filter(node =>
      node.props.testID !== 'kpi-first-word-measure')) {
      expect(text.props.numberOfLines).toBeUndefined();
      expect(StyleSheet.flatten(text.props.style).height).toBeUndefined();
    }
    act(() => tree.unmount());
  });

  it.each(['12:30 PM', '9:00 AM', '١٢:٣٠ م', '٩:٠٠ ص'])('keeps %s in a non-shrinking separate text node', value => {
    Platform.OS = os;
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<VisitTimeText value={value} />); });
    const text = tree.root.findByType('ThemedText' as any);
    expect(text.props.children).toBe(value.replace(/ /g, '\u00a0'));
    expect(text.props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(text.props.style)).toMatchObject({ writingDirection: 'ltr', flexShrink: 0 });
    act(() => tree.unmount());
  });
});
