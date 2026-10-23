import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, TextInput } from 'react-native';
import { getTranslation } from '@/constants/i18n';
import { MIN_PASSWORD_LENGTH, newPasswordPolicyError } from '@/utils/newPasswordPolicy';
import LoginScreen from '@/screens/Auth/LoginScreen';

let mockLocale: 'en' | 'ar' = 'en';
const originalPlatform = Platform.OS;
const mockLogin = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/contexts/AuthContext', () => ({
  SESSION_EXPIRED_ERROR: 'session-expired',
  useAuth: () => ({ login: mockLogin, ssoLogin: jest.fn(), isLoading: false, error: null }),
}));
jest.mock('@/contexts/ToastContext', () => ({ useToast: () => ({ showError: jest.fn() }) }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockLocale, isRTL: mockLocale === 'ar' }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => require('@/constants/i18n').getTranslation(mockLocale, key),
  }),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: require('@/constants/theme').Colors.light, isDark: false }),
}));
jest.mock('@/hooks/useAzureAuth', () => ({
  useAzureAuth: () => ({ promptAsync: jest.fn(), isLoading: false, isConfigured: true }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: () => null }));
jest.mock('@/components/shared/LoadingButton', () => ({ LoadingButton: 'LoginAction' }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');

describe.each(['en', 'ar'] as const)('login minimum password length (%s)', locale => {
  let tree: ReactTestRenderer;
  beforeEach(() => {
    mockLocale = locale;
    mockLogin.mockReset().mockResolvedValue({ user: { role: 'employee' } });
    act(() => { tree = create(<LoginScreen />); });
    act(() => tree.root.findAllByType(TextInput).find(input => input.props.keyboardType === 'email-address')!
      .props.onChangeText('fixture@example.test'));
  });
  afterEach(() => {
    act(() => tree.unmount());
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });
  const enterPassword = (password: string) => act(() => {
    tree.root.findAllByType(TextInput).find(input => input.props.placeholder === getTranslation(locale, 'auth.passwordPlaceholder'))!
      .props.onChangeText(password);
  });
  const submit = async () => {
    await act(async () => {
      await tree.root.find(node => node.type === 'LoginAction' as any &&
        node.props.children === getTranslation(locale, 'auth.signIn')).props.onPress();
    });
  };

  it.each([1, 6, 7])('rejects a %i-character password before calling login', async length => {
    enterPassword('x'.repeat(length));
    await submit();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain(getTranslation(locale, 'auth.passwordMinLength'));
    expect(getTranslation(locale, 'auth.passwordMinLength')).toContain('8');
    expect(newPasswordPolicyError('x'.repeat(length))).toBe('auth.newPasswordMinLength');
  });

  it('keeps an empty password required rather than reporting its length', async () => {
    await submit();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain(getTranslation(locale, 'form.required'));
    expect(JSON.stringify(tree.toJSON())).not.toContain(getTranslation(locale, 'auth.passwordMinLength'));
  });

  it.each(['12345678', '123456789', ' password '])('passes an eligible password unchanged to login', async password => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(newPasswordPolicyError(password)).toBeUndefined();
    enterPassword(password);
    await submit();
    expect(mockLogin).toHaveBeenCalledWith('fixture@example.test', password);
    expect(JSON.stringify(tree.toJSON())).not.toContain(getTranslation(locale, 'auth.passwordMinLength'));
  });

  it('places both download links after the sign-in form on web', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    act(() => tree.update(<LoginScreen />));
    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered.indexOf('download-ios')).toBeGreaterThan(rendered.indexOf('LoginAction'));
    expect(tree.root.findByProps({ testID: 'download-ios' }).props.accessibilityRole).toBe('link');
    expect(tree.root.findByProps({ testID: 'download-android' }).props.accessibilityRole).toBe('link');
  });

  it.each(['ios', 'android'] as const)('keeps sign-in available without download blocks on native %s', platform => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
    act(() => tree.update(<LoginScreen />));
    expect(tree.root.findAllByProps({ testID: 'download-ios' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'download-android' })).toHaveLength(0);
    expect(tree.root.findByType('LoginAction' as any)).toBeDefined();
    expect(tree.root.findAllByType(TextInput)).toHaveLength(2);
  });
});
