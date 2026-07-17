import type { NotificationResponse } from 'expo-notifications';
import { navigate, isReady } from '@/navigation/navigationRef';
import { ROUTES } from '@/constants/routes';
import { NOTIFICATION_TYPES } from '@/constants/notificationTypes';
import type { NotificationEventType } from '@/types/notification.types';

interface InAppNotificationData {
  type: NotificationEventType | string;
  data?: Record<string, unknown>;
}

export function navigateFromInAppNotification(notification: InAppNotificationData) {
  const { type, data = {} } = notification;
  
  if (!isReady()) {
    console.warn('[NotificationNavigator] Navigation is not ready');
    return;
  }

  switch (type) {
    case 'request_created':
    case 'request_approved':
    case 'request_rejected':
    case 'request_cancelled':
    case 'request_updated':
      if (data.requestId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId });
      } else {
        navigate(ROUTES.VISIT_REQUESTS);
      }
      break;

    case 'pending_approval':
      navigate(ROUTES.APPROVALS);
      break;

    case 'visitor_accepted':
    case 'visitor_rejected':
    case 'visitor_arrival':
    case 'visitor_no_show':
    case 'check_in':
    case 'check_out':
    case 'expected_today':
      if (data.requestId || data.visitId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId || data.visitId });
      } else {
        navigate(ROUTES.TODAYS_VISITORS);
      }
      break;

    case 'reminder_tomorrow':
    case 'reminder_2hours':
    case 'reminder_30min':
    case 'reminder_now':
      if (data.requestId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId });
      } else {
        navigate(ROUTES.VISIT_REQUESTS);
      }
      break;

    case 'room_booked':
    case 'room_reminder':
    case 'room_cancelled':
    case 'room_conflict':
    case 'room_reassigned':
      if (data.roomId) {
        navigate(ROUTES.ROOM_DETAILS, { roomId: data.roomId });
      } else {
        navigate(ROUTES.MEETING_ROOMS);
      }
      break;

    case 'parking_assigned':
    case 'parking_full':
      if (data.requestId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId });
      } else {
        navigate(ROUTES.PARKING_SPOTS);
      }
      break;

    case 'buffet_new_request':
    case 'buffet_request_created':
    case 'buffet_task_assigned':
    case 'buffet_scheduled':
    case 'buffet_status_update':
    case 'buffet_staff_update':
    case 'buffet_completed':
      if (data.orderId || data.requestId) {
        navigate(ROUTES.BUFFET_ORDER_DETAILS, { orderId: data.orderId || data.requestId });
      } else {
        navigate(ROUTES.BUFFET_TASKS);
      }
      break;

    case 'valet_new_request':
    case 'valet_task_assigned':
    case 'valet_scheduled':
    case 'valet_completed':
    case 'valet_cancelled':
      if (data.taskId) {
        navigate(ROUTES.VALET_TASK_DETAILS, { taskId: data.taskId });
      } else {
        navigate(ROUTES.VALET_TASKS);
      }
      break;

    case 'security_access_update':
    case 'security_gate_pass':
      navigate(ROUTES.SECURITY_DASHBOARD);
      break;

    case 'auto_cancelled':
      if (data.requestId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId });
      } else {
        navigate(ROUTES.VISIT_REQUESTS);
      }
      break;

    default:
      navigate(ROUTES.NOTIFICATIONS);
      break;
  }
}

export function handleNotificationTap(response: NotificationResponse) {
  const data = response.notification.request.content.data || {};
  console.log('[NotificationNavigator] Handling notification tap:', data);

  if (!isReady()) {
    console.warn('[NotificationNavigator] Navigation is not ready');
    return;
  }

  const screen = data.screen as string | undefined;
  const type = data.type as string | undefined;

  if (screen) {
    navigate(screen, data as Record<string, unknown>);
    return;
  }

  switch (type) {
    case NOTIFICATION_TYPES.NEW_VISITOR_REQUEST:
    case NOTIFICATION_TYPES.VISITOR_REQUEST_UPDATE:
      if (data.requestId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId });
      } else {
        navigate(ROUTES.APPROVALS);
      }
      break;

    case NOTIFICATION_TYPES.VISITOR_CHECK_IN:
    case NOTIFICATION_TYPES.VISITOR_CHECK_OUT:
      if (data.requestId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId });
      } else {
        navigate(ROUTES.TODAYS_VISITORS);
      }
      break;

    case NOTIFICATION_TYPES.APPROVAL_REQUIRED:
      navigate(ROUTES.APPROVALS);
      break;

    case NOTIFICATION_TYPES.BUFFET_TASK:
    case NOTIFICATION_TYPES.BUFFET_ORDER:
      if (data.orderId) {
        navigate(ROUTES.BUFFET_ORDER_DETAILS, { orderId: data.orderId });
      } else {
        navigate(ROUTES.BUFFET_TASKS);
      }
      break;

    case NOTIFICATION_TYPES.VALET_TASK:
    case NOTIFICATION_TYPES.VALET_ASSIGNMENT:
      if (data.taskId) {
        navigate(ROUTES.VALET_TASK_DETAILS, { taskId: data.taskId });
      } else {
        navigate(ROUTES.VALET_TASKS);
      }
      break;

    case NOTIFICATION_TYPES.SECURITY_ALERT:
    case NOTIFICATION_TYPES.SECURITY_INCIDENT:
      navigate(ROUTES.SECURITY_DASHBOARD);
      break;

    case NOTIFICATION_TYPES.MEETING_ROOM:
    case NOTIFICATION_TYPES.AMMAM_UPDATE:
      if (data.roomId) {
        navigate(ROUTES.ROOM_DETAILS, { roomId: data.roomId });
      } else {
        navigate(ROUTES.MEETING_ROOMS);
      }
      break;

    case NOTIFICATION_TYPES.REMINDER:
      if (data.requestId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId });
      } else {
        navigate(ROUTES.NOTIFICATIONS);
      }
      break;

    case NOTIFICATION_TYPES.UPCOMING_VISIT:
      if (data.requestId) {
        navigate(ROUTES.VISIT_DETAILS, { visitId: data.requestId });
      } else {
        navigate(ROUTES.VISIT_REQUESTS);
      }
      break;

    default:
      navigate(ROUTES.NOTIFICATIONS);
      break;
  }
}
