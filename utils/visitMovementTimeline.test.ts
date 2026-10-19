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
  it('uses recorded legacy timestamps only when the server has no history field', () => {
    const recorded = base.map(step => ['checked_in', 'checked_out'].includes(step.id)
      ? { ...step, timestamp: '2026-09-30T09:00:00Z' } : step);
    expect(mergeVisitMovementTimeline(recorded, undefined, t, 'checked_out'))
      .toEqual(recorded.filter(step => step.id !== 'completed'));
    expect(mergeVisitMovementTimeline(base, undefined, t, 'approved').map(step => step.id))
      .toEqual(['submitted', 'approval']);
  });

  it('does not invent movements or completion for empty authoritative history', () => {
    const result = mergeVisitMovementTimeline(base, history([]), t, 'approved');
    expect(result.map(s => s.id)).toEqual(['submitted', 'approval']);
  });

  it('preserves the returned order of every repeat movement without changing the response', () => {
    const events = [
      event('in-1', 'checked_in', 8), event('out-1', 'checked_out', 9),
      event('in-2', 'checked_in', 10), event('out-2', 'checked_out', 11),
    ];
    events[0].departureEventId = 'out-1';
    events[2].departureEventId = 'out-2';
    const input = history([events[3], events[0], events[2], events[1]]);
    const result = mergeVisitMovementTimeline(base, input, t, 'completed');
    expect(result.slice(0, 2).map(s => s.id)).toEqual(['submitted', 'approval']);
    expect(result.slice(2).map(s => s.timestamp)).toEqual(input.data.map(e => e.occurredAt));
    expect(result.some(step => step.id === 'completed')).toBe(false);
    expect(input.data[0].id).toBe('out-2');
  });

  it('shows an unmatched entry and exit exactly once without inventing a pair', () => {
    const events = [event('exit-only', 'checked_out', 8), event('entry-only', 'checked_in', 9)];
    const result = mergeVisitMovementTimeline(base, history(events), t, 'checked_in');
    expect(result.slice(2).map(s => s.timestamp)).toEqual(events.map(e => e.occurredAt));
  });

  it('does not append an empty checkout after a single recorded entry', () => {
    const result = mergeVisitMovementTimeline(base, history([event('entry', 'checked_in', 8)]), t, 'checked_in');
    expect(result.slice(2).map(step => [step.id, step.status])).toEqual([
      ['movement-entry', 'completed'],
    ]);
  });

  it('does not invent an entry before checkout-only history', () => {
    const result = mergeVisitMovementTimeline(base, history([event('exit', 'checked_out', 8)]), t, 'checked_out');
    expect(result.slice(2).map(step => [step.id, step.status])).toEqual([
      ['movement-exit', 'completed'],
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
      expect(result.some(step => step.id === 'completed')).toBe(false);
      expect(result.slice(2).map(s => s.label)).toEqual([
        'movementHistory.checkOut', 'movementHistory.administrativelyClosed',
      ]);
    }
  });

  it('retains recorded time, timezone and actor, but never displays gate details', () => {
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
    expect(step.metadata?.join(' ')).not.toContain('Main gate');
    expect(step.metadata?.join(' ')).not.toContain('movementHistory.legacyRecordedTime');
    expect(entry.timestampBasis).toBe('legacy_audit_time');
  });
});