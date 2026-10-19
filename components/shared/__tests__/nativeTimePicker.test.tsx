import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet } from 'react-native';
import { TimePicker, TimePickerContent } from '@/components/TimePicker';

let mockDark = false;
let mockRTL = false;
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: mockDark,
    theme: { surface: mockDark ? '#111' : '#fff', text: mockDark ? '#fff' : '#222', textSecondary: '#777', border: '#ddd', primary: '#f80', error: '#c00' },
  }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ isRTL: mockRTL, t: (key: string) => key }),
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
      themeVariant: dark ? 'dark' : 'light', textColor: dark ? '#fff' : '#222', locale: 'en-US',
    });
    expect(StyleSheet.flatten(picker.props.style)).toMatchObject({ width: '100%', height: 216 });
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
    expect(JSON.stringify(renderer.toJSON())).toContain('time.invalidTime');
  });

  it('uses the Arabic native locale and translated actions', () => {
    mockRTL = true;
    const renderer = mount();
    expect(renderer.root.findByType('NativeSpinner' as any).props.locale).toBe('ar-SA');
    expect(button('secondary').props.children).toBe('common.cancel');
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
});
