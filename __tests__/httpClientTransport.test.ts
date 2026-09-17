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

    first.abort('navigation');
    second.abort('navigation');

    await expect(one).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(two).rejects.toMatchObject({ code: 'CANCELLED' });
    await delay(0);
    expect(calls).toBe(1);
    expect(sawAbort).toBe(true);
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