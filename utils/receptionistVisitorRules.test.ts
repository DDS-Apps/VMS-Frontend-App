import {
  getReceptionistDateRange,
  isReceptionistAllVisitorsRecordVisible,
  isReceptionistDashboardVisitorVisible,
  isReceptionistAwaitingCheckIn,
  isReceptionistUpcomingVisitorVisible,
  keepReceptionistAllVisitorsRecord,
} from './receptionistVisitorRules';

describe('Receptionist visitor rules', () => {
  it('keeps host-accepted walk-ins awaiting manager approval in pending Receptionist filters', () => {
    const awaitingManager = { status: 'pending_approval', isWalkIn: true, visitDate: '2026-09-04' };
    expect(isReceptionistDashboardVisitorVisible(awaitingManager)).toBe(true);
    expect(isReceptionistUpcomingVisitorVisible(awaitingManager)).toBe(true);
    expect(isReceptionistAllVisitorsRecordVisible(
      awaitingManager,
      new Date('2026-09-04T12:00:00Z'),
    )).toBe(true);
    expect(isReceptionistAwaitingCheckIn(awaitingManager)).toBe(true);
    expect(isReceptionistAwaitingCheckIn({ status: 'pending_host_approval', isWalkIn: true })).toBe(true);
    expect(isReceptionistAwaitingCheckIn({ status: 'pending_approval', isWalkIn: false })).toBe(false);
  });
  it('keeps pending walk-ins and accepted invitations upcoming, not departed visits or pending invitations', () => {
    expect(isReceptionistUpcomingVisitorVisible({
      status: 'pending_approval', isWalkIn: true,
    })).toBe(true);
    expect(isReceptionistUpcomingVisitorVisible({
      status: 'pending_approval', isWalkIn: false,
    })).toBe(false);
    expect(isReceptionistUpcomingVisitorVisible({
      status: 'approved', isWalkIn: false,
    })).toBe(false);
    expect(isReceptionistUpcomingVisitorVisible({
      status: 'approved', isWalkIn: true,
    })).toBe(true);
    expect(isReceptionistUpcomingVisitorVisible({
      status: 'visitor_accepted', isWalkIn: false,
    })).toBe(true);
    expect(isReceptionistUpcomingVisitorVisible({
      status: 'checked_out', isWalkIn: true,
    })).toBe(false);
  });
  it('keeps pending walk-ins visible, but hides unconfirmed scheduled visits', () => {
    expect(isReceptionistDashboardVisitorVisible({
      isWalkIn: true,
      status: 'pending_host_approval',
    })).toBe(true);
    expect(isReceptionistDashboardVisitorVisible({
      isWalkIn: false,
      status: 'pending_host_approval',
    })).toBe(false);
    expect(keepReceptionistAllVisitorsRecord({
      isWalkIn: true,
      status: 'pending_host_approval',
    })).toBe(true);
    expect(keepReceptionistAllVisitorsRecord({
      isWalkIn: false,
      status: 'pending_host_approval',
    })).toBe(false);
    expect(keepReceptionistAllVisitorsRecord({
      isWalkIn: true,
      status: 'checked_out',
    })).toBe(true);
  });

  it.each([
    ['expected', false],
    ['pending', false],
    ['pending_host_approval', false],
    ['approved', false],
    ['visitor_pending', false],
    ['waiting_acceptance', false],
    ['visitor_accepted', true],
    ['accepted', true],
    ['checked_in', true],
    ['checked_out', true],
    ['completed', true],
    ['no_show', false],
    ['rejected', false],
    ['visitor_rejected', false],
    ['cancelled', false],
    ['auto_cancelled', false],
  ])('sets Today visibility for %s to %s', (status, expected) => {
    expect(isReceptionistDashboardVisitorVisible({
      isWalkIn: false,
      status,
    })).toBe(expected);
  });

  it('does not reveal unconfirmed scheduled visits in Today or history', () => {
    const now = new Date('2026-09-04T12:00:00.000Z');
    expect(isReceptionistAllVisitorsRecordVisible({
      isWalkIn: false,
      status: 'pending_host_approval',
      visitDate: '2026-09-04',
    }, now)).toBe(false);
    expect(isReceptionistAllVisitorsRecordVisible({
      isWalkIn: false,
      status: 'pending_host_approval',
      visitDate: '2026-09-03',
    }, now)).toBe(false);
  });

  it('does not allow a precise filter to bypass confirmation', () => {
    const cancelledVisit = {
      isWalkIn: false,
      status: 'cancelled',
      visitDate: '2026-09-03',
    };
    const retainedSourceStatus = 'cancelled';
    const newlySelectedStatus = 'approved';
    expect(isReceptionistAllVisitorsRecordVisible(cancelledVisit, new Date('2026-09-04T12:00:00.000Z'))).toBe(false);
    expect(isReceptionistAllVisitorsRecordVisible(
      cancelledVisit,
      new Date('2026-09-04T12:00:00.000Z'),
      retainedSourceStatus,
    )).toBe(false);
    expect(isReceptionistAllVisitorsRecordVisible(
      cancelledVisit,
      new Date('2026-09-04T12:00:00.000Z'),
      newlySelectedStatus,
    )).toBe(false);
  });

  it('uses the Riyadh business date for Today near the UTC boundary', () => {
    expect(
      getReceptionistDateRange('today', new Date('2026-09-03T21:30:00.000Z')),
    ).toEqual({
      startDate: '2026-09-04',
      endDate: '2026-09-04',
    });
  });

  it.each([
    ['Thursday', '2026-09-03T12:00:00.000Z', '2026-08-30', '2026-09-03'],
    ['Friday', '2026-09-04T12:00:00.000Z', '2026-08-30', '2026-09-04'],
    ['Saturday', '2026-09-05T12:00:00.000Z', '2026-08-30', '2026-09-05'],
  ])(
    'keeps the Receptionist This Week range current on %s',
    (_day, now, startDate, endDate) => {
      expect(getReceptionistDateRange('this_week', new Date(now))).toEqual({
        startDate,
        endDate,
      });
    },
  );

  it('extends This Week through Friday at the Riyadh UTC boundary', () => {
    expect(
      getReceptionistDateRange('this_week', new Date('2026-09-03T21:30:00.000Z')),
    ).toEqual({
      startDate: '2026-08-30',
      endDate: '2026-09-04',
    });
  });
});
