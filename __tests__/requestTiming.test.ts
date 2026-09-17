import {
  MAX_TIMING_SAMPLES,
  clearRequestTimings,
  getRequestTimings,
  normalizeRequestPath,
  recordRequestTiming,
  summarizeRequestTimings,
  type RequestTimingSample,
} from '@/api/requestTiming';

function sample(overrides: Partial<RequestTimingSample>): RequestTimingSample {
  return {
    method: 'GET',
    path: '/api/v1/visits',
    status: 200,
    durationMs: 100,
    outcome: 'ok',
    finishedAt: 0,
    ...overrides,
  };
}

describe('normalizeRequestPath', () => {
  it('strips query strings and collapses ids so endpoints group together', () => {
    expect(normalizeRequestPath('/api/v1/visits?page=2&limit=100')).toBe('/api/v1/visits');
    expect(normalizeRequestPath('/api/v1/visits/3f2504e0-4f89-11d3-9a0c-0305e82c3301/approve')).toBe(
      '/api/v1/visits/:id/approve',
    );
    expect(normalizeRequestPath('/api/v1/users/12345')).toBe('/api/v1/users/:id');
    expect(normalizeRequestPath('/api/v1/invites/0123456789abcdef0123')).toBe('/api/v1/invites/:id');
    expect(normalizeRequestPath('https://user:password@example.test/api/v1/invites/secret-token-value?email=a@b.test')).toBe(
      '/api/v1/invites/secret-token-value',
    );
    expect(normalizeRequestPath('/api/v1/users/person@example.test')).toBe('/api/v1/users/:id');
    expect(normalizeRequestPath(undefined)).toBe('(unknown)');
  });
});

describe('recordRequestTiming', () => {
  beforeEach(() => {
    clearRequestTimings();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps only the most recent samples', () => {
    for (let i = 0; i < MAX_TIMING_SAMPLES + 25; i += 1) {
      recordRequestTiming(sample({ durationMs: i }));
    }

    const kept = getRequestTimings();
    expect(kept).toHaveLength(MAX_TIMING_SAMPLES);
    expect(kept[0].durationMs).toBe(25);
    expect(kept[kept.length - 1].durationMs).toBe(MAX_TIMING_SAMPLES + 24);
  });

  it('warns about slow responses only', () => {
    recordRequestTiming(sample({ durationMs: 1999 }));
    expect(console.warn).not.toHaveBeenCalled();

    recordRequestTiming(sample({ durationMs: 2000, path: '/api/v1/dashboard' }));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('/api/v1/dashboard took 2000ms'));
  });

  it('retains only normalized timeout and cancellation diagnostics', () => {
    recordRequestTiming(sample({ outcome: 'timeout', reason: 'transport_timeout', retryAttempt: 1 }));
    recordRequestTiming(sample({ outcome: 'cancelled', reason: 'navigation' }));

    expect(getRequestTimings()).toEqual([
      expect.objectContaining({ outcome: 'timeout', reason: 'transport_timeout', retryAttempt: 1 }),
      expect.objectContaining({ outcome: 'cancelled', reason: 'navigation' }),
    ]);
  });
});

describe('summarizeRequestTimings', () => {
  it('reports percentiles per endpoint, slowest first', () => {
    const samples = [
      ...[50, 60, 70, 80, 900].map((durationMs) => sample({ durationMs })),
      sample({ method: 'POST', path: '/api/v1/visits', durationMs: 3000, status: 500, outcome: 'http_error' }),
      sample({ method: 'POST', path: '/api/v1/visits', durationMs: 200 }),
    ];

    const summary = summarizeRequestTimings(samples);

    expect(summary).toEqual([
      { method: 'POST', path: '/api/v1/visits', count: 2, errors: 1, p50Ms: 200, p95Ms: 3000, maxMs: 3000 },
      { method: 'GET', path: '/api/v1/visits', count: 5, errors: 0, p50Ms: 70, p95Ms: 900, maxMs: 900 },
    ]);
  });

  it('handles an empty log', () => {
    expect(summarizeRequestTimings([])).toEqual([]);
  });
});
