/** Count UTF-8 bytes without relying on TextEncoder being available on native.
 * Lone surrogates count as the three-byte replacement character, as in UTF-8.
 */
export function passwordUtf8Bytes(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

/** Validate without normalizing or trimming the submitted password. */
export function newPasswordPolicyError(value: string) {
  if (!value.trim()) return 'form.required' as const;
  if (value.length < 8) return 'auth.newPasswordMinLength' as const;
  if (passwordUtf8Bytes(value) > 72) return 'auth.passwordMaxBytes' as const;
  return undefined;
}
