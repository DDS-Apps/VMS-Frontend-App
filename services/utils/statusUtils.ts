import { RequestStatus } from '@/types/vms.types';

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'out_of_service';

export interface StatusConfig {
  color: string;
  icon: string;
  labelKey: string;
}

export const getRequestStatusConfig = (status: RequestStatus | string): StatusConfig => {
  const configs: Record<string, StatusConfig> = {
    draft: { color: 'muted', icon: 'file', labelKey: 'status.pending' },
    pending_approval: { color: 'warning', icon: 'clock', labelKey: 'status.pending' },
    approved: { color: 'success', icon: 'check-circle', labelKey: 'status.approved' },
    rejected: { color: 'error', icon: 'x-circle', labelKey: 'status.rejected' },
    cancelled: { color: 'error', icon: 'slash', labelKey: 'status.cancelled' },
    auto_cancelled: { color: 'error', icon: 'slash', labelKey: 'status.cancelled' },
    visitor_pending: { color: 'warning', icon: 'user', labelKey: 'invitation.awaitingResponse' },
    visitor_accepted: { color: 'success', icon: 'user-check', labelKey: 'invitation.visitorAccepted' },
    visitor_rejected: { color: 'error', icon: 'user-x', labelKey: 'invitation.visitorDeclined' },
    checked_in: { color: 'success', icon: 'log-in', labelKey: 'status.checkedIn' },
    completed: { color: 'muted', icon: 'check', labelKey: 'status.completed' },
  };
  return configs[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
};

export const getTaskStatusConfig = (status: TaskStatus): StatusConfig => {
  const configs: Record<TaskStatus, StatusConfig> = {
    pending: { color: 'warning', icon: 'clock', labelKey: 'status.pending' },
    assigned: { color: 'info', icon: 'user', labelKey: 'status.assigned' },
    in_progress: { color: 'primary', icon: 'loader', labelKey: 'status.inProgress' },
    completed: { color: 'success', icon: 'check-circle', labelKey: 'status.completed' },
    cancelled: { color: 'error', icon: 'x-circle', labelKey: 'status.cancelled' },
  };
  return configs[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
};

export const getRoomStatusConfig = (status: RoomStatus): StatusConfig => {
  const configs: Record<RoomStatus, StatusConfig> = {
    available: { color: 'success', icon: 'check-circle', labelKey: 'status.available' },
    occupied: { color: 'error', icon: 'users', labelKey: 'status.occupied' },
    reserved: { color: 'warning', icon: 'calendar', labelKey: 'status.reserved' },
    maintenance: { color: 'muted', icon: 'tool', labelKey: 'status.maintenance' },
    out_of_service: { color: 'error', icon: 'alert-triangle', labelKey: 'status.inactive' },
  };
  return configs[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
};

export const getParkingStatusConfig = (status: string): StatusConfig => {
  const configs: Record<string, StatusConfig> = {
    available: { color: 'success', icon: 'check-circle', labelKey: 'status.available' },
    occupied: { color: 'error', icon: 'car', labelKey: 'status.occupied' },
    reserved: { color: 'warning', icon: 'bookmark', labelKey: 'status.reserved' },
    maintenance: { color: 'muted', icon: 'tool', labelKey: 'status.maintenance' },
  };
  return configs[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
};

export const getValetTaskStatusConfig = (status: string): StatusConfig => {
  const configs: Record<string, StatusConfig> = {
    pending: { color: 'warning', icon: 'clock', labelKey: 'status.pending' },
    assigned: { color: 'info', icon: 'user', labelKey: 'status.assigned' },
    picking_up: { color: 'primary', icon: 'truck', labelKey: 'valet.pickupVehicle' },
    parked: { color: 'success', icon: 'check-circle', labelKey: 'parking.parked' },
    returning: { color: 'primary', icon: 'truck', labelKey: 'valet.returnVehicle' },
    completed: { color: 'success', icon: 'check-circle', labelKey: 'status.completed' },
    cancelled: { color: 'error', icon: 'x-circle', labelKey: 'status.cancelled' },
  };
  return configs[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
};

export const getBuffetTaskStatusConfig = (status: string): StatusConfig => {
  const configs: Record<string, StatusConfig> = {
    pending: { color: 'warning', icon: 'clock', labelKey: 'status.pending' },
    preparing: { color: 'info', icon: 'loader', labelKey: 'status.inProgress' },
    ready: { color: 'success', icon: 'check-circle', labelKey: 'valet.readyForPickup' },
    served: { color: 'success', icon: 'check', labelKey: 'status.completed' },
    cancelled: { color: 'error', icon: 'x-circle', labelKey: 'status.cancelled' },
  };
  return configs[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
};

export const isRequestActive = (status: RequestStatus | string): boolean => {
  return ['pending_approval', 'approved', 'visitor_accepted', 'checked_in'].includes(status);
};

export const isRequestCompleted = (status: RequestStatus | string): boolean => {
  return ['completed'].includes(status);
};

export const isRequestCancelled = (status: RequestStatus | string): boolean => {
  return ['cancelled', 'auto_cancelled', 'rejected', 'visitor_rejected'].includes(status);
};
