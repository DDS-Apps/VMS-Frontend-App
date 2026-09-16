import { apiConfig } from '@/api/config';
import { get } from '@/api/httpClient';
import type { DashboardKpiData } from '@/types/api.types';

export const dashboardApiService = {
  getKpis(): Promise<DashboardKpiData> {
    return get<DashboardKpiData>(apiConfig.endpoints.dashboard.kpis);
  },
};