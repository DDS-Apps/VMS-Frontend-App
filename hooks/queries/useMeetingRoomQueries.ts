import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  meetingRoomApiService, 
  type ListMeetingRoomsParams, 
  type ListMeetingBookingsParams 
} from '@/services/meetingRoomApiService';
import type {
  MeetingRoomDto,
  MeetingBookingDto,
  CreateMeetingRoomDto,
  UpdateMeetingRoomDto,
  CreateMeetingBookingDto,
  UpdateMeetingBookingDto,
  PaginatedResponse,
  RoomAvailabilityParams,
  RoomAvailabilityResponse,
} from '@/types/api.types';

export const meetingRoomKeys = {
  all: ['meeting-rooms'] as const,
  rooms: () => [...meetingRoomKeys.all, 'rooms'] as const,
  roomsList: (params?: ListMeetingRoomsParams) => [...meetingRoomKeys.rooms(), 'list', params] as const,
  roomDetail: (id: string) => [...meetingRoomKeys.rooms(), 'detail', id] as const,
  availableRooms: (startTime: string, endTime: string, capacity?: number) => 
    [...meetingRoomKeys.rooms(), 'available', startTime, endTime, capacity] as const,
  roomAvailability: (params: RoomAvailabilityParams) => 
    [...meetingRoomKeys.rooms(), 'availability', params.date, params.startTime, params.endTime, params.minCapacity] as const,
  bookings: () => [...meetingRoomKeys.all, 'bookings'] as const,
  bookingsList: (params?: ListMeetingBookingsParams) => [...meetingRoomKeys.bookings(), 'list', params] as const,
  bookingDetail: (id: string) => [...meetingRoomKeys.bookings(), 'detail', id] as const,
  todaysBookings: () => [...meetingRoomKeys.bookings(), 'today'] as const,
};

export function useMeetingRoomsQuery(params?: ListMeetingRoomsParams) {
  return useQuery<PaginatedResponse<MeetingRoomDto>>({
    queryKey: meetingRoomKeys.roomsList(params),
    queryFn: () => meetingRoomApiService.list(params),
  });
}

export function useMeetingRoomQuery(id: string, enabled = true) {
  return useQuery<MeetingRoomDto>({
    queryKey: meetingRoomKeys.roomDetail(id),
    queryFn: () => meetingRoomApiService.getById(id),
    enabled: enabled && !!id,
  });
}

export function useAvailableMeetingRoomsQuery(
  startTime: string,
  endTime: string,
  capacity?: number,
  enabled = true
) {
  return useQuery<MeetingRoomDto[]>({
    queryKey: meetingRoomKeys.availableRooms(startTime, endTime, capacity),
    queryFn: () => meetingRoomApiService.getAvailable(startTime, endTime, capacity),
    enabled: enabled && !!startTime && !!endTime,
  });
}

export function useRoomAvailabilityQuery(
  params: RoomAvailabilityParams | null,
  enabled = true
) {
  return useQuery<RoomAvailabilityResponse>({
    queryKey: params ? meetingRoomKeys.roomAvailability(params) : ['meeting-rooms', 'availability', 'empty'],
    queryFn: () => meetingRoomApiService.checkRoomAvailability(params!),
    enabled: enabled && !!params?.date && !!params?.startTime && !!params?.endTime,
    staleTime: 30 * 1000,
  });
}

export function useMeetingBookingsQuery(params?: ListMeetingBookingsParams) {
  return useQuery<PaginatedResponse<MeetingBookingDto>>({
    queryKey: meetingRoomKeys.bookingsList(params),
    queryFn: () => meetingRoomApiService.listBookings(params),
  });
}

export function useMeetingBookingQuery(id: string, enabled = true) {
  return useQuery<MeetingBookingDto>({
    queryKey: meetingRoomKeys.bookingDetail(id),
    queryFn: () => meetingRoomApiService.getBooking(id),
    enabled: enabled && !!id,
  });
}

export function useTodaysMeetingBookingsQuery() {
  return useQuery<MeetingBookingDto[]>({
    queryKey: meetingRoomKeys.todaysBookings(),
    queryFn: () => meetingRoomApiService.getTodaysBookings(),
    staleTime: 60 * 1000,
  });
}

export function useCreateMeetingRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation<MeetingRoomDto, Error, CreateMeetingRoomDto>({
    mutationFn: (data) => meetingRoomApiService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.rooms() });
    },
  });
}

export function useUpdateMeetingRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation<MeetingRoomDto, Error, { id: string; data: UpdateMeetingRoomDto }>({
    mutationFn: ({ id, data }) => meetingRoomApiService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(meetingRoomKeys.roomDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.rooms() });
    },
  });
}

export function useCreateMeetingBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<MeetingBookingDto, Error, CreateMeetingBookingDto>({
    mutationFn: (data) => meetingRoomApiService.createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.bookings() });
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.rooms() });
    },
  });
}

export function useUpdateMeetingBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<MeetingBookingDto, Error, { id: string; data: UpdateMeetingBookingDto }>({
    mutationFn: ({ id, data }) => meetingRoomApiService.updateBooking(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(meetingRoomKeys.bookingDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.bookings() });
    },
  });
}

export function useCancelMeetingBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => meetingRoomApiService.cancelBooking(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: meetingRoomKeys.bookingDetail(id) });
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.bookings() });
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.rooms() });
    },
  });
}
