import {
  compareRequestsNewestFirst,
  formatAllRequestsDuration,
  formatAllRequestsScheduledTime,
  getStatusFilterForRequestType,
  shouldShowAllRequestsStatusFilters,
} from './allRequestsPresentation';

describe('Admin All Requests presentation rules', () => {
  it('shows status filters only for All Visitors', () => {
    expect(shouldShowAllRequestsStatusFilters('visitor')).toBe(true);
    expect(shouldShowAllRequestsStatusFilters('buffet')).toBe(false);
    expect(shouldShowAllRequestsStatusFilters('valet')).toBe(false);
  });

  it('clears a stale status when switching to Buffet or Valet', () => {
    expect(getStatusFilterForRequestType('buffet', 'checked_in')).toBe('all');
    expect(getStatusFilterForRequestType('valet', 'rejected')).toBe('all');
    expect(getStatusFilterForRequestType('visitor', 'approved')).toBe('approved');
  });

  it('orders requests by newest creation timestamp', () => {
    const requests = [
      { id: 'older', createdAt: '2026-09-01T08:00:00Z' },
      { id: 'newer', createdAt: '2026-09-02T08:00:00Z' },
    ];
    expect(requests.sort(compareRequestsNewestFirst).map(request => request.id)).toEqual(['newer', 'older']);
  });

  it('falls back to visit schedule and then id for stable ordering', () => {
    const requests = [
      { id: 'b', createdAt: '', date: '2026-09-01', time: '09:00' },
      { id: 'latest', createdAt: 'invalid', date: '2026-09-02', time: '09:00' },
      { id: 'a', createdAt: '', date: '', time: '' },
      { id: 'c', createdAt: '', date: '', time: '' },
    ];
    expect(requests.sort(compareRequestsNewestFirst).map(request => request.id)).toEqual([
      'latest',
      'b',
      'a',
      'c',
    ]);
  });

  it('formats ISO and plain durations with localized units and numerals', () => {
    const english = (key: string) => ({
      'time.hour': 'hour',
      'time.hours': 'hours',
      'time.minute': 'minute',
      'time.minutes': 'minutes',
    }[key] || key);
    const arabic = (key: string) => ({
      'time.hour': 'ساعة',
      'time.hours': 'ساعات',
      'time.minute': 'دقيقة',
      'time.minutes': 'دقائق',
    }[key] || key);
    const western = (value: string) => value;
    const easternArabic = (value: string) => value.replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

    expect(formatAllRequestsDuration('PT1H30M', english, western)).toBe('1 hour 30 minutes');
    expect(formatAllRequestsDuration('PT2H', arabic, easternArabic)).toBe('٢ ساعات');
    expect(formatAllRequestsDuration('45 minutes', english, western)).toBe('45 minutes');
    expect(formatAllRequestsDuration('1 hour 30 minutes', english, western)).toBe('1 hour 30 minutes');
    expect(formatAllRequestsDuration('1 hour 30 minutes', arabic, easternArabic)).toBe('١ ساعة ٣٠ دقائق');
  });

  it('formats complete and partial scheduled times without blank values', () => {
    const formatTime = (value: string) => `[${value}]`;
    expect(formatAllRequestsScheduledTime('09:00', '10:30', formatTime, 'to')).toBe('[09:00] to [10:30]');
    expect(formatAllRequestsScheduledTime('09:00', undefined, formatTime, 'to')).toBe('[09:00]');
    expect(formatAllRequestsScheduledTime(undefined, '10:30', formatTime, 'to')).toBe('[10:30]');
    expect(formatAllRequestsScheduledTime(undefined, undefined, formatTime, 'to')).toBeNull();
  });
});