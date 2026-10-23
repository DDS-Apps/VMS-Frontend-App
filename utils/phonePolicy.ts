import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';
import metadata from 'libphonenumber-js/metadata.max.json';
import { DEFAULT_COUNTRY_CODE, getCountryByCode, parsePhoneWithCountry } from '@/constants/countryData';

type PhoneRules = { maxLength: number; rejectLeadingZero: boolean };
const countryRules = new Map<string, PhoneRules>();

/** Numbering-plan lengths, excluding any area prefix already in the country picker. */
export function getNationalPhoneRules(countryCode = DEFAULT_COUNTRY_CODE): PhoneRules | undefined {
  const cached = countryRules.get(countryCode);
  if (cached) return cached;
  const country = getCountryByCode(countryCode);
  // The library's versioned metadata schema stores possible lengths at index 3
  // and the domestic trunk prefix at index 5. Keep these details in this adapter.
  const data = metadata.countries[countryCode as CountryCode];
  if (!country || !data) return undefined;
  const callingCode = getCountryCallingCode(countryCode as CountryCode);
  const embeddedPrefixLength = country.dialCode.length - 1 - callingCode.length;
  const lengths = (data[3] as number[])
    .map(length => length - embeddedPrefixLength)
    .filter(length => length > 0 && length <= 15 - (country.dialCode.length - 1));
  const rules = {
    maxLength: countryCode === 'SA' ? 9 : Math.max(...lengths),
    rejectLeadingZero: data[5] === '0',
  };
  countryRules.set(countryCode, rules);
  return rules;
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) - 0x06f0));
}

export function isValidNationalPhone(value: string, countryCode = DEFAULT_COUNTRY_CODE): boolean {
  const country = getCountryByCode(countryCode);
  if (!country || !isAllowedNationalPhoneDraft(value, countryCode) || !value) return false;
  const international = `${country.dialCode}${value}`;
  const parsed = parsePhoneNumberFromString(international, { extract: false });
  // Parsing can remove a domestic trunk zero. Never silently validate a different
  // number from the one the form will actually send to the backend.
  return !!parsed && parsed.number === international && parsed.isValid();
}

/** Empty and partial national numbers are editable; invalid edits are not. */
export function isAllowedNationalPhoneDraft(value: string, countryCode = DEFAULT_COUNTRY_CODE): boolean {
  const rules = getNationalPhoneRules(countryCode);
  return !!rules && /^\d*$/.test(value) && value.length <= rules.maxLength
    && !(rules.rejectLeadingZero && value.startsWith('0'));
}

/** Validate the national portion, never counting the country calling code. */
export function validatePhone(value: string, countryCode = DEFAULT_COUNTRY_CODE): boolean {
  const normalized = normalizePhoneDigits(value).trim();
  if (!/^\+?[\d\s()-]+$/.test(normalized)) return false;
  const compact = normalized.replace(/[\s()-]/g, '');
  // Support national-only legacy values as well as international API values.
  if (!compact.startsWith('+') && isValidNationalPhone(compact, countryCode)) return true;
  const parsed = parsePhoneWithCountry(compact.startsWith('+') ? compact : `+${compact}`);
  return !!parsed && isValidNationalPhone(parsed.nationalNumber, parsed.country.code);
}
