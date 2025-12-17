import type { VisitorRequest, RequestStatus, ParkingType, ParkingLocation } from '@/types/vms.types';
import type { VisitDetailsDto, VisitListItemDto, AwaitingVisitorDto, PendingApprovalDto, PendingHostWalkInDto } from '@/types/api.types';

export const API_STATUS_MAP: Record<string, RequestStatus> = {
  pending: 'pending_approval',
  pending_approval: 'pending_approval',
  pending_host_approval: 'pending_host_approval',
  approved: 'approved',
  rejected: 'rejected',
  checked_in: 'checked_in',
  checked_out: 'completed',
  cancelled: 'cancelled',
  expired: 'auto_cancelled',
  awaiting_visitor: 'visitor_pending',
  visitor_pending: 'visitor_pending',
  visitor_accepted: 'visitor_accepted',
  visitor_rejected: 'visitor_rejected',
  completed: 'completed',
  accepted: 'visitor_accepted',
};

export const isEmptyObject = (obj: any): boolean => {
  return obj && typeof obj === 'object' && Object.keys(obj).length === 0;
};

export const hasValidData = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  if (Object.keys(obj).length === 0) return false;
  return true;
};

export const resolveStatus = (apiStatus: string): RequestStatus => {
  return API_STATUS_MAP[apiStatus] || (apiStatus as RequestStatus) || 'pending_approval';
};

export const normalizeParkingLocation = (location: string | undefined): ParkingLocation => {
  if (!location) return '' as ParkingLocation;
  return (location.toLowerCase() === 'skbc_basement' ? 'skbc_basement' : location) as ParkingLocation;
};

export type VisitorRequestWithPending = VisitorRequest & {
  parkingPending?: boolean;
  meetingRoomPending?: boolean;
};

export const mapVisitDetailsToVisitorRequest = (visit: VisitDetailsDto): VisitorRequestWithPending => {
  return {
    id: visit.id,
    employeeId: visit.employeeId,
    employeeName: visit.employeeName || 'Unknown',
    employeeDepartment: visit.employeeDepartment,
    visitor: {
      id: visit.visitor?.id || 'unknown',
      fullName: visit.visitor?.fullName || 'Unknown Visitor',
      email: visit.visitor?.email || '',
      phone: visit.visitor?.phone || '',
      company: visit.visitor?.company,
    },
    visitDate: visit.visitDate || new Date().toISOString().split('T')[0],
    visitTime: visit.visitTime || '09:00',
    duration: visit.duration || '1 hour',
    endTime: visit.endTime,
    purpose: visit.purpose || '',
    status: resolveStatus(visit.status),
    communicationChannels: (visit.communicationChannels || ['email']) as ('email' | 'sms' | 'whatsapp' | 'qr_code')[],
    parkingType: (visit.parkingType || (hasValidData(visit.parkingAllocation) || hasValidData(visit.parkingSlot) ? 'auto' : 'none')) as ParkingType,
    parkingSlot: (hasValidData(visit.parkingAllocation) || hasValidData(visit.parkingSlot)) ? {
      id: visit.parkingAllocation?.id || visit.parkingSlot?.id || '',
      location: normalizeParkingLocation(visit.parkingAllocation?.location || visit.parkingSlot?.location),
      slotNumber: visit.parkingAllocation?.spotNumber || visit.parkingSlot?.slotNumber || '',
      floor: visit.parkingAllocation?.floor || visit.parkingSlot?.floor,
      status: visit.parkingAllocation?.status,
    } : undefined,
    parkingPending: (isEmptyObject(visit.parkingAllocation) || isEmptyObject(visit.parkingSlot)) &&
      !hasValidData(visit.parkingAllocation) && !hasValidData(visit.parkingSlot),
    meetingRoom: (hasValidData(visit.meetingBooking) || hasValidData(visit.meetingRoom)) ? {
      id: visit.meetingBooking?.roomId || visit.meetingRoom?.id || '',
      name: visit.meetingBooking?.roomName || visit.meetingRoom?.name || '',
      capacity: visit.meetingRoom?.capacity || 10,
      floor: visit.meetingRoom?.floor || '1',
      timeSlot: visit.meetingBooking
        ? `${visit.meetingBooking.startTime} - ${visit.meetingBooking.endTime}`
        : (visit.meetingRoom?.timeSlot || visit.visitTime || ''),
    } : undefined,
    meetingRoomPending: (isEmptyObject(visit.meetingBooking) || isEmptyObject(visit.meetingRoom)) &&
      !hasValidData(visit.meetingBooking) && !hasValidData(visit.meetingRoom),
    buffet: visit.buffet ? {
      id: visit.buffet.id,
      mealType: (visit.buffet.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snacks') || 'lunch',
      location: visit.buffet.location,
    } : undefined,
    valet: undefined,
    qrCode: visit.qrCode,
    approval: {
      requiresApproval: visit.approval?.requiresApproval ?? true,
      autoApproved: visit.approval?.autoApproved ?? false,
      managerId: visit.approval?.managerId,
      managerName: visit.approval?.managerName,
      approvedAt: visit.approval?.approvedAt,
      rejectedAt: visit.approval?.rejectedAt,
      rejectionReason: visit.approval?.rejectionReason,
      managerComment: visit.approval?.managerComment,
    },
    reminders: visit.reminders ? {
      firstReminderAt: visit.reminders.firstReminderAt,
      secondReminderAt: visit.reminders.secondReminderAt,
      autoCancelAt: visit.reminders.autoCancelAt,
      firstReminderSent: visit.reminders.firstReminderSent,
      secondReminderSent: visit.reminders.secondReminderSent,
    } : {},
    createdAt: visit.createdAt,
    updatedAt: visit.updatedAt,
    isWalkIn: visit.isWalkIn ?? false,
    acceptedAt: (visit as any).acceptedAt,
    checkedInAt: (visit as any).checkedInAt,
    completedAt: (visit as any).completedAt,
    cancelledAt: (visit as any).cancelledAt,
  };
};

export const mapVisitListItemToVisitorRequest = (visit: VisitListItemDto): VisitorRequest => {
  return {
    id: visit.id,
    employeeId: '',
    employeeName: visit.employeeName || 'Unknown Host',
    employeeDepartment: undefined,
    visitor: {
      id: '',
      fullName: visit.visitor?.fullName || 'Unknown Visitor',
      email: visit.visitor?.email || '',
      phone: visit.visitor?.phone || '',
      company: visit.visitor?.company,
    },
    visitDate: visit.visitDate,
    visitTime: visit.visitTime || '',
    duration: '1 hour',
    purpose: visit.purpose || '',
    status: resolveStatus(visit.status),
    communicationChannels: ['email'],
    parkingType: visit.hasParking ? 'auto' : 'none',
    parkingSlot: visit.hasParking ? { id: 'auto', location: 'SKBC_basement', slotNumber: 'TBD' } : undefined,
    meetingRoom: visit.hasMeetingRoom ? { id: 'auto', name: 'TBD', capacity: 10, floor: '1', timeSlot: visit.visitTime || '' } : undefined,
    buffet: visit.hasBuffet ? { id: 'auto', mealType: 'lunch', location: 'Main Buffet' } : undefined,
    valet: visit.hasValet ? { id: 'auto', pickupTime: visit.visitTime || '', returnTime: '', status: 'pending' } : undefined,
    qrCode: undefined,
    approval: {
      requiresApproval: true,
      autoApproved: false,
      approvedAt: visit.approvedAt,
    },
    reminders: {},
    createdAt: visit.createdAt || new Date().toISOString(),
    updatedAt: visit.createdAt || new Date().toISOString(),
    isWalkIn: visit.isWalkIn,
  };
};

export const mapAwaitingVisitorToVisitorRequest = (awaiting: AwaitingVisitorDto): VisitorRequest => {
  return {
    id: awaiting.id,
    employeeId: '',
    employeeName: awaiting.employeeName || 'Unknown Host',
    employeeDepartment: undefined,
    visitor: {
      id: awaiting.visitor?.id || '',
      fullName: awaiting.visitor?.fullName || 'Unknown Visitor',
      email: awaiting.visitor?.email || '',
      phone: awaiting.visitor?.phone || '',
      company: awaiting.visitor?.company,
    },
    visitDate: awaiting.visitDate,
    visitTime: awaiting.visitTime || '',
    duration: '1 hour',
    purpose: '',
    status: resolveStatus(awaiting.status),
    communicationChannels: ['email'],
    parkingType: 'none',
    approval: {
      requiresApproval: true,
      approvedAt: awaiting.approvedAt,
    },
    reminders: {},
    createdAt: awaiting.approvedAt,
    updatedAt: awaiting.approvedAt,
    isWalkIn: false,
  };
};

export const mapPendingApprovalToVisitorRequest = (item: PendingApprovalDto): VisitorRequest => {
  return {
    id: item.id,
    employeeId: '',
    employeeName: item.employeeName || 'Unknown Host',
    employeeDepartment: item.employeeDepartment,
    visitor: {
      id: item.visitor?.id || '',
      fullName: item.visitor?.fullName || 'Unknown Visitor',
      email: item.visitor?.email || '',
      phone: item.visitor?.phone || '',
      company: item.visitor?.company,
    },
    visitDate: item.visitDate,
    visitTime: item.visitTime || '',
    duration: item.duration || '1 hour',
    purpose: item.purpose || '',
    status: 'pending_approval' as RequestStatus,
    communicationChannels: ['email'],
    parkingType: item.hasParking ? 'auto' : 'none',
    meetingRoom: item.hasMeetingRoom ? { id: 'auto', name: 'TBD', capacity: 10, floor: '1', timeSlot: item.visitTime || '' } : undefined,
    buffet: item.hasBuffet ? { id: 'auto', mealType: 'lunch', location: 'Main Buffet' } : undefined,
    valet: item.hasValet ? { id: 'auto', pickupTime: item.visitTime || '', returnTime: '', status: 'pending' } : undefined,
    approval: {
      requiresApproval: true,
      approvedAt: undefined,
    },
    reminders: {},
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
    isWalkIn: item.isWalkIn ?? false,
  };
};

export const mapPendingHostWalkInToVisitorRequest = (item: PendingHostWalkInDto): VisitorRequest => {
  return {
    id: item.id,
    employeeId: (item as any).employeeId || '',
    employeeName: (item as any).employeeName || 'Unknown Host',
    employeeDepartment: (item as any).employeeDepartment,
    visitor: {
      id: item.visitor?.id || '',
      fullName: item.visitor?.fullName || 'Unknown Visitor',
      email: item.visitor?.email || '',
      phone: item.visitor?.phone || '',
      company: (item.visitor as any)?.company,
    },
    visitDate: item.visitDate,
    visitTime: item.visitTime || '',
    duration: item.duration || '1 hour',
    purpose: item.purpose || '',
    status: 'pending_host_approval' as RequestStatus,
    communicationChannels: ['email'],
    parkingType: 'none',
    approval: {
      requiresApproval: true,
      approvedAt: undefined,
    },
    reminders: {},
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
    isWalkIn: true,
  };
};

export const calculateDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 0.5) return '30 minutes';
  if (diffHours <= 1) return '1 hour';
  if (diffHours <= 1.5) return '1.5 hours';
  if (diffHours <= 2) return '2 hours';
  if (diffHours <= 3) return '3 hours';
  return '4 hours';
};

export const getDurationOptions = (t: (key: string) => string) => [
  { label: t('durations.thirtyMinutes'), value: '30 minutes' },
  { label: t('durations.oneHour'), value: '1 hour' },
  { label: t('durations.oneAndHalfHours'), value: '1.5 hours' },
  { label: t('durations.twoHours'), value: '2 hours' },
  { label: t('durations.threeHours'), value: '3 hours' },
  { label: t('durations.fourHours'), value: '4 hours' },
];
