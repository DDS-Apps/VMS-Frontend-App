import { formatTime12, isValidTime, parseTime12, timeOptions } from '@/utils/timeInput';

const reference = new Date(2026, 9, 19, 9, 7, 12);

describe('12-hour time input', () => {
  it.each([
    ['12:00 AM', 0, 0], ['12:00 PM', 12, 0], ['2:30 PM', 14, 30],
    ['9 am', 9, 0], ['11:59 pm', 23, 59], ['٢:٣٠ م', 14, 30], ['۹:۰۷ AM', 9, 7],
  ])('parses %s without replacing the calendar date', (text, hour, minute) => {
    const parsed = parseTime12(text as string, reference)!;
    expect(parsed.getHours()).toBe(hour);
    expect(parsed.getMinutes()).toBe(minute);
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toEqual([2026, 9, 19]);
    expect(parsed).not.toBe(reference);
    expect(reference.getHours()).toBe(9);
  });

  it.each(['14:30', '00:30 AM', '13:00 PM', '2:60 PM', '9:07', '', '2:3 PM', 'tomorrow', '24:00'])(
    'rejects invalid or 24-hour input %s', text => expect(parseTime12(text, reference)).toBeNull(),
  );

  it('formats noon, midnight, English and Arabic consistently', () => {
    expect(formatTime12(new Date(2026, 9, 19, 14, 30))).toBe('2:30 PM');
    expect(formatTime12(new Date(2026, 9, 19, 14, 30), true)).toBe('٢:٣٠ م');
    expect(formatTime12(new Date(2026, 9, 19, 0, 0))).toBe('12:00 AM');
    expect(formatTime12(new Date(2026, 9, 19, 12, 0))).toBe('12:00 PM');
  });

  it('makes suggestions with each caller interval without rounding custom input', () => {
    expect(timeOptions(reference, 5)).toHaveLength(288);
    expect(timeOptions(reference, 15)).toHaveLength(96);
    expect(parseTime12('9:07 AM', reference)?.getMinutes()).toBe(7);
    expect(timeOptions(reference, 15)[95].getHours()).toBe(23);
    expect(timeOptions(reference, 15)[95].getMinutes()).toBe(45);
  });

  it('rejects invalid initial dates explicitly', () => {
    const invalid = new Date(NaN);
    expect(isValidTime(invalid)).toBe(false);
    expect(formatTime12(invalid)).toBe('');
    expect(parseTime12('2:30 PM', invalid)).toBeNull();
    expect(timeOptions(invalid, 5)).toEqual([]);
  });
});
