import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { TimePicker, TimePickerContent } from '@/components/TimePicker';
import { Colors, Spacing } from '@/constants/theme';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';

let mockDark = false;
let mockRTL = false;
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: mockDark,
    theme: require('@/constants/theme').Colors[mockDark ? 'dark' : 'light'],
  }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    isRTL: mockRTL,
    t: (key: string) => {
      const dictionary = mockRTL ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
      return key.split('.').reduce((value: any, part: string) => value[part], dictionary);
    },
  }),
}));
jest.mock('@react-native-community/datetimepicker', () => 'NativeSpinner');
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/shared/LoadingButton', () => ({ LoadingButton: 'LoadingButton' }));

describe('shared native time picker', () => {
  let tree: ReactTestRenderer | undefined;
  const originalOS = Platform.OS;
  const selected = new Date(2026, 9, 19, 9, 0);
  const next = new Date(2026, 9, 19, 14, 30);
  const onTimeSelect = jest.fn();
  const onClose = jest.fn();
  beforeEach(() => { mockDark = false; mockRTL = false; Platform.OS = 'ios'; jest.clearAllMocks(); });
  afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; Platform.OS = originalOS; });

  const mount = (value = selected) => {
    act(() => { tree = create(<TimePickerContent selectedTime={value} onTimeSelect={onTimeSelect} onClose={onClose} />); });
    return tree!;
  };
  const button = (variant: string) => tree!.root.findAllByType('LoadingButton' as any).find(node => node.props.variant === variant)!;

  it.each([false, true])('sets native appearance and visible text explicitly for dark=%s', dark => {
    mockDark = dark;
    const renderer = mount();
    const picker = renderer.root.findByType('NativeSpinner' as any);
    expect(picker.props).toMatchObject({
      mode: 'time', display: 'spinner', is24Hour: false,
      themeVariant: dark ? 'dark' : 'light', textColor: Colors[dark ? 'dark' : 'light'].text, locale: 'en-US',
    });
    expect(StyleSheet.flatten(picker.props.style)).toMatchObject({ height: 216, alignSelf: 'center', maxWidth: '100%' });
  });

  it('does not commit wheel changes when Cancel is pressed', () => {
    const renderer = mount();
    act(() => renderer.root.findByType('NativeSpinner' as any).props.onChange({ type: 'set' }, next));
    expect(onTimeSelect).not.toHaveBeenCalled();
    act(() => button('secondary').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onTimeSelect).not.toHaveBeenCalled();
    expect(selected.getHours()).toBe(9);
  });

  it('commits a copied draft exactly once on Confirm', () => {
    const renderer = mount();
    act(() => renderer.root.findByType('NativeSpinner' as any).props.onChange({ type: 'set' }, next));
    act(() => button('primary').props.onPress());
    expect(onTimeSelect).toHaveBeenCalledTimes(1);
    expect(onTimeSelect.mock.calls[0][0].getTime()).toBe(next.getTime());
    expect(onTimeSelect.mock.calls[0][0]).not.toBe(next);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('retains off-step saved minutes rather than rounding them on open', () => {
    const renderer = mount(new Date(2026, 9, 19, 9, 7));
    const picker = renderer.root.findByType('NativeSpinner' as any);
    expect(picker.props.minuteInterval).toBe(1);
    expect(picker.props.value.getMinutes()).toBe(7);
  });

  it('renders a readable error instead of passing an invalid date to native', () => {
    const renderer = mount(new Date(NaN));
    expect(renderer.root.findAllByType('NativeSpinner' as any)).toHaveLength(0);
    expect(button('primary').props.disabled).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain(en.time.invalidTime);
  });

  it('uses the Arabic native locale and translated actions', () => {
    mockRTL = true;
    const renderer = mount();
    expect(renderer.root.findByType('NativeSpinner' as any).props.locale).toBe('ar-SA');
    expect(button('secondary').props.children).toBe(ar.common.cancel);
  });

  it.each([false, true])('keeps dialog content inset on both sides in Arabic (dark=%s)', dark => {
    mockRTL = true;
    mockDark = dark;
    act(() => { tree = create(<TimePicker visible selectedTime={selected} onTimeSelect={onTimeSelect} onClose={onClose} />); });
    const scroll = tree!.root.findByType(ScrollView);
    const viewportStyle = StyleSheet.flatten(scroll.props.style);
    expect(viewportStyle.direction).toBe('ltr');
    expect(viewportStyle.padding).toBeUndefined();
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({
      direction: 'ltr', padding: Spacing.xl,
    });
    expect(tree!.root.findByType('NativeSpinner' as any).props.locale).toBe('ar-SA');
  });

  it('preserves the existing English dialog spacing', () => {
    act(() => { tree = create(<TimePicker visible selectedTime={selected} onTimeSelect={onTimeSelect} onClose={onClose} />); });
    const scroll = tree!.root.findByType(ScrollView);
    expect(StyleSheet.flatten(scroll.props.style).padding).toBe(Spacing.xl);
    expect(scroll.props.contentContainerStyle).toBeUndefined();
  });

  it('opens Android in 12-hour spinner mode and discards dismissal', () => {
    Platform.OS = 'android';
    act(() => { tree = create(<TimePicker visible selectedTime={selected} onTimeSelect={onTimeSelect} onClose={onClose} />); });
    const picker = tree!.root.findByType('NativeSpinner' as any);
    expect(picker.props).toMatchObject({ display: 'spinner', is24Hour: false });
    act(() => picker.props.onChange({ type: 'dismissed' }, next));
    expect(onTimeSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('commits Android selection only on its native Confirm event', () => {
    Platform.OS = 'android';
    act(() => { tree = create(<TimePicker visible selectedTime={selected} onTimeSelect={onTimeSelect} onClose={onClose} />); });
    act(() => tree!.root.findByType('NativeSpinner' as any).props.onChange({ type: 'set' }, next));
    expect(onTimeSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    [false, false], [false, true], [true, false], [true, true],
  ])('covers iOS dark=%s Arabic=%s with real theme colours and translations', (dark, rtl) => {
    mockDark = dark;
    mockRTL = rtl;
    const renderer = mount();
    const theme = Colors[dark ? 'dark' : 'light'];
    const strings = rtl ? ar : en;
    expect(renderer.root.findByType('NativeSpinner' as any).props).toMatchObject({
      textColor: theme.text, themeVariant: dark ? 'dark' : 'light',
      locale: rtl ? 'ar-SA' : 'en-US', is24Hour: false,
    });
    const picker = renderer.root.findByType('NativeSpinner' as any);
    // Preserve intrinsic localized sizing and center it, rather than forcing
    // full-width wheels whose contents can shift to the trailing edge in RTL.
    const pickerStyle = StyleSheet.flatten(picker.props.style);
    expect(pickerStyle).toMatchObject({ height: 216, alignSelf: 'center', maxWidth: '100%' });
    expect(pickerStyle.width).toBeUndefined();
    expect(StyleSheet.flatten(picker.parent!.props.style)).toMatchObject({ width: '100%', alignItems: 'center' });
    expect(StyleSheet.flatten(renderer.root.findAllByType(View)[0].props.style).backgroundColor).toBe(theme.surface);
    expect(theme.text).not.toBe(theme.surface);
    const heading = renderer.root.findAllByType('ThemedText' as any)[0];
    expect(heading.props.children).toBe(strings.time.selectTime);
    expect(StyleSheet.flatten(heading.props.style)).toMatchObject({
      color: theme.text, textAlign: rtl ? 'right' : 'left',
    });
    expect(StyleSheet.flatten(renderer.root.findAllByType(View)[1].props.style)).toMatchObject({
      direction: 'ltr', flexDirection: rtl ? 'row-reverse' : 'row',
    });
    expect(button('secondary').props.children).toBe(strings.common.cancel);
    expect(button('primary').props.children).toBe(strings.common.confirm);
    act(() => renderer.root.findByType('NativeSpinner' as any).props.onChange({ type: 'set' }, next));
    expect(onTimeSelect).not.toHaveBeenCalled();
    act(() => button('primary').props.onPress());
    expect(onTimeSelect).toHaveBeenCalledTimes(1);
    expect(onTimeSelect.mock.calls[0][0].getTime()).toBe(next.getTime());
    expect(selected.getTime()).toBe(new Date(2026, 9, 19, 9, 0).getTime());
  });

  it.each([
    [false, false], [false, true], [true, false], [true, true],
  ])('covers Android dark=%s Arabic=%s without changing native confirmation semantics', (dark, rtl) => {
    Platform.OS = 'android';
    mockDark = dark;
    mockRTL = rtl;
    const strings = rtl ? ar : en;
    act(() => { tree = create(<TimePicker visible selectedTime={selected} onTimeSelect={onTimeSelect} onClose={onClose} />); });
    const picker = tree!.root.findByType('NativeSpinner' as any);
    expect(picker.props).toMatchObject({
      is24Hour: false, display: 'spinner',
      positiveButton: { label: strings.common.confirm, textColor: Colors[dark ? 'dark' : 'light'].primary },
      negativeButton: { label: strings.common.cancel, textColor: Colors[dark ? 'dark' : 'light'].primary },
    });
    act(() => picker.props.onChange({ type: 'dismissed' }, next));
    expect(onTimeSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('updates appearance and language without replacing the current selection', () => {
    const renderer = mount();
    act(() => renderer.root.findByType('NativeSpinner' as any).props.onChange({ type: 'set' }, next));
    mockDark = true;
    mockRTL = true;
    act(() => renderer.update(<TimePickerContent selectedTime={selected} onTimeSelect={onTimeSelect} onClose={onClose} />));
    const picker = renderer.root.findByType('NativeSpinner' as any);
    expect(picker.props).toMatchObject({ themeVariant: 'dark', textColor: Colors.dark.text, locale: 'ar-SA' });
    expect(picker.props.value.getTime()).toBe(next.getTime());
    expect(button('primary').props.children).toBe(ar.common.confirm);
    expect(onTimeSelect).not.toHaveBeenCalled();
  });

  it('discards pending wheel edits when closed and reopened', () => {
    const props = { selectedTime: selected, onTimeSelect, onClose };
    act(() => { tree = create(<TimePicker visible {...props} />); });
    act(() => tree!.root.findByType('NativeSpinner' as any).props.onChange({ type: 'set' }, next));
    act(() => tree!.update(<TimePicker visible={false} {...props} />));
    expect(tree!.toJSON()).toBeNull();
    act(() => tree!.update(<TimePicker visible {...props} />));
    expect(tree!.root.findByType('NativeSpinner' as any).props.value.getTime()).toBe(selected.getTime());
    expect(onTimeSelect).not.toHaveBeenCalled();
  });

  it('discards pending wheel edits when the close icon is pressed', () => {
    const renderer = mount();
    act(() => renderer.root.findByType('NativeSpinner' as any).props.onChange({ type: 'set' }, next));
    const close = renderer.root.findAll(node =>
      node.props.accessibilityLabel === en.common.cancel && typeof node.props.onPress === 'function',
    )[0];
    expect(close).toBeDefined();
    act(() => close.props.onPress());
    expect(onTimeSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
