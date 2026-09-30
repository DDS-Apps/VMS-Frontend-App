jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: false }) }));
jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ theme: { border: '#ddd', textSecondary: '#888' } }) }));

import React from 'react';
import { act, create } from 'react-test-renderer';
import {
  formatMovementTimestamp,
  groupMovementEvents,
  MovementHistory,
} from '@/components/shared/MovementHistory';
import type { VisitMovementEvent } from '@/types/api.types';
import { ar } from '@/constants/i18n/ar';
import { en } from '@/constants/i18n/en';

function event(
  id: string,
  eventType: VisitMovementEvent['eventType'],
  departureEventId?: string | null,
): VisitMovementEvent {
  return {
    id,
    requestId: 'visit-1',
    eventType,
    occurredAt: '2026-09-29T07:00:00.000Z',
    recordedAt: '2026-09-29T07:00:01.000Z',
    source: 'security',
    timestampBasis: 'occurred_at',
    actor: null,
    gate: null,
    departureEventId,
  };
}

describe('movement history', () => {
  it('pairs check-ins only by departure event ID and retains unmatched checkouts', () => {
    const rows = groupMovementEvents([
      event('entry-a', 'checked_in', 'exit-a'),
      event('exit-unmatched', 'checked_out'),
      event('entry-b', 'checked_in', null),
      event('exit-a', 'checked_out'),
      event('admin-close', 'administrative_completion'),
    ]);

    expect(rows).toEqual([
      { kind: 'checkin', event: expect.objectContaining({ id: 'entry-a' }), checkout: expect.objectContaining({ id: 'exit-a' }) },
      { kind: 'checkout', event: expect.objectContaining({ id: 'exit-unmatched' }) },
      { kind: 'checkin', event: expect.objectContaining({ id: 'entry-b' }), checkout: undefined },
      { kind: 'administrative_completion', event: expect.objectContaining({ id: 'admin-close' }) },
    ]);
  });

  it('formats UTC timestamps in the supplied business timezone and locale', () => {
    expect(formatMovementTimestamp('2026-09-29T07:00:00.000Z', 'Asia/Riyadh', false))
      .toContain('10:00 AM');
    expect(formatMovementTimestamp('2026-09-29T07:00:00.000Z', 'Asia/Riyadh', true))
      .toMatch(/[٠-٩]/);
  });

  it('provides movement-history labels in English and Arabic', () => {
    expect(en.movementHistory.noCheckout).toBe('No checkout recorded');
    expect(en.movementHistory.administrativelyClosed).toBe('Visit closed administratively');
    expect(en.movementHistory.noHistory).toBe('No movement history recorded');
    expect(en.movementHistory.legacyRecordedTime).toBe('Legacy recorded time');
    expect(ar.movementHistory.noCheckout).toBe('لم يتم تسجيل الخروج');
    expect(ar.movementHistory.administrativelyClosed).toBe('تم إغلاق الزيارة إدارياً');
    expect(ar.movementHistory.noHistory).toBe('لم يتم تسجيل سجل للحركة');
    expect(ar.movementHistory.legacyRecordedTime).toBe('وقت التسجيل القديم');
  });

  it('renders every physical event without treating an open entry as a completed visit', () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(MovementHistory, {
        movementHistory: {
          requestId: 'visit-1',
          timezone: 'Asia/Riyadh',
          data: [
            event('entry-a', 'checked_in', 'exit-a'),
            event('exit-a', 'checked_out'),
            event('entry-b', 'checked_in', null),
            event('exit-unmatched', 'checked_out'),
            event('admin-close', 'administrative_completion'),
          ],
        },
      }));
    });
    const labels = renderer!.root.findAllByType('ThemedText').map(node => node.children.join(' '));
    expect(labels.filter(text => text === en.movementHistory.checkIn)).toHaveLength(2);
    expect(labels.filter(text => text === en.movementHistory.checkOut)).toHaveLength(2);
    expect(labels).toContain(en.movementHistory.noCheckout);
    expect(labels).toContain(en.movementHistory.administrativelyClosed);
    expect(labels).not.toContain('Currently inside');
    act(() => renderer!.unmount());
  });

  it('shows an explicit empty state, but no fabricated history when the API omits it', () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(MovementHistory, {
        movementHistory: { requestId: 'visit-1', timezone: 'Asia/Riyadh', data: [] },
      }));
    });
    expect(JSON.stringify(renderer!.toJSON())).toContain(en.movementHistory.noHistory);
    act(() => renderer!.update(React.createElement(MovementHistory)));
    expect(renderer!.toJSON()).toBeNull();
    act(() => renderer!.unmount());
  });
});