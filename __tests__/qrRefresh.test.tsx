import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePublicInviteQuery } from '@/hooks/queries/usePublicInviteQueries';
import { useVisitMovementHistory } from '@/hooks/queries/useVisitMovementHistory';
import { publicInviteService } from '@/services/api/publicInviteService';
import { get } from '@/api/httpClient';

let mockActive = true;
jest.mock('@/hooks/useActiveVisitView', () => ({ useActiveVisitView: () => mockActive }));
jest.mock('@/services/api/publicInviteService', () => ({ publicInviteService: { getByToken: jest.fn() } }));
jest.mock('@/api/httpClient', () => ({ get: jest.fn() }));

let client: QueryClient;
let tree: ReactTestRenderer;
let result: any;
const retained = { requestId: 'v1', timezone: 'Asia/Riyadh', qrValidity: {
  expiresAt: '2026-10-16T18:00:00Z', expired: false, retainedUntilCheckout: true,
  terminal: false, revocationPending: false,
}, data: [] };
function Probe({ history = false }: { history?: boolean }) {
  const invite = usePublicInviteQuery(history ? undefined : 'fixture');
  const movement = useVisitMovementHistory('v1', { status: 'completed' }, mockActive && history);
  result = history ? movement : invite;
  return null;
}
const render = (history = false) => <QueryClientProvider client={client}><Probe history={history} /></QueryClientProvider>;
const flush = async (ms = 0) => {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
  await act(async () => { await jest.advanceTimersByTimeAsync(0); });
};
beforeEach(() => {
  jest.useFakeTimers();
  mockActive = true;
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  (get as jest.Mock).mockResolvedValue(retained);
  (publicInviteService.getByToken as jest.Mock).mockResolvedValue({ status: 'visitor_accepted', qrCode: 'fixture', canAccept: false, canReject: false });
});
afterEach(() => {
  act(() => tree?.unmount());
  client.clear();
  jest.useRealTimers();
});
it('polls active invitations, pauses hidden screens, and refreshes on return', async () => {
  act(() => { tree = create(render()); });
  await flush();
  expect(publicInviteService.getByToken).toHaveBeenCalledTimes(1);
  await flush(60_000);
  expect(publicInviteService.getByToken).toHaveBeenCalledTimes(2);
  mockActive = false;
  act(() => tree.update(render()));
  await flush(120_000);
  expect(publicInviteService.getByToken).toHaveBeenCalledTimes(2);
  mockActive = true;
  act(() => tree.update(render()));
  await flush();
  expect(publicInviteService.getByToken).toHaveBeenCalledTimes(3);
});
it.each([403, 410])('stops invitation polling on HTTP %s', async status => {
  (publicInviteService.getByToken as jest.Mock).mockRejectedValue({ response: { status } });
  act(() => { tree = create(render()); });
  await flush();
  await flush(180_000);
  expect(publicInviteService.getByToken).toHaveBeenCalledTimes(1);
  expect(result.error.response.status).toBe(status);
});
it('retains the exact history metadata and observes cleanup until settled', async () => {
  (get as jest.Mock).mockResolvedValue({ ...retained, qrValidity: { ...retained.qrValidity, expired: true, terminal: true, revocationPending: true } });
  act(() => { tree = create(render(true)); });
  await flush();
  expect(result.data.qrValidity.revocationPending).toBe(true);
  (get as jest.Mock).mockResolvedValue({ ...retained, qrValidity: { ...retained.qrValidity, expired: true, terminal: true, revocationPending: false } });
  await flush(60_000);
  expect(get).toHaveBeenCalledTimes(2);
  await flush(180_000);
  expect(get).toHaveBeenCalledTimes(2);
});
it('fails explicitly on malformed history instead of exposing it to the timeline', async () => {
  (get as jest.Mock).mockResolvedValue([]);
  act(() => { tree = create(render(true)); });
  await flush();
  expect(result.error.message).toBe('Unsupported movement-history response');
  expect(result.data).toBeUndefined();
  await flush(120_000);
  expect(get).toHaveBeenCalledTimes(1);
});
