import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TextInput } from 'react-native';
import ChangePasswordScreen from '@/screens/Profile/ChangePasswordScreen';
import { getTranslation } from '@/constants/i18n';

let mockLocale: 'en' | 'ar' = 'en';
const mockMutate = jest.fn(async () => undefined);
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockLocale, isRTL: mockLocale === 'ar' }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/components/ScreenKeyboardAwareScrollView', () => ({ ScreenKeyboardAwareScrollView: 'ScreenKeyboardAwareScrollView' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: () => null }));
jest.mock('@/contexts/ToastContext', () => ({ useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }) }));
jest.mock('@/hooks/queries/useAuthQueries', () => ({ useChangePasswordMutation: () => ({ mutateAsync: mockMutate, isPending: false }) }));
jest.mock('@/components/shared/LoadingButton', () => ({
  LoadingButton: ({ children, ...props }: any) => require('react').createElement('ChangeAction', props, children),
}));
let tree: ReactTestRenderer;
const tr = (key: string) => getTranslation(mockLocale, key);
const submit = () => tree.root.find(node => node.type === 'ChangeAction' as any && node.props.children === tr('auth.updatePassword'));
function enter(password: string, confirmation = password) {
  const inputs = tree.root.findAllByType(TextInput);
  act(() => {
    inputs[0].props.onChangeText('old-pass');
    inputs[1].props.onChangeText(password);
    inputs[2].props.onChangeText(confirmation);
  });
}
describe.each(['en', 'ar'] as const)('signed-in password policy (%s)', locale => {
  beforeEach(() => {
    mockLocale = locale; mockMutate.mockClear();
    act(() => { tree = create(<ChangePasswordScreen onSuccess={jest.fn()} onCancel={jest.fn()} />); });
  });
  afterEach(() => act(() => tree.unmount()));
  it.each(['1234567', '        ', 'a'.repeat(73), 'ع'.repeat(37), '🙂'.repeat(19)])('blocks invalid password before transport', async password => {
    enter(password);
    expect(submit().props.disabled).toBe(true);
    // Verify handler validation too, not only the disabled button.
    await act(async () => submit().props.onPress());
    expect(mockMutate).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain(tr('auth.newPasswordGuidance'));
  });
  it.each(['12345678', 'a'.repeat(72), 'ع'.repeat(36), '🙂'.repeat(18), ' spaced '])('sends valid passwords byte-for-byte', async password => {
    enter(password);
    expect(submit().props.disabled).toBe(false);
    await act(async () => submit().props.onPress());
    expect(mockMutate).toHaveBeenCalledWith({ currentPassword: 'old-pass', newPassword: password, confirmPassword: password });
  });
  it('rejects confirmation differing only in surrounding spaces', async () => {
    enter(' spaced ', 'spaced');
    expect(submit().props.disabled).toBe(true);
    await act(async () => submit().props.onPress());
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
