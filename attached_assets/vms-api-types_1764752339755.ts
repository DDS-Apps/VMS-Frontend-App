/**
 * VMS Backend API - TypeScript Types
 * Auto-generated types for frontend integration
 * API Base URL: /api/v1
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  BUILDING_ADMIN = 'building_admin',
  BUFFET_ADMIN = 'buffet_admin',
  BUFFET_STAFF = 'buffet_staff',
  VALET_ADMIN = 'valet_admin',
  VALET_DRIVER = 'valet_driver',
  SECURITY = 'security',
  RECEPTIONIST = 'receptionist',
  VISITOR = 'visitor',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum ParkingStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
}

export enum ParkingLocation {
  SKBC_BASEMENT = 'skbc_basement',
  REDSEA_MALL = 'redsea_mall',
  VALET = 'valet',
}

export enum ParkingSpotType {
  VISITOR = 'visitor',
  EMPLOYEE = 'employee',
  VALET = 'valet',
  RESERVED = 'reserved',
}

export enum MeetingRoomStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

export enum MeetingBookingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum BuffetRequestStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum ValetAssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ValetDriverStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFF_DUTY = 'off_duty',
}

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

// ============================================================================
// ENTITY INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  role: UserRole;
  managerId?: string;
  manager?: User;
  azureAdId?: string;
  canBypassApproval: boolean;
  parkingSpotNumber?: string;
  isOnVacation: boolean;
  vacationStart?: string;
  vacationEnd?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Visitor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  idType?: string;
  idNumber?: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  visitorId: string;
  visitor?: Visitor;
  hostId: string;
  host?: User;
  purpose: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  status: InvitationStatus;
  qrCode?: string;
  responseToken?: string;
  requiresParking: boolean;
  requiresMeetingRoom: boolean;
  requiresBuffet: boolean;
  requiresValet: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Request {
  id: string;
  requesterId: string;
  requester?: User;
  approverId?: string;
  approver?: User;
  invitationId?: string;
  invitation?: Invitation;
  requestType: string;
  status: RequestStatus;
  details?: string;
  autoApproved: boolean;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingSpace {
  id: string;
  spaceNumber: string;
  location: ParkingLocation;
  type: ParkingSpotType;
  status: ParkingStatus;
  floor?: string;
  zone?: string;
  directionLink?: string;
  assignedEmployeeId?: string;
  assignedEmployee?: User;
  isValetDesignated: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingAllocation {
  id: string;
  parkingSpaceId: string;
  parkingSpace?: ParkingSpace;
  invitationId?: string;
  invitation?: Invitation;
  userId?: string;
  user?: User;
  startTime: string;
  endTime: string;
  vehicleNumber?: string;
  vehicleType?: string;
  isValetService: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRoom {
  id: string;
  name: string;
  floor?: string;
  building?: string;
  location?: string;
  capacity: number;
  hasProjector: boolean;
  hasVideoConference: boolean;
  hasWhiteboard: boolean;
  amenities?: string;
  status: MeetingRoomStatus;
  outlookRoomEmail?: string;
  directionLink?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingBooking {
  id: string;
  meetingRoomId: string;
  meetingRoom?: MeetingRoom;
  invitationId?: string;
  invitation?: Invitation;
  bookedById: string;
  bookedBy?: User;
  title: string;
  startTime: string;
  endTime: string;
  attendeeCount?: number;
  isCancelled: boolean;
  outlookEventId?: string;
  isSyncedWithOutlook: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuffetLocation {
  id: string;
  name: string;
  floor?: string;
  building?: string;
  capacity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuffetStaff {
  id: string;
  userId: string;
  user?: User;
  buffetLocationId: string;
  buffetLocation?: BuffetLocation;
  isOnDuty: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuffetRequest {
  id: string;
  invitationId: string;
  invitation?: Invitation;
  buffetLocationId: string;
  buffetLocation?: BuffetLocation;
  requestedById: string;
  requestedBy?: User;
  assignedStaffId?: string;
  assignedStaff?: BuffetStaff;
  guestCount: number;
  requirements?: string;
  dietaryRestrictions?: string;
  scheduledTime: string;
  status: BuffetRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ValetDriver {
  id: string;
  userId: string;
  user?: User;
  licenseNumber?: string;
  status: ValetDriverStatus;
  currentAssignmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ValetAssignment {
  id: string;
  invitationId?: string;
  invitation?: Invitation;
  driverId?: string;
  driver?: ValetDriver;
  requestedById: string;
  requestedBy?: User;
  vehicleNumber: string;
  vehicleType?: string;
  vehicleColor?: string;
  pickupTime?: string;
  dropoffTime?: string;
  parkedAtLocation?: string;
  status: ValetAssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  recipientUserId?: string;
  recipientUser?: User;
  recipientVisitorId?: string;
  recipientVisitor?: Visitor;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  message: string;
  status: NotificationStatus;
  sentAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GateAccessLog {
  id: string;
  gateId: string;
  invitationId?: string;
  invitation?: Invitation;
  action: string;
  accessGranted: boolean;
  qrCodeData?: string;
  denialReason?: string;
  timestamp: string;
  createdAt: string;
}

// ============================================================================
// DTO INTERFACES (Request Bodies)
// ============================================================================

export interface CreateVisitorDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  idType?: string;
  idNumber?: string;
}

export interface UpdateVisitorDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  idType?: string;
  idNumber?: string;
  isBlacklisted?: boolean;
  blacklistReason?: string;
}

export interface CreateInvitationDto {
  visitorId?: string;
  visitor?: CreateVisitorDto;
  hostId: string;
  purpose: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  requiresParking?: boolean;
  requiresMeetingRoom?: boolean;
  requiresBuffet?: boolean;
  requiresValet?: boolean;
  notifyViaEmail?: boolean;
  notifyViaSms?: boolean;
  notifyViaWhatsapp?: boolean;
  notes?: string;
  buffetDetails?: {
    guestCount?: number;
    requirements?: string;
    dietaryRestrictions?: string;
  };
  meetingDetails?: {
    title?: string;
    attendeeCount?: number;
  };
}

export interface UpdateInvitationDto {
  purpose?: string;
  visitDate?: string;
  startTime?: string;
  endTime?: string;
  requiresParking?: boolean;
  requiresMeetingRoom?: boolean;
  requiresBuffet?: boolean;
  requiresValet?: boolean;
  notes?: string;
}

export interface RespondToInvitationDto {
  response: 'accept' | 'reject';
  reason?: string;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  role?: UserRole;
  managerId?: string;
  canBypassApproval?: boolean;
  parkingSpotNumber?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  role?: UserRole;
  managerId?: string;
  canBypassApproval?: boolean;
  parkingSpotNumber?: string;
  isOnVacation?: boolean;
  vacationStart?: string;
  vacationEnd?: string;
  isActive?: boolean;
}

export interface CreateParkingSpaceDto {
  spaceNumber: string;
  location?: ParkingLocation;
  type?: ParkingSpotType;
  floor?: string;
  zone?: string;
  directionLink?: string;
  assignedEmployeeId?: string;
  isValetDesignated?: boolean;
}

export interface UpdateParkingSpaceDto {
  status?: ParkingStatus;
  location?: ParkingLocation;
  type?: ParkingSpotType;
  floor?: string;
  zone?: string;
  directionLink?: string;
  assignedEmployeeId?: string;
  isValetDesignated?: boolean;
  isActive?: boolean;
}

export interface AllocateParkingDto {
  invitationId?: string;
  userId?: string;
  startTime: string;
  endTime: string;
  vehicleNumber?: string;
  vehicleType?: string;
  isValetService?: boolean;
}

export interface CreateMeetingRoomDto {
  name: string;
  floor?: string;
  building?: string;
  location?: string;
  capacity?: number;
  hasProjector?: boolean;
  hasVideoConference?: boolean;
  hasWhiteboard?: boolean;
  amenities?: string;
  outlookRoomEmail?: string;
  directionLink?: string;
}

export interface UpdateMeetingRoomDto {
  name?: string;
  floor?: string;
  building?: string;
  location?: string;
  capacity?: number;
  hasProjector?: boolean;
  hasVideoConference?: boolean;
  hasWhiteboard?: boolean;
  amenities?: string;
  status?: MeetingRoomStatus;
  outlookRoomEmail?: string;
  directionLink?: string;
  isActive?: boolean;
}

export interface CreateMeetingBookingDto {
  meetingRoomId: string;
  invitationId?: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeeCount?: number;
}

export interface UpdateMeetingBookingDto {
  title?: string;
  startTime?: string;
  endTime?: string;
  attendeeCount?: number;
}

export interface CreateBuffetRequestDto {
  invitationId: string;
  buffetLocationId: string;
  guestCount: number;
  requirements?: string;
  dietaryRestrictions?: string;
  scheduledTime: string;
}

export interface UpdateBuffetRequestDto {
  guestCount?: number;
  requirements?: string;
  dietaryRestrictions?: string;
  scheduledTime?: string;
  status?: BuffetRequestStatus;
}

export interface CreateValetAssignmentDto {
  invitationId?: string;
  vehicleNumber: string;
  vehicleType?: string;
  vehicleColor?: string;
  pickupTime?: string;
}

export interface UpdateValetAssignmentDto {
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleColor?: string;
  pickupTime?: string;
  dropoffTime?: string;
  parkedAtLocation?: string;
  status?: ValetAssignmentStatus;
}

export interface CreateRequestDto {
  invitationId?: string;
  requestType: string;
  details?: string;
}

export interface ApproveRequestDto {
  notes?: string;
}

export interface RejectRequestDto {
  reason: string;
}

export interface VerifyGateAccessDto {
  qrCode: string;
  gateId: string;
}

export interface SendNotificationDto {
  type: NotificationType;
  recipientUserId?: string;
  recipientVisitorId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  message: string;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  database?: {
    connected: boolean;
    error?: string;
  };
}

export interface AuthConfigResponse {
  isConfigured: boolean;
  clientId?: string;
  tenantId?: string;
  redirectUri?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface GateVerificationResponse {
  accessGranted: boolean;
  invitation?: Invitation;
  visitor?: Visitor;
  denialReason?: string;
}
