import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { receptionApiService } from '@/services/receptionApiService';
import type {
  TodayVisitorsResponse,
  TodaySummary,
  ReceptionAlert,
  RoomStatusDto,
  WalkInRegistrationDto,
  WalkInResponseDto,
  CommunicationOverrideDto,
  ListReceptionTodayParams,
  SearchVisitorParams,
  SearchVisitorsResponse,
  CheckInDto,
  CheckInResponseDto,
  CheckOutDto,
  CheckOutResponseDto,
} from '@/types';
import { ApiError } from '@/api/errors';

export const receptionKeys = {
  all: ['reception'] as const,
  today: () => [...receptionKeys.all, 'today'] as const,
  todayList: (params?: ListReceptionTodayParams) => [...receptionKeys.today(), 'list', params] as const,
  todaySummary: () => [...receptionKeys.today(), 'summary'] as const,
  search: (params: SearchVisitorParams) => [...receptionKeys.all, 'search', params] as const,
  alerts: () => [...receptionKeys.all, 'alerts'] as const,
  rooms: () => [...receptionKeys.all, 'rooms'] as const,
  roomsToday: () => [...receptionKeys.rooms(), 'today'] as const,
};

export function useTodayVisitorsQuery(
  params?: ListReceptionTodayParams,
  options?: Omit<UseQueryOptions<TodayVisitorsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TodayVisitorsResponse, ApiError>({
    queryKey: receptionKeys.todayList(params),
    queryFn: () => receptionApiService.getTodayVisitors(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

export function useTodaySummaryQuery(
  options?: Omit<UseQueryOptions<TodaySummary, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TodaySummary, ApiError>({
    queryKey: receptionKeys.todaySummary(),
    queryFn: () => receptionApiService.getTodaySummary(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

export function useSearchVisitorsQuery(
  params: SearchVisitorParams,
  options?: Omit<UseQueryOptions<SearchVisitorsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SearchVisitorsResponse, ApiError>({
    queryKey: receptionKeys.search(params),
    queryFn: () => receptionApiService.searchVisitors(params),
    enabled: params.q.length > 0,
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useReceptionAlertsQuery(
  options?: Omit<UseQueryOptions<ReceptionAlert[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ReceptionAlert[], ApiError>({
    queryKey: receptionKeys.alerts(),
    queryFn: () => receptionApiService.getAlerts(),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    ...options,
  });
}

export function useRoomsTodayQuery(
  options?: Omit<UseQueryOptions<RoomStatusDto[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<RoomStatusDto[], ApiError>({
    queryKey: receptionKeys.roomsToday(),
    queryFn: () => receptionApiService.getRoomsToday(),
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useMarkReceptionAlertAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (alertId) => receptionApiService.markAlertAsRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receptionKeys.alerts() });
    },
  });
}

export function useRegisterWalkInMutation() {
  const queryClient = useQueryClient();

  return useMutation<WalkInResponseDto, ApiError, WalkInRegistrationDto>({
    mutationFn: (data) => receptionApiService.registerWalkIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'reception' && query.queryKey[1] === 'today',
      });
    },
  });
}

export function useSendCommunicationOverrideMutation() {
  return useMutation<{ sent: boolean; message: string }, ApiError, CommunicationOverrideDto>({
    mutationFn: (data) => receptionApiService.sendCommunicationOverride(data),
  });
}

export function useReceptionCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation<CheckInResponseDto, ApiError, { visitId: string; data?: CheckInDto }>({
    mutationFn: ({ visitId, data }) => receptionApiService.checkInVisitor(visitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'reception' &&
          (query.queryKey[1] === 'today' || query.queryKey[1] === 'alerts'),
      });
    },
  });
}

export function useReceptionCheckOutMutation() {
  const queryClient = useQueryClient();

  return useMutation<CheckOutResponseDto, ApiError, { visitId: string; data?: CheckOutDto }>({
    mutationFn: ({ visitId, data }) => receptionApiService.checkOutVisitor(visitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'reception' && query.queryKey[1] === 'today',
      });
    },
  });
}
