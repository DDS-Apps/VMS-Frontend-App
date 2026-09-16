import {
  DUPLICATE_CHECK_MIN_PHONE_DIGITS,
  buildDuplicateCheckParams,
  duplicateCheckParamsKey,
  isCheckableEmail,
  isCheckablePhone,
  isDuplicateCheckPending,
} from '@/utils/duplicateCheckParams';

const BASE = { isWalkIn: false, date: '2026-09-15', email: '', phone: '' };

describe('buildDuplicateCheckParams', () => {
  it('waits until the email has a local part, an @ and a dotted domain', () => {
    const partials = ['j', 'john', 'john@', 'john@example', 'john@example.', '@example.com', 'john @example.com'];
    for (const email of partials) {
      expect(isCheckableEmail(email)).toBe(false);
      expect(buildDuplicateCheckParams({ ...BASE, email })).toBeUndefined();
    }

    expect(buildDuplicateCheckParams({ ...BASE, email: ' john@example.com ' })).toEqual({
      date: '2026-09-15',
      email: 'john@example.com',
    });
  });

  it(`waits until the phone carries at least ${DUPLICATE_CHECK_MIN_PHONE_DIGITS} digits`, () => {
    expect(isCheckablePhone('+966')).toBe(false);
    expect(isCheckablePhone('+966 5')).toBe(false);
    expect(isCheckablePhone('+966 501')).toBe(false); // 6 digits
    expect(buildDuplicateCheckParams({ ...BASE, phone: '+966 501' })).toBeUndefined();

    expect(isCheckablePhone('+966 5012')).toBe(true); // 7 digits
    expect(buildDuplicateCheckParams({ ...BASE, phone: '+966 50 123 4567' })).toEqual({
      date: '2026-09-15',
      phone: '+966 50 123 4567',
    });
  });

  it('only forwards the fields that are complete', () => {
    expect(
      buildDuplicateCheckParams({ ...BASE, email: 'john@exa', phone: '+966 50 123 4567' }),
    ).toEqual({ date: '2026-09-15', phone: '+966 50 123 4567' });

    expect(
      buildDuplicateCheckParams({ ...BASE, email: 'john@example.com', phone: '+966 5' }),
    ).toEqual({ date: '2026-09-15', email: 'john@example.com' });

    expect(
      buildDuplicateCheckParams({ ...BASE, email: 'john@example.com', phone: '+966 50 123 4567' }),
    ).toEqual({ date: '2026-09-15', email: 'john@example.com', phone: '+966 50 123 4567' });
  });

  it('never checks walk-ins or a form without a date', () => {
    expect(
      buildDuplicateCheckParams({ ...BASE, isWalkIn: true, email: 'john@example.com', phone: '+966 50 123 4567' }),
    ).toBeUndefined();
    expect(buildDuplicateCheckParams({ ...BASE, date: undefined, email: 'john@example.com' })).toBeUndefined();
  });
});

describe('isDuplicateCheckPending', () => {
  const settled = buildDuplicateCheckParams({ ...BASE, email: 'john@example.com' });

  it('is pending only while the latest complete value differs from the debounced one', () => {
    // Still typing an incomplete address: nothing new is owed to the server.
    expect(isDuplicateCheckPending(undefined, undefined)).toBe(false);
    // Latest value became checkable but the debounced copy has not caught up.
    expect(isDuplicateCheckPending(settled, undefined)).toBe(true);
    // Debounced copy caught up.
    expect(isDuplicateCheckPending(settled, buildDuplicateCheckParams({ ...BASE, email: 'john@example.com' }))).toBe(
      false,
    );
    // User edited the address again after a check ran.
    expect(isDuplicateCheckPending(buildDuplicateCheckParams({ ...BASE, email: 'jane@example.com' }), settled)).toBe(
      true,
    );
    // Cleared the field: the previous answer no longer applies.
    expect(isDuplicateCheckPending(undefined, settled)).toBe(true);
  });

  it('keys params by every field the server receives', () => {
    expect(duplicateCheckParamsKey(undefined)).toBe('');
    expect(duplicateCheckParamsKey({ date: '2026-09-15', email: 'a@b.co' })).not.toBe(
      duplicateCheckParamsKey({ date: '2026-09-16', email: 'a@b.co' }),
    );
    expect(duplicateCheckParamsKey({ date: '2026-09-15', phone: '+966501234567' })).not.toBe(
      duplicateCheckParamsKey({ date: '2026-09-15', email: '+966501234567' }),
    );
  });
});
