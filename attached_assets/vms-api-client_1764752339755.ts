/**
 * VMS Backend API Client
 * Copy this file to your frontend Replit project
 * 
 * Usage:
 * 1. Copy this file and vms-api-types.ts to your frontend project
 * 2. Update API_BASE_URL with your backend URL
 * 3. Import and use the client
 */

import type {
  User,
  Visitor,
  Invitation,
  Request,
  ParkingSpace,
  ParkingAllocation,
  MeetingRoom,
  MeetingBooking,
  BuffetLocation,
  BuffetStaff,
  BuffetRequest,
  ValetDriver,
  ValetAssignment,
  Notification,
  GateAccessLog,
  CreateVisitorDto,
  UpdateVisitorDto,
  CreateInvitationDto,
  UpdateInvitationDto,
  RespondToInvitationDto,
  CreateUserDto,
  UpdateUserDto,
  CreateParkingSpaceDto,
  UpdateParkingSpaceDto,
  AllocateParkingDto,
  CreateMeetingRoomDto,
  UpdateMeetingRoomDto,
  CreateMeetingBookingDto,
  UpdateMeetingBookingDto,
  CreateBuffetRequestDto,
  UpdateBuffetRequestDto,
  CreateValetAssignmentDto,
  UpdateValetAssignmentDto,
  CreateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  VerifyGateAccessDto,
  SendNotificationDto,
  PaginatedResponse,
  HealthCheckResponse,
  AuthConfigResponse,
  TokenResponse,
  GateVerificationResponse,
  UserRole,
  InvitationStatus,
  RequestStatus,
  ParkingStatus,
  ParkingLocation,
  BuffetRequestStatus,
  ValetAssignmentStatus,
} from './vms-api-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

// UPDATE THIS URL with your backend Replit URL
const API_BASE_URL = 'https://6dd8abd4-1ba4-4930-9228-1c309ae5d4e2-00-2v2xb6f19be8f.sisko.replit.dev';

// ============================================================================
// HTTP CLIENT
// ============================================================================

class VMSApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  // Set the JWT access token for authenticated requests
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}`,
        errorData
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  private get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  private post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ==========================================================================
  // HEALTH
  // ==========================================================================

  health = {
    check: (): Promise<HealthCheckResponse> => 
      this.get('/health'),
    
    checkDatabase: (): Promise<HealthCheckResponse> => 
      this.get('/health/db'),
  };

  // ==========================================================================
  // AUTH
  // ==========================================================================

  auth = {
    getConfig: (): Promise<AuthConfigResponse> => 
      this.get('/api/v1/auth/config'),
    
    azureLogin: (azureToken: string): Promise<TokenResponse> => 
      this.post('/api/v1/auth/azure/login', { token: azureToken }),
    
    refresh: (refreshToken: string): Promise<TokenResponse> => 
      this.post('/api/v1/auth/refresh', { refreshToken }),
    
    me: (): Promise<User> => 
      this.get('/api/v1/auth/me'),
    
    logout: (): Promise<void> => 
      this.post('/api/v1/auth/logout'),
  };

  // ==========================================================================
  // USERS
  // ==========================================================================

  users = {
    create: (data: CreateUserDto): Promise<User> => 
      this.post('/api/v1/users', data),
    
    list: (params?: {
      page?: number;
      limit?: number;
      role?: UserRole;
      department?: string;
      search?: string;
      isActive?: boolean;
    }): Promise<PaginatedResponse<User>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.role) query.set('role', params.role);
      if (params?.department) query.set('department', params.department);
      if (params?.search) query.set('search', params.search);
      if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
      return this.get(`/api/v1/users?${query.toString()}`);
    },
    
    getById: (id: string): Promise<User> => 
      this.get(`/api/v1/users/${id}`),
    
    update: (id: string, data: UpdateUserDto): Promise<User> => 
      this.patch(`/api/v1/users/${id}`, data),
    
    delete: (id: string): Promise<void> => 
      this.delete(`/api/v1/users/${id}`),
    
    getManagers: (): Promise<User[]> => 
      this.get('/api/v1/users/managers'),
    
    getOnVacation: (): Promise<User[]> => 
      this.get('/api/v1/users/on-vacation'),
    
    getByRole: (role: UserRole): Promise<User[]> => 
      this.get(`/api/v1/users/by-role/${role}`),
    
    getTeam: (managerId: string): Promise<User[]> => 
      this.get(`/api/v1/users/${managerId}/team`),
  };

  // ==========================================================================
  // VISITORS
  // ==========================================================================

  visitors = {
    create: (data: CreateVisitorDto): Promise<Visitor> => 
      this.post('/api/v1/visitors', data),
    
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      isBlacklisted?: boolean;
    }): Promise<PaginatedResponse<Visitor>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.search) query.set('search', params.search);
      if (params?.isBlacklisted !== undefined) query.set('isBlacklisted', params.isBlacklisted.toString());
      return this.get(`/api/v1/visitors?${query.toString()}`);
    },
    
    getById: (id: string): Promise<Visitor> => 
      this.get(`/api/v1/visitors/${id}`),
    
    update: (id: string, data: UpdateVisitorDto): Promise<Visitor> => 
      this.patch(`/api/v1/visitors/${id}`, data),
    
    getBlacklisted: (): Promise<Visitor[]> => 
      this.get('/api/v1/visitors/blacklisted'),
    
    blacklist: (id: string, isBlacklisted: boolean, reason?: string): Promise<Visitor> => 
      this.patch(`/api/v1/visitors/${id}/blacklist`, { isBlacklisted, reason }),
  };

  // ==========================================================================
  // INVITATIONS
  // ==========================================================================

  invitations = {
    create: (data: CreateInvitationDto): Promise<Invitation> => 
      this.post('/api/v1/invitations', data),
    
    list: (params?: {
      page?: number;
      limit?: number;
      status?: InvitationStatus;
      hostId?: string;
      visitorId?: string;
      startDate?: string;
      endDate?: string;
    }): Promise<PaginatedResponse<Invitation>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.status) query.set('status', params.status);
      if (params?.hostId) query.set('hostId', params.hostId);
      if (params?.visitorId) query.set('visitorId', params.visitorId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      return this.get(`/api/v1/invitations?${query.toString()}`);
    },
    
    getById: (id: string): Promise<Invitation> => 
      this.get(`/api/v1/invitations/${id}`),
    
    update: (id: string, data: UpdateInvitationDto): Promise<Invitation> => 
      this.patch(`/api/v1/invitations/${id}`, data),
    
    delete: (id: string): Promise<void> => 
      this.delete(`/api/v1/invitations/${id}`),
    
    getToday: (): Promise<Invitation[]> => 
      this.get('/api/v1/invitations/today'),
    
    getMyUpcoming: (): Promise<Invitation[]> => 
      this.get('/api/v1/invitations/my-upcoming'),
    
    getByToken: (token: string): Promise<Invitation> => 
      this.get(`/api/v1/invitations/respond/${token}`),
    
    respond: (token: string, data: RespondToInvitationDto): Promise<Invitation> => 
      this.post(`/api/v1/invitations/respond/${token}`, data),
    
    checkIn: (id: string): Promise<Invitation> => 
      this.post(`/api/v1/invitations/${id}/check-in`),
    
    checkOut: (id: string): Promise<Invitation> => 
      this.post(`/api/v1/invitations/${id}/check-out`),
  };

  // ==========================================================================
  // REQUESTS (Approval Workflow)
  // ==========================================================================

  requests = {
    create: (data: CreateRequestDto): Promise<Request> => 
      this.post('/api/v1/requests', data),
    
    list: (params?: {
      page?: number;
      limit?: number;
      status?: RequestStatus;
      requesterId?: string;
      approverId?: string;
      requestType?: string;
    }): Promise<PaginatedResponse<Request>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.status) query.set('status', params.status);
      if (params?.requesterId) query.set('requesterId', params.requesterId);
      if (params?.approverId) query.set('approverId', params.approverId);
      if (params?.requestType) query.set('requestType', params.requestType);
      return this.get(`/api/v1/requests?${query.toString()}`);
    },
    
    getById: (id: string): Promise<Request> => 
      this.get(`/api/v1/requests/${id}`),
    
    getMyRequests: (): Promise<Request[]> => 
      this.get('/api/v1/requests/my-requests'),
    
    getPendingApprovals: (): Promise<Request[]> => 
      this.get('/api/v1/requests/pending-approvals'),
    
    approve: (id: string, data?: ApproveRequestDto): Promise<Request> => 
      this.post(`/api/v1/requests/${id}/approve`, data),
    
    reject: (id: string, data: RejectRequestDto): Promise<Request> => 
      this.post(`/api/v1/requests/${id}/reject`, data),
    
    cancel: (id: string): Promise<void> => 
      this.delete(`/api/v1/requests/${id}`),
  };

  // ==========================================================================
  // PARKING
  // ==========================================================================

  parking = {
    // Spaces
    createSpace: (data: CreateParkingSpaceDto): Promise<ParkingSpace> => 
      this.post('/api/v1/parking/spaces', data),
    
    listSpaces: (params?: {
      page?: number;
      limit?: number;
      location?: ParkingLocation;
      status?: ParkingStatus;
      isActive?: boolean;
    }): Promise<PaginatedResponse<ParkingSpace>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.location) query.set('location', params.location);
      if (params?.status) query.set('status', params.status);
      if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
      return this.get(`/api/v1/parking/spaces?${query.toString()}`);
    },
    
    getSpace: (id: string): Promise<ParkingSpace> => 
      this.get(`/api/v1/parking/spaces/${id}`),
    
    updateSpace: (id: string, data: UpdateParkingSpaceDto): Promise<ParkingSpace> => 
      this.patch(`/api/v1/parking/spaces/${id}`, data),
    
    getAvailableSpaces: (params?: { location?: ParkingLocation }): Promise<ParkingSpace[]> => {
      const query = new URLSearchParams();
      if (params?.location) query.set('location', params.location);
      return this.get(`/api/v1/parking/spaces/available?${query.toString()}`);
    },
    
    // Allocations
    autoAllocate: (data: AllocateParkingDto): Promise<ParkingAllocation> => 
      this.post('/api/v1/parking/allocate/auto', data),
    
    manualAllocate: (spaceId: string, data: AllocateParkingDto): Promise<ParkingAllocation> => 
      this.post(`/api/v1/parking/allocate/${spaceId}`, data),
    
    listAllocations: (params?: {
      page?: number;
      limit?: number;
      isActive?: boolean;
    }): Promise<PaginatedResponse<ParkingAllocation>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
      return this.get(`/api/v1/parking/allocations?${query.toString()}`);
    },
    
    checkIn: (allocationId: string): Promise<ParkingAllocation> => 
      this.post(`/api/v1/parking/allocations/${allocationId}/check-in`),
    
    checkOut: (allocationId: string): Promise<ParkingAllocation> => 
      this.post(`/api/v1/parking/allocations/${allocationId}/check-out`),
    
    release: (allocationId: string): Promise<void> => 
      this.post(`/api/v1/parking/allocations/${allocationId}/release`),
    
    getStats: (): Promise<{ total: number; available: number; occupied: number }> => 
      this.get('/api/v1/parking/stats'),
  };

  // ==========================================================================
  // MEETING ROOMS
  // ==========================================================================

  meetingRooms = {
    create: (data: CreateMeetingRoomDto): Promise<MeetingRoom> => 
      this.post('/api/v1/meeting-rooms', data),
    
    list: (params?: {
      page?: number;
      limit?: number;
      floor?: string;
      capacity?: number;
      isActive?: boolean;
    }): Promise<PaginatedResponse<MeetingRoom>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.floor) query.set('floor', params.floor);
      if (params?.capacity) query.set('capacity', params.capacity.toString());
      if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
      return this.get(`/api/v1/meeting-rooms?${query.toString()}`);
    },
    
    getById: (id: string): Promise<MeetingRoom> => 
      this.get(`/api/v1/meeting-rooms/${id}`),
    
    update: (id: string, data: UpdateMeetingRoomDto): Promise<MeetingRoom> => 
      this.patch(`/api/v1/meeting-rooms/${id}`, data),
    
    getAvailable: (startTime: string, endTime: string, capacity?: number): Promise<MeetingRoom[]> => {
      const query = new URLSearchParams({ startTime, endTime });
      if (capacity) query.set('capacity', capacity.toString());
      return this.get(`/api/v1/meeting-rooms/available?${query.toString()}`);
    },
    
    // Bookings
    createBooking: (data: CreateMeetingBookingDto): Promise<MeetingBooking> => 
      this.post('/api/v1/meeting-rooms/bookings', data),
    
    listBookings: (params?: {
      page?: number;
      limit?: number;
      meetingRoomId?: string;
      startDate?: string;
      endDate?: string;
    }): Promise<PaginatedResponse<MeetingBooking>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.meetingRoomId) query.set('meetingRoomId', params.meetingRoomId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      return this.get(`/api/v1/meeting-rooms/bookings/all?${query.toString()}`);
    },
    
    getBooking: (id: string): Promise<MeetingBooking> => 
      this.get(`/api/v1/meeting-rooms/bookings/${id}`),
    
    updateBooking: (id: string, data: UpdateMeetingBookingDto): Promise<MeetingBooking> => 
      this.patch(`/api/v1/meeting-rooms/bookings/${id}`, data),
    
    cancelBooking: (id: string): Promise<void> => 
      this.delete(`/api/v1/meeting-rooms/bookings/${id}`),
    
    getTodaysBookings: (): Promise<MeetingBooking[]> => 
      this.get('/api/v1/meeting-rooms/bookings/today'),
  };

  // ==========================================================================
  // BUFFET
  // ==========================================================================

  buffet = {
    // Locations
    createLocation: (data: { name: string; floor?: string; building?: string; capacity?: number }): Promise<BuffetLocation> => 
      this.post('/api/v1/buffet/locations', data),
    
    listLocations: (): Promise<BuffetLocation[]> => 
      this.get('/api/v1/buffet/locations'),
    
    getLocation: (id: string): Promise<BuffetLocation> => 
      this.get(`/api/v1/buffet/locations/${id}`),
    
    updateLocation: (id: string, data: Partial<BuffetLocation>): Promise<BuffetLocation> => 
      this.patch(`/api/v1/buffet/locations/${id}`, data),
    
    // Staff
    createStaff: (data: { userId: string; buffetLocationId: string }): Promise<BuffetStaff> => 
      this.post('/api/v1/buffet/staff', data),
    
    listStaff: (): Promise<BuffetStaff[]> => 
      this.get('/api/v1/buffet/staff'),
    
    getStaff: (id: string): Promise<BuffetStaff> => 
      this.get(`/api/v1/buffet/staff/${id}`),
    
    updateStaff: (id: string, data: Partial<BuffetStaff>): Promise<BuffetStaff> => 
      this.patch(`/api/v1/buffet/staff/${id}`, data),
    
    getOnDutyStaff: (): Promise<BuffetStaff[]> => 
      this.get('/api/v1/buffet/staff/on-duty'),
    
    // Requests
    createRequest: (data: CreateBuffetRequestDto): Promise<BuffetRequest> => 
      this.post('/api/v1/buffet/requests', data),
    
    listRequests: (params?: {
      page?: number;
      limit?: number;
      status?: BuffetRequestStatus;
    }): Promise<PaginatedResponse<BuffetRequest>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.status) query.set('status', params.status);
      return this.get(`/api/v1/buffet/requests?${query.toString()}`);
    },
    
    getRequest: (id: string): Promise<BuffetRequest> => 
      this.get(`/api/v1/buffet/requests/${id}`),
    
    updateRequest: (id: string, data: UpdateBuffetRequestDto): Promise<BuffetRequest> => 
      this.patch(`/api/v1/buffet/requests/${id}`, data),
    
    handleRequest: (id: string, status: BuffetRequestStatus): Promise<BuffetRequest> => 
      this.post(`/api/v1/buffet/requests/${id}/handle`, { status }),
    
    getTodaysRequests: (): Promise<BuffetRequest[]> => 
      this.get('/api/v1/buffet/requests/today'),
    
    getPendingRequests: (): Promise<BuffetRequest[]> => 
      this.get('/api/v1/buffet/requests/pending'),
  };

  // ==========================================================================
  // VALET
  // ==========================================================================

  valet = {
    // Drivers
    createDriver: (data: { userId: string; licenseNumber?: string }): Promise<ValetDriver> => 
      this.post('/api/v1/valet/drivers', data),
    
    listDrivers: (): Promise<ValetDriver[]> => 
      this.get('/api/v1/valet/drivers'),
    
    getDriver: (id: string): Promise<ValetDriver> => 
      this.get(`/api/v1/valet/drivers/${id}`),
    
    updateDriver: (id: string, data: Partial<ValetDriver>): Promise<ValetDriver> => 
      this.patch(`/api/v1/valet/drivers/${id}`, data),
    
    getAvailableDrivers: (): Promise<ValetDriver[]> => 
      this.get('/api/v1/valet/drivers/available'),
    
    // Assignments
    createAssignment: (data: CreateValetAssignmentDto): Promise<ValetAssignment> => 
      this.post('/api/v1/valet/assignments', data),
    
    listAssignments: (params?: {
      page?: number;
      limit?: number;
      status?: ValetAssignmentStatus;
      driverId?: string;
    }): Promise<PaginatedResponse<ValetAssignment>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.status) query.set('status', params.status);
      if (params?.driverId) query.set('driverId', params.driverId);
      return this.get(`/api/v1/valet/assignments?${query.toString()}`);
    },
    
    getAssignment: (id: string): Promise<ValetAssignment> => 
      this.get(`/api/v1/valet/assignments/${id}`),
    
    updateAssignment: (id: string, data: UpdateValetAssignmentDto): Promise<ValetAssignment> => 
      this.patch(`/api/v1/valet/assignments/${id}`, data),
    
    deleteAssignment: (id: string): Promise<void> => 
      this.delete(`/api/v1/valet/assignments/${id}`),
    
    getMyAssignments: (): Promise<ValetAssignment[]> => 
      this.get('/api/v1/valet/assignments/my'),
    
    getTodaysAssignments: (): Promise<ValetAssignment[]> => 
      this.get('/api/v1/valet/assignments/today'),
    
    acceptAssignment: (id: string): Promise<ValetAssignment> => 
      this.post(`/api/v1/valet/assignments/${id}/accept`),
    
    rejectAssignment: (id: string): Promise<ValetAssignment> => 
      this.post(`/api/v1/valet/assignments/${id}/reject`),
    
    startAssignment: (id: string): Promise<ValetAssignment> => 
      this.post(`/api/v1/valet/assignments/${id}/start`),
    
    completeAssignment: (id: string, parkedAtLocation?: string): Promise<ValetAssignment> => 
      this.post(`/api/v1/valet/assignments/${id}/complete`, { parkedAtLocation }),
  };

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  notifications = {
    getConfig: (): Promise<{ email: boolean; sms: boolean; whatsapp: boolean }> => 
      this.get('/api/v1/notifications/config'),
    
    create: (data: SendNotificationDto): Promise<Notification> => 
      this.post('/api/v1/notifications', data),
    
    send: (data: SendNotificationDto): Promise<Notification> => 
      this.post('/api/v1/notifications/send', data),
    
    list: (params?: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
    }): Promise<PaginatedResponse<Notification>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.type) query.set('type', params.type);
      if (params?.status) query.set('status', params.status);
      return this.get(`/api/v1/notifications?${query.toString()}`);
    },
    
    getById: (id: string): Promise<Notification> => 
      this.get(`/api/v1/notifications/${id}`),
    
    getPending: (): Promise<Notification[]> => 
      this.get('/api/v1/notifications/pending'),
    
    retry: (id: string): Promise<Notification> => 
      this.post(`/api/v1/notifications/${id}/retry`),
    
    retryAllFailed: (): Promise<void> => 
      this.post('/api/v1/notifications/retry-failed'),
  };

  // ==========================================================================
  // GATES
  // ==========================================================================

  gates = {
    getConfig: (): Promise<{ isConfigured: boolean }> => 
      this.get('/api/v1/gates/config'),
    
    verify: (data: VerifyGateAccessDto): Promise<GateVerificationResponse> => 
      this.post('/api/v1/gates/verify', data),
    
    listLogs: (params?: {
      page?: number;
      limit?: number;
      gateId?: string;
      startDate?: string;
      endDate?: string;
    }): Promise<PaginatedResponse<GateAccessLog>> => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.gateId) query.set('gateId', params.gateId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      return this.get(`/api/v1/gates/logs?${query.toString()}`);
    },
    
    getTodaysLogs: (): Promise<GateAccessLog[]> => 
      this.get('/api/v1/gates/logs/today'),
    
    getStats: (startDate: string, endDate: string): Promise<{ total: number; granted: number; denied: number }> => 
      this.get(`/api/v1/gates/stats?startDate=${startDate}&endDate=${endDate}`),
  };
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const vmsApi = new VMSApiClient();

// Also export the class for custom instances
export { VMSApiClient };
