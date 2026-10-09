import { newPasswordPolicyError, passwordUtf8Bytes } from '@/utils/newPasswordPolicy';

describe('new-password UTF-8 policy', () => {
  it.each(['ascii', 'كلمة المرور', '🙂', 'e\u0301', '\ud800', '\udc00', ' spaces '])('matches UTF-8 byte encoding', value => {
    expect(passwordUtf8Bytes(value)).toBe(Buffer.byteLength(value, 'utf8'));
  });
  it.each(['', '        ', '\t\n        '])('rejects blank-only values', value => {
    expect(newPasswordPolicyError(value)).toBe('form.required');
  });
  it.each(['123456', '1234567'])('rejects fewer than eight characters', value => {
    expect(newPasswordPolicyError(value)).toBe('auth.newPasswordMinLength');
  });
  it.each(['12345678', 'a'.repeat(72), 'ع'.repeat(36), '🙂'.repeat(18), ' spaced '])('accepts within policy without trimming', value => {
    expect(newPasswordPolicyError(value)).toBeUndefined();
  });
  it.each(['a'.repeat(73), 'ع'.repeat(37), '🙂'.repeat(19), ' '.repeat(72) + 'a'])('rejects more than 72 bytes including whitespace', value => {
    expect(newPasswordPolicyError(value)).toBe('auth.passwordMaxBytes');
  });
});
