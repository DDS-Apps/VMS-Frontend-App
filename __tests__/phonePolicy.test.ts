import { COUNTRIES } from '@/constants/countryData';
import { getExampleNumber, type CountryCode } from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';
import { getTranslation } from '@/constants/i18n';
import { validatePhone } from '@/utils/validation';
import { getNationalPhoneRules, isAllowedNationalPhoneDraft, isValidNationalPhone, normalizePhoneDigits } from '@/utils/phonePolicy';

describe('application phone policy', () => {
  it.each(['', '5', '51', '51234567', '512345678'])('allows the editable national draft %s', value => {
    expect(isAllowedNationalPhoneDraft(value)).toBe(true);
  });
  it.each(['0', '012345678', '5123456789', '51 234 5678', '+966512345678'])('blocks the invalid national draft %s', value => {
    expect(isAllowedNationalPhoneDraft(value)).toBe(false);
  });
  it.each(COUNTRIES)('supports the numbering plan and mobile example for $code ($dialCode)', country => {
    const rules = getNationalPhoneRules(country.code);
    expect(rules).toBeDefined();
    expect(rules!.maxLength).toBeGreaterThan(0);
    expect(rules!.maxLength + country.dialCode.length - 1).toBeLessThanOrEqual(15);
    const example = getExampleNumber(country.code as CountryCode, examples);
    expect(example).toBeDefined();
    expect(validatePhone(example!.number)).toBe(true);
    const digits = example!.number.slice(country.dialCode.length);
    expect(isAllowedNationalPhoneDraft(digits, country.code)).toBe(true);
    expect(isValidNationalPhone(digits, country.code)).toBe(true);
  });

  it.each([
    ['PK', '+923453188360', '3453188360'],
    ['KW', '+96551234567', '51234567'],
    ['US', '+12025550123', '2025550123'],
    ['GB', '+447400123456', '7400123456'],
    ['IT', '+390212345678', '0212345678'],
    ['CI', '+2250701234567', '0701234567'],
    ['DE', '+4930123456', '30123456'],
  ])('accepts country-specific lengths and significant zeroes for %s', (country, full, national) => {
    expect(validatePhone(full)).toBe(true);
    expect(isValidNationalPhone(national, country)).toBe(true);
    expect(isAllowedNationalPhoneDraft(national, country)).toBe(true);
  });

  it.each(['+92345318836', '+9234531883600', '+9203453188360', '+4420740000000',
    '+1202555012', '+965512345678'])('rejects incorrect lengths or domestic trunk prefixes: %s', value => {
    expect(validatePhone(value)).toBe(false);
  });

  it('rejects overlong drafts for the selected country without truncating them', () => {
    expect(isAllowedNationalPhoneDraft('512345678', 'KW')).toBe(false);
    expect(isAllowedNationalPhoneDraft('20255501234', 'US')).toBe(false);
    expect(isAllowedNationalPhoneDraft('3453188360', 'PK')).toBe(true);
    expect(isAllowedNationalPhoneDraft('0', 'PK')).toBe(false);
    expect(isAllowedNationalPhoneDraft('0', 'IT')).toBe(true);
    expect(isValidNationalPhone('512345678', 'ZZ')).toBe(false);
  });

  it.each(['+966 51 234 5678', '+966 (51) 234-5678', '966512345678', '512345678',
    '+966٥١٢٣٤٥٦٧٨', '+966۵۱۲۳۴۵۶۷۸'])('accepts an eligible formatted value: %s', value => {
    expect(validatePhone(value)).toBe(true);
  });

  it.each(['', ' ', '+966', '+966٠١٢٣٤٥٦٧٨', '+966۰۱۲۳۴۵۶۷۸', '+999512345678',
    '+966512345678 ext 12', '+966512345678abc', '++966512345678'])('rejects %s', value => {
    expect(validatePhone(value)).toBe(false);
  });

  it('normalizes Arabic and Persian digits without removing leading zeroes', () => {
    expect(normalizePhoneDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(normalizePhoneDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(isValidNationalPhone('012345678')).toBe(false);
  });

  it.each(['en', 'ar'] as const)('preserves the existing error messages (%s)', locale => {
    const formMessage = getTranslation(locale, 'form.invalidPhone');
    expect(formMessage).toBe(getTranslation(locale, 'errors.invalidPhone'));
    expect(formMessage).toBe(locale === 'en'
      ? 'Please enter a valid phone number'
      : 'الرجاء إدخال رقم هاتف صحيح');
  });
});
