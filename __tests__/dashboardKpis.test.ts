import fs from 'fs';
import path from 'path';
import { apiConfig } from '@/api/config';
import { dashboardKpiKeys } from '@/hooks/queries/useDashboardKpiQuery';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

const serviceSource = read('services/api/dashboardApiService.ts');
const hookSource = read('hooks/queries/useDashboardKpiQuery.ts');
const componentSource = read('components/shared/DashboardKpiSection.tsx');
const authSource = read('contexts/AuthContext.tsx');
const overviewSource = read('screens/Dashboard/OverviewScreen.tsx');
const receptionSource = read('screens/Receptionist/ReceptionistDashboardScreen.tsx');
const buffetAdminSource = read('screens/BuffetAdmin/BuffetAllRequestsScreen.tsx');
const securitySource = read('screens/Security/SecurityCheckInScreen.tsx');
const valetAdminSource = read('screens/ValetAdmin/ValetAllRequestsScreen.tsx');
const buildingAdminSource = read('screens/BuildingAdmin/AllRequestsScreen.tsx');
const buffetStaffSource = read('screens/Buffet/BuffetBoardScreen.tsx');
const valetDriverSource = read('screens/Driver/DriverTasksScreen.tsx');

describe('backend dashboard KPIs', () => {
  it('registers the endpoint and sends no frontend role, identity, date, or timezone params', () => {
    expect(apiConfig.endpoints.dashboard.kpis).toBe('/api/v1/dashboard/kpis');
    expect(serviceSource).toContain('get<DashboardKpiData>(apiConfig.endpoints.dashboard.kpis)');
    expect(serviceSource).not.toMatch(/getKpis\([^)]*\w+[^)]*\)/);
    expect(serviceSource).not.toContain('params:');
  });

  it('isolates cached values by authenticated identity and effective role', () => {
    expect(dashboardKpiKeys.byIdentity('user-a:employee')).not.toEqual(
      dashboardKpiKeys.byIdentity('user-a:manager'),
    );
    expect(dashboardKpiKeys.byIdentity('user-a:employee')).not.toEqual(
      dashboardKpiKeys.byIdentity('user-b:employee'),
    );
    expect(componentSource).toContain('`${user.id}:${user.role}`');
    expect(authSource).toContain('dashboardKpiKeys.byIdentity(previousIdentity)');
    expect(authSource).toContain('queryClient.removeQueries({ queryKey: dashboardKpiKeys.all })');
  });

  it('renders backend order with localized known labels and safe unknown-key fallbacks', () => {
    expect(componentSource).toContain('kpis.map((kpi: DashboardKpi)');
    expect(componentSource).toContain('translationKey ? t(translationKey) : kpi.label');
    expect(componentSource).toContain("icon: 'bar-chart-2' as IconName");
    expect(componentSource).toContain("color: 'primary' as const");
    expect(componentSource).toContain("kpi.value.toLocaleString(localeTag)");
    expect(componentSource).not.toContain('subtitle=');
    expect(componentSource).not.toContain("'dashboard.kpiToday'");
    expect(componentSource).not.toContain("'dashboard.kpiThisMonth'");
  });

  it('keeps loading, forbidden, network error, retry, and empty states section-local', () => {
    expect(componentSource).toContain('if (query.isFetching)');
    expect(componentSource).toContain('query.data?.kpis.length ?? 4');
    expect(componentSource).toContain('<SkeletonCard');
    expect(componentSource).toContain("query.error.code === 'FORBIDDEN'");
    expect(componentSource.indexOf('if (forbidden)')).toBeLessThan(
      componentSource.indexOf('if (query.isFetching)'),
    );
    expect(hookSource).toContain("error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN'");
    expect(componentSource).toContain("'dashboard.kpiAccessError'");
    expect(componentSource).toContain("'dashboard.kpiLoadError'");
    expect(componentSource).toContain("t('common.retry')");
    expect(componentSource).toContain('if (kpis.length === 0) return null');
    expect(componentSource).not.toContain('ActivityIndicator');
  });

  it('uses API KPIs on supported role homes and no KPI section on empty/unsupported homes', () => {
    expect(overviewSource).toContain('<DashboardKpiSection');
    expect(receptionSource).toContain('<DashboardKpiSection />');
    expect(buffetAdminSource).toContain('<DashboardKpiSection />');
    expect(securitySource).toContain('<DashboardKpiSection />');
    expect(valetAdminSource).toContain('<DashboardKpiSection />');
    expect(valetAdminSource).toContain("user?.role === 'valet_admin'");
    expect(valetAdminSource).toContain('<StatsCards');

    expect(buildingAdminSource).not.toContain('DashboardKpiSection');
    expect(buildingAdminSource).toContain('<StatCard');
    expect(buffetStaffSource).not.toContain('DashboardKpiSection');
    expect(valetDriverSource).not.toContain('DashboardKpiSection');
  });

  it('invalidates or refetches KPIs after mutations, focus, and pull-to-refresh', () => {
    expect(hookSource).toContain('invalidateDashboardKpis');
    for (const mutationFile of [
      'hooks/queries/useApprovalQueries.ts',
      'hooks/queries/useReceptionQueries.ts',
      'hooks/queries/useSecurityQueries.ts',
      'hooks/queries/useBuffetQueries.ts',
    ]) {
      expect(read(mutationFile)).toContain('invalidateDashboardKpis(queryClient)');
    }
    expect(componentSource).toContain('useFocusEffect(');
    expect(buffetAdminSource).toContain('Promise.all([refetchTasks(), refreshDashboardKpis()])');
    expect(valetAdminSource).toContain('Promise.all([refetch(), refreshDashboardKpis()])');
  });
});