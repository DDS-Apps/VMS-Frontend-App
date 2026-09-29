import type { AwaitingVisitorDto, PendingApprovalDto, VisitListItemDto } from '@/types/api.types';
import {
  mapAwaitingVisitorToVisitorRequest,
  mapPendingApprovalToVisitorRequest,
  mapVisitListItemToVisitorRequest,
} from '@/utils/requestMappers';
import { mapOverviewRequestToMatrixItem } from '@/utils/overviewVisitorTable';

const visit = (overrides: Partial<VisitListItemDto> = {}): VisitListItemDto => ({
  id: 'visit-1',
  employeeName: 'Host',
  visitor: { fullName: 'Visitor' },
  visitDate: '2026-09-30',
  visitTime: '09:00',
  status: 'approved',
  purpose: 'Interview',
  isWalkIn: false,
  createdAt: '2026-09-28T09:00:00Z',
  ...overrides,
});

describe('Overview dashboard table services', () => {
  it('shows flag-only selections from the Upcoming Visits API list', () => {
    const request = mapVisitListItemToVisitorRequest(visit({
      isMeetingRoom: true,
      isBuffet: true,
      visitorNeedsParking: true,
    }));
    expect(request.meetingRoom).toBeUndefined();
    expect(request.buffet).toBeUndefined();

    expect(mapOverviewRequestToMatrixItem(request, false)).toMatchObject({
      hasMeetingRoom: true,
      hasBuffet: true,
      hasParking: true,
      hasValet: false,
    });
  });

  it('does not show services when neither a flag nor a service object is present', () => {
    expect(mapOverviewRequestToMatrixItem(mapVisitListItemToVisitorRequest(visit()), false))
      .toMatchObject({
        hasMeetingRoom: false,
        hasBuffet: false,
        hasParking: false,
        hasValet: false,
      });
  });

  it.each([
    { isMeetingRoom: true, isBuffet: false },
    { isMeetingRoom: false, isBuffet: true },
  ])('keeps independently selected services separate: %p', (selection) => {
    const request = mapVisitListItemToVisitorRequest(visit(selection));
    expect(mapOverviewRequestToMatrixItem(request, false)).toMatchObject({
      hasMeetingRoom: selection.isMeetingRoom,
      hasBuffet: selection.isBuffet,
    });
  });

  it('keeps nested service, Parking, and Valet behavior', () => {
    const request = mapVisitListItemToVisitorRequest(visit({
      hasMeetingRoom: true,
      hasBuffet: true,
      hasParking: true,
      hasValet: true,
    }));
    request.isMeetingRoom = false;
    request.isBuffet = false;
    expect(mapOverviewRequestToMatrixItem(request, false)).toMatchObject({
      hasMeetingRoom: true,
      hasBuffet: true,
      hasParking: true,
      hasValet: true,
    });
  });

  it('also shows flag-only selections in the other Overview request tables', () => {
    const pending = mapPendingApprovalToVisitorRequest({
      id: 'pending-1',
      employeeName: 'Host',
      visitor: { fullName: 'Visitor' },
      visitDate: '2026-09-30',
      visitTime: '09:00',
      createdAt: '2026-09-28T09:00:00Z',
      isMeetingRoom: true,
      isBuffet: true,
    } as PendingApprovalDto);
    const awaiting = mapAwaitingVisitorToVisitorRequest({
      id: 'awaiting-1',
      employeeName: 'Host',
      visitor: { fullName: 'Visitor' },
      visitDate: '2026-09-30',
      visitTime: '09:00',
      approvedAt: '2026-09-28T09:00:00Z',
      status: 'approved',
      isMeetingRoom: true,
      isBuffet: true,
    } as AwaitingVisitorDto);

    for (const request of [pending, awaiting]) {
      expect(mapOverviewRequestToMatrixItem(request, false)).toMatchObject({
        hasMeetingRoom: true,
        hasBuffet: true,
      });
    }
  });
});