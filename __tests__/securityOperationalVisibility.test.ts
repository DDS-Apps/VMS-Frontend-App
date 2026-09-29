import { get } from '@/api/httpClient';
import { securityApiService } from '@/services/api/securityApiService';

jest.mock('@/api/httpClient', () => ({ get: jest.fn(), post: jest.fn() }));

const getMock = get as jest.Mock;
const visit = (id: string, status: string, isWalkIn = false) => ({
  id,
  status,
  isWalkIn,
  visitor: { fullName: 'Test Visitor', email: '' },
  employeeName: 'Host',
  visitDate: '2026-09-01',
  visitTime: '09:00 AM',
  purpose: 'Meeting',
});

beforeEach(() => getMock.mockReset());

it('omits unconfirmed visits from Security lists and counts, preserving approved walk-ins', async () => {
  getMock.mockResolvedValue({
    data: [
      visit('awaiting', 'approved'),
      visit('pending', 'visitor_pending'),
      visit('accepted', 'visitor_accepted'),
      visit('walkin', 'approved', true),
      visit('checked', 'checked_in'),
    ],
    pagination: { page: 1, limit: 100, total: 5, totalPages: 1 },
  });

  const list = await securityApiService.getVisitors();
  expect(list.data.map(v => v.id)).toEqual(['accepted', 'walkin', 'checked']);
  const summary = await securityApiService.getTodaySummary();
  expect(summary.expectedToday).toBe(3);
  expect(summary.walkIns).toBe(1);
  expect(summary.checkedIn).toBe(1);
});

it('does not return unconfirmed visit details to the Security screen', async () => {
  getMock.mockResolvedValueOnce(visit('awaiting', 'approved'));
  await expect(securityApiService.getVisitorDetails('awaiting')).rejects.toThrow('not available');
  getMock.mockResolvedValueOnce(visit('walkin', 'approved', true));
  await expect(securityApiService.getVisitorDetails('walkin')).resolves.toMatchObject({
    id: 'walkin',
    isWalkIn: true,
  });
});