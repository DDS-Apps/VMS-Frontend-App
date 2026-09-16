import { groupVisitsByDate } from '@/utils/groupVisitsByDate';

describe('groupVisitsByDate required sections', () => {
  it('adds a required date even when it has no visits', () => {
    const groups = groupVisitsByDate(
      [{ id: 'yesterday', visitDate: '2026-09-03' }],
      ['2026-09-04'],
    );

    expect(groups).toEqual([
      {
        date: '2026-09-03',
        visits: [{ id: 'yesterday', visitDate: '2026-09-03' }],
      },
      { date: '2026-09-04', visits: [] },
    ]);
  });

  it('does not replace or duplicate an existing required-date group', () => {
    const todayVisit = { id: 'today', visitDate: '2026-09-04' };

    expect(groupVisitsByDate([todayVisit], ['2026-09-04'])).toEqual([
      { date: '2026-09-04', visits: [todayVisit] },
    ]);
  });

  it('ignores invalid required date keys', () => {
    expect(groupVisitsByDate([], ['Today'])).toEqual([]);
  });
});