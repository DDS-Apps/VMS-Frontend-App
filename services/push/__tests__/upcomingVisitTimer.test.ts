/**
 * Absolute-time reminder boundaries. The retired device-local parser is not
 * restored solely to satisfy historical tests: reminders require backend ISO.
 */
import { parseVisitStartAt, isUpcomingVisitFromISO } from '@/hooks/useUpcomingVisitTimer';

jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Platform: { OS: 'ios' },
}));

describe('backend-provided visit start parsing', () => {
  it.each([
    ['2026-07-17T09:30:00Z', '2026-07-17T09:30:00.000Z'],
    ['2026-07-17T09:30Z', '2026-07-17T09:30:00.000Z'],
    ['2026-07-17T09:30:00.123Z', '2026-07-17T09:30:00.123Z'],
    ['2026-07-17T12:30:00+03:00', '2026-07-17T09:30:00.000Z'],
    ['2026-07-17T04:30:00-05:00', '2026-07-17T09:30:00.000Z'],
    ['2026-01-01T00:00:00Z', '2026-01-01T00:00:00.000Z'],
    ['2026-01-01T12:00:00Z', '2026-01-01T12:00:00.000Z'],
    ['2028-02-29T23:59:59Z', '2028-02-29T23:59:59.000Z'],
    ['2026-03-08T01:30:00-05:00', '2026-03-08T06:30:00.000Z'],
    ['2026-03-08T03:30:00-04:00', '2026-03-08T07:30:00.000Z'],
    ['2026-11-01T01:30:00-04:00', '2026-11-01T05:30:00.000Z'],
    ['2026-11-01T01:30:00-05:00', '2026-11-01T06:30:00.000Z'],
  ])('preserves the instant of %s', (input, expected) => {
    expect(parseVisitStartAt(input)?.toISOString()).toBe(expected);
  });

  it.each([
    undefined, null, '', ' ', 123, {}, 'not-a-date',
    '2026-07-17', '09:30', '9:30 AM', '2026-07-17T09:30:00',
    '2026-07-17 09:30:00', '2026-02-29T09:00:00Z',
    '2026-02-30T09:00:00Z', '2026-04-31T09:00:00Z',
    '2026-00-01T09:00:00Z', '2026-13-01T09:00:00Z',
    '2026-01-00T09:00:00Z', '2026-01-32T09:00:00Z',
    '2026-01-01T24:00:00Z', '2026-01-01T09:60:00Z',
    '2026-01-01T09:00:60Z', '2026-01-01T09:00:00+25:00',
    '2026-01-01T09:00:00+03:60',
  ])('rejects missing, malformed or timezone-less input: %p', input => {
    expect(parseVisitStartAt(input as string)).toBeNull();
    expect(isUpcomingVisitFromISO(input as string)).toBe(false);
  });
});

describe.each([0, 1, 5, 15, 30, 60])('reminder boundary with a %i-minute threshold', threshold => {
  const iso = '2026-10-25T10:00:00Z';
  const start = Date.parse(iso);
  it.each([-60_000, -1, 0, 1, 60_000, 899_999, 900_000, 900_001, 1_800_000, 3_600_001])(
    'evaluates %i milliseconds remaining', remaining => {
      expect(isUpcomingVisitFromISO(iso, threshold, () => start - remaining))
        .toBe(remaining > 0 && remaining <= threshold * 60_000);
    },
  );
});

describe('equivalent timezone representations', () => {
  it.each([
    '2026-10-25T10:00:00Z',
    '2026-10-25T13:00:00+03:00',
    '2026-10-25T15:00:00+05:00',
    '2026-10-25T03:00:00-07:00',
  ])('does not depend on the device timezone for %s', iso => {
    const now = () => Date.parse('2026-10-25T09:55:00Z');
    expect(isUpcomingVisitFromISO(iso, 15, now)).toBe(true);
  });
});
