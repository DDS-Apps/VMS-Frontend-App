import { meetingRoomApiService } from '@/services/api/meetingRoomApiService';
import { requestApiService } from '@/services/api/requestApiService';

const mockGet = jest.fn();

jest.mock('@/api/httpClient', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
}));

describe('query read cancellation forwarding', () => {
  const signal = new AbortController().signal;

  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({});
  });

  it.each([
    [
      'pending approvals',
      () => requestApiService.getPendingApprovals({ limit: 10 }, { signal }),
    ],
    [
      'awaiting visitor',
      () => requestApiService.getAwaitingVisitor({ limit: 10 }, { signal }),
    ],
    [
      'pending host walk-ins',
      () => requestApiService.getPendingHostWalkIns({ limit: 10 }, { signal }),
    ],
    [
      'visit list',
      () => requestApiService.listVisits({ page: 1, limit: 20 }, { signal }),
    ],
    [
      'duplicate visit check',
      () =>
        requestApiService.checkDuplicateVisit(
          { date: '2026-09-15', email: 'visitor@example.com' },
          { signal },
        ),
    ],
  ])('passes the React Query signal to %s', async (_name, request) => {
    await request();

    expect(mockGet).toHaveBeenCalledWith(expect.any(String), undefined, {
      signal,
    });
  });

  it('passes the React Query signal to room availability checks', async () => {
    await meetingRoomApiService.checkRoomAvailability(
      { date: '2026-09-15', startTime: '10:00', endTime: '11:00' },
      { signal },
    );

    expect(mockGet).toHaveBeenCalledWith(expect.any(String), undefined, {
      signal,
    });
  });
});
