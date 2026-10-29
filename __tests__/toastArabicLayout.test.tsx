import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { LanguageContext } from '@/contexts/LanguageContext';

let mockDark = false;
jest.mock('@/contexts/LanguageContext', () => ({
  LanguageContext: require('react').createContext(undefined),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: mockDark }),
}));
jest.mock('@/utils/globalToast', () => ({
  registerToastMethods: jest.fn(), unregisterToastMethods: jest.fn(), setGlobalLocale: jest.fn(),
}));
jest.mock('@/contexts/PortalContext', () => ({
  Portal: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: { View: require('react-native').View },
    useSharedValue: (value: unknown) => React.useRef({ value }).current,
    useAnimatedStyle: (callback: () => unknown) => callback(),
    withTiming: (value: unknown, _options: unknown, callback?: () => void) => {
      callback?.(); return value;
    },
    runOnJS: (callback: Function) => callback,
  };
});

let toast: ReturnType<typeof useToast>;
function CaptureToast() {
  toast = useToast();
  return null;
}

describe('Arabic feedback toast layout', () => {
  const originalOS = Platform.OS;
  let tree: ReactTestRenderer | undefined;
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
    Platform.OS = originalOS;
    jest.useRealTimers();
  });
  function mount(locale: 'en' | 'ar', dark: boolean) {
    mockDark = dark;
    act(() => { tree = create(
      <LanguageContext.Provider value={{
        locale, isRTL: locale === 'ar', localeCode: locale === 'ar' ? 'ar-SA' : 'en-US',
        isLoading: false, isChangingLanguage: false, layoutKey: locale,
        setLocale: async () => {},
      }}>
        <ToastProvider><CaptureToast /></ToastProvider>
      </LanguageContext.Provider>,
    ); });
    act(() => toast.showInfo('لا توجد عناصر للاختيار', 'معلومات'));
  }

  it.each([
    ['web', false], ['web', true], ['ios', false], ['ios', true], ['android', false], ['android', true],
  ] as const)('places the icon at the right and text beside it on %s (dark=%s)', (os, dark) => {
    Platform.OS = os;
    mount('ar', dark);
    const row = tree!.root.findAllByType(View).find(node =>
      StyleSheet.flatten(node.props.style)?.flexDirection === 'row-reverse',
    )!;
    expect(row).toBeDefined();
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({ direction: 'ltr', alignItems: 'center' });
    const children = row.props.children;
    expect(children[0].props.children.props.name).toBe('info');
    expect(children[1].props.style.flex).toBe(1);
    expect(children[2].props.children.props.name).toBe('x');
    for (const text of tree!.root.findAllByType(Text)) {
      expect(StyleSheet.flatten(text.props.style)).toMatchObject({ textAlign: 'right', writingDirection: 'rtl' });
    }
  });

  it('preserves English ordering', () => {
    Platform.OS = 'web';
    mount('en', false);
    expect(tree!.root.findAllByType(View).some(node =>
      StyleSheet.flatten(node.props.style)?.flexDirection === 'row-reverse',
    )).toBe(false);
    for (const text of tree!.root.findAllByType(Text)) {
      expect(StyleSheet.flatten(text.props.style).writingDirection).toBeUndefined();
    }
  });

  it('keeps dismissal and automatic expiry working', () => {
    Platform.OS = 'web';
    mount('ar', false);
    const dismiss = tree!.root.findAll(node => typeof node.props.onPress === 'function')[0];
    act(() => dismiss.props.onPress());
    expect(tree!.root.findAllByType(Text)).toHaveLength(0);
    act(() => toast.showInfo('رسالة'));
    expect(tree!.root.findAllByType(Text)).toHaveLength(1);
    act(() => jest.advanceTimersByTime(10000));
    expect(tree!.root.findAllByType(Text)).toHaveLength(0);
  });
});
