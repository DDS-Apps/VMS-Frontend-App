import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FlatList, TextInput } from 'react-native';
import { PhoneInputWithCountry } from '@/components/PhoneInputWithCountry';
import { getTranslation } from '@/constants/i18n';
import { getCountryByCode } from '@/constants/countryData';

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

  it('blocks a leading zero rather than inserting or silently removing it', () => {
    change('0');
    change('012345678');
    expect(mockChange).not.toHaveBeenCalled();
    expect(input().props.value).toBe('');
  });

  it('rejects an overlong paste and caps subsequent typing at nine national digits', () => {
    change('5123456789');
    expect(mockChange).not.toHaveBeenCalled();
    expect(input().props.value).toBe('');
    change('51234567');
    expect(text()).toContain(error());
    change('512345678');
    expect(text()).not.toContain(error());
    mockChange.mockClear();
    change('51 234 56789');
    change('012345678');
    expect(input().props.value).toBe('51 234 5678');
    expect(mockChange).not.toHaveBeenCalled();
  });

  it('allows partial typing, deletion, replacement, and clearing without counting spaces', () => {
    for (const value of ['5', '51', '51 234', '51 234 5678']) change(value);
    expect(mockChange).toHaveBeenLastCalledWith('+966512345678');
    change('51 234 567');
    expect(mockChange).toHaveBeenLastCalledWith('+96651234567');
    change('61 234 5678');
    expect(mockChange).toHaveBeenLastCalledWith('+966612345678');
    change('');
    expect(mockChange).toHaveBeenLastCalledWith('');
    expect(input().props.value).toBe('');
  });

  it('allows invalid prefilled values to be corrected or cleared without rewriting them on mount', () => {
    act(() => tree.update(<PhoneInputWithCountry {...props} value="+9660123456789" />));
    expect(input().props.value.replace(/\s/g, '')).toBe('0123456789');
    expect(mockChange).not.toHaveBeenCalled();
    change('');
    expect(mockChange).toHaveBeenLastCalledWith('');
    change('512345678');
    expect(mockChange).toHaveBeenLastCalledWith('+966512345678');
  });

  it.each(['+96551234567', '+12025550123', '+923453188360'])('accepts the country-specific national length (%s)', value => {
    act(() => tree.update(<PhoneInputWithCountry {...props} value={value} />));
    const digits = value.startsWith('+965') ? value.slice(4) : value.startsWith('+92') ? value.slice(3) : value.slice(2);
    change(digits);
    expect(mockChange).toHaveBeenLastCalledWith(value);
    expect(input().props.value.replace(/\D/g, '')).toBe(digits);
    expect(text()).not.toContain(error());
  });

  it('normalizes Arabic/Persian input and retains no-leading-zero validation', () => {
    change('٥١٢٣٤٥٦٧٨');
    expect(mockChange).toHaveBeenLastCalledWith('+966512345678');
    expect(text()).not.toContain(error());
    mockChange.mockClear();
    change('۰۱۲۳۴۵۶۷۸');
    change('٥١٢٣٤٥٦٧٨٩');
    expect(mockChange).not.toHaveBeenCalled();
    expect(input().props.value).toBe('51 234 5678');
  });

  const selectCountry = (code = 'KW') => {
    act(() => tree.root.findByProps({ testID: 'national-phone-country-picker' }).props.onPress());
    const list = tree.root.findByType(FlatList);
    const option = list.props.renderItem({ item: getCountryByCode(code)!, index: 2 });
    act(() => option.props.onPress());
  };

  it('changes country without truncation, then validates and limits the new country', () => {
    change('512345678');
    mockChange.mockClear();
    selectCountry();
    expect(mockChange).toHaveBeenLastCalledWith('+965512345678');
    expect(input().props.value.replace(/\D/g, '')).toBe('512345678');
    expect(text()).toContain(error());
    mockChange.mockClear();
    change('51 234 56789');
    change('012345678');
    expect(mockChange).not.toHaveBeenCalled();
    expect(input().props.value.replace(/\D/g, '')).toBe('512345678');
    change('51234567');
    expect(mockChange).toHaveBeenLastCalledWith('+96551234567');
    expect(text()).not.toContain(error());
  });

  it('keeps an empty field empty when country changes and prefixes the next partial entry correctly', () => {
    selectCountry();
    expect(mockChange).not.toHaveBeenCalled();
    expect(input().props.value).toBe('');
    change('5');
    expect(mockChange).toHaveBeenLastCalledWith('+9655');
    change('');
    expect(mockChange).toHaveBeenLastCalledWith('');
    expect(text()).not.toContain(error());
  });

  it('supports Pakistan after country selection, including controlled parent echoes', () => {
    selectCountry('PK');
    change('3453188360');
    expect(mockChange).toHaveBeenLastCalledWith('+923453188360');
    act(() => tree.update(<PhoneInputWithCountry {...props} value="+923453188360" />));
    expect(input().props.value.replace(/\D/g, '')).toBe('3453188360');
    expect(text()).not.toContain(error());
    mockChange.mockClear();
    change('03453188360');
    change('3453188360000');
    expect(mockChange).not.toHaveBeenCalled();
    expect(input().props.value.replace(/\D/g, '')).toBe('3453188360');
  });

  it('accepts international paste without duplicating the selected country code', () => {
    selectCountry('PK');
    change('+92 345 3188360');
    expect(mockChange).toHaveBeenLastCalledWith('+923453188360');
    expect(text()).not.toContain(error());
    mockChange.mockClear();
    change('+966512345678');
    expect(mockChange).not.toHaveBeenCalled();
    expect(input().props.value.replace(/\D/g, '')).toBe('3453188360');
  });

  it('allows backspacing an overlong number after switching to a shorter numbering plan', () => {
    act(() => tree.update(<PhoneInputWithCountry {...props} value="+12025550123" />));
    selectCountry();
    change('202555012');
    expect(mockChange).toHaveBeenLastCalledWith('+965202555012');
    change('20255501');
    expect(mockChange).toHaveBeenLastCalledWith('+96520255501');
    change('51234567');
    expect(mockChange).toHaveBeenLastCalledWith('+96551234567');
    expect(text()).not.toContain(error());
  });

  it('keeps a shared-calling-code country selected when the parent echoes edits', () => {
    selectCountry('CA');
    change('4165550123');
    act(() => tree.update(<PhoneInputWithCountry {...props} value="+14165550123" />));
    const picker = tree.root.findByProps({ testID: 'national-phone-country-picker' });
    const flag = picker.findByType('PhoneFlag' as any);
    expect(flag.props.source.uri).toContain('/ca.png');
    expect(text()).not.toContain(error());
  });

  it('permits a significant national leading zero where the country requires it', () => {
    selectCountry('CI');
    change('0701234567');
    expect(mockChange).toHaveBeenLastCalledWith('+2250701234567');
    expect(text()).not.toContain(error());
  });

  it('does not show new validation errors on locked synced fields', () => {
    act(() => tree.update(<PhoneInputWithCountry {...props} value="+966012345678" editable={false} />));
    expect(input().props.editable).toBe(false);
    expect(text()).not.toContain(error());
    change('512345678');
    expect(mockChange).not.toHaveBeenCalled();
  });

  it('preserves a required-field error supplied by its form', () => {
    act(() => tree.update(<PhoneInputWithCountry {...props} error="Required fixture" />));
    expect(text()).toContain('Required fixture');
  });
});
