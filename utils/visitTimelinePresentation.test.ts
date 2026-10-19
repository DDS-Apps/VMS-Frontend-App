import { mergeVisitMovementTimeline } from './visitMovementTimeline';
import { getVisitTimelinePresentation, isHiddenMovementEffect, timelinePresentationLabel } from './visitTimelinePresentation';
import { movementEventLabel } from './movementEventPresentation';
import type { VisitMovementEvent, VisitMovementHistory } from '@/types/api.types';
import type { TimelineStep } from '@/components/shared/RequestTimeline';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';

const t = (key: string) => key;
const event = (id: string, eventType: VisitMovementEvent['eventType'], hour: number, extra: Partial<VisitMovementEvent> = {}): VisitMovementEvent => ({
  id, requestId: 'visit', eventType, occurredAt: `2026-10-18T${hour}:00:00.000Z`,
  recordedAt: '2026-10-19T01:00:00.000Z', timestampBasis: 'occurred_at',
  source: 'system', actor: null, gate: null, ...extra,
});
const closure = event('closure', 'administrative_completion', 18, {
  displayLabel: 'Admin closure', qrEffect: 'visit_closed_not_physical_departure',
});
const hiddenQrEffects = ['arrival_recorded', 'expired_on_checkout', 'reentry_allowed_before_meeting_end'];
const history = (data: VisitMovementEvent[], noShow = true): VisitMovementHistory => ({
  requestId: 'visit', timezone: 'Asia/Riyadh', data,
  presentation: {
    statusLabelOverride: noShow ? 'No-show' : null,
    hideVisitCompleted: noShow, hideUnrecordedSteps: true,
    hiddenEventIds: ['closure'], hiddenQrEffects,
    finalTimelineEvent: noShow ? {
      sourceEventId: 'closure', displayLabel: 'No-show', occurredAt: closure.occurredAt,
    } : null,
  },
});
const base: TimelineStep[] = [
  { id: 'submitted', label: 'Submitted', timestamp: '2026-10-18T06:00:00.000Z', status: 'completed', icon: 'check' },
  { id: 'approval', label: 'Auto-approved', status: 'completed', icon: 'check' },
  { id: 'visitor_response', label: 'Accepted', status: 'completed', icon: 'check' },
  { id: 'checked_in', label: 'Legacy entry', status: 'completed', icon: 'log-in' },
  { id: 'checked_out', label: 'Legacy exit', status: 'pending', icon: 'log-out' },
  { id: 'completed', label: 'Completed', timestamp: closure.occurredAt, status: 'completed', icon: 'check-circle' },
];

describe('backend timeline presentation contract', () => {
  it('applies generic presentation rules to active visits without a No-show override', () => {
    const feed = history([event('parking', 'checked_in', 11, { movementBoundary: 'parking' })], false);
    expect(getVisitTimelinePresentation('visitor_accepted', { movementHistory: feed })).toBe(feed.presentation);
    const steps = base.map(step => step.id === 'completed' ? { ...step, timestamp: undefined } : step);
    const result = mergeVisitMovementTimeline(steps, feed, t, 'visitor_accepted');
    expect(result.map(step => step.id)).toEqual(['submitted', 'approval', 'movement-parking']);
  });

  it('keeps parking and reception arrivals distinct even with identical labels and timestamps', () => {
    const parking = event('parking', 'checked_in', 11, { movementBoundary: 'parking', displayLabel: 'Check In' });
    const reception = { ...parking, id: 'building', movementBoundary: 'reception' as const };
    const exit = event('exit', 'checked_out', 12, { movementBoundary: 'reception', displayLabel: 'Checkout' });
    const feed = history([parking, reception, exit], false);
    const steps = base.map(step => ['checked_in', 'checked_out'].includes(step.id)
      ? { ...step, timestamp: parking.occurredAt } : step);
    expect(mergeVisitMovementTimeline(steps, feed, t, 'completed')
      .filter(step => step.sourceEventId).map(step => step.sourceEventId)).toEqual(['parking', 'building', 'exit']);
    expect(feed.data).toEqual([parking, reception, exit]);
  });

  it('requires a real completion time even when the backend does not hide completion', () => {
    const feed = history([], false);
    const steps = base.map(step => step.id === 'completed' ? { ...step, timestamp: undefined } : step);
    const result = mergeVisitMovementTimeline(steps, feed, t, 'completed', {
      timeline: { completedAt: null, checkedInAt: null, checkedOutAt: null },
    });
    expect(result.map(step => step.id)).toEqual(['submitted', 'approval']);
  });

  it('replaces no-attendance closure exactly once without modifying audit data or status', () => {
    const feed = history([closure]);
    const snapshot = JSON.stringify(feed);
    const result = mergeVisitMovementTimeline(base, feed, t, 'completed');
    expect(result.map(step => step.id)).toEqual(['submitted', 'approval', 'movement-closure']);
    expect(result.at(-1)).toMatchObject({
      label: 'movementHistory.noShow', timestamp: closure.occurredAt, timezone: 'Asia/Riyadh',
    });
    expect(result.at(-1)?.metadata).toBeUndefined();
    expect(JSON.stringify(feed)).toBe(snapshot);
    expect(base.at(-1)?.status).toBe('completed');
  });

  it('keeps real acceptance at its occurrence time, not the closure time', () => {
    const steps = base.map(step => step.id === 'visitor_response'
      ? { ...step, timestamp: '2026-10-18T10:00:00.000Z' } : step);
    const result = mergeVisitMovementTimeline(steps, history([closure]), t, 'completed');
    expect(result.map(step => step.id)).toEqual(['submitted', 'approval', 'visitor_response', 'movement-closure']);
    expect(result[2].timestamp).toBe('2026-10-18T10:00:00.000Z');
    expect(result[2].label).toBe('movementHistory.visitorAccepted');
  });

  it('hides multiple administrative sources, including a separate lifecycle copy, with one replacement', () => {
    const older = event('older', 'administrative_completion', 17);
    const feed = history([older, closure]);
    feed.presentation!.hiddenEventIds = ['older', 'closure'];
    const result = mergeVisitMovementTimeline([
      ...base, { id: 'audit-copy', sourceEventId: 'older', label: 'Admin closure', status: 'completed', icon: 'check' },
      { id: 'movement-closure', label: 'Admin closure', status: 'completed', icon: 'check' },
    ], feed, t, 'completed');
    expect(result.map(step => step.id)).toEqual(['submitted', 'approval', 'movement-closure']);
  });

  it.each(['cancelled', 'auto_cancelled', 'checked_in', 'visitor_accepted', 'approved'])(
    'does not apply stale closure instructions to %s', status => {
      const feed = history([closure]);
      expect(getVisitTimelinePresentation(status, { movementHistory: feed })).toBeUndefined();
      const result = mergeVisitMovementTimeline(base, feed, t, status);
      expect(result.some(step => step.label === 'movementHistory.noShow')).toBe(false);
      expect(result.some(step => step.label === 'movementHistory.adminClosure')).toBe(true);
    },
  );

  it.each([
    event('parking', 'checked_in', 12, { movementBoundary: 'parking' }),
    event('arrival', 'checked_in', 12),
    event('orphan-exit', 'checked_out', 12),
  ])('does not label recorded physical evidence $id as No-show', movement => {
    const feed = history([movement, closure]);
    expect(getVisitTimelinePresentation('completed', { movementHistory: feed })).toBeUndefined();
    expect(mergeVisitMovementTimeline(base, feed, t, 'completed').some(step => step.label === 'movementHistory.noShow')).toBe(false);
  });

  it.each([
    { checkedInAt: '2026-10-18T12:00:00Z' },
    { checkedOutAt: '2026-10-18T12:00:00Z' },
    { timeline: { checkedInAt: '2026-10-18T12:00:00Z' } },
    { timeline: { checkedOutAt: '2026-10-18T12:00:00Z' } },
  ])('does not ignore legacy physical timestamps: %j', source => {
    expect(getVisitTimelinePresentation('completed', { ...source, movementHistory: history([closure]) })).toBeUndefined();
  });

  it('requires recorded closure evidence; completed or empty history alone is insufficient', () => {
    expect(getVisitTimelinePresentation('completed', {})).toBeUndefined();
    expect(getVisitTimelinePresentation('completed', { movementHistory: history([]) })).toBeUndefined();
    expect(mergeVisitMovementTimeline(base, undefined, t, 'completed'))
      .toEqual(base.filter(step => !['checked_in', 'checked_out'].includes(step.id)));
    const feed = history([closure]);
    delete feed.presentation;
    expect(mergeVisitMovementTimeline(base, feed, t, 'completed').some(step => step.label === 'movementHistory.noShow')).toBe(false);
  });

  it('preserves every repeated movement and only hides specified helper notes', () => {
    const movements = [
      event('in-1', 'checked_in', 10, { displayLabel: 'Check In', qrEffect: 'arrival_recorded' }),
      event('out-1', 'checked_out', 11, { displayLabel: 'Checkout', qrEffect: 'reentry_allowed_before_meeting_end' }),
      event('in-2', 'checked_in', 12, { displayLabel: 'Check In', qrEffect: 'arrival_recorded' }),
      event('out-2', 'checked_out', 14, { displayLabel: 'Checkout', qrEffect: 'expired_on_checkout' }),
    ];
    const feed = history(movements, false);
    feed.presentation!.hiddenEventIds = [];
    const result = mergeVisitMovementTimeline(base, feed, t, 'completed');
    expect(result.filter(step => step.id.startsWith('movement-')).map(step => [step.id, step.timestamp, step.metadata])).toEqual(
      movements.map(movement => [`movement-${movement.id}`, movement.occurredAt, []]),
    );
    expect(result.filter(step => step.id.startsWith('movement-')).map(step => step.label)).toEqual([
      'movementHistory.checkIn', 'movementHistory.checkOut', 'movementHistory.checkIn', 'movementHistory.checkOut',
    ]);
  });

  it('shows open building arrival then completion at canonical cutoff, never a checkout', () => {
    const cutoff = { ...closure, completionReason: 'daily_cutoff' };
    const feed = history([event('entry', 'checked_in', 11), cutoff], false);
    const result = mergeVisitMovementTimeline(base, feed, t, 'completed', {
      timeline: { completedAt: '2026-10-18T18:00:00.000Z' },
    });
    expect(result.map(step => step.id)).toEqual(['submitted', 'approval', 'movement-entry', 'completed']);
    expect(result.at(-1)).toMatchObject({ timestamp: '2026-10-18T18:00:00.000Z', timezone: 'Asia/Riyadh' });
    expect(feed.data[1].recordedAt).not.toBe(result.at(-1)?.timestamp);
    expect(result.some(step => step.id.includes('out'))).toBe(false);
  });

  it('uses the identified cutoff occurrence only when legacy completion timestamp is missing', () => {
    const feed = history([event('entry', 'checked_in', 11), { ...closure, completionReason: 'daily_cutoff' }], false);
    const result = mergeVisitMovementTimeline(base.map(step => step.id === 'completed' ? { ...step, timestamp: undefined } : step), feed, t, 'completed');
    expect(result.at(-1)?.timestamp).toBe(closure.occurredAt);
  });

  it('retains earlier checkout cycles before a later open re-entry', () => {
    const feed = history([
      event('in-1', 'checked_in', 10), event('out-1', 'checked_out', 11),
      event('in-2', 'checked_in', 12), { ...closure, completionReason: 'daily_cutoff' },
    ], false);
    const result = mergeVisitMovementTimeline(base, feed, t, 'completed');
    expect(result.map(step => step.id)).toEqual(['submitted', 'approval', 'movement-in-1', 'movement-out-1', 'movement-in-2', 'completed']);
  });

  it('uses legacy attendance for evidence guards, not extra rows alongside history', () => {
    const steps = base.map(step => step.id === 'checked_in'
      ? { ...step, timestamp: '2026-10-18T11:00:00.000Z' } : step);
    const result = mergeVisitMovementTimeline(steps, history([{ ...closure, completionReason: 'daily_cutoff' }], false), t, 'completed');
    expect(result.map(step => step.id)).toEqual(['submitted', 'approval', 'completed']);
  });

  it.each(['parking-only', 'scheduled-end', 'actual-checkout'])(
    'does not derive hidden cutoff instructions for %s merely from a 9 PM closure', kind => {
      const feed = history([
        event('entry', 'checked_in', 11, { movementBoundary: kind === 'parking-only' ? 'parking' : 'reception' }),
        ...(kind === 'actual-checkout' ? [event('exit', 'checked_out', 19)] : []),
        { ...closure, completionReason: kind === 'scheduled-end' ? 'scheduled_end' : 'daily_cutoff' },
      ], false);
      feed.presentation!.hiddenEventIds = [];
      feed.presentation!.hideUnrecordedSteps = false;
      const result = mergeVisitMovementTimeline(base, feed, t, 'completed');
      expect(result.some(step => step.id === 'movement-closure')).toBe(true);
      if (kind === 'actual-checkout') expect(result.some(step => step.id === 'movement-exit')).toBe(true);
    },
  );

  it('preserves genuine non-green cancellation/rejection outcomes even in movement slots', () => {
    const error: TimelineStep = { id: 'checked_in', status: 'error', label: 'Cancelled', icon: 'x-circle' };
    const rejected: TimelineStep = { id: 'host_approval', status: 'error', label: 'Rejected', icon: 'x-circle' };
    const result = mergeVisitMovementTimeline([...base.filter(step => step.id !== 'checked_in'), error, rejected], history([closure]), t, 'completed');
    expect(result).toContainEqual(error);
    expect(result).toContainEqual(rejected);
  });

  it('never suppresses access warnings or visible administrative-closure explanations', () => {
    const feed = history([closure], false);
    feed.presentation!.hiddenEventIds = [];
    feed.presentation!.hiddenQrEffects!.push('invalid_schedule_access_denied', 'visit_closed_not_physical_departure');
    expect(isHiddenMovementEffect(feed, 'invalid_schedule_access_denied')).toBe(false);
    expect(isHiddenMovementEffect(feed, 'visit_closed_not_physical_departure')).toBe(false);
    expect(mergeVisitMovementTimeline(base, feed, t, 'completed').find(step => step.id === 'movement-closure')?.metadata)
      .toContain('movementHistory.visit_closed_not_physical_departure');
  });

  it.each([en, ar])('localizes all new display labels without changing their event types', dictionary => {
    const translate = (key: string) => key.split('.').reduce((value: any, part) => value?.[part], dictionary);
    for (const [displayLabel, key] of [['Check In', 'checkIn'], ['Checkout', 'checkOut'], ['Admin closure', 'adminClosure']]) {
      expect(movementEventLabel({ ...closure, displayLabel }, translate)).toBe(dictionary.movementHistory[key]);
    }
    expect(timelinePresentationLabel('No-show', translate)).toBe(dictionary.movementHistory.noShow);
  });
});
