import React, { useState } from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Platform, I18nManager } from 'react-native';
import { StatusDropdown, RequestStatusDropdown } from '@/components/shared/RequestStatusDropdown';
import { RTLHorizontalScrollView } from '@/components/shared/RTLHorizontalScrollView';
import { PortalProvider } from '@/contexts/PortalContext';
import { FilterChip } from '@/components/shared/FilterChip';
import { ScreenFlatList } from '@/components/ScreenFlatList';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';

let mockRTL = false;
jest.mock('@/contexts', () => ({ useLanguage: () => ({ isRTL: mockRTL }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: mockRTL }) }));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: { primary: '#ff8800', info: '#0088ff', surface: '#ffffff', border: '#dddddd', text: '#222222', textSecondary: '#666666' } }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary = mockRTL ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
      return key.split('.').reduce((value: any, part) => value?.[part], dictionary) ?? key;
    },
  }),
}));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/hooks/useScreenInsets', () => ({
  useScreenInsets: () => ({ paddingTop: 0, paddingBottom: 0, scrollInsetBottom: 0 }),
}));
// Native primitives cannot perform UIKit gestures in Jest. The chip, scroll
// wrapper, dropdown, and overlay provider remain REAL components.
jest.mock('react-native', () => ({
  Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View',
  FlatList: ({ ListHeaderComponent }: any) => ListHeaderComponent,
  Platform: { OS: 'ios', select: (options: any) => options.ios ?? options.default },
  I18nManager: { isRTL: false },
  StyleSheet: { create: (styles: object) => styles, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
}));

const cases = [
  ['ios', false, false], ['ios', true, true], ['ios', true, false], ['ios', false, true],
  ['android', false, false], ['android', true, true],
  ['web', false, false], ['web', true, false],
] as const;

describe.each(cases)('%s app RTL=%s native RTL=%s', (platform, rtl, nativeRTL) => {
  let tree: ReactTestRenderer;
  const changes = jest.fn();
  function Harness({ show = true, typed = false, wrap = false }) {
    const [value, setValue] = useState<string | null>(null);
    const [date, setDate] = useState(false);
    const [tab, setTab] = useState(false);
    const onChange = (next: any) => { changes(next); setValue(next); };
    return (
      <PortalProvider>
        <ScreenFlatList data={[]} renderItem={() => null} ListHeaderComponent={
        <RTLHorizontalScrollView wrapOnIOS={wrap} testID="filters" keyboardShouldPersistTaps="handled">
          <FilterChip label="Tab" isSelected={tab} onPress={() => setTab(!tab)} />
          <FilterChip label="Date" isSelected={date} onPress={() => setDate(true)}
            onClear={() => setDate(false)} clearAccessibilityLabel="Clear Date" />
          {show ? typed
            ? <RequestStatusDropdown value={value as any} onChange={onChange} />
            : <StatusDropdown value={value} onChange={onChange} compact statuses={['draft', 'expired', 'cancelled', 'auto_cancelled']} />
            : null}
        </RTLHorizontalScrollView>
        } />
      </PortalProvider>
    );
  }
  const modal = () => tree.root.findByType('Modal' as any);
  const trigger = () => tree.root.findAllByType('Pressable' as any)
    .find(node => node.props.accessibilityState?.expanded !== undefined)!;
  const pressOption = (label: string) => {
    const text = modal().findAllByType('ThemedText' as any).find(node => node.props.children === label)!;
    act(() => text.parent!.props.onPress());
  };

  beforeEach(() => {
    (Platform as any).OS = platform;
    (I18nManager as any).isRTL = nativeRTL;
    mockRTL = rtl;
    changes.mockClear();
    act(() => { tree = create(<Harness />); });
  });
  afterEach(() => { act(() => tree.unmount()); });

  it('keeps wrapped siblings and modal ownership stable across language changes', () => {
    act(() => tree.update(<Harness wrap />));
    const button = (label: string) => tree.root.findAllByType('Pressable' as any)
      .find(node => node.props.accessibilityLabel === label)!;
    act(() => button('Date').props.onPress());
    act(() => trigger().props.onPress());
    const existingModal = modal();
    act(() => {
      // Native direction deliberately remains unchanged until the app restarts.
      mockRTL = !rtl;
      tree.update(<Harness wrap />);
    });
    expect(modal()).toBe(existingModal);
    expect(modal().props.visible).toBe(true);
    const dictionary = mockRTL ? ar : en;
    expect(trigger().props.accessibilityLabel).toContain(dictionary.common.status);
    if (platform === 'ios') {
      const row = tree.root.findAllByType('View' as any).find(node => node.props.testID === 'filters')!;
      expect(row.props.style.at(-1).direction).toBe(mockRTL ? 'rtl' : 'ltr');
      expect(row.findAllByType('ScrollView' as any)).toHaveLength(0);
      expect(row.findAllByType('Modal' as any)).toHaveLength(0);
    }
    act(() => modal().props.onRequestClose());
    expect(button('Date').props.accessibilityState.selected).toBe(true);
    act(() => button('Clear Date').props.onPress());
    expect(button('Date').props.accessibilityState.selected).toBe(false);
    act(() => button('Tab').props.onPress());
    expect(button('Tab').props.accessibilityState.selected).toBe(true);
    act(() => tree.update(<Harness wrap show={false} />));
    expect(tree.root.findAllByType('Modal' as any)).toHaveLength(0);
  });

  it('wraps opted-in iOS controls without a horizontal scroll responder and preserves sibling actions', () => {
    act(() => tree.update(<Harness wrap />));
    const rowType = platform === 'ios' ? 'View' : 'ScrollView';
    const row = tree.root.findAllByType(rowType as any).find(node => node.props.testID === 'filters')!;
    expect(row).toBeDefined();
    if (platform === 'ios') {
      expect(row.findAllByType('ScrollView' as any)).toHaveLength(0);
      expect(row.props.style.at(-1)).toEqual({
        direction: rtl ? 'rtl' : 'ltr', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
      });
    } else {
      expect(row.props.horizontal).toBe(true);
    }
    const button = (label: string) => row.findAllByType('Pressable' as any)
      .find(node => node.props.accessibilityLabel === label)!;
    act(() => button('Tab').props.onPress());
    expect(button('Tab').props.accessibilityState.selected).toBe(true);
    act(() => button('Date').props.onPress());
    expect(button('Date').props.accessibilityState.selected).toBe(true);
    act(() => button('Clear Date').props.onPress());
    expect(button('Date').props.accessibilityState.selected).toBe(false);
    act(() => trigger().props.onPress());
    expect(modal().props.visible).toBe(true);
    act(() => modal().props.onRequestClose());
    expect(modal().props.visible).toBe(false);
    act(() => button('Tab').props.onPress());
    expect(button('Tab').props.accessibilityState.selected).toBe(false);
  });

  it('opens from the real chip, selects distinct statuses, clears, dismisses and reopens', () => {
    const dictionary = rtl ? ar : en;
    expect(trigger().props.accessibilityLabel).toBe(`${dictionary.common.status}: ${dictionary.common.allStatuses}`);
    expect(modal().props.visible).toBe(false);
    const row = tree.root.findAllByType('ScrollView' as any).find(node => node.props.testID === 'filters')!;
    // Regression guard: an iOS modal must not be a descendant of the scroll row.
    expect(row.findAllByType('Modal' as any)).toHaveLength(platform === 'ios' ? 0 : 1);
    act(() => trigger().props.onPress());
    expect(modal().props.visible).toBe(true);
    expect(trigger().props.accessibilityState.expanded).toBe(true);
    const originalModal = modal();
    const labels = modal().findAllByType('ThemedText' as any).map(node => node.props.children);
    expect(labels).not.toContain(dictionary.status.draft);
    expect(labels).not.toContain(dictionary.status.expired);
    expect(labels).not.toContain(dictionary.status.checkedIn);
    pressOption(dictionary.status.cancelled);
    expect(changes).toHaveBeenLastCalledWith('cancelled');
    expect(modal()).toBe(originalModal); // Updating content must not remount.
    expect(modal().props.visible).toBe(false);
    expect(trigger().props.accessibilityLabel).toContain(dictionary.status.cancelled);
    act(() => trigger().props.onPress());
    pressOption(dictionary.status.autoCancelled);
    expect(changes).toHaveBeenLastCalledWith('auto_cancelled');
    act(() => trigger().props.onPress());
    pressOption(dictionary.common.allStatuses);
    expect(changes).toHaveBeenLastCalledWith(null);
    act(() => trigger().props.onPress());
    act(() => modal().findAllByType('Pressable' as any)
      .find(node => node.props.accessibilityLabel === dictionary.common.close)!.props.onPress());
    expect(modal().props.visible).toBe(false);
    act(() => trigger().props.onPress());
    act(() => modal().props.onRequestClose());
    expect(modal().props.visible).toBe(false);
    expect(changes).toHaveBeenCalledTimes(3);
    act(() => trigger().props.onPress());
    expect(modal().props.visible).toBe(true);
    act(() => tree.update(<Harness show={false} />));
    expect(tree.root.findAllByType('Modal' as any)).toHaveLength(0);
  });

  it('updates overlay translations after a language change without losing selection', () => {
    act(() => trigger().props.onPress());
    pressOption((rtl ? ar : en).status.cancelled);
    act(() => {
      mockRTL = !rtl;
      tree.update(<Harness />);
    });
    const dictionary = mockRTL ? ar : en;
    expect(trigger().props.accessibilityLabel).toContain(dictionary.status.cancelled);
    act(() => trigger().props.onPress());
    pressOption(dictionary.common.allStatuses);
    expect(changes).toHaveBeenLastCalledWith(null);
  });

  it('preserves the typed request picker undefined clear value', () => {
    act(() => tree.update(<Harness typed />));
    act(() => trigger().props.onPress());
    const labels = modal().findAllByType('ThemedText' as any).map(node => node.props.children);
    expect(labels).not.toContain((rtl ? ar : en).status.expired);
    expect(labels).toContain((rtl ? ar : en).status.cancelled);
    expect(labels).toContain((rtl ? ar : en).status.autoCancelled);
    pressOption((rtl ? ar : en).common.allStatuses);
    expect(changes).toHaveBeenLastCalledWith(undefined);
  });
});