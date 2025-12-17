/**
 * Security Visitor State
 * Security staff can only see expected visitors with essential information for verification
 */

export type SecurityVisitorStatus = 'expected' | 'checked_in' | 'checked_out' | 'cancelled';

export interface ParkingInfo {
  hasParking: boolean;
  slotNumber?: string;
  location?: string;
  floor?: string;
}

export interface ValetInfo {
  hasValet: boolean;
  driverName?: string;
  status?: 'pending' | 'assigned' | 'picked_up' | 'parked' | 'retrieved';
}

export interface MeetingRoomInfo {
  roomName: string;
  floor: string;
  timeSlot: string;
}

export interface SecurityVisitor {
  id: string;
  name: string;
  company: string;
  visitDate: string;
  visitTime: string;
  host: string;
  status: SecurityVisitorStatus;
  checkInTime?: string;
  checkOutTime?: string;
  parking: ParkingInfo;
  valet: ValetInfo;
  meetingRoom?: MeetingRoomInfo;
  cancelledAt?: string;
  cancelReason?: string;
}

export type GateEventResult = 'allowed' | 'denied';
export type GateEventMethod = 'qr' | 'manual' | 'badge';

export interface GateEvent {
  id: string;
  visitorId: string;
  visitorName: string;
  timestamp: string;
  result: GateEventResult;
  method: GateEventMethod;
  gate: string;
  reason?: string;
}

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
};

const today = getLocalDateString(new Date());

let mockExpectedVisitors: SecurityVisitor[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    company: 'TechCorp Inc.',
    visitDate: today,
    visitTime: '10:00 AM',
    host: 'Renad Al-Otaibi',
    status: 'expected',
    parking: { hasParking: true, slotNumber: 'B1-23', location: 'SKBC Basement', floor: 'B1' },
    valet: { hasValet: false },
    meetingRoom: { roomName: 'Executive Boardroom', floor: '3rd Floor', timeSlot: '10:00 AM - 12:00 PM' },
  },
  {
    id: '2',
    name: 'Michael Chen',
    company: 'Solutions Ltd.',
    visitDate: today,
    visitTime: '2:00 PM',
    host: 'Ahmed Hassan',
    status: 'expected',
    parking: { hasParking: false },
    valet: { hasValet: true, driverName: 'Mohammed Saleh', status: 'assigned' },
    meetingRoom: { roomName: 'Conference Room A', floor: '2nd Floor', timeSlot: '2:00 PM - 3:30 PM' },
  },
  {
    id: '3',
    name: 'Emma Williams',
    company: 'Consulting Group',
    visitDate: today,
    visitTime: '9:00 AM',
    host: 'Fatima Ali',
    status: 'checked_in',
    checkInTime: '8:55 AM',
    parking: { hasParking: true, slotNumber: 'B2-15', location: 'SKBC Basement', floor: 'B2' },
    valet: { hasValet: false },
    meetingRoom: { roomName: 'Meeting Room 3', floor: '1st Floor', timeSlot: '9:00 AM - 10:30 AM' },
  },
  {
    id: '4',
    name: 'David Brown',
    company: 'Finance Corp',
    visitDate: today,
    visitTime: '11:30 AM',
    host: 'Omar Khan',
    status: 'expected',
    parking: { hasParking: false },
    valet: { hasValet: false },
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    company: 'Marketing Plus',
    visitDate: today,
    visitTime: '3:00 PM',
    host: 'Nora Ahmed',
    status: 'expected',
    parking: { hasParking: true, slotNumber: 'RSM-42', location: 'Red Sea Mall', floor: 'P1' },
    valet: { hasValet: false },
    meetingRoom: { roomName: 'VIP Lounge', floor: '5th Floor', timeSlot: '3:00 PM - 4:00 PM' },
  },
  {
    id: '6',
    name: 'Robert Taylor',
    company: 'Global Tech',
    visitDate: today,
    visitTime: '1:00 PM',
    host: 'Khalid Mansour',
    status: 'checked_in',
    checkInTime: '12:58 PM',
    parking: { hasParking: false },
    valet: { hasValet: true, driverName: 'Ali Hassan', status: 'parked' },
    meetingRoom: { roomName: 'Conference Room B', floor: '2nd Floor', timeSlot: '1:00 PM - 2:30 PM' },
  },
  {
    id: '7',
    name: 'Jennifer Lee',
    company: 'Design Co.',
    visitDate: today,
    visitTime: '4:30 PM',
    host: 'Layla Ibrahim',
    status: 'expected',
    parking: { hasParking: true, slotNumber: 'B1-08', location: 'SKBC Basement', floor: 'B1' },
    valet: { hasValet: false },
  },
  {
    id: '8',
    name: 'Mohammed Ali',
    company: 'Consulting Experts',
    visitDate: today,
    visitTime: '10:30 AM',
    host: 'Amira Hassan',
    status: 'checked_out',
    checkInTime: '10:25 AM',
    checkOutTime: '11:45 AM',
    parking: { hasParking: true, slotNumber: 'B2-03', location: 'SKBC Basement', floor: 'B2' },
    valet: { hasValet: false },
    meetingRoom: { roomName: 'Meeting Room 1', floor: '1st Floor', timeSlot: '10:30 AM - 11:30 AM' },
  },
  {
    id: '9',
    name: 'Ahmed Al-Rashid',
    company: 'Global Consulting',
    visitDate: today,
    visitTime: '9:30 AM',
    host: 'Sarah Thompson',
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelReason: 'Meeting rescheduled',
    parking: { hasParking: true, slotNumber: 'B1-12', location: 'SKBC Basement', floor: 'B1' },
    valet: { hasValet: false },
    meetingRoom: { roomName: 'Conference Room C', floor: '3rd Floor', timeSlot: '9:30 AM - 11:00 AM' },
  },
  {
    id: '10',
    name: 'James Wilson',
    company: 'Tech Innovations',
    visitDate: today,
    visitTime: '11:00 AM',
    host: 'Fatima Ahmed',
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelReason: 'Visitor cancelled',
    parking: { hasParking: false },
    valet: { hasValet: true, driverName: 'Khalid Omar', status: 'pending' },
  },
];

const now = new Date();
let mockGateEvents: GateEvent[] = [
  {
    id: 'ge_001',
    visitorId: '3',
    visitorName: 'Emma Williams',
    timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    result: 'allowed',
    method: 'qr',
    gate: 'Main Entrance',
  },
  {
    id: 'ge_002',
    visitorId: '6',
    visitorName: 'Robert Taylor',
    timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    result: 'allowed',
    method: 'manual',
    gate: 'Main Entrance',
  },
  {
    id: 'ge_003',
    visitorId: '8',
    visitorName: 'Mohammed Ali',
    timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    result: 'allowed',
    method: 'qr',
    gate: 'Main Entrance',
  },
  {
    id: 'ge_004',
    visitorId: '8',
    visitorName: 'Mohammed Ali',
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    result: 'allowed',
    method: 'badge',
    gate: 'Main Exit',
  },
  {
    id: 'ge_005',
    visitorId: 'unknown_001',
    visitorName: 'Unknown Visitor',
    timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    result: 'denied',
    method: 'qr',
    gate: 'Side Entrance',
    reason: 'Invalid QR code',
  },
  {
    id: 'ge_006',
    visitorId: 'unknown_002',
    visitorName: 'John Doe',
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    result: 'denied',
    method: 'manual',
    gate: 'Main Entrance',
    reason: 'Not on visitor list',
  },
];

/**
 * Get all expected visitors for today (Security view)
 */
export function getExpectedVisitors(): SecurityVisitor[] {
  return mockExpectedVisitors.map(v => ({ ...v }));
}

/**
 * Get visitors grouped by status for dashboard
 */
export function getVisitorsByStatus(): {
  expected: SecurityVisitor[];
  checkedIn: SecurityVisitor[];
  checkedOut: SecurityVisitor[];
  cancelled: SecurityVisitor[];
} {
  const visitors = getExpectedVisitors();
  return {
    expected: visitors.filter(v => v.status === 'expected'),
    checkedIn: visitors.filter(v => v.status === 'checked_in'),
    checkedOut: visitors.filter(v => v.status === 'checked_out'),
    cancelled: visitors.filter(v => v.status === 'cancelled'),
  };
}

/**
 * Get visitor counts by status
 */
export function getVisitorStatusCounts(): {
  expected: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  total: number;
} {
  const groups = getVisitorsByStatus();
  return {
    expected: groups.expected.length,
    checkedIn: groups.checkedIn.length,
    checkedOut: groups.checkedOut.length,
    cancelled: groups.cancelled.length,
    total: mockExpectedVisitors.length,
  };
}

/**
 * Get a single visitor by ID
 */
export function getSecurityVisitorById(visitorId: string): SecurityVisitor | undefined {
  return mockExpectedVisitors.find(v => v.id === visitorId);
}

/**
 * Check in a visitor and log gate event
 */
export function checkInSecurityVisitor(visitorId: string, method: GateEventMethod = 'manual'): void {
  const currentTime = formatTime(new Date());
  const visitor = mockExpectedVisitors.find(v => v.id === visitorId);
  
  if (visitor) {
    mockExpectedVisitors = mockExpectedVisitors.map(v =>
      v.id === visitorId
        ? { ...v, status: 'checked_in' as const, checkInTime: currentTime }
        : { ...v }
    );
    
    logGateEvent({
      visitorId,
      visitorName: visitor.name,
      result: 'allowed',
      method,
      gate: 'Main Entrance',
    });
  }
}

/**
 * Check out a visitor and log gate event
 */
export function checkOutSecurityVisitor(visitorId: string, method: GateEventMethod = 'manual'): void {
  const currentTime = formatTime(new Date());
  const visitor = mockExpectedVisitors.find(v => v.id === visitorId);
  
  if (visitor) {
    mockExpectedVisitors = mockExpectedVisitors.map(v =>
      v.id === visitorId
        ? { ...v, status: 'checked_out' as const, checkOutTime: currentTime }
        : { ...v }
    );
    
    logGateEvent({
      visitorId,
      visitorName: visitor.name,
      result: 'allowed',
      method,
      gate: 'Main Exit',
    });
  }
}

/**
 * Log a gate event
 */
export function logGateEvent(event: Omit<GateEvent, 'id' | 'timestamp'>): void {
  const newEvent: GateEvent = {
    id: `ge_${Date.now()}`,
    timestamp: getTimestamp(),
    ...event,
  };
  mockGateEvents = [newEvent, ...mockGateEvents];
}

/**
 * Log a denied gate event
 */
export function logDeniedGateEvent(
  visitorName: string,
  method: GateEventMethod,
  gate: string,
  reason: string
): void {
  logGateEvent({
    visitorId: `denied_${Date.now()}`,
    visitorName,
    result: 'denied',
    method,
    gate,
    reason,
  });
}

/**
 * Get all gate events
 */
export function getGateEvents(): GateEvent[] {
  return mockGateEvents.map(e => ({ ...e }));
}

/**
 * Get gate events filtered by result
 */
export function getGateEventsByResult(result: GateEventResult): GateEvent[] {
  return mockGateEvents.filter(e => e.result === result).map(e => ({ ...e }));
}

/**
 * Get recent gate events (last N events)
 */
export function getRecentGateEvents(limit: number = 20): GateEvent[] {
  return mockGateEvents.slice(0, limit).map(e => ({ ...e }));
}

/**
 * Get gate event counts
 */
export function getGateEventCounts(): {
  allowed: number;
  denied: number;
  total: number;
} {
  const allowed = mockGateEvents.filter(e => e.result === 'allowed').length;
  const denied = mockGateEvents.filter(e => e.result === 'denied').length;
  return { allowed, denied, total: mockGateEvents.length };
}
