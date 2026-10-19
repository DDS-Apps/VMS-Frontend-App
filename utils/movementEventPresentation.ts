import type { VisitMovementEvent } from '@/types/api.types';

/** A refreshed server snapshot supersedes earlier copies with the same ID.
 * recordedAt breaks ties when a response happens to contain both revisions. */
export function reconcileMovementEvents(data: VisitMovementEvent[]): VisitMovementEvent[] {
  const byId = new Map<string, VisitMovementEvent>();
  for (const event of data) {
    const previous = byId.get(event.id);
    if (!previous || !(Date.parse(previous.recordedAt) > Date.parse(event.recordedAt))) byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => (Date.parse(a.occurredAt) || 0) - (Date.parse(b.occurredAt) || 0));
}

const labelKeys: Record<string, string> = {
  'Check In': 'checkIn',
  'Checkout': 'checkOut',
  'Admin closure': 'adminClosure',
  'No-show': 'noShow',
  'Parking arrival': 'parkingArrival',
  'Reception check-in': 'receptionCheckIn',
  'Reception checkout': 'receptionCheckout',
  'Administrative completion': 'administrativeCompletion',
  'Visit completed — not a physical checkout': 'administrativeCompletion',
  'Administrative completion—not physical departure': 'administrativeCompletion',
};

export function movementEventLabel(event: VisitMovementEvent, t: (key: string) => string): string {
  const label = event.displayLabel?.trim();
  if (label) return labelKeys[label] ? t(`movementHistory.${labelKeys[label]}`) : label;
  return t(`movementHistory.${event.eventType === 'checked_in' ? 'checkIn' :
    event.eventType === 'checked_out' ? 'checkOut' : 'administrativelyClosed'}`);
}

const effects = new Set([
  'arrival_recorded', 'reentry_allowed_before_meeting_end', 'expired_on_checkout',
  'visit_closed_not_physical_departure', 'invalid_schedule_access_denied',
]);
export function movementEffectText(event: VisitMovementEvent, t: (key: string) => string): string | undefined {
  return event.qrEffect && effects.has(event.qrEffect) ? t(`movementHistory.${event.qrEffect}`) : undefined;
}
