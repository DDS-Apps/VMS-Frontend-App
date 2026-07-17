import type { RequestStatus, CommunicationChannel, ParkingLocation } from '@/types/vms.types';
import type { BuffetMealType } from '@/types/api.types';
import { ParkingLocation as ApiParkingLocation } from '@/types/api.types';

export const PURPOSE_OPTIONS = [
  { value: 'business_meeting', labelKey: 'visitor.businessMeeting' },
  { value: 'interview', labelKey: 'visitor.interview' },
  { value: 'delivery', labelKey: 'visitor.delivery' },
  { value: 'maintenance', labelKey: 'visitor.maintenance' },
  { value: 'general', labelKey: 'visitor.generalVisit' },
  { value: 'partners', labelKey: 'visitor.partners' },
  { value: 'government', labelKey: 'visitor.government' },
  { value: 'vip', labelKey: 'visitor.vip' },
  { value: 'contractor', labelKey: 'visitor.contractor' },
  { value: 'vendors', labelKey: 'visitor.vendors' },
] as const;

export const PURPOSE_VALUE_TO_KEY: Record<string, string> = {
  business_meeting: 'visitor.businessMeeting',
  interview: 'visitor.interview',
  delivery: 'visitor.delivery',
  maintenance: 'visitor.maintenance',
  general: 'visitor.generalVisit',
  partners: 'visitor.partners',
  government: 'visitor.government',
  vip: 'visitor.vip',
  contractor: 'visitor.contractor',
  vendors: 'visitor.vendors',
  meeting: 'visitor.meeting',
};

const ARABIC_PURPOSE_TO_VALUE: Record<string, string> = {
  'اجتماع عمل': 'business_meeting',
  'مقابلة': 'interview',
  'توصيل': 'delivery',
  'صيانة': 'maintenance',
  'زيارة عامة': 'general',
  'شركاء': 'partners',
  'حكومي': 'government',
  'شخصية مهمة': 'vip',
  'مقاول': 'contractor',
  'موردون': 'vendors',
  'اجتماع': 'meeting',
};

const ENGLISH_PURPOSE_TO_VALUE: Record<string, string> = {
  'Business Meeting': 'business_meeting',
  'Interview': 'interview',
  'Delivery': 'delivery',
  'Maintenance': 'maintenance',
  'General Visit': 'general',
  'Partners': 'partners',
  'Government': 'government',
  'VIP': 'vip',
  'Contractor': 'contractor',
  'Vendors': 'vendors',
  'Meeting': 'meeting',
};

export function normalizePurposeValue(purpose: string): string {
  if (!purpose) return '';
  const lower = purpose.toLowerCase();
  if (PURPOSE_VALUE_TO_KEY[lower]) return lower;
  if (PURPOSE_VALUE_TO_KEY[purpose]) return purpose;
  const fromArabic = ARABIC_PURPOSE_TO_VALUE[purpose];
  if (fromArabic) return fromArabic;
  const fromEnglish = ENGLISH_PURPOSE_TO_VALUE[purpose];
  if (fromEnglish) return fromEnglish;
  return purpose;
}

export const MEAL_TYPES: readonly BuffetMealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
] as const;

export const COMMUNICATION_CHANNELS: readonly CommunicationChannel[] = [
  'email',
  'sms',
  'whatsapp',
  'qr_code',
] as const;

export const PARKING_LOCATIONS = {
  SKBC_BASEMENT: ApiParkingLocation.SKBC_BASEMENT,
  REDSEA_MALL: ApiParkingLocation.REDSEA_MALL,
  VALET: ApiParkingLocation.VALET,
} as const;

export const PARKING_LOCATION_ALIASES: Record<string, ParkingLocation> = {
  'skbc_basement': 'skbc_basement',
  'SKBC_basement': 'skbc_basement',
  'SKBC_BASEMENT': 'skbc_basement',
  'redsea_mall': 'red_sea_mall',
  'red_sea_mall': 'red_sea_mall',
  'REDSEA_MALL': 'red_sea_mall',
  'valet': 'valet',
  'VALET': 'valet',
};

export const API_STATUS_MAP: Record<string, RequestStatus> = {
  pending: 'pending_approval',
  pending_approval: 'pending_approval',
  pending_host_approval: 'pending_host_approval',
  approved: 'approved',
  rejected: 'rejected',
  checked_in: 'checked_in',
  checked_out: 'completed',
  cancelled: 'cancelled',
  expired: 'auto_cancelled',
  awaiting_visitor: 'visitor_pending',
  visitor_pending: 'visitor_pending',
  visitor_accepted: 'visitor_accepted',
  visitor_rejected: 'visitor_rejected',
  completed: 'completed',
  accepted: 'visitor_accepted',
};

export const REQUEST_STATUS_VALUES: readonly RequestStatus[] = [
  'draft',
  'pending_approval',
  'pending_host_approval',
  'approved',
  'rejected',
  'visitor_pending',
  'visitor_accepted',
  'visitor_rejected',
  'checked_in',
  'completed',
  'cancelled',
  'auto_cancelled',
] as const;

export const REQUEST_STATUS = {
  DRAFT: 'draft' as RequestStatus,
  PENDING_APPROVAL: 'pending_approval' as RequestStatus,
  PENDING_HOST_APPROVAL: 'pending_host_approval' as RequestStatus,
  APPROVED: 'approved' as RequestStatus,
  REJECTED: 'rejected' as RequestStatus,
  VISITOR_PENDING: 'visitor_pending' as RequestStatus,
  VISITOR_ACCEPTED: 'visitor_accepted' as RequestStatus,
  VISITOR_REJECTED: 'visitor_rejected' as RequestStatus,
  CHECKED_IN: 'checked_in' as RequestStatus,
  COMPLETED: 'completed' as RequestStatus,
  CANCELLED: 'cancelled' as RequestStatus,
  AUTO_CANCELLED: 'auto_cancelled' as RequestStatus,
} as const;

export const ACTIVE_STATUSES: readonly RequestStatus[] = [
  REQUEST_STATUS.PENDING_APPROVAL,
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.VISITOR_ACCEPTED,
  REQUEST_STATUS.CHECKED_IN,
] as const;

export const COMPLETED_STATUSES: readonly RequestStatus[] = [
  REQUEST_STATUS.COMPLETED,
] as const;

export const CANCELLED_STATUSES: readonly RequestStatus[] = [
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.AUTO_CANCELLED,
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.VISITOR_REJECTED,
] as const;

export const UPCOMING_STATUSES: readonly RequestStatus[] = [
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.VISITOR_ACCEPTED,
  REQUEST_STATUS.PENDING_APPROVAL,
] as const;

/** Only visitor_accepted visits show the upcoming alert indicator */
export const UPCOMING_INDICATOR_ELIGIBLE_STATUSES: readonly RequestStatus[] = [
  REQUEST_STATUS.VISITOR_ACCEPTED,
] as const;

/** Statuses that must never show the upcoming alert indicator */
export const UPCOMING_INDICATOR_EXCLUDED_STATUSES: readonly RequestStatus[] = [
  REQUEST_STATUS.CHECKED_IN,
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.AUTO_CANCELLED,
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.VISITOR_REJECTED,
  REQUEST_STATUS.VISITOR_PENDING,
  REQUEST_STATUS.PENDING_APPROVAL,
  REQUEST_STATUS.PENDING_HOST_APPROVAL,
] as const;

export const UPCOMING_INDICATOR_DEFAULT_THRESHOLD_MINUTES = 15;

export const isStatusActive = (status: RequestStatus | string): boolean => {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
};

export const isStatusCompleted = (status: RequestStatus | string): boolean => {
  return (COMPLETED_STATUSES as readonly string[]).includes(status);
};

export const isStatusCancelled = (status: RequestStatus | string): boolean => {
  return (CANCELLED_STATUSES as readonly string[]).includes(status);
};

export const resolveStatus = (apiStatus: string): RequestStatus => {
  return API_STATUS_MAP[apiStatus] || (apiStatus as RequestStatus) || 'pending_approval';
};

export const normalizeParkingLocation = (location: string | undefined): ParkingLocation => {
  if (!location) return '' as ParkingLocation;
  const normalized = PARKING_LOCATION_ALIASES[location];
  return normalized || (location as ParkingLocation);
};

export const DEFAULT_COMMUNICATION_CHANNELS: CommunicationChannel[] = ['email'];

export const DEFAULT_MEAL_TYPE: BuffetMealType = 'lunch';

export const DEFAULT_DURATION = '1 hour';

export const DURATION_OPTIONS = [
  { value: '30 minutes', minutes: 30 },
  { value: '1 hour', minutes: 60 },
  { value: '1.5 hours', minutes: 90 },
  { value: '2 hours', minutes: 120 },
  { value: '3 hours', minutes: 180 },
  { value: '4 hours', minutes: 240 },
] as const;

export const PLACEHOLDER_ID = 'auto';
export const PLACEHOLDER_SLOT_NUMBER = 'TBD';
export const PLACEHOLDER_ROOM_NAME = 'TBD';

export const DEFAULT_PARKING_LOCATION: ParkingLocation = 'skbc_basement';
export const DEFAULT_BUFFET_LOCATION = 'Main Buffet';

export const DEFAULT_MEETING_ROOM = {
  id: PLACEHOLDER_ID,
  name: PLACEHOLDER_ROOM_NAME,
  capacity: 10,
  floor: '1',
} as const;

export const DEFAULT_VALET = {
  id: PLACEHOLDER_ID,
  pickupTime: '',
  returnTime: '',
  status: 'pending' as const,
} as const;

export const DEFAULT_PARKING_SLOT = {
  id: PLACEHOLDER_ID,
  location: DEFAULT_PARKING_LOCATION,
  slotNumber: PLACEHOLDER_SLOT_NUMBER,
} as const;

export const DEFAULT_BUFFET = {
  id: PLACEHOLDER_ID,
  mealType: DEFAULT_MEAL_TYPE,
  location: DEFAULT_BUFFET_LOCATION,
} as const;

export const VISITOR_STATUS = {
  PENDING: 'pending' as const,
  EXPECTED: 'expected' as const,
  CHECKED_IN: 'checked_in' as const,
  COMPLETED: 'completed' as const,
} as const;

export const VALET_STATUS = {
  PENDING: 'pending' as const,
  ASSIGNED: 'assigned' as const,
  PICKING_UP: 'picking_up' as const,
  PARKED: 'parked' as const,
  RETURNING: 'returning' as const,
  COMPLETED: 'completed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

export const TASK_STATUS = {
  PENDING: 'pending' as const,
  ASSIGNED: 'assigned' as const,
  IN_PROGRESS: 'in_progress' as const,
  COMPLETED: 'completed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

export const LATER_STAGE_STATUSES: readonly string[] = [
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.VISITOR_ACCEPTED,
  REQUEST_STATUS.CHECKED_IN,
  REQUEST_STATUS.COMPLETED,
  'accepted',
  'checked_out',
  'awaiting_visitor',
  'pending_visitor',
  'visitor_pending',
] as const;

export const VISITOR_ACCEPTED_STATUSES: readonly string[] = [
  'accepted',
  REQUEST_STATUS.VISITOR_ACCEPTED,
  REQUEST_STATUS.CHECKED_IN,
  'checked_out',
  REQUEST_STATUS.COMPLETED,
] as const;

export const VISITOR_DECLINED_STATUSES: readonly string[] = [
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.VISITOR_REJECTED,
] as const;

export const AWAITING_VISITOR_STATUSES: readonly string[] = [
  REQUEST_STATUS.APPROVED,
  'pending_visitor',
  'awaiting_visitor',
  'visitor_pending',
] as const;

export const CHECKED_IN_STATUSES: readonly string[] = [
  REQUEST_STATUS.CHECKED_IN,
  'checked_out',
  REQUEST_STATUS.COMPLETED,
] as const;

export const COMPLETED_REQUEST_STATUSES: readonly string[] = [
  'checked_out',
  REQUEST_STATUS.COMPLETED,
] as const;
