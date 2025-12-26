import type { VisitorRequest, ParkingType, RequestStatus } from '@/types/vms.types';
import type { VisitDetailsDto, VisitListItemDto, AwaitingVisitorDto, PendingApprovalDto, PendingHostWalkInDto, BuffetMealType } from '@/types/api.types';
import {
  API_STATUS_MAP,
  resolveStatus,
  normalizeParkingLocation,
  DEFAULT_COMMUNICATION_CHANNELS,
  DEFAULT_MEAL_TYPE,
  DEFAULT_DURATION,
  DURATION_OPTIONS,
  DEFAULT_PARKING_SLOT,
  DEFAULT_MEETING_ROOM,
  DEFAULT_BUFFET,
  DEFAULT_VALET,
} from '@/constants/requestConstants';

export { API_STATUS_MAP, resolveStatus, normalizeParkingLocation };

export const isEmptyObject = (obj: any): boolean => {
  return obj && typeof obj === 'object' && Object.keys(obj).length === 0;
};

export const hasValidData = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  if (Object.keys(obj).length === 0) return false;
  return true;
};

const formatIsoTimeAsDisplayed = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    }
    return isoString;
  } catch {
    return isoString;
  }
};

export type VisitorRequestWithPending = VisitorRequest & {
  parkingPending?: boolean;
  meetingRoomPending?: boolean;
  buffetPending?: boolean;
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
    visitTime: visit.visitTime 
      || (visit.meetingBooking?.startTime ? formatIsoTimeAsDisplayed(visit.meetingBooking.startTime) : '')
      || '09:00',
    duration: visit.duration || DEFAULT_DURATION,
    endTime: visit.endTime,
    purpose: visit.purpose || '',
    status: resolveStatus(visit.status),
    communicationChannels: (visit.communicationChannels || DEFAULT_COMMUNICATION_CHANNELS) as ('email' | 'sms' | 'whatsapp' | 'qr_code')[],
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
      capacity: visit.meetingRoom?.capacity || DEFAULT_MEETING_ROOM.capacity,
      floor: visit.meetingRoom?.floor || DEFAULT_MEETING_ROOM.floor,
      timeSlot: (visit.meetingBooking?.startTime && visit.meetingBooking?.endTime)
        ? `${formatIsoTimeAsDisplayed(visit.meetingBooking.startTime)} - ${formatIsoTimeAsDisplayed(visit.meetingBooking.endTime)}`
        : visit.meetingRoom?.timeSlot 
        || visit.visitTime 
        || '',
      status: visit.meetingBooking?.status,
    } : undefined,
    meetingRoomPending: (isEmptyObject(visit.meetingBooking) || isEmptyObject(visit.meetingRoom)) &&
      !hasValidData(visit.meetingBooking) && !hasValidData(visit.meetingRoom),
    buffet: hasValidData(visit.buffet) ? {
      id: visit.buffet!.id,
      mealType: (visit.buffet!.mealType as BuffetMealType) || DEFAULT_MEAL_TYPE,
      location: visit.buffet!.location,
      status: (visit.buffet as any)?.status,
    } : undefined,
    buffetPending: isEmptyObject(visit.buffet) && !hasValidData(visit.buffet),
    valet: undefined,
    qrCode: visit.qrCode,
    approval: {
      requiresApproval: visit.approval?.requiresApproval ?? true,
      autoApproved: visit.approval?.autoApproved ?? false,
      managerId: visit.approval?.managerId,
      managerName: visit.approval?.managerName,
      approvedAt: visit.approval?.approvedAt,
      rejectedAt: visit.rejection?.rejectedAt || visit.approval?.rejectedAt,
      rejectionReason: visit.rejection?.reason || visit.approval?.rejectionReason,
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
    timezone: visit.timezone,
    isWalkIn: visit.isWalkIn ?? false,
    notes: visit.notes,
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
    duration: DEFAULT_DURATION,
    purpose: visit.purpose || '',
    status: resolveStatus(visit.status),
    communicationChannels: DEFAULT_COMMUNICATION_CHANNELS,
    parkingType: visit.hasParking ? 'auto' : 'none',
    parkingSlot: visit.hasParking ? { ...DEFAULT_PARKING_SLOT } : undefined,
    meetingRoom: visit.hasMeetingRoom ? { ...DEFAULT_MEETING_ROOM, timeSlot: visit.visitTime || '' } : undefined,
    buffet: visit.hasBuffet ? { ...DEFAULT_BUFFET } : undefined,
    valet: visit.hasValet ? { ...DEFAULT_VALET, pickupTime: visit.visitTime || '' } : undefined,
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
    duration: DEFAULT_DURATION,
    purpose: '',
    status: resolveStatus(awaiting.status),
    communicationChannels: DEFAULT_COMMUNICATION_CHANNELS,
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
    duration: item.duration || DEFAULT_DURATION,
    purpose: item.purpose || '',
    status: API_STATUS_MAP.pending_approval,
    communicationChannels: DEFAULT_COMMUNICATION_CHANNELS,
    parkingType: item.hasParking ? 'auto' : 'none',
    meetingRoom: item.hasMeetingRoom ? { ...DEFAULT_MEETING_ROOM, timeSlot: item.visitTime || '' } : undefined,
    buffet: item.hasBuffet ? { ...DEFAULT_BUFFET } : undefined,
    valet: item.hasValet ? { ...DEFAULT_VALET, pickupTime: item.visitTime || '' } : undefined,
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
    duration: item.duration || DEFAULT_DURATION,
    purpose: item.purpose || '',
    status: API_STATUS_MAP.pending_host_approval,
    communicationChannels: DEFAULT_COMMUNICATION_CHANNELS,
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
  const diffMinutes = diffMs / (1000 * 60);

  for (const opt of DURATION_OPTIONS) {
    if (diffMinutes <= opt.minutes) return opt.value;
  }
  return DURATION_OPTIONS[DURATION_OPTIONS.length - 1].value;
};

export const getDurationOptions = (t: (key: string) => string) => [
  { label: t('durations.thirtyMinutes'), value: DURATION_OPTIONS[0].value },
  { label: t('durations.oneHour'), value: DURATION_OPTIONS[1].value },
  { label: t('durations.oneAndHalfHours'), value: DURATION_OPTIONS[2].value },
  { label: t('durations.twoHours'), value: DURATION_OPTIONS[3].value },
  { label: t('durations.threeHours'), value: DURATION_OPTIONS[4].value },
  { label: t('durations.fourHours'), value: DURATION_OPTIONS[5].value },
];
