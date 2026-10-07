import { invalidateMovementSummaries } from '@/hooks/queries/invalidateMovementSummaries';
let mockEnabled = true;
jest.mock('@/constants/movementSummary', () => ({ get MOVEMENT_SUMMARY_ENABLED() { return mockEnabled; } }));

it('does not change request behavior while rollout is disabled', () => {
  mockEnabled = false;
  const invalidateQueries = jest.fn();
  invalidateMovementSummaries({ invalidateQueries, getQueryCache: () => ({ findAll: () => [] }) } as any);
  expect(invalidateQueries).not.toHaveBeenCalled();
});

it('invalidates existing visit-summary caches, not role configuration or unrelated modules', () => {
  mockEnabled = true;
  const invalidateQueries = jest.fn();
  invalidateMovementSummaries({ invalidateQueries, getQueryCache: () => ({ findAll: () => [] }) } as any);
  const options = invalidateQueries.mock.calls[0][0];
  expect(options.refetchType).toBe('none');
  for (const key of [
    ['requests', 'visits'], ['requests', 'reception-requests'], ['security', 'visitors'],
    ['reception', 'today'], ['reception', 'search'], ['all-requests', 'visits'],
    ['valetAdmin', 'parkingDashboard'],
  ]) expect(options.predicate({ queryKey: key })).toBe(true);
  for (const key of [['users'], ['security', 'blacklist-check'], ['all-requests', 'buffet-admin-tasks']]) {
    expect(options.predicate({ queryKey: key })).toBe(false);
  }
});
