export const NOTIFICATION_TYPES = {
  NEW_VISITOR_REQUEST: 'new_visitor_request',
  VISITOR_REQUEST_UPDATE: 'visitor_request_update',
  VISITOR_CHECK_IN: 'visitor_check_in',
  VISITOR_CHECK_OUT: 'visitor_check_out',
  APPROVAL_REQUIRED: 'approval_required',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_REJECTED: 'request_rejected',
  VISITOR_ACCEPTED: 'visitor_accepted',
  VISITOR_REJECTED: 'visitor_rejected',
  VISITOR_ARRIVED: 'visitor_arrived',
  VISITOR_DEPARTED: 'visitor_departed',

  BUFFET_TASK: 'buffet_task',
  BUFFET_ORDER: 'buffet_order',

  VALET_TASK: 'valet_task',
  VALET_ASSIGNMENT: 'valet_assignment',

  SECURITY_ALERT: 'security_alert',
  SECURITY_INCIDENT: 'security_incident',

  MEETING_ROOM: 'meeting_room',
  AMMAM_UPDATE: 'ammam_update',

  REMINDER: 'reminder',
  AUTO_CANCELLED: 'auto_cancelled',
  UPCOMING_VISIT: 'upcoming_visit',
} as const;

export type NotificationTypeKey = keyof typeof NOTIFICATION_TYPES;
export type NotificationType = (typeof NOTIFICATION_TYPES)[NotificationTypeKey];
