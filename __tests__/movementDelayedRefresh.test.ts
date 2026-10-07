import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { invalidateMovementSummaries } from '@/hooks/queries/invalidateMovementSummaries';

jest.mock('@/constants/movementSummary', () => ({ MOVEMENT_SUMMARY_ENABLED: true }));
const before = { data: [{ id: 'v1', movementSummary: { version: 1, latestCheckInAt: '2026-10-07T06:00:00Z', latestCheckOutAt: null } }] };
const after = { data: [{ id: 'v1', movementSummary: { version: 1, latestCheckInAt: '2026-10-07T08:00:00Z', latestCheckOutAt: '2026-10-07T07:00:00Z' } }] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

it.each([false, true])('performs a canonical read after an in-flight pre-action list reply (initial load: %s)', async initialLoad => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const pending = deferred<typeof before>();
  const read = jest.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(after);
  const key = ['requests', 'visits', { search: 'keep', page: 3 }];
  const observer = new QueryObserver(client, {
    queryKey: key, queryFn: read,
    ...(initialLoad ? {} : { initialData: before }),
    staleTime: 0,
  });
  const off = observer.subscribe(() => {});
  expect(read).toHaveBeenCalledTimes(1);
  // A movement succeeds while its earlier list GET is still pending.
  const refresh = invalidateMovementSummaries(client);
  expect(read).toHaveBeenCalledTimes(1);
  pending.resolve(before);
  await refresh;
  expect(read).toHaveBeenCalledTimes(2);
  expect(client.getQueryData(key)).toEqual(after);
  expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  off(); client.clear();
});

it('a second action during the canonical read schedules one further read, not another write', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const first = deferred<typeof before>();
  const second = deferred<typeof after>();
  const read = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValue(after);
  const key = ['valetAdmin', 'parkingDashboard', '2026-10-07'];
  const observer = new QueryObserver(client, { queryKey: key, queryFn: read, initialData: before, staleTime: Infinity });
  const off = observer.subscribe(() => {});
  const refresh = invalidateMovementSummaries(client);
  const again = invalidateMovementSummaries(client);
  first.resolve(before);
  // Flush query settlement and the queued second read.
  for (let i = 0; i < 12; i++) await Promise.resolve();
  second.resolve(after);
  await Promise.all([refresh, again]);
  expect(read).toHaveBeenCalledTimes(2);
  expect(client.getQueryData(key)).toEqual(after);
  off(); client.clear();
});
