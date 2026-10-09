import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { useReceptionCheckInMutation, useReceptionCheckOutMutation } from '@/hooks/queries/useReceptionQueries';
import { useGateCheckInMutation, useGateCheckOutMutation, useScanQRCodeMutation } from '@/hooks/queries/useSecurityQueries';
import { receptionApiService } from '@/services/api/receptionApiService';
import { securityApiService } from '@/services/api/securityApiService';

let mockSummaryEnabled = true;
jest.mock('@/constants/movementSummary', () => ({ get MOVEMENT_SUMMARY_ENABLED() { return mockSummaryEnabled; } }));
beforeEach(() => { mockSummaryEnabled = true; });
jest.mock('@/services/api/receptionApiService', () => ({ receptionApiService: { checkInVisitor: jest.fn(), checkOutVisitor: jest.fn() } }));
jest.mock('@/services/api/securityApiService', () => ({ securityApiService: { gateCheckIn: jest.fn(), gateCheckOut: jest.fn(), scanQRCode: jest.fn() } }));
jest.mock('@/hooks/queries/useDashboardKpiQuery', () => ({ invalidateDashboardKpis: jest.fn() }));

const cases = [
  [useReceptionCheckInMutation, receptionApiService.checkInVisitor],
  [useReceptionCheckOutMutation, receptionApiService.checkOutVisitor],
  [useGateCheckInMutation, securityApiService.gateCheckIn],
  [useGateCheckOutMutation, securityApiService.gateCheckOut],
] as const;

it.each(cases)('refreshes existing cross-role lists after a successful write with display rollout disabled (%#)', async (useHook, service) => {
  mockSummaryEnabled = false;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  const result = { id: 'v1', status: 'completed', movementSummaryAvailability: 'unavailable' };
  (service as jest.Mock).mockReset().mockResolvedValue(result);
  const key = ['valetAdmin', 'parkingDashboard', '2026-10-09', '2026-10-09'];
  const read = jest.fn(async () => ({ data: [{ id: 'v1', status: 'completed' }] }));
  const off = new QueryObserver(client, { queryKey: key, queryFn: read,
    initialData: { data: [{ id: 'v1', status: 'checked_in' }] }, staleTime: Infinity }).subscribe(() => {});
  let mutation: any;
  function Harness() { mutation = useHook(); return null; }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
  await act(async () => { expect(await mutation.mutateAsync({ visitId: 'v1', gateId: 'main' })).toEqual(result); });
  expect(service).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(key)).toEqual({ data: [{ id: 'v1', status: 'completed' }] });
  await act(async () => tree.unmount());
  off(); client.clear();
});

it('QR activation refreshes returned state without optimistic building entry or a chained action', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  const key = ['security', 'visitor', 'qr-fixture'];
  client.setQueryData(key, { id: 'qr-fixture', status: 'approved', movementSummary: { version: 1, latestCheckInAt: null, latestCheckOutAt: null } });
  const before = client.getQueryData(key);
  const result = { valid: true, visitId: 'qr-fixture', message: 'Activated', canCheckIn: true, canCheckOut: false };
  (securityApiService.scanQRCode as jest.Mock).mockResolvedValue(result);
  (securityApiService.gateCheckIn as jest.Mock).mockClear();
  (securityApiService.gateCheckOut as jest.Mock).mockClear();
  let mutation: any;
  function Harness() { mutation = useScanQRCodeMutation(); return null; }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
  await act(async () => { expect(await mutation.mutateAsync('synthetic-qr')).toEqual(result); });
  expect(client.getQueryData(key)).toEqual(before);
  expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(securityApiService.gateCheckIn).not.toHaveBeenCalled();
  expect(securityApiService.gateCheckOut).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
  client.clear();
});

it.each(cases)('keeps movement successful and rows retained when its read fails (%#)', async (useHook, service) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 3, gcTime: Infinity } } });
  const response = { id: 'v1', movementSummaryAvailability: 'unavailable', movementSummaryError: 'private error' };
  (service as jest.Mock).mockReset().mockResolvedValue(response);
  const rows = { data: [{ id: 'v1' }] };
  const read = jest.fn().mockRejectedValue(new Error('offline'));
  const key = ['requests', 'visits', { search: 'kept', page: 2 }];
  const observer = new QueryObserver(client, { queryKey: key, queryFn: read, initialData: rows, staleTime: Infinity });
  const off = observer.subscribe(() => {});
  let mutation: any;
  function Harness() { mutation = useHook(); return null; }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
  await act(async () => {
    expect(await mutation.mutateAsync({ visitId: 'v1', gateId: 'offline' })).toEqual(response);
  });
  expect(service).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(key)).toEqual(rows);
  expect(client.getQueryState(key)?.status).toBe('error');
  await act(async () => { tree.unmount(); });
  off(); client.clear();
});

it.each(cases)('replaces a pre-mutation list response with a subsequent canonical read (%#)', async (useHook, service) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  const oldPair = { version: 1, latestCheckInAt: '2026-10-07T06:00:00Z', latestCheckOutAt: null };
  const latestPair = { version: 1, latestCheckInAt: '2026-10-07T08:00:00Z', latestCheckOutAt: '2026-10-07T07:00:00Z' };
  const oldRows = { data: [{ id: 'v1', movementSummary: oldPair }] };
  const latestRows = { data: [{ id: 'v1', movementSummary: latestPair }] };
  const response = { id: 'v1', movementSummary: latestPair };
  (service as jest.Mock).mockReset().mockResolvedValue(response);
  let release!: (value: typeof oldRows) => void;
  const pending = new Promise(done => { release = done; });
  const read = jest.fn().mockReturnValueOnce(pending).mockResolvedValue(latestRows);
  const key = ['requests', 'visits', { search: 'kept', page: 2 }];
  const observer = new QueryObserver(client, { queryKey: key, queryFn: read, initialData: oldRows, staleTime: 0 });
  const off = observer.subscribe(() => {});
  expect(read).toHaveBeenCalledTimes(1);
  let mutation: any;
  function Harness() { mutation = useHook(); return null; }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
  await act(async () => {
    expect(await mutation.mutateAsync({ visitId: 'v1', gateId: 'offline' })).toEqual(response);
  });
  expect(read).toHaveBeenCalledTimes(1);
  await act(async () => {
    release(oldRows);
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
  expect(service).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledTimes(2);
  expect(client.getQueryData(key)).toEqual(latestRows);
  await act(async () => { tree.unmount(); });
  off(); client.clear();
});
