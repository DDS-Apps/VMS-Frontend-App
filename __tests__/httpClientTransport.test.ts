import type { AxiosRequestConfig, AxiosResponse } from 'axios';

type Handler = (config: AxiosRequestConfig) => Promise<AxiosResponse>;

function loadClient(handler: Handler) {
  jest.resetModules();
  const axios = require('axios') as typeof import('axios');
  const AxiosError = axios.AxiosError;
  const adapter = (config: AxiosRequestConfig) => handler(config);
  axios.default.defaults.adapter = adapter;

  const client = require('@/api/httpClient') as typeof import('@/api/httpClient');
  client.httpClient.defaults.adapter = adapter;

  const ok = (config: AxiosRequestConfig, data: unknown): AxiosResponse => ({
    status: 200,
    statusText: 'OK',
    data,
    headers: {},
    config: config as never,
  });
  const axiosError = (config: AxiosRequestConfig, code: string) =>
    new AxiosError('transport failed', code, config as never, {});
  return { client, ok, axiosError };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('shared GET transport', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows a slow response that finishes inside the centralized 30 second timeout', async () => {
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      expect(config.timeout).toBe(30_000);
      await delay(15);
      return helpers.ok(config, { success: true, data: { slow: true } });
    });

    await expect(helpers.client.get('/api/v1/visits')).resolves.toEqual({ slow: true });
  });

  it('classifies an ETIMEDOUT produced by the transport adapter as a timeout', async () => {
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      await delay(5);
      throw helpers.axiosError(config, 'ETIMEDOUT');
    });

    await expect(helpers.client.get('/api/v1/visits')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('does not turn a DOM-style abort into a network failure', async () => {
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      throw helpers.axiosError(config, 'ABORT_ERR');
    });

    await expect(helpers.client.get('/api/v1/visits')).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('deduplicates identical reads and only cancels the navigation subscriber', async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      calls += 1;
      await gate;
      return helpers.ok(config, { success: true, data: { kept: true } });
    });
    const navigation = new AbortController();

    const cancelled = helpers.client.get('/api/v1/visits', { page: 1 }, { signal: navigation.signal });
    const retained = helpers.client.get('/api/v1/visits', { page: 1 });
    navigation.abort('navigation');
    release();

    await expect(cancelled).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(retained).resolves.toEqual({ kept: true });
    expect(calls).toBe(1);
  });

  it('aborts the shared transport after its final signal subscriber leaves', async () => {
    let calls = 0;
    let sawAbort = false;
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(
      (config) =>
        new Promise<AxiosResponse>((_resolve, reject) => {
          calls += 1;
          config.signal?.addEventListener('abort', () => {
            sawAbort = true;
            reject(helpers.axiosError(config, 'ERR_CANCELED'));
          });
        }),
    );
    const first = new AbortController();
    const second = new AbortController();
    const one = helpers.client.get('/api/v1/visits', undefined, { signal: first.signal });
    const two = helpers.client.get('/api/v1/visits', undefined, { signal: second.signal });

    // Let Axios dispatch the shared request before asserting cancellation of
    // its live transport. Cancelling before its request interceptor runs is
    // correctly short-circuited without opening a connection.
    await delay(0);
    first.abort('navigation');
    second.abort('navigation');

    await expect(one).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(two).rejects.toMatchObject({ code: 'CANCELLED' });
    await delay(0);
    expect(calls).toBe(1);
    expect(sawAbort).toBe(true);
  });

  it('starts a replacement read when a rapid remount follows final cancellation', async () => {
    let calls = 0;
    const complete: Array<() => void> = [];
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(
      (config) =>
        new Promise<AxiosResponse>((resolve) => {
          calls += 1;
          const call = calls;
          complete.push(() => resolve(helpers.ok(config, { success: true, data: { call } })));
        }),
    );
    const navigation = new AbortController();

    const abandoned = helpers.client.get('/api/v1/visits', undefined, { signal: navigation.signal });
    await delay(0);
    navigation.abort('navigation');
    await expect(abandoned).rejects.toMatchObject({ code: 'CANCELLED' });

    // The aborted adapter promise has intentionally not settled yet. A remount
    // of the same query must not subscribe to it and inherit its cancellation.
    const remounted = helpers.client.get('/api/v1/visits');
    await delay(0);
    expect(calls).toBe(2);

    // Complete the old request first to prove its cleanup cannot erase the
    // replacement entry, then complete the replacement.
    complete[0]();
    complete[1]();
    await expect(remounted).resolves.toEqual({ call: 2 });
  });

  it('never logs or times PII, credentials, bodies, error details, or short path tokens', async () => {
    const email = 'person%40example.test';
    const phone = '%2B966501234567';
    const bodySecret = 'body-password-should-not-log';
    const errorSecret = 'error-detail-should-not-log';
    const shortToken = 'short-token-7';
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      const error = helpers.axiosError(config, 'ERR_BAD_RESPONSE');
      Object.assign(error, {
        message: `request failed with ${errorSecret}`,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: errorSecret, details: { email, phone, bodySecret } },
          headers: {},
          config,
        },
      });
      throw error;
    });
    const timing = require('@/api/requestTiming') as typeof import('@/api/requestTiming');
    timing.clearRequestTimings();

    await expect(
      helpers.client.post(
        `https://raw-user:raw-password@example.test/api/v1/invites/${shortToken}?email=${email}&phone=${phone}`,
        { password: bodySecret, refreshToken: bodySecret },
      ),
    ).rejects.toMatchObject({ code: 'SERVER_ERROR' });

    const output = (console.log as jest.Mock).mock.calls.flat().join(' ');
    for (const secret of [
      email,
      'person@example.test',
      phone,
      '+966501234567',
      bodySecret,
      errorSecret,
      shortToken,
      'raw-user',
      'raw-password',
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain('[HTTP] Request POST /api/v1/invites/:id retry=0');
    expect(output).toContain('[HTTP] Failure POST /api/v1/invites/:id retry=0 status=500 outcome=http_error');
    expect(timing.getRequestTimings()).toEqual([
      expect.objectContaining({ method: 'POST', path: '/api/v1/invites/:id', status: 500 }),
    ]);
  });

  it('isolates an in-flight read across session changes', async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let helpers!: ReturnType<typeof loadClient>;
    helpers = loadClient(async (config) => {
      calls += 1;
      await gate;
      return helpers.ok(config, { success: true, data: { call: calls } });
    });

    helpers.client.setAccessToken('first-access');
    helpers.client.setRefreshToken('first-refresh');
    const oldSession = helpers.client.get('/api/v1/visits');
    await delay(0);
    helpers.client.clearTokens();
    helpers.client.setAccessToken('second-access');
    helpers.client.setRefreshToken('second-refresh');
    const newSession = helpers.client.get('/api/v1/visits');
    release();

    await expect(oldSession).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(newSession).resolves.toEqual({ call: 2 });
    expect(calls).toBe(2);
  });
});

describe('real Axios HTTP adapter timing', () => {
  let server: ReturnType<typeof require>;
  let baseUrl = '';

  beforeAll(async () => {
    const http = require('node:http') as {
      createServer: (handler: (request: { url?: string }, response: {
        writeHead: (status: number, headers: Record<string, string>) => void;
        end: (body: string) => void;
      }) => void) => {
        listen: (port: number, host: string, callback: () => void) => void;
        address: () => { port: number } | string | null;
        close: (callback: (error?: Error) => void) => void;
      };
    };

    server = http.createServer((request, response) => {
      const respond = (delayMs: number, body: string) => {
        setTimeout(() => {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(body);
        }, delayMs);
      };

      if (request.url === '/api/v1/visits') {
        respond(35, '{"success":true,"data":{"slow":true}}');
        return;
      }
      if (request.url === '/api/v1/approvals/awaiting-visitor') {
        respond(150, '{"success":true,"data":{"tooLate":true}}');
        return;
      }
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end('{"message":"not found"}');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Controlled HTTP server did not expose a TCP port.');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error?: Error) => (error ? reject(error) : resolve())));
  });

  function loadNetworkClient(timeout: number) {
    jest.resetModules();
    const axios = require('axios') as typeof import('axios');
    const client = require('@/api/httpClient') as typeof import('@/api/httpClient');
    const timing = require('@/api/requestTiming') as typeof import('@/api/requestTiming');

    client.httpClient.defaults.baseURL = baseUrl;
    client.httpClient.defaults.timeout = timeout;
    // Explicitly select Axios's Node adapter. This prevents this test from
    // accidentally exercising the deterministic adapter used elsewhere here.
    client.httpClient.defaults.adapter = axios.getAdapter('http');
    timing.clearRequestTimings();
    return { client, timing };
  }

  it('records actual elapsed time for a delayed HTTP success below a bounded test-only timeout', async () => {
    const { client, timing } = loadNetworkClient(120);
    const startedAt = Date.now();

    await expect(client.get('/api/v1/visits')).resolves.toEqual({ slow: true });

    const elapsedMs = Date.now() - startedAt;
    const sample = timing.getRequestTimings().at(-1);
    expect(elapsedMs).toBeGreaterThanOrEqual(25);
    expect(sample).toEqual(expect.objectContaining({
      method: 'GET',
      path: '/api/v1/visits',
      outcome: 'ok',
      status: 200,
    }));
    expect(sample.durationMs).toBeGreaterThanOrEqual(25);
  });

  it('proves Axios aborts a real delayed HTTP request at the bounded timeout', async () => {
    const { client, timing } = loadNetworkClient(45);
    const startedAt = Date.now();

    await expect(client.get('/api/v1/approvals/awaiting-visitor')).rejects.toMatchObject({ code: 'TIMEOUT' });

    const elapsedMs = Date.now() - startedAt;
    const sample = timing.getRequestTimings().at(-1);
    expect(elapsedMs).toBeGreaterThanOrEqual(30);
    expect(elapsedMs).toBeLessThan(140);
    expect(sample).toEqual(expect.objectContaining({
      method: 'GET',
      path: '/api/v1/approvals/awaiting-visitor',
      outcome: 'timeout',
      reason: 'axios_timeout',
      status: null,
    }));
    expect(sample.durationMs).toBeGreaterThanOrEqual(30);
    expect(sample.durationMs).toBeLessThan(140);
  });
});