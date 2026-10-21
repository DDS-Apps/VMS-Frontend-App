import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { PhoneInputWithCountry } from '@/components/PhoneInputWithCountry';
import { getTranslation } from '@/constants/i18n';
import { validatePhone } from '@/utils/validation';

let mockLocale: 'en' | 'ar' = 'en';
let mockDark = false;
const mockChange = jest.fn();
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
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: () => null }));
jest.mock('expo-image', () => ({ Image: 'PhoneFlag' }));

describe.each([
  ['en', false], ['ar', false], ['en', true], ['ar', true],
] as const)('shared phone input (%s, dark=%s)', (locale, dark) => {
  let tree: ReactTestRenderer;
  const props = { value: '', onChangeText: mockChange, testID: 'national-phone' };
  const input = () => tree.root.findAllByType(TextInput).find(node => node.props.testID === 'national-phone')!;
  const change = (value: string) => act(() => input().props.onChangeText(value));
  const text = () => JSON.stringify(tree.toJSON());
  const error = () => getTranslation(locale, 'form.invalidPhone');

  beforeEach(() => {
    mockLocale = locale;
    mockDark = dark;
    mockChange.mockClear();
    act(() => { tree = create(<PhoneInputWithCountry {...props} />); });
  });
  afterEach(() => { act(() => tree.unmount()); });

  it('keeps an empty optional field empty and emits the country code separately', () => {
    expect(text()).not.toContain(error());
    change('512345678');
    expect(mockChange).toHaveBeenLastCalledWith('+966512345678');
    expect(text()).not.toContain(error());
    change('');
    expect(mockChange).toHaveBeenLastCalledWith('');
    expect(text()).not.toContain(error());
  });

  it('preserves and rejects a leading zero rather than silently removing it', () => {
    change('012345678');
    expect(mockChange).toHaveBeenLastCalledWith('+966012345678');
    expect(validatePhone(mockChange.mock.calls.at(-1)![0])).toBe(false);
    expect(text()).toContain(error());
  });

  it('preserves excess pasted digits, rejects them, and clears the error after correction', () => {
    change('5123456789');
    expect(mockChange).toHaveBeenLastCalledWith('+9665123456789');
    expect(input().props.value.replace(/\s/g, '')).toBe('5123456789');
    expect(text()).toContain(error());
    change('51234567');
    expect(text()).toContain(error());
    change('512345678');
    expect(text()).not.toContain(error());
  });

  it.each(['+965512345678', '+1512345678'])('allows nine digits even for an old 8/10-digit country format (%s)', value => {
    act(() => tree.update(<PhoneInputWithCountry {...props} value={value} />));
    change('512345678');
    expect(mockChange).toHaveBeenLastCalledWith(value);
    expect(input().props.value).toBe('51 234 5678');
    expect(text()).not.toContain(error());
  });

  it('normalizes Arabic/Persian input and retains no-leading-zero validation', () => {
    change('٥١٢٣٤٥٦٧٨');
    expect(mockChange).toHaveBeenLastCalledWith('+966512345678');
    expect(text()).not.toContain(error());
    change('۰۱۲۳۴۵۶۷۸');
    expect(mockChange).toHaveBeenLastCalledWith('+966012345678');
    expect(text()).toContain(error());
  });

  it('does not show new validation errors on locked synced fields', () => {
    act(() => tree.update(<PhoneInputWithCountry {...props} value="+966012345678" editable={false} />));
    expect(input().props.editable).toBe(false);
    expect(text()).not.toContain(error());
  });

  it('preserves a required-field error supplied by its form', () => {
    act(() => tree.update(<PhoneInputWithCountry {...props} error="Required fixture" />));
    expect(text()).toContain('Required fixture');
  });
});
