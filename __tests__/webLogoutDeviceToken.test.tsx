import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockInitialize = jest.fn();
const mockUnregister = jest.fn();
jest.mock('@/services/push', () => ({
  pushNotificationService: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    unregister: (...args: unknown[]) => mockUnregister(...args),
  },
}));
jest.mock('@/services/crashlytics/crashlyticsService', () => ({
  crashlyticsService: {
    setUserAttributes: jest.fn().mockResolvedValue(undefined),
    clearUserAttributes: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/hooks/queries/useDashboardKpiQuery', () => ({
  dashboardKpiKeys: { all: ['dashboard-kpis'], byIdentity: (identity: string) => ['dashboard-kpis', identity] },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getAccessToken, getRefreshToken, setRefreshToken, httpClient, clearTokens } from '@/api/httpClient';
import { deviceApiService } from '@/services/api/deviceApiService';

// Synthetic fixture values only. No production credentials or device registrations.
const accessA = 'fixture-access-A';
const accessB = 'fixture-access-B';
const refreshA = 'fixture-refresh-A';
const browserToken = 'fixture-browser-token';
const userA = { id: 'A', email: 'a@example.test', name: 'A', role: 'employee', isSSOUser: false };
let auth: ReturnType<typeof useAuth>;
function Probe() { auth = useAuth(); return null; }
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); };

describe('web logout device-token isolation through the real HTTP clients', () => {
  let tree: ReactTestRenderer;
  let previousPlatform: typeof Platform.OS;
  let previousAdapter: typeof httpClient.defaults.adapter;
  let previousAxiosAdapter: typeof axios.defaults.adapter;
  let trace: Array<{ path: string; method: string; header?: string; body: any; status: number }>;
  let deleteStatus: number;
  let logoutStatus: number;
  let deleteGate: Promise<void> | undefined;
  let deleteNetworkFailure: boolean;
  let originalWindow: PropertyDescriptor | undefined;
  const logs: unknown[][] = [];

  beforeEach(async () => {
    previousPlatform = Platform.OS;
    Platform.OS = 'web';
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
      location: { hash: '', href: 'https://fixture.example.test/' },
    } });
    previousAdapter = httpClient.defaults.adapter;
    previousAxiosAdapter = axios.defaults.adapter;
    clearTokens();
    await AsyncStorage.clear();
    trace = [];
    logs.length = 0;
    deleteStatus = 204;
    logoutStatus = 200;
    deleteGate = undefined;
    deleteNetworkFailure = false;
    for (const method of ['log', 'warn', 'error'] as const) {
      jest.spyOn(console, method).mockImplementation((...args) => { logs.push(args); });
    }
    const adapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
      const path = config.url ?? '';
      const method = config.method ?? 'get';
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      let data: unknown = {};
      let status = 200;
      if (path.endsWith('/users/me')) data = userA;
      else if (path.endsWith('/auth/login')) data = {
        accessToken: accessB, refreshToken: 'fixture-refresh-B', expiresIn: 3600,
        user: { ...userA, id: 'B', email: 'b@example.test' },
      };
      else if (path.endsWith('/devices/token') && method === 'delete') status = deleteStatus;
      else if (path.endsWith('/auth/logout')) status = logoutStatus;
      else if (!(path.endsWith('/devices/token') && method === 'post')) throw new Error('Unexpected fixture endpoint');
      trace.push({ path, method, header: (config.headers as any)?.Authorization, body, status });
      if (path.endsWith('/devices/token') && method === 'delete') {
        await deleteGate;
        if (deleteNetworkFailure) throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config as never, {});
      }
      const response = {
        config: config as never, headers: {}, status, statusText: String(status),
        data: status === 204 ? undefined : { success: status < 400, data },
      };
      if (status >= 400) throw new AxiosError('Fixture failure', AxiosError.ERR_BAD_REQUEST, config as never, {}, response);
      return response;
    };
    httpClient.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;
    mockInitialize.mockReset().mockImplementation(async () => {
      await deviceApiService.registerToken({ deviceToken: browserToken, platform: 'web' });
    });
    mockUnregister.mockReset().mockImplementation(async (snapshot: string) => {
      await deviceApiService.unregisterToken(browserToken, snapshot);
    });
    await AsyncStorage.setItem('@vms_tokens', JSON.stringify({
      accessToken: accessA, refreshToken: refreshA, expiresAt: Date.now() + 3600_000,
    }));
    await AsyncStorage.setItem('@vms_auth', JSON.stringify(userA));
    await act(async () => { tree = create(<AuthProvider><Probe /></AuthProvider>); });
    await flush();
    expect(auth.isAuthenticated).toBe(true);
  });

  afterEach(() => {
    act(() => tree.unmount());
    clearTokens();
    Platform.OS = previousPlatform;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    httpClient.defaults.adapter = previousAdapter;
    axios.defaults.adapter = previousAxiosAdapter;
    jest.restoreAllMocks();
  });

  it.each([200, 204])('DELETE %i precedes session-scoped logout and B registers with B authorization', async status => {
    deleteStatus = status;
    let release!: () => void;
    deleteGate = new Promise<void>(resolve => { release = resolve; });
    let completion!: Promise<void>;
    await act(async () => { completion = auth.logout(); });
    await flush();
    expect(getAccessToken()).toBe(accessA);
    expect(getRefreshToken()).toBe(refreshA);
    expect(auth.isAuthenticated).toBe(true);
    expect(trace.some(row => row.path.endsWith('/auth/logout'))).toBe(false);
    const deletion = trace.find(row => row.method === 'delete')!;
    expect(deletion.header).toBe(`Bearer ${accessA}`);
    expect(deletion.body).toEqual({ deviceToken: browserToken });
    await act(async () => { release(); await completion; });
    expect(auth.isAuthenticated).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    const logout = trace.find(row => row.path.endsWith('/auth/logout'))!;
    expect(logout.header).toBe(`Bearer ${accessA}`);
    expect(logout.body).toEqual({ refreshToken: refreshA });
    expect(trace.indexOf(deletion)).toBeLessThan(trace.indexOf(logout));
    await act(async () => { await auth.login('b@example.test', 'fixture-password'); });
    await flush();
    const registrations = trace.filter(row => row.path.endsWith('/devices/token') && row.method === 'post');
    expect(registrations.map(row => row.header)).toEqual([`Bearer ${accessA}`, `Bearer ${accessB}`]);
    expect(registrations[1].body.deviceToken).toBe(browserToken);
    expect(trace.some(row => row.path.endsWith('/devices/tokens'))).toBe(false);
    const output = JSON.stringify(logs);
    for (const secret of [accessA, accessB, refreshA, browserToken]) expect(output).not.toContain(secret);
  });

  it.each([401, 503])('does not claim success or revoke refresh sessions when DELETE fails with %i', async status => {
    deleteStatus = status;
    await act(async () => { await expect(auth.logout()).rejects.toThrow('Sign-out could not be completed'); });
    expect(auth.isAuthenticated).toBe(true);
    expect(getAccessToken()).toBe(accessA);
    expect(trace.some(row => row.path.endsWith('/auth/logout'))).toBe(false);
    expect(trace.some(row => row.path.endsWith('/auth/refresh'))).toBe(false);
    expect(JSON.stringify(logs)).toContain(`status=${status}`);
    deleteStatus = 204;
    await act(async () => { await auth.logout(); });
    expect(auth.isAuthenticated).toBe(false);
  });

  it('reports network failure and allows retry without losing the ending session', async () => {
    deleteNetworkFailure = true;
    await act(async () => { await expect(auth.logout()).rejects.toThrow(); });
    expect(auth.isAuthenticated).toBe(true);
    expect(getRefreshToken()).toBe(refreshA);
    expect(trace.some(row => row.path.endsWith('/auth/logout'))).toBe(false);
  });

  it('does not clear authentication when session-scoped logout itself fails', async () => {
    logoutStatus = 503;
    await act(async () => { await expect(auth.logout()).rejects.toThrow(); });
    expect(auth.isAuthenticated).toBe(true);
    expect(getAccessToken()).toBe(accessA);
  });

  it('serializes rapid B login behind the old web logout', async () => {
    let release!: () => void;
    deleteGate = new Promise<void>(resolve => { release = resolve; });
    let logout!: Promise<void>;
    let login!: Promise<unknown>;
    await act(async () => { logout = auth.logout(); login = auth.login('b@example.test', 'fixture-password'); });
    await flush();
    expect(trace.some(row => row.path.endsWith('/auth/login'))).toBe(false);
    await act(async () => { release(); await logout; await login; });
    await flush();
    expect(auth.user?.id).toBe('B');
    expect(trace.findIndex(row => row.path.endsWith('/auth/logout')))
      .toBeLessThan(trace.findIndex(row => row.path.endsWith('/auth/login')));
  });

  it('deduplicates repeated logout taps', async () => {
    let release!: () => void;
    deleteGate = new Promise<void>(resolve => { release = resolve; });
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => { first = auth.logout(); second = auth.logout(); });
    await flush();
    expect(trace.filter(row => row.method === 'delete')).toHaveLength(1);
    await act(async () => { release(); await Promise.all([first, second]); });
    expect(trace.filter(row => row.path.endsWith('/auth/logout'))).toHaveLength(1);
  });

  it('never sends logout without this web session refresh token', async () => {
    setRefreshToken(null);
    await act(async () => { await expect(auth.logout()).rejects.toThrow(); });
    expect(trace.some(row => row.path.endsWith('/auth/logout'))).toBe(false);
    expect(mockUnregister).not.toHaveBeenCalled();
    expect(auth.isAuthenticated).toBe(true);
  });
});
