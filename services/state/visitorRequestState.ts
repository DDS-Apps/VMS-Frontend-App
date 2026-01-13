/**
 * Visitor Request State Management
 * Manages visitor request data for the VMS
 */

import { VisitorRequest, RequestStatus } from '@/types/vms.types';

const getToday = () => new Date().toISOString().split('T')[0];
const getTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

let visitorRequests: VisitorRequest[] = [
  {
    id: 'vr-001',
    employeeId: 'emp-001',
    employeeName: 'Ahmed Al-Rashid',
    employeeDepartment: 'Engineering',
    visitor: {
      id: 'v-001',
      fullName: 'Mohammed Hassan',
      email: 'mohammed.hassan@acme.com',
      phone: '+966501234567',
      company: 'ACME Corp',
    },
    visitDate: getToday(),
    visitTime: '10:00',
    duration: '2 hours',
    endTime: '12:00',
    purpose: 'Technical Discussion',
    status: 'pending_approval',
    communicationChannels: ['email', 'sms'],
    parkingType: 'auto',
    approval: {
      requiresApproval: true,
      managerId: 'mgr-001',
      managerName: 'Khalid Al-Fahad',
    },
    reminders: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr-002',
    employeeId: 'emp-002',
    employeeName: 'Sara Al-Qahtani',
    employeeDepartment: 'Marketing',
    visitor: {
      id: 'v-002',
      fullName: 'Fatima Al-Saud',
      email: 'fatima@partner.com',
      phone: '+966509876543',
      company: 'Partner Inc',
    },
    visitDate: getToday(),
    visitTime: '14:00',
    duration: '1 hour',
    endTime: '15:00',
    purpose: 'Partnership Meeting',
    status: 'approved',
    communicationChannels: ['email'],
    parkingType: 'valet',
    approval: {
      requiresApproval: true,
      managerId: 'mgr-002',
      managerName: 'Nora Al-Harbi',
      approvedAt: new Date().toISOString(),
    },
    reminders: {},
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr-003',
    employeeId: 'emp-003',
    employeeName: 'Omar Al-Rashid',
    employeeDepartment: 'Finance',
    visitor: {
      id: 'v-003',
      fullName: 'Ali bin Salman',
      email: 'ali@vendor.com',
      phone: '+966502223333',
      company: 'Vendor LLC',
    },
    visitDate: getTomorrow(),
    visitTime: '09:00',
    duration: '3 hours',
    endTime: '12:00',
    purpose: 'Audit Review',
    status: 'pending_approval',
    communicationChannels: ['email', 'whatsapp'],
    parkingType: 'auto',
    approval: {
      requiresApproval: true,
      managerId: 'mgr-001',
      managerName: 'Khalid Al-Fahad',
    },
    reminders: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr-004',
    employeeId: 'emp-001',
    employeeName: 'Ahmed Al-Rashid',
    employeeDepartment: 'Engineering',
    visitor: {
      id: 'v-004',
      fullName: 'Layla Al-Otaibi',
      email: 'layla@tech.com',
      phone: '+966504445555',
      company: 'Tech Solutions',
    },
    visitDate: getToday(),
    visitTime: '16:00',
    duration: '1 hour',
    endTime: '17:00',
    purpose: 'Product Demo',
    status: 'visitor_pending',
    communicationChannels: ['email', 'sms'],
    parkingType: 'none',
    approval: {
      requiresApproval: false,
      autoApproved: true,
    },
    reminders: {
      firstReminderAt: new Date(Date.now() + 3600000).toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr-005',
    employeeId: 'emp-004',
    employeeName: 'Huda Al-Shamsi',
    employeeDepartment: 'HR',
    visitor: {
      id: 'v-005',
      fullName: 'Yusuf Al-Maktoum',
      email: 'yusuf@candidate.com',
      phone: '+966506667777',
    },
    visitDate: getToday(),
    visitTime: '11:00',
    duration: '2 hours',
    endTime: '13:00',
    purpose: 'Job Interview',
    status: 'checked_in',
    communicationChannels: ['email'],
    parkingType: 'auto',
    approval: {
      requiresApproval: false,
      autoApproved: true,
    },
    reminders: {},
    checkedInAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr-006',
    employeeId: 'emp-002',
    employeeName: 'Sara Al-Qahtani',
    employeeDepartment: 'Marketing',
    visitor: {
      id: 'v-006',
      fullName: 'Nadia Al-Faisal',
      email: 'nadia@media.com',
      phone: '+966507778888',
      company: 'Media Group',
    },
    visitDate: getToday(),
    visitTime: '09:30',
    duration: '1.5 hours',
    endTime: '11:00',
    purpose: 'Press Interview',
    status: 'completed',
    communicationChannels: ['email', 'whatsapp'],
    parkingType: 'valet',
    approval: {
      requiresApproval: true,
      managerId: 'mgr-002',
      managerName: 'Nora Al-Harbi',
      approvedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    reminders: {},
    checkedInAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr-007',
    employeeId: 'emp-005',
    employeeName: 'Tariq Al-Dosari',
    employeeDepartment: 'IT',
    visitor: {
      id: 'v-007',
      fullName: 'Sami Al-Turki',
      email: 'sami@consultant.com',
      phone: '+966508889999',
      company: 'Consulting Firm',
    },
    visitDate: getToday(),
    visitTime: '13:00',
    duration: '4 hours',
    endTime: '17:00',
    purpose: 'System Integration',
    status: 'rejected',
    communicationChannels: ['email'],
    parkingType: 'auto',
    approval: {
      requiresApproval: true,
      managerId: 'mgr-003',
      managerName: 'Faisal Al-Naimi',
      rejectedAt: new Date(Date.now() - 3600000).toISOString(),
      rejectionReason: 'Visitor not on approved vendor list',
    },
    reminders: {},
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const getVisitorRequests = (): VisitorRequest[] => {
  return [...visitorRequests];
};

export const getRequestsByStatus = (status: RequestStatus | RequestStatus[]): VisitorRequest[] => {
  const statuses = Array.isArray(status) ? status : [status];
  return visitorRequests.filter(r => statuses.includes(r.status));
};

export const getPendingApprovals = (): VisitorRequest[] => {
  return visitorRequests.filter(r => 
    r.status === 'pending_approval' || r.status === 'pending_host_approval'
  );
};

export const getVisitorRequestById = (id: string): VisitorRequest | undefined => {
  return visitorRequests.find(r => r.id === id);
};

export const addVisitorRequest = (request: Omit<VisitorRequest, 'id' | 'createdAt' | 'updatedAt'>): VisitorRequest => {
  const newRequest: VisitorRequest = {
    ...request,
    id: `vr-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  visitorRequests = [...visitorRequests, newRequest];
  return newRequest;
};

export const updateVisitorRequest = (id: string, updates: Partial<VisitorRequest>): VisitorRequest | null => {
  const index = visitorRequests.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  const updated = {
    ...visitorRequests[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  visitorRequests = visitorRequests.map(r => r.id === id ? updated : r);
  return updated;
};

export const deleteVisitorRequest = (id: string): boolean => {
  const initialLength = visitorRequests.length;
  visitorRequests = visitorRequests.filter(r => r.id !== id);
  return visitorRequests.length < initialLength;
};

export const approveRequest = (id: string, managerId: string, managerName: string, comment?: string): VisitorRequest | null => {
  return updateVisitorRequest(id, {
    status: 'approved',
    approval: {
      ...visitorRequests.find(r => r.id === id)?.approval,
      requiresApproval: true,
      managerId,
      managerName,
      approvedAt: new Date().toISOString(),
      managerComment: comment,
    },
  });
};

export const rejectRequest = (id: string, managerId: string, managerName: string, reason: string): VisitorRequest | null => {
  return updateVisitorRequest(id, {
    status: 'rejected',
    approval: {
      ...visitorRequests.find(r => r.id === id)?.approval,
      requiresApproval: true,
      managerId,
      managerName,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    },
  });
};

export const checkInVisitor = (id: string): VisitorRequest | null => {
  return updateVisitorRequest(id, {
    status: 'checked_in',
    checkedInAt: new Date().toISOString(),
  });
};

export const completeVisit = (id: string): VisitorRequest | null => {
  return updateVisitorRequest(id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
};

export const cancelRequest = (id: string, cancelledBy: string, cancelledByName: string): VisitorRequest | null => {
  return updateVisitorRequest(id, {
    status: 'cancelled',
    cancelledBy,
    cancelledByName,
  });
};

export const resetVisitorRequests = () => {
  visitorRequests = [];
};
