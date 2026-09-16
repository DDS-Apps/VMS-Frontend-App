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