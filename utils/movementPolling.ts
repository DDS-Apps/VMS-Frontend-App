/** Poll returned state, not scheduled times or scan counts. Completed visits
 * may re-enter under backend rules; polling does not grant that permission.
 */
export function movementDetailPollingInterval(status: string | undefined): number | false {
  return status && [
    'approved', 'accepted', 'visitor_accepted', 'expected',
    'checked_in', 'checked_out', 'completed',
  ].includes(status) ? 60_000 : false;
}
