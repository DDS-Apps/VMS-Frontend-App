/** Poll returned state, not scheduled times or scan counts. Completed visits
 * may re-enter under backend rules; polling does not grant that permission.
 */
export function movementDetailPollingInterval(status: string | undefined): number | false {
  return status && [
    'approved', 'accepted', 'visitor_accepted', 'expected',
    'checked_in', 'checked_out', 'completed',
  ].includes(status) ? 60_000 : false;
}

import { httpErrorStatus, type QrAccessSource } from './qrAccess';

/** Stop terminal/error polling; focus and explicit refresh may retry transient
 * failures. Completed status is NOT terminal access state (re-entry is possible). */
export function qrPollingInterval(source?: QrAccessSource, error?: unknown): number | false {
  if (error || [403, 410].includes(httpErrorStatus(error) ?? 0)) return false;
  if (!source || source.isExpired === true || source.movementHistory?.isExpired === true ||
      source.scheduleWarning === 'invalid_legacy_schedule' ||
      ['expired', 'cancelled', 'auto_cancelled', 'rejected', 'visitor_rejected'].includes(source.status || '')) return false;
  return 60_000;
}
