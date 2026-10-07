import { readMovementSummary, formatActualMovement } from '@/utils/movementSummary';
import { mapVisitListItemToVisitorRequest, mapVisitDetailsToVisitorRequest, mapPendingApprovalToVisitorRequest, mapAwaitingVisitorToVisitorRequest, mapPendingHostWalkInToVisitorRequest } from '@/utils/requestMappers';
import { mapOverviewRequestToMatrixItem } from '@/utils/overviewVisitorTable';
import { mapManagerRequestToMatrixItem } from '@/utils/managerDashboardTable';
import { mapValetVisitorToMatrixItem } from '@/utils/valetAdminVisitorsTable';
import { mapSecurityVisitorToMatrixItem } from '@/utils/securityVisitorTable';

const at = (hour: number) => `2026-10-07T${String(hour - 3).padStart(2, '0')}:00:00.000Z`;
describe('independent movement summary contract', () => {
  it.each([[null, null], [9, null], [9, 10], [11, 10], [11, 12], [13, 12], [13, null]])(
    'preserves independent physical times %s / %s', (entry, exit) => {
      const summary = { version: 1 as const, latestCheckInAt: entry === null ? null : at(entry), latestCheckOutAt: exit === null ? null : at(exit) };
      expect(readMovementSummary(summary)).toEqual({ state: 'supported', summary });
    });
  it('distinguishes old payloads from invalid/new-version payloads', () => {
    expect(readMovementSummary(undefined).state).toBe('legacy');
    for (const value of [null, {}, '', { version: 2 }, { version: 1, latestCheckInAt: '', latestCheckOutAt: null }, { version: 1, latestCheckInAt: '2026-10-07T09:00:00', latestCheckOutAt: null }]) {
      expect(readMovementSummary(value).state).toBe('unavailable');
    }
  });
  it.each(['Asia/Karachi', 'UTC', 'America/Los_Angeles'])('uses visit timezone instead of device %s', deviceZone => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = deviceZone;
      expect(formatActualMovement(at(11), 'Asia/Riyadh', false)).toMatch(/11:00\s*AM/);
      expect(formatActualMovement(at(11), undefined, false)).toMatch(/11:00\s*AM/);
      expect(formatActualMovement(at(11), 'invalid-zone', false)).toBe('—');
      expect(formatActualMovement(null, 'Asia/Riyadh', true)).toBe('—');
      expect(formatActualMovement(at(11), 'Asia/Riyadh', true)).toContain('١١');
    } finally {
      if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
    }
  });
});

describe('summary mapping does not overwrite current-cycle timestamps', () => {
  const summary = { version: 1 as const, latestCheckInAt: at(11), latestCheckOutAt: at(10) };
  const visit: any = {
    id: 'v1', visitor: { fullName: 'Test', email: '', phone: '' }, employeeName: 'Host',
    visitDate: '2026-10-07', visitTime: '11:00', status: 'checked_in',
    checkedInAt: at(11), checkedOutAt: undefined, movementSummary: summary,
    timezone: 'Asia/Riyadh', createdAt: at(8), approval: { requiresApproval: false },
  };
  it('preserves the summary through list, overview and approval mappings', () => {
    const request = mapVisitListItemToVisitorRequest(visit);
    expect(request.checkedOutAt).toBeUndefined();
    expect(request.movementSummary).toBe(summary);
    expect(mapOverviewRequestToMatrixItem(request, false).movementSummary).toBe(summary);
    expect(mapManagerRequestToMatrixItem(request, '', false).movementSummary).toBe(summary);
    for (const map of [mapVisitDetailsToVisitorRequest, mapPendingApprovalToVisitorRequest, mapAwaitingVisitorToVisitorRequest, mapPendingHostWalkInToVisitorRequest]) {
      expect(map(visit).movementSummary).toBe(summary);
    }
  });
  it('preserves historical values in Security and Valet without changing status', () => {
    const security = mapSecurityVisitorToMatrixItem({
      ...visit, name: 'Test', originalStatus: 'checked_in', host: 'Host', parking: {}, valet: { hasValet: false },
    });
    expect(security.movementSummary).toBe(summary);
    expect(security.status).toBe('checked_in');
    const valet = mapValetVisitorToMatrixItem({ ...visit, requestId: 'v1', visitorName: 'Test', hostName: 'Host', visitorNeedsParking: true });
    expect(valet.movementSummary).toBe(summary);
    expect(valet.status).toBe('checked_in');
  });
});
