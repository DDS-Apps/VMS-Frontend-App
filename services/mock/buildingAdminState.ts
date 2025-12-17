/**
 * Building Admin State Management
 * Master control panel for the entire VMS - aggregates data from all subsystems
 */

import { getVisitorRequests, getRequestsByStatus, getPendingApprovals } from './visitorRequestState';
import { 
  getBuffetRequests, 
  getBuffetStaff, 
  getBuffetLocations 
} from './buffetAdminState';
import { 
  getValetRequests, 
  getValetDrivers, 
  getParkingSlots 
} from './valetAdminState';
import { 
  getUsers, 
  getUsersByRole, 
  addUser, 
  updateUser, 
  deleteUser,
  User
} from './userMockData';
import { UserRole } from '@/types/vms.types';

export interface SystemStats {
  totalVisitors: number;
  activeRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  ongoingBuffets: number;
  activeValetOperations: number;
  totalUsers: number;
  activeUsers: number;
}

export interface RequestSummary {
  id: string;
  type: 'visitor' | 'buffet' | 'valet' | 'walk_in';
  visitorName: string;
  hostName: string;
  status: string;
  date: string;
  time: string;
  location?: string;
  canApprove: boolean;
  canReassign: boolean;
  canCancel: boolean;
}

export interface StaffOverview {
  buffetStaff: {
    total: number;
    onDuty: number;
    offDuty: number;
  };
  valetDrivers: {
    total: number;
    available: number;
    busy: number;
    offDuty: number;
  };
  security: {
    total: number;
    active: number;
  };
  receptionists: {
    total: number;
    active: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'visitor' | 'buffet' | 'valet' | 'user' | 'security';
  action: string;
  description: string;
  time: string;
  icon: string;
}

const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const getSystemStats = (): SystemStats => {
  const visitorRequests = getVisitorRequests();
  const buffetRequests = getBuffetRequests();
  const valetRequests = getValetRequests();
  const users = getUsers();
  const today = getToday();

  const todayVisitors = visitorRequests.filter(r => r.visitDate === today);
  
  const approvedRequests = visitorRequests.filter(r => r.status === 'approved').length;
  const pendingRequests = visitorRequests.filter(r => 
    r.status === 'pending_approval'
  ).length;
  const rejectedRequests = visitorRequests.filter(r => r.status === 'rejected').length;
  
  const ongoingBuffets = buffetRequests.filter(r => 
    r.status === 'pending' || r.status === 'in_progress'
  ).length;
  
  const activeValet = valetRequests.filter(r => 
    r.status === 'pending' || r.status === 'assigned' || r.status === 'parked' || r.status === 'ready_for_pickup'
  ).length;
  
  const activeUsers = users.filter(u => u.status === 'active').length;

  return {
    totalVisitors: todayVisitors.length,
    activeRequests: approvedRequests + pendingRequests,
    approvedRequests,
    pendingRequests,
    rejectedRequests,
    ongoingBuffets,
    activeValetOperations: activeValet,
    totalUsers: users.length,
    activeUsers,
  };
};

export const getAllRequests = (): RequestSummary[] => {
  const visitorRequests = getVisitorRequests();
  const buffetRequests = getBuffetRequests();
  const valetRequests = getValetRequests();

  const requests: RequestSummary[] = [];

  visitorRequests.forEach(r => {
    requests.push({
      id: r.id,
      type: 'visitor',
      visitorName: r.visitor.fullName,
      hostName: r.employeeName,
      status: r.status,
      date: r.visitDate,
      time: r.visitTime,
      location: r.purpose || 'Office Visit',
      canApprove: r.status === 'pending_approval',
      canReassign: false,
      canCancel: r.status !== 'cancelled' && r.status !== 'rejected' && r.status !== 'completed',
    });
  });

  buffetRequests.forEach(r => {
    requests.push({
      id: r.id,
      type: 'buffet',
      visitorName: r.visitorName,
      hostName: r.hostName,
      status: r.status,
      date: r.visitDate,
      time: r.timeSlot,
      location: r.location,
      canApprove: false,
      canReassign: r.status === 'pending' || r.status === 'in_progress',
      canCancel: r.status === 'pending' || r.status === 'in_progress',
    });
  });

  valetRequests.forEach(r => {
    requests.push({
      id: r.id,
      type: 'valet',
      visitorName: r.visitorName,
      hostName: r.hostName,
      status: r.status,
      date: r.visitDate,
      time: r.pickupTime,
      location: r.location,
      canApprove: false,
      canReassign: r.status === 'pending' || r.status === 'assigned',
      canCancel: r.status !== 'completed' && r.status !== 'cancelled',
    });
  });

  return requests.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });
};

export const getStaffOverview = (): StaffOverview => {
  const buffetStaff = getBuffetStaff();
  const valetDrivers = getValetDrivers();
  const users = getUsers();

  const securityUsers = users.filter(u => u.role === 'security');
  const receptionistUsers = users.filter(u => u.role === 'receptionist');

  return {
    buffetStaff: {
      total: buffetStaff.length,
      onDuty: buffetStaff.filter(s => s.status === 'on_duty').length,
      offDuty: buffetStaff.filter(s => s.status === 'off_duty').length,
    },
    valetDrivers: {
      total: valetDrivers.length,
      available: valetDrivers.filter(d => d.status === 'available').length,
      busy: valetDrivers.filter(d => d.status === 'busy').length,
      offDuty: valetDrivers.filter(d => d.status === 'off_duty').length,
    },
    security: {
      total: securityUsers.length,
      active: securityUsers.filter(u => u.status === 'active').length,
    },
    receptionists: {
      total: receptionistUsers.length,
      active: receptionistUsers.filter(u => u.status === 'active').length,
    },
  };
};

export const getRecentActivity = (): RecentActivity[] => {
  const visitorRequests = getVisitorRequests();
  const buffetRequests = getBuffetRequests();
  const valetRequests = getValetRequests();
  
  const activities: RecentActivity[] = [];

  visitorRequests.slice(0, 3).forEach(r => {
    activities.push({
      id: `activity_visitor_${r.id}`,
      type: 'visitor',
      action: r.status === 'approved' ? 'Request Approved' : r.status === 'pending_approval' ? 'New Request' : 'Status Updated',
      description: `${r.visitor.fullName} - ${r.employeeName}`,
      time: getRelativeTime(r.updatedAt || r.createdAt),
      icon: r.status === 'approved' ? 'check-circle' : 'user-plus',
    });
  });

  buffetRequests.slice(0, 2).forEach(r => {
    activities.push({
      id: `activity_buffet_${r.id}`,
      type: 'buffet',
      action: r.status === 'completed' ? 'Buffet Completed' : r.status === 'in_progress' ? 'Buffet Started' : 'New Buffet Request',
      description: `${r.visitorName} at ${r.location}`,
      time: getRelativeTime(r.createdAt),
      icon: 'coffee',
    });
  });

  valetRequests.slice(0, 2).forEach(r => {
    activities.push({
      id: `activity_valet_${r.id}`,
      type: 'valet',
      action: r.status === 'parked' ? 'Vehicle Parked' : r.status === 'assigned' ? 'Driver Assigned' : 'Valet Request',
      description: `${r.visitorName} - ${r.assignedDriver?.name || 'Unassigned'}`,
      time: getRelativeTime(r.updatedAt),
      icon: 'navigation',
    });
  });

  return activities.sort((a, b) => {
    const parseRelativeTime = (time: string) => {
      const match = time.match(/(\d+)/);
      if (!match) return 0;
      const num = parseInt(match[1]);
      if (time.includes('m')) return num;
      if (time.includes('h')) return num * 60;
      return num * 60 * 24;
    };
    return parseRelativeTime(a.time) - parseRelativeTime(b.time);
  });
};

const getRelativeTime = (isoString: string): string => {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
};

export const getUsersForAdmin = (): User[] => {
  return getUsers().filter(u => u.role !== 'visitor');
};

export const createUserAsAdmin = (userData: Omit<User, 'id' | 'createdAt'>): User => {
  return addUser(userData);
};

export const updateUserAsAdmin = (userId: string, updates: Partial<User>): User | null => {
  return updateUser(userId, updates);
};

export const deleteUserAsAdmin = (userId: string): boolean => {
  return deleteUser(userId);
};

export const toggleUserStatus = (userId: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    return updateUser(userId, { status: newStatus });
  }
  return null;
};

export const getLocationsSummary = () => {
  const buffetLocations = getBuffetLocations();
  const parkingSlots = getParkingSlots();

  return {
    buffetLocations: buffetLocations.map(loc => ({
      id: loc.id,
      name: loc.name,
      building: loc.building,
      floor: loc.floor,
      capacity: loc.capacity,
      activeStaff: loc.activeStaff,
      currentRequests: loc.currentRequests,
      status: loc.status,
    })),
    parkingZones: [
      {
        zone: 'Zone A - VIP',
        total: parkingSlots.filter(s => s.zone === 'Zone A - VIP').length,
        available: parkingSlots.filter(s => s.zone === 'Zone A - VIP' && s.status === 'available').length,
        occupied: parkingSlots.filter(s => s.zone === 'Zone A - VIP' && s.status === 'occupied').length,
      },
      {
        zone: 'Zone B - Standard',
        total: parkingSlots.filter(s => s.zone === 'Zone B - Standard').length,
        available: parkingSlots.filter(s => s.zone === 'Zone B - Standard' && s.status === 'available').length,
        occupied: parkingSlots.filter(s => s.zone === 'Zone B - Standard' && s.status === 'occupied').length,
      },
      {
        zone: 'Zone C - Overflow',
        total: parkingSlots.filter(s => s.zone === 'Zone C - Overflow').length,
        available: parkingSlots.filter(s => s.zone === 'Zone C - Overflow' && s.status === 'available').length,
        occupied: parkingSlots.filter(s => s.zone === 'Zone C - Overflow' && s.status === 'occupied').length,
      },
    ],
    totalParkingSlots: parkingSlots.length,
    availableParkingSlots: parkingSlots.filter(s => s.status === 'available').length,
  };
};

export const getSystemNotificationFilters = () => [
  { id: 'all', label: 'All', icon: 'bell' },
  { id: 'visitor', label: 'Visitors', icon: 'users' },
  { id: 'buffet', label: 'Buffet', icon: 'coffee' },
  { id: 'valet', label: 'Valet', icon: 'navigation' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'user', label: 'Users', icon: 'user-plus' },
];

export type { User };
