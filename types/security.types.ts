import type { VisitStatus, AlertPriority, BaseListParams } from './common.types';

export type SecurityAlertType =
  | 'blacklist_match'
  | 'expired_invite'
  | 'unauthorized_access'
  | 'suspicious_activity'
  | 'emergency'
  | 'system';

export type GateAction = 'scan' | 'check_in' | 'check_out' | 'denied' | 'access_denied' | 'manual_override';

export type GateResult = 'success' | 'failed' | 'blocked' | 'allowed' | 'denied';

export interface SecurityVisitorDto {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string;
  visitorCompany?: string;
  visitorIdType?: string;
  visitorIdNumber?: string;
  visitorPhoto?: string;
  hostId: string;
  hostName: string;
  hostDepartment?: string;
  hostPhoneNumber?: string;
  hostBusinessPhone?: string;
  purpose: string;
  scheduledDate: string;
  scheduledTime: string;
  /** ISO 8601 UTC timestamp of the canonical visit start. Preferred for upcoming-alert calculations. */
  visitStartAt?: string;
  /** IANA timezone for the visit. Use for display formatting; never use device timezone for business logic. */
  timezone?: string;
  endTime?: string;
  duration?: string;
  status: VisitStatus;
  isBlacklisted: boolean;
  accessAreas?: string[];
  parkingAssigned?: boolean;
  parkingSpot?: string;
  isVisitorNeedsParking?: boolean;
  visitorNeedsParking?: boolean;
  licensePlate?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  isBuffet?: boolean;
  isMeetingRoom?: boolean;
  meetingRoom?: { id: string; name: string; floor: string; capacity?: number; timeSlot?: string };
  buffet?: { id: string; mealType: string; location: string };
  valetAssigned?: boolean;
  valetDriverName?: string;
  valetStatus?: string;
  isWalkIn?: boolean;
  qrCode?: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  completedAt?: string;
  timeline?: {
    checkedInAt?: string;
    checkedOutAt?: string;
    completedAt?: string;
  };
  gateUsed?: string;
  notes?: string;
}

export interface SecuritySummary {
  expectedToday: number;
  checkedIn: number;
  checkedOut: number;
  currentlyOnSite: number;
  blockedEntries: number;
  /** Today's walk-in visitors (not pre-registered). Derived from isWalkIn flag on visit records. */
  walkIns: number;
}

export interface SecurityAlert {
  id: string;
  type: SecurityAlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  visitId?: string;
  visitorName?: string;
  gateId?: string;
  createdAt: string;
  isRead: boolean;
  requiresAction: boolean;
}

export interface GateLogEntry {
  id: string;
  visitId?: string;
  visitorName?: string;
  visitorId?: string;
  gateId: string;
  gateName: string;
  action: GateAction;
  result: GateResult;
  reason?: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface QRScanResult {
  valid: boolean;
  visitId?: string;
  visitor?: SecurityVisitorDto;
  message: string;
  canCheckIn: boolean;
  canCheckOut: boolean;
  warnings?: string[];
}

export interface BlacklistMatchRecord {
  id: string;
  reason: string;
  addedAt: string;
  addedBy: string;
}

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  matchedRecords?: BlacklistMatchRecord[];
}

export interface GateCheckInDto {
  visitId: string;
  gateId: string;
  notes?: string;
}

export interface GateCheckOutDto {
  visitId: string;
  gateId: string;
  notes?: string;
}

export interface ListSecurityTodayParams extends BaseListParams {
  status?: VisitStatus | 'on_site';
  gateId?: string;
}

export interface ListGateLogsParams extends BaseListParams {
  gateId?: string;
  action?: string;
  result?: string;
  startDate?: string;
  endDate?: string;
}

export interface BlacklistCheckParams {
  email?: string;
  phone?: string;
  idNumber?: string;
}
