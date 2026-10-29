import {
  localizeNotification,
  sanitizeParkingNotificationMessage,
} from './notificationLocalization';

describe('parking notification localization', () => {
  it.each([
    ['en', 'Parking Required', 'Parking Not Required'],
    ['ar', 'موقف مطلوب', 'لا يُشترط موقف'],
  ] as const)('uses only localized parking states in %s', (locale, required, notRequired) => {
    expect(
      localizeNotification(
        'parking_assigned',
        { spotNumber: 'B1-45', visitorName: 'Aisha' },
        locale,
        'Parking assigned: B1-45',
        'Parking spot B1-45 assigned for Aisha',
      ),
    ).toEqual({ title: required, message: required });

    expect(
      localizeNotification(
        'PARKING_FULL',
        { visitorName: 'Aisha' },
        locale,
        'Parking full at Level 2',
        'Parking full at Level 2',
      ),
    ).toEqual({ title: notRequired, message: notRequired });
  });

  it('sanitizes legacy parking allocation text before it reaches a toast', () => {
    expect(
      sanitizeParkingNotificationMessage(
        'parking-assigned',
        'Parking spot B1-45 assigned for a silver sedan (ABC-1234)',
        'en',
      ),
    ).toBe('Parking Required');
  });

  it('preserves valet notification behavior', () => {
    expect(
      sanitizeParkingNotificationMessage('valet_new_request', 'New valet request for Aisha', 'en'),
    ).toBe('New valet request for Aisha');
  });
});

describe('upcoming visit notification localization', () => {
  it.each([
    ['UpcomingVisit', 'Guest One', '15', '3:08 PM', '3:08 م'],
    ['UPCOMING_VISIT', 'Guest Two', '2', '2:15 PM', '2:15 م'],
    ['upcoming_visit', 'ضيف', '1', '9:05 AM', '9:05 ص'],
  ])('translates the persisted English %s reminder into Arabic', (type, name, minutes, time, arabicTime) => {
    expect(localizeNotification(
      type, undefined, 'ar', 'Upcoming Visit',
      `${name} is arriving in ~${minutes} minutes at ${time}`,
    )).toEqual({
      title: 'زيارة قادمة',
      message: `${name} سيصل خلال ${minutes} دقيقة تقريباً في ${arabicTime}`,
    });
  });

  it('keeps the backend minute value instead of assuming the 15-minute default', () => {
    expect(localizeNotification(
      'upcoming_visit', { visitorName: 'Guest', visitTime: '1:02 PM' },
      'ar', 'Upcoming Visit', 'Guest is arriving in ~7 minutes at 1:02 PM',
    ).message).toBe('Guest سيصل خلال 7 دقيقة تقريباً في 1:02 م');
  });

  it('uses structured name/time when available without inventing minutes', () => {
    expect(localizeNotification(
      'upcoming_visit', { visitorName: 'Guest', visitTime: '9:05 AM' },
      'ar', 'Upcoming Visit',
    )).toEqual({ title: 'زيارة قادمة', message: 'Guest سيصل في 9:05 ص' });
  });

  it('does not change English notification content', () => {
    const body = 'Guest is arriving in ~2 minutes at 2:15 PM';
    expect(localizeNotification('upcoming_visit', undefined, 'en', 'Upcoming Visit', body))
      .toEqual({ title: 'Upcoming Visit', message: body });
  });

  it('preserves an already Arabic message without details being lost', () => {
    const body = 'سيصل الضيف خلال دقيقتين';
    expect(localizeNotification('upcoming_visit', undefined, 'ar', 'زيارة قادمة', body))
      .toEqual({ title: 'زيارة قادمة', message: body });
  });

  it('does not invent missing details or translate an unrelated notification', () => {
    expect(localizeNotification('upcoming_visit', undefined, 'ar'))
      .toEqual({ title: 'زيارة قادمة', message: 'زيارة قادمة' });
    expect(localizeNotification('unknown_event', undefined, 'ar', 'Original', 'Original body'))
      .toEqual({ title: 'Original', message: 'Original body' });
  });

  it('keeps other known Arabic translations unchanged', () => {
    expect(localizeNotification('visitor_accepted', { visitorName: 'Guest' }, 'ar'))
      .toEqual({ title: 'تم قبول الدعوة', message: 'Guest قبل دعوة الزيارة' });
  });
});