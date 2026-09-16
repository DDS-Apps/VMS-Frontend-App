import { validateEmail } from '@/utils/validation';
import { normalizePhoneNumber } from '@/utils/formatters';

/** How long the guest's email/phone must stay unchanged before a duplicate check runs. */
export const DUPLICATE_CHECK_DEBOUNCE_MS = 450;

/**
 * Fewest digits a phone number needs before it is worth asking the server
 * about. Matches the lower bound of the form's own phone validation (E.164
 * allows 7-15 digits), so anything the form would accept is also checked.
 */
export const DUPLICATE_CHECK_MIN_PHONE_DIGITS = 7;

export interface DuplicateCheckParams {
  date: string;
  phone?: string;
  email?: string;
}

export interface DuplicateCheckInput {
  isWalkIn: boolean;
  /** Visit date already formatted for the API (YYYY-MM-DD), if chosen. */
  date: string | undefined;
  email: string;
  phone: string;
}

/** An email is only checked once it has a local part, an "@" and a dotted domain. */
export function isCheckableEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 0 && validateEmail(trimmed);
}

/** A phone is only checked once it carries at least a plausible number of digits. */
export function isCheckablePhone(phone: string): boolean {
  return normalizePhoneNumber(phone).length >= DUPLICATE_CHECK_MIN_PHONE_DIGITS;
}

/**
 * Builds the duplicate-visit check parameters from what the user has typed,
 * or returns undefined when there is nothing complete enough to check yet.
 * Walk-ins are never checked.
 */
export function buildDuplicateCheckParams(input: DuplicateCheckInput): DuplicateCheckParams | undefined {
  if (input.isWalkIn || !input.date) {
    return undefined;
  }

  const email = input.email.trim();
  const phone = input.phone.trim();
  const params: DuplicateCheckParams = { date: input.date };

  if (isCheckableEmail(email)) {
    params.email = email;
  }
  if (isCheckablePhone(phone)) {
    params.phone = phone;
  }

  return params.email || params.phone ? params : undefined;
}

/** Stable identity for a params object, used to tell whether a check is still pending. */
export function duplicateCheckParamsKey(params: DuplicateCheckParams | undefined): string {
  if (!params) return '';
  return `${params.date}|${params.email ?? ''}|${params.phone ?? ''}`;
}

/**
 * True while the latest typed values would produce a different check than the
 * debounced values currently driving the query, i.e. a check is still owed.
 * Callers treat this like an in-flight check so a submit cannot slip through
 * between the last keystroke and the request.
 */
export function isDuplicateCheckPending(
  latest: DuplicateCheckParams | undefined,
  debounced: DuplicateCheckParams | undefined,
): boolean {
  return duplicateCheckParamsKey(latest) !== duplicateCheckParamsKey(debounced);
}
