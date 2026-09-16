import {
  getReceptionistDateRange,
  isReceptionistAllVisitorsRecordVisible,
  isReceptionistDashboardVisitorVisible,
  keepReceptionistAllVisitorsRecord,
} from './receptionistVisitorRules';

describe('Receptionist visitor rules', () => {
  it('shows all active Today requests, including scheduled requests pending host approval', () => {
    expect(isReceptionistDashboardVisitorVisible({
      isWalkIn: true,
      status: 'pending_host_approval',
    })).toBe(true);
    expect(isReceptionistDashboardVisitorVisible({
      isWalkIn: false,
      status: 'pending_host_approval',
    })).toBe(true);
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
    ['expected', true],
    ['pending', true],
    ['pending_host_approval', true],
    ['accepted', true],
    ['checked_in', true],
    ['checked_out', true],
    ['completed', true],
    ['no_show', true],
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

  it('shows a pending-host request in the All Visitors Today section without broadening history', () => {
    const now = new Date('2026-09-04T12:00:00.000Z');
    expect(isReceptionistAllVisitorsRecordVisible({
      isWalkIn: false,
      status: 'pending_host_approval',
      visitDate: '2026-09-04',
    }, now)).toBe(true);
    expect(isReceptionistAllVisitorsRecordVisible({
      isWalkIn: false,
      status: 'pending_host_approval',
      visitDate: '2026-09-03',
    }, now)).toBe(false);
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
