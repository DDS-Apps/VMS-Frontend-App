import { VisitorRequest, ValetService } from "@/types/vms.types";
import { MOCK_VISITOR_REQUESTS } from "./approvalMockData";
import { createApprovalNotification, createRejectionNotification, createPendingApprovalNotification, createCancellationNotification } from "./notificationState";
import { updateTaskStatus as updateValetTaskStatus, getValetTasks } from "./valetMockData";

export interface VisitEventLog {
  id: string;
  requestId: string;
  eventType: 'created' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled' | 'visitor_accepted' | 'visitor_rejected' | 'checked_in' | 'checked_out';
  description: string;
  performedBy: string;
  performedByRole: 'employee' | 'manager' | 'visitor' | 'receptionist' | 'security' | 'system';
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

let visitEventLogs: VisitEventLog[] = [];

let visitorRequests = [...MOCK_VISITOR_REQUESTS];

export const getVisitorRequests = () => visitorRequests;

export const getRequestById = (id: string) => {
  return visitorRequests.find(req => req.id === id);
};

export const getPendingApprovals = () => {
  return visitorRequests.filter(req => req.status === 'pending_approval');
};

export const getRequestsByEmployee = (employeeId: string) => {
  return visitorRequests.filter(req => req.employeeId === employeeId);
};

export const getRequestsByManager = (managerId: string) => {
  return visitorRequests.filter(req => req.employeeId === managerId && req.approval.autoApproved === true);
};

export const getRequestsByStatus = (status: VisitorRequest['status']) => {
  return visitorRequests.filter(req => req.status === status);
};

export const getEventLogsByRequestId = (requestId: string): VisitEventLog[] => {
  return visitEventLogs.filter(log => log.requestId === requestId);
};

export const addEventLog = (log: Omit<VisitEventLog, 'id' | 'timestamp'>): VisitEventLog => {
  const newLog: VisitEventLog = {
    ...log,
    id: `LOG_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
  };
  visitEventLogs.push(newLog);
  return newLog;
};

const calculateReminderSchedule = (visitDateStr: string, visitTimeStr: string, workingHoursStart: number = 9, workingHoursEnd: number = 18) => {
  const visitDate = new Date(`${visitDateStr} ${visitTimeStr}`);
  
  let firstReminder = new Date(visitDate.getTime() - 2 * 60 * 60 * 1000);
  let secondReminder = new Date(visitDate.getTime() - 4 * 60 * 60 * 1000);
  let autoCancel = new Date(visitDate.getTime() - 5 * 60 * 60 * 1000);

  const adjustForWorkingHours = (date: Date) => {
    const hours = date.getHours();
    if (hours < workingHoursStart) {
      date.setDate(date.getDate() - 1);
      date.setHours(workingHoursEnd - 1, 0, 0, 0);
    } else if (hours >= workingHoursEnd) {
      date.setHours(workingHoursEnd - 1, 0, 0, 0);
    }
    return date;
  };

  return {
    firstReminderAt: adjustForWorkingHours(new Date(firstReminder)).toISOString(),
    secondReminderAt: adjustForWorkingHours(new Date(secondReminder)).toISOString(),
    autoCancelAt: adjustForWorkingHours(new Date(autoCancel)).toISOString(),
    firstReminderSent: false,
    secondReminderSent: false,
  };
};

export const approveRequest = (requestId: string, managerId: string, managerName: string, managerComment?: string) => {
  const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
  if (requestIndex === -1) return false;

  const request = visitorRequests[requestIndex];
  const now = new Date().toISOString();
  
  visitorRequests[requestIndex] = {
    ...request,
    status: 'approved',
    approval: {
      ...request.approval,
      managerId,
      managerName,
      approvedAt: now,
      autoApproved: false,
      managerComment,
    },
    reminders: calculateReminderSchedule(request.visitDate, request.visitTime),
    qrCode: `QR_${requestId}_visitor`,
    updatedAt: now,
  };

  addEventLog({
    requestId,
    eventType: 'approved',
    description: `Visit request approved by ${managerName}${managerComment ? `. Comment: ${managerComment}` : ''}`,
    performedBy: managerId,
    performedByRole: 'manager',
  });

  createApprovalNotification(
    request.employeeName,
    request.visitor.fullName,
    managerName,
    requestId,
    managerComment
  );

  return true;
};

export const rejectRequest = (requestId: string, managerId: string, managerName: string, reason: string, managerComment?: string) => {
  const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
  if (requestIndex === -1) return false;

  const request = visitorRequests[requestIndex];
  const now = new Date().toISOString();
  
  visitorRequests[requestIndex] = {
    ...request,
    status: 'rejected',
    approval: {
      ...request.approval,
      managerId,
      managerName,
      rejectedAt: now,
      rejectionReason: reason,
      managerComment,
    },
    updatedAt: now,
  };

  addEventLog({
    requestId,
    eventType: 'rejected',
    description: `Visit request rejected by ${managerName}. Reason: ${reason}${managerComment ? `. Comment: ${managerComment}` : ''}`,
    performedBy: managerId,
    performedByRole: 'manager',
  });

  createRejectionNotification(
    request.employeeName,
    request.visitor.fullName,
    managerName,
    requestId,
    reason,
    managerComment
  );

  return true;
};

export interface BulkActionResult {
  successCount: number;
  failedCount: number;
  failedIds: string[];
}

export const bulkApproveRequests = (
  requestIds: string[],
  managerId: string,
  managerName: string,
  managerComment?: string
): BulkActionResult => {
  const result: BulkActionResult = {
    successCount: 0,
    failedCount: 0,
    failedIds: [],
  };

  for (const requestId of requestIds) {
    const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1 || visitorRequests[requestIndex].status !== 'pending_approval') {
      result.failedCount++;
      result.failedIds.push(requestId);
      continue;
    }

    const request = visitorRequests[requestIndex];
    const now = new Date().toISOString();

    visitorRequests[requestIndex] = {
      ...request,
      status: 'approved',
      approval: {
        ...request.approval,
        managerId,
        managerName,
        approvedAt: now,
        autoApproved: false,
        managerComment,
      },
      reminders: {
        firstReminderAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        secondReminderAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        autoCancelAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        firstReminderSent: false,
        secondReminderSent: false,
      },
      qrCode: `QR_${requestId}_visitor`,
      updatedAt: now,
    };

    addEventLog({
      requestId,
      eventType: 'approved',
      description: `Visit request bulk approved by ${managerName}${managerComment ? `. Comment: ${managerComment}` : ''}`,
      performedBy: managerId,
      performedByRole: 'manager',
    });

    createApprovalNotification(
      request.employeeName,
      request.visitor.fullName,
      managerName,
      requestId,
      managerComment
    );

    result.successCount++;
  }

  return result;
};

export const bulkRejectRequests = (
  requestIds: string[],
  managerId: string,
  managerName: string,
  reason: string,
  managerComment?: string
): BulkActionResult => {
  const result: BulkActionResult = {
    successCount: 0,
    failedCount: 0,
    failedIds: [],
  };

  for (const requestId of requestIds) {
    const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1 || visitorRequests[requestIndex].status !== 'pending_approval') {
      result.failedCount++;
      result.failedIds.push(requestId);
      continue;
    }

    const request = visitorRequests[requestIndex];
    const now = new Date().toISOString();

    visitorRequests[requestIndex] = {
      ...request,
      status: 'rejected',
      approval: {
        ...request.approval,
        managerId,
        managerName,
        rejectedAt: now,
        rejectionReason: reason,
        managerComment,
      },
      updatedAt: now,
    };

    addEventLog({
      requestId,
      eventType: 'rejected',
      description: `Visit request bulk rejected by ${managerName}. Reason: ${reason}${managerComment ? `. Comment: ${managerComment}` : ''}`,
      performedBy: managerId,
      performedByRole: 'manager',
    });

    createRejectionNotification(
      request.employeeName,
      request.visitor.fullName,
      managerName,
      requestId,
      reason,
      managerComment
    );

    result.successCount++;
  }

  return result;
};

export const getPendingVisitorResponse = () => {
  return visitorRequests.filter(req => req.status === 'approved' && !req.visitorDecision);
};

export const getWalkInPendingApprovals = () => {
  return visitorRequests.filter(req => req.status === 'pending_approval' && req.isWalkIn === true);
};

export const visitorAcceptRequest = (requestId: string) => {
  const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
  if (requestIndex === -1) return false;

  const request = visitorRequests[requestIndex];
  const now = new Date().toISOString();
  
  visitorRequests[requestIndex] = {
    ...request,
    status: 'visitor_accepted',
    visitorDecision: {
      accepted: true,
      decidedAt: now,
    },
    acceptedAt: now,
    updatedAt: now,
  };

  addEventLog({
    requestId,
    eventType: 'visitor_accepted',
    description: `${request.visitor.fullName} accepted the visit invitation`,
    performedBy: request.visitor.id,
    performedByRole: 'visitor',
  });

  return true;
};

export const visitorRejectRequest = (requestId: string, reason?: string) => {
  const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
  if (requestIndex === -1) return false;

  const request = visitorRequests[requestIndex];
  const now = new Date().toISOString();
  
  visitorRequests[requestIndex] = {
    ...request,
    status: 'visitor_rejected',
    visitorDecision: {
      accepted: false,
      decidedAt: now,
      reason,
    },
    updatedAt: now,
  };

  addEventLog({
    requestId,
    eventType: 'visitor_rejected',
    description: `${request.visitor.fullName} rejected the visit invitation${reason ? `. Reason: ${reason}` : ''}`,
    performedBy: request.visitor.id,
    performedByRole: 'visitor',
  });

  return true;
};

export const cancelRequest = (
  requestId: string, 
  cancelledBy: string, 
  cancelledByName: string,
  cancelledByRole: 'employee' | 'manager' | 'receptionist' = 'employee'
) => {
  const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
  if (requestIndex === -1) return false;

  const request = visitorRequests[requestIndex];
  const now = new Date().toISOString();
  
  visitorRequests[requestIndex] = {
    ...request,
    status: 'cancelled',
    cancelledBy,
    cancelledByName,
    cancelledAt: now,
    updatedAt: now,
  };

  addEventLog({
    requestId,
    eventType: 'cancelled',
    description: `Visit cancelled by ${cancelledByName}`,
    performedBy: cancelledBy,
    performedByRole: cancelledByRole,
  });

  createCancellationNotification(
    cancelledByName,
    request.visitor.fullName,
    requestId,
    cancelledByRole
  );

  return true;
};

export const rescheduleRequest = (
  requestId: string,
  newDate: string,
  newTime: string,
  newDuration: string | undefined,
  rescheduledBy: string,
  rescheduledByName: string,
  rescheduledByRole: 'employee' | 'manager'
): boolean => {
  const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
  if (requestIndex === -1) return false;

  const request = visitorRequests[requestIndex];
  const now = new Date().toISOString();
  
  const previousValue = `${request.visitDate} ${request.visitTime}`;
  const newValue = `${newDate} ${newTime}`;

  const updatedRequest: VisitorRequest = {
    ...request,
    visitDate: newDate,
    visitTime: newTime,
    duration: newDuration || request.duration,
    reminders: calculateReminderSchedule(newDate, newTime),
    needsResourceReallocation: true,
    updatedAt: now,
  };

  if (updatedRequest.meetingRoom) {
    updatedRequest.meetingRoom = {
      ...updatedRequest.meetingRoom,
      timeSlot: `${newTime} - ${calculateEndTime(newTime, newDuration || request.duration)}`,
    };
  }

  visitorRequests[requestIndex] = updatedRequest;

  addEventLog({
    requestId,
    eventType: 'rescheduled',
    description: `Visit rescheduled by ${rescheduledByName} from ${previousValue} to ${newValue}`,
    performedBy: rescheduledBy,
    performedByRole: rescheduledByRole,
    previousValue,
    newValue,
  });

  return true;
};

export const cancelVisitWithCascade = (
  requestId: string, 
  cancelledBy: string, 
  cancelledByName: string,
  cancelledByRole: 'employee' | 'manager' | 'receptionist' = 'employee'
): VisitorRequest | null => {
  const requestIndex = visitorRequests.findIndex(req => req.id === requestId);
  if (requestIndex === -1) return null;

  const request = visitorRequests[requestIndex];
  const now = new Date().toISOString();
  
  visitorRequests[requestIndex] = {
    ...request,
    status: 'cancelled',
    cancelledBy,
    cancelledByName,
    cancelledAt: now,
    updatedAt: now,
  };

  if (request.valet && request.valet.id) {
    const valetTasks = getValetTasks();
    const associatedValetTask = valetTasks.find(task => task.requestId === requestId);
    if (associatedValetTask) {
      updateValetTaskStatus(associatedValetTask.id, 'cancelled' as ValetService['status']);
    }
  }

  addEventLog({
    requestId,
    eventType: 'cancelled',
    description: `Visit cancelled by ${cancelledByName}. Associated resources have been released.`,
    performedBy: cancelledBy,
    performedByRole: cancelledByRole,
  });

  createCancellationNotification(
    cancelledByName,
    request.visitor.fullName,
    requestId,
    cancelledByRole
  );

  return visitorRequests[requestIndex];
};

const calculateEndTime = (startTime: string, duration: string): string => {
  const timeMatch = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeMatch) return startTime;
  
  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  const durationMatch = duration.match(/(\d+\.?\d*)\s*(hour|hours|h)/i);
  const durationHours = durationMatch ? parseFloat(durationMatch[1]) : 1;
  
  let endHours = hours + Math.floor(durationHours);
  let endMinutes = minutes + Math.round((durationHours % 1) * 60);
  
  if (endMinutes >= 60) {
    endHours += Math.floor(endMinutes / 60);
    endMinutes = endMinutes % 60;
  }
  
  const endPeriod = endHours >= 12 ? 'PM' : 'AM';
  const displayHours = endHours > 12 ? endHours - 12 : (endHours === 0 ? 12 : endHours);
  
  return `${displayHours}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;
};

export const createRequest = (requestData: {
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  visitor: {
    fullName: string;
    email: string;
    phone: string;
    company?: string;
  };
  visitDate: string;
  visitTime: string;
  duration: string;
  purpose: string;
  communicationChannels: VisitorRequest['communicationChannels'];
  needsMeetingRoom?: boolean;
  needsParking?: boolean;
  needsBuffet?: boolean;
  needsValet?: boolean;
  asManager?: boolean;
}) => {
  const newId = `REQ_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = new Date().toISOString();
  
  const isAutoApproved = requestData.asManager === true;
  const reminderSchedule = isAutoApproved 
    ? calculateReminderSchedule(requestData.visitDate, requestData.visitTime)
    : { firstReminderAt: '', secondReminderAt: '', autoCancelAt: '' };
  
  const newRequest: VisitorRequest = {
    id: newId,
    employeeId: requestData.employeeId,
    employeeName: requestData.employeeName,
    employeeDepartment: requestData.employeeDepartment,
    visitor: {
      id: `VIS_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      fullName: requestData.visitor.fullName,
      email: requestData.visitor.email,
      phone: requestData.visitor.phone,
      company: requestData.visitor.company,
    },
    visitDate: requestData.visitDate,
    visitTime: requestData.visitTime,
    duration: requestData.duration,
    purpose: requestData.purpose,
    status: isAutoApproved ? 'approved' : 'pending_approval',
    communicationChannels: requestData.communicationChannels,
    parkingType: requestData.needsValet ? 'valet' : (requestData.needsParking ? 'auto' : 'none'),
    parkingSlot: (requestData.needsParking && !requestData.needsValet) ? {
      id: `PARK_${Date.now()}`,
      slotNumber: 'TBD',
      location: 'SKBC_basement',
      floor: 'B1',
    } : undefined,
    meetingRoom: requestData.needsMeetingRoom ? {
      id: `ROOM_${Date.now()}`,
      name: 'Conference Room (TBD)',
      floor: '3rd Floor',
      capacity: 8,
      timeSlot: `${requestData.visitTime}`,
    } : undefined,
    buffet: requestData.needsBuffet ? {
      id: `BUFF_${Date.now()}`,
      mealType: 'lunch',
      location: 'Cafeteria',
      dietaryPreferences: [],
    } : undefined,
    valet: requestData.needsValet ? {
      id: `VAL_${Date.now()}`,
      driver: undefined,
      pickupTime: requestData.visitTime,
      returnTime: requestData.visitTime,
      status: 'pending',
    } : undefined,
    approval: {
      requiresApproval: !isAutoApproved,
      managerId: isAutoApproved ? 'MGR_AUTO' : undefined,
      managerName: isAutoApproved ? requestData.employeeName : undefined,
      approvedAt: isAutoApproved ? now : undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
      managerComment: isAutoApproved ? 'Auto-approved (Manager Request)' : undefined,
      autoApproved: isAutoApproved,
    },
    reminders: {
      firstReminderAt: reminderSchedule.firstReminderAt,
      secondReminderAt: reminderSchedule.secondReminderAt,
      autoCancelAt: reminderSchedule.autoCancelAt,
      firstReminderSent: false,
      secondReminderSent: false,
    },
    qrCode: isAutoApproved ? `QR_${newId}_visitor` : undefined,
    createdAt: now,
    updatedAt: now,
  };
  
  visitorRequests.unshift(newRequest);
  
  addEventLog({
    requestId: newId,
    eventType: 'created',
    description: `Visit request created by ${requestData.employeeName} for ${requestData.visitor.fullName}${isAutoApproved ? ' (auto-approved)' : ''}`,
    performedBy: requestData.employeeId,
    performedByRole: isAutoApproved ? 'manager' : 'employee',
  });

  if (!isAutoApproved) {
    createPendingApprovalNotification(
      requestData.employeeName,
      requestData.visitor.fullName,
      newId
    );
  }
  
  return newRequest;
};

export const createWalkInRequest = (walkInData: {
  visitorId: string;
  visitorName: string;
  visitorCompany: string;
  visitorPhone: string;
  hostName: string;
  visitType?: string;
  purpose?: string;
}) => {
  const newId = `WALKIN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  const newRequest: VisitorRequest = {
    id: newId,
    employeeId: `HOST_${walkInData.hostName.replace(/\s+/g, '_').toUpperCase()}`,
    employeeName: walkInData.hostName,
    employeeDepartment: 'Reception Walk-In',
    visitor: {
      id: walkInData.visitorId,
      fullName: walkInData.visitorName,
      email: '',
      phone: walkInData.visitorPhone,
      company: walkInData.visitorCompany,
    },
    visitDate: today,
    visitTime: currentTime,
    duration: '1 hour',
    purpose: walkInData.purpose || walkInData.visitType || 'Walk-in Visit',
    status: 'pending_approval',
    communicationChannels: [],
    parkingType: 'none',
    approval: {
      requiresApproval: true,
      managerId: undefined,
      managerName: undefined,
      autoApproved: false,
    },
    reminders: {
      firstReminderAt: undefined,
      secondReminderAt: undefined,
      autoCancelAt: undefined,
      firstReminderSent: false,
      secondReminderSent: false,
    },
    isWalkIn: true,
    createdAt: now,
    updatedAt: now,
  };
  
  visitorRequests.unshift(newRequest);
  
  addEventLog({
    requestId: newId,
    eventType: 'created',
    description: `Walk-in visit request created for ${walkInData.visitorName} by receptionist`,
    performedBy: 'receptionist',
    performedByRole: 'receptionist',
  });

  createPendingApprovalNotification(
    walkInData.hostName,
    walkInData.visitorName,
    newId
  );
  
  return newRequest;
};

export const getAllEventLogs = (): VisitEventLog[] => {
  return [...visitEventLogs];
};

export const resetVisitorRequests = () => {
  visitorRequests = [...MOCK_VISITOR_REQUESTS];
  visitEventLogs = [];
};
