import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TextInput, StyleSheet, Platform } from 'react-native';

let mockLocale: 'en' | 'ar' = 'en';
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockLocale, isRTL: mockLocale === 'ar', setLocale: jest.fn(), isChangingLanguage: false }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: require('react-native').ScrollView,
}));
jest.mock('@/components/DDIcon', () => ({ DDIcon: () => null }));
jest.mock('@/components/shared/LoadingButton', () => ({
  LoadingButton: ({ children, ...props }: any) => require('react').createElement('RecoveryAction', props, children),
}));
jest.mock('@/services/api/authService', () => ({
  authService: { forgotPassword: jest.fn(), validateResetPassword: jest.fn(), resetPassword: jest.fn() },
}));

import PasswordRecoveryScreen from '@/screens/Auth/PasswordRecoveryScreen';
import { authService } from '@/services/api/authService';
import { PasswordResetError } from '@/services/api/passwordResetService';
import { getTranslation } from '@/constants/i18n';

const api = jest.mocked(authService);
let renderer: ReactTestRenderer;
const onResetSuccess = jest.fn();
const onBackToLogin = jest.fn();
const props = { onResetSuccess, onBackToLogin, onRequestNewLink: jest.fn() };
const tr = (key: string) => getTranslation(mockLocale, key);
const action = (key: string) => renderer.root.find(node => node.type === 'RecoveryAction' as any && node.props.children === tr(key));
const input = (label: string) => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === tr(label))!;
const text = () => JSON.stringify(renderer.toJSON());
async function mount(mode: 'request' | 'reset' | 'success', token: string | null = null) {
  await act(async () => { renderer = create(<PasswordRecoveryScreen {...props} mode={mode} token={token} />); });
}
async function press(key: string) { await act(async () => { action(key).props.onPress(); }); }
function type(label: string, value: string) { act(() => input(label).props.onChangeText(value)); }

describe('password recovery public states', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockLocale = 'en';
    api.forgotPassword.mockResolvedValue(undefined);
    api.resetPassword.mockResolvedValue(undefined);
    api.validateResetPassword.mockResolvedValue({ valid: true, expiresAt: new Date(Date.now() + 900000).toISOString() });
  });
  afterEach(() => { if (renderer) act(() => renderer.unmount()); jest.useRealTimers(); jest.restoreAllMocks(); });

  it.each(['en', 'ar'] as const)('matches login field and action sizing with one web focus border in %s', async locale => {
    mockLocale = locale;
    jest.replaceProperty(Platform, 'OS', 'web');
    await mount('request');
    const email = input('form.emailAddress');
    expect(StyleSheet.flatten(email.props.style)).toMatchObject({ fontSize: 17, outlineStyle: 'none' });
    const label = renderer.root.findAll(node => node.props.children === tr('form.emailAddress').toUpperCase())[0];
    expect(StyleSheet.flatten(label.props.style).fontSize).toBe(12);
    expect(StyleSheet.flatten(action('passwordRecovery.sendLink').props.style).height).toBe(56);
    expect(action('passwordRecovery.sendLink').props.size).toBe('large');
    act(() => email.props.onFocus());
    let container = input('form.emailAddress').parent!;
    while (container.parent && StyleSheet.flatten(container.props.style)?.height !== 56) container = container.parent;
    expect(StyleSheet.flatten(container.props.style)).toMatchObject({ height: 56, borderWidth: 2 });
    act(() => input('form.emailAddress').props.onBlur());
    expect(StyleSheet.flatten(container.props.style).borderWidth).toBe(1);
  });

  it.each(['en', 'ar'] as const)('renders neutral confirmation and preserves resend cooldown when editing in %s', async locale => {
    mockLocale = locale;
    await mount('request');
    type('form.emailAddress', 'bad-address');
    await press('passwordRecovery.sendLink');
    expect(api.forgotPassword).not.toHaveBeenCalled();
    type('form.emailAddress', ' local@example.test ');
    await press('passwordRecovery.sendLink');
    expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'local@example.test', locale });
    expect(text()).toContain(tr('passwordRecovery.emailSentBody'));
    expect(text()).toContain(tr('passwordRecovery.microsoftGuidance'));
    expect(action('passwordRecovery.resendLink').props.disabled).toBe(true);
    await press('passwordRecovery.editEmail');
    type('form.emailAddress', 'sso@example.test');
    await press('passwordRecovery.sendLink');
    expect(api.forgotPassword).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(60000); });
    await press('passwordRecovery.sendLink');
    expect(api.forgotPassword).toHaveBeenCalledTimes(2);
    expect(text()).toContain(tr('passwordRecovery.emailSentBody'));
  });

  it('never claims delivery when service is unavailable and honors Retry-After', async () => {
    api.forgotPassword.mockRejectedValueOnce(new PasswordResetError('unavailable'))
      .mockRejectedValueOnce(new PasswordResetError('rateLimit', 120));
    await mount('request');
    type('form.emailAddress', 'unknown@example.test');
    await press('passwordRecovery.sendLink');
    expect(text()).toContain(tr('passwordRecovery.unavailableError'));
    expect(text()).not.toContain(tr('passwordRecovery.emailSentBody'));
    await press('passwordRecovery.sendLink');
    await act(async () => { jest.advanceTimersByTime(60000); });
    expect(action('passwordRecovery.sendLink').props.disabled).toBe(true);
    await press('passwordRecovery.sendLink');
    expect(api.forgotPassword).toHaveBeenCalledTimes(2);
    await act(async () => { jest.advanceTimersByTime(60000); });
    await press('passwordRecovery.sendLink');
    expect(text()).toContain(tr('passwordRecovery.emailSentBody'));
  });

  it('validates passwords, prevents concurrent submissions and returns success without login', async () => {
    let resolve!: () => void;
    api.resetPassword.mockImplementation(() => new Promise<void>(done => { resolve = done; }));
    await mount('reset', 'fixture-token');
    expect(api.validateResetPassword).toHaveBeenCalledWith('fixture-token');
    type('auth.newPassword', 'short');
    type('auth.confirmNewPassword', 'different');
    await press('passwordRecovery.resetPassword');
    expect(api.resetPassword).not.toHaveBeenCalled();
    expect(text()).toContain(tr('auth.newPasswordMinLength'));
    type('auth.newPassword', ' exact12 ');
    type('auth.confirmNewPassword', ' exact12 ');
    await press('passwordRecovery.resetPassword');
    await press('passwordRecovery.resetPassword');
    expect(api.resetPassword).toHaveBeenCalledTimes(1);
    expect(api.resetPassword).toHaveBeenCalledWith({ token: 'fixture-token', newPassword: ' exact12 ', confirmPassword: ' exact12 ' });
    await act(async () => resolve());
    expect(onResetSuccess).toHaveBeenCalledTimes(1);
    expect(input('auth.newPassword').props.value).toBe('');
    await act(async () => renderer.update(<PasswordRecoveryScreen {...props} mode="success" token={null} />));
    expect(text()).toContain(tr('passwordRecovery.successBody'));
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
    await press('passwordRecovery.backToLogin');
    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });

  it.each([null, 'expired', 'replayed'])('shows recovery for a %s link', async token => {
    api.validateResetPassword.mockRejectedValue(new PasswordResetError('invalidLink'));
    await mount('reset', token);
    expect(text()).toContain(tr('passwordRecovery.invalidBody'));
    expect(action('passwordRecovery.requestNewLink')).toBeDefined();
    expect(api.validateResetPassword).toHaveBeenCalledTimes(token ? 1 : 0);
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['1234567', 'auth.newPasswordMinLength'],
    [' '.repeat(8), 'form.required'],
    ['a'.repeat(73), 'auth.passwordMaxBytes'],
    ['ع'.repeat(37), 'auth.passwordMaxBytes'],
    ['🙂'.repeat(19), 'auth.passwordMaxBytes'],
  ])('rejects invalid new-password input with %s', async (password, errorKey) => {
    await mount('reset', 'fixture-token');
    type('auth.newPassword', password);
    type('auth.confirmNewPassword', password);
    await press('passwordRecovery.resetPassword');
    expect(api.resetPassword).not.toHaveBeenCalled();
    expect(text()).toContain(tr(errorKey));
    expect(text()).toContain(tr('auth.newPasswordGuidance'));
  });

  it.each(['12345678', 'a'.repeat(72), 'ع'.repeat(36), '🙂'.repeat(18)])('submits a boundary-valid password unchanged', async password => {
    await mount('reset', 'fixture-token');
    type('auth.newPassword', password);
    type('auth.confirmNewPassword', password);
    await press('passwordRecovery.resetPassword');
    expect(api.resetPassword).toHaveBeenCalledWith({ token: 'fixture-token', newPassword: password, confirmPassword: password });
  });

  it('retries validation after network failure and stops submitting after expiry', async () => {
    api.validateResetPassword.mockRejectedValueOnce(new PasswordResetError('network'))
      .mockResolvedValueOnce({ valid: true, expiresAt: new Date(Date.now() + 3000).toISOString() });
    await mount('reset', 'fixture');
    expect(text()).toContain(tr('passwordRecovery.networkError'));
    await press('passwordRecovery.retry');
    type('auth.newPassword', 'abcdef');
    type('auth.confirmNewPassword', 'abcdef');
    await act(async () => { jest.advanceTimersByTime(4000); });
    expect(text()).toContain(tr('passwordRecovery.invalidBody'));
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('does not let stale validation or submission update a newer page', async () => {
    let resolve!: (value: { valid: true; expiresAt: string }) => void;
    api.validateResetPassword.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await mount('reset', 'old');
    await act(async () => renderer.update(<PasswordRecoveryScreen {...props} mode="request" token={null} />));
    await act(async () => resolve({ valid: true, expiresAt: new Date(Date.now() + 900000).toISOString() }));
    expect(text()).toContain(tr('passwordRecovery.requestTitle'));
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);
  });
});
