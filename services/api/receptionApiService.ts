import { get, post } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
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

const { reception, visits } = apiConfig.endpoints;

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

export const receptionApiService = {
  getTodayVisitors: (params?: ListReceptionTodayParams): Promise<TodayVisitorsResponse> => {
    const queryString = params ? buildQueryString(params as Record<string, unknown>) : '';
    return get<TodayVisitorsResponse>(`${reception.today}${queryString}`);
  },

  getTodaySummary: (): Promise<TodaySummary> => {
    return get<TodaySummary>(reception.todaySummary);
  },

  searchVisitors: (params: SearchVisitorParams): Promise<SearchVisitorsResponse> => {
    const queryString = buildQueryString(params as unknown as Record<string, unknown>);
    return get<SearchVisitorsResponse>(`${reception.search}${queryString}`);
  },

  getAlerts: (): Promise<ReceptionAlert[]> => {
    return get<ReceptionAlert[]>(reception.alerts);
  },

  markAlertAsRead: (alertId: string): Promise<void> => {
    return post<void>(`${reception.alerts}/${alertId}/read`);
  },

  getRoomsToday: (): Promise<RoomStatusDto[]> => {
    return get<RoomStatusDto[]>(reception.roomsToday);
  },

  registerWalkIn: (data: WalkInRegistrationDto): Promise<WalkInResponseDto> => {
    return post<WalkInResponseDto, WalkInRegistrationDto>(reception.walkIn, data);
  },

  sendCommunicationOverride: (data: CommunicationOverrideDto): Promise<{ sent: boolean; message: string }> => {
    return post<{ sent: boolean; message: string }, CommunicationOverrideDto>(
      reception.communicationOverride,
      data
    );
  },

  checkInVisitor: (visitId: string, data?: CheckInDto): Promise<CheckInResponseDto> => {
    return post<CheckInResponseDto, CheckInDto | undefined>(visits.checkIn(visitId), data);
  },

  checkOutVisitor: (visitId: string, data?: CheckOutDto): Promise<CheckOutResponseDto> => {
    return post<CheckOutResponseDto, CheckOutDto | undefined>(visits.checkOut(visitId), data);
  },
};

export default receptionApiService;
