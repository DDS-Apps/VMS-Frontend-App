export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  language: string;
}

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  category?: string;
}

export type ViewMode = 'list' | 'grid';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export * from './common.types';
export * from './auth.types';
export * from './notification.types';
export * from './security.types';
export * from './reception.types';
export * from './analytics.types';
export * from './parking.types';

export {
  UserRole,
  UserStatus,
  InvitationStatus,
  RequestStatus,
  ParkingStatus,
  ParkingLocation,
  ParkingSpotType,
  MeetingRoomStatus,
  MeetingBookingStatus,
  BuffetRequestStatus,
  ValetAssignmentStatus,
  ValetDriverStatus,
  NotificationType,
  NotificationStatus,
  type UserDto,
  type VisitorDto,
  type InvitationDto,
  type RequestDto,
  type ParkingSpaceDto,
  type ParkingAllocationDto,
  type MeetingRoomDto,
  type MeetingBookingDto,
  type BuffetLocationDto,
  type BuffetStaffDto,
  type BuffetRequestDto,
  type ValetDriverDto,
  type ValetAssignmentDto,
  type ValetTaskDto,
  type ValetAdminDriverDto,
  type ValetDriverLoadDto,
  type ValetFairnessMetricsDto,
  type ValetDriverLoadSummaryDto,
  type ValetZoneDto,
  type AssignValetDriverDto,
  type AssignValetDriverResponseDto,
  type ListValetTasksParams,
  type ListValetAdminDriversParams,
  type ValetTaskType,
  type ValetTaskStatus,
  type ValetPriority,
  type DriverLoadLevel,
  type ValetZoneType,
  type ValetZoneStatus,
  type ValetTaskVehicleInfo,
  type ValetTaskDriverInfo,
  type ValetTaskValetInfo,
  type DriverTaskStatus,
  type DriverTaskValetInfo,
  type DriverTaskDto,
  type ListDriverTasksParams,
  type UpdateDriverTaskStatusDto,
  type UpdateDriverTaskStatusResponseDto,
  type BuffetStaffTaskStatus,
  type BuffetMealType,
  type BuffetStaffTaskDto,
  type ListBuffetStaffTasksParams,
  type UpdateBuffetStaffTaskStatusDto,
  type UpdateBuffetStaffTaskStatusResponseDto,
  type NotificationDto,
  type GateAccessLogDto,
  type CreateVisitorDto,
  type UpdateVisitorDto,
  type CreateInvitationDto,
  type UpdateInvitationDto,
  type RespondToInvitationDto,
  type CreateUserDto,
  type UpdateUserDto,
  type CreateParkingSpaceDto,
  type UpdateParkingSpaceDto,
  type AllocateParkingDto,
  type CreateMeetingRoomDto,
  type UpdateMeetingRoomDto,
  type CreateMeetingBookingDto,
  type UpdateMeetingBookingDto,
  type CreateBuffetRequestDto,
  type UpdateBuffetRequestDto,
  type CreateValetAssignmentDto,
  type UpdateValetAssignmentDto,
  type CreateRequestDto,
  type ApproveRequestDto,
  type RejectRequestDto,
  type VerifyGateAccessDto,
  type SendNotificationDto,
  type HealthCheckResponse,
  type TokenResponse,
  type GateVerificationResponse,
  type ParkingStatsDto,
  type GateStatsDto,
  type NotificationConfigDto,
  type GateConfigDto,
} from './api.types';

export { 
  type AzureConfigResponse, 
  type LegacyPaginatedResponse,
  type BulkApprovePayload,
  type BulkRejectPayload,
  type BulkApprovalResult,
  type BulkApprovalResponse,
  type AwaitingVisitorDto,
  type AwaitingVisitorListParams,
  type AwaitingVisitorListResponse,
  // Admin User Management Types
  type AdminUserStatus,
  type AdminUserSource,
  type AdminUserSortField,
  type SortDirection,
  type AdminUserDto,
  type AdminUserListParams,
  type AdminUserPaginatedResponse,
} from './api.types';
