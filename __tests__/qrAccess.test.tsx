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
    expect(getQrAccessState({ ...meeting, isExpired: undefined, qrCode: undefined }, at('10:30'))).toBe('unavailable');
  });
  it('supports absolute starts and public invitation expiresAt, independently of device zone', () => {
    expect(getQrAccessState({ ...meeting, qrExpiresAt: undefined, expiresAt: meeting.qrExpiresAt, isExpired: undefined,
      visitStartAt: '2026-10-16T12:00:00+03:00', visitTime: undefined }, at('10:30'))).toBe('retained');
    expect(getQrAccessState({ ...meeting, visitTime: '12:00 PM', endTime: '1:00 PM' }, at('10:30'))).toBe('retained');
  });
  it('warns on invalid schedule and never treats unknown revocation keys as permission', () => {
    expect(getQrAccessState({ ...meeting, scheduleWarning: 'invalid_legacy_schedule' }, at('10:30'))).toBe('invalidSchedule');
    expect(canDisplayQr({ ...meeting, scheduleWarning: 'invalid_legacy_schedule' }, at('10:30'))).toBe(false);
    expect(getQrAccessState({ visitDate: meeting.visitDate, visitTime: meeting.visitTime,
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
  it('replaces a provisional row by stable ID and sorts by corrected time', () => {
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
