import type { PendingApprovalDto } from '@/types/api.types';
import { mapPendingApprovalToVisitorRequest } from '@/utils/requestMappers';
import { mapManagerRequestToMatrixItem } from '@/utils/managerDashboardTable';
import { mapSecurityVisitorToMatrixItem } from '@/utils/securityVisitorTable';

const pendingRequest = (overrides: Partial<PendingApprovalDto> = {}) =>
  mapPendingApprovalToVisitorRequest({
    id: 'visit-1',
    employeeName: 'Host',
    visitor: { id: 'visitor-1', fullName: 'Visitor' },
    visitDate: '2026-09-29',
    visitTime: '09:00',
    createdAt: '2026-09-28T09:00:00Z',
    status: 'pending_approval',
    isWalkIn: false,
    ...overrides,
  } as PendingApprovalDto);

describe('Manager dashboard Additional Services', () => {
  it('shows flag-only Meeting Room and Buffet selections, matching Security', () => {
    const request = pendingRequest({ isMeetingRoom: true, isBuffet: true });
    expect(request.meetingRoom).toBeUndefined();
    expect(request.buffet).toBeUndefined();

    const managerRow = mapManagerRequestToMatrixItem(request, 'Meeting', false);
    const securityRow = mapSecurityVisitorToMatrixItem({
      id: request.id,
      name: request.visitor.fullName,
      company: '',
      visitDate: request.visitDate,
      visitTime: request.visitTime,
      originalStatus: 'approved',
      host: 'Host',
      parking: {},
      valet: { hasValet: false },
      isMeetingRoom: true,
      isBuffet: true,
    });
    expect(managerRow.hasMeetingRoom).toBe(securityRow.hasMeetingRoom);
    expect(managerRow.hasBuffet).toBe(securityRow.hasBuffet);
    expect(managerRow).toMatchObject({
      hasMeetingRoom: true,
      hasBuffet: true,
      hasParking: false,
      hasValet: false,
    });
  });

  it('does not invent services when neither flags nor service objects are present', () => {
    expect(mapManagerRequestToMatrixItem(pendingRequest(), '', false)).toMatchObject({
      hasMeetingRoom: false,
      hasBuffet: false,
      hasParking: false,
      hasValet: false,
    });
  });

  it('continues to support nested services and independent parking/valet values', () => {
    const request = pendingRequest({ isMeetingRoom: false, isBuffet: false });
    request.meetingRoom = {} as NonNullable<typeof request.meetingRoom>;
    request.buffet = {} as NonNullable<typeof request.buffet>;
    request.valet = {} as NonNullable<typeof request.valet>;
    request.visitorNeedsParking = true;

    expect(mapManagerRequestToMatrixItem(request, 'Meeting', false)).toMatchObject({
      hasMeetingRoom: true,
      hasBuffet: true,
      hasParking: true,
      hasValet: true,
    });
  });
});