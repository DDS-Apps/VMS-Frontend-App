import type { VisitDetailsDto } from '@/types/api.types';
import { mapVisitDetailsToVisitorRequest } from '@/utils/requestMappers';

const makeVisit = (overrides: Partial<VisitDetailsDto> = {}): VisitDetailsDto => ({
  id: 'visit-1',
  employeeId: 'employee-1',
  employeeName: 'Host',
  visitor: {
    id: 'visitor-1',
    fullName: 'Walk-in Visitor',
    email: '',
    phone: '',
  },
  visitDate: '2099-09-04',
  visitTime: '10:00',
  duration: '1 hour',
  purpose: 'meeting',
  status: 'pending_host_approval',
  createdAt: '2099-09-04T07:00:00Z',
  updatedAt: '2099-09-04T07:00:00Z',
  ...overrides,
} as VisitDetailsDto);

describe('request details approval mapping', () => {
  it('preserves server-computed manager approval eligibility', () => {
    const request = mapVisitDetailsToVisitorRequest(makeVisit({ canApprove: true }));

    expect(request.canApprove).toBe(true);
  });

  it('preserves walk-in host approval state', () => {
    const request = mapVisitDetailsToVisitorRequest(makeVisit({
      isWalkIn: true,
      status: 'pending_host_approval',
    }));

    expect(request.isWalkIn).toBe(true);
    expect(request.status).toBe('pending_host_approval');
  });

  it('defaults missing approval eligibility to false', () => {
    const request = mapVisitDetailsToVisitorRequest(makeVisit());

    expect(request.canApprove).toBe(false);
  });
});