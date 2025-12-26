export type UserRole = 'employee' | 'manager' | 'building_admin' | 'buffet_admin' | 'buffet_staff' | 'valet_admin' | 'valet_driver' | 'security' | 'visitor' | 'receptionist';

export type RequestStatus = 
  | 'draft' 
  | 'pending_approval'
  | 'pending_host_approval'
  | 'approved' 
  | 'rejected' 
  | 'visitor_pending'
  | 'visitor_accepted' 
  | 'visitor_rejected' 
  | 'checked_in' 
  | 'completed' 
  | 'cancelled' 
  | 'auto_cancelled';

export type CommunicationChannel = 'qr_code' | 'whatsapp' | 'sms' | 'email';

export type ParkingType = 'auto' | 'valet' | 'none';

export type ParkingLocation = 'SKBC_basement' | 'skbc_basement' | 'valet' | 'red_sea_mall';

export interface Visitor {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  photo?: string;
}

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  floor: string;
  timeSlot: string;
  status?: string;
}

export interface ParkingSlot {
  id: string;
  location: ParkingLocation;
  slotNumber: string;
  floor?: string;
  status?: string;
}

export interface BuffetService {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  location: string;
  dietaryPreferences?: string[];
  status?: string;
}

export interface ValetDriver {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'off_duty';
  currentTasks: number;
}

export interface ValetService {
  id: string;
  driver?: ValetDriver;
  pickupTime: string;
  returnTime: string;
  status: 'pending' | 'assigned' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
}

export interface ApprovalInfo {
  managerId?: string;
  managerName?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  managerComment?: string;
  requiresApproval: boolean;
  autoApproved?: boolean;
}

export interface ReminderSchedule {
  firstReminderAt?: string;
  secondReminderAt?: string;
  autoCancelAt?: string;
  firstReminderSent?: boolean;
  secondReminderSent?: boolean;
}

export interface VisitorRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  visitor: Visitor;
  visitDate: string;
  visitTime: string;
  duration: string;
  endTime?: string;
  purpose: string;
  status: RequestStatus;
  communicationChannels: CommunicationChannel[];
  meetingRoom?: MeetingRoom;
  parkingType: ParkingType;
  parkingSlot?: ParkingSlot;
  buffet?: BuffetService;
  valet?: ValetService;
  qrCode?: string;
  approval: ApprovalInfo;
  reminders: ReminderSchedule;
  visitorDecision?: {
    accepted: boolean;
    decidedAt: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  isWalkIn?: boolean;
  needsResourceReallocation?: boolean;
  notes?: string;
}

export interface DashboardStats {
  activeRequests: number;
  upcomingVisits: number;
  pendingActions: number;
  completedToday: number;
}

export type NotificationType = 
  | 'request_submitted'
  | 'request_approved'
  | 'request_rejected'
  | 'request_cancelled'
  | 'request_modified'
  | 'visitor_accepted' 
  | 'visitor_rejected' 
  | 'visitor_reminder'
  | 'visitor_arrival'
  | 'check_in' 
  | 'check_out'
  | 'update' 
  | 'assignment'
  | 'auto_cancelled'
  | 'pending_approval'
  | 'walk_in_registered'
  | 'walk_in_approved'
  | 'expected_today'
  | 'buffet_new_request'
  | 'buffet_scheduled'
  | 'buffet_completed'
  | 'buffet_staff_update'
  | 'buffet_task_assigned'
  | 'buffet_request_created'
  | 'buffet_status_update'
  | 'valet_new_request'
  | 'valet_scheduled'
  | 'valet_completed'
  | 'valet_cancelled'
  | 'valet_task_assigned'
  | 'security_access_update'
  | 'security_gate_pass';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  requestId?: string;
  actionRequired?: boolean;
  priority?: 'low' | 'medium' | 'high';
  targetRoles?: UserRole[];
  sourceRole?: UserRole;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  requiresApproval: boolean;
  managerId?: string;
  managerName?: string;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  department: string;
  teamSize: number;
}

export interface AdminDashboardKPI {
  label: string;
  value: number | string;
  trend?: string;
  icon: string;
  color: string;
}

export interface CheckInData {
  requestId: string;
  visitor: Visitor;
  parkingSlot?: ParkingSlot;
  buffetLocation?: string;
  valetDriver?: ValetDriver;
  checkInTime: string;
  notes?: string;
}

// ============================================
// Building Admin / System Admin Extended Types
// ============================================

export type MeetingRoomFeature = 
  | 'projector' 
  | 'whiteboard' 
  | 'video_conferencing' 
  | 'audio_system' 
  | 'tv_display' 
  | 'phone'
  | 'air_conditioning'
  | 'natural_light';

export interface MeetingRoomDetail {
  id: string;
  name: string;
  floor: string;
  building: string;
  capacity: number;
  features: MeetingRoomFeature[];
  status: 'active' | 'inactive' | 'maintenance';
  description?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingBooking {
  id: string;
  roomId: string;
  roomName: string;
  requestId?: string;
  hostId: string;
  hostName: string;
  hostDepartment?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  visitors?: { name: string; company?: string }[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
}

export type ValetZoneType = 'basement' | 'outdoor' | 'covered' | 'vip';

export interface ValetZone {
  id: string;
  name: string;
  type: ValetZoneType;
  location: string;
  capacity: number;
  currentOccupancy: number;
  priorityOrder: number;
  status: 'active' | 'inactive' | 'full';
  description?: string;
  linkedEntrances?: string[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationEventType = 
  | 'request_approved'
  | 'request_rejected'
  | 'parking_assigned'
  | 'valet_assigned'
  | 'buffet_created'
  | 'visitor_auto_cancel'
  | 'visitor_reminder'
  | 'check_in_complete'
  | 'meeting_reminder';

export interface NotificationChannelConfig {
  qr: boolean;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

export interface NotificationTemplate {
  id: string;
  eventType: NotificationEventType;
  name: string;
  channels: NotificationChannelConfig;
  emailSubject?: string;
  emailBody?: string;
  smsTemplate?: string;
  whatsappTemplate?: string;
  placeholders: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface ReminderRules {
  id: string;
  firstReminderDelayMinutes: number;
  secondReminderDelayMinutes: number;
  autoCancelDelayMinutes: number;
  officeStartTime: string;
  officeEndTime: string;
  workingDays: number[];
  isActive: boolean;
  updatedAt: string;
}

export type IntegrationStatus = 'ok' | 'degraded' | 'down' | 'unknown';

export interface IntegrationHealth {
  id: string;
  name: string;
  type: 'outlook' | 'oracle_hcm' | 'speed_gate' | 'whatsapp' | 'sms' | 'email';
  status: IntegrationStatus;
  lastSyncTime?: string;
  lastErrorMessage?: string;
  lastErrorTime?: string;
  healthCheckUrl?: string;
  isConfigured: boolean;
}

export interface BiometricSettings {
  globalEnabled: boolean;
  allowedRoles: UserRole[];
  fallbackToPassword: boolean;
  deviceSupported?: boolean;
  biometricType?: 'fingerprint' | 'face_id' | 'iris' | 'none';
  updatedAt: string;
}

export interface ParkingBay {
  id: string;
  bayNumber: string;
  zone: string;
  floor: string;
  type: 'standard' | 'vip' | 'handicap' | 'electric';
  status: 'available' | 'assigned' | 'occupied' | 'reserved' | 'maintenance';
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface EmployeeParkingAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment: string;
  bayId: string;
  bayNumber: string;
  zone: string;
  assignedDate: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'active' | 'expired' | 'cancelled';
}

export interface ParkingOccupancyMetrics {
  totalBays: number;
  assignedToEmployees: number;
  freedDueToAbsence: number;
  usedByVisitors: number;
  available: number;
  maintenanceBays: number;
  utilizationRate: number;
}

export interface AdminKPIMetric {
  id: string;
  name: string;
  value: number;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  comparisonPeriod?: string;
  icon: string;
  color: string;
}

export interface VisitsAnalytics {
  dailyVisits: { date: string; count: number }[];
  noShowRate: number;
  totalInvited: number;
  totalCheckedIn: number;
  averageVisitDuration: number;
}

export interface ParkingAnalytics {
  utilizationRate: number;
  peakHours: { hour: number; occupancy: number }[];
  averageDailyOccupancy: number;
}

export interface ValetAnalytics {
  dailyTasks: { date: string; count: number }[];
  averageWaitTime: number;
  completionRate: number;
}

export interface BuffetAnalytics {
  dailyEvents: { date: string; count: number }[];
  popularMealTypes: { type: string; count: number }[];
  averageGuestsPerEvent: number;
}

export interface RoomChangeLog {
  id: string;
  bookingId: string;
  fromRoomId: string;
  fromRoomName: string;
  toRoomId: string;
  toRoomName: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}
