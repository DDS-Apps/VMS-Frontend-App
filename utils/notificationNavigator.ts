import type { NotificationResponse } from 'expo-notifications';
import { navigate, isReady } from '@/navigation/navigationRef';
import { ROUTES } from '@/constants/routes';
import { NOTIFICATION_TYPES } from '@/constants/notificationTypes';

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

    default:
      navigate(ROUTES.NOTIFICATIONS);
      break;
  }
}
