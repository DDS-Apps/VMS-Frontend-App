import { withCanonicalTimelineTimestamps } from './timelineTimestamps';

describe('withCanonicalTimelineTimestamps', () => {
  it('promotes nested API timestamps for every role timeline builder', () => {
    expect(
      withCanonicalTimelineTimestamps({
        createdAt: 'legacy-requested',
        status: 'completed',
        approval: { requiresApproval: false },
        timeline: {
          requestedAt: '2026-09-03T07:13:15.252Z',
          approvedAt: '2026-09-03T07:14:00.000Z',
          visitorAcceptedAt: '2026-09-03T07:15:00.000Z',
          checkedInAt: '2026-09-03T08:00:00.000Z',
          checkedOutAt: '2026-09-03T09:00:00.000Z',
          completedAt: '2026-09-03T09:00:00.000Z',
        },
      }),
    ).toMatchObject({
      createdAt: '2026-09-03T07:13:15.252Z',
      acceptedAt: '2026-09-03T07:15:00.000Z',
      checkedInAt: '2026-09-03T08:00:00.000Z',
      checkedOutAt: '2026-09-03T09:00:00.000Z',
      completedAt: '2026-09-03T09:00:00.000Z',
      approval: {
        requiresApproval: false,
        approvedAt: '2026-09-03T07:14:00.000Z',
      },
    });
  });

  it('keeps flat timestamps when nested values are null', () => {
    expect(
      withCanonicalTimelineTimestamps({
        createdAt: 'flat-requested',
        checkedInAt: 'flat-check-in',
        timeline: {
          requestedAt: null,
          checkedInAt: null,
        },
      }),
    ).toMatchObject({
      createdAt: 'flat-requested',
      checkedInAt: 'flat-check-in',
    });
  });
});