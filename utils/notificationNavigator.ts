import type { NotificationResponse } from 'expo-notifications';
import { navigate, isReady } from '@/navigation/navigationRef';

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
    case 'new_visitor_request':
    case 'visitor_request_update':
      if (data.requestId) {
        navigate('VisitDetails', { visitId: data.requestId });
      } else {
        navigate('Approvals');
      }
      break;

    case 'visitor_check_in':
    case 'visitor_check_out':
      if (data.requestId) {
        navigate('VisitDetails', { visitId: data.requestId });
      } else {
        navigate('TodaysVisitors');
      }
      break;

    case 'approval_required':
      navigate('Approvals');
      break;

    case 'buffet_task':
    case 'buffet_order':
      if (data.orderId) {
        navigate('BuffetOrderDetails', { orderId: data.orderId });
      } else {
        navigate('BuffetTasks');
      }
      break;

    case 'valet_task':
    case 'valet_assignment':
      if (data.taskId) {
        navigate('ValetTaskDetails', { taskId: data.taskId });
      } else {
        navigate('ValetTasks');
      }
      break;

    case 'security_alert':
    case 'security_incident':
      navigate('SecurityDashboard');
      break;

    case 'meeting_room':
    case 'ammam_update':
      if (data.roomId) {
        navigate('RoomDetails', { roomId: data.roomId });
      } else {
        navigate('MeetingRooms');
      }
      break;

    case 'reminder':
      if (data.requestId) {
        navigate('VisitDetails', { visitId: data.requestId });
      } else {
        navigate('Notifications');
      }
      break;

    default:
      navigate('Notifications');
      break;
  }
}
