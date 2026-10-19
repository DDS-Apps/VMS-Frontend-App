import React from 'react';
import { act, create } from 'react-test-renderer';
import { getQrAccessState, canDisplayQr, httpErrorStatus } from '@/utils/qrAccess';
import { qrPollingInterval } from '@/utils/movementPolling';
import { reconcileMovementEvents } from '@/utils/movementEventPresentation';
import { mergeVisitMovementTimeline } from '@/utils/visitMovementTimeline';
import { mapVisitDetailsToVisitorRequest, mapVisitListItemToVisitorRequest } from '@/utils/requestMappers';
import { QrAccessNotice } from '@/components/shared/QrAccessNotice';
import type { VisitMovementEvent } from '@/types/api.types';

let mockRTL = false;
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: mockRTL }) }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));

const meeting = {
  visitDate: '2026-10-16', visitTime: '12:00', endTime: '13:00', timezone: 'Asia/Riyadh',
  isExpired: false, qrExpiresAt: '2026-10-16T18:00:00Z', qrCode: 'fixture-qr', status: 'completed',
  movementHistory: { qrValidity: { retainedUntilCheckout: true } },
};
const at = (time: string) => Date.parse(`2026-10-16T${time}:00Z`);
const event = (id: string, occurredAt: string, extra = {}): VisitMovementEvent => ({
  id, occurredAt, recordedAt: '2026-10-16T09:00:00Z', requestId: 'v1', eventType: 'checked_in',
  source: 'reader', actor: null, gate: null, timestampBasis: 'occurred_at', ...extra,
});

describe('backend-owned QR presentation', () => {
  it.each(['en', 'ar'])('hides only the pre-activation notice when requested (%s)', language => {
    mockRTL = language === 'ar';
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<QrAccessNotice source={meeting} now={at('07:30')} hideNotActive />); });
    expect(tree!.toJSON()).toBeNull();
    expect(getQrAccessState(meeting, at('07:30'))).toBe('notActive');
    expect(canDisplayQr(meeting, at('07:30'))).toBe(true);
    act(() => tree!.update(<QrAccessNotice source={meeting} now={at('07:30')} />));
    expect(tree!.root.findByProps({ testID: 'qr-access-notActive' })).toBeTruthy();
    act(() => tree!.update(<QrAccessNotice source={{ ...meeting, isExpired: true }} now={at('07:30')} hideNotActive />));
    expect(tree!.root.findByProps({ testID: 'qr-access-expired' })).toBeTruthy();
    act(() => tree!.update(<QrAccessNotice source={meeting} now={at('10:30')} hideNotActive />));
    expect(tree!.root.findByProps({ testID: 'qr-access-retained' })).toBeTruthy();
    act(() => tree!.unmount());
  });
  it.each([undefined, null, '', '   '])('never claims validity for an unissued QR (%s)', qrCode => {
    const source = { ...meeting, status: 'pending', qrCode };
    expect(getQrAccessState(source, at('09:30'))).toBe('unissued');
    expect(getQrAccessState(source, at('10:30'))).toBe('unissued');
    expect(canDisplayQr(source, at('09:30'))).toBe(false);
    expect(getQrAccessState({ ...source, isExpired: true }, at('09:30'))).toBe('expired');
    expect(getQrAccessState({ ...source, accessReadUnavailable: true }, at('09:30'))).toBe('unavailable');
    expect(getQrAccessState({ ...source, qrValidity: { expired: true, revocationPending: true },
      movementHistory: undefined }, at('09:30'))).toBe('revocationPending');
  });
  it.each(['en', 'ar'])('renders unissued QR text and updates when a QR is issued (%s)', language => {
    mockRTL = language === 'ar';
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<QrAccessNotice source={{ ...meeting, qrCode: undefined }} now={at('09:30')} />); });
    expect(JSON.stringify(tree!.toJSON())).toContain(mockRTL ? 'لم يتم إصدار رمز QR بعد' : 'QR not issued yet');
    expect(tree!.root.findByProps({ testID: 'qr-access-unissued' })).toBeTruthy();
    act(() => tree!.update(<QrAccessNotice source={meeting} now={at('09:30')} />));
    expect(tree!.root.findByProps({ testID: 'qr-access-valid' })).toBeTruthy();
    act(() => tree!.unmount());
  });
  it('consumes the confirmed nested validity shape without list expiry fields', () => {
    const source = { ...meeting, isExpired: undefined, qrExpiresAt: undefined,
      movementHistory: { qrValidity: { expiresAt: '2026-10-16T18:00:00.000Z',
        retainedUntilCheckout: true, terminal: false, revocationPending: false, expired: false } } };
    expect(getQrAccessState(source, at('09:30'))).toBe('valid');
    expect(getQrAccessState(source, at('10:30'))).toBe('retained');
    expect(getQrAccessState(source, at('07:30'))).toBe('notActive');
    expect(getQrAccessState(source, at('18:00'))).toBe('unavailable');
  });
  it.each(['en', 'ar'])('renders pending revocation without a usable QR (%s)', language => {
    mockRTL = language === 'ar';
    const source = { ...meeting, movementHistory: { qrValidity: {
      expiresAt: '2026-10-16T10:00:00.000Z', retainedUntilCheckout: false,
      terminal: true, revocationPending: true, expired: true,
    } } };
    expect(getQrAccessState(source, at('10:30'))).toBe('revocationPending');
    expect(canDisplayQr(source, at('10:30'))).toBe(false);
    expect(qrPollingInterval(source)).toBe(60_000);
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<QrAccessNotice source={source} now={at('10:30')} />); });
    expect(JSON.stringify(tree!.toJSON())).toContain(mockRTL ? 'إلغاء الوصول قيد التنفيذ' : 'Revocation pending');
    act(() => tree!.unmount());
    const settled = { ...source, movementHistory: { qrValidity: { ...source.movementHistory.qrValidity, revocationPending: false } } };
    expect(getQrAccessState(settled, at('10:30'))).toBe('expired');
    expect(qrPollingInterval(settled)).toBe(false);
  });
  it.each([
    ['07:59', 'notActive'], ['08:00', 'valid'], ['09:59', 'valid'],
    ['10:00', 'retained'], ['17:59', 'retained'], ['18:00', 'unavailable'],
  ])('at %s UTC shows %s without using completed status as expiry', (time, expected) => {
    expect(getQrAccessState(meeting, at(time))).toBe(expected);
  });
  it('uses backend expiry before and after meeting end', () => {
    for (const time of ['08:30', '10:30']) {
      expect(getQrAccessState({ ...meeting, isExpired: true }, at(time))).toBe('expired');
      expect(canDisplayQr({ ...meeting, isExpired: true }, at(time))).toBe(false);
    }
  });
  it('does not invent retention, activation, or expiry for missing/invalid fields', () => {
    expect(getQrAccessState({ ...meeting, movementHistory: undefined }, at('10:30'))).toBe('valid');
    expect(getQrAccessState({ ...meeting, visitTime: undefined }, at('10:30'))).toBe('unavailable');
    expect(getQrAccessState({ ...meeting, visitDate: '2026-02-30' }, at('10:30'))).toBe('unavailable');
    expect(getQrAccessState({ ...meeting, timezone: 'invalid-zone' }, at('10:30'))).toBe('unavailable');
    expect(getQrAccessState({ ...meeting, visitTime: '27:00' }, at('10:30'))).toBe('unavailable');
    expect(getQrAccessState({ ...meeting, isExpired: undefined, qrCode: undefined }, at('10:30'))).toBe('unissued');
  });
  it('supports absolute starts and public invitation expiresAt, independently of device zone', () => {
    expect(getQrAccessState({ ...meeting, qrExpiresAt: undefined, expiresAt: meeting.qrExpiresAt, isExpired: undefined,
      visitStartAt: '2026-10-16T12:00:00+03:00', visitTime: undefined }, at('10:30'))).toBe('retained');
    expect(getQrAccessState({ ...meeting, visitTime: '12:00 PM', endTime: '1:00 PM' }, at('10:30'))).toBe('retained');
  });
  it('warns on invalid schedule and never treats unknown revocation keys as permission', () => {
    expect(getQrAccessState({ ...meeting, scheduleWarning: 'invalid_legacy_schedule' }, at('10:30'))).toBe('invalidSchedule');
    expect(canDisplayQr({ ...meeting, scheduleWarning: 'invalid_legacy_schedule' }, at('10:30'))).toBe(false);
    expect(getQrAccessState({ qrCode: 'fixture-qr', visitDate: meeting.visitDate, visitTime: meeting.visitTime,
      qrValidity: { undocumented: true } }, at('10:30'))).toBe('unavailable');
  });
  it.each(['en', 'ar'])('renders localized retention and schedule warning (%s)', language => {
    mockRTL = language === 'ar';
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<QrAccessNotice source={meeting} now={at('10:30')} />); });
    expect(JSON.stringify(tree!.toJSON())).toContain(mockRTL ? 'صالح حتى تسجيل الخروج' : 'Valid until checkout or 9 PM.');
    act(() => { tree!.update(<QrAccessNotice source={{ ...meeting, scheduleWarning: 'invalid_legacy_schedule' }} now={at('10:30')} />); });
    expect(JSON.stringify(tree!.toJSON())).toContain(mockRTL ? 'جدول زيارة غير صالح' : 'Invalid schedule');
    act(() => tree!.unmount());
  });
  it('preserves false/null and warnings in both host adapters', () => {
    const data: any = { ...meeting, id: 'v1', visitor: { fullName: 'Fixture' }, approval: {},
      qrExpiresAt: null, scheduleWarning: 'invalid_legacy_schedule' };
    for (const map of [mapVisitDetailsToVisitorRequest, mapVisitListItemToVisitorRequest]) {
      const mapped = map(data);
      expect(mapped.isExpired).toBe(false);
      expect(mapped.qrExpiresAt).toBeNull();
      expect(mapped.scheduleWarning).toBe('invalid_legacy_schedule');
    }
  });
  it('uses HTTP response status and stops polling terminal/error states', () => {
    expect(httpErrorStatus({ response: { status: 410 } })).toBe(410);
    expect(httpErrorStatus({ status: 403 })).toBe(403);
    expect(qrPollingInterval(meeting)).toBe(60_000);
    expect(qrPollingInterval({ ...meeting, isExpired: true })).toBe(false);
    expect(qrPollingInterval(meeting, { response: { status: 403 } })).toBe(false);
    expect(qrPollingInterval(meeting, new Error('offline'))).toBe(false);
  });
});

describe('corrected reader movements', () => {
  it('shows parking-only arrival without inventing a reception check-in placeholder', () => {
    const steps = mergeVisitMovementTimeline([
      { id: 'completed', label: 'Completed', icon: 'check-circle', status: 'pending' },
    ], { requestId: 'v1', timezone: 'Asia/Riyadh',
      data: [event('parking', '2026-10-16T09:00:00Z', { movementBoundary: 'parking', displayLabel: 'Parking arrival' })],
    }, key => key);
    expect(steps.map(step => step.id)).toEqual(['movement-parking']);
  });
  it('replaces a provisional row by stable ID while preserving response order', () => {
    const provisional = event('same', '2026-10-16T09:30:00Z');
    const corrected = event('same', '2026-10-16T08:00:00Z', { recordedAt: '2026-10-16T10:30:00Z' });
    const middle = event('other', '2026-10-16T09:00:00Z');
    expect(reconcileMovementEvents([provisional, middle, corrected])).toEqual([corrected, middle]);
    expect(reconcileMovementEvents([corrected, provisional])).toEqual([corrected]);
  });
  it.each([
    ['Parking arrival', 'arrival_recorded', 'parkingArrival'],
    ['Reception check-in', 'reentry_allowed_before_meeting_end', 'receptionCheckIn'],
    ['Reception checkout', 'expired_on_checkout', 'receptionCheckout'],
    ['Administrative completion', 'visit_closed_not_physical_departure', 'administrativeCompletion'],
    ['Visit completed — not a physical checkout', 'visit_closed_not_physical_departure', 'administrativeCompletion'],
    ['Custom label', 'invalid_schedule_access_denied', null],
  ])('preserves %s and its effect', (displayLabel, qrEffect, key) => {
    const result = mergeVisitMovementTimeline([], {
      requestId: 'v1', timezone: 'Asia/Riyadh',
      data: [event('one', '2026-10-16T09:00:00Z', { displayLabel, qrEffect })],
    }, key => key);
    expect(result[0].label).toBe(key ? `movementHistory.${key}` : displayLabel);
    expect(result[0].metadata).toContain(`movementHistory.${qrEffect}`);
  });
});
