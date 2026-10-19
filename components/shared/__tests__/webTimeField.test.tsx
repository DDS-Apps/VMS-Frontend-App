import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TimeField } from '@/components/time/TimeField.web';
import { Colors } from '@/constants/theme';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';

let mockRTL = false;
let mockDark = false;
const mockListeners = new Map<string, Function>();
const mockFocus = jest.fn();
const mockPortal = jest.fn((children: React.ReactNode, _container: Element) => children);
let mockDialog: Element | null = null;
jest.mock('react-native', () => {
  const React = require('react');
  return {
    Platform: { OS: 'web', select: (options: any) => options.web ?? options.default },
    View: React.forwardRef((props: any, ref: any) => React.createElement('View', { ...props, ref }, props.children)),
    StyleSheet: {
      create: (style: unknown) => style,
      flatten: (style: any): any => Array.isArray(style) ? Object.assign({}, ...style.map((item: any) => Array.isArray(item) ? Object.assign({}, ...item) : item)) : style,
    },
  };
});
jest.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode, container: Element) => mockPortal(children, container),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: require('@/constants/theme').Colors[mockDark ? 'dark' : 'light'] }),
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
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));

const reference = new Date(2026, 9, 19, 9, 7);
describe('editable web time dropdown', () => {
  let tree: ReactTestRenderer | undefined;
  const onTimeSelect = jest.fn();
  const onValidityChange = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    mockRTL = false;
    mockDark = false;
    mockDialog = null;
    mockListeners.clear();
    Object.defineProperty(global, 'document', { configurable: true, value: {
      body: {}, getElementById: () => ({ focus: mockFocus }),
      addEventListener: (key: string, callback: Function) => mockListeners.set(key, callback),
      removeEventListener: (key: string) => mockListeners.delete(key),
    } });
    Object.defineProperty(global, 'window', { configurable: true, value: {
      innerWidth: 1200, innerHeight: 900, addEventListener: jest.fn(), removeEventListener: jest.fn(),
    } });
  });
  afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; });
  function mount() {
    act(() => {
      tree = create(
        <TimeField value={reference} onTimeSelect={onTimeSelect} onPress={jest.fn()} label="Start Time" onValidityChange={onValidityChange}>
          ignored native contents
        </TimeField>,
        { createNodeMock: () => ({
          getBoundingClientRect: () => ({ top: 40, bottom: 90, left: 20, width: 300 }),
          closest: () => mockDialog,
          contains: () => false, focus: jest.fn(), clientHeight: 176,
        }) },
      );
    });
    return tree!;
  }
  const input = () => tree!.root.findByType('input');
  const type = (value: string) => act(() => input().props.onChange({ target: { value } }));
  const key = (value: string) => act(() => input().props.onKeyDown({ key: value, preventDefault: jest.fn() }));
  const column = (index: number) => tree!.root.findAllByProps({ role: 'listbox' })[index];
  const choose = (index: number, label: string) => act(() => {
    column(index).findAllByProps({ role: 'option' }).find(node => node.props.children === label)!.props.onClick();
  });
  const done = () => act(() => tree!.root.findByProps({ children: mockRTL ? ar.common.done : en.common.done }).props.onClick());

  it('shows compact independent hour/minute/period columns instead of a full-day time list', () => {
    const renderer = mount();
    expect(input().props.value).toBe('9:07 AM');
    expect(input().props.role).toBe('combobox');
    act(() => input().props.onFocus());
    expect(renderer.root.findAllByProps({ role: 'listbox' })).toHaveLength(3);
    expect(column(0).findAllByProps({ role: 'option' })).toHaveLength(12);
    expect(column(1).findAllByProps({ role: 'option' })).toHaveLength(60);
    expect(column(2).findAllByProps({ role: 'option' })).toHaveLength(2);
    expect(column(1).props.style).toMatchObject({ height: 176, overflowY: 'auto' });
    expect(input().props['aria-haspopup']).toBe('dialog');
    expect(input().props['aria-expanded']).toBe(true);
  });

  it('commits valid typing synchronously on blur before a Save can run', () => {
    mount();
    type('2:30 pm');
    act(() => input().props.onBlur({ relatedTarget: null }));
    expect(onTimeSelect).toHaveBeenCalledTimes(1);
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(14);
    expect(input().props.value).toBe('2:30 PM');
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it.each(['14:30', '', '9:90 AM', '2:30'])('blocks invalid draft %s without submitting cached time', text => {
    mount();
    type(text);
    act(() => input().props.onBlur({ relatedTarget: null }));
    expect(onTimeSelect).not.toHaveBeenCalled();
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
    expect(input().props.value).toBe(text);
    expect(input().props['aria-invalid']).toBe(true);
  });

  it('stages all three parts and only applies them once when Done is pressed', () => {
    mount();
    act(() => input().props.onFocus());
    choose(0, '02');
    choose(1, '30');
    choose(2, 'PM');
    expect(onTimeSelect).not.toHaveBeenCalled();
    expect(input().props.value).toBe('9:07 AM');
    expect(input().props['aria-expanded']).toBe(true);
    done();
    expect(onTimeSelect).toHaveBeenCalledTimes(1);
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(14);
    expect(onTimeSelect.mock.calls[0][0].getMinutes()).toBe(30);
    expect(onTimeSelect.mock.calls[0][0].getDate()).toBe(19);
    expect(input().props.value).toBe('2:30 PM');
    expect(input().props['aria-expanded']).toBe(false);
  });

  it('does not round existing minutes just because Enter is pressed', () => {
    mount();
    act(() => input().props.onFocus());
    key('Enter');
    expect(input().props.value).toBe('9:07 AM');
    expect(onTimeSelect).not.toHaveBeenCalled();
  });

  it('supports focusing and navigating the columns by keyboard before Enter applies', () => {
    mount();
    act(() => input().props.onFocus());
    key('ArrowDown');
    expect(mockFocus).toHaveBeenCalled();
    act(() => column(0).props.onKeyDown({ key: 'ArrowDown', preventDefault: jest.fn(), stopPropagation: jest.fn() }));
    expect(onTimeSelect).not.toHaveBeenCalled();
    key('Enter');
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(10);
    expect(onTimeSelect.mock.calls[0][0].getMinutes()).toBe(7);
  });

  it('Escape restores the committed value and clears invalidity', () => {
    mount();
    type('14:30');
    key('Escape');
    expect(input().props.value).toBe('9:07 AM');
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    expect(onTimeSelect).not.toHaveBeenCalled();
  });

  it('commits before an outside pointer can submit the form', () => {
    mount();
    act(() => input().props.onFocus());
    type('2:30 PM');
    act(() => mockListeners.get('pointerdown')!({ target: {} }));
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(14);
    expect(input().props['aria-expanded']).toBe(false);
  });

  it('uses the actual time returned by existing scheduling clamps', () => {
    onTimeSelect.mockReturnValueOnce(new Date(2026, 9, 19, 16, 0));
    mount();
    type('2:30 PM');
    key('Enter');
    expect(input().props.value).toBe('4:00 PM');
  });

  it('supports Arabic 12-hour input and display', () => {
    mockRTL = true;
    mount();
    expect(input().props.value).toBe('٩:٠٧ ص');
    type('٢:٣٠ م');
    key('Enter');
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(14);
    expect(input().props.value).toBe('٢:٣٠ م');
  });

  it('cleans up invalidity when the field is closed/unmounted', () => {
    mount();
    type('invalid');
    act(() => tree!.unmount());
    tree = undefined;
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('keeps the dropdown within an existing dialog accessibility/focus boundary', () => {
    mockDialog = {} as Element;
    mount();
    act(() => input().props.onFocus());
    expect(mockPortal).toHaveBeenLastCalledWith(expect.anything(), mockDialog);
  });

  it('discards unfinished column choices on an outside click and reopens at the original time', () => {
    mount();
    act(() => input().props.onFocus());
    choose(0, '02');
    choose(1, '37');
    act(() => mockListeners.get('pointerdown')!({ target: {} }));
    expect(onTimeSelect).not.toHaveBeenCalled();
    expect(input().props.value).toBe('9:07 AM');
    act(() => input().props.onFocus());
    expect(column(0).findByProps({ 'aria-selected': true }).props.children).toBe('09');
    expect(column(1).findByProps({ 'aria-selected': true }).props.children).toBe('07');
  });

  it('discards column choices on Escape', () => {
    mount();
    act(() => input().props.onFocus());
    choose(0, '02');
    const panel = tree!.root.findByProps({ role: 'dialog' });
    act(() => panel.props.onKeyDown({ key: 'Escape', preventDefault: jest.fn(), stopPropagation: jest.fn() }));
    expect(onTimeSelect).not.toHaveBeenCalled();
    expect(input().props.value).toBe('9:07 AM');
    expect(input().props['aria-expanded']).toBe(false);
  });

  it('lets valid directly typed time commit while discarding unfinished column changes', () => {
    mount();
    act(() => input().props.onFocus());
    type('2:30 PM');
    choose(0, '05');
    act(() => mockListeners.get('pointerdown')!({ target: {} }));
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(14);
    expect(onTimeSelect.mock.calls[0][0].getMinutes()).toBe(30);
  });

  it.each([['AM', 0], ['PM', 12]])('handles twelve %s without changing the date', (period, hours) => {
    mount();
    act(() => input().props.onFocus());
    choose(0, '12');
    choose(1, '00');
    choose(2, period as string);
    done();
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(hours);
    expect(onTimeSelect.mock.calls[0][0].getDate()).toBe(19);
  });

  it('allows every minute, including values between five-minute steps', () => {
    mount();
    act(() => input().props.onFocus());
    choose(1, '37');
    done();
    expect(input().props.value).toBe('9:37 AM');
    expect(onTimeSelect.mock.calls[0][0].getMinutes()).toBe(37);
  });

  it('commits typed time when keyboard focus leaves the popup, not its unfinished column selections', () => {
    mount();
    act(() => input().props.onFocus());
    type('2:30 PM');
    choose(0, '05');
    act(() => tree!.root.findByProps({ role: 'dialog' }).props.onBlur({ relatedTarget: null }));
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(14);
    expect(input().props['aria-expanded']).toBe(false);
  });

  it('localizes all three columns in Arabic', () => {
    mockRTL = true;
    mount();
    act(() => input().props.onFocus());
    choose(0, '٠٢');
    choose(1, '٣٧');
    choose(2, 'م');
    done();
    expect(input().props.value).toBe('٢:٣٧ م');
  });

  it.each([
    [false, false], [false, true], [true, false], [true, true],
  ])('covers web dark=%s Arabic=%s using actual app colours and text', (dark, rtl) => {
    mockDark = dark;
    mockRTL = rtl;
    mount();
    act(() => input().props.onFocus());
    const theme = Colors[dark ? 'dark' : 'light'];
    const strings = rtl ? ar : en;
    const panel = tree!.root.findByProps({ role: 'dialog' });
    expect(input().props.style).toMatchObject({ color: theme.text, direction: rtl ? 'rtl' : 'ltr' });
    expect(panel.props.style).toMatchObject({ background: theme.surface, direction: rtl ? 'rtl' : 'ltr' });
    expect(column(0).findByProps({ 'aria-selected': true }).props.style).toMatchObject({ background: theme.primary, color: '#fff' });
    expect(column(2).findByProps({ 'aria-selected': true }).props.children).toBe(strings.time.am);
    expect(tree!.root.findByProps({ children: strings.common.done }).props.style).toMatchObject({ background: theme.primary, color: '#fff' });
    choose(0, rtl ? '٠٢' : '02');
    choose(1, rtl ? '٣٧' : '37');
    choose(2, strings.time.pm);
    expect(onTimeSelect).not.toHaveBeenCalled();
    done();
    expect(onTimeSelect).toHaveBeenCalledTimes(1);
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(14);
    expect(onTimeSelect.mock.calls[0][0].getMinutes()).toBe(37);
    expect(input().props.value).toBe(rtl ? '٢:٣٧ م' : '2:37 PM');
  });
});
