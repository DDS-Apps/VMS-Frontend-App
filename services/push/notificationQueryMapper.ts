import { QueryClient } from '@tanstack/react-query';
import { NOTIFICATION_TYPES, NotificationType } from '@/constants/notificationTypes';
import { notificationKeys } from '@/hooks/queries/useNotificationQueries';
import { requestKeys } from '@/hooks/queries/useApprovalQueries';
import { visitorKeys } from '@/hooks/queries/useVisitorQueries';
import { buffetKeys } from '@/hooks/queries/useBuffetQueries';
import { valetKeys } from '@/hooks/queries/useValetQueries';
import { valetAdminKeys } from '@/hooks/queries/useValetAdminQueries';
import { valetSelfServiceKeys } from '@/hooks/queries/useValetSelfServiceQueries';
import { parkingKeys } from '@/hooks/queries/useParkingQueries';
import { securityKeys } from '@/hooks/queries/useSecurityQueries';
import { receptionKeys } from '@/hooks/queries/useReceptionQueries';
import { meetingRoomKeys } from '@/hooks/queries/useMeetingRoomQueries';
import { invitationKeys } from '@/hooks/queries/useInvitationQueries';
import { allRequestsKeys } from '@/hooks/queries/useAllRequestsQuery';
import { gateKeys } from '@/hooks/queries/useGateQueries';
import { adminKeys } from '@/hooks/queries/useAdminQueries';

type QueryKeyFactory = () => readonly unknown[];

const NOTIFICATION_QUERY_MAP: Record<NotificationType, QueryKeyFactory[]> = {
  [NOTIFICATION_TYPES.NEW_VISITOR_REQUEST]: [
    () => requestKeys.all,
    () => visitorKeys.all,
    () => invitationKeys.all,
    () => allRequestsKeys.all,
    () => receptionKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VISITOR_REQUEST_UPDATE]: [
    () => requestKeys.all,
    () => visitorKeys.all,
    () => invitationKeys.all,
    () => allRequestsKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VISITOR_CHECK_IN]: [
    () => visitorKeys.all,
    () => receptionKeys.all,
    () => securityKeys.all,
    () => gateKeys.all,
    () => valetAdminKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VISITOR_CHECK_OUT]: [
    () => visitorKeys.all,
    () => receptionKeys.all,
    () => securityKeys.all,
    () => gateKeys.all,
    () => valetAdminKeys.all,
  ],
  
  [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: [
    () => requestKeys.all,
    () => visitorKeys.all,
    () => allRequestsKeys.all,
  ],
  
  [NOTIFICATION_TYPES.REQUEST_APPROVED]: [
    () => requestKeys.all,
    () => visitorKeys.all,
    () => invitationKeys.all,
    () => allRequestsKeys.all,
  ],
  
  [NOTIFICATION_TYPES.REQUEST_REJECTED]: [
    () => requestKeys.all,
    () => visitorKeys.all,
    () => invitationKeys.all,
    () => allRequestsKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VISITOR_ACCEPTED]: [
    () => visitorKeys.all,
    () => invitationKeys.all,
    () => requestKeys.all,
    () => receptionKeys.all,
    () => valetAdminKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VISITOR_REJECTED]: [
    () => visitorKeys.all,
    () => invitationKeys.all,
    () => requestKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VISITOR_ARRIVED]: [
    () => visitorKeys.all,
    () => receptionKeys.all,
    () => securityKeys.all,
    () => valetAdminKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VISITOR_DEPARTED]: [
    () => visitorKeys.all,
    () => receptionKeys.all,
    () => securityKeys.all,
    () => valetAdminKeys.all,
  ],
  
  [NOTIFICATION_TYPES.BUFFET_TASK]: [
    () => buffetKeys.all,
    () => allRequestsKeys.all,
  ],
  
  [NOTIFICATION_TYPES.BUFFET_ORDER]: [
    () => buffetKeys.all,
    () => allRequestsKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VALET_TASK]: [
    () => valetKeys.all,
    () => valetAdminKeys.all,
    () => valetSelfServiceKeys.all,
    () => allRequestsKeys.all,
  ],
  
  [NOTIFICATION_TYPES.VALET_ASSIGNMENT]: [
    () => valetKeys.all,
    () => valetAdminKeys.all,
    () => valetSelfServiceKeys.all,
    () => allRequestsKeys.all,
  ],
  
  [NOTIFICATION_TYPES.SECURITY_ALERT]: [
    () => securityKeys.all,
    () => gateKeys.all,
  ],
  
  [NOTIFICATION_TYPES.SECURITY_INCIDENT]: [
    () => securityKeys.all,
    () => gateKeys.all,
  ],
  
  [NOTIFICATION_TYPES.MEETING_ROOM]: [
    () => meetingRoomKeys.all,
  ],
  
  [NOTIFICATION_TYPES.AMMAM_UPDATE]: [
    () => meetingRoomKeys.all,
  ],
  
  [NOTIFICATION_TYPES.REMINDER]: [
    () => visitorKeys.all,
    () => requestKeys.all,
    () => invitationKeys.all,
    () => adminKeys.all,
  ],
  
  [NOTIFICATION_TYPES.AUTO_CANCELLED]: [
    () => visitorKeys.all,
    () => requestKeys.all,
    () => invitationKeys.all,
    () => allRequestsKeys.all,
  ],
};

export function getQueryKeysForNotificationType(type: string): (readonly unknown[])[] {
  const factories = NOTIFICATION_QUERY_MAP[type as NotificationType];
  if (!factories) {
    return [];
  }
  return factories.map(factory => factory());
}

export function invalidateQueriesForNotification(
  queryClient: QueryClient,
  notificationType: string
): void {
  
  queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
  queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
  
  const queryKeys = getQueryKeysForNotificationType(notificationType);
  
  queryKeys.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey });
  });
}

export function refreshAllNotificationData(queryClient: QueryClient): void {
  
  queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
  queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
}
