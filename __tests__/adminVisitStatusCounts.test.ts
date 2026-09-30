import { getAdminVisitStatusCounts, normalizeVisitStatus } from '@/utils/adminVisitStatusCounts';
import type { VisitListResponse } from '@/types/api.types';
import fs from 'fs';
import path from 'path';

const counts = {
  pending: 160, approved: 220, in_progress: 60, completed: 120,
  cancelled: 40, auto_cancelled: 10, rejected: 50,
};
const page = (statuses: string[], total = statuses.length, offset = 0): VisitListResponse => ({
  data: statuses.map((status, index) => ({ id: String(offset + index), status })) as VisitListResponse['data'],
  pagination: { page: 1, limit: 20, total, totalPages: Math.ceil(total / 20) },
});

describe('Admin status counts from the list response only', () => {
  it('uses a full 660-visit breakdown with only the first page loaded', () => {
    expect(getAdminVisitStatusCounts([{ ...page(['approved'], 660), statusCounts: counts }], true))
      .toEqual(counts);
  });
  it('does not turn partial page counts into totals', () => {
    expect(getAdminVisitStatusCounts([page(['approved'], 660)], true)).toBeNull();
    expect(getAdminVisitStatusCounts([page(['approved'], 660)], false)).toBeNull();
  });
  it.each([
    { ...counts, pending: -1 },
    { ...counts, pending: 1.5 },
    { ...counts, pending: 0 },
    { ...counts, pending: '160' },
    { approved: 660 },
  ])('rejects malformed or inconsistent aggregates', statusCounts => {
    const response = { ...page(['approved'], 660), statusCounts } as VisitListResponse;
    expect(getAdminVisitStatusCounts([response], true)).toBeNull();
  });
  it('counts an already complete list with the existing alias mapping', () => {
    const result = getAdminVisitStatusCounts([
      page(['pending_host_approval', 'visitor_accepted', 'checked_out', 'auto_cancelled']),
    ], false);
    expect(result).toMatchObject({ pending: 1, approved: 1, completed: 1, auto_cancelled: 1 });
    expect(normalizeVisitStatus('visitor_rejected')).toBe('rejected');
  });
  it('handles empty, absent, duplicate and scope-changing data', () => {
    expect(getAdminVisitStatusCounts([page([])], false)?.pending).toBe(0);
    expect(getAdminVisitStatusCounts(undefined, false)).toBeNull();
    expect(getAdminVisitStatusCounts([page(['approved'], 2), page(['approved'], 2)], false)).toBeNull();
    expect(getAdminVisitStatusCounts([{ ...page([], 660), statusCounts: counts }], true)).toEqual(counts);
    expect(getAdminVisitStatusCounts([page(['pending'], 30)], true)).toBeNull();
  });
  it('has no count query, API calls, or automatic pagination effect', () => {
    const helper = fs.readFileSync(path.resolve(__dirname, '../utils/adminVisitStatusCounts.ts'), 'utf8');
    const hook = fs.readFileSync(path.resolve(__dirname, '../hooks/queries/useAllRequestsQuery.ts'), 'utf8');
    expect(helper).not.toMatch(/requestApiService|fetch\(|countAllPages|PROBE_STATUSES/);
    expect(hook).not.toMatch(/visit-status-counts|visitCountsResult|shouldAutoFetchAllVisitorPages|useEffect/);
    expect(hook.match(/requestApiService\.listVisits\(/g)).toHaveLength(1);
  });
});