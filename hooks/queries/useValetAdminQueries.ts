import { useQuery } from '@tanstack/react-query';
import { valetAdminApiService } from '@/services/api/valetAdminApiService';

export const valetAdminKeys = {
  all: ['valetAdmin'] as const,
  parkingDashboard: (date?: string) => [...valetAdminKeys.all, 'parkingDashboard', date] as const,
};

export function useValetParkingDashboard(date?: string) {
  return useQuery({
    queryKey: valetAdminKeys.parkingDashboard(date),
    queryFn: () => valetAdminApiService.getParkingDashboard(date),
    staleTime: 1000 * 60 * 2,
  });
}
