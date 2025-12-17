/**
 * Buffet Admin State Management
 * Manages buffet requests, staff, and locations for admin interface
 */

export type BuffetStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface BuffetRequest {
  id: string;
  visitorName: string;
  hostName: string;
  location: string;
  meetingRoom?: string;
  timeSlot: string;
  visitDate: string;
  guestCount: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  dietaryRequirements?: string[];
  status: BuffetStatus;
  notes?: string;
  assignedStaff?: string;
  assignedStaffId?: string;
  createdAt: string;
}

export interface LocationOverview {
  locationId: string;
  locationName: string;
  building: string;
  floor: string;
  eventsToday: number;
  totalGuests: number;
  statusBreakdown: {
    pending: number;
    preparing: number;
    ready: number;
    served: number;
    completed: number;
  };
}

export interface BuffetStaff {
  id: string;
  name: string;
  role: 'Chef' | 'Server' | 'Coordinator' | 'Kitchen Staff';
  status: 'on_duty' | 'off_duty';
  assignedLocation: string;
  phone: string;
  shift: string;
}

export interface BuffetLocation {
  id: string;
  name: string;
  capacity: number;
  activeStaff: number;
  currentRequests: number;
  building: string;
  floor: string;
  amenities: string[];
  status: 'active' | 'inactive';
}

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = getLocalDateString(new Date());

let mockBuffetRequests: BuffetRequest[] = [
  {
    id: 'br_001',
    visitorName: 'James Anderson',
    hostName: 'Ahmed Al-Rashid',
    location: 'Executive Dining Room',
    meetingRoom: 'Executive Suite A',
    timeSlot: '12:30 PM',
    visitDate: today,
    guestCount: 4,
    mealType: 'lunch',
    dietaryRequirements: ['Vegetarian', 'No nuts'],
    status: 'pending',
    notes: 'VIP guest - prefer Saudi cuisine',
    createdAt: '2025-11-24T09:00:00Z',
  },
  {
    id: 'br_002',
    visitorName: 'Maria Rodriguez',
    hostName: 'Fatima Al-Zahrani',
    location: 'Meeting Room A Catering',
    meetingRoom: 'Meeting Room A',
    timeSlot: '10:00 AM',
    visitDate: today,
    guestCount: 2,
    mealType: 'breakfast',
    status: 'preparing',
    assignedStaff: 'Chef Mohammed Al-Farsi',
    assignedStaffId: 'staff_001',
    createdAt: '2025-11-24T08:00:00Z',
  },
  {
    id: 'br_003',
    visitorName: 'Liu Wei',
    hostName: 'Sarah Johnson',
    location: 'Conference Hall Buffet',
    meetingRoom: 'Conference Hall B',
    timeSlot: '1:00 PM',
    visitDate: today,
    guestCount: 6,
    mealType: 'lunch',
    dietaryRequirements: ['Halal', 'Gluten-free'],
    status: 'ready',
    notes: 'Important client meeting',
    assignedStaff: 'Chef Ali Hassan',
    assignedStaffId: 'staff_002',
    createdAt: '2025-11-24T10:00:00Z',
  },
  {
    id: 'br_004',
    visitorName: 'Sophie Martin',
    hostName: 'Khalid Ibrahim',
    location: 'Boardroom Dining',
    meetingRoom: 'Boardroom',
    timeSlot: '3:00 PM',
    visitDate: today,
    guestCount: 8,
    mealType: 'snacks',
    status: 'completed',
    assignedStaff: 'Chef Ali Hassan',
    assignedStaffId: 'staff_002',
    createdAt: '2025-11-24T11:00:00Z',
  },
  {
    id: 'br_005',
    visitorName: 'David Kim',
    hostName: 'Omar Hassan',
    location: 'Executive Dining Room',
    meetingRoom: 'Executive Suite B',
    timeSlot: '12:00 PM',
    visitDate: today,
    guestCount: 3,
    mealType: 'lunch',
    status: 'served',
    assignedStaff: 'Chef Ali Hassan',
    assignedStaffId: 'staff_002',
    createdAt: '2025-11-23T09:00:00Z',
  },
  {
    id: 'br_006',
    visitorName: 'Emily Chen',
    hostName: 'Nora Ahmed',
    location: 'VIP Lounge Catering',
    meetingRoom: 'VIP Lounge',
    timeSlot: '2:30 PM',
    visitDate: today,
    guestCount: 5,
    mealType: 'lunch',
    dietaryRequirements: ['Vegetarian'],
    status: 'preparing',
    assignedStaff: 'Chef Mohammed Al-Farsi',
    assignedStaffId: 'staff_001',
    createdAt: '2025-11-24T12:00:00Z',
  },
  {
    id: 'br_007',
    visitorName: 'Robert Taylor',
    hostName: 'Layla Ibrahim',
    location: 'Garden Terrace Dining',
    meetingRoom: 'Garden Terrace',
    timeSlot: '4:00 PM',
    visitDate: today,
    guestCount: 10,
    mealType: 'snacks',
    status: 'pending',
    createdAt: '2025-11-24T13:00:00Z',
  },
];

let mockBuffetStaff: BuffetStaff[] = [
  {
    id: 'staff_001',
    name: 'Chef Mohammed Al-Farsi',
    role: 'Chef',
    status: 'on_duty',
    assignedLocation: 'Executive Dining Room',
    phone: '+966 50 123 4567',
    shift: '8:00 AM - 4:00 PM',
  },
  {
    id: 'staff_002',
    name: 'Chef Ali Hassan',
    role: 'Chef',
    status: 'on_duty',
    assignedLocation: 'Conference Hall Buffet',
    phone: '+966 50 234 5678',
    shift: '10:00 AM - 6:00 PM',
  },
  {
    id: 'staff_003',
    name: 'Fatima Al-Saud',
    role: 'Coordinator',
    status: 'on_duty',
    assignedLocation: 'All Locations',
    phone: '+966 50 345 6789',
    shift: '8:00 AM - 5:00 PM',
  },
  {
    id: 'staff_004',
    name: 'Omar Khalid',
    role: 'Server',
    status: 'on_duty',
    assignedLocation: 'VIP Lounge Catering',
    phone: '+966 50 456 7890',
    shift: '9:00 AM - 5:00 PM',
  },
  {
    id: 'staff_005',
    name: 'Sarah Ahmed',
    role: 'Server',
    status: 'off_duty',
    assignedLocation: 'Meeting Room A Catering',
    phone: '+966 50 567 8901',
    shift: '2:00 PM - 10:00 PM',
  },
  {
    id: 'staff_006',
    name: 'Khalid Al-Rashid',
    role: 'Kitchen Staff',
    status: 'on_duty',
    assignedLocation: 'Executive Dining Room',
    phone: '+966 50 678 9012',
    shift: '7:00 AM - 3:00 PM',
  },
  {
    id: 'staff_007',
    name: 'Layla Hassan',
    role: 'Server',
    status: 'off_duty',
    assignedLocation: 'Garden Terrace Dining',
    phone: '+966 50 789 0123',
    shift: '4:00 PM - 12:00 AM',
  },
];

let mockBuffetLocations: BuffetLocation[] = [
  {
    id: 'loc_001',
    name: 'Executive Dining Room',
    capacity: 20,
    activeStaff: 2,
    currentRequests: 2,
    building: 'Main Building',
    floor: 'Ground Floor',
    amenities: ['WiFi', 'Projector', 'Private'],
    status: 'active',
  },
  {
    id: 'loc_002',
    name: 'Conference Hall Buffet',
    capacity: 50,
    activeStaff: 1,
    currentRequests: 1,
    building: 'Conference Center',
    floor: '1st Floor',
    amenities: ['WiFi', 'Sound System', 'Large Screen'],
    status: 'active',
  },
  {
    id: 'loc_003',
    name: 'Meeting Room A Catering',
    capacity: 15,
    activeStaff: 0,
    currentRequests: 1,
    building: 'Building 2',
    floor: '2nd Floor',
    amenities: ['WiFi', 'Projector'],
    status: 'active',
  },
  {
    id: 'loc_004',
    name: 'Boardroom Dining',
    capacity: 12,
    activeStaff: 0,
    currentRequests: 1,
    building: 'Executive Tower',
    floor: 'Top Floor',
    amenities: ['WiFi', 'Projector', 'Video Conference'],
    status: 'active',
  },
  {
    id: 'loc_005',
    name: 'VIP Lounge Catering',
    capacity: 30,
    activeStaff: 1,
    currentRequests: 1,
    building: 'Main Building',
    floor: '5th Floor',
    amenities: ['WiFi', 'Mini Bar', 'Sound System'],
    status: 'active',
  },
  {
    id: 'loc_006',
    name: 'Garden Terrace Dining',
    capacity: 40,
    activeStaff: 0,
    currentRequests: 1,
    building: 'Building 3',
    floor: 'Rooftop',
    amenities: ['WiFi', 'Outdoor Seating', 'Projector'],
    status: 'active',
  },
];

export function getBuffetRequests(): BuffetRequest[] {
  return mockBuffetRequests.map(r => ({ ...r }));
}

export function getTodayBuffetRequests(): BuffetRequest[] {
  return mockBuffetRequests
    .filter(r => r.visitDate === today)
    .map(r => ({ ...r }));
}

export function getBuffetRequestStats() {
  const todayRequests = mockBuffetRequests.filter(r => r.visitDate === today);
  const inProgress = todayRequests.filter(r => 
    r.status === 'preparing' || r.status === 'ready' || r.status === 'served'
  ).length;
  return {
    pending: todayRequests.filter(r => r.status === 'pending').length,
    inProgress,
    preparing: todayRequests.filter(r => r.status === 'preparing').length,
    ready: todayRequests.filter(r => r.status === 'ready').length,
    served: todayRequests.filter(r => r.status === 'served').length,
    completed: todayRequests.filter(r => r.status === 'completed').length,
    total: todayRequests.length,
  };
}

export function updateBuffetRequestStatus(requestId: string, status: BuffetRequest['status']): void {
  mockBuffetRequests = mockBuffetRequests.map(r =>
    r.id === requestId ? { ...r, status } : r
  );
}

export function assignRequestToStaff(requestId: string, staffId: string, staffName: string): BuffetRequest | null {
  const request = mockBuffetRequests.find(r => r.id === requestId);
  if (request) {
    const updatedRequest: BuffetRequest = {
      ...request,
      assignedStaff: staffName,
      assignedStaffId: staffId,
      status: 'preparing',
    };
    mockBuffetRequests = mockBuffetRequests.map(r => 
      r.id === requestId ? updatedRequest : { ...r }
    );
    return { ...updatedRequest };
  }
  return null;
}

export function getOnDutyStaff(): BuffetStaff[] {
  return mockBuffetStaff.filter(s => s.status === 'on_duty').map(s => ({ ...s }));
}

export function getRequestsByStaffId(staffId: string): BuffetRequest[] {
  return mockBuffetRequests
    .filter(r => r.assignedStaffId === staffId)
    .map(r => ({ ...r }));
}

export function getBuffetStaff(): BuffetStaff[] {
  return mockBuffetStaff.map(s => ({ ...s }));
}

export function toggleStaffDutyStatus(staffId: string): void {
  mockBuffetStaff = mockBuffetStaff.map(s =>
    s.id === staffId
      ? { ...s, status: s.status === 'on_duty' ? 'off_duty' : 'on_duty' }
      : s
  );
}

export function getStaffStats() {
  return {
    onDuty: mockBuffetStaff.filter(s => s.status === 'on_duty').length,
    offDuty: mockBuffetStaff.filter(s => s.status === 'off_duty').length,
    total: mockBuffetStaff.length,
  };
}

export function getBuffetLocations(): BuffetLocation[] {
  return mockBuffetLocations.map(l => ({ ...l }));
}

export function updateBuffetLocation(locationId: string, updates: Partial<BuffetLocation>): void {
  mockBuffetLocations = mockBuffetLocations.map(l =>
    l.id === locationId ? { ...l, ...updates } : l
  );
}

export function getLocationStats() {
  return {
    active: mockBuffetLocations.filter(l => l.status === 'active').length,
    inactive: mockBuffetLocations.filter(l => l.status === 'inactive').length,
    totalCapacity: mockBuffetLocations.reduce((acc, l) => acc + l.capacity, 0),
  };
}

let currentStaffId: string | null = null;
let currentStaffName: string | null = null;

export function setCurrentStaff(staffId: string, staffName: string): void {
  currentStaffId = staffId;
  currentStaffName = staffName;
}

export function getCurrentStaff(): { id: string | null; name: string | null } {
  return { id: currentStaffId, name: currentStaffName };
}

export function clearCurrentStaff(): void {
  currentStaffId = null;
  currentStaffName = null;
}

export function getLocationOverviews(): LocationOverview[] {
  const todayRequests = mockBuffetRequests.filter(r => r.visitDate === today);
  
  return mockBuffetLocations.map(location => {
    const locationRequests = todayRequests.filter(r => r.location === location.name);
    
    return {
      locationId: location.id,
      locationName: location.name,
      building: location.building,
      floor: location.floor,
      eventsToday: locationRequests.length,
      totalGuests: locationRequests.reduce((sum, r) => sum + r.guestCount, 0),
      statusBreakdown: {
        pending: locationRequests.filter(r => r.status === 'pending').length,
        preparing: locationRequests.filter(r => r.status === 'preparing').length,
        ready: locationRequests.filter(r => r.status === 'ready').length,
        served: locationRequests.filter(r => r.status === 'served').length,
        completed: locationRequests.filter(r => r.status === 'completed').length,
      },
    };
  });
}

export function getBuffetOverviewStats() {
  const todayRequests = mockBuffetRequests.filter(r => r.visitDate === today);
  const activeLocations = mockBuffetLocations.filter(l => l.status === 'active').length;
  const totalGuests = todayRequests.reduce((sum, r) => sum + r.guestCount, 0);
  
  return {
    totalEvents: todayRequests.length,
    totalGuests,
    activeLocations,
    statusCounts: {
      pending: todayRequests.filter(r => r.status === 'pending').length,
      preparing: todayRequests.filter(r => r.status === 'preparing').length,
      ready: todayRequests.filter(r => r.status === 'ready').length,
      served: todayRequests.filter(r => r.status === 'served').length,
      completed: todayRequests.filter(r => r.status === 'completed').length,
    },
  };
}

export const BUFFET_STATUS_WORKFLOW: BuffetStatus[] = ['pending', 'preparing', 'ready', 'served', 'completed'];

export function getNextStatus(currentStatus: BuffetStatus): BuffetStatus | null {
  const currentIndex = BUFFET_STATUS_WORKFLOW.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= BUFFET_STATUS_WORKFLOW.length - 1) {
    return null;
  }
  return BUFFET_STATUS_WORKFLOW[currentIndex + 1];
}
