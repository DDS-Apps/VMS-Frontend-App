import type { VisitListItemDto } from '@/types/api.types';
import type { VisitorRequest } from '@/types/vms.types';
import { mapVisitListItemToVisitorRequest } from '@/utils/requestMappers';
import { mapManagerRequestToMatrixItem } from '@/utils/managerDashboardTable';
import { mapOverviewRequestToMatrixItem } from '@/utils/overviewVisitorTable';

const checkIn = '2026-10-26T10:08:00.000Z';
const checkOut = '2026-10-26T12:00:00.000Z';
const visit = (overrides: Partial<VisitListItemDto> = {}): VisitListItemDto => ({
  id: 'movement-visit',
  employeeName: 'Host',
  visitor: { fullName: 'Visitor' },
  visitDate: '2026-10-26',
  visitTime: '13:00',
  status: 'approved',
  purpose: 'Interview',
  isWalkIn: false,
  createdAt: '2026-10-25T09:00:00Z',
  ...overrides,
});

describe.each([
  { name: 'Manager dashboard', map: (request: VisitorRequest) => mapManagerRequestToMatrixItem(request, 'Interview', false) },
  { name: 'Overview', map: (request: VisitorRequest) => mapOverviewRequestToMatrixItem(request, false) },
])('$name movement mappings', ({ map }) => {
  it.each([
    { checkedInAt: checkIn, checkedOutAt: checkOut },
    { checkedInAt: checkIn, checkedOutAt: undefined },
    { checkedInAt: undefined, checkedOutAt: checkOut },
    { checkedInAt: undefined, checkedOutAt: undefined },
  ])('preserves the available backend timestamps independently: %p', fields => {
    const request = mapVisitListItemToVisitorRequest(visit(fields));
    const mapped = map(request);
    expect(mapped.actualInTime).toBe(fields.checkedInAt);
    expect(mapped.actualOutTime).toBe(fields.checkedOutAt);
    expect(request.checkedInAt).toBe(fields.checkedInAt);
    expect(request.checkedOutAt).toBe(fields.checkedOutAt);
  });

  it('does not invent a checkout from visit completion or planned end', () => {
    const request = mapVisitListItemToVisitorRequest(visit({
      status: 'completed', checkedInAt: checkIn, endTime: '16:00',
    }));
    request.completedAt = checkOut;
    expect(map(request)).toMatchObject({ actualInTime: checkIn, actualOutTime: undefined });
  });

  it('preserves the separate summary contract without substituting its latest entry', () => {
    const request = mapVisitListItemToVisitorRequest(visit({ checkedInAt: checkIn, checkedOutAt: checkOut }));
    request.movementSummary = {
      version: 1, latestCheckInAt: '2026-10-26T11:00:00.000Z', latestCheckOutAt: checkOut,
    };
    const mapped = map(request);
    expect(mapped.actualInTime).toBe(checkIn);
    expect(mapped.actualOutTime).toBe(checkOut);
    expect(mapped.movementSummary).toBe(request.movementSummary);
  });
});
