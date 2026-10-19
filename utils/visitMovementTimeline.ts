import type { TimelineStep } from '@/components/shared/RequestTimeline';
import type { VisitMovementHistory } from '@/types/api.types';
import { reconcileMovementEvents, movementEventLabel, movementEffectText } from './movementEventPresentation';
import { getVisitTimelinePresentation, isHiddenMovementEffect, timelinePresentationLabel, type TimelinePresentationSource } from './visitTimelinePresentation';

/**
 * History is authoritative whenever present (including an empty history).
 * Legacy timestamps render only when history is absent. They still protect
 * the No-show evidence guard, but never append physical movements.
 */
export function mergeVisitMovementTimeline(
  steps: TimelineStep[],
  history: VisitMovementHistory | undefined,
  t: (key: string) => string,
  visitStatus?: string,
  presentationSource?: TimelinePresentationSource,
): TimelineStep[] {
  const legacyMovementIds = new Set([
    'checked_in', 'checked_out', 'checked-in', 'checked-out',
    'verified', 'entry', 'exit',
  ]);
  if (history === undefined) {
    // Legacy fallback is evidence-based too: status/icon colour never invents
    // a movement or completion timestamp. Keep permitted controls separately.
    return steps.filter(step =>
      (!legacyMovementIds.has(step.id) && step.id !== 'completed') ||
      step.status === 'error' || !!step.timestamp || !!step.actions?.length,
    ).map(step => legacyMovementIds.has(step.id) && !step.timestamp && step.actions?.length
      ? { ...step, id: ['checked_out', 'checked-out', 'exit'].includes(step.id) ? 'pending-check-out' : 'pending-check-in' }
      : step);
  }

  const events = reconcileMovementEvents(history.data);
  const legacyIn = steps.find(step => ['checked_in', 'checked-in', 'verified', 'entry'].includes(step.id) && step.status !== 'error' && step.timestamp);
  const legacyOut = steps.find(step => ['checked_out', 'checked-out', 'exit'].includes(step.id) && step.status !== 'error' && step.timestamp);
  const rules = getVisitTimelinePresentation(visitStatus, {
    checkedInAt: legacyIn?.timestamp,
    checkedOutAt: legacyOut?.timestamp,
    ...presentationSource,
    movementHistory: history,
  });
  const hiddenIds = new Set(rules?.hiddenEventIds ?? []);
  const finalEvent = rules?.finalTimelineEvent;
  // The replacement uses the same source ID; never display both versions.
  if (finalEvent) hiddenIds.add(finalEvent.sourceEventId);
  const remaining = steps.filter((step) => {
    if (hiddenIds.has(step.id) || (step.sourceEventId && hiddenIds.has(step.sourceEventId)) ||
      [...hiddenIds].some(id => step.id === `movement-${id}`)) return false;
    // Errors are recorded lifecycle outcomes, not unfulfilled movement steps.
    if (legacyMovementIds.has(step.id) && step.status !== 'error') return false;
    if (rules?.hideUnrecordedSteps && !step.timestamp && step.status !== 'error' &&
      ['visitor_response', 'visitor_accepted', 'accepted', 'next_steps'].includes(step.id)) return false;
    return true;
  }).map(step => rules && step.id === 'visitor_response' && step.timestamp && step.status !== 'error'
    ? { ...step, label: t('movementHistory.visitorAccepted') } : step);
  // Only an explicitly identified cutoff may fill a missing completion time.
  // Neither a physical departure nor status alone supplies that timestamp.
  const cutoff = rules && visitStatus === 'completed'
    ? events.find(event => hiddenIds.has(event.id) && event.eventType === 'administrative_completion' && event.completionReason === 'daily_cutoff')
    : undefined;
  const completedAt = presentationSource?.timeline?.completedAt ||
    presentationSource?.completedAt || remaining.find(step => step.id === 'completed')?.timestamp ||
    cutoff?.occurredAt;
  const completion = rules?.hideVisitCompleted || visitStatus !== 'completed' || !completedAt
    ? [] : remaining.filter(step => step.id === 'completed').map((step): TimelineStep => ({
      ...step, status: 'completed', timestamp: completedAt, timezone: history.timezone,
    }));
  const preceding = remaining.filter((step) =>
    step.id !== 'completed' && (step.id !== 'next_steps' || history.data.length === 0),
  );

  const movements = events.filter(event => !hiddenIds.has(event.id)).map((event): TimelineStep => ({
      id: `movement-${event.id}`,
      sourceEventId: event.id,
      label: movementEventLabel(event, t),
      timestamp: event.occurredAt,
      timezone: history.timezone,
      status: 'completed',
      icon: event.eventType === 'checked_in' ? 'log-in'
        : event.eventType === 'checked_out' ? 'log-out' : 'check-circle',
      metadata: [
         ...(!isHiddenMovementEffect(history, event.qrEffect) && movementEffectText(event, t) ? [movementEffectText(event, t)!] : []),
        ...(event.actor?.name ? [`${t('movementHistory.actor')}: ${event.actor.name}`] : []),
      ],
    }));

  // Retain existing permitted actions, never empty future movement milestones.
  // The renderer keeps these action controls separate from recorded history.
  const checkInActionStep = steps.find(step => ['checked_in', 'verified'].includes(step.id) && step.actions?.length);
  const checkOutActionStep = steps.find(step => ['checked_out', 'exit'].includes(step.id) && step.actions?.length);
  const pendingCheckIn: TimelineStep[] = checkInActionStep && !events.some(event =>
    event.eventType === 'checked_in' && event.movementBoundary !== 'parking' && event.displayLabel !== 'Parking arrival')
    ? [{
        id: 'pending-check-in',
        label: checkInActionStep.label,
        status: 'pending',
        icon: 'log-in',
        actions: checkInActionStep.actions,
      }]
    : [];
  const pendingCheckOut: TimelineStep[] = checkOutActionStep && !events.some(event => event.eventType === 'checked_out')
    ? [{
        id: 'pending-check-out',
        label: checkOutActionStep.label,
        status: 'pending',
        icon: 'log-out',
        actions: checkOutActionStep.actions,
      }]
    : [];

  const result: TimelineStep[] = [
    ...preceding,
    ...movements,
    ...completion,
    ...(finalEvent ? [{
      id: `movement-${finalEvent.sourceEventId}`,
      sourceEventId: finalEvent.sourceEventId,
      label: timelinePresentationLabel(finalEvent.displayLabel, t),
      timestamp: finalEvent.occurredAt,
      timezone: history.timezone,
      status: 'completed' as const,
      icon: 'check-circle' as const,
    }] : []),
  ];
  // Insert the backend's replacement chronologically without re-sorting the
  // returned movement sequence (different boundaries may share timestamps).
  if (finalEvent) {
    const final = result.pop()!;
    const before = result.findIndex(step => step.timestamp &&
      Date.parse(step.timestamp) > Date.parse(finalEvent.occurredAt));
    result.splice(before < 0 ? result.length : before, 0, final);
  }
  return [...result, ...pendingCheckIn, ...pendingCheckOut];
}