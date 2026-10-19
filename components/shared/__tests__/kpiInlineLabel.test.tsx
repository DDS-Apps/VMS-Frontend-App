import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet } from 'react-native';
import { KPICard, KPICardRow } from '../KPICard';

let mockRTL = false;
let mockWidth = 414;
let mockFontScale = 1;

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: mockRTL }),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: { surface: '#fff', text: '#222' } }),
}));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));

const card = (title = 'Total Visitors (Oct)', value = '28') => (
  <KPICard title={title} value={value} icon="users" color="#f80" />
);

function measure(tree: ReactTestRenderer, content: number, value: number, word: number) {
  act(() => {
    for (const [testID, width] of [
      ['kpi-content', content], ['kpi-value', value], ['kpi-first-word-measure', word],
    ] as const) {
      tree.root.findByProps({ testID }).props.onLayout({ nativeEvent: { layout: { width } } });
    }
  });
}

describe.each(['web', 'ios', 'android'] as const)('mobile KPI label on %s', os => {
  const originalOS = Platform.OS;
  let tree: ReactTestRenderer | undefined;

  beforeEach(() => {
    Platform.OS = os;
    mockRTL = false;
    mockWidth = 414;
    mockFontScale = 1;
    jest.spyOn(require('react-native'), 'useWindowDimensions').mockImplementation(() => ({
      width: mockWidth, height: 896, scale: 2, fontScale: mockFontScale,
    }));
  });

  afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  function mount(title?: string, value?: string) {
    act(() => { tree = create(card(title, value)); });
    return tree!;
  }

  it('waits for real widths before placing exactly one word beside the value', () => {
    const renderer = mount();
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'kpi-label' }).props.children).toBe('Total Visitors (Oct)');
    measure(renderer, 90, 24, 30);
    expect(renderer.root.findByProps({ testID: 'kpi-inline-word' }).props.children).toBe('Total');
    expect(renderer.root.findByProps({ testID: 'kpi-label' }).props.children).toBe('Visitors (Oct)');
    expect(renderer.root.findByProps({ testID: 'kpi-value' }).props.children).toBe('28');
  });

  it('keeps the complete label below the value when the first word does not fit', () => {
    const renderer = mount('Pending Approvals (Oct)', '1');
    measure(renderer, 60, 15, 50);
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'kpi-label' }).props.children).toBe('Pending Approvals (Oct)');
  });

  it('responds to available content width rather than assuming all phones have room', () => {
    const renderer = mount();
    measure(renderer, 90, 24, 30);
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(1);
    measure(renderer, 45, 24, 30);
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(0);
    measure(renderer, 90, 24, 30);
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(1);
  });

  it('preserves the whole Arabic label and month with RTL header ordering', () => {
    mockRTL = true;
    const renderer = mount('إجمالي الزوار (أكتوبر)', '٢٨');
    measure(renderer, 100, 25, 40);
    expect(renderer.root.findByProps({ testID: 'kpi-inline-word' }).props.children).toBe('إجمالي');
    expect(renderer.root.findByProps({ testID: 'kpi-label' }).props.children).toBe('الزوار (أكتوبر)');
    expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'kpi-value-header' }).props.style)
      .flexDirection).toBe('row-reverse');
  });

  it('remeasures changed values and labels instead of reusing stale widths', () => {
    const renderer = mount();
    measure(renderer, 90, 24, 30);
    act(() => renderer.update(card('Pending Approvals (Oct)', '123456')));
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(0);
    measure(renderer, 90, 85, 50);
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'kpi-value' }).props.children).toBe('123456');
  });

  it('remeasures for larger accessibility text without truncating the label', () => {
    const renderer = mount();
    measure(renderer, 90, 24, 30);
    mockFontScale = 2;
    act(() => renderer.update(card()));
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(0);
    measure(renderer, 90, 48, 60);
    expect(renderer.root.findByProps({ testID: 'kpi-label' }).props.numberOfLines).toBeUndefined();
    expect(renderer.root.findByProps({ testID: 'kpi-label' }).props.children).toBe('Total Visitors (Oct)');
  });

  it('hides the measurement copy from assistive technology and touch', () => {
    const renderer = mount();
    const probe = renderer.root.findByProps({ testID: 'kpi-first-word-measure' });
    expect(probe.props.accessible).toBe(false);
    expect(probe.parent!.props).toMatchObject({
      pointerEvents: 'none', accessible: false, accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    });
    expect(StyleSheet.flatten(probe.parent!.props.style)).toMatchObject({
      position: 'absolute', opacity: 0,
    });
  });

  it('does not change the desktop label arrangement', () => {
    mockWidth = 768;
    const renderer = mount();
    expect(renderer.root.findAllByProps({ testID: 'kpi-inline-word' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'kpi-first-word-measure' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'kpi-label' }).props.children).toBe('Total Visitors (Oct)');
  });

  it('keeps a configured lone desktop card width', () => {
    mockWidth = 1280;
    act(() => { tree = create(<KPICardRow singleCardWidth={240}>{card()}</KPICardRow>); });
    const cell = tree!.root.findAll(node => node.props.style?.flexBasis === 240)[0];
    expect(cell.props.style).toMatchObject({ flexBasis: 240, flexGrow: 0, maxWidth: '100%' });
  });
});
