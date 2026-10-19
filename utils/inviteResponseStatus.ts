import type { PublicInviteDto } from '@/types/api.types';

export type InviteResponseStatus = 'accepted' | 'rejected' | null;

/** Visitor response presentation is independent of QR issuance and validity. */
export function getInviteResponseStatus(
  invite: Pick<PublicInviteDto, 'status' | 'visitorDecision'>,
): InviteResponseStatus {
  if (['rejected', 'visitor_rejected'].includes(invite.status) || invite.visitorDecision?.accepted === false) {
    return 'rejected';
  }
  // Preserve the existing post-response lifecycle presentation, including
  // completed visits whose QR may still be retained by the backend.
  if (['accepted', 'visitor_accepted', 'checked_in', 'checked_out', 'completed'].includes(invite.status) ||
      invite.visitorDecision?.accepted === true) {
    return 'accepted';
  }
  return null;
}
