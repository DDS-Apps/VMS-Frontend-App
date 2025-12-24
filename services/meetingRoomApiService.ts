import { get, post, patch, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  MeetingRoomDto,
  MeetingBookingDto,
  CreateMeetingRoomDto,
  UpdateMeetingRoomDto,
  CreateMeetingBookingDto,
  UpdateMeetingBookingDto,
  RoomAvailabilityParams,
  RoomAvailabilityResponse,
} from '@/types/api.types';

const { meetingRooms, visits } = apiConfig.endpoints;

export interface ListMeetingRoomsParams {
  page?: number;
  limit?: number;
  floor?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface ListMeetingBookingsParams {
  page?: number;
  limit?: number;
  meetingRoomId?: string;
  startDate?: string;
  endDate?: string;
}

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const meetingRoomApiService = {
  create: (data: CreateMeetingRoomDto): Promise<MeetingRoomDto> => {
    return post<MeetingRoomDto, CreateMeetingRoomDto>(meetingRooms.base, data);
  },

  list: (params?: ListMeetingRoomsParams): Promise<PaginatedResponse<MeetingRoomDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<MeetingRoomDto>>(`${meetingRooms.base}${queryString}`);
  },

  getById: (id: string): Promise<MeetingRoomDto> => {
    return get<MeetingRoomDto>(meetingRooms.byId(id));
  },

  update: (id: string, data: UpdateMeetingRoomDto): Promise<MeetingRoomDto> => {
    return patch<MeetingRoomDto, UpdateMeetingRoomDto>(meetingRooms.byId(id), data);
  },

  getAvailable: (startTime: string, endTime: string, capacity?: number): Promise<MeetingRoomDto[]> => {
    const query = new URLSearchParams({ startTime, endTime });
    if (capacity) query.set('capacity', String(capacity));
    return get<MeetingRoomDto[]>(`${meetingRooms.available}?${query.toString()}`);
  },

  createBooking: (data: CreateMeetingBookingDto): Promise<MeetingBookingDto> => {
    return post<MeetingBookingDto, CreateMeetingBookingDto>(meetingRooms.bookings, data);
  },

  listBookings: (params?: ListMeetingBookingsParams): Promise<PaginatedResponse<MeetingBookingDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<MeetingBookingDto>>(`${meetingRooms.bookingsAll}${queryString}`);
  },

  getBooking: (id: string): Promise<MeetingBookingDto> => {
    return get<MeetingBookingDto>(meetingRooms.bookingById(id));
  },

  updateBooking: (id: string, data: UpdateMeetingBookingDto): Promise<MeetingBookingDto> => {
    return patch<MeetingBookingDto, UpdateMeetingBookingDto>(meetingRooms.bookingById(id), data);
  },

  cancelBooking: (id: string): Promise<void> => {
    return del<void>(meetingRooms.bookingById(id));
  },

  getTodaysBookings: (): Promise<MeetingBookingDto[]> => {
    return get<MeetingBookingDto[]>(meetingRooms.bookingsToday);
  },

  checkRoomAvailability: (params: RoomAvailabilityParams): Promise<RoomAvailabilityResponse> => {
    const query = new URLSearchParams({
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
    });
    if (params.minCapacity) {
      query.set('minCapacity', String(params.minCapacity));
    }
    const url = `${visits.roomsAvailability}?${query.toString()}`;
    console.log('[RoomAvailability API]', { params, url, currentTime: new Date().toLocaleTimeString() });
    return get<RoomAvailabilityResponse>(url);
  },
};

export default meetingRoomApiService;
