import {
  localizeNotification,
  removeValetVehicleInfo,
} from '@/utils/notificationLocalization';

describe('valet new-request localization', () => {
  it.each([
    ['en' as const, 'New Valet Request', 'New valet request for Nora'],
    ['ar' as const, 'طلب صف سيارات جديد', 'طلب صف سيارات جديد لـ نورة'],
  ])('localizes without vehicle information in %s', (locale, title, message) => {
    expect(localizeNotification('valet_new_request', { visitorName: locale === 'en' ? 'Nora' : 'نورة' }, locale))
      .toEqual({ title, message });
  });

  it('never leaks unresolved template variables', () => {
    const localized = localizeNotification('valet_new_request', {}, 'en');
    expect(localized.message).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it('sanitizes legacy foreground payloads', () => {
    expect(removeValetVehicleInfo(
      'valet_new_request',
      'New valet request for Nora — {{vehicleInfo}}'
    )).toBe('New valet request for Nora');
  });
});