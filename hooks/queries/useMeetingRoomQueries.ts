import { useQuery } from '@tanstack/react-query';
import type { RoomAvailabilityParams } from '@/types/api.types';

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  isAvailable: boolean;
}

export const useRoomAvailabilityQuery = (params: RoomAvailabilityParams | null) => {
  return useQuery({
    queryKey: ['roomAvailability', params],
    queryFn: async (): Promise<MeetingRoom[]> => {
      return [];
    },
    enabled: !!params?.date,
  });
};

export const useMeetingRoomsQuery = () => {
  return useQuery({
    queryKey: ['meetingRooms'],
    queryFn: async (): Promise<MeetingRoom[]> => {
      return [];
    },
  });
};
