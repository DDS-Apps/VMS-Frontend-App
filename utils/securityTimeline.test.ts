import { getSecurityTimelineTimestamps } from './securityTimeline';

describe('getSecurityTimelineTimestamps', () => {
  it('uses canonical nested timeline timestamps for completed visits', () => {
    expect(
      getSecurityTimelineTimestamps({
        checkedInAt: 'legacy-check-in',
        checkedOutAt: 'legacy-check-out',
        timeline: {
          checkedInAt: '2026-09-02T11:01:40.000Z',
          checkedOutAt: '2026-09-02T11:45:15.000Z',
          completedAt: '2026-09-02T11:45:15.000Z',
        },
      }),
    ).toEqual({
      arrivedAt: '2026-09-02T11:01:40.000Z',
      checkedInAt: '2026-09-02T11:01:40.000Z',
      checkedOutAt: '2026-09-02T11:45:15.000Z',
    });
  });

  it('falls back to flat timestamps and completedAt', () => {
    expect(
      getSecurityTimelineTimestamps({
        checkedInAt: '2026-09-02T11:01:40.000Z',
        completedAt: '2026-09-02T11:45:15.000Z',
      }),
    ).toEqual({
      arrivedAt: '2026-09-02T11:01:40.000Z',
      checkedInAt: '2026-09-02T11:01:40.000Z',
      checkedOutAt: '2026-09-02T11:45:15.000Z',
    });
  });
});