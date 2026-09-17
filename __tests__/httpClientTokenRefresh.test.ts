import type { AxiosError as AxiosErrorType, AxiosRequestConfig, AxiosResponse } from 'axios';

type Handler = (config: AxiosRequestConfig) => Promise<AxiosResponse>;

/**
 * Drives the real axios interceptor chain in api/httpClient.ts through a
 * scripted adapter, so the refresh-on-401 behaviour is exercised end to end:
 * the original request, the raw refresh call, waiters queued behind an
 * in-flight refresh, and the retry with the new token.
 */
function loadClient(handler: Handler) {
  jest.resetModules();
  const axios = require('axios') as typeof import('axios');
  const AxiosError = axios.AxiosError;

  const adapter = (config: AxiosRequestConfig) => handler(config);
  axios.default.defaults.adapter = adapter;

  const client = require('@/api/httpClient') as typeof import('@/api/httpClient');
  client.httpClient.defaults.adapter = adapter;
  const errors = require('@/api/errors') as typeof import('@/api/errors');

  const httpError = (config: AxiosRequestConfig, status: number, data: unknown = {}): AxiosErrorType =>
    new AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config as never,
      {},
      { status, statusText: String(status), data, headers: {}, config: config as never },
    );
  const networkError = (config: AxiosRequestConfig): AxiosErrorType =>
    new AxiosError('Network Error', AxiosError.ERR_NETWORK, config as never, {});
  const timeoutError = (config: AxiosRequestConfig): AxiosErrorType =>
    new AxiosError('timeout exceeded', AxiosError.ECONNABORTED, config as never, {});
  const ok = (config: AxiosRequestConfig, data: unknown): AxiosResponse => ({
    status: 200,
    statusText: 'OK',
    data,
    headers: {},
    config: config as never,
  });

  return { client, errors, httpError, networkError, timeoutError, ok };
}

const isRefreshCall = (config: AxiosRequestConfig) =>
  typeof config.url === 'string' && config.url.includes('/auth/refresh');

const authHeader = (config: AxiosRequestConfig): string | undefined => {
  const headers = config.headers as Record<string, unknown> | undefined;
  const value = headers?.Authorization ?? headers?.authorization;
  return typeof value === 'string' ? value : undefined;
};

function settleWithin<T>(promise: Promise<T>, ms = 1000): Promise<PromiseSettledResult<T>> {
  return Promise.race([
    promise.then(
      (value) => ({ status: 'fulfilled', value }) as PromiseSettledResult<T>,
      (reason) => ({ status: 'rejected', reason }) as PromiseSettledResult<T>,
    ),
    new Promise<PromiseSettledResult<T>>((_, reject) =>
      setTimeout(() => reject(new Error(`request still pending after ${ms}ms`)), ms),
    ),
  ]);
}

describe('httpClient token refresh on 401', () => {
  it('clears the affected runtime session and reports the network cause when refresh cannot reach the server', async () => {
    const calls: string[] = [];
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      calls.push(`${config.method} ${config.url}`);
      if (isRefreshCall(config)) {
        expect(config.timeout).toBe(180_000);
        throw helpers.networkError(config);
      }
      throw helpers.httpError(config, 401, { message: 'expired' });
    });
    const { client, errors } = helpers;

    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    const onRefreshed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);
    client.setOnTokenRefreshed(onRefreshed);

    const result = await settleWithin(client.get('/api/v1/users/me'));

    expect(result.status).toBe('rejected');
    const error = (result as PromiseRejectedResult).reason;
    expect(errors.isApiError(error)).toBe(true);
    expect((error as { code: string }).code).toBe('NETWORK_ERROR');
    expect(errors.isUnauthorizedError(error)).toBe(false);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onRefreshed).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBeNull();
    expect(client.getRefreshToken()).toBeNull();
    expect(calls.filter(isRefreshCallLabel)).toHaveLength(1);
  });

  it('preserves a startup session when the refresh fails transiently through the interceptor', async () => {
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) throw helpers.networkError(config);
      throw helpers.httpError(config, 401, { message: 'expired' });
    });
    const { client } = helpers;

    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);

    const result = await settleWithin(
      client.get('/api/v1/users/me', undefined, { preserveSessionOnRefreshFailure: true }),
    );

    expect(result.status).toBe('rejected');
    expect(((result as PromiseRejectedResult).reason as { code: string }).code).toBe('NETWORK_ERROR');
    expect(onFailed).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBe('stale-access');
    expect(client.getRefreshToken()).toBe('refresh-1');
  });

  it('clears the affected runtime session when refresh times out', async () => {
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        expect(config.timeout).toBeGreaterThan(0);
        throw helpers.timeoutError(config);
      }
      throw helpers.httpError(config, 401);
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);

    const result = await settleWithin(client.get('/api/v1/users/me'));

    expect(result.status).toBe('rejected');
    expect(((result as PromiseRejectedResult).reason as { code: string }).code).toBe('TIMEOUT');
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(client.getRefreshToken()).toBeNull();
  });

  it('signs out only when the server rejects the refresh token', async () => {
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) throw helpers.httpError(config, 401, { message: 'invalid refresh token' });
      throw helpers.httpError(config, 401, { message: 'expired' });
    });
    const { client, errors } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);

    const result = await settleWithin(client.get('/api/v1/users/me'));

    expect(result.status).toBe('rejected');
    expect(errors.isUnauthorizedError((result as PromiseRejectedResult).reason)).toBe(true);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(client.getAccessToken()).toBeNull();
    expect(client.getRefreshToken()).toBeNull();
  });

  it('settles every request waiting on a failed refresh instead of leaving them pending', async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        await refreshGate;
        throw helpers.httpError(config, 503);
      }
      throw helpers.httpError(config, 401);
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);

    const first = client.get('/api/v1/users/me');
    const second = client.get('/api/v1/visits');
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseRefresh();

    const [firstResult, secondResult] = await Promise.all([settleWithin(first), settleWithin(second)]);

    expect(firstResult.status).toBe('rejected');
    expect(secondResult.status).toBe('rejected');
    expect(((firstResult as PromiseRejectedResult).reason as { code: string }).code).toBe('SERVER_ERROR');
    expect(((secondResult as PromiseRejectedResult).reason as { code: string }).code).toBe('SERVER_ERROR');
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(client.getRefreshToken()).toBeNull();
  });

  it('retries the original and the waiting requests with the new token after a successful refresh', async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const seenAuthHeaders: Array<string | undefined> = [];
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        await refreshGate;
        return helpers.ok(config, {
          success: true,
          data: { accessToken: 'fresh-access', refreshToken: 'refresh-2' },
        });
      }
      const header = authHeader(config);
      seenAuthHeaders.push(header);
      if (header !== 'Bearer fresh-access') throw helpers.httpError(config, 401);
      return helpers.ok(config, { success: true, data: { url: config.url } });
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    const onRefreshed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);
    client.setOnTokenRefreshed(onRefreshed);

    const first = client.get<{ url: string }>('/api/v1/users/me');
    const second = client.get<{ url: string }>('/api/v1/visits');
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseRefresh();

    await expect(first).resolves.toEqual({ url: '/api/v1/users/me' });
    await expect(second).resolves.toEqual({ url: '/api/v1/visits' });
    expect(onRefreshed).toHaveBeenCalledWith('fresh-access', 'refresh-2');
    expect(onFailed).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBe('fresh-access');
    expect(client.getRefreshToken()).toBe('refresh-2');
    expect(seenAuthHeaders.filter((header) => header === 'Bearer fresh-access')).toHaveLength(2);
  });

  it('holds a newly initiated protected request until the active refresh succeeds', async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let newReadWasSent = false;
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        await refreshGate;
        return helpers.ok(config, {
          success: true,
          data: { accessToken: 'fresh-access', refreshToken: 'refresh-2' },
        });
      }
      if (config.url === '/api/v1/first') {
        if (authHeader(config) === 'Bearer fresh-access') {
          return helpers.ok(config, { success: true, data: { fresh: true } });
        }
        throw helpers.httpError(config, 401);
      }
      if (config.url === '/api/v1/new-read') {
        newReadWasSent = true;
        expect(authHeader(config)).toBe('Bearer fresh-access');
        return helpers.ok(config, { success: true, data: { fresh: true } });
      }
      throw new Error('unexpected request');
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');

    const first = client.get('/api/v1/first');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const newRead = client.get('/api/v1/new-read');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(newReadWasSent).toBe(false);

    releaseRefresh();
    await expect(first).resolves.toEqual({ fresh: true });
    await expect(newRead).resolves.toEqual({ fresh: true });
  });

  it('reuses a completed refresh for a late 401 sent with the old token', async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let releaseLate401!: () => void;
    const late401Gate = new Promise<void>((resolve) => {
      releaseLate401 = resolve;
    });
    let releaseFirst401!: () => void;
    const first401Gate = new Promise<void>((resolve) => {
      releaseFirst401 = resolve;
    });
    let refreshCalls = 0;
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        refreshCalls += 1;
        await refreshGate;
        return helpers.ok(config, {
          success: true,
          data: { accessToken: 'fresh-access', refreshToken: 'refresh-2' },
        });
      }
      if (config.url === '/api/v1/first') {
        if (authHeader(config) === 'Bearer fresh-access') {
          return helpers.ok(config, { success: true, data: { replayed: true } });
        }
        await first401Gate;
        throw helpers.httpError(config, 401);
      }
      if (config.url === '/api/v1/late') {
        if (authHeader(config) === 'Bearer fresh-access') {
          return helpers.ok(config, { success: true, data: { replayed: true } });
        }
        await late401Gate;
        throw helpers.httpError(config, 401);
      }
      throw new Error('unexpected request');
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');

    const first = client.get('/api/v1/first');
    const late = client.get('/api/v1/late');
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseFirst401();
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseRefresh();
    await expect(first).resolves.toEqual({ replayed: true });
    releaseLate401();

    await expect(late).resolves.toEqual({ replayed: true });
    expect(refreshCalls).toBe(1);
  });

  it('discards a refresh that completes after logout instead of re-arming the ended session', async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        await refreshGate;
        return helpers.ok(config, {
          success: true,
          data: { accessToken: 'fresh-access', refreshToken: 'refresh-2' },
        });
      }
      throw helpers.httpError(config, 401);
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    const onRefreshed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);
    client.setOnTokenRefreshed(onRefreshed);

    const first = client.get('/api/v1/users/me');
    const waiting = client.get('/api/v1/visits');
    await new Promise((resolve) => setTimeout(resolve, 0));

    // User logs out while the refresh is in flight.
    client.clearTokens();
    releaseRefresh();

    const [firstResult, waitingResult] = await Promise.all([settleWithin(first), settleWithin(waiting)]);
    expect(firstResult.status).toBe('rejected');
    expect(waitingResult.status).toBe('rejected');
    expect((firstResult as PromiseRejectedResult).reason.code).toBe('CANCELLED');
    expect((waitingResult as PromiseRejectedResult).reason.code).toBe('CANCELLED');
    expect(onRefreshed).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBeNull();
    expect(client.getRefreshToken()).toBeNull();
  });

  it('does not let a refresh started under an old session overwrite a newer login', async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        await refreshGate;
        return helpers.ok(config, {
          success: true,
          data: { accessToken: 'old-session-access', refreshToken: 'old-session-refresh' },
        });
      }
      throw helpers.httpError(config, 401);
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onRefreshed = jest.fn();
    client.setOnTokenRefreshed(onRefreshed);

    const request = client.get('/api/v1/users/me');
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Logout followed by a fresh login while the old refresh is still pending.
    client.clearTokens();
    client.setAccessToken('new-login-access');
    client.setRefreshToken('new-login-refresh');
    releaseRefresh();

    const result = await settleWithin(request);
    expect(result.status).toBe('rejected');
    expect(onRefreshed).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBe('new-login-access');
    expect(client.getRefreshToken()).toBe('new-login-refresh');
  });

  it('invalidates old refresh work when a new session reuses its refresh token', async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        await refreshGate;
        return helpers.ok(config, {
          success: true,
          data: { accessToken: 'old-session-access', refreshToken: 'refresh-1' },
        });
      }
      throw helpers.httpError(config, 401);
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');

    const request = client.get('/api/v1/users/me');
    await new Promise((resolve) => setTimeout(resolve, 0));

    // A new login can receive the same refresh-token string. The explicit
    // session boundary must still cancel the old refresh operation.
    client.beginSession();
    client.setAccessToken('new-login-access');
    client.setRefreshToken('refresh-1');
    releaseRefresh();

    const result = await settleWithin(request);
    expect(result.status).toBe('rejected');
    expect((result as PromiseRejectedResult).reason.code).toBe('CANCELLED');
    expect(client.getAccessToken()).toBe('new-login-access');
    expect(client.getRefreshToken()).toBe('refresh-1');
  });

  it('does not sign out a newer session when an old refresh is rejected late', async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) {
        await refreshGate;
        throw helpers.httpError(config, 401, { message: 'refresh token revoked' });
      }
      throw helpers.httpError(config, 401);
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);

    const request = client.get('/api/v1/users/me');
    await new Promise((resolve) => setTimeout(resolve, 0));

    client.clearTokens();
    client.setAccessToken('new-login-access');
    client.setRefreshToken('new-login-refresh');
    releaseRefresh();

    const result = await settleWithin(request);
    expect(result.status).toBe('rejected');
    expect((result as PromiseRejectedResult).reason.code).toBe('CANCELLED');
    expect(onFailed).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBe('new-login-access');
    expect(client.getRefreshToken()).toBe('new-login-refresh');
  });

  it('clears the affected runtime session when refresh answers without tokens', async () => {
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      if (isRefreshCall(config)) return helpers.ok(config, { success: true, data: {} });
      throw helpers.httpError(config, 401);
    });
    const { client } = helpers;
    client.setAccessToken('stale-access');
    client.setRefreshToken('refresh-1');
    const onFailed = jest.fn();
    client.setOnTokenRefreshFailed(onFailed);

    const result = await settleWithin(client.get('/api/v1/users/me'));
    expect(result.status).toBe('rejected');
    expect((result as PromiseRejectedResult).reason.code).toBe('SERVER_ERROR');
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(client.getRefreshToken()).toBeNull();

    // With tokens cleared, a later 401 is surfaced without a refresh loop.
    const again = await settleWithin(client.get('/api/v1/users/me'));
    expect(again.status).toBe('rejected');
    expect((again as PromiseRejectedResult).reason.code).toBe('UNAUTHORIZED');
  });
});

function isRefreshCallLabel(label: string): boolean {
  return label.includes('/auth/refresh');
}
