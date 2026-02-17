import { get } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { ValetParkingDashboardResponse } from '@/types/api.types';

const { valetAdmin } = apiConfig.endpoints;

export const valetAdminApiService = {
  getParkingDashboard: (startDate?: string, endDate?: string): Promise<ValetParkingDashboardResponse> => {
    const queryParts: string[] = [];
    if (startDate) queryParts.push(`startDate=${startDate}`);
    if (endDate) queryParts.push(`endDate=${endDate}`);
    const params = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return get<ValetParkingDashboardResponse>(`${valetAdmin.parkingDashboard}${params}`);
  },
};

export default valetAdminApiService;
