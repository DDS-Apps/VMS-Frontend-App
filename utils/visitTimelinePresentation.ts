import type { VisitMovementHistory, VisitTimelinePresentation } from '@/types/api.types';

export interface TimelinePresentationSource {
  movementHistory?: VisitMovementHistory;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  completedAt?: string | null;
  timeline?: {
    checkedInAt?: string | null;
    checkedOutAt?: string | null;
    completedAt?: string | null;
  };
}

/**
 * Consume backend display instructions, never infer them from status or time.
 * A stale closure must not relabel an active/cancelled visit. Legacy timestamps
 * and all physical boundaries count as attendance evidence for No-show.
 */
export function getVisitTimelinePresentation(
  status: string | undefined,
  source: TimelinePresentationSource,
): VisitTimelinePresentation | undefined {
  const history = source.movementHistory;
  const rules = history?.presentation;
  if (!rules) return undefined;
  if (rules.statusLabelOverride === 'No-show' || rules.finalTimelineEvent?.displayLabel === 'No-show') {
    if (status !== 'completed') return undefined;
    const closure = history?.data.find(event =>
      event.id === rules.finalTimelineEvent?.sourceEventId &&
      event.eventType === 'administrative_completion');
    const hasMovement = history?.data.some(event =>
      event.eventType === 'checked_in' || event.eventType === 'checked_out');
    if (!closure || hasMovement || source.checkedInAt || source.checkedOutAt ||
      source.timeline?.checkedInAt || source.timeline?.checkedOutAt) return undefined;
  }
  return rules;
}

export function timelinePresentationLabel(label: string, t: (key: string) => string): string {
  return label === 'No-show' ? t('movementHistory.noShow') : label;
}

/** Only these helper notes are suppressible; access/closure warnings remain. */
export function isHiddenMovementEffect(history: VisitMovementHistory, effect?: string): boolean {
  return !!effect && [
    'arrival_recorded', 'expired_on_checkout', 'reentry_allowed_before_meeting_end',
  ].includes(effect) && !!history.presentation?.hiddenQrEffects?.includes(effect);
}
