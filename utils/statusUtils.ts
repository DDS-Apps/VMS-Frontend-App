import { RequestStatus } from '@/types/vms.types';
import {
  REQUEST_STATUS,
  TASK_STATUS,
  VALET_STATUS,
  isStatusActive as isActiveFromConstants,
  isStatusCompleted as isCompletedFromConstants,
  isStatusCancelled as isCancelledFromConstants,
} from '@/constants/requestConstants';

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];
export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'out_of_service';
export type ValetStatus = typeof VALET_STATUS[keyof typeof VALET_STATUS];

export interface StatusConfig {
  color: string;
  icon: string;
  labelKey: string;
}

const REQUEST_STATUS_CONFIGS: Record<string, StatusConfig> = {
  [REQUEST_STATUS.DRAFT]: { color: 'muted', icon: 'file', labelKey: 'status.pending' },
  [REQUEST_STATUS.PENDING_APPROVAL]: { color: 'warning', icon: 'clock', labelKey: 'status.pending' },
  [REQUEST_STATUS.PENDING_HOST_APPROVAL]: { color: 'warning', icon: 'clock', labelKey: 'status.pendingHostApproval' },
  [REQUEST_STATUS.APPROVED]: { color: 'success', icon: 'check-circle', labelKey: 'status.approved' },
  [REQUEST_STATUS.REJECTED]: { color: 'error', icon: 'x-circle', labelKey: 'status.rejected' },
  [REQUEST_STATUS.CANCELLED]: { color: 'error', icon: 'slash', labelKey: 'status.cancelled' },
  [REQUEST_STATUS.AUTO_CANCELLED]: { color: 'error', icon: 'slash', labelKey: 'status.cancelled' },
  [REQUEST_STATUS.VISITOR_PENDING]: { color: 'warning', icon: 'user', labelKey: 'invitation.awaitingResponse' },
  [REQUEST_STATUS.VISITOR_ACCEPTED]: { color: 'success', icon: 'user-check', labelKey: 'invitation.visitorAccepted' },
  [REQUEST_STATUS.VISITOR_REJECTED]: { color: 'error', icon: 'user-x', labelKey: 'invitation.visitorDeclined' },
  [REQUEST_STATUS.CHECKED_IN]: { color: 'success', icon: 'log-in', labelKey: 'status.checkedIn' },
  [REQUEST_STATUS.COMPLETED]: { color: 'muted', icon: 'check', labelKey: 'status.completed' },
};

export const getRequestStatusConfig = (status: RequestStatus | string): StatusConfig => {
  return REQUEST_STATUS_CONFIGS[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
};

const TASK_STATUS_CONFIGS: Record<TaskStatus, StatusConfig> = {
  [TASK_STATUS.PENDING]: { color: 'warning', icon: 'clock', labelKey: 'status.pending' },
  [TASK_STATUS.ASSIGNED]: { color: 'info', icon: 'user', labelKey: 'status.assigned' },
  [TASK_STATUS.IN_PROGRESS]: { color: 'primary', icon: 'loader', labelKey: 'status.inProgress' },
  [TASK_STATUS.COMPLETED]: { color: 'success', icon: 'check-circle', labelKey: 'status.completed' },
  [TASK_STATUS.CANCELLED]: { color: 'error', icon: 'x-circle', labelKey: 'status.cancelled' },
};

export const getTaskStatusConfig = (status: TaskStatus): StatusConfig => {
  return TASK_STATUS_CONFIGS[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
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

const VALET_STATUS_CONFIGS: Record<string, StatusConfig> = {
  [VALET_STATUS.PENDING]: { color: 'warning', icon: 'clock', labelKey: 'status.pending' },
  [VALET_STATUS.ASSIGNED]: { color: 'info', icon: 'user', labelKey: 'status.assigned' },
  [VALET_STATUS.PICKING_UP]: { color: 'primary', icon: 'truck', labelKey: 'valet.pickupVehicle' },
  [VALET_STATUS.PARKED]: { color: 'success', icon: 'check-circle', labelKey: 'parking.parked' },
  [VALET_STATUS.RETURNING]: { color: 'primary', icon: 'truck', labelKey: 'valet.returnVehicle' },
  [VALET_STATUS.COMPLETED]: { color: 'success', icon: 'check-circle', labelKey: 'status.completed' },
  [VALET_STATUS.CANCELLED]: { color: 'error', icon: 'x-circle', labelKey: 'status.cancelled' },
};

export const getValetTaskStatusConfig = (status: string): StatusConfig => {
  return VALET_STATUS_CONFIGS[status] || { color: 'muted', icon: 'help-circle', labelKey: 'common.none' };
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

export const isRequestActive = isActiveFromConstants;

export const isRequestCompleted = isCompletedFromConstants;

export const isRequestCancelled = isCancelledFromConstants;

/**
 * Normalize boolean values that may come as strings from legacy APIs.
 * Returns true only for explicit boolean true or string "true".
 */
export const normalizeBoolean = (value: unknown): boolean => {
  if (value === true || value === 'true') return true;
  return false;
};

/**
 * Coalesce two potential boolean values, preferring the first if defined.
 * Handles string "true"/"false" from legacy APIs.
 */
export const coalesceBoolean = (primary: unknown, fallback: unknown): boolean => {
  if (primary === true || primary === 'true') return true;
  if (primary === false || primary === 'false') return false;
  if (fallback === true || fallback === 'true') return true;
  return false;
};
