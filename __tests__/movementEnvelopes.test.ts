import fixtures from './fixtures/latest-movement-offline.json';
import { httpClient, get } from '@/api/httpClient';
import { requestApiService } from '@/services/api/requestApiService';
import { receptionApiService } from '@/services/api/receptionApiService';
import { valetAdminApiService } from '@/services/api/valetAdminApiService';
import { securityApiService } from '@/services/api/securityApiService';

// Actual transport unwrapping, zero network access: every request uses this adapter.
const adapter = jest.fn();
beforeEach(() => { httpClient.defaults.adapter = adapter; adapter.mockReset(); });
function reply(body: unknown) {
  adapter.mockImplementation(async config => ({ status: 200, statusText: 'OK', headers: {}, config, data: body }));
}
it.each(fixtures.states)('$name survives actual service/transport envelopes', async scenario => {
  const e = scenario.envelopes;
  reply(e.paginated);
  expect(await requestApiService.listVisits()).toEqual(e.paginated);
  reply(e.receptionToday);
  expect(await receptionApiService.getTodayVisitors()).toEqual(e.receptionToday);
  reply(e.valet);
  expect(await valetAdminApiService.getParkingDashboard()).toEqual(e.valet.data);
  reply(e.approvalHistory);
  expect(await requestApiService.getApprovalHistory()).toEqual(e.approvalHistory);
  reply(e.detail);
  expect(await requestApiService.getVisitById('offline-example')).toEqual(e.detail);
  expect(await get('/api/v1/security/lookup')).toEqual(e.detail);
  expect(adapter).toHaveBeenCalledTimes(6);
  expect(adapter.mock.calls.some(([config]) => config.url.includes('/scan'))).toBe(false);
});
it('keeps all four movement POST outcomes successful when summary read is unavailable', async () => {
  const body = fixtures.availability.unavailableAfterSuccessfulMutation;
  reply(body);
  expect(await receptionApiService.checkInVisitor('offline-example')).toEqual(body);
  expect(await receptionApiService.checkOutVisitor('offline-example')).toEqual(body);
  expect(await securityApiService.gateCheckIn({ visitId: 'offline-example', gateId: 'main' })).toEqual(body);
  expect(await securityApiService.gateCheckOut({ visitId: 'offline-example', gateId: 'main' })).toEqual(body);
  expect(adapter).toHaveBeenCalledTimes(4);
  expect(adapter.mock.calls.every(([config]) => config.method === 'post')).toBe(true);
});
it('preserves paginated approval and search rows including restricted summaries', async () => {
  const body = { data: [fixtures.availability.restricted], pagination: { page: 2, total: 22 } };
  reply(body);
  expect(await requestApiService.getPendingApprovals()).toEqual(body);
  expect(await requestApiService.getAwaitingVisitor()).toEqual(body);
  expect(await requestApiService.getPendingHostWalkIns()).toEqual(body);
  expect(await receptionApiService.searchVisitors({ q: 'offline' })).toEqual(body);
  expect(adapter).toHaveBeenCalledTimes(4);
});
