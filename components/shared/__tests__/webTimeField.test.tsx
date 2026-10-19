import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TimeField } from '@/components/time/TimeField.web';

let mockRTL = false;
const mockListeners = new Map<string, Function>();
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
  useTheme: () => ({ theme: { primary: '#f80', text: '#222', border: '#ddd', surface: '#fff', surfaceSecondary: '#eee', error: '#c00', textSecondary: '#777' } }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ isRTL: mockRTL, t: (key: string) => key }),
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
    mockDialog = null;
    mockListeners.clear();
    Object.defineProperty(global, 'document', { configurable: true, value: {
      body: {}, getElementById: () => ({ scrollIntoView: jest.fn() }),
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
          contains: () => false, focus: jest.fn(),
        }) },
      );
    });
    return tree!;
  }
  const input = () => tree!.root.findByType('input');
  const type = (value: string) => act(() => input().props.onChange({ target: { value } }));
  const key = (value: string) => act(() => input().props.onKeyDown({ key: value, preventDefault: jest.fn() }));

  it('displays a 12-hour value, with typing, suggestions and combobox semantics', () => {
    const renderer = mount();
    expect(input().props.value).toBe('9:07 AM');
    expect(input().props.role).toBe('combobox');
    act(() => input().props.onFocus());
    expect(renderer.root.findAllByProps({ role: 'option' })).toHaveLength(288);
    expect(renderer.root.findByProps({ role: 'listbox' })).toBeDefined();
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

  it('selects a suggestion immediately and closes the dropdown', () => {
    const renderer = mount();
    act(() => input().props.onFocus());
    const option = renderer.root.findAllByProps({ role: 'option' }).find(node => node.props.children === '2:30 PM')!;
    act(() => option.props.onClick());
    expect(onTimeSelect.mock.calls[0][0].getHours()).toBe(14);
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

  it('supports arrow navigation followed by Enter selection', () => {
    mount();
    act(() => input().props.onFocus());
    key('ArrowDown');
    key('Enter');
    expect(onTimeSelect.mock.calls[0][0].getMinutes()).toBe(10);
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
});
