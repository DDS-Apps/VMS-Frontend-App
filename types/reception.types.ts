import type { VisitStatus, AlertPriority, SortOrder, BaseListParams } from './common.types';

export type ReceptionAlertType =
  | 'visitor_arrival'
  | 'visitor_waiting'
  | 'visitor_overstay'
  | 'walk_in'
  | 'vip_arrival'
  | 'system';

export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export type VisitorIdType = 'national_id' | 'passport' | 'iqama' | 'driver_license';

export type CommunicationChannel = 'sms' | 'email' | 'whatsapp' | 'call';

export interface MeetingRoomInfo {
  id: string;
  name: string;
  floor?: string;
  building?: string;
}

export interface RoomBookingInfo {
  id: string;
  visitId: string;
  visitorName: string;
  hostName?: string;
  startTime: string;
  endTime?: string;
}

export interface VisitorInfo {
  id: string;
  fullName: string;
  company?: string;
  phone?: string;
  email?: string;
}

export interface MeetingRoomSlot {
  name: string;
  floor?: string;
}

export interface ParkingSlotInfo {
  slotNumber: string;
}

export interface TodayVisitorDto {
  id: string;
  visitor: VisitorInfo;
  hostName: string;
  hostDepartment?: string;
  visitDate?: string;
  visitTime: string;
  /** ISO 8601 UTC timestamp of the canonical visit start. Preferred for upcoming-alert calculations. */
  visitStartAt?: string;
  /** IANA timezone for the visit. Use for formatting absolute timestamps. Falls back to Asia/Riyadh when absent. */
  timezone?: string;
  status: string;
  meetingRoom?: MeetingRoomSlot;
  parkingSlot?: ParkingSlotInfo;
  qrCode?: string;
  purpose?: string;
  isWalkIn?: boolean;
  hasMeetingRoom?: boolean;
  hasParking?: boolean;
  hasBuffet?: boolean;
  hasValet?: boolean;
  isBuffet?: boolean;
  isMeetingRoom?: boolean;
  isVisitorNeedsParking?: boolean;
  visitorNeedsParking?: boolean;
  /** Actual check-in timestamp from backend (ISO string) */
  checkedInAt?: string;
  /** Actual check-out timestamp from backend (ISO string) */
  checkedOutAt?: string;
  /** Scheduled end/departure time — wall-clock string (e.g. "2:45 PM") from backend */
  endTime?: string;
  /** @deprecated use endTime */
  scheduledEndTime?: string;
}

export interface TodaySummary {
  expected: number;
  checkedIn: number;
  completed: number;
  pending: number;
}

export interface TodayVisitorsResponse {
  summary: TodaySummary;
  data: TodayVisitorDto[];
}

export interface ReceptionAlert {
  id: string;
  type: ReceptionAlertType;
  priority: Exclude<AlertPriority, 'critical'>;
  title: string;
  message: string;
  visitId?: string;
  visitorName?: string;
  createdAt: string;
  isRead: boolean;
}

export interface RoomStatusDto {
  id: string;
  name: string;
  floor?: string;
  building?: string;
  capacity: number;
  status: RoomStatus;
  currentBooking?: RoomBookingInfo;
  nextBooking?: Omit<RoomBookingInfo, 'hostName' | 'endTime'>;
}

export interface WalkInRegistrationDto {
  visitorName: string;
  visitorEmail?: string;
  visitorCompany?: string;
  visitorPhone?: string;
  hostId: string;
  hostName: string;
  visitType: string;
  purpose: string;
  idType?: VisitorIdType;
  idNumber?: string;
}

export interface WalkInResponseDto {
  id: string;
  visitor: VisitorInfo;
  hostName: string;
  visitDate: string;
  visitTime: string;
  status: string;
  isWalkIn: boolean;
  createdAt: string;
}

export interface CommunicationOverrideDto {
  visitId: string;
  channel: CommunicationChannel;
  message?: string;
}

export interface ListReceptionTodayParams {
  hostName?: string;
  search?: string;
  status?: 'expected' | 'checked_in' | 'completed';
}

export interface SearchVisitorParams {
  q: string;
  limit?: number;
}

export interface SearchVisitorDto {
  id: string;
  visitor: {
    fullName: string;
    company?: string;
  };
  visitDate: string;
  visitTime: string;
  status: string;
  hostName: string;
}

export interface SearchVisitorsResponse {
  data: SearchVisitorDto[];
}

export interface CheckInDto {
  notes?: string;
  badgeNumber?: string;
  idVerified?: boolean;
  idType?: VisitorIdType;
  idNumber?: string;
}

export interface CheckInResponseDto {
  id: string;
  status: 'checked_in';
  checkedInAt: string;
  checkedInBy: string;
  checkedInByName: string;
  badgeNumber?: string;
  idVerified: boolean;
}

export interface CheckOutDto {
  notes?: string;
  badgeReturned?: boolean;
  rating?: number;
  feedback?: string;
}

export interface CheckOutResponseDto {
  id: string;
  status: 'completed';
  completedAt: string;
  checkedOutBy: string;
  checkedOutByName: string;
  visitDuration: string;
  badgeReturned: boolean;
}
