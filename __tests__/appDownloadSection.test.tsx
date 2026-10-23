import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Linking, Platform, StyleSheet } from 'react-native';
import AppDownloadSection from '@/components/auth/AppDownloadSection';
import { APP_STORE_LINKS } from '@/constants/appStoreLinks';
import { getTranslation } from '@/constants/i18n';

let mockLocale: 'en' | 'ar' = 'en';
let mockDark = false;
const originalPlatform = Platform.OS;
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockLocale, isRTL: mockLocale === 'ar' }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => require('@/constants/i18n').getTranslation(mockLocale, key) }),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: require('@/constants/theme').Colors[mockDark ? 'dark' : 'light'], isDark: mockDark }),
}));
jest.mock('react-native-qrcode-svg', () => 'QRCode');

describe.each([
  ['en', false], ['ar', false], ['en', true], ['ar', true],
] as const)('production app downloads (%s, dark=%s)', (locale, dark) => {
  let tree: ReactTestRenderer;
  let open: jest.SpyInstance;
  const text = () => JSON.stringify(tree.toJSON());
  const press = async (platform: 'ios' | 'android') => {
    await act(async () => {
      await tree.root.findByProps({ testID: `download-${platform}` }).props.onPress();
    });
  };
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    mockLocale = locale;
    mockDark = dark;
    open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    act(() => { tree = create(<AppDownloadSection />); });
  });
  afterEach(() => {
    act(() => tree.unmount());
    open.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('renders the exact production destinations as genuine high-contrast QR payloads', () => {
    const qrs = tree.root.findAllByType('QRCode' as any);
    expect(qrs.map(qr => qr.props.value)).toEqual([
      'https://apps.apple.com/us/app/dallah-digital-vms/id6757189342',
      'https://play.google.com/store/apps/details?id=com.dallah.vms&hl=en',
    ]);
    qrs.forEach(qr => {
      expect(qr.props.color).toBe('#000000');
      expect(qr.props.backgroundColor).toBe('#FFFFFF');
      expect(qr.props.quietZone).toBeGreaterThan(0);
    });
    expect(open).not.toHaveBeenCalled();
    expect(text()).toContain(getTranslation(locale, 'auth.appDownloadTitle'));
    expect(text()).not.toContain('auth.appDownload');
  });

  it.each(['ios', 'android'] as const)('opens exactly the QR destination for %s', async platform => {
    await press(platform);
    expect(open).toHaveBeenCalledWith(APP_STORE_LINKS[platform]);
    expect(open).toHaveBeenCalledTimes(1);
    const action = tree.root.findByProps({ testID: `download-${platform}` });
    expect(action.props.accessibilityRole).toBe('link');
    expect(action.props.accessibilityLabel).toContain(platform === 'ios' ? 'App Store' : 'Google Play');
  });

  it('wraps cards based on available form width rather than fixed screen percentages', () => {
    const row = tree.root.findByProps({ testID: 'app-download-cards' });
    const rowStyle = StyleSheet.flatten(row.props.style);
    expect(rowStyle.flexWrap).toBe('wrap');
    expect(row.props.forceDirection).toBe(locale === 'ar' ? 'row-reverse' : 'row');
    const card = tree.root.findByProps({ testID: 'download-ios' });
    const cardStyle = StyleSheet.flatten(card.props.style({ pressed: false }));
    expect(cardStyle.flexGrow).toBe(1);
    expect(cardStyle.flexShrink).toBe(1);
    expect(cardStyle.flexBasis).toBeGreaterThan(0);
    expect(cardStyle.width).toBeUndefined();
  });

  it('shows a translated opening error, then clears it when retrying succeeds', async () => {
    open.mockRejectedValueOnce(new Error('Offline fixture'));
    await press('ios');
    expect(text()).toContain(getTranslation(locale, 'errors.somethingWentWrong'));
    await press('ios');
    expect(text()).not.toContain(getTranslation(locale, 'errors.somethingWentWrong'));
  });
});

describe.each(['ios', 'android'] as const)('native %s app downloads', platform => {
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it.each([
    ['en', false], ['ar', false], ['en', true], ['ar', true],
  ] as const)('hides the entire section (%s, dark=%s)', (locale, dark) => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
    mockLocale = locale;
    mockDark = dark;
    let tree!: ReactTestRenderer;
    try {
      act(() => { tree = create(<AppDownloadSection />); });
      expect(tree.toJSON()).toBeNull();
      expect(tree.root.findAllByType('QRCode' as any)).toHaveLength(0);
      expect(tree.root.findAllByProps({ testID: 'app-download-cards' })).toHaveLength(0);
    } finally {
      if (tree) act(() => tree.unmount());
    }
  });
});
