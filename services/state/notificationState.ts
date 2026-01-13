import { Notification, UserRole } from "@/types/vms.types";

let notifications: Notification[] = [];

export const getNotifications = () => notifications;

export const getNotificationsByRole = (userRole?: UserRole | string) => {
  if (!userRole) return notifications;
  
  return notifications.filter(n => {
    if (!n.targetRoles || n.targetRoles.length === 0) return true;
    return n.targetRoles.includes(userRole as UserRole);
  });
};

export const getUnreadCount = (userRole?: string) => {
  return getNotificationsByRole(userRole).filter(n => !n.read).length;
};

export const markAllAsRead = (userRole?: string) => {
  const roleNotifications = getNotificationsByRole(userRole);
  notifications = notifications.map(n => {
    if (roleNotifications.find(rn => rn.id === n.id)) {
      return { ...n, read: true };
    }
    return n;
  });
};

export const markAsRead = (notificationId: string) => {
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    notifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    return true;
  }
  return false;
};

export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
  const newNotification: Notification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
  };
  
  notifications.unshift(newNotification);
  return newNotification;
};

export const createApprovalNotification = (
  employeeName: string,
  visitorName: string,
  managerName: string,
  requestId: string,
  managerComment?: string
) => {
  return addNotification({
    type: 'request_approved',
    title: 'Request Approved',
    message: `Your visitor request for ${visitorName} has been approved by ${managerName}.${managerComment ? ` Comment: ${managerComment}` : ''}`,
    read: false,
    requestId,
    actionRequired: false,
    priority: 'high',
  });
};

export const createRejectionNotification = (
  employeeName: string,
  visitorName: string,
  managerName: string,
  requestId: string,
  reason: string,
  managerComment?: string
) => {
  return addNotification({
    type: 'request_rejected',
    title: 'Request Rejected',
    message: `Your visitor request for ${visitorName} was rejected by ${managerName}. Reason: ${reason}${managerComment ? `. Comment: ${managerComment}` : ''}`,
    read: false,
    requestId,
    actionRequired: true,
    priority: 'high',
  });
};

export const createPendingApprovalNotification = (
  employeeName: string,
  visitorName: string,
  requestId: string
) => {
  return addNotification({
    type: 'pending_approval',
    title: 'New Approval Request',
    message: `${employeeName} has submitted a visitor request for ${visitorName} that requires your approval.`,
    read: false,
    requestId,
    actionRequired: true,
    priority: 'high',
  });
};

export const createCancellationNotification = (
  cancelledByName: string,
  visitorName: string,
  requestId: string,
  cancelledByRole: 'employee' | 'manager' | 'receptionist'
) => {
  const roleLabel = cancelledByRole === 'employee' ? 'Employee' : 
                    cancelledByRole === 'manager' ? 'Manager' : 'Receptionist';
  
  return addNotification({
    type: 'request_cancelled',
    title: 'Request Cancelled',
    message: `${roleLabel} ${cancelledByName} has cancelled the visitor request for ${visitorName}.`,
    read: false,
    requestId,
    actionRequired: false,
    priority: 'medium',
  });
};

export const resetNotifications = () => {
  notifications = [];
};

export const createBuffetTaskNotification = (
  visitorName: string,
  location: string,
  time: string,
  taskId: string,
  assignedTo?: string
) => {
  if (assignedTo) {
    return addNotification({
      type: 'buffet_task_assigned',
      title: 'New Buffet Task Assigned',
      message: `You have been assigned a buffet task for ${visitorName} at ${location} at ${time}.`,
      read: false,
      requestId: taskId,
      actionRequired: true,
      priority: 'high',
      targetRoles: ['buffet_staff'],
    });
  }
  
  return addNotification({
    type: 'buffet_request_created',
    title: 'New Buffet Request',
    message: `New buffet request for ${visitorName} at ${location} at ${time}. Please assign staff.`,
    read: false,
    requestId: taskId,
    actionRequired: true,
    priority: 'medium',
    targetRoles: ['buffet_admin'],
  });
};

export const createBuffetStatusNotification = (
  visitorName: string,
  newStatus: string,
  taskId: string,
  staffName: string
) => {
  const statusLabels: Record<string, string> = {
    preparing: 'is now being prepared',
    ready: 'is ready for service',
    served: 'has been served',
  };
  
  const statusMessage = statusLabels[newStatus] || `status changed to ${newStatus}`;
  
  return addNotification({
    type: 'buffet_status_update',
    title: 'Buffet Status Update',
    message: `Buffet for ${visitorName} ${statusMessage}. Updated by ${staffName}.`,
    read: false,
    requestId: taskId,
    actionRequired: false,
    priority: 'low',
    targetRoles: ['buffet_admin', 'receptionist'],
  });
};
