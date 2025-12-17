import type { RequestStatus, CommunicationChannel, ParkingLocation } from '@/types/vms.types';
import type { BuffetMealType } from '@/types/api.types';
import { ParkingLocation as ApiParkingLocation } from '@/types/api.types';

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
