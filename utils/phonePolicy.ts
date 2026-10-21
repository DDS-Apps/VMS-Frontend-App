import { parsePhoneWithCountry } from '@/constants/countryData';

/** Application policy: nine national digits for every selected country. */
export const NATIONAL_PHONE_FORMAT = 'XX XXX XXXX';

export function normalizePhoneDigits(value: string): string {
  return value.replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) - 0x06f0));
}

export function isValidNationalPhone(value: string): boolean {
  return /^[1-9][0-9]{8}$/.test(value);
}

/** Validate the national portion, never counting the country calling code. */
export function validatePhone(value: string): boolean {
  const normalized = normalizePhoneDigits(value).trim();
  if (!/^\+?[\d\s()-]+$/.test(normalized)) return false;
  const compact = normalized.replace(/[\s()-]/g, '');
  // Support national-only legacy values as well as international API values.
  if (!compact.startsWith('+') && isValidNationalPhone(compact)) return true;
  const parsed = parsePhoneWithCountry(compact.startsWith('+') ? compact : `+${compact}`);
  return !!parsed && isValidNationalPhone(parsed.nationalNumber);
}
