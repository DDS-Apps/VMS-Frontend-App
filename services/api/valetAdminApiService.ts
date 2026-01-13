import { get } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { ValetParkingDashboardResponse } from '@/types/api.types';

const { valetAdmin } = apiConfig.endpoints;

export const valetAdminApiService = {
  getParkingDashboard: (date?: string): Promise<ValetParkingDashboardResponse> => {
    const params = date ? `?date=${date}` : '';
    return get<ValetParkingDashboardResponse>(`${valetAdmin.parkingDashboard}${params}`);
  },
};

export default valetAdminApiService;
