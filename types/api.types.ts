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

export interface UserDto {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  role: UserRole;
  managerId?: string;
  managerName?: string;
  manager?: UserDto;
  azureAdId?: string;
  canBypassApproval?: boolean;
  parkingSpotNumber?: string;
  isOnVacation?: boolean;
  vacationStart?: string;
  vacationEnd?: string;
  isActive?: boolean;
  status?: string;
  source?: string;
  autoApproval?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorDto {
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

export interface InvitationDto {
  id: string;
  visitorId: string;
  visitor?: VisitorDto;
  hostId: string;
  host?: UserDto;
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

export interface RequestDto {
  id: string;
  requesterId: string;
  requester?: UserDto;
  approverId?: string;
  approver?: UserDto;
  invitationId?: string;
  invitation?: InvitationDto;
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

export interface ParkingSpaceDto {
  id: string;
  spaceNumber: string;
  location: ParkingLocation;
  type: ParkingSpotType;
  status: ParkingStatus;
  floor?: string;
  zone?: string;
  directionLink?: string;
  assignedEmployeeId?: string;
  assignedEmployee?: UserDto;
  isValetDesignated: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingAllocationDto {
  id: string;
  parkingSpaceId: string;
  parkingSpace?: ParkingSpaceDto;
  invitationId?: string;
  invitation?: InvitationDto;
  userId?: string;
  user?: UserDto;
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

export interface MeetingRoomDto {
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

export interface MeetingBookingDto {
  id: string;
  meetingRoomId: string;
  meetingRoom?: MeetingRoomDto;
  invitationId?: string;
  invitation?: InvitationDto;
  bookedById: string;
  bookedBy?: UserDto;
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

export interface BuffetLocationDto {
  id: string;
  name: string;
  floor?: string;
  building?: string;
  capacity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuffetStaffDto {
  id: string;
  userId: string;
  user?: UserDto;
  buffetLocationId: string;
  buffetLocation?: BuffetLocationDto;
  isOnDuty: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuffetRequestDto {
  id: string;
  invitationId: string;
  invitation?: InvitationDto;
  buffetLocationId: string;
  buffetLocation?: BuffetLocationDto;
  requestedById: string;
  requestedBy?: UserDto;
  assignedStaffId?: string;
  assignedStaff?: BuffetStaffDto;
  guestCount: number;
  requirements?: string;
  dietaryRestrictions?: string;
  scheduledTime: string;
  status: BuffetRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ValetDriverDto {
  id: string;
  userId: string;
  user?: UserDto;
  licenseNumber?: string;
  status: ValetDriverStatus;
  currentAssignmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ValetAssignmentDto {
  id: string;
  invitationId?: string;
  invitation?: InvitationDto;
  driverId?: string;
  driver?: ValetDriverDto;
  requestedById: string;
  requestedBy?: UserDto;
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

export type ValetTaskType = 'visitor' | 'employee' | 'all';

export type ValetTaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type ValetPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DriverLoadLevel = 'low' | 'medium' | 'high';

export interface ValetTaskVehicleInfo {
  make: string;
  model: string;
  color: string;
  plateNumber: string;
}

export interface ValetTaskDriverInfo {
  id: string;
  name: string;
  phone: string;
}

export interface ValetTaskValetInfo {
  status: ValetTaskStatus;
  driver?: ValetTaskDriverInfo;
  priority: ValetPriority;
  notes?: string;
}

export interface ValetTaskDto {
  id: string;
  type: ValetTaskType;
  requestId?: string;
  visitorName?: string;
  visitorCompany?: string;
  hostName?: string;
  visitDate: string;
  employeeId?: string;
  employeeName?: string;
  vehicleInfo?: ValetTaskVehicleInfo;
  dropOffLocation?: string;
  pickupTime?: string;
  returnTime?: string;
  requestedReturnTime?: string;
  location?: string;
  valet?: ValetTaskValetInfo;
}

export interface ValetAdminDriverDto {
  id: string;
  name: string;
  phone: string;
  status: ValetDriverStatus;
  currentTasks: number;
}

export interface ValetDriverLoadDto {
  id: string;
  name: string;
  tasksToday: number;
  tasksThisWeek: number;
  loadLevel: DriverLoadLevel;
  status: ValetDriverStatus;
}

export interface ValetFairnessMetricsDto {
  averageTasksPerDriver: number;
  standardDeviation: number;
  mostLoaded: string;
  leastLoaded: string;
}

export interface ValetDriverLoadSummaryDto {
  drivers: ValetDriverLoadDto[];
  fairnessMetrics: ValetFairnessMetricsDto;
}

export type ValetZoneType = 'covered' | 'open' | 'vip' | 'standard';

export type ValetZoneStatus = 'active' | 'inactive' | 'maintenance';

export interface ValetZoneDto {
  id: string;
  name: string;
  type: ValetZoneType;
  location: string;
  capacity: number;
  currentOccupancy: number;
  status: ValetZoneStatus;
}

export interface AssignValetDriverDto {
  driverId: string;
  priority?: ValetPriority;
  notes?: string;
}

export interface AssignValetDriverResponseDto {
  id: string;
  valet: ValetTaskValetInfo;
  updatedAt: string;
}

export interface ListValetTasksParams {
  unassigned?: boolean;
  date?: string;
  driverId?: string;
  status?: ValetTaskStatus;
  type?: ValetTaskType;
}

export interface ListValetAdminDriversParams {
  status?: ValetDriverStatus;
}

export type DriverTaskStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'rejected';

export interface DriverTaskValetInfo {
  status: DriverTaskStatus;
}

export interface DriverTaskDto {
  id: string;
  type: ValetTaskType;
  visitorName: string;
  employeeName: string;
  visitorCompany?: string;
  hostName: string;
  hostPhone?: string;
  visitDate: string;
  pickupTime: string;
  returnTime?: string;
  location: string;
  vehicleInfo: ValetTaskVehicleInfo;
  valet: DriverTaskValetInfo;
  notes?: string;
  assignmentWindowStart?: string;
  assignmentWindowEnd?: string;
  assignedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ListDriverTasksParams {
  date?: string;
  status?: DriverTaskStatus;
}

export interface UpdateDriverTaskStatusDto {
  status: DriverTaskStatus;
  notes?: string;
}

export interface UpdateDriverTaskStatusResponseDto {
  id: string;
  valet: DriverTaskValetInfo;
  updatedAt: string;
}

export interface SelfValetVehicleInfo {
  make: string;
  model: string;
  color: string;
  plateNumber: string;
}

export interface SelfValetDriverInfo {
  id: string;
  name: string;
  phone: string;
}

export interface SelfValetInfo {
  id: string;
  pickupTime?: string;
  returnTime?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  driver?: SelfValetDriverInfo;
}

export interface CreateSelfValetRequestDto {
  vehicleInfo: SelfValetVehicleInfo;
  dropOffLocation: string;
  requestedReturnTime: string;
  notes?: string;
}

export interface SelfValetRequestDto {
  id: string;
  employeeId?: string;
  employeeName?: string;
  vehicleInfo: SelfValetVehicleInfo;
  dropOffLocation: string;
  requestedReturnTime: string;
  valet?: SelfValetInfo;
  notes?: string;
  createdAt: string;
}

export interface ListSelfValetRequestsParams {
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface SelfValetRequestsResponse {
  data: SelfValetRequestDto[];
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  recipientUserId?: string;
  recipientUser?: UserDto;
  recipientVisitorId?: string;
  recipientVisitor?: VisitorDto;
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

export interface GateAccessLogDto {
  id: string;
  gateId: string;
  invitationId?: string;
  invitation?: InvitationDto;
  action: string;
  accessGranted: boolean;
  qrCodeData?: string;
  denialReason?: string;
  timestamp: string;
  createdAt: string;
}

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

export type VisitorParkingOption = 'no_parking' | 'parking_with_car_info' | 'parking_without_car_info';

export interface RespondToInvitationDto {
  response: 'accept' | 'reject';
  reason?: string;
  parkingOption?: VisitorParkingOption;
  licensePlate?: string;
  carModel?: string;
  carColor?: string;
}

export interface ParkingDashboardVisitorDto {
  id: string;
  visitorName: string;
  visitorCompany?: string;
  hostName: string;
  hostDepartment?: string;
  visitDate: string;
  visitTime: string;
  expectedArrival?: string;
  status: 'expected' | 'checked_in' | 'checked_out';
  parkingOption: VisitorParkingOption;
  licensePlate?: string;
  carModel?: string;
  carColor?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface ParkingDashboardDto {
  date: string;
  totalExpected: number;
  totalWithParking: number;
  totalWithCarInfo: number;
  totalWithoutCarInfo: number;
  totalNoParking: number;
  checkedIn: number;
  visitors: ParkingDashboardVisitorDto[];
}

export interface CreateUserDto {
  email: string;
  name: string;
  password?: string;
  role: string;
  department?: string;
  phoneNumber?: string;
  status?: 'active' | 'inactive';
  autoApproval?: boolean;
  managerId?: string;
}

export interface UpdateUserDto {
  name?: string;
  role?: string;
  department?: string;
  phoneNumber?: string;
  status?: 'active' | 'inactive';
  autoApproval?: boolean;
  managerId?: string;
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

export type BuffetStaffTaskStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export type BuffetMealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface BuffetStaffTaskDto {
  id: string;
  visitorName: string;
  company?: string;
  hostName: string;
  visitDate: string;
  visitTime: string;
  mealType: BuffetMealType;
  guestCount: number;
  dietaryRequirements?: string[];
  location: string;
  status: BuffetStaffTaskStatus;
  notes?: string;
  prepWindowStart?: string;
  prepWindowEnd?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface ListBuffetStaffTasksParams {
  date?: string;
  status?: BuffetStaffTaskStatus;
}

export interface UpdateBuffetStaffTaskStatusDto {
  status: BuffetStaffTaskStatus;
  notes?: string;
  estimatedReadyTime?: string;
}

export interface UpdateBuffetStaffTaskStatusResponseDto {
  id: string;
  status: BuffetStaffTaskStatus;
  estimatedReadyTime?: string;
  updatedAt: string;
}

// Buffet Admin Task types
export type BuffetAdminTaskStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface BuffetAdminTaskDto {
  id: string;
  requestId: string;
  visitorName: string;
  company?: string;
  hostName: string;
  visitDate: string;
  visitTime: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  guestCount: number;
  dietaryRequirements?: string[];
  location: string;
  status: BuffetAdminTaskStatus;
  assignedTo?: string;
  assignedToId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListBuffetAdminTasksParams {
  status?: BuffetAdminTaskStatus;
  date?: string;
  location?: string;
  mealType?: string;
  unassigned?: boolean;
  staffId?: string;
}

export interface AssignBuffetTaskDto {
  staffId: string;
}

export interface UpdateBuffetAdminTaskStatusDto {
  status: BuffetAdminTaskStatus;
  notes?: string;
}

export interface AssignBuffetTaskResponseDto {
  id: string;
  assignedTo: string;
  assignedToId: string;
  status: BuffetAdminTaskStatus;
  priority?: string;
  updatedAt: string;
}

export interface UpdateBuffetAdminTaskStatusResponseDto {
  id: string;
  status: BuffetAdminTaskStatus;
  updatedAt: string;
}

export type BuffetLocationStatus = 'active' | 'inactive' | 'maintenance';

export interface BuffetAdminLocationDto {
  id: string;
  name: string;
  floor?: string;
  capacity?: number;
  status: BuffetLocationStatus;
}

export interface CreateBuffetAdminLocationDto {
  name: string;
  floor?: string;
  building?: string;
  description?: string;
  capacity?: number;
}

export interface CreateBuffetAdminLocationResponseDto {
  id: string;
  name: string;
  floor?: string;
  building?: string;
  description?: string;
  capacity?: number;
  isActive: boolean;
  createdAt: string;
}

export interface BuffetAdminStaffDto {
  id: string;
  name: string;
  role: string;
  dutyStatus: 'on_duty' | 'off_duty';
  currentTasks: number;
}

export interface UpdateStaffDutyDto {
  dutyStatus: 'on_duty' | 'off_duty';
}

export interface UpdateStaffDutyResponseDto {
  id: string;
  name: string;
  dutyStatus: 'on_duty' | 'off_duty';
  updatedAt: string;
}

export interface BuffetLocationLoadDto {
  locationId: string;
  locationName: string;
  tasksToday: number;
  pendingTasks: number;
  activeTasks: number;
  completedTasks: number;
}

export interface BuffetStaffLoadDto {
  staffId: string;
  staffName: string;
  assignedTasks: number;
  completedToday: number;
}

export interface BuffetLoadSummaryDto {
  locations: BuffetLocationLoadDto[];
  staff: BuffetStaffLoadDto[];
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

export interface LegacyPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Admin User Management Types (matches /api/v1/users endpoints)
export type AdminUserStatus = 'active' | 'inactive';
export type AdminUserSource = 'app_created' | 'azure_ad' | 'imported';
export type AdminUserSortField = 'name' | 'role' | 'department' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  phoneNumber: string;
  status: AdminUserStatus;
  autoApproval: boolean;
  source: AdminUserSource;
  managerId: string | null;
  managerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  department?: string;
  status?: AdminUserStatus;
  sortBy?: AdminUserSortField;
  sortOrder?: SortDirection;
}

export interface AdminUserPaginatedResponse {
  data: AdminUserDto[];
  pagination: {
    page: number;
    limit: number | string;
    total: number;
    totalPages: number;
  };
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  database?: {
    connected: boolean;
    error?: string;
  };
}

export interface AzureConfigResponse {
  isConfigured: boolean;
  clientId?: string;
  tenantId?: string;
  redirectUri?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    canBypassApproval?: boolean;
  };
}

export interface GateVerificationResponse {
  accessGranted: boolean;
  invitation?: InvitationDto;
  visitor?: VisitorDto;
  denialReason?: string;
}

export interface ParkingStatsDto {
  total: number;
  available: number;
  occupied: number;
}

export interface GateStatsDto {
  total: number;
  granted: number;
  denied: number;
}

export interface NotificationConfigDto {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface GateConfigDto {
  isConfigured: boolean;
}

export interface PendingApprovalVisitorDto {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
}

export interface PendingApprovalDto {
  id: string;
  employeeName: string;
  employeeDepartment: string;
  visitor: PendingApprovalVisitorDto;
  visitDate: string;
  visitTime: string;
  duration: string;
  purpose: string;
  isWalkIn: boolean;
  hasMeetingRoom: boolean;
  hasParking: boolean;
  hasBuffet: boolean;
  hasValet: boolean;
  createdAt: string;
}

export interface PendingApprovalListParams {
  search?: string;
  isWalkIn?: boolean;
  limit?: number;
  page?: number;
}

export interface PendingApprovalListResponse {
  data: PendingApprovalDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApproveVisitPayload {
  comment?: string;
}

export interface ApproveVisitResponse {
  id: string;
  status: 'approved';
  approvedBy: string;
  approverName: string;
  approvedAt: string;
  comment?: string;
  qrCode: string;
  reminders: {
    firstReminderAt: string;
    secondReminderAt: string;
    autoCancelAt: string;
  };
}

export interface RejectVisitPayload {
  reason: string;
  comment?: string;
}

export interface RejectVisitResponse {
  id: string;
  status: 'rejected';
  rejectedBy: string;
  rejectorName: string;
  rejectedAt: string;
  reason: string;
  comment?: string;
}

export interface BulkApprovePayload {
  ids: string[];
  comment?: string;
}

export interface BulkRejectPayload {
  ids: string[];
  reason: string;
  comment?: string;
}

export interface BulkApprovalResult {
  id: string;
  success: boolean;
  error?: string;
}

export interface BulkApprovalResponse {
  successCount: number;
  failedCount: number;
  failedIds: string[];
  results: BulkApprovalResult[];
}

export interface AwaitingVisitorDto {
  id: string;
  employeeName: string;
  visitor: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    company: string;
  };
  visitDate: string;
  visitTime: string;
  status: string;
  approvedAt: string;
  autoCancelAt: string;
  firstReminderSent: boolean;
  secondReminderSent: boolean;
}

export interface AwaitingVisitorListParams {
  search?: string;
  isWalkIn?: boolean;
  limit?: number;
  page?: number;
}

export interface AwaitingVisitorListResponse {
  data: AwaitingVisitorDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PendingHostWalkInVisitorDto {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface PendingHostWalkInDto {
  id: string;
  visitor: PendingHostWalkInVisitorDto;
  visitDate: string;
  visitTime: string;
  duration: string;
  purpose: string;
  isWalkIn: boolean;
  createdAt: string;
}

export interface PendingHostWalkInListParams {
  search?: string;
  limit?: number;
  page?: number;
}

export interface PendingHostWalkInListResponse {
  data: PendingHostWalkInDto[];
  pagination: {
    page: number | string;
    limit: number | string;
    total: number;
    totalPages: number;
  };
}

export interface VisitListParams {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  myRequestsOnly?: boolean;
  pendingApproval?: boolean;
  awaitingVisitor?: boolean;
  isWalkIn?: boolean;
}

export interface VisitListItemDto {
  id: string;
  employeeName: string;
  visitor: {
    fullName: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  visitDate: string;
  visitTime: string;
  status: string;
  purpose: string;
  isWalkIn: boolean;
  createdAt: string;
  approvedAt?: string;
  autoCancelAt?: string;
  hasParking?: boolean;
  hasMeetingRoom?: boolean;
  hasBuffet?: boolean;
  hasValet?: boolean;
  visitorNeedsParking?: boolean;
  licensePlate?: string | null;
  carModel?: string | null;
  carColor?: string | null;
}

export interface VisitListResponse {
  data: VisitListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateVisitVisitorPayload {
  fullName: string;
  email: string;
  phone: string;
  company?: string;
}

export interface BuffetPreferencesPayload {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  guestCount?: number;
  specialRequirements?: string;
}

export interface CreateVisitPayload {
  visitor: CreateVisitVisitorPayload;
  visitDate: string;
  visitTime: string;
  duration?: string;
  endTime?: string;
  purpose: string;
  communicationChannels?: ('email' | 'sms' | 'whatsapp' | 'qr_code')[];
  needsMeetingRoom?: boolean;
  meetingRoomId?: string;
  needsBuffet?: boolean;
  buffetPreferences?: BuffetPreferencesPayload;
}

export interface CreateVisitResponseApproval {
  requiresApproval: boolean;
  autoApproved: boolean;
  managerId?: string;
  managerName?: string;
  approvedAt?: string;
  managerComment?: string;
}

export interface CreateVisitResponseMeetingRoom {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  timeSlot: string;
}

export interface CreateVisitResponseBuffet {
  id: string;
  mealType: string;
  location: string;
}

export interface CreateVisitResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  visitor: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    company?: string;
  };
  visitDate: string;
  visitTime: string;
  duration?: string;
  endTime?: string;
  purpose: string;
  status: string;
  communicationChannels?: string[];
  parkingType?: string;
  meetingRoom?: CreateVisitResponseMeetingRoom;
  buffet?: CreateVisitResponseBuffet;
  approval: CreateVisitResponseApproval;
  createdAt: string;
  updatedAt: string;
}

export interface VisitDetailsParkingSlot {
  id: string;
  slotNumber: string;
  location: string;
  floor?: string;
}

export interface VisitDetailsParkingAllocation {
  id: string;
  spotId: string;
  spotNumber: string;
  location: string;
  floor?: string;
  allocatedAt?: string;
  status?: string;
}

export interface VisitDetailsMeetingRoom {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  timeSlot: string;
}

export interface VisitDetailsMeetingBooking {
  id: string;
  roomId: string;
  roomName: string;
  title?: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesCount?: number;
  status?: string;
}

export interface VisitDetailsBuffet {
  id: string;
  mealType: string;
  location: string;
}

export interface VisitDetailsApproval {
  requiresApproval: boolean;
  autoApproved: boolean;
  managerId?: string;
  managerName?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  managerComment?: string;
}

export interface VisitDetailsReminders {
  firstReminderAt?: string;
  secondReminderAt?: string;
  autoCancelAt?: string;
  firstReminderSent?: boolean;
  secondReminderSent?: boolean;
}

export interface VisitDetailsRejection {
  rejectedAt: string;
  reason: string;
}

export interface VisitDetailsDto {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  visitor: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    company?: string;
  };
  visitDate: string;
  visitTime: string;
  duration?: string;
  endTime?: string;
  purpose: string;
  status: string;
  communicationChannels?: string[];
  parkingType?: string;
  parkingSlot?: VisitDetailsParkingSlot;
  parkingAllocation?: VisitDetailsParkingAllocation;
  meetingRoom?: VisitDetailsMeetingRoom;
  meetingBooking?: VisitDetailsMeetingBooking;
  buffet?: VisitDetailsBuffet;
  approval: VisitDetailsApproval;
  rejection?: VisitDetailsRejection;
  reminders?: VisitDetailsReminders;
  qrCode?: string;
  isWalkIn?: boolean;
  notes?: string;
  visitorDecision?: {
    accepted: boolean;
    reason?: string;
    decidedAt: string;
  };
  visitorNeedsParking?: boolean;
  licensePlate?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  createdAt: string;
  updatedAt: string;
  timezone?: string;
}

export interface UpdateVisitPayload {
  visitDate?: string;
  visitTime?: string;
  duration?: string;
  endTime?: string;
  purpose?: string;
  needsParking?: boolean;
  needsValet?: boolean;
  needsBuffet?: boolean;
  needsMeetingRoom?: boolean;
  communicationChannels?: ('email' | 'sms' | 'whatsapp' | 'qr_code')[];
}

export interface UpdateVisitResponse {
  id: string;
  visitDate: string;
  visitTime: string;
  duration?: string;
  endTime?: string;
  purpose: string;
  status: string;
  needsResourceReallocation?: boolean;
  resourcesAffected?: string[];
  updatedAt: string;
}

export interface CancelVisitResponse {
  id: string;
  status: string;
  cancelledBy: string;
  cancelledByName: string;
  cancelledAt: string;
  message: string;
}

export interface HostApprovePayload {
  comment?: string;
}

export interface HostApproveResponse {
  id: string;
  status: string;
  approvedBy: string;
  approverName: string;
  approvedAt: string;
  message: string;
}

export interface HostRejectPayload {
  reason: string;
  comment?: string;
}

export interface HostRejectResponse {
  id: string;
  status: string;
  rejectedBy: string;
  rejectorName: string;
  rejectedAt: string;
  reason: string;
  comment?: string;
}

export interface RoomAvailabilityParams {
  date: string;
  startTime: string;
  endTime: string;
  minCapacity?: number;
}

export interface RoomAvailabilityResponse {
  available: boolean;
}

export interface PublicInviteHostDto {
  firstName: string;
  lastName: string;
  department?: string;
  email?: string;
  phone?: string;
}

export interface PublicInviteBuildingDto {
  name: string;
  floor?: string;
  address?: string;
}

export interface PublicInviteMeetingRoomDto {
  name: string;
  floor?: string;
  building?: string;
}

export interface PublicInviteParkingDto {
  type: 'auto' | 'valet' | 'none';
  slotNumber?: string;
  location?: string;
  directions?: string;
}

export interface PublicInviteLocationDto {
  building?: string;
  address?: string;
}

export interface PublicInviteParkingInfoDto {
  type: 'auto' | 'valet' | 'none';
  location?: string;
  slotNumber?: string;
}

export interface PublicInviteValetInfoDto {
  available?: boolean;
  pickupLocation?: string;
}

export interface PublicInviteVisitorDecisionDto {
  accepted: boolean;
  decidedAt?: string;
  reason?: string;
}

export interface PublicInviteDto {
  id: string;
  status: 'pending' | 'approved' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'checked_in' | 'checked_out' | 'visitor_accepted' | 'visitor_rejected';
  hostName: string;
  hostDepartment?: string;
  visitDate: string;
  visitTime: string;
  duration?: string;
  purpose: string;
  location?: PublicInviteLocationDto;
  meetingRoom?: PublicInviteMeetingRoomDto;
  parkingInfo?: PublicInviteParkingInfoDto;
  valetInfo?: PublicInviteValetInfoDto | null;
  visitorDecision?: PublicInviteVisitorDecisionDto | null;
  canAccept: boolean;
  canReject: boolean;
  expiresAt?: string;
  qrCode?: string;
  token?: string;
  visitorFirstName?: string;
  visitorLastName?: string;
  visitorEmail?: string;
  host?: PublicInviteHostDto;
  building?: PublicInviteBuildingDto;
  parking?: PublicInviteParkingDto;
  startTime?: string;
  endTime?: string;
  hasBuffet?: boolean;
  hasValet?: boolean;
  createdAt?: string;
  visitorNeedsParking?: boolean;
  licensePlate?: string | null;
  carModel?: string | null;
  carColor?: string | null;
}

export interface AcceptInviteDto {
  visitorNotes?: string;
  needsParking?: boolean;
  licensePlate?: string;
  carModel?: string;
  carColor?: string;
}

export interface RejectInviteDto {
  reason?: string;
}

export interface PublicInviteResponseDto {
  success: boolean;
  message: string;
  status: string;
  qrCode?: string;
  data?: {
    id?: string;
    status?: string;
    message?: string;
    visitorDecision?: {
      accepted: boolean;
      decidedAt: string;
      reason?: string;
    };
  };
}

// Valet Admin Parking Dashboard Types
export interface ValetParkingDashboardSummary {
  totalVisitors: number;
  withParking: number;
  withoutParking: number;
}

export interface ValetParkingVisitorDto {
  requestId: string;
  visitorName: string;
  visitorCompany?: string;
  visitorPhone?: string;
  hostName: string;
  hostDepartment?: string;
  visitDate: string;
  visitTime: string;
  status: string;
  visitorNeedsParking: boolean;
  licensePlate?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  isWalkIn: boolean;
}

export interface ValetParkingDashboardResponse {
  summary: ValetParkingDashboardSummary;
  data: ValetParkingVisitorDto[];
}
