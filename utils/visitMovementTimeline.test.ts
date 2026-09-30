import { mergeVisitMovementTimeline } from './visitMovementTimeline';
import type { TimelineStep } from '@/components/shared/RequestTimeline';
import type { VisitMovementEvent, VisitMovementHistory } from '@/types/api.types';

const t = (key: string) => key;
const base: TimelineStep[] = [
  { id: 'submitted', label: 'Submitted', status: 'completed', icon: 'check' },
  { id: 'approval', label: 'Approved', status: 'completed', icon: 'check' },
  { id: 'checked_in', label: 'Legacy entry', status: 'completed', icon: 'log-in' },
  { id: 'checked_out', label: 'Legacy exit', status: 'completed', icon: 'log-out' },
  { id: 'completed', label: 'Completed', status: 'pending', icon: 'check-circle' },
];
const event = (id: string, eventType: VisitMovementEvent['eventType'], hour: number): VisitMovementEvent => ({
  id, requestId: 'visit', eventType,
  occurredAt: `2026-09-30T${String(hour).padStart(2, '0')}:00:00Z`,
  recordedAt: '2026-09-30T19:00:00Z',
  source: 'reception', timestampBasis: 'occurred_at', actor: null, gate: null,
});
const history = (data: VisitMovementEvent[]): VisitMovementHistory => ({
  requestId: 'visit', timezone: 'Asia/Riyadh', data,
});

describe('unified visitor movement timeline', () => {
  it('preserves legacy steps when the server has no history field', () => {
    expect(mergeVisitMovementTimeline(base, undefined, t, 'checked_out')).toEqual(base);
  });

  it('shows planned grey milestones but does not invent physical events for empty history', () => {
    const result = mergeVisitMovementTimeline(base, history([]), t, 'approved');
    expect(result.map(s => s.id)).toEqual([
      'submitted', 'approval', 'pending-check-in', 'pending-check-out', 'completed',
    ]);
    expect(result.slice(2, 4)).toEqual([
      { id: 'pending-check-in', label: 'timeline.visitorCheckedIn', status: 'pending', icon: 'log-in' },
      { id: 'pending-check-out', label: 'timeline.visitorCheckedOut', status: 'pending', icon: 'log-out' },
    ]);
  });

  it('places every repeat movement chronologically between approval and completion', () => {
    const events = [
      event('in-1', 'checked_in', 8), event('out-1', 'checked_out', 9),
      event('in-2', 'checked_in', 10), event('out-2', 'checked_out', 11),
    ];
    events[0].departureEventId = 'out-1';
    events[2].departureEventId = 'out-2';
    const input = history([events[3], events[0], events[2], events[1]]);
    const result = mergeVisitMovementTimeline(base, input, t, 'completed');
    expect(result.slice(0, 2).map(s => s.id)).toEqual(['submitted', 'approval']);
    expect(result.slice(2, -1).map(s => s.timestamp)).toEqual(events.map(e => e.occurredAt));
    expect(result.at(-1)?.id).toBe('completed');
    expect(input.data[0].id).toBe('out-2');
  });

  it('shows an unmatched entry and exit exactly once without inventing a pair', () => {
    const events = [event('exit-only', 'checked_out', 8), event('entry-only', 'checked_in', 9)];
    const result = mergeVisitMovementTimeline(base, history(events), t, 'checked_in');
    expect(result.slice(2, -1).map(s => s.timestamp)).toEqual(events.map(e => e.occurredAt));
  });

  it('keeps checkout pending after a single recorded entry', () => {
    const result = mergeVisitMovementTimeline(base, history([event('entry', 'checked_in', 8)]), t, 'checked_in');
    expect(result.slice(2, -1).map(step => [step.id, step.status])).toEqual([
      ['movement-entry', 'completed'], ['pending-check-out', 'pending'],
    ]);
    expect(result[3].timestamp).toBeUndefined();
  });

  it('keeps check-in pending before a checkout-only history without inventing an entry', () => {
    const result = mergeVisitMovementTimeline(base, history([event('exit', 'checked_out', 8)]), t, 'checked_out');
    expect(result.slice(2, -1).map(step => [step.id, step.status])).toEqual([
      ['pending-check-in', 'pending'], ['movement-exit', 'completed'],
    ]);
  });

  it('keeps movement buttons on pending steps without presenting an unrecorded event as green', () => {
    const onCheckIn = jest.fn();
    const onCheckOut = jest.fn();
    const actionable = base.map(step =>
      step.id === 'checked_in'
        ? { ...step, status: 'current' as const, actions: [{ type: 'check_in' as const, label: 'Check In', onPress: onCheckIn }] }
        : step.id === 'checked_out'
          ? { ...step, status: 'current' as const, actions: [{ type: 'check_out' as const, label: 'Check Out', onPress: onCheckOut }] }
          : step,
    );
    const empty = mergeVisitMovementTimeline(actionable, history([]), t, 'approved');
    expect(empty.find(step => step.id === 'pending-check-in')).toMatchObject({ status: 'pending', actions: [{ onPress: onCheckIn }] });
    expect(empty.find(step => step.id === 'pending-check-out')).toMatchObject({ status: 'pending', actions: [{ onPress: onCheckOut }] });
    const entered = mergeVisitMovementTimeline(actionable, history([event('entry', 'checked_in', 8)]), t, 'checked_in');
    expect(entered.some(step => step.id === 'pending-check-in')).toBe(false);
    expect(entered.find(step => step.id === 'pending-check-out')?.actions?.[0].onPress).toBe(onCheckOut);
  });

  it('never marks lifecycle completion based on checkout or administrative closure', () => {
    for (const status of ['checked_out', 'checked_in']) {
      const result = mergeVisitMovementTimeline(base, history([
        event('exit', 'checked_out', 9), event('admin', 'administrative_completion', 10),
      ]), t, status);
      expect(result.at(-1)?.status).toBe('pending');
      expect(result.slice(2, -1).map(s => s.label)).toEqual([
        'timeline.visitorCheckedIn', 'movementHistory.checkOut', 'movementHistory.administrativelyClosed',
      ]);
    }
  });

  it('retains recorded time, timezone, actor and gate without a legacy annotation', () => {
    const entry = {
      ...event('entry', 'checked_in', 8),
      timestampBasis: 'legacy_audit_time' as const,
      actor: { name: 'Reception desk' }, gate: { name: 'Main gate' },
    };
    const result = mergeVisitMovementTimeline(base, history([entry]), t, 'checked_in');
    const step = result[2];
    expect(step.timestamp).toBe(entry.occurredAt);
    expect(step.timezone).toBe('Asia/Riyadh');
    expect(step.metadata?.join(' ')).toContain('Reception desk');
    expect(step.metadata?.join(' ')).toContain('Main gate');
    expect(step.metadata?.join(' ')).not.toContain('movementHistory.legacyRecordedTime');
    expect(entry.timestampBasis).toBe('legacy_audit_time');
  });
});