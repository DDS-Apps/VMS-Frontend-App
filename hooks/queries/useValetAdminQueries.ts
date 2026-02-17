import { useQuery } from '@tanstack/react-query';
import { valetAdminApiService } from '@/services/api/valetAdminApiService';
import { ValetParkingDashboardResponse, ValetParkingVisitorDto } from '@/types/api.types';

export const valetAdminKeys = {
  all: ['valetAdmin'] as const,
  parkingDashboard: (startDate?: string, endDate?: string) => [...valetAdminKeys.all, 'parkingDashboard', startDate, endDate] as const,
};

const normalizeBoolean = (value: unknown): boolean => {
  return value === true || value === 'true';
};

const normalizeVisitorDto = (visitor: ValetParkingVisitorDto): ValetParkingVisitorDto => ({
  ...visitor,
  isVisitorNeedsParking: normalizeBoolean(visitor.isVisitorNeedsParking),
  visitorNeedsParking: normalizeBoolean(visitor.visitorNeedsParking),
});

export function useValetParkingDashboard(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: valetAdminKeys.parkingDashboard(startDate, endDate),
    queryFn: () => valetAdminApiService.getParkingDashboard(startDate, endDate),
    staleTime: 1000 * 60 * 2,
    select: (data: ValetParkingDashboardResponse): ValetParkingDashboardResponse => ({
      ...data,
      data: data.data.map(normalizeVisitorDto),
    }),
  });
}
