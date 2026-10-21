import { COUNTRIES } from '@/constants/countryData';
import { getTranslation } from '@/constants/i18n';
import { validatePhone } from '@/utils/validation';
import { isValidNationalPhone, normalizePhoneDigits } from '@/utils/phonePolicy';

describe('application phone policy', () => {
  it.each(COUNTRIES)('requires nine national digits for $code ($dialCode)', country => {
    expect(validatePhone(`${country.dialCode}512345678`)).toBe(true);
    expect(validatePhone(`${country.dialCode}012345678`)).toBe(false);
    expect(validatePhone(`${country.dialCode}51234567`)).toBe(false);
    expect(validatePhone(`${country.dialCode}5123456789`)).toBe(false);
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
