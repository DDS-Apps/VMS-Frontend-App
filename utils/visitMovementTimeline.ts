import type { TimelineStep } from '@/components/shared/RequestTimeline';
import type { VisitMovementHistory } from '@/types/api.types';
import { reconcileMovementEvents, movementEventLabel, movementEffectText } from './movementEventPresentation';
import { getVisitTimelinePresentation, isHiddenMovementEffect, timelinePresentationLabel, type TimelinePresentationSource } from './visitTimelinePresentation';

/**
 * The movement feed is authoritative when present. Presentation-aware responses
 * may also need recorded legacy attendance missing from the feed.
 */
export function mergeVisitMovementTimeline(
  steps: TimelineStep[],
  history: VisitMovementHistory | undefined,
  t: (key: string) => string,
  visitStatus?: string,
  presentationSource?: TimelinePresentationSource,
): TimelineStep[] {
  if (history === undefined) return steps;

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
  const legacyMovementIds = new Set([
    'checked_in', 'checked_out', 'checked-in', 'checked-out',
    'verified', 'entry', 'exit',
  ]);
  const remaining = steps.filter((step) => {
    if (hiddenIds.has(step.id) || (step.sourceEventId && hiddenIds.has(step.sourceEventId)) ||
      [...hiddenIds].some(id => step.id === `movement-${id}`)) return false;
    // Errors are recorded lifecycle outcomes, not unfulfilled movement steps.
    if (legacyMovementIds.has(step.id) && step.status !== 'error') {
      // With presentation rules, preserve real legacy evidence absent from the feed.
      const type = ['checked_out', 'checked-out', 'exit'].includes(step.id) ? 'checked_out' : 'checked_in';
      return !!rules && !!step.timestamp && !events.some(event => event.eventType === type);
    }
    if (rules?.hideUnrecordedSteps && !step.timestamp && step.status !== 'error' &&
      ['visitor_response', 'visitor_accepted', 'accepted', 'next_steps'].includes(step.id)) return false;
    return true;
  }).map(step => rules && step.id === 'visitor_response' && step.timestamp && step.status !== 'error'
    ? { ...step, label: t('movementHistory.visitorAccepted') } : step);
  const completion = rules?.hideVisitCompleted ? [] : remaining.filter((step) => step.id === 'completed');
  const preceding = remaining.filter((step) =>
    step.id !== 'completed' && (step.id !== 'next_steps' || history.data.length === 0),
  );

  const movements = events.filter(event => !hiddenIds.has(event.id)).map((event): TimelineStep => ({
      id: `movement-${event.id}`,
      label: movementEventLabel(event, t),
      timestamp: event.occurredAt,
      timezone: history.timezone,
      status: 'completed',
      icon: event.eventType === 'checked_in' ? 'log-in'
        : event.eventType === 'checked_out' ? 'log-out' : 'check-circle',
      metadata: [
         ...(!isHiddenMovementEffect(history, event.qrEffect) && movementEffectText(event, t) ? [movementEffectText(event, t)!] : []),
        ...(event.actor?.name ? [`${t('movementHistory.actor')}: ${event.actor.name}`] : []),
        ...(event.gate?.name ? [`${t('movementHistory.gate')}: ${event.gate.name}`] : []),
      ],
    }));

  // These are planned milestones, not fabricated movement events. The feed
  // determines which physical movements actually happened, including repeats.
  const checkInActionStep = steps.find(step => ['checked_in', 'verified'].includes(step.id) && step.actions?.length);
  const checkOutActionStep = steps.find(step => ['checked_out', 'exit'].includes(step.id) && step.actions?.length);
  const pendingCheckIn: TimelineStep[] = !rules?.hideUnrecordedSteps && (completion.length || checkInActionStep) && !events.some(event => event.eventType === 'checked_in' && event.movementBoundary !== 'parking' && event.displayLabel !== 'Parking arrival')
    ? [{
        id: 'pending-check-in',
        label: completion.length ? t('timeline.visitorCheckedIn') : checkInActionStep!.label,
        status: 'pending',
        icon: 'log-in',
        ...(checkInActionStep?.actions ? { actions: checkInActionStep.actions } : {}),
      }]
    : [];
  const pendingCheckOut: TimelineStep[] = !rules?.hideUnrecordedSteps && (completion.length || checkOutActionStep) && !events.some(event => event.eventType === 'checked_out')
    ? [{
        id: 'pending-check-out',
        label: completion.length ? t('timeline.visitorCheckedOut') : checkOutActionStep!.label,
        status: 'pending',
        icon: 'log-out',
        ...(checkOutActionStep?.actions ? { actions: checkOutActionStep.actions } : {}),
      }]
    : [];

  // A recorded physical departure (or an administrative closure) does not
  // itself confirm the visit's lifecycle completion.
  const cutoff = rules && visitStatus === 'completed'
    ? events.find(event => hiddenIds.has(event.id) && event.eventType === 'administrative_completion' && event.completionReason === 'daily_cutoff')
    : undefined;
  const result: TimelineStep[] = [
    ...preceding,
    ...pendingCheckIn,
    ...movements,
    ...pendingCheckOut,
    ...completion.map((step): TimelineStep =>
       visitStatus === 'completed' ? {
         ...step,
         timestamp: presentationSource?.timeline?.completedAt || presentationSource?.completedAt || step.timestamp || cutoff?.occurredAt,
         timezone: history.timezone,
       } : step.status !== 'completed' ? step : {
        ...step,
        status: 'pending',
        timestamp: undefined,
      }),
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
  if (!rules) return result;
  // Sort recorded events without moving untimed lifecycle milestones or using
  // status/icon colour as evidence that an event occurred.
  const recorded = result.filter(step => step.timestamp)
    .sort((a, b) => Date.parse(a.timestamp!) - Date.parse(b.timestamp!));
  let index = 0;
  return result.map(step => step.timestamp ? recorded[index++] : step);
}