import { toArabicNumerals } from '@/utils/formatters';

export function isValidTime(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

export function formatTime12(value: Date, isRTL = false): string {
  if (!isValidTime(value)) return '';
  const hour = value.getHours();
  const clock = `${hour % 12 || 12}:${String(value.getMinutes()).padStart(2, '0')}`;
  return `${isRTL ? toArabicNumerals(clock) : clock} ${hour < 12 ? (isRTL ? 'ص' : 'AM') : (isRTL ? 'م' : 'PM')}`;
}

/** Parse explicit 12-hour input without browser-dependent Date string parsing. */
export function parseTime12(input: string, reference: Date): Date | null {
  if (!isValidTime(reference)) return null;
  const normalized = input
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .trim();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|ص|م)$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const pm = /^(pm|م)$/i.test(match[3]);
  const hours = hour % 12 + (pm ? 12 : 0);
  const result = new Date(reference.getTime());
  result.setHours(hours, minute, 0, 0);
  return result.getHours() === hours && result.getMinutes() === minute ? result : null;
}

export function timeOptions(reference: Date, interval: number): Date[] {
  if (!isValidTime(reference) || interval < 1 || !Number.isInteger(interval)) return [];
  return Array.from({ length: Math.ceil(1440 / interval) }, (_, index) => {
    const time = new Date(reference.getTime());
    const minutes = index * interval;
    time.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return time;
  });
}
