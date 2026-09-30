import {
  fetchAdminVisitStatusCounts,
  normalizeVisitStatus,
} from '@/utils/adminVisitStatusCounts';

const response = (statuses: string[], page: number, limit: number, total: number) => ({
  success: true,
  data: statuses.map((status, index) => ({ id: `${page}-${index}`, status })),
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

describe('Admin visitor status totals', () => {
  it('combines exact server totals across lifecycle aliases without downloading 660 records', async () => {
    const totals: Record<string, number> = {
      pending_approval: 80,
      pending_host_approval: 42,
      visitor_pending: 38,
      approved: 40,
      visitor_accepted: 180,
      checked_in: 60,
      checked_out: 70,
      completed: 50,
      cancelled: 40,
      visitor_rejected: 60,
    };
    const fetchVisits = jest.fn(async (params: any) => {
      const count = totals[params.status] ?? 0;
      return response(count ? [params.status] : [], 1, 1, count) as any;
    });
    const counts = await fetchAdminVisitStatusCounts({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      expectedTotal: 660,
    }, fetchVisits);
    expect(counts).toEqual({
      pending: 160,
      approved: 220,
      in_progress: 60,
      completed: 120,
      cancelled: 40,
      auto_cancelled: 0,
      rejected: 60,
    });
    expect(fetchVisits.mock.calls.every(([params]) =>
      params.limit === 1 &&
      params.startDate === '2026-09-01' &&
      params.endDate === '2026-09-30',
    )).toBe(true);
  });

  it('falls back to paginated counts if the server ignores status', async () => {
    const visits = Array.from({ length: 660 }, (_, id) => ({
      id: String(id),
      status: id % 2 ? 'visitor_accepted' : 'pending_host_approval',
    }));
    const fetchVisits = jest.fn(async (params: any) => {
      if (params.limit === 1) {
        return {
          ...response(['visitor_accepted'], 1, 1, 660),
          data: [{ id: '1', status: 'visitor_accepted' }],
        } as any;
      }
      const offset = (params.page - 1) * 100;
      return {
        ...response([], params.page, 100, 660),
        data: visits.slice(offset, offset + 100),
      } as any;
    });
    const counts = await fetchAdminVisitStatusCounts({ expectedTotal: 660 }, fetchVisits);
    expect(counts.pending).toBe(330);
    expect(counts.approved).toBe(330);
    expect(fetchVisits.mock.calls.filter(([params]) => params.limit === 100)).toHaveLength(7);
  });

  it('does not report partial counts if a fallback page fails', async () => {
    const fetchVisits = jest.fn(async (params: any) => {
      if (params.status) throw new Error('status unsupported');
      if (params.page === 2) throw new Error('page unavailable');
      return response(['approved'], 1, 1, 2) as any;
    });
    await expect(fetchAdminVisitStatusCounts({ expectedTotal: 2 }, fetchVisits))
      .rejects.toThrow('page unavailable');
  });

  it('uses the same lifecycle groupings as the request cards', () => {
    expect(normalizeVisitStatus('visitor_accepted')).toBe('approved');
    expect(normalizeVisitStatus('checked_out')).toBe('completed');
    expect(normalizeVisitStatus('visitor_rejected')).toBe('rejected');
    expect(normalizeVisitStatus('auto_cancelled')).toBe('auto_cancelled');
  });
});