import {
  MeetingRoomDetail,
  MeetingBooking,
  ValetZone,
  NotificationTemplate,
  ReminderRules,
  IntegrationHealth,
  BiometricSettings,
  ParkingBay,
  EmployeeParkingAssignment,
  ParkingOccupancyMetrics,
  AdminKPIMetric,
  VisitsAnalytics,
  ParkingAnalytics,
  ValetAnalytics,
  BuffetAnalytics,
  MeetingRoomFeature,
  NotificationEventType,
  RoomChangeLog,
} from '@/types/vms.types';

const getToday = () => new Date().toISOString().split('T')[0];
const getNow = () => new Date().toISOString();

let meetingRooms: MeetingRoomDetail[] = [
  {
    id: 'room_001',
    name: 'Majlis Al Shura',
    floor: '10',
    building: 'SKBC Tower',
    capacity: 20,
    features: ['projector', 'video_conferencing', 'audio_system', 'whiteboard', 'air_conditioning'],
    status: 'active',
    description: 'Executive boardroom with panoramic views',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: getNow(),
  },
  {
    id: 'room_002',
    name: 'Al Falak',
    floor: '8',
    building: 'SKBC Tower',
    capacity: 12,
    features: ['projector', 'whiteboard', 'tv_display', 'phone'],
    status: 'active',
    description: 'Medium conference room for team meetings',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: getNow(),
  },
  {
    id: 'room_003',
    name: 'Al Nakheel',
    floor: '5',
    building: 'SKBC Tower',
    capacity: 8,
    features: ['tv_display', 'whiteboard', 'natural_light'],
    status: 'active',
    description: 'Collaborative meeting space',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: getNow(),
  },
  {
    id: 'room_004',
    name: 'Al Bahar',
    floor: '3',
    building: 'SKBC Tower',
    capacity: 6,
    features: ['tv_display', 'phone'],
    status: 'maintenance',
    description: 'Small huddle room - under renovation',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: getNow(),
  },
  {
    id: 'room_005',
    name: 'Red Sea Hall',
    floor: 'G',
    building: 'Red Sea Mall',
    capacity: 50,
    features: ['projector', 'video_conferencing', 'audio_system', 'air_conditioning'],
    status: 'active',
    description: 'Large event hall for presentations',
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: getNow(),
  },
];

let meetingBookings: MeetingBooking[] = [
  {
    id: 'booking_001',
    roomId: 'room_001',
    roomName: 'Majlis Al Shura',
    hostId: 'emp_001',
    hostName: 'Ahmed Al-Rashid',
    hostDepartment: 'Executive',
    title: 'Board Meeting Q4 Review',
    date: getToday(),
    startTime: '09:00',
    endTime: '11:00',
    attendeesCount: 15,
    visitors: [
      { name: 'John Smith', company: 'Acme Corp' },
      { name: 'Sarah Johnson', company: 'Tech Solutions' },
    ],
    status: 'scheduled',
    createdAt: '2024-11-28T14:00:00Z',
  },
  {
    id: 'booking_002',
    roomId: 'room_002',
    roomName: 'Al Falak',
    hostId: 'emp_002',
    hostName: 'Fatima Al-Zahrani',
    hostDepartment: 'HR',
    title: 'Interview - Senior Developer',
    date: getToday(),
    startTime: '10:30',
    endTime: '11:30',
    attendeesCount: 4,
    visitors: [{ name: 'Mohammed Ali', company: 'Freelance' }],
    status: 'in_progress',
    createdAt: '2024-11-29T09:00:00Z',
  },
  {
    id: 'booking_003',
    roomId: 'room_003',
    roomName: 'Al Nakheel',
    hostId: 'emp_003',
    hostName: 'Khalid Ibrahim',
    hostDepartment: 'IT',
    title: 'Sprint Planning',
    date: getToday(),
    startTime: '14:00',
    endTime: '15:30',
    attendeesCount: 8,
    status: 'scheduled',
    createdAt: '2024-11-29T08:00:00Z',
  },
  {
    id: 'booking_004',
    roomId: 'room_001',
    roomName: 'Majlis Al Shura',
    hostId: 'emp_001',
    hostName: 'Ahmed Al-Rashid',
    hostDepartment: 'Executive',
    title: 'Vendor Presentation',
    date: getToday(),
    startTime: '14:00',
    endTime: '16:00',
    attendeesCount: 10,
    visitors: [
      { name: 'David Lee', company: 'Oracle' },
      { name: 'Emma Wilson', company: 'Oracle' },
    ],
    status: 'scheduled',
    createdAt: '2024-11-28T16:00:00Z',
  },
];

let valetZones: ValetZone[] = [
  {
    id: 'zone_001',
    name: 'SKBC Basement Level 1',
    type: 'basement',
    location: 'SKBC Tower',
    capacity: 100,
    currentOccupancy: 78,
    priorityOrder: 1,
    status: 'active',
    description: 'Main basement parking for SKBC employees',
    linkedEntrances: ['Main Lobby', 'Side Entrance'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: getNow(),
  },
  {
    id: 'zone_002',
    name: 'SKBC Basement Level 2',
    type: 'basement',
    location: 'SKBC Tower',
    capacity: 80,
    currentOccupancy: 45,
    priorityOrder: 2,
    status: 'active',
    description: 'Lower basement for overflow parking',
    linkedEntrances: ['Elevator B'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: getNow(),
  },
  {
    id: 'zone_003',
    name: 'VIP Parking',
    type: 'vip',
    location: 'SKBC Tower',
    capacity: 20,
    currentOccupancy: 12,
    priorityOrder: 0,
    status: 'active',
    description: 'Reserved VIP and executive parking',
    linkedEntrances: ['Executive Entrance'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: getNow(),
  },
  {
    id: 'zone_004',
    name: 'Red Sea Mall Lot',
    type: 'outdoor',
    location: 'Red Sea Mall',
    capacity: 200,
    currentOccupancy: 156,
    priorityOrder: 3,
    status: 'active',
    description: 'External lot at Red Sea Mall location',
    linkedEntrances: ['Mall Entrance A', 'Mall Entrance B'],
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: getNow(),
  },
  {
    id: 'zone_005',
    name: 'Covered Visitor Parking',
    type: 'covered',
    location: 'SKBC Tower',
    capacity: 50,
    currentOccupancy: 28,
    priorityOrder: 1,
    status: 'active',
    description: 'Shaded parking for visitors',
    linkedEntrances: ['Visitor Reception'],
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: getNow(),
  },
];

let notificationTemplates: NotificationTemplate[] = [
  {
    id: 'template_001',
    eventType: 'request_approved',
    name: 'Visit Request Approved',
    channels: { qr: true, whatsapp: true, sms: true, email: true },
    emailSubject: 'Your Visit to {{company}} is Confirmed',
    emailBody: 'Dear {{visitorName}},\n\nYour visit to {{company}} on {{visitDate}} at {{visitTime}} has been approved.\n\nHost: {{hostName}}\nLocation: {{location}}\n\nPlease present the QR code upon arrival.',
    smsTemplate: 'Visit confirmed: {{company}} on {{visitDate}} at {{visitTime}}. Host: {{hostName}}. Show QR at entry.',
    whatsappTemplate: 'Your visit to {{company}} is confirmed for {{visitDate}} at {{visitTime}}. Your host {{hostName}} is expecting you.',
    placeholders: ['visitorName', 'company', 'visitDate', 'visitTime', 'hostName', 'location'],
    isActive: true,
    updatedAt: getNow(),
  },
  {
    id: 'template_002',
    eventType: 'request_rejected',
    name: 'Visit Request Rejected',
    channels: { qr: false, whatsapp: true, sms: false, email: true },
    emailSubject: 'Visit Request Update',
    emailBody: 'Dear {{visitorName}},\n\nUnfortunately, your visit request for {{visitDate}} could not be approved.\n\nReason: {{rejectionReason}}\n\nPlease contact {{hostName}} for alternative arrangements.',
    placeholders: ['visitorName', 'visitDate', 'hostName', 'rejectionReason'],
    isActive: true,
    updatedAt: getNow(),
  },
  {
    id: 'template_003',
    eventType: 'parking_assigned',
    name: 'Parking Space Assigned',
    channels: { qr: true, whatsapp: true, sms: true, email: false },
    smsTemplate: 'Parking assigned: Bay {{bayNumber}}, {{zone}}. Floor {{floor}}.',
    whatsappTemplate: 'Your parking has been assigned:\nBay: {{bayNumber}}\nZone: {{zone}}\nFloor: {{floor}}',
    placeholders: ['bayNumber', 'zone', 'floor'],
    isActive: true,
    updatedAt: getNow(),
  },
  {
    id: 'template_004',
    eventType: 'valet_assigned',
    name: 'Valet Driver Assigned',
    channels: { qr: false, whatsapp: true, sms: true, email: false },
    smsTemplate: 'Valet assigned: {{driverName}} ({{driverPhone}}) will meet you at {{location}}.',
    whatsappTemplate: 'Your valet driver {{driverName}} has been assigned. Contact: {{driverPhone}}. Meet at {{location}}.',
    placeholders: ['driverName', 'driverPhone', 'location'],
    isActive: true,
    updatedAt: getNow(),
  },
  {
    id: 'template_005',
    eventType: 'buffet_created',
    name: 'Buffet Request Created',
    channels: { qr: false, whatsapp: false, sms: false, email: true },
    emailSubject: 'Buffet Request Confirmation',
    emailBody: 'Your buffet request for {{eventDate}} has been received.\n\nMeal Type: {{mealType}}\nGuests: {{guestCount}}\nLocation: {{location}}',
    placeholders: ['eventDate', 'mealType', 'guestCount', 'location'],
    isActive: true,
    updatedAt: getNow(),
  },
  {
    id: 'template_006',
    eventType: 'visitor_auto_cancel',
    name: 'Visit Auto-Cancelled',
    channels: { qr: false, whatsapp: true, sms: true, email: true },
    emailSubject: 'Visit Cancelled - No Response',
    emailBody: 'Dear {{visitorName}},\n\nYour visit scheduled for {{visitDate}} has been automatically cancelled due to no response.\n\nPlease contact {{hostName}} if you wish to reschedule.',
    smsTemplate: 'Visit on {{visitDate}} auto-cancelled. Contact {{hostName}} to reschedule.',
    placeholders: ['visitorName', 'visitDate', 'hostName'],
    isActive: true,
    updatedAt: getNow(),
  },
  {
    id: 'template_007',
    eventType: 'visitor_reminder',
    name: 'Visitor Reminder',
    channels: { qr: true, whatsapp: true, sms: true, email: true },
    emailSubject: 'Reminder: Your Visit Tomorrow',
    emailBody: 'Dear {{visitorName}},\n\nThis is a reminder about your upcoming visit:\n\nDate: {{visitDate}}\nTime: {{visitTime}}\nHost: {{hostName}}\n\nPlease confirm your attendance.',
    smsTemplate: 'Reminder: Visit to {{company}} on {{visitDate}} at {{visitTime}}. Please confirm.',
    placeholders: ['visitorName', 'visitDate', 'visitTime', 'hostName', 'company'],
    isActive: true,
    updatedAt: getNow(),
  },
  {
    id: 'template_008',
    eventType: 'check_in_complete',
    name: 'Check-In Confirmation',
    channels: { qr: false, whatsapp: true, sms: false, email: false },
    whatsappTemplate: 'Welcome to {{company}}! You have successfully checked in. Your host {{hostName}} has been notified.',
    placeholders: ['company', 'hostName'],
    isActive: true,
    updatedAt: getNow(),
  },
  {
    id: 'template_009',
    eventType: 'meeting_reminder',
    name: 'Meeting Room Reminder',
    channels: { qr: false, whatsapp: false, sms: false, email: true },
    emailSubject: 'Meeting Reminder: {{meetingTitle}}',
    emailBody: 'Your meeting "{{meetingTitle}}" is starting in 15 minutes.\n\nRoom: {{roomName}}\nFloor: {{floor}}\nTime: {{startTime}} - {{endTime}}',
    placeholders: ['meetingTitle', 'roomName', 'floor', 'startTime', 'endTime'],
    isActive: true,
    updatedAt: getNow(),
  },
];

let reminderRules: ReminderRules = {
  id: 'rules_001',
  firstReminderDelayMinutes: 120,
  secondReminderDelayMinutes: 240,
  autoCancelDelayMinutes: 300,
  officeStartTime: '08:00',
  officeEndTime: '17:00',
  workingDays: [0, 1, 2, 3, 4],
  isActive: true,
  updatedAt: getNow(),
};

let integrations: IntegrationHealth[] = [
  {
    id: 'int_001',
    name: 'Microsoft Outlook/Exchange',
    type: 'outlook',
    status: 'ok',
    lastSyncTime: new Date(Date.now() - 300000).toISOString(),
    isConfigured: true,
  },
  {
    id: 'int_002',
    name: 'Oracle HCM',
    type: 'oracle_hcm',
    status: 'ok',
    lastSyncTime: new Date(Date.now() - 3600000).toISOString(),
    isConfigured: true,
  },
  {
    id: 'int_003',
    name: 'Speed Gate API',
    type: 'speed_gate',
    status: 'degraded',
    lastSyncTime: new Date(Date.now() - 600000).toISOString(),
    lastErrorMessage: 'Intermittent connection timeouts',
    lastErrorTime: new Date(Date.now() - 1800000).toISOString(),
    isConfigured: true,
  },
  {
    id: 'int_004',
    name: 'WhatsApp Business API',
    type: 'whatsapp',
    status: 'ok',
    lastSyncTime: new Date(Date.now() - 60000).toISOString(),
    isConfigured: true,
  },
  {
    id: 'int_005',
    name: 'SMS Gateway (Twilio)',
    type: 'sms',
    status: 'ok',
    lastSyncTime: new Date(Date.now() - 120000).toISOString(),
    isConfigured: true,
  },
  {
    id: 'int_006',
    name: 'Email Gateway (SendGrid)',
    type: 'email',
    status: 'down',
    lastSyncTime: new Date(Date.now() - 7200000).toISOString(),
    lastErrorMessage: 'API key expired - requires renewal',
    lastErrorTime: new Date(Date.now() - 7200000).toISOString(),
    isConfigured: true,
  },
];

let biometricSettings: BiometricSettings = {
  globalEnabled: true,
  allowedRoles: ['building_admin', 'security', 'receptionist', 'manager'],
  fallbackToPassword: true,
  deviceSupported: true,
  biometricType: 'fingerprint',
  updatedAt: getNow(),
};

let parkingBays: ParkingBay[] = [
  { id: 'bay_001', bayNumber: 'A-001', zone: 'Zone A - VIP', floor: 'B1', type: 'vip', status: 'assigned', assignedEmployeeId: 'emp_001', assignedEmployeeName: 'Ahmed Al-Rashid' },
  { id: 'bay_002', bayNumber: 'A-002', zone: 'Zone A - VIP', floor: 'B1', type: 'vip', status: 'assigned', assignedEmployeeId: 'emp_010', assignedEmployeeName: 'Sultan Al-Otaibi' },
  { id: 'bay_003', bayNumber: 'A-003', zone: 'Zone A - VIP', floor: 'B1', type: 'vip', status: 'available' },
  { id: 'bay_004', bayNumber: 'B-001', zone: 'Zone B - Standard', floor: 'B1', type: 'standard', status: 'assigned', assignedEmployeeId: 'emp_002', assignedEmployeeName: 'Fatima Al-Zahrani' },
  { id: 'bay_005', bayNumber: 'B-002', zone: 'Zone B - Standard', floor: 'B1', type: 'standard', status: 'occupied' },
  { id: 'bay_006', bayNumber: 'B-003', zone: 'Zone B - Standard', floor: 'B1', type: 'standard', status: 'available' },
  { id: 'bay_007', bayNumber: 'B-004', zone: 'Zone B - Standard', floor: 'B1', type: 'standard', status: 'assigned', assignedEmployeeId: 'emp_003', assignedEmployeeName: 'Khalid Ibrahim' },
  { id: 'bay_008', bayNumber: 'B-005', zone: 'Zone B - Standard', floor: 'B2', type: 'standard', status: 'available' },
  { id: 'bay_009', bayNumber: 'C-001', zone: 'Zone C - Overflow', floor: 'B2', type: 'standard', status: 'available' },
  { id: 'bay_010', bayNumber: 'C-002', zone: 'Zone C - Overflow', floor: 'B2', type: 'standard', status: 'reserved' },
  { id: 'bay_011', bayNumber: 'H-001', zone: 'Zone B - Standard', floor: 'B1', type: 'handicap', status: 'available' },
  { id: 'bay_012', bayNumber: 'E-001', zone: 'Zone B - Standard', floor: 'B1', type: 'electric', status: 'maintenance' },
];

let parkingAssignments: EmployeeParkingAssignment[] = [
  {
    id: 'assign_001',
    employeeId: 'emp_001',
    employeeName: 'Ahmed Al-Rashid',
    employeeDepartment: 'Executive',
    bayId: 'bay_001',
    bayNumber: 'A-001',
    zone: 'Zone A - VIP',
    assignedDate: '2024-01-15',
    effectiveFrom: '2024-01-15',
    status: 'active',
  },
  {
    id: 'assign_002',
    employeeId: 'emp_010',
    employeeName: 'Sultan Al-Otaibi',
    employeeDepartment: 'Executive',
    bayId: 'bay_002',
    bayNumber: 'A-002',
    zone: 'Zone A - VIP',
    assignedDate: '2024-01-15',
    effectiveFrom: '2024-01-15',
    status: 'active',
  },
  {
    id: 'assign_003',
    employeeId: 'emp_002',
    employeeName: 'Fatima Al-Zahrani',
    employeeDepartment: 'HR',
    bayId: 'bay_004',
    bayNumber: 'B-001',
    zone: 'Zone B - Standard',
    assignedDate: '2024-02-01',
    effectiveFrom: '2024-02-01',
    status: 'active',
  },
  {
    id: 'assign_004',
    employeeId: 'emp_003',
    employeeName: 'Khalid Ibrahim',
    employeeDepartment: 'IT',
    bayId: 'bay_007',
    bayNumber: 'B-004',
    zone: 'Zone B - Standard',
    assignedDate: '2024-02-15',
    effectiveFrom: '2024-02-15',
    status: 'active',
  },
];

export const getMeetingRooms = (): MeetingRoomDetail[] => [...meetingRooms];

export const getMeetingRoomById = (id: string): MeetingRoomDetail | undefined => 
  meetingRooms.find(r => r.id === id);

export const addMeetingRoom = (room: Omit<MeetingRoomDetail, 'id' | 'createdAt' | 'updatedAt'>): MeetingRoomDetail => {
  const newRoom: MeetingRoomDetail = {
    ...room,
    id: `room_${Date.now()}`,
    createdAt: getNow(),
    updatedAt: getNow(),
  };
  meetingRooms = [...meetingRooms, newRoom];
  return newRoom;
};

export const updateMeetingRoom = (id: string, updates: Partial<MeetingRoomDetail>): MeetingRoomDetail | null => {
  const index = meetingRooms.findIndex(r => r.id === id);
  if (index === -1) return null;
  meetingRooms[index] = { ...meetingRooms[index], ...updates, updatedAt: getNow() };
  return meetingRooms[index];
};

export const deleteMeetingRoom = (id: string): boolean => {
  const index = meetingRooms.findIndex(r => r.id === id);
  if (index === -1) return false;
  meetingRooms = meetingRooms.filter(r => r.id !== id);
  return true;
};

export const getMeetingBookings = (): MeetingBooking[] => [...meetingBookings];

export const getMeetingBookingsByDate = (date: string): MeetingBooking[] => 
  meetingBookings.filter(b => b.date === date);

export const getMeetingBookingsByRoom = (roomId: string): MeetingBooking[] => 
  meetingBookings.filter(b => b.roomId === roomId);

export const getTodaysMeetings = (): MeetingBooking[] => 
  getMeetingBookingsByDate(getToday());

export interface RoomMeetingGroup {
  roomId: string;
  roomName: string;
  floor: string;
  building: string;
  meetings: MeetingBooking[];
}

export const getTodaysMeetingsByRoom = (): RoomMeetingGroup[] => {
  const todaysMeetings = getTodaysMeetings();
  const roomMap = new Map<string, RoomMeetingGroup>();
  
  for (const meeting of todaysMeetings) {
    const room = meetingRooms.find(r => r.id === meeting.roomId);
    if (!roomMap.has(meeting.roomId)) {
      roomMap.set(meeting.roomId, {
        roomId: meeting.roomId,
        roomName: meeting.roomName,
        floor: room?.floor || 'N/A',
        building: room?.building || 'Unknown',
        meetings: [],
      });
    }
    roomMap.get(meeting.roomId)!.meetings.push(meeting);
  }
  
  const groups = Array.from(roomMap.values());
  groups.forEach(group => {
    group.meetings.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });
  
  return groups.sort((a, b) => a.roomName.localeCompare(b.roomName));
};

export const getValetZones = (): ValetZone[] => [...valetZones];

export const getValetZoneById = (id: string): ValetZone | undefined => 
  valetZones.find(z => z.id === id);

export const addValetZone = (zone: Omit<ValetZone, 'id' | 'createdAt' | 'updatedAt'>): ValetZone => {
  const newZone: ValetZone = {
    ...zone,
    id: `zone_${Date.now()}`,
    createdAt: getNow(),
    updatedAt: getNow(),
  };
  valetZones = [...valetZones, newZone];
  return newZone;
};

export const updateValetZone = (id: string, updates: Partial<ValetZone>): ValetZone | null => {
  const index = valetZones.findIndex(z => z.id === id);
  if (index === -1) return null;
  valetZones[index] = { ...valetZones[index], ...updates, updatedAt: getNow() };
  return valetZones[index];
};

export const deleteValetZone = (id: string): boolean => {
  const index = valetZones.findIndex(z => z.id === id);
  if (index === -1) return false;
  valetZones = valetZones.filter(z => z.id !== id);
  return true;
};

export const getNotificationTemplates = (): NotificationTemplate[] => [...notificationTemplates];

export const getNotificationTemplateById = (id: string): NotificationTemplate | undefined => 
  notificationTemplates.find(t => t.id === id);

export const updateNotificationTemplate = (id: string, updates: Partial<NotificationTemplate>): NotificationTemplate | null => {
  const index = notificationTemplates.findIndex(t => t.id === id);
  if (index === -1) return null;
  notificationTemplates[index] = { ...notificationTemplates[index], ...updates, updatedAt: getNow() };
  return notificationTemplates[index];
};

export const getReminderRules = (): ReminderRules => ({ ...reminderRules });

export const updateReminderRules = (updates: Partial<ReminderRules>): ReminderRules => {
  reminderRules = { ...reminderRules, ...updates, updatedAt: getNow() };
  return reminderRules;
};

export const getIntegrations = (): IntegrationHealth[] => [...integrations];

export const getIntegrationById = (id: string): IntegrationHealth | undefined => 
  integrations.find(i => i.id === id);

export const getBiometricSettings = (): BiometricSettings => ({ ...biometricSettings });

export const updateBiometricSettings = (updates: Partial<BiometricSettings>): BiometricSettings => {
  biometricSettings = { ...biometricSettings, ...updates, updatedAt: getNow() };
  return biometricSettings;
};

export const getParkingBays = (): ParkingBay[] => [...parkingBays];

export const getAvailableParkingBays = (): ParkingBay[] => 
  parkingBays.filter(b => b.status === 'available');

export const getParkingAssignments = (): EmployeeParkingAssignment[] => [...parkingAssignments];

export const assignParkingBay = (employeeId: string, employeeName: string, employeeDepartment: string, bayId: string): EmployeeParkingAssignment | null => {
  const bay = parkingBays.find(b => b.id === bayId);
  if (!bay || bay.status !== 'available') return null;

  const bayIndex = parkingBays.findIndex(b => b.id === bayId);
  parkingBays[bayIndex] = {
    ...bay,
    status: 'assigned',
    assignedEmployeeId: employeeId,
    assignedEmployeeName: employeeName,
  };

  const assignment: EmployeeParkingAssignment = {
    id: `assign_${Date.now()}`,
    employeeId,
    employeeName,
    employeeDepartment,
    bayId,
    bayNumber: bay.bayNumber,
    zone: bay.zone,
    assignedDate: getToday(),
    effectiveFrom: getToday(),
    status: 'active',
  };
  parkingAssignments = [...parkingAssignments, assignment];
  return assignment;
};

export const unassignParkingBay = (assignmentId: string): boolean => {
  const assignment = parkingAssignments.find(a => a.id === assignmentId);
  if (!assignment) return false;

  const bayIndex = parkingBays.findIndex(b => b.id === assignment.bayId);
  if (bayIndex !== -1) {
    parkingBays[bayIndex] = {
      ...parkingBays[bayIndex],
      status: 'available',
      assignedEmployeeId: undefined,
      assignedEmployeeName: undefined,
    };
  }

  parkingAssignments = parkingAssignments.map(a => 
    a.id === assignmentId ? { ...a, status: 'cancelled' as const, effectiveTo: getToday() } : a
  );
  return true;
};

export const getParkingOccupancyMetrics = (): ParkingOccupancyMetrics => {
  const total = parkingBays.length;
  const assigned = parkingBays.filter(b => b.status === 'assigned').length;
  const occupied = parkingBays.filter(b => b.status === 'occupied').length;
  const maintenance = parkingBays.filter(b => b.status === 'maintenance').length;
  const available = parkingBays.filter(b => b.status === 'available').length;
  const freedDueToAbsence = 2;
  const usedByVisitors = occupied;

  return {
    totalBays: total,
    assignedToEmployees: assigned,
    freedDueToAbsence,
    usedByVisitors,
    available,
    maintenanceBays: maintenance,
    utilizationRate: Math.round(((assigned + occupied) / (total - maintenance)) * 100),
  };
};

export const getAdminKPIs = (): AdminKPIMetric[] => [
  { id: 'kpi_001', name: 'Total Visits Today', value: 24, trend: 'up', trendValue: 12, comparisonPeriod: 'vs yesterday', icon: 'users', color: '#307BF2' },
  { id: 'kpi_002', name: 'Check-In Rate', value: 87, unit: '%', trend: 'up', trendValue: 5, comparisonPeriod: 'vs last week', icon: 'log-in', color: '#12E1D5' },
  { id: 'kpi_003', name: 'Parking Utilization', value: 72, unit: '%', trend: 'stable', comparisonPeriod: 'vs average', icon: 'truck', color: '#F59E0B' },
  { id: 'kpi_004', name: 'Valet Tasks', value: 18, trend: 'down', trendValue: -3, comparisonPeriod: 'vs yesterday', icon: 'navigation', color: '#8B5CF6' },
  { id: 'kpi_005', name: 'Buffet Events', value: 5, trend: 'up', trendValue: 2, comparisonPeriod: 'vs yesterday', icon: 'coffee', color: '#EF4444' },
  { id: 'kpi_006', name: 'No-Show Rate', value: 13, unit: '%', trend: 'down', trendValue: -2, comparisonPeriod: 'vs last week', icon: 'user-x', color: '#6B7280' },
];

export const getVisitsAnalytics = (): VisitsAnalytics => {
  const today = new Date();
  const dailyVisits = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 30) + 15,
    };
  });

  return {
    dailyVisits,
    noShowRate: 13,
    totalInvited: 180,
    totalCheckedIn: 156,
    averageVisitDuration: 95,
  };
};

export const getParkingAnalytics = (): ParkingAnalytics => ({
  utilizationRate: 72,
  peakHours: [
    { hour: 8, occupancy: 45 },
    { hour: 9, occupancy: 78 },
    { hour: 10, occupancy: 85 },
    { hour: 11, occupancy: 82 },
    { hour: 12, occupancy: 68 },
    { hour: 13, occupancy: 72 },
    { hour: 14, occupancy: 80 },
    { hour: 15, occupancy: 75 },
    { hour: 16, occupancy: 60 },
    { hour: 17, occupancy: 35 },
  ],
  averageDailyOccupancy: 71,
});

export const getValetAnalytics = (): ValetAnalytics => {
  const today = new Date();
  const dailyTasks = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 20) + 10,
    };
  });

  return {
    dailyTasks,
    averageWaitTime: 8,
    completionRate: 94,
  };
};

export const getBuffetAnalytics = (): BuffetAnalytics => {
  const today = new Date();
  const dailyEvents = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 8) + 2,
    };
  });

  return {
    dailyEvents,
    popularMealTypes: [
      { type: 'Lunch', count: 45 },
      { type: 'Breakfast', count: 28 },
      { type: 'Snacks', count: 22 },
      { type: 'Dinner', count: 15 },
    ],
    averageGuestsPerEvent: 12,
  };
};

export const MEETING_ROOM_FEATURES: { id: MeetingRoomFeature; name: string; icon: string }[] = [
  { id: 'projector', name: 'Projector', icon: 'monitor' },
  { id: 'whiteboard', name: 'Whiteboard', icon: 'edit-3' },
  { id: 'video_conferencing', name: 'Video Conferencing', icon: 'video' },
  { id: 'audio_system', name: 'Audio System', icon: 'speaker' },
  { id: 'tv_display', name: 'TV Display', icon: 'tv' },
  { id: 'phone', name: 'Phone', icon: 'phone' },
  { id: 'air_conditioning', name: 'Air Conditioning', icon: 'wind' },
  { id: 'natural_light', name: 'Natural Light', icon: 'sun' },
];

export const NOTIFICATION_EVENT_TYPES: { id: NotificationEventType; name: string }[] = [
  { id: 'request_approved', name: 'Request Approved' },
  { id: 'request_rejected', name: 'Request Rejected' },
  { id: 'parking_assigned', name: 'Parking Assigned' },
  { id: 'valet_assigned', name: 'Valet Assigned' },
  { id: 'buffet_created', name: 'Buffet Request Created' },
  { id: 'visitor_auto_cancel', name: 'Visitor Auto-Cancel' },
  { id: 'visitor_reminder', name: 'Visitor Reminder' },
  { id: 'check_in_complete', name: 'Check-In Complete' },
  { id: 'meeting_reminder', name: 'Meeting Reminder' },
];

let roomChangeLogs: RoomChangeLog[] = [];

export const getRoomChangeLogs = (): RoomChangeLog[] => [...roomChangeLogs];

export const getRoomChangeLogsByBookingId = (bookingId: string): RoomChangeLog[] =>
  roomChangeLogs.filter(log => log.bookingId === bookingId);

export const addRoomChangeLog = (
  bookingId: string,
  fromRoomId: string,
  fromRoomName: string,
  toRoomId: string,
  toRoomName: string,
  changedBy: string,
  reason?: string
): RoomChangeLog => {
  const newLog: RoomChangeLog = {
    id: `log_${Date.now()}`,
    bookingId,
    fromRoomId,
    fromRoomName,
    toRoomId,
    toRoomName,
    changedBy,
    changedAt: getNow(),
    reason,
  };
  roomChangeLogs = [...roomChangeLogs, newLog];
  return newLog;
};

export const updateMeetingBooking = (
  bookingId: string,
  updates: Partial<MeetingBooking>
): MeetingBooking | null => {
  const index = meetingBookings.findIndex(b => b.id === bookingId);
  if (index === -1) return null;
  meetingBookings[index] = { ...meetingBookings[index], ...updates };
  return meetingBookings[index];
};
