import { useQuery } from '@tanstack/react-query';
import { valetAdminApiService } from '@/services/api/valetAdminApiService';
import { ValetParkingDashboardResponse, ValetParkingVisitorDto } from '@/types/api.types';

export const valetAdminKeys = {
  all: ['valetAdmin'] as const,
  parkingDashboard: (date?: string) => [...valetAdminKeys.all, 'parkingDashboard', date] as const,
};

const normalizeBoolean = (value: unknown): boolean => {
  return value === true || value === 'true';
};

const normalizeVisitorDto = (visitor: ValetParkingVisitorDto): ValetParkingVisitorDto => ({
  ...visitor,
  isVisitorNeedsParking: normalizeBoolean(visitor.isVisitorNeedsParking),
  visitorNeedsParking: normalizeBoolean(visitor.visitorNeedsParking),
});

export function useValetParkingDashboard(date?: string) {
  return useQuery({
    queryKey: valetAdminKeys.parkingDashboard(date),
    queryFn: () => valetAdminApiService.getParkingDashboard(date),
    staleTime: 1000 * 60 * 2,
    select: (data: ValetParkingDashboardResponse): ValetParkingDashboardResponse => ({
      ...data,
      data: data.data.map(normalizeVisitorDto),
    }),
  });
}
