/** Only confirmed invitations (or approved walk-ins, which have no visitor reply) are operational. */
const CONFIRMED_STATUSES = new Set([
  'visitor_accepted',
  'accepted',
  'checked_in',
  'on_site',
  'checked_out',
  'completed',
]);

export function isOperationalVisitVisible(visit: { status: string; isWalkIn?: boolean }): boolean {
  const status = visit.status.toLowerCase();
  return CONFIRMED_STATUSES.has(status) || (visit.isWalkIn === true && status === 'approved');
}