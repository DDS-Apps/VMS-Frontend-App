import type { TimelineStep } from '@/components/shared/RequestTimeline';
import type { VisitMovementHistory } from '@/types/api.types';

/**
 * The movement feed is authoritative when present. Legacy single-movement rows
 * are only useful for older responses that do not provide the feed at all.
 */
export function mergeVisitMovementTimeline(
  steps: TimelineStep[],
  history: VisitMovementHistory | undefined,
  t: (key: string) => string,
  visitStatus?: string,
): TimelineStep[] {
  if (history === undefined) return steps;

  const legacyMovementIds = new Set([
    'checked_in', 'checked_out', 'checked-in', 'checked-out',
    'verified', 'entry', 'exit',
  ]);
  const remaining = steps.filter((step) => !legacyMovementIds.has(step.id));
  const completion = remaining.filter((step) => step.id === 'completed');
  const preceding = remaining.filter((step) =>
    step.id !== 'completed' && (step.id !== 'next_steps' || history.data.length === 0),
  );

  const seen = new Set<string>();
  const movements = [...history.data]
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.occurredAt);
      const bTime = Date.parse(b.occurredAt);
      return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
    })
    .map((event): TimelineStep => ({
      id: `movement-${event.id}`,
      label: t(
        event.eventType === 'checked_in' ? 'movementHistory.checkIn'
          : event.eventType === 'checked_out' ? 'movementHistory.checkOut'
            : 'movementHistory.administrativelyClosed',
      ),
      timestamp: event.occurredAt,
      timezone: history.timezone,
      status: 'completed',
      icon: event.eventType === 'checked_in' ? 'log-in'
        : event.eventType === 'checked_out' ? 'log-out' : 'check-circle',
      metadata: [
        ...(event.actor?.name ? [`${t('movementHistory.actor')}: ${event.actor.name}`] : []),
        ...(event.gate?.name ? [`${t('movementHistory.gate')}: ${event.gate.name}`] : []),
      ],
    }));

  // A recorded physical departure (or an administrative closure) does not
  // itself confirm the visit's lifecycle completion.
  return [
    ...preceding,
    ...movements,
    ...completion.map((step): TimelineStep =>
      visitStatus === 'completed' || step.status !== 'completed' ? step : {
        ...step,
        status: 'pending',
        timestamp: undefined,
      }),
  ];
}