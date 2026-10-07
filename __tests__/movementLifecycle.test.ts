import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { subscribeMovementRefresh } from '@/providers/movementRefreshLifecycle';

jest.mock('@/constants/movementSummary', () => ({ MOVEMENT_SUMMARY_ENABLED: true }));

it('coalesces foreground/reconnect, refreshes only active scoped queries and cleans up', async () => {
  jest.useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let app!: (state: string) => void;
  let network!: (state: any) => void;
  const removeApp = jest.fn(), removeNetwork = jest.fn();
  const active = jest.fn(async () => ({ data: [{ id: 'v1' }] }));
  const unrelated = jest.fn(async () => 'unrelated');
  const off1 = new QueryObserver(client, { queryKey: ['requests', 'visits', { search: 'keep' }], queryFn: active, initialData: { data: [{ id: 'v1' }] }, staleTime: Infinity }).subscribe(() => {});
  const off2 = new QueryObserver(client, { queryKey: ['users'], queryFn: unrelated, initialData: 'users', staleTime: Infinity }).subscribe(() => {});
  client.setQueryData(['requests', 'visits', { search: 'inactive' }], { data: [] });
  const stop = subscribeMovementRefresh(client, {
    currentState: 'active',
    onAppState: fn => { app = fn; return { remove: removeApp }; },
    onNetwork: fn => { network = fn; return { remove: removeNetwork }; },
    getNetwork: async () => ({ isConnected: true }),
  });
  await Promise.resolve();
  expect(active).not.toHaveBeenCalled();
  app('background');
  network({ isConnected: false });
  app('active');
  network({ isConnected: true });
  app('inactive'); app('active');
  await jest.advanceTimersByTimeAsync(250);
  expect(active).toHaveBeenCalledTimes(1);
  expect(unrelated).not.toHaveBeenCalled();
  expect(client.getQueryData(['requests', 'visits', { search: 'inactive' }])).toEqual({ data: [] });
  app('background'); app('active');
  stop();
  await jest.advanceTimersByTimeAsync(500);
  expect(active).toHaveBeenCalledTimes(1);
  expect(removeApp).toHaveBeenCalledTimes(1);
  expect(removeNetwork).toHaveBeenCalledTimes(1);
  off1(); off2(); client.clear(); jest.useRealTimers();
});
